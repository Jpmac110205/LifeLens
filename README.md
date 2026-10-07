# LifeLens

LifeLens is an educational image-analysis workspace built with React, TypeScript, Vite, and FastAPI. It combines two local ResNet18 classifiers with Grad-CAM attention maps and an optional AI research assistant.

**For research and education only. Outputs are not medical diagnoses, clinical risk assessments, or treatment advice.**

## What works

- Responsive workspace with desktop navigation and a mobile layout.
- JPG/PNG uploads through file selection or drag-and-drop, with image previews and validation (10 MB and 25 million pixels maximum).
- Breast histopathology and melanoma skin-image classification using the included checkpoints.
- Prediction, model confidence, model risk indicator, and a switch between the original image and Grad-CAM attention map.
- Optional conversational explanations, suggested questions, loading states, and retry on failure.
- Consent-based HTML report downloads containing results, images, and the conversation. Open the report in a browser and print to PDF when needed.
- Cancel analysis and start a new session, clearing the image, results, and conversation.
- Backend connection indicator; click it to retry the connection check.

DICOM and lung-cancer analysis are not implemented. Model confidence is not the probability of having cancer. Grad-CAM shows model attention, not cancer location. The risk indicator is a heuristic derived from the prediction and confidence.

## Run locally

Use Node.js **22.12+** (or 20.19+) and Python **3.11+** for a new environment with the pinned Python dependencies.

```sh
npm install
python3 -m venv backend/venv
backend/venv/bin/python -m pip install -r requirements.txt
```

If you already have a working backend environment, reuse it instead of recreating it. On Windows, substitute `backend\venv\Scripts\python.exe` for `backend/venv/bin/python`.

Copy `.env.example` to `.env` and set `APP_MODE=local`. Set `OPENAI_API_KEY` in that file; `OPENAI_MODEL` defaults to `gpt-4`. Image classification works without an OpenAI key. Never expose the key using a `VITE_` variable or put it in the browser.

Start the backend from the project root:

```sh
backend/venv/bin/python -m uvicorn backend.main:app --host 127.0.0.1 --port 8080
```

In a second terminal:

```sh
npm run dev
```

Open http://localhost:5173. Vite proxies `/api` to the backend on port 8080. Checkpoint paths resolve relative to `backend/`, so startup works independently of the shell's directory. The classifiers load the local weights without downloading ImageNet weights.

## Checks

```sh
npm run build
npm run lint
npm test
backend/venv/bin/python -m unittest backend.test_api -v
```

The Playwright suite uses installed Google Chrome and checks desktop and mobile layouts, upload validation, request errors, cancellation, chat retry and isolation, consent-based report downloads, and session reset. If Chrome is missing, run `npx playwright install chrome`. Browser tests mock model and chat responses. Backend tests mock inference and OpenAI, so they do not make paid requests or require an API key.

Rollup is pinned to `4.63.6` through an npm override: `4.64.0` stalled during production tree shaking in this project. The pinned version builds successfully and passes `npm audit`.

The API's interactive documentation is available at http://127.0.0.1:8080/docs.

## Structure

```text
src/
  App.tsx                 Session state and workspace
  App.css                 Responsive interface styles
  components/             Upload, results, chat, navigation, dialogs
  lib/                    API requests, shared types, report generation
backend/
  main.py                 Stateless FastAPI endpoints
  demo_model.py           Local checkpoint inference
  explainability.py       Grad-CAM and RGB heatmap rendering
  breast_cancer.pth        Breast classifier checkpoint
  melanoma.pth             Melanoma classifier checkpoint
  test_api.py             API regression tests
  process_data.py          Training dataset preparation
  train_model.py           Training utilities
requirements.txt           Python dependencies
tests/                     Browser regression tests and synthetic fixture
```

## Data handling

The app does not use database storage or browser local storage for uploaded images, results, or conversations. Uploads are processed by the backend and released after the request. Browser state lasts until reset or reload. Each chat request carries its own results and recent conversation, so users cannot receive another session's history through shared server state. `/health` returns service availability, never user results.

Chat sends questions, recent messages, and model outputs to OpenAI; uploaded images are not included. Use anonymized research data. Downloaded reports include the uploaded image and are saved only after explicit consent.

## Production configuration

Application mode is controlled by `APP_MODE` in the root `.env`, independently of Vite's development/build mode. No mode switch is shown in the interface.

- `APP_MODE=local`: frontend at `http://localhost:5173`, with `/api` proxied to `LOCAL_API_URL` (`http://127.0.0.1:8080`). The dev server requires port 5173 instead of silently choosing another port.
- `APP_MODE=production`: API requests go directly to `https://lifelens-mmt7.onrender.com`, using `PRODUCTION_APP_URL`. This URL must serve the FastAPI endpoints, such as `/health` and `/predict`.

Restart the backend and Vite after editing `.env`. Run `npm run build` again when changing the mode of a deployed frontend; the API URL is embedded at build time. `npm run build` creates `dist/` for frontend hosting. For Render, supply the same mode and URL values in the service environment (the private `.env` is excluded from Git). Backend CORS allows the selected application URL. Configure `OPENAI_API_KEY` and `OPENAI_MODEL` only for the backend; they are never embedded in the browser bundle.

The chat and export endpoints require request-specific analysis and history. They no longer use a global “current result.” The `/set-cancer-type` and `/reset` endpoints remain for compatibility; the model is selected with each prediction and session data is cleared in the browser.

## Dataset credits

- [Melanoma skin cancer dataset](https://www.kaggle.com/datasets/hasnainjaved/melanoma-skin-cancer-dataset-of-10000-images)
- [Multi-cancer dataset](https://www.kaggle.com/datasets/obulisainaren/multi-cancer)
- [BreakHis breast histopathology](https://www.kaggle.com/datasets/ambarish/breakhis)
