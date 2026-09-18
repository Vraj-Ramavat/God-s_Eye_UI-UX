"""Stage 2 — Dynamic Object Masking."""
from __future__ import annotations
from pathlib import Path
import cv2
import numpy as np
from .utils import ensure_dir, get_logger

log = get_logger("stage2_masking")
DEFAULT_DYNAMIC_CLASSES = ["person", "car", "truck", "bus", "motorcycle", "bicycle"]

def mask_dynamic_objects(frames_dir: str | Path, out_dir: str | Path, weights_path: str | Path = "models/yolo26n.pt", confidence: float = 0.35, dynamic_classes: list[str] | None = None, dilate_px: int = 15) -> dict:
    from ultralytics import YOLO
    dynamic_classes = dynamic_classes or DEFAULT_DYNAMIC_CLASSES
    frames_dir = Path(frames_dir)
    out_dir = ensure_dir(out_dir)
    model = YOLO(str(weights_path))
    name_to_id = {v: k for k, v in model.names.items()}
    target_ids = {name_to_id[c] for c in dynamic_classes if c in name_to_id}
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (dilate_px * 2 + 1, dilate_px * 2 + 1))
    frame_paths = sorted(frames_dir.glob("frame_*.jpg"))
    if not frame_paths:
        raise FileNotFoundError(f"No frames found in {frames_dir}")
    summary = {"frames_processed": 0, "frames_with_detections": 0, "total_boxes_masked": 0}
    for frame_path in frame_paths:
        frame = cv2.imread(str(frame_path))
        h, w = frame.shape[:2]
        mask = np.zeros((h, w), dtype=np.uint8)
        results = model.predict(frame, conf=confidence, verbose=False)[0]
        boxes_masked = 0
        for box in results.boxes:
            cls_id = int(box.cls.item())
            if cls_id in target_ids:
                x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
                cv2.rectangle(mask, (x1, y1), (x2, y2), 255, thickness=-1)
                boxes_masked += 1
        if dilate_px > 0 and boxes_masked > 0:
            mask = cv2.dilate(mask, kernel)
        mask_path = out_dir / frame_path.name.replace("frame_", "mask_").replace(".jpg", ".png")
        cv2.imwrite(str(mask_path), mask)
        summary["frames_processed"] += 1
        summary["frames_with_detections"] += int(boxes_masked > 0)
        summary["total_boxes_masked"] += boxes_masked
    return summary
