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
    print("Health response:", r.json())

    print("\n=== 2. Creating Sample Video ===")
    sample_video_path = "scratch/test_drone_flight.mp4"
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
    max_retries = 20
    complete = False
    for attempt in range(max_retries):
        r = client.get(f"/api/jobs/{job_id}")
        assert r.status_code == 200
        data = r.json()
        print(f"[{attempt+1}] Status: {data['status']} | Stage: {data['stage']} | Progress: {data['progress']}%")
        if data["status"] == "complete":
            complete = True
            break
        time.sleep(0.8)

    assert complete, "Job processing did not reach status 'complete'"

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
    print("  Job ID:", meta["job_id"])
    print("  Vertices:", meta["vertex_count"])
    print("  Faces:", meta["face_count"])
    print("  File Size MB:", meta["file_size_mb"])
    print("  Method:", meta["reconstruction_method"])
    print("  Location:", meta["capture_metadata"]["location"])
    assert "vertex_count" in meta and "capture_metadata" in meta

    print("\n=== 7. Testing GET /api/jobs/{job_id}/flightpath ===")
    r = client.get(f"/api/jobs/{job_id}/flightpath")
    assert r.status_code == 200
    flight = r.json()
    print("Flightpath Waypoints count:", len(flight["waypoints"]))
    assert "waypoints" in flight and len(flight["waypoints"]) > 0

    print("\n[SUCCESS] ALL BACKEND TEST SUITE CHECKS PASSED PERFECTLY!")

if __name__ == "__main__":
    test_full_backend_flow()
