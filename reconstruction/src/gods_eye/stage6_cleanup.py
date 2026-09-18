"""Stage 6 — Point Cloud Cleanup."""
from __future__ import annotations
from pathlib import Path
from .utils import ensure_dir, get_logger

log = get_logger("stage6_cleanup")

def clean_point_cloud(input_path: str | Path, output_path: str | Path, nb_neighbors: int = 20, std_ratio: float = 2.0, voxel_size: float = 0.05) -> dict:
    import open3d as o3d
    output_path = Path(output_path)
    ensure_dir(output_path.parent)
    pcd = o3d.io.read_point_cloud(str(input_path))
    n_before = len(pcd.points)
    if voxel_size and voxel_size > 0:
        pcd = pcd.voxel_down_sample(voxel_size)
    pcd, _ = pcd.remove_statistical_outlier(nb_neighbors=nb_neighbors, std_ratio=std_ratio)
    radius = max(voxel_size * 2 if voxel_size else 0.1, 1e-6)
    pcd.estimate_normals(search_param=o3d.geometry.KDTreeSearchParamHybrid(radius=radius, max_nn=30))
    if len(pcd.points) >= 15:
        pcd.orient_normals_consistent_tangent_plane(k=15)
    o3d.io.write_point_cloud(str(output_path), pcd)
    return {"points_before": n_before, "points_after": len(pcd.points), "output_path": str(output_path)}
