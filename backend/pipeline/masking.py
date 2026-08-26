import os
import cv2
import numpy as np
import logging

logger = logging.getLogger(__name__)

# COCO dataset class indices for dynamic moving objects (people, vehicles, animals)
DYNAMIC_CLASSES = {0, 1, 2, 3, 5, 7, 15, 16, 17, 18} # person, bicycle, car, motorcycle, bus, truck, cat, dog, horse, sheep

def mask_dynamic_objects(frames_dir: str, masks_dir: str) -> list[str]:
    """
    Runs YOLOv8 object detection to identify dynamic objects (people, vehicles, animals)
    and produces binary mask images (0 = dynamic exclude region, 255 = static terrain).
    """
    os.makedirs(masks_dir, exist_ok=True)
    mask_paths = []
    
    frame_files = sorted([f for f in os.listdir(frames_dir) if f.endswith(('.jpg', '.jpeg', '.png'))])
    if not frame_files:
        logger.warning(f"No frame files found in {frames_dir} for masking.")
        return []

    yolo_model = None
    try:
        from ultralytics import YOLO
        # Load lightweight YOLOv8 nano model
        yolo_model = YOLO('yolov8n.pt')
        logger.info("YOLOv8 model loaded successfully for dynamic object masking.")
    except Exception as e:
        logger.warning(f"Could not load YOLOv8 model: {e}. Defaulting to full static background masks.")

    for f_name in frame_files:
        frame_path = os.path.join(frames_dir, f_name)
        img = cv2.imread(frame_path)
        if img is None:
            continue
            
        h, w = img.shape[:2]
        # Default mask: 255 (all pixels static background)
        mask = np.full((h, w), 255, dtype=np.uint8)

        if yolo_model is not None:
            try:
                results = yolo_model(img, verbose=False)
                for r in results:
                    boxes = r.boxes
                    if boxes is not None:
                        for box in boxes:
                            cls_id = int(box.cls[0].item())
                            if cls_id in DYNAMIC_CLASSES:
                                x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
                                # Zero out dynamic object bounding box region in mask
                                mask[y1:y2, x1:x2] = 0
            except Exception as e:
                logger.warning(f"YOLO inference error on {f_name}: {e}")

        mask_filename = os.path.splitext(f_name)[0] + ".png"
        mask_path = os.path.join(masks_dir, mask_filename)
        cv2.imwrite(mask_path, mask)
        mask_paths.append(mask_path)

    logger.info(f"Generated {len(mask_paths)} dynamic object feature masks in {masks_dir}")
    return mask_paths
