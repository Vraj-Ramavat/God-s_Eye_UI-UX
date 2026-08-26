import time
from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field

class JobStatus(BaseModel):
    job_id: str
    status: str = "queued" # queued, extracting_frames, masking_dynamic_objects, estimating_poses, estimating_depth, fusing_depth, meshing, texturing, exporting, complete, failed
    stage: str = "Job Queued"
    progress: float = 0.0
    error: Optional[str] = None
    fallback_stages: List[str] = Field(default_factory=list)
    used_fallback: bool = False
    created_at: float = Field(default_factory=time.time)
    updated_at: float = Field(default_factory=time.time)
    processing_time_seconds: float = 0.0
    file_path: Optional[str] = None
    storage_dir: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    flightpath: Optional[Dict[str, Any]] = None

# In-memory job repository
JOBS_DB: Dict[str, JobStatus] = {}

def create_job(job_id: str, file_path: str, storage_dir: str) -> JobStatus:
    job = JobStatus(
        job_id=job_id,
        status="queued",
        stage="Queued for processing",
        progress=0.0,
        file_path=file_path,
        storage_dir=storage_dir
    )
    JOBS_DB[job_id] = job
    return job

def get_job(job_id: str) -> Optional[JobStatus]:
    return JOBS_DB.get(job_id)

def update_job(
    job_id: str,
    status: str,
    stage: str,
    progress: float,
    error: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
    flightpath: Optional[Dict[str, Any]] = None,
    fallback_stages: Optional[List[str]] = None,
    used_fallback: Optional[bool] = None
) -> Optional[JobStatus]:
    job = JOBS_DB.get(job_id)
    if not job:
        return None
    
    now = time.time()
    job.status = status
    job.stage = stage
    job.progress = min(100.0, max(0.0, progress))
    job.updated_at = now
    job.processing_time_seconds = round(now - job.created_at, 2)
    
    if error:
        job.error = error
    if metadata:
        job.metadata = metadata
    if flightpath:
        job.flightpath = flightpath
    if fallback_stages is not None:
        job.fallback_stages = fallback_stages
        job.used_fallback = bool(fallback_stages)
    elif used_fallback is not None:
        job.used_fallback = used_fallback
        
    return job

