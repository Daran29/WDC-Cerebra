"""
================================================================================
Cerebra — Brain Tumor MRI Diagnostic & Explainability Platform
Pydantic Request & Response Schemas
================================================================================
"""

from __future__ import annotations

from typing import Dict, List, Optional, Any, Tuple
from pydantic import BaseModel, Field


# ==============================================================================
# 1. SYSTEM & HEALTH SCHEMAS
# ==============================================================================

class HealthResponse(BaseModel):
    status: str = Field("healthy", description="Application operational status")
    version: str = Field(..., description="API Version")
    model_name: str = Field(..., description="Serving model architecture name")
    model_loaded: bool = Field(..., description="Whether model weights are loaded in memory")
    device: str = Field(..., description="Active compute device (e.g. cuda, cpu)")
    timestamp: str = Field(..., description="Current UTC timestamp")


class ModelInfoResponse(BaseModel):
    model_name: str = Field("EfficientNet-B0", description="Primary model architecture")
    backbone: str = Field("torchvision.models.efficientnet_b0", description="Backbone feature extractor")
    head: str = Field("Dropout(0.3) -> Linear(1280, 4)", description="Classification head specification")
    num_classes: int = Field(4, description="Number of output diagnostic classes")
    classes: List[str] = Field(..., description="Target class names")
    gradcam_target_layer: str = Field("features[-1][0]", description="Layer hooked for Grad-CAM activations")
    resolution: Tuple[int, int] = Field((224, 224), description="Input spatial resolution (H, W)")
    normalization: Dict[str, List[float]] = Field(..., description="Mean and std normalization constants")
    benchmark_validation_accuracy: str = Field("99.52%", description="Held-out validation accuracy achieved")
    disclaimer: str = Field(..., description="Clinical decision support disclaimer")


# ==============================================================================
# 2. PREDICTION SCHEMAS
# ==============================================================================

class ClassProbabilityItem(BaseModel):
    class_name: str = Field(..., description="Tumor diagnostic category")
    class_index: int = Field(..., description="Zero-indexed class label")
    probability: float = Field(..., ge=0.0, le=1.0, description="Calibrated softmax probability")
    percentage: str = Field(..., description="Formatted percentage string (e.g., '96.50%')")


class PredictionMetadata(BaseModel):
    original_resolution: List[int] = Field(..., description="Original image dimensions [W, H]")
    processed_resolution: List[int] = Field(..., description="Preprocessed dimensions [W, H]")
    inference_latency_ms: float = Field(..., description="Model forward pass latency in milliseconds")
    device: str = Field(..., description="Device used for computation")
    preprocessing_applied: List[str] = Field(
        default_factory=lambda: [
            "Contour-based Brain ROI Cropping",
            "3x3 Median Denoising",
            "CIELAB L* CLAHE Contrast Enhancement",
            "Anti-Aliased 224x224 Resizing",
            "ImageNet Standardization"
        ]
    )
    disclaimer: str = Field(..., description="Medical research disclaimer")


class PredictionResponse(BaseModel):
    status: str = Field("success", description="Prediction status")
    predicted_class: str = Field(..., description="Top predicted diagnostic class")
    class_index: int = Field(..., description="Numeric index of predicted class")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score of top class")
    confidence_percentage: str = Field(..., description="Formatted percentage string")
    class_probabilities: Dict[str, float] = Field(..., description="Mapping of class names to probabilities")
    class_breakdown: List[ClassProbabilityItem] = Field(..., description="Sorted list of all class probabilities")
    metadata: PredictionMetadata = Field(..., description="Execution and pipeline metadata")
    gradcam: Optional[GradCAMResult] = Field(None, description="Grad-CAM interpretability result")
    stages: Optional[Dict[str, str]] = Field(None, description="Base64 preview of preprocessing pipeline stages")


# ==============================================================================
# 3. EXPLAINABILITY (XAI) SCHEMAS
# ==============================================================================

class GradCAMResult(BaseModel):
    overlay_image_base64: str = Field(..., description="Data URI base64 PNG of Grad-CAM Jet heatmap overlay")
    heatmap_image_base64: Optional[str] = Field(None, description="Data URI base64 PNG of pure Jet heatmap")
    hotspot_image_base64: Optional[str] = Field(None, description="Data URI base64 PNG of thresholded attention hotspot")
    target_layer: str = Field("model.features[-1][0]", description="Hooked target convolutional layer")
    method_description: str = Field(
        "Gradient-Weighted Class Activation Mapping (Grad-CAM) computes gradients of the predicted class "
        "score flowing into the final convolutional feature maps to highlight discriminative spatial regions.",
        description="Technical explanation of Grad-CAM"
    )
    peak_attention_percentage: float = Field(..., description="Peak localized activation intensity")
    anatomical_interpretation: Optional[str] = Field(None, description="Clinical feature attribution explanation")


class LIMEResult(BaseModel):
    marked_image_base64: str = Field(..., description="Data URI base64 PNG of LIME superpixel boundaries")
    num_samples: int = Field(..., description="Number of perturbation samples evaluated")
    num_features: int = Field(5, description="Top positive superpixel features displayed")
    method_description: str = Field(
        "Local Interpretable Model-agnostic Explanations (LIME) segments the brain MRI into superpixels "
        "and perturbs them to construct a local linear surrogate model identifying positive diagnostic regions.",
        description="Technical explanation of LIME"
    )


class SHAPResult(BaseModel):
    attribution_image_base64: str = Field(..., description="Data URI base64 PNG of Shapley pixel attribution heatmap")
    method_description: str = Field(
        "SHapley Additive exPlanations (SHAP GradientExplainer) estimates game-theoretic Shapley marginal "
        "contributions of each pixel relative to background reference scans.",
        description="Technical explanation of SHAP"
    )


class ExplainResponse(BaseModel):
    status: str = Field("success", description="Execution status")
    predicted_class: str = Field(..., description="Top predicted diagnostic class")
    class_index: int = Field(..., description="Numeric index of predicted class")
    confidence: float = Field(..., description="Top class confidence score")
    gradcam: Optional[GradCAMResult] = Field(None, description="Grad-CAM interpretability result")
    lime: Optional[LIMEResult] = Field(None, description="LIME interpretability result")
    shap: Optional[SHAPResult] = Field(None, description="SHAP interpretability result")
    latency_ms: float = Field(..., description="Total analysis latency in milliseconds")
    disclaimer: str = Field(..., description="Interpretability clinical notice")


# ==============================================================================
# 4. PREPROCESSING PREVIEW SCHEMA
# ==============================================================================

class PreprocessPreviewResponse(BaseModel):
    status: str = Field("success", description="Pipeline execution status")
    raw_image_base64: str = Field(..., description="Original raw uploaded image base64")
    roi_cropped_base64: str = Field(..., description="Brain parenchyma cropped image base64")
    clahe_enhanced_base64: str = Field(..., description="CLAHE contrast enhanced image base64")
    final_input_base64: str = Field(..., description="Final 224x224 resized normalized view base64")
    metadata: Dict[str, Any] = Field(..., description="Step-by-step dimensions and statistics")


# ==============================================================================
# 5. ERROR SCHEMA
# ==============================================================================

class ErrorResponse(BaseModel):
    status: str = Field("error", description="Failure indicator")
    error_code: str = Field(..., description="Standardized error category")
    detail: str = Field(..., description="Sanitized client-safe error message")
    timestamp: str = Field(..., description="UTC ISO-8601 timestamp")
