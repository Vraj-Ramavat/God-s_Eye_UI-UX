"""Stage 7 — Meshing."""
from __future__ import annotations
from pathlib import Path
import numpy as np
from .utils import ensure_dir, get_logger

log = get_logger("stage7_meshing")

def build_mesh(input_cloud_path: str | Path, output_mesh_path: str | Path, method: str = "poisson", poisson_depth: int = 9, density_trim_quantile: float = 0.02) -> dict:
    import open3d as o3d
    output_mesh_path = Path(output_mesh_path)
    ensure_dir(output_mesh_path.parent)
    pcd = o3d.io.read_point_cloud(str(input_cloud_path))
    if not pcd.has_normals():
        raise ValueError("Input cloud has no normals — run Stage 6 first.")
    if method == "poisson":
        mesh, densities = o3d.geometry.TriangleMesh.create_from_point_cloud_poisson(pcd, depth=poisson_depth)
        densities = np.asarray(densities)
        if density_trim_quantile > 0 and len(densities):
            threshold = np.quantile(densities, density_trim_quantile)
            mesh.remove_vertices_by_mask(densities < threshold)
    elif method == "ball_pivoting":
        distances = pcd.compute_nearest_neighbor_distance()
        avg_dist = np.mean(distances)
        radii = o3d.utility.DoubleVector([avg_dist * r for r in (1.5, 2.0, 3.0)])
        mesh = o3d.geometry.TriangleMesh.create_from_point_cloud_ball_pivoting(pcd, radii)
    else:
        raise ValueError(f"Unknown meshing method: {method}")
    mesh.remove_degenerate_triangles()
    mesh.remove_duplicated_triangles()
    mesh.remove_duplicated_vertices()
    mesh.remove_non_manifold_edges()
    mesh.compute_vertex_normals()
    o3d.io.write_triangle_mesh(str(output_mesh_path), mesh)
    return {"method": method, "num_vertices": len(mesh.vertices), "num_triangles": len(mesh.triangles), "output_path": str(output_mesh_path)}
