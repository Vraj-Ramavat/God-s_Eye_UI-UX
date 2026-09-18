# God's Eye — Unified SIH 2026 Project

This branch merges the two original God's Eye repositories into one application.

## What is used from each repository

- **God-s_Eye_UI-UX:** React/Vite frontend, React Three Fiber 3D viewer, upload flow, dashboard, telemetry, measurements and flythrough controls.
- **SIH-2026-Gods_Eye:** the canonical video-to-3D reconstruction logic.
- **FastAPI backend:** keeps the UI repo's REST contract, but now runs the canonical reconstruction engine instead of the old duplicate `backend/pipeline` implementation.

## Final pipeline

`Drone video -> frame quality filtering -> YOLO dynamic-object masking -> COLMAP/PyCOLMAP SfM -> Depth Anything V2 -> robust depth/SfM fusion -> point-cloud cleanup -> Poisson meshing -> source-video vertex colour -> GLB -> FastAPI -> React Three Fiber`

## Frontend

```bash
npm install
npm run dev
```

The frontend uses `http://localhost:8000` by default. Set `VITE_BACKEND_URL` to use another backend host.

## Backend

Python 3.10/3.11 is recommended. COLMAP must be installed and available on PATH; GLOMAP is optional. An NVIDIA CUDA GPU is strongly recommended for YOLO and depth estimation.

```bash
python -m venv .venv
# Linux/macOS: source .venv/bin/activate
# Windows PowerShell: .\.venv\Scripts\Activate.ps1
pip install -r backend/requirements.txt
uvicorn backend.main:app --reload --port 8000
```

Health check:

```text
http://localhost:8000/api/health
```

## API

- `POST /api/jobs` — upload a drone video and start reconstruction.
- `GET /api/jobs/{job_id}` — processing status and progress.
- `GET /api/jobs/{job_id}/model.glb` — final generated GLB.
- `GET /api/jobs/{job_id}/metadata` — reconstruction metrics.
- `GET /api/jobs/{job_id}/flightpath` — COLMAP camera path for the viewer.

## Important accuracy note

Monocular SfM and relative monocular depth do not, by themselves, guarantee absolute real-world metric scale. GPS/telemetry, a known metric reference or a metric-depth prior is needed when absolute scale/georeferencing is required.

## Merge decision

The previous `backend/pipeline/*` implementation has been removed from this merged branch. This avoids the earlier conflicts in frame naming, mask semantics, COLMAP mask handling, depth representation and fusion logic. There is now one reconstruction engine under `reconstruction/src/gods_eye/`.
