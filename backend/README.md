# God's Eye Backend Service — 3D Reconstruction Pipeline

Backend FastAPI pipeline orchestrator for **God's Eye** (Team **Pixel Error**, SIH 2026, Problem Statement **SIH26158**).

---

## 🚀 Overview & Architecture

This service orchestrates the 6-stage single-pass drone video to 3D model reconstruction pipeline:

1. **`frames.py`**: Keyframe extraction via OpenCV.
2. **`masking.py`**: YOLOv8 dynamic object detection & binary mask generation for moving objects (people, vehicles).
3. **`poses.py`**: COLMAP SfM feature extraction, sequential matcher, & sparse 3D point cloud solver.
4. **`depth.py`**: Depth Anything V2 monocular depth map prediction.
5. **`fusion.py`**: Metric scale alignment between monocular depth maps & sparse SfM landmarks.
6. **`meshing.py`**: Open3D Poisson surface reconstruction & statistical outlier removal.
7. **`texture.py`**: Photogrammetric texture & vertex color projection.
8. **`export.py`**: Binary `.glb` 3D mesh export & flight path trajectory extraction.

---

## 🛠️ Prerequisites & Installation

### 1. Python Environment
Python 3.9+ is recommended.

```bash
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate
```

### 2. Install COLMAP CLI (for Camera Poses & SfM)
- **Windows**: Download COLMAP pre-built binary package from [COLMAP GitHub Releases](https://github.com/colmap/colmap/releases) and add `colmap.exe` to system `PATH`.
- **Ubuntu/Debian**: `sudo apt-get install colmap`
- **macOS**: `brew install colmap`

### 3. Install Python Dependencies

```bash
pip install -r backend/requirements.txt
```

*(Optional: Install PyTorch with CUDA for GPU acceleration)*:
```bash
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121
```

---

## ⚙️ Running the Server

Start the FastAPI application on port `8000`:

```bash
# Run server locally:
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

---

## 🌐 Endpoints

- `POST /api/jobs`: Accepts video upload (`.mp4`, `.mov`, `.avi`), returns `{ "job_id": "...", "status": "queued" }`.
- `GET /api/jobs/{job_id}`: Returns progress percentage (0–100%) and current pipeline stage.
- `GET /api/jobs/{job_id}/model.glb`: Serves binary 3D GLB model for Three.js viewer.
- `GET /api/jobs/{job_id}/metadata`: Serves telemetry JSON (vertices, faces, points, resolution, processing time).
- `GET /api/jobs/{job_id}/flightpath`: Serves camera trajectory waypoints for drone flythroughs.
- `GET /api/health`: Health status.
