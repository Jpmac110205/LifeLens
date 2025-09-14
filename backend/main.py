from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from demo_model import predict_cancer

app = FastAPI()

# CORS (for frontend communication)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Change to ["http://localhost:3000"] in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    # Read uploaded image
    contents = await file.read()

    # Run prediction
    certainty, diagnosis = predict_cancer(contents)

    # Return JSON response
    return {
        "certainty_percent": certainty,
        "diagnosis": diagnosis
    }
