"""Stage 9 — Export & Optimize."""
from __future__ import annotations
from pathlib import Path
from .utils import ensure_dir, get_logger

log = get_logger("stage9_export")

def export_glb(textured_mesh_path: str | Path, output_glb_path: str | Path, target_triangle_count: int | None = 150_000) -> dict:
    import open3d as o3d
    output_glb_path = Path(output_glb_path)
    ensure_dir(output_glb_path.parent)
    mesh = o3d.io.read_triangle_mesh(str(textured_mesh_path))
    n_before = len(mesh.triangles)
    if target_triangle_count and n_before > target_triangle_count:
        mesh = mesh.simplify_quadric_decimation(target_triangle_count)
    mesh.compute_vertex_normals()
    ok = o3d.io.write_triangle_mesh(str(output_glb_path), mesh, write_vertex_colors=True)
    if not ok:
        raise RuntimeError(f"Open3D failed to write GLB to {output_glb_path}")
    return {"triangles_before": n_before, "triangles_after": len(mesh.triangles), "output_path": str(output_glb_path), "file_size_mb": round(output_glb_path.stat().st_size / (1024 * 1024), 2) if output_glb_path.exists() else None}
