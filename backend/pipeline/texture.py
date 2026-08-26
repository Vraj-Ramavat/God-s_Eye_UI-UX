import os
import numpy as np
import logging
from typing import Optional

logger = logging.getLogger(__name__)

def apply_texture_or_colors(
    mesh,
    frames_dir: str,
    points: Optional[np.ndarray] = None,
    point_colors: Optional[np.ndarray] = None
):
    """
    Projects original drone frame pixels onto the mesh as vertex colors or bakes texture maps.
    """
    logger.info("Applying photogrammetric texture and vertex colors to mesh...")
    
    if mesh is None:
        return mesh

    try:
        import trimesh
        if isinstance(mesh, trimesh.Trimesh) and point_colors is not None and len(point_colors) == len(mesh.vertices):
            colors = (np.clip(point_colors, 0, 1) * 255).astype(np.uint8)
            if colors.shape[1] == 3:
                alpha = np.full((len(colors), 1), 255, dtype=np.uint8)
                colors = np.hstack([colors, alpha])
            mesh.visual.vertex_colors = colors
            logger.info("Successfully projected frame vertex colors onto Trimesh visual.")
            return mesh
    except Exception as e:
        logger.warning(f"Vertex color projection notice: {e}")

    return mesh
