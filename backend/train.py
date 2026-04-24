import os
import random
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from pymongo import MongoClient


# =========================
# MongoDB
# =========================
MONGO_URI = "mongodb://localhost:27017/"
DB_NAME = "monitor_system"

client = MongoClient(MONGO_URI)
db = client[DB_NAME]


# =========================
# Siamese Model
# =========================
class SiameseNetwork(nn.Module):
    def __init__(self, input_size=8):
        super(SiameseNetwork, self).__init__()
        self.fc = nn.Sequential(
            nn.Linear(input_size, 16),
            nn.ReLU(),
            nn.Linear(16, 8),
            nn.ReLU(),
            nn.Linear(8, 4)
        )

    def forward_once(self, x):
        return self.fc(x)

    def forward(self, x1, x2):
        return self.forward_once(x1), self.forward_once(x2)


# =========================
# Contrastive Loss
# =========================
class ContrastiveLoss(nn.Module):
    def __init__(self, margin=1.0):
        super(ContrastiveLoss, self).__init__()
        self.margin = margin

    def forward(self, out1, out2, label):
        distance = torch.norm(out1 - out2, dim=1)

        loss = torch.mean(
            label * torch.pow(distance, 2) +
            (1 - label) * torch.pow(torch.clamp(self.margin - distance, min=0.0), 2)
        )

        return loss


# =========================
# Load Training Data
# =========================
def load_training_vectors():
    users = list(db.training.find({}))

    data = {}

    for user in users:
        user_id = user.get("userId")
        vectors = user.get("featureVectors", [])

        if user_id and vectors:
            clean_vectors = []

            for v in vectors:
                if isinstance(v, list) and len(v) == 8:
                    clean_vectors.append([float(x) for x in v])

            if len(clean_vectors) >= 2:
                data[user_id] = clean_vectors

    return data


# =========================
# Create Pairs
# same user = label 1
# different user = label 0
# =========================
def create_pairs(data, pair_count=4000):
    users = list(data.keys())

    if len(users) < 1:
        return [], [], []

    x1_list = []
    x2_list = []
    labels = []

    # Positive pairs
    for _ in range(pair_count // 2):
        user = random.choice(users)
        vectors = data[user]

        if len(vectors) < 2:
            continue

        v1, v2 = random.sample(vectors, 2)

        x1_list.append(v1)
        x2_list.append(v2)
        labels.append(1.0)

    # Negative pairs
    if len(users) >= 2:
        for _ in range(pair_count // 2):
            user1, user2 = random.sample(users, 2)

            v1 = random.choice(data[user1])
            v2 = random.choice(data[user2])

            x1_list.append(v1)
            x2_list.append(v2)
            labels.append(0.0)
    else:
        print("⚠️ Only one user training data found. Negative pairs will be synthetic.")

        all_vectors = data[users[0]]

        for _ in range(pair_count // 2):
            v1 = random.choice(all_vectors)
            noise = np.random.normal(0, 80, size=8)
            v2 = (np.array(v1) + noise).tolist()

            x1_list.append(v1)
            x2_list.append(v2)
            labels.append(0.0)

    return x1_list, x2_list, labels


# =========================
# Train
# =========================
def train():
    print("📥 Loading training data from MongoDB...")

    data = load_training_vectors()

    if not data:
        print("❌ No training data found.")
        print("👉 First complete Training module from frontend.")
        return

    print(f"✅ Users with training data: {len(data)}")

    x1, x2, labels = create_pairs(data, pair_count=4000)

    if len(x1) == 0:
        print("❌ Not enough data to create training pairs.")
        return

    x1 = torch.tensor(x1, dtype=torch.float32)
    x2 = torch.tensor(x2, dtype=torch.float32)
    labels = torch.tensor(labels, dtype=torch.float32)

    model = SiameseNetwork(input_size=8)
    criterion = ContrastiveLoss(margin=1.0)
    optimizer = optim.Adam(model.parameters(), lr=0.001)

    epochs = 30
    batch_size = 64

    print(f"🚀 Training started: {epochs} epochs, {len(labels)} pairs")

    for epoch in range(epochs):
        permutation = torch.randperm(x1.size(0))
        total_loss = 0

        for i in range(0, x1.size(0), batch_size):
            indices = permutation[i:i + batch_size]

            batch_x1 = x1[indices]
            batch_x2 = x2[indices]
            batch_labels = labels[indices]

            optimizer.zero_grad()

            out1, out2 = model(batch_x1, batch_x2)
            loss = criterion(out1, out2, batch_labels)

            loss.backward()
            optimizer.step()

            total_loss += loss.item()

        avg_loss = total_loss / max(1, x1.size(0) // batch_size)

        print(f"Epoch {epoch + 1}/{epochs} | Loss: {avg_loss:.4f}")

    os.makedirs("model", exist_ok=True)

    save_path = os.path.join("model", "siamese_weights.pth")
    torch.save(model.state_dict(), save_path)

    print("✅ Training completed")
    print(f"✅ Model saved to {save_path}")


if __name__ == "__main__":
    train()