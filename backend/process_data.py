import os
import cv2
import numpy as np
import torch
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms, models
import torch.nn as nn
import random

# ---------------- CONFIG ----------------
img_size = 224
SEED = 42
random.seed(SEED)
np.random.seed(SEED)
torch.manual_seed(SEED)
if getattr(torch.backends, "mps", None) and torch.backends.mps.is_available():
    torch.mps.manual_seed(SEED)

# Folder locations
ben_train_folder = "./archive/BreaKHis_v1/BreaKHis_v1/dataset_split/benign/train"
mal_train_folder = "./archive/BreaKHis_v1/BreaKHis_v1/dataset_split/malignant/train"
ben_val_folder   = "./archive/BreaKHis_v1/BreaKHis_v1/dataset_split/benign/val"
mal_val_folder   = "./archive/BreaKHis_v1/BreaKHis_v1/dataset_split/malignant/val"
ben_test_folder  = "./archive/BreaKHis_v1/BreaKHis_v1/dataset_split/benign/test"
mal_test_folder  = "./archive/BreaKHis_v1/BreaKHis_v1/dataset_split/malignant/test"

# ---------------- DATASET CLASS ----------------
class CancerDataset(Dataset):
    def __init__(self, data, transform=None):
        self.data = data
        self.transform = transform

    def __len__(self):
        return len(self.data)

    def __getitem__(self, idx):
        img, label = self.data[idx]
        if self.transform:
            img = self.transform(img)
        return img, label

# ---------------- IMAGE LOADING ----------------
def load_images_from_folder(folder, label, img_size=224):
    data = []
    count = 0
    for filename in os.listdir(folder):
        if "mask" in filename.lower():
            continue
        path = os.path.join(folder, filename)
        try:
            img = cv2.imread(path, cv2.IMREAD_COLOR)
            if img is None:
                continue
            img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            img = cv2.resize(img, (img_size, img_size))
            data.append([img, label])
            count += 1
        except Exception as e:
            print(f"Skipped {path}: {e}")
    print(f"Loaded {count} images from {folder}")
    return data

# ---------------- LOAD DATA ----------------
ben_train = load_images_from_folder(ben_train_folder, 0, img_size)
mal_train = load_images_from_folder(mal_train_folder, 1, img_size)
ben_val   = load_images_from_folder(ben_val_folder, 0, img_size)
mal_val   = load_images_from_folder(mal_val_folder, 1, img_size)
ben_test  = load_images_from_folder(ben_test_folder, 0, img_size)
mal_test  = load_images_from_folder(mal_test_folder, 1, img_size)

training_data   = ben_train + mal_train
validation_data = ben_val + mal_val
testing_data    = ben_test + mal_test

np.random.shuffle(training_data)
np.random.shuffle(validation_data)
np.random.shuffle(testing_data)

# ---------------- TRANSFORMS ----------------
train_transform = transforms.Compose([
    transforms.ToPILImage(),
    transforms.RandomHorizontalFlip(),
    transforms.RandomRotation(20),
    transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406],
                         [0.229, 0.224, 0.225])
])

val_test_transform = transforms.Compose([
    transforms.ToPILImage(),
    transforms.Resize((img_size, img_size)),  # ensures consistent size
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406],
                         [0.229, 0.224, 0.225])
])

# ---------------- DATASETS & LOADERS ----------------
dataset_train = CancerDataset(training_data, transform=train_transform)
dataset_val   = CancerDataset(validation_data, transform=val_test_transform)
dataset_test  = CancerDataset(testing_data, transform=val_test_transform)

train_loader = DataLoader(dataset_train, batch_size=32, shuffle=True)
val_loader   = DataLoader(dataset_val, batch_size=32, shuffle=False)
test_loader  = DataLoader(dataset_test, batch_size=32, shuffle=False)

# ---------------- MODEL SETUP ----------------
model = models.resnet18(weights=models.ResNet18_Weights.IMAGENET1K_V1)
num_features = model.fc.in_features
model.fc = nn.Linear(num_features, 2)  # Binary classification

# Move to device
if torch.cuda.is_available():
    device = torch.device("cuda")
elif getattr(torch.backends, "mps", None) and torch.backends.mps.is_available():
    device = torch.device("mps")
else:
    device = torch.device("cpu")

model = model.to(device)

# ---------------- LOSS & OPTIMIZER ----------------
criterion = nn.CrossEntropyLoss()
optimizer = torch.optim.Adam(model.parameters(), lr=1e-4)

print("✅ Pretrained ResNet18 model ready for training with RGB inputs")
