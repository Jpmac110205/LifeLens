import cv2
import numpy as np
import torch
from torchvision import transforms
from torchvision.models import resnet18, ResNet18_Weights
from PIL import Image

# --- Load model (ResNet18, matching training) ---
model = resnet18(weights=ResNet18_Weights.IMAGENET1K_V1)
num_features = model.fc.in_features
model.fc = torch.nn.Linear(num_features, 2)  # 2 classes: benign, malignant

# Load trained weights
model.load_state_dict(torch.load("breast_cancer.pth", map_location=torch.device("cpu")))
model.eval()

# --- Transform for single image ---
transform = transforms.Compose([
    transforms.ToPILImage(),
    transforms.Resize(224),                     # Resize shorter side to 224
    transforms.CenterCrop(224),                 # Crop to 224x224 from center
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406],
                         [0.229, 0.224, 0.225])
])

def predict_cancer(image_bytes):
    """
    Takes raw image bytes, preprocesses, and runs inference using trained ResNet18.
    Returns: (certainty_percent, diagnosis)
    """
    # Convert bytes → np.array
    img_array = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)  # Ensure RGB

    # Apply transforms
    img_tensor = transform(img).unsqueeze(0)  # shape: [1, 3, 224, 224]

    # Forward pass
    with torch.no_grad():
        outputs = model(img_tensor)
        pred_class = torch.argmax(outputs, dim=1).item()
        confidence = torch.softmax(outputs, dim=1)[0][pred_class].item()

    diagnosis = "benign" if pred_class == 0 else "malignant"
    certainty_percent = round(confidence * 100, 2)

    return certainty_percent, diagnosis
