"""Media processing utilities."""
import os
from typing import Optional, Tuple

from PIL import Image


def validate_image(file_path: str) -> bool:
    """Check if a file is a valid image."""
    try:
        with Image.open(file_path) as img:
            img.verify()
        return True
    except Exception:
        return False


def get_image_dimensions(file_path: str) -> Optional[Tuple[int, int]]:
    """Get width, height of an image."""
    try:
        with Image.open(file_path) as img:
            return img.size
    except Exception:
        return None


def create_thumbnail(file_path: str, output_path: str, size: Tuple[int, int] = (200, 200)) -> bool:
    """Create a thumbnail from an image."""
    try:
        with Image.open(file_path) as img:
            img.thumbnail(size, Image.Resampling.LANCZOS)
            img.save(output_path)
        return True
    except Exception:
        return False
