"""
================================================================================
Cerebra — Brain Tumor MRI Diagnostic & Explainability Platform
Application Configuration Module
================================================================================
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import List, Tuple, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


# Project Root Directory (where app/ resides)
PROJECT_ROOT = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    """
    Application Settings configured via environment variables or .env file.
    Designed for 12-factor cloud portability and seamless containerization.
    """
    model_config = SettingsConfigDict(
        env_file=str(PROJECT_ROOT / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # Core Application Metadata
    APP_NAME: str = "Cerebra — Brain Tumor MRI AI Platform"
    APP_VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    DEBUG: bool = False

    # Server Binding
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # Cross-Origin Resource Sharing (CORS) for React Frontend
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "*",
    ]
    CORS_ALLOW_CREDENTIALS: bool = True
    CORS_ALLOW_METHODS: List[str] = ["*"]
    CORS_ALLOW_HEADERS: List[str] = ["*"]

    # Model & Checkpoint Settings
    MODEL_CHECKPOINT_PATH: str = str(PROJECT_ROOT / "checkpoints" / "best_efficientnetb0.pth")
    NUM_CLASSES: int = 4
    CLASS_KEYS: List[str] = ["glioma", "meningioma", "notumor", "pituitary"]
    CLASS_NAMES: List[str] = ["Glioma", "Meningioma", "No Tumor", "Pituitary"]
    
    # Preprocessing Input Contract
    IMAGE_SIZE: int = 224
    IMAGENET_MEAN: Tuple[float, float, float] = (0.485, 0.456, 0.406)
    IMAGENET_STD: Tuple[float, float, float] = (0.229, 0.224, 0.225)
    
    # Preprocessing Medical Enhancement Parameters
    ROI_CROP: bool = True
    ROI_THRESHOLD_VAL: int = 10
    ROI_BLUR_KSIZE: int = 5
    ROI_MARGIN_PIXELS: int = 3
    
    DENOISE_METHOD: str = "median"
    MEDIAN_KSIZE: int = 3
    
    CLAHE_APPLY: bool = True
    CLAHE_CLIP_LIMIT: float = 2.0
    CLAHE_TILE_GRID_SIZE: Tuple[int, int] = (8, 8)

    # Execution Hardware
    DEVICE: Optional[str] = None  # None = auto-detect ('cuda' if available else 'cpu')

    # Security & Upload Validation Constraints
    MAX_UPLOAD_SIZE_BYTES: int = 10 * 1024 * 1024  # 10 MB limit
    ALLOWED_EXTENSIONS: List[str] = [".jpg", ".jpeg", ".png", ".bmp", ".tif", ".tiff"]
    ALLOWED_MIME_TYPES: List[str] = [
        "image/jpeg",
        "image/png",
        "image/bmp",
        "image/tiff",
        "image/x-ms-bmp",
    ]
    MIN_IMAGE_DIMENSION: Tuple[int, int] = (64, 64)
    MAX_ASPECT_RATIO: float = 3.0

    # Explainable AI Performance Parameters
    LIME_NUM_SAMPLES: int = 150
    SHAP_BACKGROUND_SIZE: int = 2
    
    # Medical Disclaimer Notice
    DISCLAIMER: str = (
        "Educational and research prototype for clinical decision support. "
        "This tool provides probabilistic deep-learning classification and model-level "
        "interpretability maps. It does not constitute certified medical diagnosis or replacement for "
        "professional radiological evaluation."
    )


# Instantiate centralized settings singleton
settings = Settings()
