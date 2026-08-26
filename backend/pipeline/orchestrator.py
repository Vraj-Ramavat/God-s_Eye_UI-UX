import os
import time
import asyncio
import logging
from backend.jobs import update_job, get_job
from backend.pipeline.frames import extract_frames
from backend.pipeline.masking import mask_dynamic_objects
from backend.pipeline.poses import estimate_camera_poses
from backend.pipeline.depth import estimate_depth_maps
from backend.pipeline.fusion import fuse_depth_and_poses
from backend.pipeline.meshing import reconstruct_mesh
from backend.pipeline.export import export_glb_and_metadata, _generate_procedural_glb

logger = logging.getLogger(__name__)

# Check if MOCK_MODE environment variable is set (defaults to True for instant hackathon demo stability)
MOCK_MODE = os.environ.get("MOCK_MODE", "true").lower() in ("true", "1", "t", "yes")

async def run_pipeline_job(job_id: str):
    """
    Asynchronous background worker that executes the God's Eye reconstruction pipeline
    through all stages, updating job status and progress percentage at each step.
    """
    job = get_job(job_id)
    if not job:
        logger.error(f"Job {job_id} not found in DB!")
        return

    logger.info(f"Starting reconstruction pipeline for job {job_id} (MOCK_MODE={MOCK_MODE})")
    start_time = time.time()
    
    storage_dir = job.storage_dir
    os.makedirs(storage_dir, exist_ok=True)
    video_path = job.file_path
    glb_output_path = os.path.join(storage_dir, "output.glb")

    if MOCK_MODE:
        await _run_mock_pipeline(job_id, storage_dir, glb_output_path, start_time)
        return

    # Real Pipeline Processing
    try:
        # Stage 1: Frame Extraction
        update_job(job_id, status="extracting_frames", stage="Extracting Keyframes (OpenCV)", progress=10.0)
        frames_dir = os.path.join(storage_dir, "frames")
        frame_paths = await asyncio.to_thread(extract_frames, video_path, frames_dir)
        await asyncio.sleep(0.5)

        # Stage 2: Dynamic Object Masking
        update_job(job_id, status="masking_dynamic_objects", stage="Masking Dynamic Objects (YOLOv8)", progress=25.0)
        masks_dir = os.path.join(storage_dir, "masks")
        mask_paths = await asyncio.to_thread(mask_dynamic_objects, frames_dir, masks_dir)
        await asyncio.sleep(0.5)

        # Stage 3: Camera Pose Estimation
        update_job(job_id, status="estimating_poses", stage="Estimating Camera Poses (COLMAP SfM)", progress=40.0)
        camera_poses, flightpath_waypoints, sparse_points = await asyncio.to_thread(
            estimate_camera_poses, frames_dir, masks_dir, storage_dir
        )
        flightpath_data = {"waypoints": flightpath_waypoints}
        await asyncio.sleep(0.5)

        # Stage 4: Monocular Depth Estimation
        update_job(job_id, status="estimating_depth", stage="Estimating Depth (Depth Anything V2)", progress=60.0)
        depth_dir = os.path.join(storage_dir, "depth")
        depth_paths = await asyncio.to_thread(estimate_depth_maps, frames_dir, depth_dir)
        await asyncio.sleep(0.5)

        # Stage 5: Scale Alignment & Point Cloud Fusion
        update_job(job_id, status="fusing_depth", stage="Fusing Point Cloud & Scale Alignment", progress=75.0)
        fused_pts, fused_cols = await asyncio.to_thread(
            fuse_depth_and_poses, frames_dir, depth_dir, masks_dir, camera_poses, sparse_points
        )
        await asyncio.sleep(0.5)

        # Stage 6: Surface Reconstruction
        update_job(job_id, status="meshing", stage="Poisson Surface Reconstruction (Open3D)", progress=85.0)
        mesh = await asyncio.to_thread(reconstruct_mesh, fused_pts, fused_cols)
        await asyncio.sleep(0.5)

        # Stage 7: Texturing
        update_job(job_id, status="texturing", stage="Surface Texturing & Color Mapping", progress=92.0)
        await asyncio.sleep(0.5)

        # Stage 8: Export GLB & Metadata
        update_job(job_id, status="exporting", stage="Exporting GLB & Telemetry Metadata", progress=97.0)
        elapsed = time.time() - start_time
        metadata = await asyncio.to_thread(
            export_glb_and_metadata, mesh, fused_pts, glb_output_path, job_id, elapsed
        )

        # Stage 9: Complete
        update_job(
            job_id,
            status="complete",
            stage="Reconstruction Complete",
            progress=100.0,
            metadata=metadata,
            flightpath=flightpath_data
        )
        logger.info(f"Pipeline job {job_id} successfully completed in {elapsed:.2f}s!")

    except Exception as e:
        logger.error(f"Pipeline execution failed for job {job_id}: {e}", exc_info=True)
        update_job(
            job_id,
            status="failed",
            stage="Pipeline Processing Failed",
            progress=0.0,
            error=str(e)
        )

async def _run_mock_pipeline(job_id: str, storage_dir: str, glb_output_path: str, start_time: float):
    """Simulated hackathon mock mode pipeline execution"""
    stages = [
        ("extracting_frames", "Extracting Keyframes (OpenCV)", 10.0, 1.0),
        ("masking_dynamic_objects", "Masking Dynamic Objects (YOLOv8)", 25.0, 1.2),
        ("estimating_poses", "Estimating Camera Poses (COLMAP SfM)", 40.0, 1.4),
        ("estimating_depth", "Estimating Depth (Depth Anything V2)", 60.0, 1.2),
        ("fusing_depth", "Fusing Point Cloud & Scale Alignment", 75.0, 1.0),
        ("meshing", "Poisson Surface Reconstruction (Open3D)", 85.0, 1.0),
        ("texturing", "Surface Texturing & Color Mapping", 92.0, 0.8),
        ("exporting", "Exporting GLB & Telemetry Metadata", 97.0, 0.8),
    ]

    for status, stage_name, pct, delay in stages:
        update_job(job_id, status=status, stage=stage_name, progress=pct)
        await asyncio.sleep(delay)

    # Generate mock 3D GLB file
    _generate_procedural_glb(glb_output_path)

    elapsed = round(time.time() - start_time, 2)
    file_size_mb = round(os.path.getsize(glb_output_path) / (1024 * 1024), 2) if os.path.exists(glb_output_path) else 4.82

    metadata = {
        "job_id": job_id,
        "vertex_count": 18450,
        "face_count": 36200,
        "point_count": 64200,
        "texture_resolution": "2048x2048",
        "file_size_mb": file_size_mb,
        "processing_time_seconds": elapsed,
        "coverage_percent": 98.6,
        "reconstruction_method": "COLMAP SfM + YOLO Masking + Depth Anything V2 Fusion",
        "capture_metadata": {
            "location": "Quarry Recon Site Alpha",
            "capture_date": "2026-08-26T10:00:00Z",
            "altitude_agl_m": 120.0,
            "gps_coordinates": {
                "lat": 23.8124,
                "lon": 86.4402
            }
        }
    }

    # Generate 12 camera waypoints for orbital flythrough
    waypoints = []
    import math
    for i in range(12):
        angle = (i / 12) * math.pi * 2
        r = 14.0
        waypoints.append({
            "x": round(math.cos(angle) * r, 3),
            "y": round(6.0 + math.sin(i * 0.5) * 1.5, 3),
            "z": round(math.sin(angle) * r, 3),
            "lookAt": {
                "x": 0.0,
                "y": 0.0,
                "z": 0.0
            }
        })

    flightpath_data = {"waypoints": waypoints}

    update_job(
        job_id,
        status="complete",
        stage="Reconstruction Complete",
        progress=100.0,
        metadata=metadata,
        flightpath=flightpath_data
    )
    logger.info(f"Mock pipeline completed for job {job_id} in {elapsed}s.")
