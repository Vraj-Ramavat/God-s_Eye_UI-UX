"""Stage 4 — AI Depth Estimation."""
from __future__ import annotations
from pathlib import Path
import numpy as np
from .utils import ensure_dir, get_logger

log = get_logger("stage4_depth")

def estimate_depth(frames_dir: str | Path, out_dir: str | Path, model_name: str = "depth-anything/Depth-Anything-V2-Small-hf", device: str = "cuda") -> dict:
    import torch
    from PIL import Image
    from transformers import pipeline
    frames_dir = Path(frames_dir)
    out_dir = ensure_dir(out_dir)
    resolved_device = device if (device == "cpu" or torch.cuda.is_available()) else "cpu"
    depth_pipe = pipeline(task="depth-estimation", model=model_name, device=0 if resolved_device == "cuda" else -1)
    frame_paths = sorted(frames_dir.glob("frame_*.jpg"))
    if not frame_paths:
        raise FileNotFoundError(f"No frames found in {frames_dir}")
    for frame_path in frame_paths:
        image = Image.open(frame_path).convert("RGB")
        result = depth_pipe(image)
        depth_tensor = result["predicted_depth"]
        depth_arr = depth_tensor.squeeze().detach().cpu().numpy().astype(np.float32)
        idx = frame_path.stem.replace("frame_", "")
        np.save(out_dir / f"depth_{idx}.npy", depth_arr)
        d = depth_arr
        d_norm = (d - d.min()) / max(1e-6, (d.max() - d.min()))
        _save_preview_png(d_norm, out_dir / f"depth_{idx}.png")
    return {"frames_processed": len(frame_paths), "model_name": model_name, "device": resolved_device}

def _save_preview_png(depth_norm_0_1: np.ndarray, out_path: Path) -> None:
    import cv2
    preview = (depth_norm_0_1 * 65535).astype(np.uint16)
    cv2.imwrite(str(out_path), preview)

def load_depth_map(depth_npy_path: str | Path) -> np.ndarray:
    return np.load(str(depth_npy_path))
