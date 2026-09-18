#!/usr/bin/env bash
set -euo pipefail

rm -rf final recon-source
mkdir -p final/frontend final/backend final/reconstruction final/storage

git clone --depth 1 https://github.com/Vraj-Ramavat/SIH-2026-Gods_Eye.git recon-source

# Keep the complete React/Vite/Three.js frontend, excluding the duplicate backend and large source/demo extras.
rsync -a \
  --exclude='.git' \
  --exclude='.github' \
  --exclude='backend' \
  --exclude='scratch' \
  --exclude='12306918-hd_1080_1920_60fps.mp4' \
  --exclude='final_SIH_presentation.pptx' \
  ./ final/frontend/

# Canonical reconstruction implementation.
rsync -a \
  --exclude='.git' \
  --exclude='data' \
  --exclude='notebooks' \
  recon-source/ final/reconstruction/

cp backend/jobs.py final/backend/jobs.py
touch final/backend/__init__.py final/storage/.gitkeep

cat > final/backend/pipeline_service.py <<'PY'
from __future__ import annotations

import asyncio
import json
import os
import shutil
import sys
from pathlib import Path
from typing import Any

import yaml

from .jobs import get_job, update_job

ROOT = Path(__file__).resolve().parents[1]
RECON_ROOT = ROOT / "reconstruction"
RECON_SRC = RECON_ROOT / "src"
if str(RECON_SRC) not in sys.path:
    sys.path.insert(0, str(RECON_SRC))


def _job_config(job) -> Path:
    work = Path(job.storage_dir)
    cfg_path = work / "pipeline_config.yaml"
    cfg = {
        "paths": {
            "raw_video": str(Path(job.file_path).resolve()),
            "frames_dir": str((work / "frames").resolve()),
            "masks_dir": str((work / "masks").resolve()),
            "sfm_dir": str((work / "sfm").resolve()),
            "depth_dir": str((work / "depth").resolve()),
            "fused_cloud": str((work / "fused" / "fused_cloud.ply").resolve()),
            "clean_cloud": str((work / "fused" / "clean_cloud.ply").resolve()),
            "mesh_raw": str((work / "meshes" / "mesh_raw.ply").resolve()),
            "mesh_textured": str((work / "meshes" / "mesh_textured.ply").resolve()),
            "final_glb": str((work / "output" / "output.glb").resolve()),
            "yolo_weights": os.getenv("GODSEYE_YOLO_WEIGHTS", "yolo26n.pt"),
        },
        "stage1_frame_extraction": {
            "target_fps": float(os.getenv("GODSEYE_TARGET_FPS", "3")),
            "blur_threshold": float(os.getenv("GODSEYE_BLUR_THRESHOLD", "60")),
            "resize_width": int(os.getenv("GODSEYE_RESIZE_WIDTH", "1920")),
        },
        "stage2_masking": {
            "confidence": float(os.getenv("GODSEYE_YOLO_CONFIDENCE", "0.25")),
            "dynamic_classes": ["person", "car", "truck", "bus", "motorcycle", "bicycle"],
            "dilate_px": int(os.getenv("GODSEYE_MASK_DILATE_PX", "10")),
        },
        "stage3_sfm": {
            "matcher": os.getenv("GODSEYE_MATCHER", "sequential"),
            "use_glomap": os.getenv("GODSEYE_USE_GLOMAP", "true").lower() in {"1", "true", "yes"},
            "camera_model": os.getenv("GODSEYE_CAMERA_MODEL", "OPENCV"),
        },
        "stage4_depth": {
            "model_name": os.getenv("GODSEYE_DEPTH_MODEL", "depth-anything/Depth-Anything-V2-Small-hf"),
            "device": os.getenv("GODSEYE_DEVICE", "cuda"),
        },
        "stage5_fusion": {
            "pixel_stride": int(os.getenv("GODSEYE_PIXEL_STRIDE", "4")),
            "ransac_residual_threshold": float(os.getenv("GODSEYE_RANSAC_THRESHOLD", "0.5")),
        },
        "stage6_cleanup": {
            "nb_neighbors": int(os.getenv("GODSEYE_NB_NEIGHBORS", "20")),
            "std_ratio": float(os.getenv("GODSEYE_STD_RATIO", "2.0")),
            "voxel_size": float(os.getenv("GODSEYE_VOXEL_SIZE", "0.05")),
        },
        "stage7_meshing": {
            "method": os.getenv("GODSEYE_MESH_METHOD", "poisson"),
            "poisson_depth": int(os.getenv("GODSEYE_POISSON_DEPTH", "9")),
            "density_trim_quantile": float(os.getenv("GODSEYE_DENSITY_TRIM", "0.02")),
        },
        "stage9_export": {
            "target_triangle_count": int(os.getenv("GODSEYE_TARGET_TRIANGLES", "150000")),
        },
    }
    cfg_path.write_text(yaml.safe_dump(cfg, sort_keys=False), encoding="utf-8")
    return cfg_path


def _metadata_and_flightpath(job_id: str, work: Path) -> tuple[dict[str, Any], dict[str, Any]]:
    import open3d as o3d
    import numpy as np
    from gods_eye.stage3_sfm import get_pose
    import pycolmap

    glb = work / "output" / "output.glb"
    cloud = work / "fused" / "clean_cloud.ply"
    mesh_path = work / "meshes" / "mesh_textured.ply"
    sfm_model = work / "sfm" / "sparse" / "0"

    point_count = 0
    vertex_count = 0
    face_count = 0
    if cloud.exists():
        point_count = len(o3d.io.read_point_cloud(str(cloud)).points)
    if mesh_path.exists():
        mesh = o3d.io.read_triangle_mesh(str(mesh_path))
        vertex_count = len(mesh.vertices)
        face_count = len(mesh.triangles)

    waypoints = []
    registered = 0
    reprojection_error = None
    if sfm_model.exists():
        rec = pycolmap.Reconstruction(str(sfm_model))
        registered = rec.num_reg_images()
        errors = [float(p.error) for p in rec.points3D.values()]
        reprojection_error = float(np.mean(errors)) if errors else None
        for image in sorted(rec.images.values(), key=lambda im: im.name):
            R, _t, center = get_pose(image)
            forward = R.T @ np.array([0.0, 0.0, 1.0])
            look = center + forward * 2.0
            waypoints.append({
                "x": round(float(center[0]), 4), "y": round(float(center[1]), 4), "z": round(float(center[2]), 4),
                "lookAt": {"x": round(float(look[0]), 4), "y": round(float(look[1]), 4), "z": round(float(look[2]), 4)},
            })

    frames = list((work / "frames").glob("frame_*.jpg"))
    coverage = round(100.0 * registered / len(frames), 2) if frames else 0.0
    meta = {
        "job_id": job_id,
        "vertex_count": vertex_count,
        "face_count": face_count,
        "point_count": point_count,
        "texture_resolution": "Vertex colours from source video",
        "file_size_mb": round(glb.stat().st_size / 1048576, 2) if glb.exists() else None,
        "processing_time_seconds": get_job(job_id).processing_time_seconds if get_job(job_id) else 0,
        "coverage_percent": coverage,
        "registered_frames": registered,
        "input_frames": len(frames),
        "reprojection_error": reprojection_error,
        "reconstruction_method": "COLMAP/PyCOLMAP + YOLO masking + Depth Anything V2 + robust SfM/depth fusion + Open3D Poisson mesh",
        "metric_scale_note": "Absolute real-world scale requires GPS/telemetry, a known metric reference, or a metric-depth prior.",
        "capture_metadata": {"location": "Not provided", "capture_date": "Not provided", "altitude_agl_m": None, "gps_coordinates": None},
    }
    return meta, {"waypoints": waypoints}


async def run_pipeline_job(job_id: str) -> None:
    job = get_job(job_id)
    if not job or not job.storage_dir or not job.file_path:
        return
    work = Path(job.storage_dir)
    work.mkdir(parents=True, exist_ok=True)
    try:
        cfg = _job_config(job)
        update_job(job_id, "processing", "Running canonical 9-stage reconstruction pipeline", 5.0)
        proc = await asyncio.create_subprocess_exec(
            sys.executable,
            str(RECON_ROOT / "scripts" / "run_pipeline.py"),
            "--config",
            str(cfg),
            cwd=str(RECON_ROOT),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
        )
        output, _ = await proc.communicate()
        (work / "pipeline.log").write_bytes(output or b"")
        if proc.returncode != 0:
            tail = (output or b"").decode("utf-8", errors="replace")[-4000:]
            raise RuntimeError(f"Canonical reconstruction pipeline failed. Log tail:\n{tail}")
        update_job(job_id, "finalizing", "Preparing model metadata and camera path", 98.0)
        metadata, flightpath = await asyncio.to_thread(_metadata_and_flightpath, job_id, work)
        update_job(job_id, "complete", "Reconstruction complete", 100.0, metadata=metadata, flightpath=flightpath, fallback_stages=[])
    except Exception as exc:
        update_job(job_id, "failed", "Pipeline failed", 0.0, error=f"{type(exc).__name__}: {exc}")
PY

cat > final/backend/main.py <<'PY'
from __future__ import annotations

import os
import uuid
from pathlib import Path

from fastapi import BackgroundTasks, FastAPI, File, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from .jobs import JOBS_DB, create_job, get_job
from .pipeline_service import run_pipeline_job

ROOT = Path(__file__).resolve().parents[1]
STORAGE_ROOT = Path(os.getenv("GODSEYE_STORAGE_ROOT", ROOT / "storage"))
STORAGE_ROOT.mkdir(parents=True, exist_ok=True)
MAX_FILE_SIZE_BYTES = int(os.getenv("GODSEYE_MAX_UPLOAD_MB", "500")) * 1024 * 1024
ALLOWED_EXTENSIONS = {".mp4", ".avi", ".mov", ".mkv", ".webm"}

app = FastAPI(title="God's Eye Unified API", version="2.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

@app.get("/api/health")
def health_check():
    return {"status": "online", "service": "God's Eye Unified Backend", "problem_statement": "SIH26158", "active_jobs_count": len(JOBS_DB)}

@app.post("/api/jobs", status_code=status.HTTP_202_ACCEPTED)
async def create_reconstruction_job(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    filename = file.filename or "video.mp4"
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"Unsupported video type '{ext}'.")
    job_id = str(uuid.uuid4())
    job_dir = STORAGE_ROOT / job_id
    job_dir.mkdir(parents=True, exist_ok=True)
    input_path = job_dir / f"input{ext}"
    total = 0
    try:
        with input_path.open("wb") as out:
            while True:
                chunk = await file.read(1024 * 1024)
                if not chunk:
                    break
                total += len(chunk)
                if total > MAX_FILE_SIZE_BYTES:
                    raise HTTPException(413, "Video exceeds the configured upload limit.")
                out.write(chunk)
    except Exception:
        if input_path.exists():
            input_path.unlink()
        raise
    finally:
        await file.close()
    job = create_job(job_id, str(input_path), str(job_dir))
    background_tasks.add_task(run_pipeline_job, job_id)
    return {"job_id": job.job_id, "status": job.status, "stage": job.stage, "message": "Upload accepted; reconstruction started."}

@app.get("/api/jobs/{job_id}")
def get_job_status(job_id: str):
    job = get_job(job_id)
    if not job:
        raise HTTPException(404, "Job not found.")
    data = {"job_id": job.job_id, "status": job.status, "stage": job.stage, "progress": job.progress, "processing_time_seconds": job.processing_time_seconds, "fallback_stages": job.fallback_stages, "used_fallback": job.used_fallback, "error": job.error}
    if job.status == "complete":
        data["metadata"] = job.metadata
        data["flightpath_available"] = bool(job.flightpath)
    return data

@app.get("/api/jobs/{job_id}/model.glb")
def get_model(job_id: str):
    job = get_job(job_id)
    if not job or not job.storage_dir:
        raise HTTPException(404, "Job not found.")
    model = Path(job.storage_dir) / "output" / "output.glb"
    if not model.exists():
        raise HTTPException(404, "Model is not ready yet.")
    return FileResponse(model, media_type="model/gltf-binary", filename=f"godseye_{job_id[:8]}.glb")

@app.get("/api/jobs/{job_id}/metadata")
def get_metadata(job_id: str):
    job = get_job(job_id)
    if not job:
        raise HTTPException(404, "Job not found.")
    if not job.metadata:
        raise HTTPException(409, "Metadata is not ready yet.")
    return job.metadata

@app.get("/api/jobs/{job_id}/flightpath")
def get_flightpath(job_id: str):
    job = get_job(job_id)
    if not job:
        raise HTTPException(404, "Job not found.")
    if not job.flightpath:
        raise HTTPException(409, "Flight path is not ready yet.")
    return job.flightpath
PY

cat > final/requirements.txt <<'REQ'
-r reconstruction/requirements.txt
REQ
cat > final/backend/requirements.txt <<'REQ'
-r ../reconstruction/requirements.txt
REQ

cat > final/.gitignore <<'EOF'
.venv/
__pycache__/
*.pyc
storage/*
!storage/.gitkeep
frontend/node_modules/
frontend/dist/
.env
EOF

cat > final/README.md <<'MD'
# God's Eye — Unified SIH 2026 Project

This package combines the two original repositories without keeping two competing reconstruction implementations.

- **Frontend:** React/Vite/React Three Fiber from `God-s_Eye_UI-UX`.
- **API:** upload, job-status, model, metadata and flightpath endpoints based on the UI repository's contract.
- **Reconstruction:** `SIH-2026-Gods_Eye` is the single source of truth. The backend launches its canonical `scripts/run_pipeline.py` for every uploaded video.

## Final flow

`Drone video -> keyframe quality filtering -> YOLO dynamic-object masks -> COLMAP/PyCOLMAP SfM -> Depth Anything V2 -> robust depth/SfM fusion -> point-cloud cleanup -> Poisson meshing -> vertex colour -> GLB -> FastAPI -> React Three Fiber`

## Backend

```bash
python -m venv .venv
# Linux/macOS: source .venv/bin/activate
# Windows PowerShell: .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn backend.main:app --reload --port 8000
```

COLMAP must be installed and available on PATH. GLOMAP is optional. An NVIDIA CUDA GPU is strongly recommended for YOLO and depth estimation.

## Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend defaults to `http://localhost:8000`. Set `VITE_BACKEND_URL` to use another API host.

## Important accuracy note

The SfM + relative-depth pipeline creates a geometrically consistent reconstruction, but absolute metric scale cannot be guaranteed from monocular RGB video alone. GPS/telemetry, a known metric reference, or a metric-depth prior is needed for absolute real-world scale/georeferencing.
MD

cat > final/MERGE_NOTES.md <<'MD'
# Merge decisions

The old `God-s_Eye_UI-UX/backend/pipeline` reconstruction code is intentionally excluded. It duplicated the main project and differed in frame naming, mask convention, COLMAP masking, depth representation and fusion geometry.

The final project keeps the UI/dashboard/viewer and its API contract, while all video-to-3D processing comes from `SIH-2026-Gods_Eye`.
MD
