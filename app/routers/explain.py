"""
================================================================================
Cerebra — Brain Tumor MRI Diagnostic Platform
Explainable AI (XAI) Suite Router
================================================================================
"""

from __future__ import annotations

import time
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status

from starlette.concurrency import run_in_threadpool

from app.config import settings
from app.schemas import ExplainResponse, GradCAMResult, LIMEResult, SHAPResult
from app.services.image_security import validate_and_load_upload
from app.services.preprocessing import preprocess_image_pipeline
from app.services.model_engine import model_engine
from app.services.explainability import (
    generate_gradcam_explanation,
    generate_lime_explanation,
    generate_shap_explanation,
    LIME_AVAILABLE,
    SHAP_AVAILABLE,
)

router = APIRouter(prefix="/explain", tags=["Explainable AI (XAI)"])


@router.post(
    "/gradcam",
    response_model=ExplainResponse,
    summary="Generate Grad-CAM Visual Heatmap",
    description=(
        "Executes Gradient-Weighted Class Activation Mapping (Grad-CAM) at the final convolutional "
        "layer (MBConv block) to produce an attention overlay highlighting spatial MRI features driving the prediction."
    )
)
async def explain_gradcam(
    file: UploadFile = File(..., description="Uploaded brain MRI scan image file")
) -> ExplainResponse:
    """Generates Grad-CAM explanation for uploaded MRI scan."""
    t0 = time.perf_counter()
    rgb_array, _, _, _ = await validate_and_load_upload(file)
    input_tensor, resized_uint8, _ = preprocess_image_pipeline(rgb_image=rgb_array, device=model_engine.device)

    pred_class, pred_idx, confidence, _, _, _ = model_engine.predict(input_tensor)

    overlay_b64, peak_attention, heatmap_b64, hotspot_b64, interpretation = generate_gradcam_explanation(
        input_tensor=input_tensor,
        uint8_image=resized_uint8,
        target_class=pred_idx
    )

    total_latency_ms = round((time.perf_counter() - t0) * 1000, 2)

    gradcam_res = GradCAMResult(
        overlay_image_base64=overlay_b64,
        heatmap_image_base64=heatmap_b64,
        hotspot_image_base64=hotspot_b64,
        target_layer="model.features[-1][0]",
        peak_attention_percentage=peak_attention,
        anatomical_interpretation=interpretation,
    )

    return ExplainResponse(
        status="success",
        predicted_class=pred_class,
        class_index=pred_idx,
        confidence=confidence,
        gradcam=gradcam_res,
        lime=None,
        shap=None,
        latency_ms=total_latency_ms,
        disclaimer=settings.DISCLAIMER,
    )


@router.post(
    "/lime",
    response_model=ExplainResponse,
    summary="Generate LIME Superpixel Explanations",
    description="Segments brain tissue into superpixels and computes local perturbation weights outlining diagnostic regions."
)
async def explain_lime(
    file: UploadFile = File(..., description="Uploaded brain MRI scan image file"),
    num_samples: int = Form(100, description="Number of perturbation samples")
) -> ExplainResponse:
    """Generates LIME explanation for uploaded MRI scan."""
    if not LIME_AVAILABLE:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="LIME explainability is not available in the current runtime environment."
        )

    t0 = time.perf_counter()
    rgb_array, _, _, _ = await validate_and_load_upload(file)
    input_tensor, resized_uint8, _ = preprocess_image_pipeline(rgb_image=rgb_array, device=model_engine.device)

    pred_class, pred_idx, confidence, _, _, _ = model_engine.predict(input_tensor)

    # Offload CPU-intensive superpixel perturbations to worker thread
    lime_b64 = await run_in_threadpool(
        generate_lime_explanation,
        uint8_image=resized_uint8,
        target_class=pred_idx,
        num_samples=min(num_samples, 200)
    )

    total_latency_ms = round((time.perf_counter() - t0) * 1000, 2)

    lime_res = LIMEResult(
        marked_image_base64=lime_b64,
        num_samples=num_samples,
        num_features=5,
    )

    return ExplainResponse(
        status="success",
        predicted_class=pred_class,
        class_index=pred_idx,
        confidence=confidence,
        gradcam=None,
        lime=lime_res,
        shap=None,
        latency_ms=total_latency_ms,
        disclaimer=settings.DISCLAIMER,
    )


@router.post(
    "/shap",
    response_model=ExplainResponse,
    summary="Generate SHAP Pixel Attribution Map",
    description="Estimates Shapley pixel marginal contributions against reference baseline scans using GradientExplainer."
)
async def explain_shap(
    file: UploadFile = File(..., description="Uploaded brain MRI scan image file")
) -> ExplainResponse:
    """Generates SHAP pixel attribution explanation for uploaded MRI scan."""
    if not SHAP_AVAILABLE:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="SHAP explainability is not available in the current runtime environment."
        )

    t0 = time.perf_counter()
    rgb_array, _, _, _ = await validate_and_load_upload(file)
    input_tensor, resized_uint8, _ = preprocess_image_pipeline(rgb_image=rgb_array, device=model_engine.device)

    pred_class, pred_idx, confidence, _, _, _ = model_engine.predict(input_tensor)

    # Offload CPU-intensive Shapley gradient integrations to worker thread
    shap_b64 = await run_in_threadpool(
        generate_shap_explanation,
        input_tensor=input_tensor,
        uint8_image=resized_uint8,
        target_class=pred_idx,
        background_size=settings.SHAP_BACKGROUND_SIZE
    )

    total_latency_ms = round((time.perf_counter() - t0) * 1000, 2)

    shap_res = SHAPResult(
        attribution_image_base64=shap_b64,
    )

    return ExplainResponse(
        status="success",
        predicted_class=pred_class,
        class_index=pred_idx,
        confidence=confidence,
        gradcam=None,
        lime=None,
        shap=shap_res,
        latency_ms=total_latency_ms,
        disclaimer=settings.DISCLAIMER,
    )


# Comprehensive diagnosis and multi-XAI analysis endpoint
analyze_router = APIRouter(tags=["Diagnosis & Prediction"])

@analyze_router.post(
    "/analyze",
    response_model=ExplainResponse,
    summary="Comprehensive Multi-XAI MRI Analysis",
    description="Runs inference and selectively generates Grad-CAM, LIME, and/or SHAP explanations in a unified request."
)
async def analyze_mri(
    file: UploadFile = File(..., description="Uploaded brain MRI scan image file"),
    include_gradcam: bool = Form(True, description="Generate Grad-CAM heatmap"),
    include_lime: bool = Form(False, description="Generate LIME superpixel boundaries"),
    include_shap: bool = Form(False, description="Generate SHAP pixel attribution map"),
    lime_samples: int = Form(100, description="LIME perturbation sample count")
) -> ExplainResponse:
    """Unified diagnosis and multi-interpretability endpoint."""
    t0 = time.perf_counter()
    rgb_array, _, _, _ = await validate_and_load_upload(file)
    input_tensor, resized_uint8, _ = preprocess_image_pipeline(rgb_image=rgb_array, device=model_engine.device)

    pred_class, pred_idx, confidence, _, _, _ = model_engine.predict(input_tensor)

    gradcam_res = None
    if include_gradcam:
        cam_b64, peak_att, hm_b64, hs_b64, interp = generate_gradcam_explanation(
            input_tensor=input_tensor,
            uint8_image=resized_uint8,
            target_class=pred_idx
        )
        gradcam_res = GradCAMResult(
            overlay_image_base64=cam_b64,
            heatmap_image_base64=hm_b64,
            hotspot_image_base64=hs_b64,
            target_layer="model.features[-1][0]",
            peak_attention_percentage=peak_att,
            anatomical_interpretation=interp,
        )

    lime_res = None
    if include_lime and LIME_AVAILABLE:
        lime_b64 = generate_lime_explanation(
            uint8_image=resized_uint8,
            target_class=pred_idx,
            num_samples=min(lime_samples, 200)
        )
        lime_res = LIMEResult(
            marked_image_base64=lime_b64,
            num_samples=lime_samples,
            num_features=5,
        )

    shap_res = None
    if include_shap and SHAP_AVAILABLE:
        shap_b64 = generate_shap_explanation(
            input_tensor=input_tensor,
            uint8_image=resized_uint8,
            target_class=pred_idx,
            background_size=settings.SHAP_BACKGROUND_SIZE
        )
        shap_res = SHAPResult(
            attribution_image_base64=shap_b64,
        )

    total_latency_ms = round((time.perf_counter() - t0) * 1000, 2)

    return ExplainResponse(
        status="success",
        predicted_class=pred_class,
        class_index=pred_idx,
        confidence=confidence,
        gradcam=gradcam_res,
        lime=lime_res,
        shap=shap_res,
        latency_ms=total_latency_ms,
        disclaimer=settings.DISCLAIMER,
    )
