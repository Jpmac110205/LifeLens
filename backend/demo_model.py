import cv2
import numpy as np
import torch
from torchvision import transforms
from torchvision.models import resnet18, ResNet18_Weights
from explainability import GradCAM, overlay_heatmap
from PIL import Image

# --- Transform for single image ---
transform = transforms.Compose([
    transforms.ToPILImage(),
    transforms.Resize(224),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406],
                         [0.229, 0.224, 0.225])
])

def load_model(cancer_type: str):
    """
    Load ResNet18 model with weights depending on cancer_type
    """
    model = resnet18(weights=ResNet18_Weights.IMAGENET1K_V1)
    num_features = model.fc.in_features
    model.fc = torch.nn.Linear(num_features, 2)  # 2 classes: benign, malignant

    if cancer_type.lower() == "melanoma":
        model.load_state_dict(torch.load("melanoma.pth", map_location=torch.device("cpu")))
    elif cancer_type.lower() == "breast":
        model.load_state_dict(torch.load("breast_cancer.pth", map_location=torch.device("cpu")))
    else:
        raise ValueError(f"Unknown cancer type: {cancer_type}")

    model.eval()
    return model

def predict_cancer_with_gradcam(image_bytes, cancer_type):
    """
    Run prediction on image bytes for given cancer_type
    Returns (certainty_percent, diagnosis, overlay_img)
    """
    # --- Load correct model ---
    model = load_model(cancer_type)

    # --- Preprocessing ---
    img_array = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    img_tensor = transform(img).unsqueeze(0)

    # --- Prediction ---
    with torch.no_grad():
        outputs = model(img_tensor)
        pred_class = torch.argmax(outputs, dim=1).item()
        confidence = torch.softmax(outputs, dim=1)[0][pred_class].item()

    diagnosis = "benign" if pred_class == 0 else "malignant"
    certainty_percent = round(confidence * 100, 2)

    # --- Grad-CAM ---
    target_layer = model.layer4[-1]  # last conv layer in ResNet18
    gradcam = GradCAM(model, target_layer)
    cam = gradcam.generate(img_tensor, class_idx=pred_class)
    overlay_img = overlay_heatmap(img, cam)

    return certainty_percent, diagnosis, overlay_img
