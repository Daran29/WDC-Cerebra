"""
================================================================================
Cerebra — Brain Tumor MRI Diagnostic Platform
Diagnostic Prediction & Preprocessing Router
================================================================================
"""

from __future__ import annotations

from typing import Dict, Any
from fastapi import APIRouter, UploadFile, File, HTTPException, status

from app.config import settings
from app.schemas import PredictionResponse, PredictionMetadata, PreprocessPreviewResponse, GradCAMResult
from app.services.image_security import validate_and_load_upload
from app.services.preprocessing import preprocess_image_pipeline
from app.services.model_engine import model_engine
from app.services.explainability import numpy_to_base64_png, generate_gradcam_explanation

router = APIRouter(tags=["Diagnosis & Prediction"])


@router.post(
    "/predict",
    response_model=PredictionResponse,
    summary="Classify Brain Tumor MRI Scan",
    description=(
        "Accepts a 2D brain MRI scan file (JPEG/PNG/BMP/TIFF), validates image security constraints, "
        "applies authoritative medical preprocessing (ROI crop, denoising, CLAHE, ImageNet standardization), "
        "and returns the four-class diagnostic prediction with full probability distribution."
    )
)
async def predict_brain_mri(
    file: UploadFile = File(..., description="Uploaded brain MRI scan image file")
) -> PredictionResponse:
    """End-to-end MRI classification endpoint."""
    # 1. Security & Format Validation
    rgb_array, pil_img, orig_w, orig_h = await validate_and_load_upload(file)

    # 2. Authoritative Preprocessing Pipeline
    input_tensor, resized_uint8, stages = preprocess_image_pipeline(
        rgb_image=rgb_array,
        device=model_engine.device
    )

    # 3. Model Inference & Softmax Decoding
    pred_class, pred_idx, confidence, probs_dict, breakdown, latency_ms = model_engine.predict(input_tensor)

    # 4. Generate Multi-Representation Grad-CAM Explanations
    overlay_b64, peak_att, hm_b64, hs_b64, interp = generate_gradcam_explanation(
        input_tensor=input_tensor,
        uint8_image=resized_uint8,
        target_class=pred_idx
    )
    gradcam_res = GradCAMResult(
        overlay_image_base64=overlay_b64,
        heatmap_image_base64=hm_b64,
        hotspot_image_base64=hs_b64,
        target_layer="model.features[-1][0]",
        peak_attention_percentage=peak_att,
        anatomical_interpretation=interp,
    )

    # 5. Preprocessing stage representations
    stages_dict = {
        "raw": numpy_to_base64_png(stages["raw"]),
        "cropped": numpy_to_base64_png(stages["cropped"]),
        "enhanced": numpy_to_base64_png(stages["enhanced"]),
        "resized": numpy_to_base64_png(stages["resized_uint8"]),
    }

    # 6. Construct Clean JSON Response Payload
    metadata = PredictionMetadata(
        original_resolution=[orig_w, orig_h],
        processed_resolution=[settings.IMAGE_SIZE, settings.IMAGE_SIZE],
        inference_latency_ms=latency_ms,
        device=str(model_engine.device),
        disclaimer=settings.DISCLAIMER,
    )

    return PredictionResponse(
        status="success",
        predicted_class=pred_class,
        class_index=pred_idx,
        confidence=confidence,
        confidence_percentage=f"{confidence * 100:.2f}%",
        class_probabilities=probs_dict,
        class_breakdown=breakdown,
        metadata=metadata,
        gradcam=gradcam_res,
        stages=stages_dict,
    )


@router.post(
    "/preprocess-preview",
    response_model=PreprocessPreviewResponse,
    summary="Inspect Preprocessing Pipeline Stages",
    description="Returns base64 images of each discrete medical enhancement stage (Raw, ROI Crop, CLAHE, Final 224x224)."
)
async def preview_preprocessing_stages(
    file: UploadFile = File(..., description="Uploaded brain MRI scan image file")
) -> PreprocessPreviewResponse:
    """Diagnostic preview endpoint demonstrating the computer vision enhancement stages."""
    rgb_array, pil_img, orig_w, orig_h = await validate_and_load_upload(file)

    _, _, stages = preprocess_image_pipeline(rgb_image=rgb_array)

    raw_b64 = numpy_to_base64_png(stages["raw"])
    crop_b64 = numpy_to_base64_png(stages["cropped"])
    enh_b64 = numpy_to_base64_png(stages["enhanced"])
    final_b64 = numpy_to_base64_png(stages["resized_uint8"])

    meta = {
        "original_resolution": [orig_w, orig_h],
        "cropped_resolution": [stages["cropped"].shape[1], stages["cropped"].shape[0]],
        "final_resolution": [settings.IMAGE_SIZE, settings.IMAGE_SIZE],
        "clahe_clip_limit": settings.CLAHE_CLIP_LIMIT,
        "median_kernel_size": settings.MEDIAN_KSIZE,
    }

    return PreprocessPreviewResponse(
        status="success",
        raw_image_base64=raw_b64,
        roi_cropped_base64=crop_b64,
        clahe_enhanced_base64=enh_b64,
        final_input_base64=final_b64,
        metadata=meta,
    )
