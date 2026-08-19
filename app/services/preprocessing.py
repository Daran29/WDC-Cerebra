"""
================================================================================
Cerebra — Brain Tumor MRI Diagnostic Platform
Authoritative Medical Preprocessing Service
================================================================================
Strictly adheres to the training input contract:
1. Brain Parenchyma Contour ROI Extraction (Background Air Removal)
2. Edge-Preserving 3x3 Median Denoising (Rician noise reduction)
3. CIELAB L* Channel CLAHE Contrast Enhancement
4. Anti-Aliasing Resizing to 224x224 (cv2.INTER_AREA)
5. ImageNet Standardization (mu=[0.485, 0.456, 0.406], sigma=[0.229, 0.224, 0.225])
6. PyTorch Tensor Formatting (1, 3, 224, 224)
================================================================================
"""

from __future__ import annotations

from typing import Tuple, Dict, Any, Optional
import cv2
import numpy as np
import torch

from app.config import settings


def crop_brain_roi(
    image: np.ndarray,
    threshold_val: int = settings.ROI_THRESHOLD_VAL,
    blur_ksize: int = settings.ROI_BLUR_KSIZE,
    margin_pixels: int = settings.ROI_MARGIN_PIXELS
) -> np.ndarray:
    """
    Extracts the extreme bounding box of the brain parenchyma to remove
    non-informative background air space while preserving peripheral dural margins.
    
    Medical Context:
    Raw MRI scans frequently contain 40-60% empty black background air space.
    Cropping the brain bounding box maximizes the spatial pixel density allocated to
    brain tissue and lesion morphology.
    """
    if image.ndim == 3:
        gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
    else:
        gray = image.copy()

    blur_k = blur_ksize if blur_ksize % 2 == 1 else blur_ksize + 1
    blurred = cv2.GaussianBlur(gray, (blur_k, blur_k), 0)

    _, thresh = cv2.threshold(blurred, threshold_val, 255, cv2.THRESH_BINARY)
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    thresh = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel, iterations=2)

    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return image

    largest_contour = max(contours, key=cv2.contourArea)
    total_area = gray.shape[0] * gray.shape[1]

    # Verify minimum contour area (must be at least 10% of image area)
    if cv2.contourArea(largest_contour) < (0.10 * total_area):
        return image

    x, y, w, h = cv2.boundingRect(largest_contour)
    img_h, img_w = image.shape[:2]

    # Apply safety margin to protect peripheral convexities
    y_min = max(0, y - margin_pixels)
    y_max = min(img_h, y + h + margin_pixels)
    x_min = max(0, x - margin_pixels)
    x_max = min(img_w, x + w + margin_pixels)

    cropped = image[y_min:y_max, x_min:x_max]
    return cropped if cropped.size > 0 else image


def denoise_image(
    image: np.ndarray,
    method: str = settings.DENOISE_METHOD,
    kernel_size: int = settings.MEDIAN_KSIZE
) -> np.ndarray:
    """
    Applies edge-preserving noise reduction to eliminate MRI acquisition noise.
    Uses median filtering to eliminate Rician noise spikes without blurring tumor boundaries.
    """
    if method == "none" or method is None:
        return image

    k = kernel_size if kernel_size % 2 == 1 else kernel_size + 1
    if method == "median":
        if image.ndim == 3:
            denoised = np.zeros_like(image)
            for c in range(3):
                denoised[:, :, c] = cv2.medianBlur(image[:, :, c], k)
            return denoised
        return cv2.medianBlur(image, k)

    return image


def apply_clahe(
    image: np.ndarray,
    clip_limit: float = settings.CLAHE_CLIP_LIMIT,
    tile_grid_size: Tuple[int, int] = settings.CLAHE_TILE_GRID_SIZE
) -> np.ndarray:
    """
    Applies Contrast Limited Adaptive Histogram Equalization (CLAHE).
    Applied EXCLUSIVELY to the Lightness (L*) channel in CIELAB space to sharpen
    internal tissue and tumor contrast without causing chromatic distortion.
    """
    clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=tile_grid_size)
    if image.ndim == 3:
        lab = cv2.cvtColor(image, cv2.COLOR_RGB2LAB)
        l_channel, a_channel, b_channel = cv2.split(lab)
        l_clahe = clahe.apply(l_channel)
        lab_clahe = cv2.merge((l_clahe, a_channel, b_channel))
        enhanced_rgb = cv2.cvtColor(lab_clahe, cv2.COLOR_LAB2RGB)
        return enhanced_rgb
    return clahe.apply(image)


def resize_image(
    image: np.ndarray,
    target_size: Tuple[int, int] = (settings.IMAGE_SIZE, settings.IMAGE_SIZE)
) -> np.ndarray:
    """
    Resizes the image to 224x224 with anti-aliasing (INTER_AREA for downsampling,
    INTER_CUBIC for upsampling).
    """
    h_orig, w_orig = image.shape[:2]
    target_w, target_h = target_size[0], target_size[1]
    if (w_orig, h_orig) == (target_w, target_h):
        return image

    if target_w < w_orig or target_h < h_orig:
        interpolation = cv2.INTER_AREA
    else:
        interpolation = cv2.INTER_CUBIC

    return cv2.resize(image, (target_w, target_h), interpolation=interpolation)


def normalize_imagenet(
    image: np.ndarray,
    mean: Tuple[float, float, float] = settings.IMAGENET_MEAN,
    std: Tuple[float, float, float] = settings.IMAGENET_STD
) -> np.ndarray:
    """
    Standardizes image intensities to match pre-trained ImageNet backbone input:
    I_norm = (I/255.0 - mean) / std
    """
    img_float = image.astype(np.float32) / 255.0
    mean_arr = np.array(mean, dtype=np.float32).reshape(1, 1, 3)
    std_arr = np.array(std, dtype=np.float32).reshape(1, 1, 3)
    return (img_float - mean_arr) / std_arr


def preprocess_image_pipeline(
    rgb_image: np.ndarray,
    device: Optional[torch.device | str] = None
) -> Tuple[torch.Tensor, np.ndarray, Dict[str, np.ndarray]]:
    """
    Executes the end-to-end deterministic preprocessing pipeline on an RGB image.
    
    Stages:
    1. Brain ROI Contour Crop
    2. 3x3 Median Denoising
    3. CIELAB L* CLAHE Contrast Enhancement
    4. 224x224 Anti-Aliasing Resizing
    5. ImageNet Standardization
    6. PyTorch Tensor Conversion: (1, 3, 224, 224)
    
    Returns:
        Tuple:
        - input_tensor: torch.Tensor on target device of shape (1, 3, 224, 224)
        - uint8_enhanced_224: np.ndarray of shape (224, 224, 3) in [0, 255] uint8 (ideal for XAI/display)
        - stages: Dict containing intermediate visualization arrays
    """
    # 1. ROI Crop
    cropped = crop_brain_roi(rgb_image) if settings.ROI_CROP else rgb_image

    # 2. Denoise
    denoised = denoise_image(cropped)

    # 3. CLAHE
    enhanced = apply_clahe(denoised) if settings.CLAHE_APPLY else denoised

    # 4. Resize
    resized_uint8 = resize_image(enhanced, (settings.IMAGE_SIZE, settings.IMAGE_SIZE))

    # 5. ImageNet Normalization
    normalized_float = normalize_imagenet(resized_uint8)

    # 6. Tensor Conversion (C, H, W) -> (1, C, H, W)
    tensor_chw = np.transpose(normalized_float, (2, 0, 1))
    tensor_batch = np.expand_dims(tensor_chw, axis=0)
    input_tensor = torch.from_numpy(tensor_batch).float()

    if device is not None:
        input_tensor = input_tensor.to(device)

    stages = {
        "raw": rgb_image,
        "cropped": cropped,
        "enhanced": enhanced,
        "resized_uint8": resized_uint8,
    }

    return input_tensor, resized_uint8, stages
