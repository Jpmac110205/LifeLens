import random
import matplotlib.pyplot as plt
import torch
from torchvision import transforms
from torch.utils.data import DataLoader
from process_data import CancerDataset, testing_data
from torchvision.models import resnet18, ResNet18_Weights
import torch.nn as nn
import numpy as np

# --- Config ---
batch_size = 8
img_size = 224
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
best_model_path = "checkpoints/best_model.pth"  # trained model path
num_samples_to_show = 10  # number of random test images to display

# --- Transforms ---
test_transform = transforms.Compose([
    transforms.ToPILImage(),
    transforms.Resize((img_size, img_size)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406],
                         [0.229, 0.224, 0.225])
])

# --- Dataset and DataLoader ---
dataset_test = CancerDataset(testing_data, transform=test_transform)
test_loader = DataLoader(dataset_test, batch_size=batch_size, shuffle=False)

# --- Load model ---
model = resnet18(weights=ResNet18_Weights.IMAGENET1K_V1)
num_features = model.fc.in_features
model.fc = nn.Linear(num_features, 2)
model.to(device)
model.load_state_dict(torch.load(best_model_path, map_location=device))
model.eval()

# --- Class names ---
class_names = {0: "benign", 1: "malignant"}

# --- Sample indices ---
sample_indices = random.sample(range(len(dataset_test)), num_samples_to_show)

# --- Visualization ---
plt.figure(figsize=(15, 5))

with torch.no_grad():
    for i, idx in enumerate(sample_indices):
        img, true_label = dataset_test[idx]
        img_input = img.unsqueeze(0).to(device)
        output = model(img_input)
        prob = torch.softmax(output, dim=1)[0]
        pred_class = torch.argmax(output, dim=1).item()
        confidence = prob[pred_class].item()

        # Convert tensor to numpy image for plotting
        img_np = img.permute(1, 2, 0).cpu().numpy()
        img_np = np.clip(img_np * np.array([0.229,0.224,0.225]) + np.array([0.485,0.456,0.406]), 0, 1)

        plt.subplot(2, num_samples_to_show // 2, i+1)
        plt.imshow(img_np)
        plt.axis('off')
        plt.title(f"T: {class_names[true_label]}\nP: {class_names[pred_class]} ({confidence*100:.1f}%)")

plt.tight_layout()
plt.show()
