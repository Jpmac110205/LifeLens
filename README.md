# LifeLens

## Overview
**LifeLens** is a research-oriented AI application designed to assist in early cancer detection and risk assessment through advanced deep learning models.  
The system integrates a CNN image classifier, Grad-CAM explainability, and a conversational AI interface for interpretability and research-based guidance.  

> **Disclaimer:** LifeLens is a research tool only and **not a substitute for professional medical advice, diagnosis, or treatment**.

---

## Key Features
- Upload medical images (DICOM, JPEG, PNG)
- AI classification with confidence percentage
- Grad-CAM heatmaps showing model attention regions
- Risk indicator (Low / Medium / High)
- Chat-style AI interface for insights and follow-up questions
- Downloadable report (requires explicit user consent)
- “Find a Doctor” feature (planned)
- Clears all data on reset — no storage of user data
- Docker integration for reproducibility
- API rate limiting
- Vercel deployment-ready frontend

---

## Supported Cancer Types
- Breast Cancer  
- Melanoma  
- Lung Cancer  

---

## Project Structure
LifeLens/
│
├── backend/ # FastAPI backend (AI model, endpoints)
├── frontend/ # React + TypeScript UI
├── models/ # Trained model files (.pt, .onnx)
├── scripts/ # Preprocessing and training scripts
├── docs/ # Documentation, dataset sources, citations
├── docker/ # Dockerfiles and configuration
└── README.md

---

## Installation and Setup

### Prerequisites
- **Python 3.9+**
- **Node.js 16+**
- **Docker** (recommended)
- GPU (optional, for model inference)

---

### Step	Description
1	Build CNN cancer classifier (baseline)
2	Add Grad-CAM explainability
3	Add generative AI text layer for explanations
4	Develop structured output schema (JSON)
5	Build backend API for /predict, /advise, /report
6	Design frontend UI (React + TypeScript)
7	Add upload and prediction visualization
8	Add downloadable PDF reports with consent
9	Deploy with Docker and Vercel
10	Integrate “Find a Doctor” feature

---

### Data and Datasets
Use open, publicly available datasets for development:
NIH Chest X-ray
Kaggle Breast Histopathology
ISIC Melanoma Dataset
All data should be anonymized and used strictly for research.

---

### Ethics and Privacy
LifeLens does not store or share any uploaded images or user data.
All predictions are for research use only and should not be interpreted as diagnostic results.
Any generated report must include the following notice:
“This report is for research purposes only and should not be used for medical diagnosis or treatment. Please consult a qualified healthcare provider.”

---

### Deployment
Frontend: Vercel or Netlify
Backend: Docker + Uvicorn/FastAPI
Storage: Local temporary memory (no persistent data)
Security: HTTPS, input validation, and optional authentication tokens
