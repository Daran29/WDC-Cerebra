"""
================================================================================
Cerebra — Brain Tumor MRI Diagnostic Platform
Model Engine & Inference Singleton Service
================================================================================
"""

from __future__ import annotations

import logging
import threading
import time
from pathlib import Path
from typing import Dict, List, Tuple, Optional, Any

import numpy as np
import torch
import torch.nn as nn
from torchvision import models

from app.config import settings

logger = logging.getLogger("Cerebra.ModelEngine")


def resolve_device(requested_device: Optional[str] = None) -> torch.device:
    """Resolves target compute device (CUDA GPU if available, else CPU)."""
    if requested_device is not None:
        return torch.device(requested_device)
    if settings.DEVICE is not None:
        return torch.device(settings.DEVICE)
    return torch.device("cuda" if torch.cuda.is_available() else "cpu")


def build_efficientnet_b0_model(
    num_classes: int = settings.NUM_CLASSES,
    checkpoint_path: Optional[str | Path] = None,
    device: Optional[torch.device] = None,
) -> nn.Module:
    """
    Constructs the exact EfficientNet-B0 architecture matching the project checkpoint.
    
    Architecture:
      Backbone: EfficientNet-B0 (Compound scaling with MBConv inverted residuals)
      Head: Dropout(0.3) -> Linear(1280, 4)
    """
    model = models.efficientnet_b0(weights=None)
    in_features = model.classifier[1].in_features  # 1280
    model.classifier = nn.Sequential(
        nn.Dropout(p=0.3),
        nn.Linear(in_features, num_classes),
    )

    if checkpoint_path is not None:
        cp = Path(checkpoint_path)
        if not cp.exists():
            raise FileNotFoundError(f"Trained checkpoint not found at: {cp.resolve()}")

        checkpoint = torch.load(cp, map_location="cpu")
        if isinstance(checkpoint, dict):
            state_dict = checkpoint.get("model_state_dict", checkpoint.get("state_dict", checkpoint))
            model.load_state_dict(state_dict)
            logger.info(f"Loaded EfficientNet-B0 weights from {cp.resolve()}")
        else:
            raise ValueError(f"Unrecognized checkpoint format at {cp}")

    if device is not None:
        model = model.to(device)

    model.eval()
    return model


def get_gradcam_target_layer(model: nn.Module) -> nn.Module:
    """
    Returns the target convolutional layer for Grad-CAM explainability.
    For EfficientNet-B0, this is the final convolutional layer in the last MBConv block:
    model.features[-1][0] (Conv2dNormActivation layer).
    """
    if hasattr(model, "features"):
        return model.features[-1][0]
    raise ValueError("Cannot locate features block in EfficientNet-B0 model")


class ModelEngine:
    """
    Thread-Safe Singleton Model Manager for caching and serving the EfficientNet-B0 model.
    Loads once at server lifespan startup, eliminating disk I/O latency on prediction requests.
    """
    _instance: Optional["ModelEngine"] = None
    _lock: threading.Lock = threading.Lock()

    def __new__(cls) -> "ModelEngine":
        with cls._lock:
            if cls._instance is None:
                cls._instance = super().__new__(cls)
                cls._instance._model = None
                cls._instance._device = None
                cls._instance._is_loaded = False
            return cls._instance

    def initialize(self, checkpoint_path: Optional[str] = None, device_str: Optional[str] = None) -> None:
        """Loads weights and prepares model on target device."""
        with self._lock:
            if self._is_loaded and self._model is not None:
                return

            self._device = resolve_device(device_str)
            target_path = checkpoint_path or settings.MODEL_CHECKPOINT_PATH

            logger.info(f"Initializing EfficientNet-B0 on {self._device} with checkpoint {target_path}")
            self._model = build_efficientnet_b0_model(
                num_classes=settings.NUM_CLASSES,
                checkpoint_path=target_path,
                device=self._device
            )
            self._is_loaded = True
            logger.info("EfficientNet-B0 inference engine ready.")

    @property
    def model(self) -> nn.Module:
        if not self._is_loaded or self._model is None:
            self.initialize()
        return self._model

    @property
    def device(self) -> torch.device:
        if self._device is None:
            self._device = resolve_device()
        return self._device

    @property
    def is_loaded(self) -> bool:
        return self._is_loaded

    def predict(self, input_tensor: torch.Tensor) -> Tuple[str, int, float, Dict[str, float], List[Dict[str, Any]], float]:
        """
        Executes a forward pass and computes calibrated softmax probabilities.
        
        Args:
            input_tensor: Shape (1, 3, 224, 224)
            
        Returns:
            Tuple containing:
            - predicted_class_name (str)
            - predicted_class_index (int)
            - top_confidence (float in [0, 1])
            - probabilities_dict (Dict[str, float])
            - breakdown_list (List[Dict[str, Any]])
            - latency_ms (float)
        """
        t0 = time.perf_counter()
        active_model = self.model
        target_device = self.device

        tensor = input_tensor.to(target_device)
        active_model.eval()

        with torch.no_grad():
            logits = active_model(tensor)
            probs = torch.softmax(logits, dim=1).squeeze(0).cpu().numpy()

        latency_ms = round((time.perf_counter() - t0) * 1000, 2)

        pred_idx = int(np.argmax(probs))
        pred_class = settings.CLASS_NAMES[pred_idx]
        confidence = float(probs[pred_idx])

        probs_dict = {}
        breakdown = []
        for idx, p in enumerate(probs):
            cls_name = settings.CLASS_NAMES[idx]
            p_val = round(float(p), 4)
            probs_dict[cls_name] = p_val
            breakdown.append({
                "class_name": cls_name,
                "class_index": idx,
                "probability": p_val,
                "percentage": f"{p_val * 100:.2f}%"
            })

        # Sort breakdown by descending probability
        breakdown.sort(key=lambda x: x["probability"], reverse=True)

        return pred_class, pred_idx, confidence, probs_dict, breakdown, latency_ms


# Global ModelEngine singleton
model_engine = ModelEngine()
