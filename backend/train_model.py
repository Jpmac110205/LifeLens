import random
import numpy as np
from pathlib import Path
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, WeightedRandomSampler
from torchvision import transforms, models
from tqdm import tqdm

from process_data import CancerDataset, training_data, validation_data

# -------------------- CONFIG --------------------
SEED = 42
BATCH_SIZE = 32
EPOCHS = 15
LEARNING_RATE = 1e-4
IMG_SIZE = 224
PATIENCE = 3
MODEL_NAME = "resnet18"
OUTPUT_DIR = Path("checkpoints")
OUTPUT_DIR.mkdir(exist_ok=True, parents=True)
BEST_MODEL_PATH = OUTPUT_DIR / "best_model.pth"
# ------------------------------------------------

def seed_everything(seed=SEED):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if getattr(torch.backends, "mps", None) and torch.backends.mps.is_available():
        torch.mps.manual_seed(seed)

def get_device():
    if torch.cuda.is_available():
        return torch.device("cuda")
    if getattr(torch.backends, "mps", None) and torch.backends.mps.is_available():
        return torch.device("mps")
    return torch.device("cpu")

def make_transforms(img_size=IMG_SIZE):
    train_transform = transforms.Compose([
        transforms.ToPILImage(),
        transforms.RandomResizedCrop(img_size, scale=(0.7, 1.0)),
        transforms.RandomHorizontalFlip(),
        transforms.RandomVerticalFlip(),
        transforms.RandomRotation(30),
        transforms.ColorJitter(brightness=0.3, contrast=0.3, saturation=0.3, hue=0.1),
        transforms.RandomAffine(degrees=0, translate=(0.1, 0.1), scale=(0.9, 1.1)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406],
                             [0.229, 0.224, 0.225])
    ])

    val_transform = transforms.Compose([
        transforms.ToPILImage(),
        transforms.Resize((img_size, img_size)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406],
                             [0.229, 0.224, 0.225])
    ])
    return train_transform, val_transform

def make_dataloaders(train_transform, val_transform):
    train_dataset = CancerDataset(training_data, transform=train_transform)
    val_dataset = CancerDataset(validation_data, transform=val_transform)

    # --- Balanced sampler for train ---
    labels = [y for _, y in train_dataset]
    class_sample_counts = np.bincount(labels)
    weights = 1. / class_sample_counts
    sample_weights = [weights[y] for y in labels]
    sampler = WeightedRandomSampler(sample_weights, num_samples=len(sample_weights), replacement=True)

    train_loader = DataLoader(train_dataset, batch_size=BATCH_SIZE, sampler=sampler)
    val_loader = DataLoader(val_dataset, batch_size=BATCH_SIZE, shuffle=False)
    return train_loader, val_loader, train_dataset

def build_model(model_name, num_classes=2, device="cpu"):
    if model_name == "resnet18":
        weights = models.ResNet18_Weights.IMAGENET1K_V1
        model = models.resnet18(weights=weights)
    else:
        raise ValueError("Use 'resnet18' for this baseline.")
    in_feats = model.fc.in_features
    model.fc = nn.Linear(in_feats, num_classes)
    return model.to(device)

def evaluate(model, loader, criterion, device):
    model.eval()
    total_loss, total, correct = 0, 0, 0
    with torch.no_grad():
        for x, y in loader:
            x, y = x.to(device), y.to(device)
            outputs = model(x)
            loss = criterion(outputs, y)
            total_loss += loss.item() * x.size(0)
            preds = outputs.argmax(1)
            correct += (preds == y).sum().item()
            total += y.size(0)
    return total_loss / total, 100.0 * correct / total

def train_one_epoch(model, loader, criterion, optimizer, device):
    model.train()
    total_loss, total, correct = 0, 0, 0
    for x, y in tqdm(loader, desc="Training", leave=False):
        x, y = x.to(device), y.to(device)
        optimizer.zero_grad()
        outputs = model(x)
        loss = criterion(outputs, y)
        loss.backward()
        optimizer.step()
        total_loss += loss.item() * x.size(0)
        correct += (outputs.argmax(1) == y).sum().item()
        total += y.size(0)
    return total_loss / total, 100.0 * correct / total

def main():
    seed_everything()
    device = get_device()
    print("Using device:", device)

    train_tf, val_tf = make_transforms()
    train_loader, val_loader, _ = make_dataloaders(train_tf, val_tf)

    model = build_model(MODEL_NAME, num_classes=2, device=device)

    # 🔑 Label smoothing reduces overconfidence
    criterion = nn.CrossEntropyLoss(label_smoothing=0.1)
    optimizer = optim.AdamW(model.parameters(), lr=LEARNING_RATE)
    scheduler = optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode="min", factor=0.5, patience=2)

    best_val_loss = float("inf")
    counter = 0

    for epoch in range(EPOCHS):
        train_loss, train_acc = train_one_epoch(model, train_loader, criterion, optimizer, device)
        val_loss, val_acc = evaluate(model, val_loader, criterion, device)

        print(f"Epoch {epoch+1}/{EPOCHS} | Train Loss: {train_loss:.4f} | Train Acc: {train_acc:.2f}% | Val Loss: {val_loss:.4f} | Val Acc: {val_acc:.2f}%")

        scheduler.step(val_loss)

        if val_loss < best_val_loss:
            best_val_loss = val_loss
            counter = 0
            torch.save(model.state_dict(), BEST_MODEL_PATH)
            print(f"✅ Saved best model at epoch {epoch+1} with Val Acc: {val_acc:.2f}%")
        else:
            counter += 1
            if counter >= PATIENCE:
                print("⏹️ Early stopping triggered")
                break

    print(f"Training done. Best Val Loss: {best_val_loss:.4f}")

if __name__ == "__main__":
    main()
