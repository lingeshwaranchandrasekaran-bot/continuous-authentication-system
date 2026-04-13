from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from datetime import datetime
import numpy as np
import bcrypt
import uuid

app = Flask(__name__)
CORS(app)

# ==========================
# MongoDB (SAFE CONNECT)
# ==========================
try:
    client = MongoClient("mongodb://localhost:27017/", serverSelectionTimeoutMS=2000)
    client.server_info()  # test connection
    print("✅ MongoDB Connected")
except:
    print("❌ MongoDB NOT RUNNING")
    client = None

db = client["monitor_system"] if client else None

# ==========================
# SIMPLE SIAMESE (AI)
# ==========================
def compare_vectors(v1, v2):
    dist = np.linalg.norm(v1 - v2)
    similarity = 1 / (1 + dist)
    return similarity, similarity > 0.7

# ==========================
# FEATURE EXTRACTION
# ==========================
def extract_features(data):
    speeds = []

    for d in data:
        keys = d.get("keys", [])
        times = [k["time"] for k in keys]

        if len(times) > 1:
            diff = np.diff(times)
            speeds.extend(diff)

    return np.array([
        np.mean(speeds) if speeds else 0,
        np.std(speeds) if speeds else 0,
        len(speeds)
    ])

# ==========================
# AUTH (CREATE USER)
# ==========================
@app.route("/api/auth/register", methods=["POST"])
def register():
    if not db:
        return jsonify({"error": "DB not connected"}), 500

    data = request.json

    hashed = bcrypt.hashpw(data["password"].encode(), bcrypt.gensalt())

    db.users.insert_one({
        "username": data["username"],
        "password": hashed
    })

    return jsonify({"message": "User created"})

# ==========================
# LOGIN
# ==========================
@app.route("/api/auth/login", methods=["POST"])
def login():
    if not db:
        return jsonify({"error": "DB not connected"}), 500

    data = request.json
    user = db.users.find_one({"username": data["username"]})

    if user and bcrypt.checkpw(data["password"].encode(), user["password"]):
        return jsonify({"message": "Login success"})
    return jsonify({"error": "Invalid"}), 401

# ==========================
# TRAINING SAVE
# ==========================
@app.route("/api/training/save-baseline", methods=["POST"])
def save_training():
    if not db:
        return jsonify({"error": "DB not connected"}), 500

    data = request.json

    db.training.replace_one(
        {"userId": data["userId"]},
        {
            "userId": data["userId"],
            "data": data["samples"],
            "createdAt": datetime.utcnow()
        },
        upsert=True
    )

    return jsonify({"message": "Training saved"})

# ==========================
# FRAUD ANALYZE
# ==========================
@app.route("/api/behavior/analyze", methods=["POST"])
def analyze():
    if not db:
        return jsonify({"error": "DB not connected"}), 500

    data = request.json
    user_id = data.get("userId")

    baseline = db.training.find_one({"userId": user_id})

    if not baseline:
        return jsonify({"error": "No baseline"}), 404

    base_vec = extract_features(baseline["data"])
    curr_vec = extract_features(data.get("samples", []))

    sim, same = compare_vectors(base_vec, curr_vec)

    risk = 0
    alerts = []

    if data.get("copyPaste", 0) > 0:
        risk += 30
        alerts.append("COPY PASTE")

    if data.get("tabSwitch", 0) > 1:
        risk += 30
        alerts.append("TAB SWITCH")

    if not same:
        risk += 40
        alerts.append("AI MISMATCH")

    return jsonify({
        "riskScore": risk,
        "alerts": alerts,
        "similarity": float(sim)
    })

# ==========================
# EXAM SAVE
# ==========================
@app.route("/api/exam/save", methods=["POST"])
def save_exam():
    if not db:
        return jsonify({"error": "DB not connected"}), 500

    data = request.json

    db.exam.insert_one({
        "userId": data.get("userId"),
        "log": data.get("log"),
        "warnings": data.get("warnings"),
        "createdAt": datetime.utcnow()
    })

    return jsonify({"message": "Exam saved"})

# ==========================
# ADMIN REPORT
# ==========================
@app.route("/api/admin/reports", methods=["GET"])
def get_reports():
    if not db:
        return jsonify({"error": "DB not connected"}), 500

    reports = list(db.exam.find({}, {"_id": 0}))
    return jsonify(reports)

# ==========================
# RUN
# ==========================
if __name__ == "__main__":
    app.run(debug=True)