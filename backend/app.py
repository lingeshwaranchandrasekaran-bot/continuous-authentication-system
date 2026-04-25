from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from pymongo import MongoClient
from datetime import datetime, timezone
from io import BytesIO
import os
import numpy as np
import bcrypt
import torch
import torch.nn as nn
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

app = Flask(__name__)
CORS(app)

MONGO_URI = "mongodb://localhost:27017/"
DB_NAME = "monitor_system"

client = None
db = None

current_desktop_user = {"userId": "unknown", "role": "user"}

try:
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=3000)
    client.server_info()
    db = client[DB_NAME]
    print("✅ MongoDB Connected")
except Exception as e:
    print("❌ MongoDB NOT connected:", e)
    db = None


def now_utc():
    return datetime.now(timezone.utc)


def db_required():
    if db is None:
        return False, jsonify({"error": "MongoDB not connected"}), 500
    return True, None, None


def clean_value(value):
    if isinstance(value, datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.isoformat()
    if isinstance(value, list):
        return [clean_value(v) for v in value]
    if isinstance(value, dict):
        return {k: clean_value(v) for k, v in value.items()}
    return value


def clean_doc(doc):
    if doc is None:
        return None
    return {k: clean_value(v) for k, v in doc.items()}


def clean_docs(docs):
    return [clean_doc(doc) for doc in docs]


def save_alert(user_id, alert_type, message, risk_score=0):
    if db is None:
        return

    db.alerts.insert_one({
        "userId": user_id,
        "type": alert_type,
        "message": message,
        "riskScore": risk_score,
        "status": "unread",
        "createdAt": now_utc()
    })


def get_user_full_summary(username):
    user = db.users.find_one({"username": username}, {"_id": 0, "password": 0})
    training = db.training.find_one({"userId": username}, {"_id": 0})

    reports = list(db.exam.find({"userId": username}, {"_id": 0}).sort("createdAt", -1))
    alerts = list(db.alerts.find({"userId": username}, {"_id": 0}).sort("createdAt", -1))
    analysis = list(db.analysis.find({"userId": username}, {"_id": 0}).sort("createdAt", -1))
    logins = list(db.login_logs.find({"username": username}, {"_id": 0}).sort("loginAt", -1))
    sessions = list(db.behavior_sessions.find({"userId": username}, {"_id": 0}).sort("createdAt", -1))

    return clean_doc({
        "user": user,
        "training": training,
        "reports": reports,
        "alerts": alerts,
        "analysis": analysis,
        "logins": logins,
        "sessions": sessions
    })


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


siamese_model = SiameseNetwork(input_size=8)
MODEL_PATH = os.path.join("model", "siamese_weights.pth")

try:
    if os.path.exists(MODEL_PATH):
        siamese_model.load_state_dict(torch.load(MODEL_PATH, map_location="cpu"))
        print("✅ Siamese model loaded")
    else:
        print("⚠️ siamese_weights.pth not found. Default model running.")
except Exception as e:
    print("❌ Model load error:", e)

siamese_model.eval()


def compare_vectors(v1, v2):
    x1 = torch.tensor(v1, dtype=torch.float32).unsqueeze(0)
    x2 = torch.tensor(v2, dtype=torch.float32).unsqueeze(0)

    with torch.no_grad():
        out1, out2 = siamese_model(x1, x2)
        dist = torch.norm(out1 - out2, dim=1).item()

    return float(1 / (1 + dist))


def extract_features(data):
    if not data:
        return np.array([0.0] * 8, dtype=np.float32)

    all_hold_times = []
    all_flight_times = []
    all_mouse_speeds = []
    key_counts = []
    click_counts = []

    for d in data:
        keys = d.get("keys", [])
        mouse = d.get("mouse", [])
        clicks = d.get("clicks", [])

        hold_times = d.get("holdTimes", [])
        flight_times = d.get("flightTimes", [])
        mouse_speeds = d.get("mouseSpeeds", [])

        key_counts.append(len(keys))
        click_counts.append(len(clicks))

        all_hold_times.extend([float(x) for x in hold_times if x is not None])
        all_flight_times.extend([float(x) for x in flight_times if x is not None])
        all_mouse_speeds.extend([float(x) for x in mouse_speeds if x is not None])

        if not hold_times and keys:
            key_down_map = {}
            for k in keys:
                key_type = k.get("type")
                key_name = k.get("key")
                key_time = k.get("time")

                if key_type == "down":
                    key_down_map[key_name] = key_time
                elif key_type == "up" and key_name in key_down_map:
                    hold = key_time - key_down_map[key_name]
                    if hold > 0:
                        all_hold_times.append(float(hold))

        if not flight_times and keys:
            times = [k.get("time") for k in keys if k.get("time") is not None]
            if len(times) > 1:
                diff = np.diff(times)
                diff = diff[diff > 0]
                all_flight_times.extend(diff.tolist())

        if not mouse_speeds and mouse:
            for i in range(1, len(mouse)):
                prev = mouse[i - 1]
                curr = mouse[i]

                if all(k in prev for k in ["x", "y", "time"]) and all(k in curr for k in ["x", "y", "time"]):
                    dx = curr["x"] - prev["x"]
                    dy = curr["y"] - prev["y"]
                    dt = curr["time"] - prev["time"]

                    if dt > 0:
                        speed = np.sqrt(dx * dx + dy * dy) / dt
                        all_mouse_speeds.append(float(speed))

    return np.array([
        float(np.mean(all_hold_times)) if all_hold_times else 0.0,
        float(np.std(all_hold_times)) if all_hold_times else 0.0,
        float(np.mean(all_flight_times)) if all_flight_times else 0.0,
        float(np.std(all_flight_times)) if all_flight_times else 0.0,
        float(np.mean(all_mouse_speeds)) if all_mouse_speeds else 0.0,
        float(np.std(all_mouse_speeds)) if all_mouse_speeds else 0.0,
        float(np.mean(key_counts)) if key_counts else 0.0,
        float(np.mean(click_counts)) if click_counts else 0.0
    ], dtype=np.float32)


def compute_training_statistics(samples):
    feature_vectors = []

    for sample in samples:
        vec = extract_features([sample])
        feature_vectors.append(vec)

    if not feature_vectors:
        return {
            "featureVectors": [],
            "baselineMean": [0.0] * 8,
            "baselineStd": [0.0] * 8
        }

    matrix = np.vstack(feature_vectors)

    return {
        "featureVectors": [vec.tolist() for vec in feature_vectors],
        "baselineMean": np.mean(matrix, axis=0).tolist(),
        "baselineStd": np.std(matrix, axis=0).tolist()
    }


def tolerance_check(base_mean, base_std, curr_vec):
    mismatch_count = 0
    alerts = []

    tolerance = np.maximum(base_std * 2.0, np.array([
        60.0, 40.0, 80.0, 60.0, 0.4, 0.3, 8.0, 3.0
    ], dtype=np.float32))

    names = [
        "HOLD_TIME_CHANGED",
        "HOLD_VARIANCE_CHANGED",
        "FLIGHT_TIME_CHANGED",
        "FLIGHT_VARIANCE_CHANGED",
        "MOUSE_SPEED_CHANGED",
        "MOUSE_VARIANCE_CHANGED",
        "KEY_ACTIVITY_CHANGED",
        "CLICK_ACTIVITY_CHANGED"
    ]

    diffs = np.abs(curr_vec - base_mean)

    for i in range(len(diffs)):
        if diffs[i] > tolerance[i]:
            mismatch_count += 0.5 if i in [4, 5, 7] else 1
            alerts.append(names[i])

    return float(mismatch_count), alerts


def rule_based_detection(copy_paste=0, tab_switch=0, warnings=0, focus_lost=0, drag_count=0):
    risk = 0
    alerts = []

    if copy_paste > 0:
        risk += 20
        alerts.append("COPY_PASTE")

    if tab_switch > 0:
        risk += 20
        alerts.append("TAB_SWITCH")

    if focus_lost > 0:
        risk += 15
        alerts.append("WINDOW_FOCUS_LOST")

    if drag_count > 5:
        risk += 10
        alerts.append("EXCESSIVE_DRAG_ACTIVITY")

    if warnings > 0:
        risk += min(warnings * 8, 24)
        alerts.append("WARNING_COUNT")

    return risk, alerts


def ai_risk_from_similarity(similarity):
    risk = 0
    alerts = []

    if similarity < 0.68:
        risk += 15
        alerts.append("AI_SIMILARITY_LOW")
    if similarity < 0.55:
        risk += 10
        alerts.append("AI_SIMILARITY_VERY_LOW")
    if similarity < 0.45:
        risk += 10
        alerts.append("AI_SIMILARITY_CRITICAL")

    return risk, alerts


def classify_user(similarity, mismatch_count, rule_risk):
    if similarity >= 0.68 and mismatch_count <= 1 and rule_risk < 25:
        return "GENUINE"

    if similarity < 0.45 and (mismatch_count >= 3 or rule_risk >= 35):
        return "FRAUD"

    return "SUSPICIOUS"


@app.route("/", methods=["GET"])
def home():
    return jsonify({"message": "Monitor System Backend Running"})


@app.route("/api/desktop/set-user", methods=["POST"])
def set_desktop_user():
    data = request.json or {}

    current_desktop_user["userId"] = data.get("userId", "unknown")
    current_desktop_user["role"] = data.get("role", "user")

    return jsonify({
        "message": "Desktop user updated",
        "user": current_desktop_user
    })


@app.route("/api/desktop/current-user", methods=["GET"])
def get_desktop_user():
    return jsonify(current_desktop_user)


@app.route("/api/auth/register", methods=["POST"])
def register():
    ok, resp, code = db_required()
    if not ok:
        return resp, code

    data = request.json or {}
    username = data.get("username", "").strip()
    password = data.get("password", "")
    role = data.get("role", "user").strip().lower()

    if not username or not password:
        return jsonify({"error": "Username and password required"}), 400

    if role not in ["user", "admin"]:
        role = "user"

    if db.users.find_one({"username": username}):
        return jsonify({"error": "User already exists"}), 409

    hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    db.users.insert_one({
        "username": username,
        "password": hashed,
        "role": role,
        "isBlocked": False,
        "createdAt": now_utc()
    })

    return jsonify({"message": "User created successfully"})


@app.route("/api/auth/login", methods=["POST"])
def login():
    ok, resp, code = db_required()
    if not ok:
        return resp, code

    data = request.json or {}
    username = data.get("username", "").strip()
    password = data.get("password", "")

    if not username or not password:
        return jsonify({"error": "Username and password required"}), 400

    user = db.users.find_one({"username": username})

    if not user:
        return jsonify({"error": "Invalid credentials"}), 401

    if user.get("isBlocked", False):
        return jsonify({"error": "Your account has been blocked by admin"}), 403

    stored_password = user["password"]
    if isinstance(stored_password, str):
        stored_password = stored_password.encode("utf-8")

    if bcrypt.checkpw(password.encode("utf-8"), stored_password):
        has_baseline = db.training.find_one({"userId": username}) is not None
        role = user.get("role", "user")

        db.login_logs.insert_one({
            "username": username,
            "role": role,
            "loginAt": now_utc()
        })

        return jsonify({
            "message": "Login success",
            "user": {
                "username": username,
                "role": role,
                "hasBaseline": has_baseline
            }
        })

    return jsonify({"error": "Invalid credentials"}), 401


@app.route("/api/admin/create-user", methods=["POST"])
def admin_create_user():
    return register()


@app.route("/api/admin/delete-user/<username>", methods=["DELETE"])
def delete_user(username):
    ok, resp, code = db_required()
    if not ok:
        return resp, code

    db.users.delete_one({"username": username})
    db.training.delete_one({"userId": username})
    db.exam.delete_many({"userId": username})
    db.analysis.delete_many({"userId": username})
    db.alerts.delete_many({"userId": username})
    db.login_logs.delete_many({"username": username})
    db.behavior_sessions.delete_many({"userId": username})

    return jsonify({"message": "User deleted successfully"})


@app.route("/api/admin/block-user/<username>", methods=["POST"])
def block_user(username):
    ok, resp, code = db_required()
    if not ok:
        return resp, code

    result = db.users.update_one(
        {"username": username},
        {"$set": {"isBlocked": True, "blockedAt": now_utc()}}
    )

    if result.matched_count == 0:
        return jsonify({"error": "User not found"}), 404

    save_alert(username, "BLOCKED", f"User {username} was blocked by admin")
    return jsonify({"message": "User blocked successfully"})


@app.route("/api/admin/unblock-user/<username>", methods=["POST"])
def unblock_user(username):
    ok, resp, code = db_required()
    if not ok:
        return resp, code

    result = db.users.update_one(
        {"username": username},
        {"$set": {"isBlocked": False}, "$unset": {"blockedAt": ""}}
    )

    if result.matched_count == 0:
        return jsonify({"error": "User not found"}), 404

    save_alert(username, "UNBLOCKED", f"User {username} was unblocked by admin")
    return jsonify({"message": "User unblocked successfully"})


@app.route("/api/admin/reset-training/<username>", methods=["POST"])
def reset_training(username):
    ok, resp, code = db_required()
    if not ok:
        return resp, code

    db.training.delete_one({"userId": username})
    return jsonify({"message": "Training reset successful"})


@app.route("/api/training/save-baseline", methods=["POST"])
def save_training():
    ok, resp, code = db_required()
    if not ok:
        return resp, code

    data = request.json or {}
    user_id = data.get("userId")
    samples = data.get("samples", [])
    quality_score = int(data.get("qualityScore", 0))

    if not user_id:
        return jsonify({"error": "userId required"}), 400

    if not isinstance(samples, list) or len(samples) == 0:
        return jsonify({"error": "samples required"}), 400

    stats = compute_training_statistics(samples)

    db.training.replace_one(
        {"userId": user_id},
        {
            "userId": user_id,
            "data": samples,
            "featureVectors": stats["featureVectors"],
            "baselineMean": stats["baselineMean"],
            "baselineStd": stats["baselineStd"],
            "qualityScore": quality_score,
            "status": "COMPLETED",
            "updatedAt": now_utc()
        },
        upsert=True
    )

    save_alert(user_id, "TRAINING_COMPLETED", f"Training completed with quality score {quality_score}%", quality_score)

    return jsonify({
        "message": "Training saved successfully",
        "qualityScore": quality_score,
        "stats": stats
    })


@app.route("/api/training/baseline/<user_id>", methods=["GET"])
def get_baseline(user_id):
    ok, resp, code = db_required()
    if not ok:
        return resp, code

    baseline = db.training.find_one({"userId": user_id}, {"_id": 0})
    if not baseline:
        return jsonify({"error": "No baseline found"}), 404

    return jsonify(clean_doc(baseline))


@app.route("/api/admin/add-sentence", methods=["POST"])
def add_sentence():
    ok, resp, code = db_required()
    if not ok:
        return resp, code

    data = request.json or {}
    sentence = data.get("sentence", "").strip()

    if not sentence:
        return jsonify({"error": "Sentence required"}), 400

    db.sentences.insert_one({
        "sentence": sentence,
        "createdAt": now_utc()
    })

    return jsonify({"message": "Sentence added successfully"})


@app.route("/api/sentences", methods=["GET"])
def get_sentences():
    ok, resp, code = db_required()
    if not ok:
        return resp, code

    sentences = list(db.sentences.find({}, {"_id": 0}).sort("createdAt", -1))
    return jsonify(clean_docs(sentences))


@app.route("/api/behavior/analyze", methods=["POST"])
def analyze():
    ok, resp, code = db_required()
    if not ok:
        return resp, code

    data = request.json or {}

    user_id = data.get("userId")
    samples = data.get("samples", [])
    copy_paste = int(data.get("copyPaste", 0))
    tab_switch = int(data.get("tabSwitch", 0))
    warnings = int(data.get("warnings", 0))
    focus_lost = int(data.get("focusLost", 0))
    drag_count = int(data.get("dragCount", 0))

    if not user_id:
        return jsonify({"error": "userId required"}), 400

    baseline = db.training.find_one({"userId": user_id})
    if not baseline:
        return jsonify({"error": "No baseline"}), 404

    current_vec = extract_features(samples)
    baseline_mean = np.array(baseline.get("baselineMean", [0.0] * 8), dtype=np.float32)
    baseline_std = np.array(baseline.get("baselineStd", [0.0] * 8), dtype=np.float32)

    similarity = compare_vectors(baseline_mean, current_vec)
    mismatch_count, tolerance_alerts = tolerance_check(baseline_mean, baseline_std, current_vec)
    ai_score, ai_alerts = ai_risk_from_similarity(similarity)
    rule_score, rule_alerts = rule_based_detection(copy_paste, tab_switch, warnings, focus_lost, drag_count)

    total_mismatch_count = mismatch_count
    if similarity < 0.55:
        total_mismatch_count += 1

    risk = min(ai_score + rule_score + int(mismatch_count * 8), 100)
    alerts = ai_alerts + rule_alerts + tolerance_alerts

    status = classify_user(similarity, total_mismatch_count, rule_score)

    if risk >= 60 and (total_mismatch_count >= 3 or rule_score >= 35):
        status = "FRAUD"
    elif risk >= 25 and status != "FRAUD":
        status = "SUSPICIOUS"

    if status in ["SUSPICIOUS", "FRAUD"]:
        save_alert(user_id, status, f"User {user_id} flagged as {status} with risk score {risk}", risk)

    doc = {
        "userId": user_id,
        "riskScore": risk,
        "alerts": alerts,
        "similarity": float(similarity),
        "sameUser": bool(similarity >= 0.68),
        "status": status,
        "samples": samples,
        "featureVector": current_vec.tolist(),
        "copyPaste": copy_paste,
        "tabSwitch": tab_switch,
        "warnings": warnings,
        "focusLost": focus_lost,
        "dragCount": drag_count,
        "mismatchCount": float(total_mismatch_count),
        "createdAt": now_utc()
    }

    db.analysis.insert_one(doc)

    return jsonify({
        "riskScore": risk,
        "alerts": alerts,
        "similarity": float(similarity),
        "sameUser": bool(similarity >= 0.68),
        "status": status,
        "mismatchCount": float(total_mismatch_count)
    })


@app.route("/api/behavior/session-save", methods=["POST"])
def save_behavior_session():
    ok, resp, code = db_required()
    if not ok:
        return resp, code

    data = request.json or {}

    user_id = data.get("userId")
    role = data.get("role", "user")
    page = data.get("page", "unknown")
    events = data.get("events", {})

    if not user_id:
        return jsonify({"error": "userId required"}), 400

    feature_vec = extract_features([events]).tolist()

    summary = {
        "keys": len(events.get("keys", [])),
        "mouse": len(events.get("mouse", [])),
        "clicks": len(events.get("clicks", [])),
        "scrolls": len(events.get("scrolls", [])),
        "drags": len(events.get("drags", [])),
        "files": len(events.get("files", [])),
        "focusEvents": len(events.get("focusEvents", [])),
        "pasteEvents": len(events.get("pasteEvents", [])),
        "tabSwitches": len(events.get("tabSwitches", []))
    }

    db.behavior_sessions.insert_one({
        "userId": user_id,
        "role": role,
        "page": page,
        "events": events,
        "summary": summary,
        "featureVector": feature_vec,
        "createdAt": now_utc()
    })

    return jsonify({
        "message": "Behavior session saved",
        "summary": summary,
        "featureVector": feature_vec
    })


@app.route("/api/exam/save", methods=["POST"])
def save_exam():
    ok, resp, code = db_required()
    if not ok:
        return resp, code

    data = request.json or {}

    user_id = data.get("userId")
    log = data.get("log", [])
    warnings = int(data.get("warnings", 0))
    result = data.get("result", "UNKNOWN")
    warning_details = data.get("warningDetails", [])

    if not user_id:
        return jsonify({"error": "userId required"}), 400

    db.exam.insert_one({
        "userId": user_id,
        "log": log,
        "warnings": warnings,
        "result": result,
        "warningDetails": warning_details,
        "createdAt": now_utc()
    })

    if warnings > 0 or result in ["SUSPICIOUS", "FRAUD", "FRAUD_AUTO_LOGOUT", "PATTERN_AUTO_LOGOUT"]:
        save_alert(user_id, "EXAM_ALERT", f"Exam finished with {warnings} warnings. Result: {result}", warnings)

    return jsonify({"message": "Exam report saved"})


@app.route("/api/admin/users", methods=["GET"])
def get_users():
    ok, resp, code = db_required()
    if not ok:
        return resp, code

    users = list(db.users.find({}, {"_id": 0, "password": 0}).sort("createdAt", -1))
    return jsonify(clean_docs(users))


@app.route("/api/admin/reports", methods=["GET"])
def get_reports():
    ok, resp, code = db_required()
    if not ok:
        return resp, code

    reports = list(db.exam.find({}, {"_id": 0}).sort("createdAt", -1))
    return jsonify(clean_docs(reports))


@app.route("/api/admin/analysis", methods=["GET"])
def get_analysis():
    ok, resp, code = db_required()
    if not ok:
        return resp, code

    logs = list(db.analysis.find({}, {"_id": 0}).sort("createdAt", -1))
    return jsonify(clean_docs(logs))


@app.route("/api/admin/alerts", methods=["GET"])
def get_alerts():
    ok, resp, code = db_required()
    if not ok:
        return resp, code

    alerts = list(db.alerts.find({}, {"_id": 0}).sort("createdAt", -1))
    return jsonify(clean_docs(alerts))


@app.route("/api/admin/login-logs", methods=["GET"])
def get_login_logs():
    ok, resp, code = db_required()
    if not ok:
        return resp, code

    logs = list(db.login_logs.find({}, {"_id": 0}).sort("loginAt", -1))
    return jsonify(clean_docs(logs))


@app.route("/api/admin/behavior-sessions", methods=["GET"])
def get_behavior_sessions():
    ok, resp, code = db_required()
    if not ok:
        return resp, code

    sessions = list(db.behavior_sessions.find({}, {"_id": 0}).sort("createdAt", -1))
    return jsonify(clean_docs(sessions))


@app.route("/api/admin/user-details/<username>", methods=["GET"])
def get_user_details(username):
    ok, resp, code = db_required()
    if not ok:
        return resp, code

    summary = get_user_full_summary(username)

    if not summary["user"]:
        return jsonify({"error": "User not found"}), 404

    return jsonify(summary)


@app.route("/api/admin/stats", methods=["GET"])
def get_stats():
    ok, resp, code = db_required()
    if not ok:
        return resp, code

    return jsonify({
        "totalUsers": db.users.count_documents({}),
        "totalReports": db.exam.count_documents({}),
        "totalAlerts": db.alerts.count_documents({}),
        "fraudCount": db.analysis.count_documents({"status": "FRAUD"}),
        "suspiciousCount": db.analysis.count_documents({"status": "SUSPICIOUS"}),
        "genuineCount": db.analysis.count_documents({"status": "GENUINE"}),
        "blockedUsers": db.users.count_documents({"isBlocked": True}),
        "behaviorSessions": db.behavior_sessions.count_documents({})
    })


@app.route("/api/admin/user-report-pdf/<username>", methods=["GET"])
def generate_user_report_pdf(username):
    ok, resp, code = db_required()
    if not ok:
        return resp, code

    summary = get_user_full_summary(username)

    if not summary["user"]:
        return jsonify({"error": "User not found"}), 404

    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    y = height - 50

    def line(text, step=18, bold=False):
        nonlocal y
        if y < 70:
            pdf.showPage()
            y = height - 50
        pdf.setFont("Helvetica-Bold" if bold else "Helvetica", 10 if not bold else 12)
        pdf.drawString(45, y, str(text)[:115])
        y -= step

    user = summary["user"]
    training = summary.get("training", {}) or {}

    pdf.setFont("Helvetica-Bold", 16)
    pdf.drawString(45, y, "Continuous User Authentication Report")
    y -= 30

    line(f"Username: {user.get('username')}", bold=True)
    line(f"Role: {user.get('role')}")
    line(f"Blocked: {user.get('isBlocked', False)}")
    line(f"Created At: {user.get('createdAt')}", 25)

    line(f"Training Status: {training.get('status', 'Not Completed')}")
    line(f"Training Quality: {training.get('qualityScore', 0)}%")
    line(f"Baseline Updated: {training.get('updatedAt', 'N/A')}", 25)

    line("1. Exam Summary", bold=True)
    for r in summary["reports"][:10]:
        line(f"Result: {r.get('result')} | Warnings: {r.get('warnings')} | Time: {r.get('createdAt')}")

    line("2. AI Analysis", bold=True)
    for a in summary["analysis"][:10]:
        line(f"Status: {a.get('status')} | Risk: {a.get('riskScore')} | Similarity: {a.get('similarity')}")
        line(f"Alerts: {', '.join(a.get('alerts', []))}")

    line("3. Behavior Sessions", bold=True)
    for s in summary["sessions"][:10]:
        sm = s.get("summary", {})
        line(
            f"Page: {s.get('page')} | Keys: {sm.get('keys')} | Mouse: {sm.get('mouse')} | "
            f"Clicks: {sm.get('clicks')} | Drags: {sm.get('drags')} | Paste: {sm.get('pasteEvents')}"
        )

    line("4. Alerts", bold=True)
    for a in summary["alerts"][:10]:
        line(f"Type: {a.get('type')} | Risk: {a.get('riskScore')} | Message: {a.get('message')}")

    line("5. Login History", bold=True)
    for l in summary["logins"][:10]:
        line(f"Role: {l.get('role')} | Login: {l.get('loginAt')}")

    pdf.save()
    buffer.seek(0)

    return send_file(
        buffer,
        as_attachment=True,
        download_name=f"{username}_full_report.pdf",
        mimetype="application/pdf"
    )
@app.route("/api/desktop/alert", methods=["POST"])
def desktop_alert():
    ok, resp, code = db_required()
    if not ok:
        return resp, code

    data = request.json or {}

    user_id = data.get("userId")
    alert_type = data.get("type", "DESKTOP_ALERT")
    message = data.get("message", "Desktop alert")
    risk_score = int(data.get("riskScore", 0))

    if not user_id:
        return jsonify({"error": "userId required"}), 400

    save_alert(user_id, alert_type, message, risk_score)

    return jsonify({"message": "Desktop alert saved"})

if __name__ == "__main__":
    app.run(debug=True, port=5000)