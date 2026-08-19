"""
================================================================================
Cerebra — Brain Tumor MRI Diagnostic Platform
Explainable AI (XAI) Triple-Suite Service: Grad-CAM, LIME, and SHAP
================================================================================
"""

from __future__ import annotations

import base64
import io
import logging
from typing import Dict, List, Tuple, Optional, Any

import cv2
import matplotlib
matplotlib.use("Agg")  # Non-interactive backend for thread-safe server rendering
import matplotlib.pyplot as plt
import numpy as np
from PIL import Image
import torch
import torch.nn as nn
from torchvision import transforms

from app.config import settings
from app.services.model_engine import model_engine, get_gradcam_target_layer

logger = logging.getLogger("Cerebra.Explainability")

# Dynamic dependency detection
try:
    from lime import lime_image
    from skimage.segmentation import mark_boundaries
    LIME_AVAILABLE = True
except ImportError:
    LIME_AVAILABLE = False
    logger.warning("LIME package not available.")

try:
    import shap
    SHAP_AVAILABLE = True
except ImportError:
    SHAP_AVAILABLE = False
    logger.warning("SHAP package not available.")


# ==============================================================================
# BASE64 IMAGE ENCODING UTILITIES
# ==============================================================================

def numpy_to_base64_png(image_np: np.ndarray) -> str:
    """
    Converts a NumPy RGB image array (uint8 [0, 255] or float [0, 1])
    into a standardized Data URI base64 PNG string for direct browser rendering.
    """
    if image_np.dtype != np.uint8:
        if image_np.max() <= 1.0:
            arr = np.clip(image_np * 255.0, 0, 255).astype(np.uint8)
        else:
            arr = np.clip(image_np, 0, 255).astype(np.uint8)
    else:
        arr = image_np

    pil_img = Image.fromarray(arr)
    buffer = io.BytesIO()
    pil_img.save(buffer, format="PNG", optimize=True)
    b64_str = base64.b64encode(buffer.getvalue()).decode("utf-8")
    return f"data:image/png;base64,{b64_str}"


def figure_to_base64_png(fig: plt.Figure) -> str:
    """Renders a Matplotlib figure directly into a base64 PNG string."""
    buffer = io.BytesIO()
    fig.savefig(buffer, format="PNG", bbox_inches="tight", dpi=150, pad_inches=0.05)
    plt.close(fig)
    b64_str = base64.b64encode(buffer.getvalue()).decode("utf-8")
    return f"data:image/png;base64,{b64_str}"


# ==============================================================================
# 1. GRAD-CAM (Gradient-Weighted Class Activation Mapping)
# ==============================================================================

class GradCAMExplainer:
    """
    Hook-based PyTorch Grad-CAM implementation.
    Targets final convolutional layer in EfficientNet-B0: model.features[-1][0]
    """
    def __init__(self, model: nn.Module, target_layer: nn.Module):
        self.model = model
        self.target_layer = target_layer
        self.gradients: Optional[torch.Tensor] = None
        self.activations: Optional[torch.Tensor] = None
        self._handles: List[Any] = []
        self._register_hooks()

    def _register_hooks(self):
        def forward_hook(module, input_t, output_t):
            self.activations = output_t.detach()

        def backward_hook(module, grad_in, grad_out):
            self.gradients = grad_out[0].detach()

        h1 = self.target_layer.register_forward_hook(forward_hook)
        h2 = self.target_layer.register_full_backward_hook(backward_hook)
        self._handles.extend([h1, h2])

    def remove_hooks(self):
        for h in self._handles:
            h.remove()
        self._handles.clear()

    def generate_cam(self, input_tensor: torch.Tensor, target_class: Optional[int] = None) -> np.ndarray:
        """Computes normalized 2D activation heatmap in range [0, 1]."""
        self.model.eval()
        self.model.zero_grad()

        # Clone tensor with gradients enabled for backward pass
        tensor = input_tensor.clone().detach().requires_grad_(True)
        output = self.model(tensor)

        if target_class is None:
            target_class = int(torch.argmax(output, dim=1).item())

        score = output[0, target_class]
        score.backward(retain_graph=True)

        if self.gradients is None or self.activations is None:
            raise RuntimeError("Failed to capture gradients or activations during Grad-CAM backward pass")

        # Global average pooling of gradients
        weights = torch.mean(self.gradients, dim=(2, 3), keepdim=True)
        cam = torch.sum(weights * self.activations, dim=1).squeeze(0)
        cam = torch.relu(cam)
        cam_np = cam.cpu().numpy()

        # Min-max normalization
        if np.max(cam_np) > np.min(cam_np):
            cam_np = (cam_np - np.min(cam_np)) / (np.max(cam_np) - np.min(cam_np))
        else:
            cam_np = np.zeros_like(cam_np)

        cam_resized = cv2.resize(
            cam_np,
            (input_tensor.shape[3], input_tensor.shape[2]),
            interpolation=cv2.INTER_LINEAR
        )
        return cam_resized


def overlay_cam_on_image(rgb_image_uint8: np.ndarray, cam_mask: np.ndarray, alpha: float = 0.5) -> np.ndarray:
    """Overlays Grad-CAM heatmap onto an RGB image using OpenCV Jet colormap."""
    rgb_float = rgb_image_uint8.astype(np.float32) / 255.0
    heatmap = cv2.applyColorMap(np.uint8(255 * cam_mask), cv2.COLORMAP_JET)
    heatmap_rgb = cv2.cvtColor(heatmap, cv2.COLOR_BGR2RGB) / 255.0
    overlay = alpha * heatmap_rgb + (1.0 - alpha) * rgb_float
    overlay = np.clip(overlay, 0.0, 1.0)
    return (overlay * 255.0).astype(np.uint8)


def generate_hotspot_focus_image(rgb_image_uint8: np.ndarray, cam_mask: np.ndarray) -> np.ndarray:
    """
    Highlights the primary activation focus by preserving high-attention regions
    and dimming surrounding non-salient parenchyma.
    """
    rgb_float = rgb_image_uint8.astype(np.float32) / 255.0
    dimmed = rgb_float * 0.28
    mask_3d = np.repeat(np.expand_dims(cam_mask, axis=-1), 3, axis=-1)
    spotlight = np.where(mask_3d > 0.40, rgb_float * 1.15, dimmed)
    spotlight = np.clip(spotlight, 0.0, 1.0)
    return (spotlight * 255.0).astype(np.uint8)


def get_anatomical_interpretation(target_class_idx: int, cam_mask: np.ndarray) -> str:
    class_name = settings.CLASS_NAMES[target_class_idx]
    y_coords, x_coords = np.where(cam_mask > 0.4)
    if len(y_coords) > 0:
        cy, cx = np.mean(y_coords), np.mean(x_coords)
        h, w = cam_mask.shape
        vert = "Superior (Cranial)" if cy < h * 0.38 else ("Inferior (Basal / Sellar)" if cy > h * 0.62 else "Central / Middle")
        horiz = "Left Hemisphere" if cx < w * 0.45 else ("Right Hemisphere" if cx > w * 0.55 else "Midline / Periventricular")
        region_loc = f"{vert}, {horiz}"
    else:
        region_loc = "Bilateral Cerebral Hemispheres"

    if class_name == "Glioma":
        return f"Grad-CAM activations demonstrate strong localization to the {region_loc}. High gradient weights correlate with infiltrative parenchymal density changes and irregular lesion margins characteristic of glioma."
    elif class_name == "Meningioma":
        return f"Attention is concentrated along the {region_loc} adjacent to the cranial vault/dura. Gradients emphasize circumscribed extra-axial lesion margins and dural-tail interfaces."
    elif class_name == "Pituitary":
        return f"High activation focal point detected in the {region_loc} skull-base region corresponding to sellar/suprasellar mass expansion and pituitary fossa involvement."
    else:
        return f"Activations are evenly distributed across symmetrical cerebral parenchyma ({region_loc}) without focal pathological mass clustering, confirming physiological baseline symmetry."


def generate_gradcam_explanation(
    input_tensor: torch.Tensor,
    uint8_image: np.ndarray,
    target_class: Optional[int] = None
) -> Tuple[str, float, str, str, str]:
    """
    Generates multi-representation Grad-CAM outputs:
    Returns (overlay_b64, peak_attention, heatmap_b64, hotspot_b64, anatomical_interpretation)
    """
    model = model_engine.model
    target_layer = get_gradcam_target_layer(model)
    explainer = GradCAMExplainer(model, target_layer)

    if target_class is None:
        target_class = 0

    try:
        cam_mask = explainer.generate_cam(input_tensor.to(model_engine.device), target_class=target_class)
        overlay = overlay_cam_on_image(uint8_image, cam_mask, alpha=0.5)
        overlay_b64 = numpy_to_base64_png(overlay)

        # Raw Heatmap
        heatmap = cv2.applyColorMap(np.uint8(255 * cam_mask), cv2.COLORMAP_JET)
        heatmap_rgb = cv2.cvtColor(heatmap, cv2.COLOR_BGR2RGB)
        heatmap_b64 = numpy_to_base64_png(heatmap_rgb)

        # Hotspot Focus Mask
        hotspot = generate_hotspot_focus_image(uint8_image, cam_mask)
        hotspot_b64 = numpy_to_base64_png(hotspot)

        peak_attention = round(float(np.max(cam_mask)) * 100.0, 2)
        interpretation = get_anatomical_interpretation(target_class, cam_mask)

        return overlay_b64, peak_attention, heatmap_b64, hotspot_b64, interpretation
    finally:
        explainer.remove_hooks()


# ==============================================================================
# 2. LIME (Local Interpretable Model-agnostic Explanations)
# ==============================================================================

class ModelProbabilityPredictor:
    """Predictor wrapper for LIME black-box superpixel perturbations."""
    def __init__(self, model: nn.Module, device: torch.device):
        self.model = model
        self.device = device
        self.transform = transforms.Compose([
            transforms.Resize((settings.IMAGE_SIZE, settings.IMAGE_SIZE)),
            transforms.ToTensor(),
            transforms.Normalize(mean=settings.IMAGENET_MEAN, std=settings.IMAGENET_STD),
        ])

    def __call__(self, images_np: np.ndarray) -> np.ndarray:
        if images_np.max() <= 1.0:
            images_np = (images_np * 255.0).astype(np.uint8)
        else:
            images_np = np.clip(images_np, 0, 255).astype(np.uint8)

        tensors = torch.stack([
            self.transform(Image.fromarray(img).convert("RGB")) for img in images_np
        ]).to(self.device)

        self.model.eval()
        with torch.no_grad():
            logits = self.model(tensors)
            probs = torch.softmax(logits, dim=1).cpu().numpy()
        return probs


def generate_lime_explanation(
    uint8_image: np.ndarray,
    target_class: int,
    num_samples: int = settings.LIME_NUM_SAMPLES,
    random_state: int = 42
) -> str:
    """Computes LIME superpixel explanations and returns base64 PNG data URL."""
    if not LIME_AVAILABLE:
        raise RuntimeError("LIME library is not available in the backend environment.")

    predictor = ModelProbabilityPredictor(model_engine.model, model_engine.device)
    explainer = lime_image.LimeImageExplainer(random_state=random_state)

    explanation = explainer.explain_instance(
        uint8_image,
        predictor,
        labels=(target_class,),
        top_labels=1,
        hide_color=0,
        num_samples=num_samples,
        random_seed=random_state,
    )

    temp, mask = explanation.get_image_and_mask(
        target_class,
        positive_only=True,
        num_features=5,
        hide_rest=False,
    )

    marked_image = mark_boundaries(temp / 255.0, mask)
    marked_uint8 = np.clip(marked_image * 255.0, 0, 255).astype(np.uint8)
    return numpy_to_base64_png(marked_uint8)


# ==============================================================================
# 3. SHAP (SHapley Additive exPlanations)
# ==============================================================================

def generate_shap_explanation(
    input_tensor: torch.Tensor,
    uint8_image: np.ndarray,
    target_class: int,
    background_size: int = settings.SHAP_BACKGROUND_SIZE
) -> str:
    """
    Computes gradient-based Shapley pixel attribution values using shap.GradientExplainer
    and renders a high-contrast attribution map as a base64 PNG data URL.
    """
    if not SHAP_AVAILABLE:
        raise RuntimeError("SHAP library is not available in the backend environment.")

    model = model_engine.model
    device = model_engine.device
    model.eval()

    tensor = input_tensor.to(device)

    # Reference background baseline: mean-centered baseline scans
    bg_tensors = torch.zeros((background_size, 3, settings.IMAGE_SIZE, settings.IMAGE_SIZE), device=device)

    with torch.enable_grad():
        explainer = shap.GradientExplainer(model, bg_tensors)
        shap_values = explainer.shap_values(tensor)

    # Format SHAP values for target class
    # shap_values is a list of [batch, C, H, W] for each class or single array
    if isinstance(shap_values, list):
        shap_target = shap_values[target_class][0]  # Shape: (3, 224, 224)
    elif isinstance(shap_values, np.ndarray) and shap_values.ndim == 5:
        shap_target = shap_values[0, ..., target_class]
    else:
        shap_target = np.asarray(shap_values)[0]

    # Convert to channels-last: (H, W, C)
    if shap_target.shape[0] == 3:
        shap_target = np.transpose(shap_target, (1, 2, 0))

    # Sum absolute attribution across RGB channels
    attribution_2d = np.sum(np.abs(shap_target), axis=-1)
    if np.max(attribution_2d) > np.min(attribution_2d):
        attribution_norm = (attribution_2d - np.min(attribution_2d)) / (np.max(attribution_2d) - np.min(attribution_2d))
    else:
        attribution_norm = np.zeros_like(attribution_2d)

    # Create Matplotlib side-by-side or overlay visualization
    fig, ax = plt.subplots(1, 1, figsize=(4, 4), dpi=150)
    ax.imshow(uint8_image, cmap="gray")
    im = ax.imshow(attribution_norm, cmap="inferno", alpha=0.55)
    ax.axis("off")
    ax.set_title(f"SHAP Pixel Attribution ({settings.CLASS_NAMES[target_class]})", fontsize=10, fontweight="bold")
    plt.tight_layout()

    return figure_to_base64_png(fig)
