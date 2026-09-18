from __future__ import annotations

import os
import uuid
from pathlib import Path

from fastapi import BackgroundTasks, FastAPI, File, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from backend.jobs import JOBS_DB, create_job, get_job
from backend.pipeline_service import run_pipeline_job

ROOT = Path(__file__).resolve().parents[1]
STORAGE_ROOT = Path(os.getenv("GODSEYE_STORAGE_ROOT", ROOT / "storage"))
STORAGE_ROOT.mkdir(parents=True, exist_ok=True)
MAX_FILE_SIZE_BYTES = int(os.getenv("GODSEYE_MAX_UPLOAD_MB", "500")) * 1024 * 1024
ALLOWED_EXTENSIONS = {".mp4", ".avi", ".mov", ".mkv", ".webm"}

app = FastAPI(
    title="God's Eye Unified API",
    description="Single-pass drone-video to 3D reconstruction using the canonical SIH-2026-Gods_Eye engine.",
    version="2.0.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health_check():
    return {
        "status": "online",
        "service": "God's Eye Unified Backend",
        "team": "Pixel Error (Team ID 51)",
        "ps_id": "SIH26158",
        "pipeline": "canonical reconstruction stages 1-9",
        "active_jobs_count": len(JOBS_DB),
    }


@app.post("/api/jobs", status_code=status.HTTP_202_ACCEPTED)
async def create_reconstruction_job(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
):
    filename = file.filename or "video.mp4"
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file format '{ext}'. Use .mp4, .avi, .mov, .mkv or .webm.",
        )

    job_id = str(uuid.uuid4())
    job_dir = STORAGE_ROOT / job_id
    job_dir.mkdir(parents=True, exist_ok=True)
    input_video_path = job_dir / f"input{ext}"

    total_bytes = 0
    try:
        with input_video_path.open("wb") as out_file:
            while True:
                chunk = await file.read(1024 * 1024)
                if not chunk:
                    break
                total_bytes += len(chunk)
                if total_bytes > MAX_FILE_SIZE_BYTES:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=f"Video exceeds the configured {MAX_FILE_SIZE_BYTES // (1024 * 1024)} MB upload limit.",
                    )
                out_file.write(chunk)
    except Exception:
        if input_video_path.exists():
            input_video_path.unlink()
        raise
    finally:
        await file.close()

    job = create_job(job_id=job_id, file_path=str(input_video_path), storage_dir=str(job_dir))
    background_tasks.add_task(run_pipeline_job, job_id)
    return {
        "job_id": job.job_id,
        "status": job.status,
        "stage": job.stage,
        "message": "Video upload accepted. Reconstruction started.",
    }


@app.get("/api/jobs/{job_id}")
def get_job_status(job_id: str):
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    data = {
        "job_id": job.job_id,
        "status": job.status,
        "stage": job.stage,
        "progress": job.progress,
        "processing_time_seconds": job.processing_time_seconds,
        "fallback_stages": job.fallback_stages,
        "used_fallback": job.used_fallback,
        "error": job.error,
    }
    if job.status == "complete":
        data["metadata"] = job.metadata
        data["flightpath_available"] = bool(job.flightpath)
    return data


@app.get("/api/jobs/{job_id}/model.glb")
def get_model_glb(job_id: str):
    job = get_job(job_id)
    if not job or not job.storage_dir:
        raise HTTPException(status_code=404, detail="Job not found.")
    glb_path = Path(job.storage_dir) / "output" / "output.glb"
    if not glb_path.exists():
        raise HTTPException(status_code=404, detail="Model is not ready yet.")
    return FileResponse(
        path=glb_path,
        media_type="model/gltf-binary",
        filename=f"godseye_{job_id[:8]}.glb",
    )


@app.get("/api/jobs/{job_id}/metadata")
def get_job_metadata(job_id: str):
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    if not job.metadata:
        raise HTTPException(status_code=409, detail="Metadata is not ready yet.")
    data = dict(job.metadata)
    data["fallback_stages"] = job.fallback_stages
    data["used_fallback"] = job.used_fallback
    return data


@app.get("/api/jobs/{job_id}/flightpath")
def get_job_flightpath(job_id: str):
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    if not job.flightpath:
        raise HTTPException(status_code=409, detail="Flight path is not ready yet.")
    return job.flightpath


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
