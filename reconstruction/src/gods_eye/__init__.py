"""Gods Eye — single-pass drone video to 3D model.

Each stage_*.py module implements one stage of the pipeline described in
MODEL_PIPELINE.md / README.md. Import what you need directly, e.g.:

    from gods_eye.stage1_frames import extract_frames
    from gods_eye.stage5_fusion import fuse_depth_with_sfm
"""

__version__ = "0.1.0"
