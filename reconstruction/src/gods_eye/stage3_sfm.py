"""Stage 3 — Structure-from-Motion using COLMAP/PyCOLMAP."""
from __future__ import annotations
import shutil
import subprocess
from pathlib import Path
import cv2
import numpy as np
from .utils import ensure_dir, get_logger, which_or_none

log = get_logger("stage3_sfm")

def _run(cmd: list[str]) -> None:
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"Command failed ({result.returncode}): {' '.join(cmd)}\n{result.stderr[-4000:]}")

def prepare_colmap_masks(frames_dir: str | Path, our_masks_dir: str | Path | None, colmap_masks_dir: str | Path) -> Path:
    frames_dir = Path(frames_dir)
    colmap_masks_dir = ensure_dir(colmap_masks_dir)
    our_masks_dir = Path(our_masks_dir) if our_masks_dir else None
    for frame_path in sorted(frames_dir.glob("frame_*.jpg")):
        out_path = colmap_masks_dir / f"{frame_path.name}.png"
        our_mask_path = our_masks_dir / frame_path.name.replace("frame_", "mask_").replace(".jpg", ".png") if our_masks_dir else None
        if our_mask_path and our_mask_path.exists():
            our_mask = cv2.imread(str(our_mask_path), cv2.IMREAD_GRAYSCALE)
            colmap_mask = 255 - our_mask
        else:
            h, w = cv2.imread(str(frame_path)).shape[:2]
            colmap_mask = np.full((h, w), 255, dtype=np.uint8)
        cv2.imwrite(str(out_path), colmap_mask)
    return colmap_masks_dir

def run_colmap_sfm(images_dir: str | Path, workspace_dir: str | Path, our_masks_dir: str | Path | None = None, matcher: str = "sequential", use_glomap: bool = True, camera_model: str = "PINHOLE") -> dict:
    images_dir = Path(images_dir)
    workspace_dir = ensure_dir(workspace_dir)
    database_path = workspace_dir / "database.db"
    sparse_dir = workspace_dir / "sparse"
    if database_path.exists():
        database_path.unlink()
    if sparse_dir.exists():
        shutil.rmtree(sparse_dir)
    sparse_dir.mkdir(parents=True, exist_ok=True)
    colmap_masks_dir = prepare_colmap_masks(images_dir, our_masks_dir, workspace_dir / "colmap_masks") if our_masks_dir is not None else None
    colmap_bin = which_or_none("colmap")
    if colmap_bin is None:
        import pycolmap
        reader_opts = pycolmap.ImageReaderOptions()
        reader_opts.camera_model = camera_model
        if colmap_masks_dir:
            reader_opts.mask_path = str(colmap_masks_dir)
        pycolmap.extract_features(str(database_path), str(images_dir), camera_mode=pycolmap.CameraMode.SINGLE, camera_model=camera_model, reader_options=reader_opts)
        if matcher == "sequential":
            pycolmap.match_sequential(str(database_path))
        else:
            pycolmap.match_exhaustive(str(database_path))
        pycolmap.incremental_mapping(str(database_path), str(images_dir), str(sparse_dir))
    else:
        feature_cmd = [colmap_bin, "feature_extractor", "--database_path", str(database_path), "--image_path", str(images_dir), "--ImageReader.camera_model", camera_model, "--ImageReader.single_camera", "1"]
        if colmap_masks_dir:
            feature_cmd += ["--ImageReader.mask_path", str(colmap_masks_dir)]
        _run(feature_cmd)
        matcher_binary = "sequential_matcher" if matcher == "sequential" else "exhaustive_matcher"
        _run([colmap_bin, matcher_binary, "--database_path", str(database_path), "--SiftMatching.use_gpu", "0"])
        glomap_bin = which_or_none("glomap")
        if use_glomap and glomap_bin:
            _run([glomap_bin, "mapper", "--database_path", str(database_path), "--image_path", str(images_dir), "--output_path", str(sparse_dir)])
        else:
            _run([colmap_bin, "mapper", "--database_path", str(database_path), "--image_path", str(images_dir), "--output_path", str(sparse_dir)])
    model_path = sparse_dir / "0"
    if not model_path.exists():
        raise RuntimeError(f"No reconstruction produced at {model_path}")
    reconstruction = load_reconstruction(model_path)
    errors = [p.error for p in reconstruction.points3D.values()]
    return {"model_path": str(model_path), "num_registered_images": reconstruction.num_reg_images(), "num_input_images": len(list(images_dir.glob('frame_*.jpg'))), "num_points3D": reconstruction.num_points3D(), "mean_reprojection_error": float(np.mean(errors)) if errors else None}

def load_reconstruction(model_path: str | Path):
    import pycolmap
    return pycolmap.Reconstruction(str(model_path))

def get_intrinsics(camera) -> tuple[float, float, float, float]:
    params = np.asarray(camera.params)
    return float(params[0]), float(params[1]), float(params[2]), float(params[3])

def get_pose(image):
    try:
        rig = image.cam_from_world
        if callable(rig):
            rig = rig()
        R = rig.rotation.matrix()
        t = np.asarray(rig.translation)
    except AttributeError:
        import pycolmap
        R = pycolmap.qvec_to_rotmat(image.qvec)
        t = np.asarray(image.tvec)
    camera_center = -R.T @ t
    return R, t, camera_center
