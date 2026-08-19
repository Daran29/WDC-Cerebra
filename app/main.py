"""
================================================================================
Cerebra — Brain Tumor MRI Classification & Explainability Platform
FastAPI Application Entry Point
================================================================================
"""

from __future__ import annotations

import logging
import sys
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI, Request, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.services.model_engine import model_engine
from app.routers import health, predict, explain

# Configure structured application logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("Cerebra.Application")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application Lifespan Event Handler.
    Pre-loads the PyTorch model checkpoint once at startup to eliminate cold-start latency.
    """
    logger.info("=" * 70)
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    logger.info(f"Target Checkpoint: {settings.MODEL_CHECKPOINT_PATH}")
    
    # Initialize Model Engine Singleton
    try:
        model_engine.initialize()
        logger.info(f"Model loaded successfully on compute device: {model_engine.device}")
    except Exception as exc:
        logger.error(f"FATAL: Model initialization failed: {exc}", exc_info=True)

    logger.info("=" * 70)
    yield
    logger.info(f"Shutting down {settings.APP_NAME}...")


# Instantiate FastAPI Application
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=r"""
# 🧠 Cerebra — Brain Tumor MRI Classification & Explainability Suite

Cerebra is an end-to-end medical AI platform for **4-Class Brain Tumor MRI Classification** (`Glioma`, `Meningioma`, `No Tumor`, `Pituitary`) featuring state-of-the-art **Explainable AI (XAI)** interpretability.

### 🔬 Architecture & Model Details:
- **Primary Backbone:** Compound-scaled `EfficientNet-B0` with regularized classification head.
- **Trained Model Artifact:** 4-class checkpoint achieving **99.52% Validation Accuracy**.
- **Input Contract:** $224 \times 224 \times 3$ RGB with ImageNet normalization ($\mu=[0.485, 0.456, 0.406]$, $\sigma=[0.229, 0.224, 0.225]$).
- **Preprocessing Pipeline:** Brain ROI contour crop $\to$ 3×3 median filter $\to$ CIELAB L* CLAHE contrast enhancement.

### 🔮 Explainability Suite (XAI):
1. **Grad-CAM (Gradient-Weighted Class Activation Mapping):** Hooked into layer `model.features[-1][0]`.
2. **LIME (Local Interpretable Model-agnostic Explanations):** Superpixel segmentation & boundary marking.
3. **SHAP (SHapley Additive exPlanations):** Gradient-based Shapley pixel attribution maps.

### 🛡️ Privacy & Security:
- Fully in-memory byte stream processing (zero permanent retention of patient MRI uploads).
- Strict image magic-byte verification, size boundaries, and dimension audit.
- Sanitized client error responses preventing filesystem path or trace leakage.

---
*Notice: This system is a decision-support research prototype and does not replace certified radiological evaluation.*
    """,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure Cross-Origin Resource Sharing (CORS) for React Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
    allow_methods=settings.CORS_ALLOW_METHODS,
    allow_headers=settings.CORS_ALLOW_HEADERS,
)


# ==============================================================================
# GLOBAL SANITIZED EXCEPTION HANDLERS
# ==============================================================================

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Returns standardized JSON structure for anticipated HTTP exceptions."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "status": "error",
            "error_code": f"HTTP_{exc.status_code}",
            "detail": exc.detail,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """
    Catches all unexpected server exceptions and returns a sanitized error payload,
    preventing leaks of filesystem paths, model paths, or internal tracebacks.
    """
    logger.error(f"Unhandled Exception on {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "status": "error",
            "error_code": "INTERNAL_SERVER_ERROR",
            "detail": "An unexpected error occurred during processing. Please verify the uploaded image and try again.",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    )


# ==============================================================================
# ROUTER REGISTRATION
# ==============================================================================

app.include_router(health.router, prefix=settings.API_PREFIX)
app.include_router(predict.router, prefix=settings.API_PREFIX)
app.include_router(explain.router, prefix=settings.API_PREFIX)
app.include_router(explain.analyze_router, prefix=settings.API_PREFIX)


@app.get("/", tags=["System & Status"], summary="Root Health Check")
async def root():
    """Root entry point providing quick status and API documentation links."""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "online",
        "documentation": "/docs",
        "health_check": f"{settings.API_PREFIX}/health",
        "disclaimer": settings.DISCLAIMER,
    }
