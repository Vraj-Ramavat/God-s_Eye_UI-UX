"""Stage 5 — robust scale alignment and dense multi-view fusion."""
from __future__ import annotations
from pathlib import Path
import numpy as np
from .utils import ensure_dir, get_logger

log = get_logger("stage5_fusion")

def _get_sparse_calibration_pairs(reconstruction, image, camera):
    from .stage3_sfm import get_intrinsics, get_pose
    fx, fy, cx, cy = get_intrinsics(camera)
    R, t, _ = get_pose(image)
    pixel_xy, real_depth = [], []
    for point2D in image.points2D:
        if not point2D.has_point3D():
            continue
        point3D = reconstruction.points3D[point2D.point3D_id]
        xyz_cam = R @ np.asarray(point3D.xyz) + t
        z = xyz_cam[2]
        if z <= 0:
            continue
        pixel_xy.append(np.asarray(point2D.xy))
        real_depth.append(z)
    distortion = np.asarray(camera.params[4:8], dtype=np.float64)
    return np.asarray(pixel_xy), np.asarray(real_depth), (fx, fy, cx, cy, distortion)

def _fit_scale_alignment(ai_depth_at_pixels: np.ndarray, real_depth: np.ndarray, residual_threshold: float = 0.5):
    from sklearn.linear_model import RANSACRegressor
    X = ai_depth_at_pixels.reshape(-1, 1)
    y = real_depth
    if len(X) < 4:
        raise ValueError(f"Only {len(X)} sparse calibration points available")
    model = RANSACRegressor(residual_threshold=residual_threshold, random_state=0)
    model.fit(X, y)
    return float(model.estimator_.coef_[0]), float(model.estimator_.intercept_), int(model.inlier_mask_.sum())

def _backproject_depth_map(corrected_depth: np.ndarray, intrinsics: tuple, R: np.ndarray, t: np.ndarray, dynamic_mask: np.ndarray | None = None, pixel_stride: int = 4):
    fx, fy, cx, cy = intrinsics[:4]
    distortion = intrinsics[4] if len(intrinsics) > 4 else None
    h, w = corrected_depth.shape
    camera_center = -R.T @ t
    ys, xs = np.mgrid[0:h:pixel_stride, 0:w:pixel_stride]
    xs, ys = xs.ravel(), ys.ravel()
    depths = corrected_depth[ys, xs]
    valid = depths > 0
    if dynamic_mask is not None:
        valid &= dynamic_mask[ys, xs] == 0
    xs, ys, depths = xs[valid], ys[valid], depths[valid]
    pixels = np.column_stack((xs, ys)).astype(np.float64).reshape(-1, 1, 2)
    if distortion is not None and np.any(np.abs(distortion) > 1e-12):
        import cv2
        camera_matrix = np.ascontiguousarray([[float(fx), 0.0, float(cx)], [0.0, float(fy), float(cy)], [0.0, 0.0, 1.0]], dtype=np.float64)
        distortion = np.ascontiguousarray(distortion.reshape(-1, 1), dtype=np.float64)
        rays_cam = cv2.undistortPoints(pixels, camera_matrix, distortion).reshape(-1, 2)
        rays_cam = np.column_stack((rays_cam, np.ones(len(rays_cam))))
    else:
        rays_cam = np.column_stack(((xs - cx) / fx, (ys - cy) / fy, np.ones(len(xs))))
    points_cam = rays_cam * depths[:, None]
    points_world = points_cam @ R + camera_center
    return points_world, xs, ys

def _fuse_one_frame(reconstruction, image_name: str, depth_dir: Path, frames_dir: Path, masks_dir: Path | None, pixel_stride: int, ransac_residual_threshold: float):
    import cv2
    image = next((im for im in reconstruction.images.values() if im.name == image_name), None)
    if image is None:
        return None
    camera = reconstruction.cameras[image.camera_id]
    idx = Path(image_name).stem.replace("frame_", "")
    depth_path = depth_dir / f"depth_{idx}.npy"
    frame_path = frames_dir / image_name
    if not depth_path.exists() or not frame_path.exists():
        return None
    ai_depth_map = np.load(depth_path).astype(np.float64)
    frame_bgr = cv2.imread(str(frame_path))
    h, w = frame_bgr.shape[:2]
    if ai_depth_map.shape != (h, w):
        ai_depth_map = cv2.resize(ai_depth_map, (w, h), interpolation=cv2.INTER_LINEAR)
    dynamic_mask = None
    if masks_dir is not None:
        mask_path = masks_dir / f"mask_{idx}.png"
        if mask_path.exists():
            dynamic_mask = cv2.imread(str(mask_path), cv2.IMREAD_GRAYSCALE)
    pixel_xy, real_depth, intrinsics = _get_sparse_calibration_pairs(reconstruction, image, camera)
    if len(pixel_xy) < 4:
        return None
    px = np.clip(pixel_xy[:, 0].round().astype(int), 0, w - 1)
    py = np.clip(pixel_xy[:, 1].round().astype(int), 0, h - 1)
    ai_depth_at_sparse = ai_depth_map[py, px]
    a, b, num_inliers = _fit_scale_alignment(ai_depth_at_sparse, real_depth, ransac_residual_threshold)
    corrected_depth = np.clip(a * ai_depth_map + b, 0, None)
    from .stage3_sfm import get_pose
    R, t, _ = get_pose(image)
    points_world, xs, ys = _backproject_depth_map(corrected_depth, intrinsics, R, t, dynamic_mask, pixel_stride)
    colors_rgb = frame_bgr[ys, xs][:, ::-1] / 255.0
    return {"points": points_world, "colors": colors_rgb, "scale_a": a, "offset_b": b, "num_calibration_points": len(pixel_xy), "num_inliers": num_inliers}

def fuse_depth_with_sfm(reconstruction_path: str | Path, frames_dir: str | Path, depth_dir: str | Path, output_ply_path: str | Path, masks_dir: str | Path | None = None, pixel_stride: int = 4, ransac_residual_threshold: float = 0.5) -> dict:
    from .stage3_sfm import load_reconstruction
    frames_dir, depth_dir = Path(frames_dir), Path(depth_dir)
    masks_dir = Path(masks_dir) if masks_dir else None
    output_ply_path = Path(output_ply_path)
    ensure_dir(output_ply_path.parent)
    reconstruction = load_reconstruction(reconstruction_path)
    image_names = sorted(im.name for im in reconstruction.images.values())
    all_points, all_colors, all_frame_ids, per_frame_stats = [], [], [], []
    for frame_id, name in enumerate(image_names):
        result = _fuse_one_frame(reconstruction, name, depth_dir, frames_dir, masks_dir, pixel_stride, ransac_residual_threshold)
        if result is None:
            continue
        all_points.append(result["points"])
        all_colors.append(result["colors"])
        all_frame_ids.append(np.full(len(result["points"]), frame_id, dtype=np.int32))
        per_frame_stats.append({"frame": name, "scale_a": result["scale_a"], "num_calibration_points": result["num_calibration_points"], "num_inliers": result["num_inliers"], "points_added": len(result["points"])})
    if not all_points:
        raise RuntimeError("No frames produced fused points")
    points = np.concatenate(all_points, axis=0)
    colors = np.concatenate(all_colors, axis=0)
    frame_ids = np.concatenate(all_frame_ids, axis=0)
    points, colors = _multi_view_consensus_filter(points, colors, frame_ids)
    _write_ply(output_ply_path, points, colors)
    return {"num_frames_fused": len(per_frame_stats), "num_points_before_consensus": int(sum(s["points_added"] for s in per_frame_stats)), "num_points_final": int(len(points)), "mean_scale_a": float(np.mean([s["scale_a"] for s in per_frame_stats])), "output_path": str(output_ply_path), "per_frame": per_frame_stats}

def _multi_view_consensus_filter(points: np.ndarray, colors: np.ndarray, frame_ids: np.ndarray, voxel_size: float = 0.1, min_views: int = 2):
    voxel_idx = np.floor(points / voxel_size).astype(np.int64)
    keys = voxel_idx[:, 0] * 73856093 ^ voxel_idx[:, 1] * 19349663 ^ voxel_idx[:, 2] * 83492791
    order = np.argsort(keys)
    keys_sorted = keys[order]
    points_sorted, colors_sorted, frame_ids_sorted = points[order], colors[order], frame_ids[order]
    boundaries = np.nonzero(np.diff(keys_sorted))[0] + 1
    groups_points = np.split(points_sorted, boundaries)
    groups_colors = np.split(colors_sorted, boundaries)
    groups_frames = np.split(frame_ids_sorted, boundaries)
    kept_points, kept_colors = [], []
    for gp, gc, gf in zip(groups_points, groups_colors, groups_frames):
        if np.unique(gf).size >= min_views:
            kept_points.append(gp.mean(axis=0)); kept_colors.append(gc.mean(axis=0))
    if not kept_points:
        return points, colors
    return np.asarray(kept_points), np.asarray(kept_colors)

def _write_ply(path: Path, points: np.ndarray, colors: np.ndarray) -> None:
    import open3d as o3d
    pcd = o3d.geometry.PointCloud()
    pcd.points = o3d.utility.Vector3dVector(points)
    pcd.colors = o3d.utility.Vector3dVector(np.clip(colors, 0, 1))
    o3d.io.write_point_cloud(str(path), pcd)
