from io import BytesIO
from pathlib import Path

import numpy as np
import torch
from torchvision import transforms
from torchvision.models import resnet18
from PIL import Image, ImageOps

if __package__:
    from .explainability import GradCAM, overlay_heatmap
else:
    from explainability import GradCAM, overlay_heatmap

# Match validation/training preprocessing and keep the whole image aligned with CAM.
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
])
MODEL_FILES = {'melanoma': 'melanoma.pth', 'breast': 'breast_cancer.pth'}


def load_model(cancer_type: str):
    if cancer_type not in MODEL_FILES:
        raise ValueError(f'Unknown cancer type: {cancer_type}')
    model_path = Path(__file__).resolve().parent / MODEL_FILES[cancer_type]
    if not model_path.is_file():
        raise FileNotFoundError(model_path)
    # The local checkpoint has all weights. No ImageNet download is needed.
    model = resnet18(weights=None)
    model.fc = torch.nn.Linear(model.fc.in_features, 2)
    model.load_state_dict(torch.load(model_path, map_location='cpu', weights_only=True))
    model.eval()
    return model


def predict_cancer_with_gradcam(image_bytes, cancer_type):
    model = load_model(cancer_type)
    with Image.open(BytesIO(image_bytes)) as source:
        image = ImageOps.exif_transpose(source).convert('RGB')
        img = np.array(image)
        img_tensor = transform(image).unsqueeze(0)
    # One forward pass provides the prediction and its Grad-CAM activations.
    gradcam = GradCAM(model, model.layer4[-1])
    try:
        outputs = model(img_tensor)
        pred_class = outputs.argmax(dim=1).item()
        confidence = torch.softmax(outputs, dim=1)[0, pred_class].item()
        cam = gradcam.generate(img_tensor, class_idx=pred_class, output=outputs)
        overlay = overlay_heatmap(img, cam)
    finally:
        gradcam.close()
    return round(confidence * 100, 2), 'benign' if pred_class == 0 else 'malignant', overlay
