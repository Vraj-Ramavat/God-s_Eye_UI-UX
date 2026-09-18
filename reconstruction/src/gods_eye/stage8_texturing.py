"""Stage 8 — apply source-video colour to the reconstructed mesh."""
from __future__ import annotations
from pathlib import Path
from .utils import ensure_dir, get_logger

log = get_logger("stage8_texturing")

def apply_vertex_colors(mesh_path: str | Path, colored_cloud_path: str | Path, output_mesh_path: str | Path) -> dict:
    import numpy as np
    import open3d as o3d
    output_mesh_path = Path(output_mesh_path)
    ensure_dir(output_mesh_path.parent)
    mesh = o3d.io.read_triangle_mesh(str(mesh_path))
    cloud = o3d.io.read_point_cloud(str(colored_cloud_path))
    if not cloud.has_colors():
        raise ValueError(f"{colored_cloud_path} has no per-point color")
    kdtree = o3d.geometry.KDTreeFlann(cloud)
    cloud_colors = np.asarray(cloud.colors)
    mesh_vertices = np.asarray(mesh.vertices)
    vertex_colors = np.zeros_like(mesh_vertices)
    for i, v in enumerate(mesh_vertices):
        _, idx, _ = kdtree.search_knn_vector_3d(v, 1)
        vertex_colors[i] = cloud_colors[idx[0]]
    mesh.vertex_colors = o3d.utility.Vector3dVector(vertex_colors)
    o3d.io.write_triangle_mesh(str(output_mesh_path), mesh)
    return {"num_vertices_colored": len(mesh_vertices), "output_path": str(output_mesh_path)}
