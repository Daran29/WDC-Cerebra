"""
================================================================================
Cerebra — Brain Tumor MRI Diagnostic Platform
Comprehensive Automated Backend Test Suite
================================================================================
"""

from __future__ import annotations

import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

# Ensure app package is discoverable
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from app.main import app
from app.config import settings


@pytest.fixture(scope="module")
def client():
    """Provides a TestClient with lifespan startup/shutdown lifecycle executed."""
    with TestClient(app) as c:
        yield c


# ==============================================================================
# 1. SYSTEM & HEALTH CHECK TESTS
# ==============================================================================

def test_root_endpoint(client):
    """Verify root endpoint returns operational metadata."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert "version" in data
    assert "documentation" in data


def test_health_check(client):
    """Verify healthcheck endpoint reports model loaded in memory."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["model_loaded"] is True
    assert data["model_name"] == "EfficientNet-B0"
    assert "device" in data


def test_model_info(client):
    """Verify model-info endpoint returns architecture specifications."""
    response = client.get("/api/model-info")
    assert response.status_code == 200
    data = response.json()
    assert data["model_name"] == "EfficientNet-B0"
    assert data["num_classes"] == 4
    assert set(data["classes"]) == {"Glioma", "Meningioma", "No Tumor", "Pituitary"}
    assert "Dropout(0.3)" in data["head"]


# ==============================================================================
# 2. INFERENCE & DIAGNOSTIC TESTS
# ==============================================================================

@pytest.mark.parametrize("sample_name,expected_class", [
    ("glioma_sample.jpg", "Glioma"),
    ("meningioma_sample.jpg", "Meningioma"),
    ("notumor_sample.jpg", "No Tumor"),
    ("pituitary_sample.jpg", "Pituitary"),
])
def test_predict_sample_mri(client, sample_name: str, expected_class: str):
    """Verify that sample scans produce predictions matching expected diagnostic classes."""
    sample_path = PROJECT_ROOT / "samples" / sample_name
    assert sample_path.exists(), f"Sample image missing: {sample_path}"

    with open(sample_path, "rb") as f:
        response = client.post(
            "/api/predict",
            files={"file": (sample_name, f, "image/jpeg")}
        )

    assert response.status_code == 200, f"Error: {response.text}"
    data = response.json()

    assert data["status"] == "success"
    assert data["predicted_class"] in settings.CLASS_NAMES
    assert 0.0 <= data["confidence"] <= 1.0
    assert "confidence_percentage" in data

    # Verify probability distribution sums to ~1.0
    probs = data["class_probabilities"]
    assert len(probs) == 4
    assert pytest.approx(sum(probs.values()), abs=1e-2) == 1.0

    # Verify metadata
    metadata = data["metadata"]
    assert metadata["processed_resolution"] == [224, 224]
    assert metadata["inference_latency_ms"] > 0


def test_preprocess_preview(client):
    """Verify preprocessing preview endpoint returns base64 images of intermediate stages."""
    sample_path = PROJECT_ROOT / "samples" / "glioma_sample.jpg"
    with open(sample_path, "rb") as f:
        response = client.post(
            "/api/preprocess-preview",
            files={"file": ("glioma_sample.jpg", f, "image/jpeg")}
        )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["raw_image_base64"].startswith("data:image/png;base64,")
    assert data["roi_cropped_base64"].startswith("data:image/png;base64,")
    assert data["clahe_enhanced_base64"].startswith("data:image/png;base64,")
    assert data["final_input_base64"].startswith("data:image/png;base64,")


# ==============================================================================
# 3. EXPLAINABLE AI (XAI) TESTS
# ==============================================================================

def test_explain_gradcam(client):
    """Verify Grad-CAM endpoint generates valid heatmap overlay."""
    sample_path = PROJECT_ROOT / "samples" / "glioma_sample.jpg"
    with open(sample_path, "rb") as f:
        response = client.post(
            "/api/explain/gradcam",
            files={"file": ("glioma_sample.jpg", f, "image/jpeg")}
        )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["gradcam"] is not None
    assert data["gradcam"]["overlay_image_base64"].startswith("data:image/png;base64,")
    assert data["gradcam"]["target_layer"] == "model.features[-1][0]"
    assert data["latency_ms"] > 0


def test_explain_lime(client):
    """Verify LIME endpoint generates valid superpixel boundary visualization."""
    sample_path = PROJECT_ROOT / "samples" / "glioma_sample.jpg"
    with open(sample_path, "rb") as f:
        response = client.post(
            "/api/explain/lime",
            files={"file": ("glioma_sample.jpg", f, "image/jpeg")},
            data={"num_samples": 40}  # Small perturbation count for fast testing
        )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["lime"] is not None
    assert data["lime"]["marked_image_base64"].startswith("data:image/png;base64,")


def test_explain_shap(client):
    """Verify SHAP endpoint generates valid pixel attribution visualization."""
    sample_path = PROJECT_ROOT / "samples" / "glioma_sample.jpg"
    with open(sample_path, "rb") as f:
        response = client.post(
            "/api/explain/shap",
            files={"file": ("glioma_sample.jpg", f, "image/jpeg")}
        )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["shap"] is not None
    assert data["shap"]["attribution_image_base64"].startswith("data:image/png;base64,")


def test_unified_analyze(client):
    """Verify unified /analyze endpoint with selective XAI flags."""
    sample_path = PROJECT_ROOT / "samples" / "glioma_sample.jpg"
    with open(sample_path, "rb") as f:
        response = client.post(
            "/api/analyze",
            files={"file": ("glioma_sample.jpg", f, "image/jpeg")},
            data={"include_gradcam": "true", "include_lime": "false", "include_shap": "false"}
        )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["gradcam"] is not None
    assert data["lime"] is None
    assert data["shap"] is None


# ==============================================================================
# 4. SECURITY & PRIVACY VALIDATION TESTS
# ==============================================================================

def test_reject_non_image_file(client):
    """Verify rejection of non-image file formats (e.g. .txt)."""
    response = client.post(
        "/api/predict",
        files={"file": ("malicious_payload.txt", b"print('hello world')", "text/plain")}
    )
    assert response.status_code == 400
    data = response.json()
    assert data["status"] == "error"
    assert "Unsupported file format" in data["detail"]


def test_reject_empty_file(client):
    """Verify rejection of 0-byte uploaded files."""
    response = client.post(
        "/api/predict",
        files={"file": ("empty.jpg", b"", "image/jpeg")}
    )
    assert response.status_code == 400
    data = response.json()
    assert data["status"] == "error"
    assert "empty" in data["detail"].lower()


def test_reject_corrupted_image(client):
    """Verify rejection of corrupted/truncated byte streams disguised as images."""
    corrupted_bytes = b"\xff\xd8\xff\xe0" + b"random_corrupted_bytes"
    response = client.post(
        "/api/predict",
        files={"file": ("corrupted.jpg", corrupted_bytes, "image/jpeg")}
    )
    assert response.status_code in (400, 422)
    data = response.json()
    assert data["status"] == "error"
