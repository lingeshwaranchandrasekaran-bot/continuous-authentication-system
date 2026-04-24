from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from pymongo import MongoClient
from datetime import datetime
from io import BytesIO
import numpy as np
import bcrypt
import torch
import torch.nn as nn
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

app = Flask(__name__)
CORS(app)

# =========================================
# MongoDB Connection
# =========================================
MONGO_URI = "mongodb://localhost:27017/"
DB_NAME = "monitor_system"

client = None
db = None

try:
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=3000)
    client.server_info()
    db = client[DB_NAME]
    print("✅ MongoDB Connected")
except Exception as e:
    print("❌ MongoDB NOT connected:", e)
    db = None


# =========================================
# Helper Functions
# =========================================
def db_required():
    if db is None:
        return False, jsonify({"error": "MongoDB not connected"}), 500
    return True, None, None


def save_alert(user_id, alert_type, message):
    if db is None:
        return

    db.alerts.insert_one({
        "userId": user_id,
        "type": alert_type,
        "message": message,
        "createdAt": datetime.utcnow()
    })


def get_user_full_summary(username):
    reports = list(db.exam.find({"userId": username}, {"_id": 0}).sort("createdAt", -1))
    alerts = list(db.alerts.find({"userId": username}, {"_id": 0}).sort("createdAt", -1))
    analysis = list(db.analysis.find({"userId": username}, {"_id": 0}).sort("createdAt", -1))
    logins = list(db.login_logs.find({"username": username}, {"_id": 0}).sort("loginAt", -1))
    user = db.users.find_one({"username": username}, {"_id": 0, "password": 0})
    training = db.training.find_one({"userId": username}, {"_id": 0})

    return {
        "user": user,
        "reports": reports,
        "alerts": alerts,
        "analysis": analysis,
        "logins": logins,
        "training": training
    }


# =========================================
# MODULE 4 - SIAMESE NEURAL NETWORK
# =========================================
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
        out1 = self.forward_once(x1)
        out2 = self.forward_once(x2)
        return out1, out2


siamese_model = SiameseNetwork(input_size=8)
siamese_model.eval()


def compare_vectors(v1, v2):
    x1 = torch.tensor(v1, dtype=torch.float32)
    x2 = torch.tensor(v2, dtype=torch.float32)

    out1, out2 = siamese_model(x1, x2)
    dist = torch.norm(out1 - out2)
    similarity = 1 / (1 + dist.item())

    return float(similarity)


def classify_user(similarity, mismatch_count, rule_risk):
    if similarity >= 0.68 and mismatch_count <= 1 and rule_risk < 25:
        return "GENUINE"

    if similarity < 0.45 and (mismatch_count >= 3 or rule_risk >= 35):
        return "FRAUD"

    return "SUSPICIOUS"


# =========================================
# MODULE 3 - FEATURE EXTRACTION
# =========================================
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

        if hold_times:
            all_hold_times.extend([float(x) for x in hold_times if x is not None])

        if flight_times:
            all_flight_times.extend([float(x) for x in flight_times if x is not None])

        if mouse_speeds:
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

                if (
                    "x" in prev and "y" in prev and "time" in prev and
                    "x" in curr and "y" in curr and "time" in curr
                ):
                    dx = curr["x"] - prev["x"]
                    dy = curr["y"] - prev["y"]
                    dt = curr["time"] - prev["time"]

                    if dt > 0:
                        speed = np.sqrt(dx * dx + dy * dy) / dt
                        all_mouse_speeds.append(float(speed))

    mean_hold = float(np.mean(all_hold_times)) if all_hold_times else 0.0
    std_hold = float(np.std(all_hold_times)) if all_hold_times else 0.0

    mean_flight = float(np.mean(all_flight_times)) if all_flight_times else 0.0
    std_flight = float(np.std(all_flight_times)) if all_flight_times else 0.0

    mean_mouse_speed = float(np.mean(all_mouse_speeds)) if all_mouse_speeds else 0.0
    std_mouse_speed = float(np.std(all_mouse_speeds)) if all_mouse_speeds else 0.0

    mean_keys = float(np.mean(key_counts)) if key_counts else 0.0
    mean_clicks = float(np.mean(click_counts)) if click_counts else 0.0

    return np.array([
        mean_hold,
        std_hold,
        mean_flight,
        std_flight,
        mean_mouse_speed,
        std_mouse_speed,
        mean_keys,
        mean_clicks
    ], dtype=np.float32)


def compute_training_statistics(samples):
    if not samples:
        return {
            "featureVectors": [],
            "baselineMean": [0.0] * 8,
            "baselineStd": [0.0] * 8
        }

    feature_vectors = []

    for sample in samples:
        vec = extract_features([sample])
        feature_vectors.append(vec)

    matrix = np.vstack(feature_vectors)
    baseline_mean = np.mean(matrix, axis=0)
    baseline_std = np.std(matrix, axis=0)

    return {
        "featureVectors": [vec.tolist() for vec in feature_vectors],
        "baselineMean": baseline_mean.tolist(),
        "baselineStd": baseline_std.tolist()
    }


def rule_based_detection(copy_paste=0, tab_switch=0, warnings=0):
    risk = 0
    alerts = []

    if copy_paste > 0:
        risk += 20
        alerts.append("COPY_PASTE")

    if tab_switch > 0:
        risk += 20
        alerts.append("TAB_SWITCH")

    if warnings > 0:
        risk += min(warnings * 8, 24)
        alerts.append("WARNING_COUNT")

    return risk, alerts


def tolerance_check(base_mean, base_std, curr_vec):
    mismatch_count = 0
    alerts = []

    tolerance = np.maximum(base_std * 2.0, np.array([
        60.0,   # mean_hold
        40.0,   # std_hold
        80.0,   # mean_flight
        60.0,   # std_flight
        0.4,    # mean_mouse_speed
        0.3,    # std_mouse_speed
        8.0,    # mean_keys
        3.0     # mean_clicks
    ], dtype=np.float32))

    feature_names = [
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
            if i in [4, 5, 7]:
                mismatch_count += 0.5
            else:
                mismatch_count += 1
            alerts.append(feature_names[i])

    return float(mismatch_count), alerts


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


# =========================================
# Root
# =========================================
@app.route("/", methods=["GET"])
def home():
    return jsonify({"message": "Monitor System Backend Running"})


# =========================================
# Auth - Register
# =========================================
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

    existing = db.users.find_one({"username": username})
    if existing:
        return jsonify({"error": "User already exists"}), 409

    hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt())

    db.users.insert_one({
        "username": username,
        "password": hashed,
        "role": role,
        "isBlocked": False,
        "createdAt": datetime.utcnow()
    })

    return jsonify({"message": "User created successfully"})


# =========================================
# Admin Create User
# =========================================
@app.route("/api/admin/create-user", methods=["POST"])
def admin_create_user():
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

    existing = db.users.find_one({"username": username})
    if existing:
        return jsonify({"error": "User already exists"}), 409

    hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt())

    db.users.insert_one({
        "username": username,
        "password": hashed,
        "role": role,
        "isBlocked": False,
        "createdAt": datetime.utcnow()
    })

    return jsonify({"message": "User created by admin successfully"})


# =========================================
# Admin Delete User
# =========================================
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

    return jsonify({"message": "User deleted successfully"})


# =========================================
# Admin Reset Training
# =========================================
@app.route("/api/admin/reset-training/<username>", methods=["POST"])
def reset_training(username):
    ok, resp, code = db_required()
    if not ok:
        return resp, code

    db.training.delete_one({"userId": username})
    return jsonify({"message": "Training reset successful"})


# =========================================
# Admin Block / Unblock User
# =========================================
@app.route("/api/admin/block-user/<username>", methods=["POST"])
def block_user(username):
    ok, resp, code = db_required()
    if not ok:
        return resp, code

    result = db.users.update_one(
        {"username": username},
        {"$set": {"isBlocked": True, "blockedAt": datetime.utcnow()}}
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


# =========================================
# Auth - Login
# =========================================
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

    if bcrypt.checkpw(password.encode(), user["password"]):
        has_baseline = db.training.find_one({"userId": username}) is not None

        db.login_logs.insert_one({
            "username": username,
            "role": user.get("role", "user"),
            "loginAt": datetime.utcnow()
        })

        return jsonify({
            "message": "Login success",
            "user": {
                "username": username,
                "role": user.get("role", "user"),
                "hasBaseline": has_baseline
            }
        })

    return jsonify({"error": "Invalid credentials"}), 401


# =========================================
# Training Save Baseline
# =========================================
@app.route("/api/training/save-baseline", methods=["POST"])
def save_training():
    ok, resp, code = db_required()
    if not ok:
        return resp, code

    data = request.json or {}
    user_id = data.get("userId")
    samples = data.get("samples", [])

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
            "updatedAt": datetime.utcnow()
        },
        upsert=True
    )

    return jsonify({"message": "Training saved successfully"})


# =========================================
# Get Baseline
# =========================================
@app.route("/api/training/baseline/<user_id>", methods=["GET"])
def get_baseline(user_id):
    ok, resp, code = db_required()
    if not ok:
        return resp, code

    baseline = db.training.find_one({"userId": user_id}, {"_id": 0})
    if not baseline:
        return jsonify({"error": "No baseline found"}), 404

    return jsonify(baseline)


# =========================================
# Admin Add Sentence
# =========================================
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
        "createdAt": datetime.utcnow()
    })

    return jsonify({"message": "Sentence added successfully"})


# =========================================
# Get Sentences
# =========================================
@app.route("/api/sentences", methods=["GET"])
def get_sentences():
    ok, resp, code = db_required()
    if not ok:
        return resp, code

    sentences = list(db.sentences.find({}, {"_id": 0}).sort("createdAt", -1))
    return jsonify(sentences)


# =========================================
# Behavior Analyze
# =========================================
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

    if not user_id:
        return jsonify({"error": "userId required"}), 400

    baseline = db.training.find_one({"userId": user_id})
    if not baseline:
        return jsonify({"error": "No baseline"}), 404

    current_vec = extract_features(samples)

    baseline_mean = np.array(
        baseline.get("baselineMean", [0.0] * 8),
        dtype=np.float32
    )
    baseline_std = np.array(
        baseline.get("baselineStd", [0.0] * 8),
        dtype=np.float32
    )

    similarity = compare_vectors(baseline_mean, current_vec)

    tolerance_mismatch_count, tolerance_alerts = tolerance_check(
        baseline_mean, baseline_std, current_vec
    )

    ai_score, ai_alerts = ai_risk_from_similarity(similarity)

    rule_score, rule_alerts = rule_based_detection(
        copy_paste=copy_paste,
        tab_switch=tab_switch,
        warnings=warnings
    )

    total_mismatch_count = tolerance_mismatch_count
    if similarity < 0.55:
        total_mismatch_count += 1

    risk = ai_score + rule_score + int(tolerance_mismatch_count * 8)
    alerts = ai_alerts + rule_alerts + tolerance_alerts

    status = classify_user(similarity, total_mismatch_count, rule_score)

    if risk >= 60 and (total_mismatch_count >= 3 or rule_score >= 35):
        status = "FRAUD"
    elif risk >= 25 and status != "FRAUD":
        status = "SUSPICIOUS"

    if status in ["SUSPICIOUS", "FRAUD"]:
        save_alert(
            user_id,
            status,
            f"User {user_id} flagged as {status} with risk score {risk}"
        )

    analysis_doc = {
        "userId": user_id,
        "riskScore": risk,
        "alerts": alerts,
        "similarity": float(similarity),
        "sameUser": bool(similarity >= 0.68),
        "status": status,
        "samples": samples,
        "copyPaste": copy_paste,
        "tabSwitch": tab_switch,
        "warnings": warnings,
        "mismatchCount": float(total_mismatch_count),
        "createdAt": datetime.utcnow()
    }

    db.analysis.insert_one(analysis_doc)

    return jsonify({
        "riskScore": risk,
        "alerts": alerts,
        "similarity": float(similarity),
        "sameUser": bool(similarity >= 0.68),
        "status": status,
        "mismatchCount": float(total_mismatch_count)
    })


# =========================================
# Save Exam Report
# =========================================
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
        "createdAt": datetime.utcnow()
    })

    return jsonify({"message": "Exam report saved"})


# =========================================
# Admin Reports
# =========================================
@app.route("/api/admin/reports", methods=["GET"])
def get_reports():
    ok, resp, code = db_required()
    if not ok:
        return resp, code

    reports = list(db.exam.find({}, {"_id": 0}).sort("createdAt", -1))
    return jsonify(reports)


# =========================================
# Admin Analysis Logs
# =========================================
@app.route("/api/admin/analysis", methods=["GET"])
def get_analysis():
    ok, resp, code = db_required()
    if not ok:
        return resp, code

    logs = list(db.analysis.find({}, {"_id": 0}).sort("createdAt", -1))
    return jsonify(logs)


# =========================================
# Admin Users List
# =========================================
@app.route("/api/admin/users", methods=["GET"])
def get_users():
    ok, resp, code = db_required()
    if not ok:
        return resp, code

    users = list(
        db.users.find({}, {"_id": 0, "password": 0}).sort("createdAt", -1)
    )
    return jsonify(users)


# =========================================
# Admin User Details
# =========================================
@app.route("/api/admin/user-details/<username>", methods=["GET"])
def get_user_details(username):
    ok, resp, code = db_required()
    if not ok:
        return resp, code

    summary = get_user_full_summary(username)

    if not summary["user"]:
        return jsonify({"error": "User not found"}), 404

    return jsonify(summary)


# =========================================
# Admin User Report PDF
# =========================================
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

    def write_line(text, step=18):
        nonlocal y
        if y < 60:
            pdf.showPage()
            y = height - 50
        pdf.drawString(50, y, str(text))
        y -= step

    pdf.setFont("Helvetica-Bold", 16)
    write_line(f"User Report - {username}", 25)

    pdf.setFont("Helvetica", 11)
    user = summary["user"]
    write_line(f"Username: {user.get('username', 'N/A')}")
    write_line(f"Role: {user.get('role', 'N/A')}")
    write_line(f"Blocked: {user.get('isBlocked', False)}")
    write_line(f"Created At: {user.get('createdAt', 'N/A')}", 25)

    write_line("Exam Reports:", 20)
    for r in summary["reports"][:10]:
        write_line(
            f"- Result: {r.get('result')} | Warnings: {r.get('warnings')} | Time: {r.get('createdAt')}"
        )

    write_line("Alerts:", 20)
    for a in summary["alerts"][:10]:
        write_line(
            f"- Type: {a.get('type')} | Message: {a.get('message')} | Time: {a.get('createdAt')}"
        )

    write_line("Analysis Logs:", 20)
    for a in summary["analysis"][:10]:
        write_line(
            f"- Status: {a.get('status')} | Similarity: {a.get('similarity')} | Risk: {a.get('riskScore')}"
        )

    write_line("Login Logs:", 20)
    for l in summary["logins"][:10]:
        write_line(
            f"- Role: {l.get('role')} | Login Time: {l.get('loginAt')}"
        )

    pdf.save()
    buffer.seek(0)

    return send_file(
        buffer,
        as_attachment=True,
        download_name=f"{username}_report.pdf",
        mimetype="application/pdf"
    )


# =========================================
# Admin Alerts
# =========================================
@app.route("/api/admin/alerts", methods=["GET"])
def get_alerts():
    ok, resp, code = db_required()
    if not ok:
        return resp, code

    alerts = list(db.alerts.find({}, {"_id": 0}).sort("createdAt", -1))
    return jsonify(alerts)


# =========================================
# Admin Login Logs
# =========================================
@app.route("/api/admin/login-logs", methods=["GET"])
def get_login_logs():
    ok, resp, code = db_required()
    if not ok:
        return resp, code

    logs = list(db.login_logs.find({}, {"_id": 0}).sort("loginAt", -1))
    return jsonify(logs)


# =========================================
# Dashboard Stats
# =========================================
@app.route("/api/admin/stats", methods=["GET"])
def get_stats():
    ok, resp, code = db_required()
    if not ok:
        return resp, code

    total_users = db.users.count_documents({})
    total_reports = db.exam.count_documents({})
    total_alerts = db.alerts.count_documents({})
    fraud_count = db.analysis.count_documents({"status": "FRAUD"})
    suspicious_count = db.analysis.count_documents({"status": "SUSPICIOUS"})
    genuine_count = db.analysis.count_documents({"status": "GENUINE"})

    return jsonify({
        "totalUsers": total_users,
        "totalReports": total_reports,
        "totalAlerts": total_alerts,
        "fraudCount": fraud_count,
        "suspiciousCount": suspicious_count,
        "genuineCount": genuine_count
    })


# =========================================
# Run App
# =========================================
if __name__ == "__main__":
    app.run(debug=True, port=5000)