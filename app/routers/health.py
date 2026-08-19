"""
================================================================================
Cerebra — Brain Tumor MRI Diagnostic Platform
Health & System Status Router
================================================================================
"""

from __future__ import annotations

from datetime import datetime, timezone
from fastapi import APIRouter

from app.config import settings
from app.schemas import HealthResponse, ModelInfoResponse
from app.services.model_engine import model_engine

router = APIRouter(tags=["System & Status"])


@router.get("/health", response_model=HealthResponse, summary="System Health & Hardware Status")
async def health_check() -> HealthResponse:
    """Returns the operational status, loaded model state, and active hardware device."""
    if not model_engine.is_loaded:
        model_engine.initialize()

    return HealthResponse(
        status="healthy",
        version=settings.APP_VERSION,
        model_name="EfficientNet-B0",
        model_loaded=model_engine.is_loaded,
        device=str(model_engine.device),
        timestamp=datetime.now(timezone.utc).isoformat(),
    )


@router.get("/model-info", response_model=ModelInfoResponse, summary="Model Architecture & Benchmark Metadata")
async def get_model_info() -> ModelInfoResponse:
    """Returns detailed architecture metadata, input contracts, and benchmark figures."""
    return ModelInfoResponse(
        model_name="EfficientNet-B0",
        backbone="torchvision.models.efficientnet_b0 (Compound-scaled MBConv)",
        head="Dropout(0.3) -> Linear(1280, 4)",
        num_classes=settings.NUM_CLASSES,
        classes=settings.CLASS_NAMES,
        gradcam_target_layer="model.features[-1][0]",
        resolution=(settings.IMAGE_SIZE, settings.IMAGE_SIZE),
        normalization={
            "mean": list(settings.IMAGENET_MEAN),
            "std": list(settings.IMAGENET_STD)
        },
        benchmark_validation_accuracy="99.52%",
        disclaimer=settings.DISCLAIMER,
    )
