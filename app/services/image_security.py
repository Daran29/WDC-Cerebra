"""
================================================================================
Cerebra — Brain Tumor MRI Diagnostic Platform
Image Security & Input Validation Service
================================================================================
"""

from __future__ import annotations

import io
from pathlib import Path
from typing import Tuple, Optional, Union
import numpy as np
from PIL import Image, UnidentifiedImageError
from fastapi import UploadFile, HTTPException, status

from app.config import settings


# Common Image Magic Number Signatures for fast byte-level validation
MAGIC_BYTES = {
    b"\xff\xd8\xff": "image/jpeg",
    b"\x89PNG\r\n\x1a\n": "image/png",
    b"BM": "image/bmp",
    b"II*\x00": "image/tiff",
    b"MM\x00*": "image/tiff",
}


def _verify_magic_bytes(data: bytes) -> bool:
    """Verifies that the byte stream starts with a recognized image header signature."""
    for sig in MAGIC_BYTES:
        if data.startswith(sig):
            return True
    return False


async def validate_and_load_upload(
    upload_file: UploadFile,
    max_size_bytes: int = settings.MAX_UPLOAD_SIZE_BYTES,
    min_dimensions: Tuple[int, int] = settings.MIN_IMAGE_DIMENSION,
    max_aspect_ratio: float = settings.MAX_ASPECT_RATIO,
    allowed_extensions: Tuple[str, ...] = tuple(settings.ALLOWED_EXTENSIONS)
) -> Tuple[np.ndarray, Image.Image, int, int]:
    """
    Safely reads, validates, and decodes an uploaded MRI image entirely in memory.
    
    Security & Integrity Measures:
    1. Rejects empty or sub-threshold byte payloads.
    2. Rejects files exceeding the configured maximum size (10 MB).
    3. Audits file extension against allowed whitelist.
    4. Validates byte magic numbers (prevents renamed malicious binaries).
    5. Performs deep PIL header and EOF integrity verification.
    6. Ensures spatial resolution meets minimum clinical threshold (64x64).
    7. Verifies aspect ratio does not exceed anomaly threshold (3.0).
    8. Normalizes color channels to 3-channel RGB uint8 array.
    9. Zero disk persistence — processes completely in memory.
    
    Args:
        upload_file: FastAPI UploadFile from multipart request.
        max_size_bytes: Maximum allowed byte count.
        min_dimensions: Minimum acceptable (W, H).
        max_aspect_ratio: Maximum allowable width/height ratio.
        allowed_extensions: Whitelisted file extensions.
        
    Returns:
        Tuple: (rgb_numpy_array, pil_image, original_width, original_height)
        
    Raises:
        HTTPException: With client-safe 400/422 status codes on validation failure.
    """
    filename = upload_file.filename or "uploaded_mri"
    suffix = Path(filename).suffix.lower()

    # 1. Extension Whitelist Check
    if suffix not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{suffix}'. Allowed formats: {', '.join(allowed_extensions)}"
        )

    # 2. In-Memory Byte Stream Reading
    try:
        content = await upload_file.read()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to read uploaded file stream: {str(exc)}"
        )

    if not content or len(content) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty (0 bytes)."
        )

    # 3. Payload Size Boundary Check
    if len(content) > max_size_bytes:
        max_mb = max_size_bytes / (1024 * 1024)
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File size ({len(content) / (1024*1024):.2f} MB) exceeds maximum allowed size ({max_mb:.0f} MB)."
        )

    # 4. Magic Byte Verification
    if not _verify_magic_bytes(content):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File content does not match valid image byte signatures (JPEG, PNG, BMP, TIFF)."
        )

    # 5. Deep PIL Decode & Verification
    try:
        # First pass: verify structural integrity
        with Image.open(io.BytesIO(content)) as verify_img:
            verify_img.verify()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT if hasattr(status, "HTTP_422_UNPROCESSABLE_CONTENT") else 422,
            detail=f"Corrupted or malformed image data: {str(exc)}"
        )

    # Second pass: reopen for pixel extraction
    try:
        pil_img = Image.open(io.BytesIO(content))
        # Ensure image is loaded into memory
        pil_img.load()
    except Exception as exc:
        raise HTTPException(
            status_code=422,
            detail=f"Failed to decode image pixels: {str(exc)}"
        )

    orig_w, orig_h = pil_img.size

    # 6. Spatial Resolution Check
    if orig_w < min_dimensions[0] or orig_h < min_dimensions[1]:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Image resolution ({orig_w}x{orig_h}) is below the minimum required "
                f"diagnostic threshold of {min_dimensions[0]}x{min_dimensions[1]}."
            )
        )

    # 7. Aspect Ratio Anomaly Check
    aspect_ratio = max(orig_w / orig_h, orig_h / orig_w)
    if aspect_ratio > max_aspect_ratio:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Image aspect ratio ({aspect_ratio:.2f}) exceeds the acceptable "
                f"anatomical threshold of {max_aspect_ratio:.1f}."
            )
        )

    # 8. Standardize to 3-Channel RGB
    if pil_img.mode != "RGB":
        pil_img = pil_img.convert("RGB")

    rgb_array = np.asarray(pil_img, dtype=np.uint8)

    return rgb_array, pil_img, orig_w, orig_h


def validate_and_load_image_bytes(
    content: bytes,
    filename: str = "sample.jpg",
    max_size_bytes: int = settings.MAX_UPLOAD_SIZE_BYTES,
    min_dimensions: Tuple[int, int] = settings.MIN_IMAGE_DIMENSION,
    max_aspect_ratio: float = settings.MAX_ASPECT_RATIO
) -> Tuple[np.ndarray, Image.Image, int, int]:
    """Synchronous helper for testing or local sample files."""
    suffix = Path(filename).suffix.lower()
    if suffix not in settings.ALLOWED_EXTENSIONS:
        raise ValueError(f"Unsupported format: {suffix}")

    if not content or len(content) == 0:
        raise ValueError("Empty byte stream")

    if len(content) > max_size_bytes:
        raise ValueError("File exceeds size limit")

    if not _verify_magic_bytes(content):
        raise ValueError("Invalid magic bytes")

    with Image.open(io.BytesIO(content)) as v:
        v.verify()

    pil_img = Image.open(io.BytesIO(content)).convert("RGB")
    orig_w, orig_h = pil_img.size

    if orig_w < min_dimensions[0] or orig_h < min_dimensions[1]:
        raise ValueError(f"Resolution too small: {orig_w}x{orig_h}")

    if max(orig_w / orig_h, orig_h / orig_w) > max_aspect_ratio:
        raise ValueError("Aspect ratio exceeds limit")

    rgb_array = np.asarray(pil_img, dtype=np.uint8)
    return rgb_array, pil_img, orig_w, orig_h
