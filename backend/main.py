from fastapi import FastAPI, File, UploadFile, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from io import BytesIO
from PIL import Image
import base64
from dotenv import load_dotenv

from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage

from demo_model import predict_cancer_with_gradcam  # Your ML model

# ==================== SETUP ====================
load_dotenv()
app = FastAPI()

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== GLOBAL STATE ====================
# Stores current prediction results and chat history
current_results = {
    "certainty": 0.0,
    "riskLevel": "unknown",
    "detection": "unknown",
    "cancerType": "breast cancer",
    "history": [],  # Will store conversation history
}

# Initialize ChatOpenAI model
model = ChatOpenAI(temperature=0.7, model="gpt-4")


# ==================== HELPER FUNCTIONS ====================

def create_system_message(certainty, risk_level, detection, cancer_type):
    """Generate a dynamic system message based on prediction results"""
    return SystemMessage(
        content=(
            f"You are LifeLens, a friendly and knowledgeable AI medical assistant. "
            f"Your role is to help users interpret cancer detection results, explain them clearly, and provide helpful next steps.\n\n"
            f"CURRENT ANALYSIS RESULTS:\n"
            f"- Cancer Type: {cancer_type.upper()}\n"
            f"- Prediction: {detection.upper()}\n"
            f"- Confidence: {certainty}%\n"
            f"- Risk Level: {risk_level.upper()}\n\n"
            f"⚠️ IMPORTANT DISCLAIMERS:\n"
            f"1. This is for RESEARCH and EDUCATIONAL purposes ONLY\n"
            f"2. This is NOT a medical diagnosis or professional medical advice\n"
            f"3. Always encourage users to consult qualified healthcare professionals\n"
            f"4. Do not provide medical treatment recommendations\n"
            f"5. Be empathetic, clear, and supportive\n\n"
            f"Guidelines:\n"
            f"- Explain what the results mean in simple terms\n"
            f"- Suggest next steps like consulting a doctor\n"
            f"- Answer questions about the analysis\n"
            f"- Always remind users this is not a diagnosis\n"
            f"- Format responses as natural conversation text"
        )
    )


def determine_risk_level(prediction, confidence):
    """Determine risk level based on prediction and confidence"""
    if prediction.lower() == "malignant":
        if confidence >= 70:
            return "high"
        elif confidence >= 40:
            return "medium"
        else:
            return "low"
    else:  # benign
        if confidence >= 70:
            return "low"
        elif confidence >= 40:
            return "medium"
        else:
            return "high"


def normalize_gradcam(raw_data):
    """Ensure Grad-CAM is in proper base64 format"""
    if not raw_data:
        return None
    if raw_data.startswith("data:image"):
        return raw_data
    return f"data:image/png;base64,{raw_data}"


# ==================== API ENDPOINTS ====================

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "model": "online",
        "currentResults": current_results
    }


@app.post("/set-cancer-type")
async def set_cancer_type(request: Request):
    """
    Set the cancer type before running prediction
    Helps the AI assistant know what to expect
    """
    try:
        data = await request.json()
        cancer_type = data.get("cancerType", "breast cancer").lower()
        
        current_results["cancerType"] = cancer_type
        
        return {
            "status": "success",
            "cancerType": cancer_type
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    """
    Run ML model prediction on uploaded medical image
    Returns prediction, confidence, Grad-CAM overlay, and risk level
    """
    try:
        # Read the uploaded file
        image_bytes = await file.read()
        
        # Run the ML model
        certainty_val, diagnosis, overlay_img = predict_cancer_with_gradcam(image_bytes)
        
        # Calculate risk level
        risk_level = determine_risk_level(diagnosis, certainty_val)
        
        # Update global results
        current_results["certainty"] = certainty_val
        current_results["detection"] = diagnosis
        current_results["riskLevel"] = risk_level
        
        # Reset chat history with fresh system message
        current_results["history"] = [
            create_system_message(
                certainty_val,
                risk_level,
                diagnosis,
                current_results["cancerType"]
            )
        ]
        
        # Convert overlay image to base64
        if overlay_img.ndim == 2:  # Grayscale
            pil_img = Image.fromarray(overlay_img.astype("uint8"), mode="L").convert("RGB")
        else:  # Already RGB
            pil_img = Image.fromarray(overlay_img.astype("uint8"))
        
        buffered = BytesIO()
        pil_img.save(buffered, format="PNG")
        overlay_base64 = base64.b64encode(buffered.getvalue()).decode()
        
        return {
            "status": "success",
            "certainty_percent": certainty_val,
            "diagnosis": diagnosis,
            "riskLevel": risk_level,
            "gradcam_overlay": f"data:image/png;base64,{overlay_base64}",
        }
    
    except Exception as e:
        print(f"Prediction error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@app.post("/chat")
async def chat(request: Request):
    """
    Chat endpoint for discussing analysis results
    Uses the current prediction results in context
    """
    try:
        data = await request.json()
        user_message = data.get("message", "").strip()
        
        if not user_message:
            return {
                "reply": "Please enter a message.",
                "error": None
            }
        
        # Build the system message with current results
        system_message = create_system_message(
            current_results["certainty"],
            current_results["riskLevel"],
            current_results["detection"],
            current_results["cancerType"]
        )
        
        # Build messages for the model
        messages = [system_message]
        
        # Add previous conversation messages (skip initial system message)
        for msg in current_results["history"]:
            if not isinstance(msg, SystemMessage):
                messages.append(msg)
        
        # Add the new user message
        messages.append(HumanMessage(content=user_message))
        
        # Get response from AI
        response = model.invoke(messages)
        response_text = response.content
        
        # Store conversation in history
        current_results["history"].append(HumanMessage(content=user_message))
        current_results["history"].append(AIMessage(content=response_text))
        
        return {
            "reply": response_text,
            "currentResults": {
                "certainty": current_results["certainty"],
                "riskLevel": current_results["riskLevel"],
                "detection": current_results["detection"],
                "cancerType": current_results["cancerType"],
            },
            "error": None
        }
    
    except Exception as e:
        print(f"Chat error: {str(e)}")
        import traceback
        traceback.print_exc()
        
        return {
            "reply": "An error occurred while processing your message. Please try again.",
            "error": str(e)
        }


@app.post("/export/conversation")
async def export_conversation(request: Request):
    """
    Export conversation and results as JSON
    Can be used for reports or data analysis
    """
    try:
        data = await request.json()
        
        export_data = {
            "report_metadata": {
                "tool": "LifeLens",
                "version": "1.0",
                "disclaimer": "Research purposes only - not for medical diagnosis"
            },
            "analysis": {
                "cancer_type": data.get("cancerType", current_results["cancerType"]),
                "prediction": data.get("diagnosis", current_results["detection"]),
                "confidence_percent": data.get("confidence", current_results["certainty"]),
                "risk_level": data.get("riskLevel", current_results["riskLevel"]),
                "key_factors": data.get("key_factors", [])
            },
            "conversation_history": [
                {
                    "role": msg.type if hasattr(msg, 'type') else "unknown",
                    "content": msg.content if hasattr(msg, 'content') else str(msg)
                }
                for msg in current_results["history"]
            ]
        }
        
        return {
            "status": "success",
            "data": export_data
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/reset")
async def reset_session():
    """
    Reset the session - clear all analysis and chat history
    """
    current_results["certainty"] = 0.0
    current_results["riskLevel"] = "unknown"
    current_results["detection"] = "unknown"
    current_results["history"] = []
    
    return {
        "status": "success",
        "message": "Session reset. Ready for new analysis."
    }


# ==================== RUN SERVER ====================
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080, reload=True)