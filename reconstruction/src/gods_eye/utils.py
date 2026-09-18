"""Shared helpers: config loading, logging, small IO utilities."""

from __future__ import annotations

import json
import logging
import shutil
from pathlib import Path
from typing import Any

import yaml


def load_config(config_path: str | Path = "configs/config.yaml") -> dict[str, Any]:
    """Load the pipeline's YAML config into a plain dict."""
    config_path = Path(config_path)
    with open(config_path, "r") as f:
        return yaml.safe_load(f)


def get_logger(name: str) -> logging.Logger:
    """A consistent, minimal logger used by every stage module."""
    logger = logging.getLogger(name)
    if not logger.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(
            logging.Formatter("[%(asctime)s] %(name)s — %(message)s", datefmt="%H:%M:%S")
        )
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)
    return logger


def ensure_dir(path: str | Path) -> Path:
    """Create a directory (and parents) if it doesn't exist, return it as a Path."""
    p = Path(path)
    p.mkdir(parents=True, exist_ok=True)
    return p


def which_or_none(binary_name: str) -> str | None:
    """Wraps shutil.which — used to detect optional external binaries (colmap, glomap)."""
    found = shutil.which(binary_name)
    if found:
        return found
    workspace_root = Path(__file__).resolve().parents[3]
    candidate_paths = [
        workspace_root / "vcpkg" / "installed" / "x64-windows" / "tools" / binary_name / f"{binary_name}.exe",
        workspace_root / "vcpkg" / "installed" / "x64-windows" / "tools" / f"{binary_name}.exe",
        workspace_root / "vcpkg" / "packages" / f"{binary_name}_x64-windows" / "tools" / binary_name / f"{binary_name}.exe",
    ]
    for cand in candidate_paths:
        if cand.exists():
            return str(cand)
    return None


def save_json(obj: Any, path: str | Path) -> None:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w") as f:
        json.dump(obj, f, indent=2)


def load_json(path: str | Path) -> Any:
    with open(path, "r") as f:
        return json.load(f)
