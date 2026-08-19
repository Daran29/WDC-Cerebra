# 🧠 Cerebra (BrainTumorVision) — AI-Assisted Brain Tumor MRI Diagnostic & Explainability Platform

[![PyTorch](https://img.shields.io/badge/PyTorch-2.x-EE4C2C?logo=pytorch&logoColor=white)](https://pytorch.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-0.185-black?logo=threedotjs&logoColor=white)](https://threejs.org/)
[![Accuracy](https://img.shields.io/badge/Val_Accuracy-99.52%25-brightgreen)](file:///checkpoints/best_efficientnetb0.pth)
[![AWS Ready](https://img.shields.io/badge/AWS-Terraform_Ready-FF9900?logo=amazonaws&logoColor=white)](file:///terraform/)

> **Full-Stack Clinical Decision Support & Deep Learning Platform**  
> End-to-end multi-class Brain MRI classification (`Glioma`, `Meningioma`, `No Tumor`, `Pituitary`) powered by **EfficientNet-B0**, real-time **Explainable AI (Grad-CAM, LIME, SHAP)**, interactive **Three.js 3D Brain Mapping**, and automated **Institutional PDF Report Generation**.

---

## 📌 Executive Summary

**Cerebra** combines computer vision, deep convolutional neural networks, and multi-perspective interpretability into a clinical-grade web platform:
1. **Accurate Classification:** Achieves **99.52% Validation Accuracy** across 7,200 curated MRI scans with sub-25ms inference latency.
2. **Deterministic Preprocessing:** 6-stage medical image standardization (Contour Brain ROI Extraction, 3×3 Median Denoising, CIELAB L\* CLAHE contrast adjustment, and ImageNet normalization).
3. **Live Model Transparency Dashboard:** Multi-view Grad-CAM studio (Alpha Slider 0–100%, Pure Heatmap, Hotspot Spotlight, Split Compare), Preprocessing Transformation Flow, LIME superpixels, and SHAP pixel-level marginal attributions.
4. **Interactive 3D Anatomical Projection:** Dynamic Three.js brain mesh highlighting tumor coordinates and lobe attributions.
5. **Clinical PDF Diagnostic Reports:** Generates branded, institutional PDF reports embedding side-by-side MRI scans, Grad-CAM overlays, probability breakdowns, and physician attestation signature lines.
6. **Cloud-Native & Terraform Ready:** Includes production multi-stage Dockerfiles, Docker Compose stack, and complete AWS Terraform Infrastructure as Code (IaC).

---

## 🗂️ Project Directory Architecture

```text
Brain Tumor Cerebra Project/
├── app/                             # FastAPI High-Performance Backend Service
│   ├── __init__.py                  # Package initialization
│   ├── main.py                      # FastAPI application, lifespan lifecycle, CORS, exception handlers
│   ├── config.py                    # Centralized settings (12-Factor env vars, paths, thresholds)
│   ├── schemas.py                   # Pydantic validation models for structured JSON contracts
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── health.py                # Healthcheck & model metadata (/api/health, /api/model-info)
│   │   ├── predict.py               # Classification & preprocessing preview (/api/predict, /api/preprocess-preview)
│   │   └── explain.py               # XAI interpretability suite (/api/explain/*, /api/analyze)
│   └── services/
│       ├── __init__.py
│       ├── model_engine.py          # EfficientNet-B0 architecture builder & cached singleton loader
│       ├── preprocessing.py         # Authoritative medical preprocessing pipeline (ROI, Median, CLAHE)
│       ├── explainability.py        # Grad-CAM, LIME, and SHAP engines with multi-view base64 generators
│       └── image_security.py        # Safe in-memory validation, size checks, magic-byte auditing
│
├── frontend/                        # Modern React 19 + Three.js + Tailwind CSS v4 Frontend
│   ├── index.html                   # HTML5 application shell
│   ├── package.json                 # React, Three.js, jsPDF, Tailwind v4 dependencies
│   ├── tsconfig.json                # TypeScript compiler configuration
│   ├── vite.config.ts               # Vite configuration with React, Tailwind v4, & API reverse proxy
│   ├── Dockerfile                   # Multi-stage production Nginx container build
│   └── src/
│       ├── main.tsx                 # React application root entrypoint
│       ├── App.tsx                  # Main dashboard (scan upload, intake modal, inference workflow)
│       ├── api.ts                   # Backend API client with typed Grad-CAM, LIME, SHAP endpoints
│       ├── sampleData.ts            # Preloaded base64 benchmark samples (Glioma, Meningioma, etc.)
│       ├── Brain3D.tsx              # Three.js 3D interactive anatomical brain & tumor localization
│       ├── TumorGuide.tsx           # Interactive multi-class pathology & radiological reference guide
│       ├── Explainability.tsx       # Live Model Transparency & Explainable AI (XAI) Studio
│       ├── Documentation.tsx        # System pipeline documentation & clinical safety audit
│       ├── ImageViewer.tsx          # High-resolution pan/zoom deep-slice inspector (up to 800%)
│       ├── generateReport.ts        # Instant clinical PDF diagnostic summary report generator
│       ├── Sidebar.tsx              # Navigation sidebar with theme switcher & live API status pill
│       └── index.css                # Tailwind CSS v4 & custom design tokens
│
├── terraform/                       # AWS Cloud Infrastructure as Code (IaC)
│   ├── main.tf                      # AWS VPC, Security Groups, EC2 (c6i.xlarge), Elastic IP, CloudWatch
│   ├── variables.tf                 # Configurable instance types, regions, and storage sizes
│   ├── outputs.tf                   # Public IP, API URL, and SSH command outputs
│   ├── user_data.sh                 # Automated EC2 bootstrap (Docker, 4GB swap space, sysctl limits)
│   └── terraform.tfvars.example     # Customization template
│
├── checkpoints/
│   └── best_efficientnetb0.pth      # Trained EfficientNet-B0 model checkpoint (99.52% Val Acc)
│
├── samples/                         # Real MRI test scans for immediate evaluation
│   ├── glioma_sample.jpg
│   ├── meningioma_sample.jpg
│   ├── notumor_sample.jpg
│   └── pituitary_sample.jpg
│
├── tests/
│   ├── __init__.py
│   └── test_api.py                  # Pytest automated test suite (15/15 unit & integration tests)
│
├── Dockerfile                       # Multi-stage production backend container build
├── docker-compose.yml               # Unified multi-container stack (Backend + Frontend + Nginx)
├── .env.example                     # Environment configuration defaults
├── .gitignore                       # Clean Python, PyTorch, and Node ignore rules
├── requirements.txt                 # Production backend & ML dependencies
└── README.md                        # Complete project documentation
```

---

## ✨ Features & Capabilities

### 1. 🔬 Deep Learning & Computer Vision Engine
- **Backbone Architecture:** Compound-scaled `EfficientNet-B0` with regularized classification head ($\text{Dropout}(0.3) \to \text{Linear}(1280, 4)$).
- **Benchmark Performance:** **99.52% Validation Accuracy** across 7,200 curated MRI scans.
- **Authoritative 6-Stage Preprocessing Pipeline:**
  1. *Contour-Based Brain ROI Extraction* (Otsu thresholding crops ~50% empty air space with a 3px safety margin).
  2. *3×3 Median Denoising* (suppresses high-frequency scanner noise while preserving tissue edges).
  3. *CIELAB L\* CLAHE Contrast Enhancement* ($\text{clip}=2.0, \text{grid}=(8,8)$ applied solely on luminance).
  4. *Bicubic Resizing* ($224 \times 224 \times 3$).
  5. *ImageNet Standardization* ($\mu=[0.485, 0.456, 0.406], \sigma=[0.229, 0.224, 0.225]$).

---

### 2. 🔮 Live Explainable AI (XAI) Dashboard
- **Grad-CAM Multi-View Studio:**
  - **Mode 1: Interactive Alpha Overlay** — Real-time slider to smoothly adjust heatmap opacity from 0% (preprocessed scan) to 100% (attention heatmap).
  - **Mode 2: Pure Heatmap** — Raw OpenCV Jet colormap gradient activation field.
  - **Mode 3: Hotspot Focus** — Spotlight view isolating primary salient focal points (>40% activation) while dimming background tissue.
  - **Mode 4: Split Compare** — Interactive before/after split slider comparing the preprocessed MRI against the Grad-CAM overlay.
- **Preprocessing Transformation Flow:** 4-card timeline illustrating *Raw Upload* $\to$ *Brain ROI Crop* $\to$ *CIELAB CLAHE* $\to$ *$224\times224$ Tensor*.
- **Deep Interpretability Modalities:**
  - **LIME Superpixels:** SLIC superpixel segmentation identifying the top-5 contiguous tissue clusters supporting the diagnosis.
  - **SHAP Pixel Attribution:** `shap.GradientExplainer` game-theoretic marginal pixel contributions computed relative to baseline reference scans.
- **Dynamic Clinical Feature Interpretation:** Plain-English, clinically grounded anatomical explanation dynamically calculated from the predicted class and gradient activation centroid.
- **1-Click Evaluation Sample Scans:** One-click demo scans (*Glioma*, *Meningioma*, *Pituitary*, *Normal*) allowing instant demonstration without local files.

---

### 3. 📄 Clinical PDF Diagnostic Report Generation
Powered by `jsPDF`, generates publication-grade, institutional diagnostic summary reports:
- **Dual Radiographic Viewport:** Preprocessed MRI scan side-by-side with the Grad-CAM Neural Attention Overlay.
- **Patient Intake Demographics:** Name, Age, Gender, Examination Modality, Neural Backbone, Latency.
- **XAI Feature Attribution Block:** Target hooked layer (`model.features[-1][0]`), peak attention percentage, and anatomical explanation.
- **Differential Multi-Class Breakdown:** Horizontal probability distribution bars with severity indicators.
- **Physician Review Attestation:** Formal **Reviewing Radiologist Signature Line**, **Clinical Date**, and **Cryptographic Audit Hash**.

---

### 4. 🧠 Interactive 3D Brain Tumor Localization
- Custom Three.js 3D brain mesh with dynamic anatomical lobe labeling (Frontal, Temporal, Parietal, Occipital).
- Real-time tumor hotspot pulsing and coordinate positioning based on the top classified pathology.

---

### 5. 🔍 High-Resolution Deep-Zoom Slice Viewer
- Fullscreen pan, tilt, and scroll-to-zoom (100% – 800%) tool with crosshair and coordinate indicators.

---

## ☁️ AWS Cloud Deployment & Terraform Guide

### 1. Computational Stress & Hardware Sizing
| Workload | Algorithmic Mechanism | Time Complexity | CPU Latency | GPU Latency | Recommended Spec |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Inference** | EfficientNet-B0 Forward Pass | $\mathcal{O}(1)$ forward | $\sim 20\text{ ms}$ | $\sim 6\text{ ms}$ | 🟢 2+ vCPU, 4GB RAM |
| **Grad-CAM** | Backward gradient hook (`features[-1][0]`) | $\mathcal{O}(1)$ backprop | $\sim 40\text{ ms}$ | $\sim 12\text{ ms}$ | 🟢 2+ vCPU, 4GB RAM |
| **LIME** | SLIC superpixel perturbations ($N=100$) | $\mathcal{O}(N)$ forward passes | $\sim 2.5\text{ s}$ | $\sim 400\text{ ms}$ | 🟡 4 vCPU, 8GB RAM |
| **SHAP** | `GradientExplainer` baseline integrals | $\mathcal{O}(K \times C)$ backprops | $\sim 4.5\text{ s}$ | $\sim 500\text{ ms}$ | 🔴 4 vCPU, 8GB RAM (Swap) |

* **Recommended AWS CPU Instance:** **`c6i.xlarge`** (4 vCPUs, 8 GB RAM, AVX-512 vector acceleration) or **`t3.xlarge`** (4 vCPUs, 16 GB RAM).
* **Recommended AWS GPU Instance:** **`g4dn.xlarge`** (4 vCPUs, 16 GB RAM, 1x NVIDIA T4 16GB GPU).

---

### 2. Automated Terraform Deployment (4 Steps)

```bash
# 1. Navigate to the terraform directory
cd "Brain Tumor Cerebra Project/terraform"

# 2. Initialize Terraform and download AWS provider plugins
terraform init

# 3. Preview the infrastructure plan
terraform plan

# 4. Provision the AWS infrastructure (VPC, Subnet, EC2, Elastic IP, Security Groups)
terraform apply -auto-approve
```

---

### 3. Running with Docker Compose on the Server

SSH into the provisioned EC2 instance:
```bash
ssh -i <your-key.pem> ubuntu@<server_public_ip>

# Clone repository and launch multi-container stack
cd "Brain Tumor Cerebra Project"
docker compose up -d --build
```

Your system will be immediately accessible at:
* **Frontend Web Application:** `http://<server_public_ip>`
* **FastAPI Backend API:** `http://<server_public_ip>:8000`
* **Interactive Swagger Documentation:** `http://<server_public_ip>:8000/docs`

---

## 🚀 Local Quickstart Guide

### 1. Backend Setup & Startup

```bash
# Navigate to project directory
cd "Brain Tumor Cerebra Project"

# Create and activate Python virtual environment
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI backend server (Runs on http://localhost:8000)
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

* **Interactive Swagger Documentation:** [http://localhost:8000/docs](http://localhost:8000/docs)
* **Health Endpoint:** [http://localhost:8000/api/health](http://localhost:8000/api/health)

---

### 2. Frontend Setup & Startup

In a separate terminal:

```bash
# Navigate to the frontend directory
cd "Brain Tumor Cerebra Project/frontend"

# Install frontend dependencies
npm install

# Start Vite dev server (Runs on http://localhost:5173)
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📡 API Endpoints Reference

| Method | Endpoint | Description | Payload / Query |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Service health, compute device (`cuda`/`cpu`), model load status | None |
| `GET` | `/api/model-info` | Model architecture, validation accuracy, target classes | None |
| `POST` | `/api/predict` | End-to-end MRI classification, probabilities, Grad-CAM, & stage previews | `file: UploadFile` (multipart/form-data) |
| `POST` | `/api/preprocess-preview` | Base64 preview of Raw, ROI Crop, CLAHE, & Resized stages | `file: UploadFile` |
| `POST` | `/api/explain/gradcam` | Multi-representation Grad-CAM (overlay, heatmap, hotspot, interpretation) | `file: UploadFile` |
| `POST` | `/api/explain/lime` | LIME superpixel marked diagnostic regions | `file: UploadFile`, `num_samples: int` |
| `POST` | `/api/explain/shap` | SHAP pixel-level marginal attribution map | `file: UploadFile` |
| `POST` | `/api/analyze` | Unified multi-XAI diagnosis endpoint | `file: UploadFile`, flags |

---

## 🧪 Testing & Verification

### Automated PyTest Suite (15/15 Unit & Integration Tests)
```bash
pytest tests/test_api.py -v
```

### Frontend Production Build Verification
```bash
cd frontend
npm run build
```

---

## 🛡️ Clinical & Legal Notice

*Cerebra is an investigational research prototype designed for medical education and clinical decision support. It is NOT cleared by the FDA or CE for autonomous diagnosis. All predictions and XAI attributions must be reviewed by a licensed board-certified radiologist or neuro-oncologist.*
