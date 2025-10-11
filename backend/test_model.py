import torch
from torchvision import transforms
from torch.utils.data import DataLoader
from process_data import CancerDataset, testing_data
from torchvision.models import resnet18, ResNet18_Weights
import torch.nn as nn
from sklearn.metrics import confusion_matrix

# --- Config ---
BATCH_SIZE = 8
IMG_SIZE = 224
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
BEST_MODEL_PATH = "breast_cancer.pth"  # trained model path

# --- Transforms ---
test_transform = transforms.Compose([
    transforms.ToPILImage(),
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406],
                         [0.229, 0.224, 0.225])
])

# --- Dataset and DataLoader ---
dataset_test = CancerDataset(testing_data, transform=test_transform)
test_loader = DataLoader(dataset_test, batch_size=BATCH_SIZE, shuffle=False)

# --- Load pretrained ResNet18 (must match training) ---
model = resnet18(weights=ResNet18_Weights.IMAGENET1K_V1)
num_features = model.fc.in_features
model.fc = nn.Linear(num_features, 2)  # binary classification
model.to(DEVICE)

# --- Load trained weights ---
model.load_state_dict(torch.load(BEST_MODEL_PATH, map_location=DEVICE))
model.eval()

# --- Risk function ---
def get_risk(pred_class, confidence):
    if confidence > 0.75:
        return "High" if pred_class == 1 else "Low"
    elif confidence > 0.5:
        return "Medium"
    else:
        return "Low" if pred_class == 1 else "High"

# --- Evaluation ---
results = []
all_preds = []
all_labels = []

with torch.no_grad():
    for batch_x, batch_y in test_loader:
        batch_x, batch_y = batch_x.to(DEVICE), batch_y.to(DEVICE)
        outputs = model(batch_x)
        probs = torch.softmax(outputs, dim=1)
        preds = torch.argmax(outputs, dim=1)

        all_preds.extend(preds.cpu().tolist())
        all_labels.extend(batch_y.cpu().tolist())

        for i in range(len(batch_x)):
            pred_class = preds[i].item()
            confidence = probs[i, pred_class].item()
            risk_level = get_risk(pred_class, confidence)

            results.append({
                "true_label": int(batch_y[i].item()),
                "prediction": int(pred_class),
                "confidence_percent": round(confidence * 100, 2),
                "risk_level": risk_level
            })

# --- Print summary ---
correct = sum([r["true_label"] == r["prediction"] for r in results])
accuracy = 100.0 * correct / len(results)
print(f"Test Accuracy: {accuracy:.2f}%")
print(f"Total test samples: {len(results)}")
print("\nSample predictions:")
for r in results[:10]:
    print(r)

# --- Confusion matrix ---
cm = confusion_matrix(all_labels, all_preds)
print("\nConfusion Matrix:")
print(cm)
