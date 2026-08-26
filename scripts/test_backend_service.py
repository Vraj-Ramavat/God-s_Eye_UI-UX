import sys
import os
sys.path.insert(0, os.path.abspath("."))
import time
import cv2
import numpy as np
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def create_sample_video(path: str):
    """Creates a temporary sample MP4 video file"""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(path, fourcc, 10.0, (320, 240))
    for i in range(20):
        img = np.zeros((240, 320, 3), dtype=np.uint8)
        img[:, :] = (40, 120 + i*5, 80)
        cv2.putText(img, f"DRONE FRAME {i}", (20, 120), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
        out.write(img)
    out.release()

def test_full_backend_flow():
    print("=== 1. Health Check ===")
    r = client.get("/api/health")
    assert r.status_code == 200, f"Health check failed: {r.text}"
    health = r.json()
    print("Health response:", health)
    assert health["mock_mode"] is False, f"Expected mock_mode: False in production reconstruction test, got {health['mock_mode']}"

    print("\n=== 2. Creating Sample Video ===")
    sample_video_path = "scratch/test_drone_flight.mp4"
    if not os.path.exists(sample_video_path):
        create_sample_video(sample_video_path)

    print("\n=== 3. Uploading Video to POST /api/jobs ===")
    with open(sample_video_path, "rb") as f:
        r = client.post("/api/jobs", files={"file": ("test_drone_flight.mp4", f, "video/mp4")})
    assert r.status_code == 202, f"Upload failed: {r.text}"
    job_data = r.json()
    job_id = job_data["job_id"]
    print("Job Upload Accepted! Job ID:", job_id)
    assert job_data["status"] == "queued"

    print("\n=== 4. Polling GET /api/jobs/{job_id} ===")
    max_retries = 30
    complete = False
    final_data = {}
    for attempt in range(max_retries):
        r = client.get(f"/api/jobs/{job_id}")
        assert r.status_code == 200
        data = r.json()
        final_data = data
        print(f"[{attempt+1}] Status: {data['status']} | Stage: {data['stage']} | Progress: {data['progress']}% | Fallbacks: {data.get('fallback_stages', [])}")
        if data["status"] == "complete":
            complete = True
            break
        elif data["status"] == "failed":
            raise AssertionError(f"Job failed with error: {data.get('error')}")
        time.sleep(0.8)

    assert complete, "Job processing did not reach status 'complete'"
    assert final_data.get("fallback_stages", []) == [], f"Expected zero fallback stages, got: {final_data.get('fallback_stages')}"

    print("\n=== 5. Testing GET /api/jobs/{job_id}/model.glb ===")
    r = client.get(f"/api/jobs/{job_id}/model.glb")
    assert r.status_code == 200, f"GLB fetch failed: {r.status_code}"
    assert r.headers["content-type"] == "model/gltf-binary"
    print(f"GLB file fetched successfully! Size: {len(r.content)} bytes, Content-Type: {r.headers['content-type']}")

    print("\n=== 6. Testing GET /api/jobs/{job_id}/metadata ===")
    r = client.get(f"/api/jobs/{job_id}/metadata")
    assert r.status_code == 200
    meta = r.json()
    print("Metadata Schema Output:")
    print("  Job ID:", meta.get("job_id"))
    print("  Vertices:", meta.get("vertex_count"))
    print("  Faces:", meta.get("face_count"))
    print("  Points:", meta.get("point_count"))
    print("  File Size MB:", meta.get("file_size_mb"))
    print("  Method:", meta.get("reconstruction_method"))
    print("  Fallback Stages:", meta.get("fallback_stages"))
    assert "vertex_count" in meta and "capture_metadata" in meta
    assert meta.get("fallback_stages") == [], f"Expected fallback_stages to be empty in metadata, got: {meta.get('fallback_stages')}"

    print("\n=== 7. Testing GET /api/jobs/{job_id}/flightpath ===")
    r = client.get(f"/api/jobs/{job_id}/flightpath")
    assert r.status_code == 200
    flight = r.json()
    waypoints = flight.get("waypoints", [])
    print(f"Flightpath Waypoints count: {len(waypoints)}")
    assert len(waypoints) > 0, "Waypoints array should not be empty"

    print("\n[SUCCESS] ALL BACKEND RECONSTRUCTION TEST SUITE CHECKS PASSED PERFECTLY!")

if __name__ == "__main__":
    test_full_backend_flow()

