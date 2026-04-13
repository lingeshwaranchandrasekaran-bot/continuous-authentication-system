import torch
from model.siamese_model import SiameseNetwork

model = SiameseNetwork(input_size=4)
model.eval()

def get_similarity(base_vec, curr_vec):
    x1 = torch.tensor(base_vec, dtype=torch.float32)
    x2 = torch.tensor(curr_vec, dtype=torch.float32)

    out1, out2 = model(x1, x2)

    dist = torch.norm(out1 - out2)
    similarity = 1 / (1 + dist.item())
    return similarity

def identify_user(base_vec, curr_vec):
    similarity = get_similarity(base_vec, curr_vec)

    if similarity >= 0.75:
        status = "GENUINE"
    elif similarity >= 0.50:
        status = "SUSPICIOUS"
    else:
        status = "FRAUD"

    return similarity, status

def ai_risk(similarity):
    risk = 0
    alerts = []

    if similarity < 0.75:
        risk += 40
        alerts.append("AI_MISMATCH")

    if similarity < 0.50:
        risk += 20
        alerts.append("LOW_SIMILARITY")

    return risk, alerts