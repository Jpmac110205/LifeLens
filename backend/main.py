from fastapi import FastAPI, File, UploadFile, Request
from fastapi.middleware.cors import CORSMiddleware
from io import BytesIO
from PIL import Image
import base64
from dotenv import load_dotenv

from langchain_core.messages import HumanMessage, SystemMessage, ToolMessage
from langchain_openai import ChatOpenAI
from langchain.tools import tool
from langgraph.prebuilt import create_react_agent

from demo_model import predict_cancer_with_gradcam  # your ML model

# ---------------- Setup ----------------
load_dotenv()
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # frontend origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------- State (shared for now) --------------
certainty = 0.95
riskLevel = "low"
detection = "benign"
type_of_cancer = "breast cancer"

system_message = SystemMessage(
    content=(
        f"You are LifeLens, a friendly and knowledgeable AI cancer medical assistant. "
        f"Your role is to help users interpret cancer detection results, explain them clearly, and provide helpful next steps. "
        f"You have the user's results: confidence={certainty}, risk level={riskLevel}, detection={detection}, type of cancer={type_of_cancer}. "
        f"This is just for informational purposes and not a substitute for professional medical advice, but you should still guide the user on what to do next. "
        f"Make sure to be empathetic, clear, and supportive and format all of your messages like a text."
    )
)

# Conversation memory (in real app, use per-user sessions)
history = [system_message]


# ---------------- Tool ----------------
@tool
def getResults(a: float, b: float) -> str:
    """Useful for performing basic arithmetic calculations with numbers."""
    return f"The confidence level is {certainty}, the risk level is {riskLevel}, detection={detection}, type of cancer={type_of_cancer}."

# ---------------- Model ----------------
model = ChatOpenAI(temperature=0)
tools = [getResults]
agent_executor = create_react_agent(model, tools)

# ---------------- Endpoints ----------------

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    """
    Run ML model prediction + Grad-CAM overlay
    """
    image_bytes = await file.read()
    certainty_val, diagnosis, overlay_img = predict_cancer_with_gradcam(image_bytes)

    global certainty, detection
    certainty = certainty_val
    detection = diagnosis

    # Ensure RGB for overlay
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
        "gradcam_overlay": f"data:image/png;base64,{overlay_base64}",
    }


@app.post("/chat")
async def chat(request: Request):
    """
    Handles chat with AI assistant
    """
    data = await request.json()
    user_message = data.get("message", "")

    # Add user input
    history.append(HumanMessage(content=user_message))

    response_text = ""

    for chunk in agent_executor.stream({"messages": history}):
        # Capture assistant responses
        if "agent" in chunk and "messages" in chunk["agent"]:
            for message in chunk["agent"]["messages"]:
                response_text += message.content
                history.append(message)

        # Handle tool calls
        if "tools" in chunk:
            tool_calls = chunk.get("tools", {}).get("calls", [])
            for tool_call in tool_calls:
                    if tool_call["name"] == "getResults":
                        result = getResults(**tool_call["args"])
                        history.append(
                            ToolMessage(
                                content=result,
                                tool_call_id=tool_call["id"],
                            )
                        )
    return {"reply": response_text}
