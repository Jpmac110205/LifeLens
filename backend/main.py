from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from demo_model import predict_cancer_with_gradcam  # Updated function with Grad-CAM
from io import BytesIO
from PIL import Image
import base64

app = FastAPI()

# --- CORS setup ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # frontend origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Endpoint for prediction + Grad-CAM ---
@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    image_bytes = await file.read()

    certainty, diagnosis, overlay_img = predict_cancer_with_gradcam(image_bytes)

    # ensure RGB
    if overlay_img.ndim == 2:
        pil_img = Image.fromarray(overlay_img.astype("uint8"), mode="L").convert("RGB")
    else:
        pil_img = Image.fromarray(overlay_img.astype("uint8"))

    buffered = BytesIO()
    pil_img.save(buffered, format="PNG")
    overlay_base64 = base64.b64encode(buffered.getvalue()).decode()

    return {
        "certainty_percent": certainty,
        "diagnosis": diagnosis,
        "gradcam_overlay": f"data:image/png;base64,{overlay_base64}"
    }
