from __future__ import annotations

import asyncio
import os
import sys
from pathlib import Path
from typing import Any

import numpy as np

from backend.jobs import get_job, update_job

ROOT = Path(__file__).resolve().parents[1]
RECON_SRC = ROOT / "reconstruction" / "src"
if str(RECON_SRC) not in sys.path:
    sys.path.insert(0, str(RECON_SRC))


def _make_flightpath(reconstruction: Any) -> dict[str, list[dict[str, Any]]]:
    from gods_eye.stage3_sfm import get_pose
    waypoints: list[dict[str, Any]] = []
    for image in sorted(reconstruction.images.values(), key=lambda im: im.name):
        R, _t, center = get_pose(image)
        forward = R.T @ np.array([0.0, 0.0, 1.0], dtype=float)
        look = center + forward * 2.0
        waypoints.append({
            "x": round(float(center[0]), 4),
            "y": round(float(center[1]), 4),
            "z": round(float(center[2]), 4),
            "lookAt": {
                "x": round(float(look[0]), 4),
                "y": round(float(look[1]), 4),
                "z": round(float(look[2]), 4),
            },
        })
    return {"waypoints": waypoints}


async def run_pipeline_job(job_id: str) -> None:
    job = get_job(job_id)
    if not job or not job.storage_dir or not job.file_path:
        return

    work = Path(job.storage_dir)
    frames_dir = work / "frames"
    masks_dir = work / "masks"
    sfm_dir = work / "sfm"
    depth_dir = work / "depth"
    fused_dir = work / "fused"
    meshes_dir = work / "meshes"
    output_dir = work / "output"
    for p in (frames_dir, masks_dir, sfm_dir, depth_dir, fused_dir, meshes_dir, output_dir):
        p.mkdir(parents=True, exist_ok=True)

    fused_cloud = fused_dir / "fused_cloud.ply"
    clean_cloud = fused_dir / "clean_cloud.ply"
    mesh_raw = meshes_dir / "mesh_raw.ply"
    mesh_textured = meshes_dir / "mesh_textured.ply"
    final_glb = output_dir / "output.glb"

    try:
        from gods_eye.stage1_frames import extract_frames
        from gods_eye.stage2_masking import mask_dynamic_objects
        from gods_eye.stage3_sfm import load_reconstruction, run_colmap_sfm
        from gods_eye.stage4_depth import estimate_depth
        from gods_eye.stage5_fusion import fuse_depth_with_sfm
        from gods_eye.stage6_cleanup import clean_point_cloud
        from gods_eye.stage7_meshing import build_mesh
        from gods_eye.stage8_texturing import apply_vertex_colors
        from gods_eye.stage9_export import export_glb

        update_job(job_id, "extracting_frames", "Extracting and quality-filtering keyframes", 8.0)
        s1 = await asyncio.to_thread(
            extract_frames,
            job.file_path,
            frames_dir,
            target_fps=float(os.getenv("GODSEYE_TARGET_FPS", "3")),
            blur_threshold=float(os.getenv("GODSEYE_BLUR_THRESHOLD", "60")),
            resize_width=int(os.getenv("GODSEYE_RESIZE_WIDTH", "1920")),
        )

        update_job(job_id, "masking_dynamic_objects", "Masking people and vehicles with YOLO", 20.0)
        s2 = await asyncio.to_thread(
            mask_dynamic_objects,
            frames_dir,
            masks_dir,
            weights_path=os.getenv("GODSEYE_YOLO_WEIGHTS", "yolo26n.pt"),
            confidence=float(os.getenv("GODSEYE_YOLO_CONFIDENCE", "0.25")),
            dynamic_classes=["person", "car", "truck", "bus", "motorcycle", "bicycle"],
            dilate_px=int(os.getenv("GODSEYE_MASK_DILATE_PX", "10")),
        )

        update_job(job_id, "estimating_poses", "COLMAP/PyCOLMAP camera pose reconstruction", 35.0)
        s3 = await asyncio.to_thread(
            run_colmap_sfm,
            frames_dir,
            sfm_dir,
            our_masks_dir=masks_dir,
            matcher=os.getenv("GODSEYE_MATCHER", "sequential"),
            use_glomap=os.getenv("GODSEYE_USE_GLOMAP", "true").lower() in {"1", "true", "yes"},
            camera_model=os.getenv("GODSEYE_CAMERA_MODEL", "OPENCV"),
        )
        reconstruction_path = Path(s3["model_path"])
        reconstruction = load_reconstruction(reconstruction_path)
        flightpath = _make_flightpath(reconstruction)

        update_job(job_id, "estimating_depth", "Estimating dense depth with Depth Anything V2", 50.0)
        s4 = await asyncio.to_thread(
            estimate_depth,
            frames_dir,
            depth_dir,
            model_name=os.getenv("GODSEYE_DEPTH_MODEL", "depth-anything/Depth-Anything-V2-Small-hf"),
            device=os.getenv("GODSEYE_DEVICE", "cuda"),
        )

        update_job(job_id, "fusing_depth", "Scale-aligning depth and fusing multi-view geometry", 66.0)
        s5 = await asyncio.to_thread(
            fuse_depth_with_sfm,
            reconstruction_path,
            frames_dir,
            depth_dir,
            fused_cloud,
            masks_dir=masks_dir,
            pixel_stride=int(os.getenv("GODSEYE_PIXEL_STRIDE", "4")),
            ransac_residual_threshold=float(os.getenv("GODSEYE_RANSAC_THRESHOLD", "0.5")),
        )

        update_job(job_id, "cleaning", "Cleaning fused point cloud", 76.0)
        s6 = await asyncio.to_thread(
            clean_point_cloud,
            fused_cloud,
            clean_cloud,
            nb_neighbors=int(os.getenv("GODSEYE_NB_NEIGHBORS", "20")),
            std_ratio=float(os.getenv("GODSEYE_STD_RATIO", "2.0")),
            voxel_size=float(os.getenv("GODSEYE_VOXEL_SIZE", "0.05")),
        )

        update_job(job_id, "meshing", "Reconstructing Poisson surface mesh", 84.0)
        s7 = await asyncio.to_thread(
            build_mesh,
            clean_cloud,
            mesh_raw,
            method=os.getenv("GODSEYE_MESH_METHOD", "poisson"),
            poisson_depth=int(os.getenv("GODSEYE_POISSON_DEPTH", "9")),
            density_trim_quantile=float(os.getenv("GODSEYE_DENSITY_TRIM", "0.02")),
        )

        update_job(job_id, "texturing", "Projecting source-video colour onto mesh", 91.0)
        s8 = await asyncio.to_thread(apply_vertex_colors, mesh_raw, clean_cloud, mesh_textured)

        update_job(job_id, "exporting", "Optimizing and exporting browser-ready GLB", 97.0)
        s9 = await asyncio.to_thread(
            export_glb,
            mesh_textured,
            final_glb,
            target_triangle_count=int(os.getenv("GODSEYE_TARGET_TRIANGLES", "150000")),
        )

        coverage = 0.0
        if s3.get("num_input_images"):
            coverage = 100.0 * s3.get("num_registered_images", 0) / s3["num_input_images"]

        metadata = {
            "job_id": job_id,
            "vertex_count": int(s7.get("num_vertices", 0)),
            "face_count": int(s9.get("triangles_after", s7.get("num_triangles", 0))),
            "point_count": int(s6.get("points_after", s5.get("num_points_final", 0))),
            "texture_resolution": "Vertex colours from source video",
            "file_size_mb": s9.get("file_size_mb"),
            "processing_time_seconds": get_job(job_id).processing_time_seconds if get_job(job_id) else 0,
            "coverage_percent": round(coverage, 2),
            "registered_frames": int(s3.get("num_registered_images", 0)),
            "input_frames": int(s3.get("num_input_images", 0)),
            "reprojection_error": s3.get("mean_reprojection_error"),
            "reconstruction_method": "COLMAP/PyCOLMAP + YOLO masking + Depth Anything V2 + robust SfM/depth fusion + Open3D Poisson mesh",
            "metric_scale_note": "Absolute real-world scale requires GPS/telemetry, a known metric reference, or a metric-depth prior.",
            "capture_metadata": {
                "location": "Not provided",
                "capture_date": "Not provided",
                "altitude_agl_m": None,
                "gps_coordinates": None,
            },
            "stage_stats": {
                "frame_extraction": s1,
                "masking": s2,
                "sfm": s3,
                "depth": s4,
                "fusion": {k: v for k, v in s5.items() if k != "per_frame"},
                "cleanup": s6,
                "meshing": s7,
                "texturing": s8,
                "export": s9,
            },
        }

        update_job(
            job_id,
            "complete",
            "Reconstruction complete",
            100.0,
            metadata=metadata,
            flightpath=flightpath,
            fallback_stages=[],
        )
    except Exception as exc:
        update_job(job_id, "failed", "Pipeline failed", 0.0, error=f"{type(exc).__name__}: {exc}")
