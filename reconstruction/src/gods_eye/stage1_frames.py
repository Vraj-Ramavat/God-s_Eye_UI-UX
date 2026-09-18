"""Stage 1 — Frame Extraction."""
from __future__ import annotations
from pathlib import Path
import cv2
import numpy as np
from .utils import ensure_dir, get_logger, save_json

log = get_logger("stage1_frames")

def _blur_score(frame_bgr: np.ndarray) -> float:
    gray = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY)
    return float(cv2.Laplacian(gray, cv2.CV_64F).var())

def extract_frames(video_path: str | Path, out_dir: str | Path, target_fps: float = 3.0, blur_threshold: float = 60.0, resize_width: int | None = 1920) -> dict:
    video_path = Path(video_path)
    out_dir = ensure_dir(out_dir)
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        raise FileNotFoundError(f"Could not open video: {video_path}")
    native_fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    step = max(1, round(native_fps / target_fps))
    records = []
    kept, frame_idx = 0, 0
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        if frame_idx % step == 0:
            timestamp_s = frame_idx / native_fps
            score = _blur_score(frame)
            is_kept = score >= blur_threshold
            out_path = None
            if is_kept:
                if resize_width and frame.shape[1] != resize_width:
                    scale = resize_width / frame.shape[1]
                    frame = cv2.resize(frame, (resize_width, int(frame.shape[0] * scale)), interpolation=cv2.INTER_AREA)
                out_path = out_dir / f"frame_{kept:05d}.jpg"
                cv2.imwrite(str(out_path), frame, [cv2.IMWRITE_JPEG_QUALITY, 95])
                kept += 1
            records.append({"source_frame_index": frame_idx, "timestamp_s": round(timestamp_s, 3), "blur_score": round(score, 2), "kept": is_kept, "output_path": str(out_path) if out_path else None})
        frame_idx += 1
    cap.release()
    meta = {"video": str(video_path), "native_fps": native_fps, "total_source_frames": total_frames, "sampling_step": step, "frames_kept": kept, "frames_dropped_for_blur": sum(1 for r in records if not r["kept"]), "records": records}
    save_json(meta, out_dir / "frames_meta.json")
    log.info(f"Kept {kept} frames -> {out_dir}")
    return meta
