from flask import Flask, request, jsonify, send_file, redirect
from flask_cors import CORS
from pymongo import MongoClient
from datetime import datetime, timezone
from io import BytesIO
import os
import re
import base64
from urllib.parse import urlencode
from pathlib import Path

try:
    from authlib.integrations.flask_client import OAuth
except Exception:
    OAuth = None
import numpy as np
import bcrypt
import torch
import torch.nn as nn
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "change-this-secret-key")

CORS(
    app,
    resources={r"/api/*": {"origins": os.environ.get("FRONTEND_URL", "*")}},
    supports_credentials=True,
)

MONGO_URI = os.environ.get(
    "MONGO_URI",
    "mongodb+srv://Monitor:monitor12345@cluster0.4dytkvk.mongodb.net/?appName=Cluster0"
)
DB_NAME = os.environ.get("DB_NAME", "monitor_system")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000").rstrip("/")
FEATURE_SIZE = 12

GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.environ.get(
    "GOOGLE_REDIRECT_URI",
    "https://continuous-authentication-system.onrender.com/api/auth/google/callback"
)

oauth = None
google = None

if OAuth and GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET:
    oauth = OAuth(app)
    google = oauth.register(
        name="google",
        client_id=GOOGLE_CLIENT_ID,
        client_secret=GOOGLE_CLIENT_SECRET,
        server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
        client_kwargs={"scope": "openid email profile"},
    )
else:
    print("⚠️ Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.")

client = None
db = None
current_desktop_user = {"userId": "unknown", "role": "user"}
EVIDENCE_DIR = Path("evidence_screenshots")
EVIDENCE_DIR.mkdir(exist_ok=True)

try:
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=3000)
    client.server_info()
    db = client[DB_NAME]
    print("✅ MongoDB Connected")

    try:
        db.users.create_index("username")
        db.training.create_index("userId")
        db.analysis.create_index([("userId", 1), ("createdAt", -1)])
        db.alerts.create_index([("userId", 1), ("createdAt", -1)])
        db.exam.create_index([("userId", 1), ("createdAt", -1)])
        db.login_logs.create_index([("username", 1), ("loginAt", -1)])
        db.behavior_sessions.create_index([("userId", 1), ("createdAt", -1)])
        db.user_decision_state.create_index("userId")
        db.evidence.create_index([("userId", 1), ("createdAt", -1)])
        print("✅ MongoDB indexes ready")
    except Exception as index_error:
        print("⚠️ Index creation error:", index_error)

except Exception as e:
    print("❌ MongoDB NOT connected:", e)
    db = None


def now_utc():
    return datetime.now(timezone.utc)


def db_required():
    if db is None:
        return False, jsonify({"error": "MongoDB not connected"}), 500
    return True, None, None


def normalize_email(value):
    return str(value or "").strip().lower()


def is_valid_email(value):
    value = normalize_email(value)
    return re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]+$", value) is not None


def safe_redirect_to_frontend(path, params=None):
    params = params or {}
    query = urlencode(params)
    if query:
        return f"{FRONTEND_URL}{path}?{query}"
    return f"{FRONTEND_URL}{path}"


def public_user_payload(user, baseline_exists=None):
    real_username = user.get("username", "")
    role = str(user.get("role", "user")).lower()

    if baseline_exists is None:
        baseline_exists = db.training.find_one({
            "userId": {"$regex": f"^{re.escape(real_username)}$", "$options": "i"}
        }) is not None

    return {
        "username": real_username,
        "email": user.get("email", real_username),
        "name": user.get("name", real_username),
        "picture": user.get("picture", ""),
        "role": role,
        "hasBaseline": bool(baseline_exists),
        "requiresTraining": False if role == "admin" else not bool(baseline_exists),
        "redirectPath": "/admin" if role == "admin" else "/user"
    }


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
    if not doc:
        return None
    return {k: clean_value(v) for k, v in doc.items()}


def clean_docs(docs):
    return [clean_doc(d) for d in docs]


def normalize_vector(vec, size=FEATURE_SIZE):
    if vec is None:
        vec = []

    if isinstance(vec, np.ndarray):
        vec = vec.tolist()

    vec = list(vec)

    clean = []
    for x in vec:
        try:
            clean.append(float(x))
        except Exception:
            clean.append(0.0)

    if len(clean) < size:
        clean += [0.0] * (size - len(clean))

    return np.array(clean[:size], dtype=np.float32)


def save_alert(user_id, alert_type, message, risk_score=0):
    if db is None:
        return

    db.alerts.insert_one({
        "userId": user_id,
        "type": alert_type,
        "message": message,
        "riskScore": int(risk_score),
        "status": "unread",
        "createdAt": now_utc()
    })


def threat_level_from_risk(risk):
    risk = int(risk or 0)
    if risk >= 80:
        return "CRITICAL"
    if risk >= 60:
        return "HIGH"
    if risk >= 35:
        return "MEDIUM"
    return "LOW"


class SiameseNetwork(nn.Module):
    def __init__(self, input_size=FEATURE_SIZE):
        super(SiameseNetwork, self).__init__()
        self.fc = nn.Sequential(
            nn.Linear(input_size, 32),
            nn.ReLU(),
            nn.Linear(32, 16),
            nn.ReLU(),
            nn.Linear(16, 8)
        )

    def forward_once(self, x):
        return self.fc(x)

    def forward(self, x1, x2):
        return self.forward_once(x1), self.forward_once(x2)


siamese_model = SiameseNetwork(input_size=FEATURE_SIZE)
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
    x1 = torch.tensor(normalize_vector(v1), dtype=torch.float32).unsqueeze(0)
    x2 = torch.tensor(normalize_vector(v2), dtype=torch.float32).unsqueeze(0)

    with torch.no_grad():
        out1, out2 = siamese_model(x1, x2)
        dist = torch.norm(out1 - out2, dim=1).item()

    return float(1 / (1 + dist))


def extract_features(data):
    if not data:
        return np.array([0.0] * FEATURE_SIZE, dtype=np.float32)

    hold_times = []
    flight_times = []
    mouse_speeds = []
    click_intervals = []
    pause_times = []

    key_counts = []
    click_counts = []
    mouse_counts = []

    backspace_count = 0
    paste_count = 0
    focus_count = 0
    tab_switch_count = 0
    drag_count = 0

    first_time = None
    last_time = None

    for d in data:
        if not isinstance(d, dict):
            continue

        # Support both frontend formats: keys/keyEvents, mouse/mouseEvents, clicks/clickEvents
        keys = d.get("keys", d.get("keyEvents", [])) or []
        mouse_events = d.get("mouse", d.get("mouseEvents", [])) or []
        clicks = d.get("clicks", d.get("clickEvents", [])) or []
        scrolls = d.get("scrolls", d.get("scrollEvents", [])) or []
        focus_events = d.get("focusEvents", []) or []
        paste_events = d.get("pasteEvents", []) or []
        tab_switches = d.get("tabSwitches", []) or []
        drags = d.get("drags", d.get("dragEvents", [])) or []

        key_counts.append(len(keys))
        click_counts.append(len(clicks))
        mouse_counts.append(len(mouse_events))

        paste_count += len(paste_events)
        focus_count += len(focus_events)
        tab_switch_count += len(tab_switches)
        drag_count += len(drags)

        hold_times.extend([float(x) for x in d.get("holdTimes", []) if x is not None])
        flight_times.extend([float(x) for x in d.get("flightTimes", []) if x is not None])
        mouse_speeds.extend([float(x) for x in d.get("mouseSpeeds", []) if x is not None])

        key_down_map = {}
        key_times = []

        for k in keys:
            if not isinstance(k, dict):
                continue

            key_name = str(k.get("key", k.get("code", ""))).lower()
            key_type = str(k.get("type", "")).lower()
            t = k.get("time")

            if "backspace" in key_name:
                backspace_count += 1

            if t is not None:
                try:
                    t = float(t)
                    key_times.append(t)
                    first_time = t if first_time is None else min(first_time, t)
                    last_time = t if last_time is None else max(last_time, t)
                except Exception:
                    t = None

            if key_type in ["down", "keydown"]:
                key_down_map[key_name] = t
            elif key_type in ["up", "keyup"] and key_name in key_down_map and t is not None:
                down_time = key_down_map.get(key_name)
                if down_time is not None:
                    hold = t - down_time
                    if 0 < hold < 3000:
                        hold_times.append(float(hold))

        if len(key_times) > 1:
            diffs = np.diff(sorted(key_times))
            for x in diffs:
                if 0 < x < 3000:
                    flight_times.append(float(x))
                if x >= 1200:
                    pause_times.append(float(x))

        for ev in mouse_events + clicks + scrolls + focus_events + paste_events + tab_switches + drags:
            if not isinstance(ev, dict):
                continue
            t = ev.get("time") or ev.get("startTime") or ev.get("endTime")
            if t is not None:
                try:
                    t = float(t)
                    first_time = t if first_time is None else min(first_time, t)
                    last_time = t if last_time is None else max(last_time, t)
                except Exception:
                    pass

        if len(mouse_events) > 1:
            for i in range(1, len(mouse_events)):
                prev = mouse_events[i - 1]
                curr = mouse_events[i]
                if not isinstance(prev, dict) or not isinstance(curr, dict):
                    continue
                if all(k in prev for k in ["x", "y", "time"]) and all(k in curr for k in ["x", "y", "time"]):
                    try:
                        dx = float(curr["x"]) - float(prev["x"])
                        dy = float(curr["y"]) - float(prev["y"])
                        dt = float(curr["time"]) - float(prev["time"])
                        if dt > 0:
                            mouse_speeds.append(float(np.sqrt(dx * dx + dy * dy) / dt))
                    except Exception:
                        pass

        if len(clicks) > 1:
            click_times = []
            for c in clicks:
                if isinstance(c, dict) and c.get("time") is not None:
                    try:
                        click_times.append(float(c.get("time")))
                    except Exception:
                        pass
            if len(click_times) > 1:
                diffs = np.diff(sorted(click_times))
                click_intervals.extend([float(x) for x in diffs if x > 0])

    session_seconds = 0.0
    if first_time is not None and last_time is not None and last_time > first_time:
        session_seconds = (last_time - first_time) / 1000.0

    total_keys = sum(key_counts)
    typing_speed = total_keys / session_seconds if session_seconds > 0 else 0.0
    mouse_activity = sum(mouse_counts) / session_seconds if session_seconds > 0 else 0.0
    error_rate = backspace_count / total_keys if total_keys > 0 else 0.0

    return np.array([
        float(np.mean(hold_times)) if hold_times else 0.0,
        float(np.std(hold_times)) if hold_times else 0.0,
        float(np.mean(flight_times)) if flight_times else 0.0,
        float(np.std(flight_times)) if flight_times else 0.0,
        float(np.mean(mouse_speeds)) if mouse_speeds else 0.0,
        float(np.std(mouse_speeds)) if mouse_speeds else 0.0,
        float(np.mean(key_counts)) if key_counts else 0.0,
        float(np.mean(click_counts)) if click_counts else 0.0,
        float(typing_speed),
        float(backspace_count),
        float(focus_count),
        float(np.mean(click_intervals)) if click_intervals else 0.0,
        float(paste_count),
        float(tab_switch_count),
        float(error_rate),
        float(mouse_activity),
    ], dtype=np.float32)

def compute_training_statistics(samples):
    feature_vectors = []

    for sample in samples:
        raw = sample.get("rawEvents") if isinstance(sample, dict) else None
        if raw:
            feature_vectors.append(extract_features([raw]))
        else:
            feature_vectors.append(extract_features([sample]))

    if not feature_vectors:
        return {
            "featureVectors": [],
            "baselineMean": [0.0] * FEATURE_SIZE,
            "baselineStd": [0.0] * FEATURE_SIZE,
            "personalThreshold": 0.62
        }

    matrix = np.vstack(feature_vectors)
    baseline_mean = np.mean(matrix, axis=0)
    baseline_std = np.std(matrix, axis=0)

    consistency = float(np.mean(baseline_std[:8]))

    if consistency < 15:
        threshold = 0.66
    elif consistency < 45:
        threshold = 0.62
    else:
        threshold = 0.58

    return {
        "featureVectors": [normalize_vector(vec).tolist() for vec in feature_vectors],
        "baselineMean": baseline_mean.tolist(),
        "baselineStd": baseline_std.tolist(),
        "personalThreshold": threshold
    }

def tolerance_check(base_mean, base_std, curr_vec):
    mismatch_count = 0.0
    alerts = []

    min_tolerance = np.array([
        70, 50, 90, 70, 0.7, 0.5, 18, 8,
        4, 8, 5, 900, 1, 1, 0.12, 3
    ], dtype=np.float32)

    tolerance = np.maximum(base_std * 2.2, min_tolerance)

    names = [
        "HOLD_TIME_CHANGED",
        "HOLD_VARIANCE_CHANGED",
        "FLIGHT_TIME_CHANGED",
        "FLIGHT_VARIANCE_CHANGED",
        "MOUSE_SPEED_CHANGED",
        "MOUSE_VARIANCE_CHANGED",
        "KEY_ACTIVITY_CHANGED",
        "CLICK_ACTIVITY_CHANGED",
        "TYPING_SPEED_CHANGED",
        "BACKSPACE_PATTERN_CHANGED",
        "APP_SWITCH_PATTERN_CHANGED",
        "CLICK_INTERVAL_CHANGED",
        "PASTE_PATTERN_CHANGED",
        "TAB_SWITCH_PATTERN_CHANGED",
        "ERROR_RATE_CHANGED",
        "MOUSE_ACTIVITY_CHANGED",
    ]

    weights = [1, 0.7, 1, 0.7, 0.6, 0.5, 1, 0.7, 1, 0.8, 1, 0.5, 1.2, 1.2, 0.8, 0.6]

    diffs = np.abs(curr_vec - base_mean)

    for i in range(len(diffs)):
        if diffs[i] > tolerance[i]:
            mismatch_count += weights[i]
            alerts.append(names[i])

    return float(round(mismatch_count, 2)), alerts

def desktop_rule_detection(events):
    keys = len(events.get("keys", []))
    mouse_moves = len(events.get("mouse", []))
    clicks = len(events.get("clicks", []))
    focus = len(events.get("focusEvents", []))
    paste = len(events.get("pasteEvents", []))

    risk = 0
    reasons = []

    if focus >= 6:
        risk += 20
        reasons.append("FREQUENT_APP_SWITCHING")

    if keys >= 250:
        risk += 15
        reasons.append("HIGH_TYPING_ACTIVITY")

    if mouse_moves >= 800:
        risk += 10
        reasons.append("HIGH_MOUSE_ACTIVITY")

    if clicks >= 100:
        risk += 10
        reasons.append("HIGH_CLICK_ACTIVITY")

    if paste > 3:
        risk += 15
        reasons.append("PASTE_ACTIVITY")

    return min(risk, 100), reasons


def rule_based_detection(copy_paste=0, tab_switch=0, warnings=0, focus_lost=0, drag_count=0):
    risk = 0
    alerts = []

    if copy_paste >= 1:
        risk += min(copy_paste * 12, 30)
        alerts.append("COPY_PASTE")

    if tab_switch >= 1:
        risk += min(tab_switch * 12, 35)
        alerts.append("TAB_SWITCH")

    if focus_lost >= 2:
        risk += min(focus_lost * 8, 25)
        alerts.append("WINDOW_FOCUS_LOST")

    if warnings >= 2:
        risk += min(warnings * 8, 30)
        alerts.append("WARNING_COUNT")

    if drag_count > 10:
        risk += 8
        alerts.append("EXCESSIVE_DRAG_ACTIVITY")

    return min(risk, 100), alerts

def ai_risk_from_similarity(similarity, threshold):
    risk = 0
    alerts = []

    gap = threshold - similarity

    if gap > 0:
        risk += int(min(gap * 120, 35))
        alerts.append("AI_SIMILARITY_LOW")

    if gap > 0.12:
        risk += 12
        alerts.append("AI_SIMILARITY_VERY_LOW")

    if gap > 0.22:
        risk += 18
        alerts.append("AI_SIMILARITY_CRITICAL")

    return min(risk, 100), alerts

def classify_user(similarity, mismatch_count, rule_risk, threshold):
    if similarity >= threshold and mismatch_count <= 2.5 and rule_risk < 25:
        return "GENUINE"

    if similarity < threshold - 0.22 or mismatch_count >= 6 or rule_risk >= 55:
        return "FRAUD"

    return "SUSPICIOUS"

def smoothed_status(user_id, current_status, current_risk):
    recent = list(
        db.analysis.find(
            {"userId": {"$regex": f"^{user_id}$", "$options": "i"}},
            {"_id": 0, "riskScore": 1, "status": 1}
        ).sort("createdAt", -1).limit(4)
    )

    risks = [int(x.get("riskScore", 0)) for x in recent]
    risks.append(int(current_risk))

    avg_risk = int(np.mean(risks)) if risks else int(current_risk)

    statuses = [x.get("status") for x in recent] + [current_status]
    fraud_count = statuses.count("FRAUD")
    suspicious_count = statuses.count("SUSPICIOUS")

    if fraud_count >= 2 or avg_risk >= 75:
        return "FRAUD", avg_risk

    if suspicious_count >= 2 or avg_risk >= 40:
        return "SUSPICIOUS", avg_risk

    return "GENUINE", avg_risk

def update_user_decision_state(user_id, status, risk):
    state = db.user_decision_state.find_one({"userId": user_id}) or {
        "userId": user_id,
        "warningCount": 0,
        "lastStatuses": []
    }

    last_statuses = state.get("lastStatuses", [])
    last_statuses.append({
        "status": status,
        "risk": int(risk),
        "time": now_utc()
    })
    last_statuses = last_statuses[-5:]

    suspicious_or_fraud = sum(1 for x in last_statuses if x["status"] in ["SUSPICIOUS", "FRAUD"])
    fraud_count = sum(1 for x in last_statuses if x["status"] == "FRAUD")

    warning_count = int(state.get("warningCount", 0))
    warning_triggered = False
    lock_required = False

    if suspicious_or_fraud >= 5 or fraud_count >= 3 or risk >= 90:
        warning_count += 1
        warning_triggered = True

    if warning_count >= 5:
        lock_required = True

    db.user_decision_state.update_one(
        {"userId": user_id},
        {
            "$set": {
                "userId": user_id,
                "warningCount": warning_count,
                "lastStatuses": last_statuses,
                "updatedAt": now_utc()
            }
        },
        upsert=True
    )

    return {
        "warningCount": warning_count,
        "warningTriggered": warning_triggered,
        "lockRequired": lock_required,
        "lastStatuses": clean_value(last_statuses)
    }


def save_behavior_session_doc(user_id, role, page, events, desktop_risk=0, desktop_reasons=None):
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
        "desktopRisk": int(desktop_risk),
        "desktopReasons": desktop_reasons or [],
        "createdAt": now_utc()
    })

    return summary, feature_vec


def get_user_full_summary(username):
    user = db.users.find_one({"username": username}, {"_id": 0, "password": 0})

    if not user:
        user = db.users.find_one(
            {"username": {"$regex": f"^{username}$", "$options": "i"}},
            {"_id": 0, "password": 0}
        )

    if not user:
        return {
            "user": None,
            "training": {},
            "decisionState": {},
            "reports": [],
            "alerts": [],
            "analysis": [],
            "logins": [],
            "sessions": []
        }

    real_username = user.get("username", username)
    user_filter = {"userId": {"$regex": f"^{real_username}$", "$options": "i"}}
    login_filter = {"username": {"$regex": f"^{real_username}$", "$options": "i"}}

    training = db.training.find_one(user_filter, {"_id": 0}) or {}
    decision_state = db.user_decision_state.find_one(user_filter, {"_id": 0}) or {}

    return clean_doc({
        "user": user,
        "training": training,
        "decisionState": decision_state,
        "reports": list(db.exam.find(user_filter, {"_id": 0}).sort("createdAt", -1).limit(30)),
        "alerts": list(db.alerts.find(user_filter, {"_id": 0}).sort("createdAt", -1).limit(30)),
        "analysis": list(db.analysis.find(user_filter, {"_id": 0}).sort("createdAt", -1).limit(30)),
        "logins": list(db.login_logs.find(login_filter, {"_id": 0}).sort("loginAt", -1).limit(30)),
        "sessions": list(db.behavior_sessions.find(user_filter, {"_id": 0}).sort("createdAt", -1).limit(30))
    })


@app.route("/", methods=["GET"])
def home():
    return jsonify({"message": "Monitor System Backend Running"})


@app.route("/api/desktop/set-user", methods=["POST"])
def set_desktop_user():
    data = request.json or {}
    current_desktop_user["userId"] = data.get("userId", "unknown")
    current_desktop_user["role"] = data.get("role", "user")
    return jsonify({"message": "Desktop user updated", "user": current_desktop_user})


@app.route("/api/desktop/current-user", methods=["GET"])
def get_desktop_user():
    return jsonify(current_desktop_user)


@app.route("/api/desktop/clear-user", methods=["POST"])
def clear_desktop_user():
    current_desktop_user["userId"] = "unknown"
    current_desktop_user["role"] = "user"
    return jsonify({"message": "Desktop user cleared"})


@app.route("/api/desktop/alert", methods=["POST"])
def desktop_alert():
    ok, resp, code = db_required()
    if not ok:
        return resp, code

    data = request.json or {}
    user_id = data.get("userId")

    if not user_id:
        return jsonify({"error": "userId required"}), 400

    save_alert(
        user_id,
        data.get("type", "DESKTOP_ALERT"),
        data.get("message", "Desktop alert"),
        int(data.get("riskScore", 0))
    )

    return jsonify({"message": "Desktop alert saved"})




@app.route("/api/desktop/evidence", methods=["POST"])
def save_desktop_evidence():
    ok, resp, code = db_required()
    if not ok:
        return resp, code

    data = request.json or {}
    user_id = data.get("userId")
    screenshot_base64 = data.get("screenshotBase64")

    if not user_id:
        return jsonify({"error": "userId required"}), 400

    if not screenshot_base64:
        return jsonify({"error": "screenshotBase64 required"}), 400

    risk_score = int(data.get("riskScore", 0))
    reason = data.get("reason", "Suspicious behavior evidence")
    threat = threat_level_from_risk(risk_score)

    filename = f"{user_id}_{int(datetime.now().timestamp())}.jpg"
    file_path = EVIDENCE_DIR / filename

    try:
        image_bytes = base64.b64decode(screenshot_base64)
        file_path.write_bytes(image_bytes)
    except Exception as e:
        return jsonify({"error": f"Screenshot save failed: {str(e)}"}), 500

    db.evidence.insert_one({
        "userId": user_id,
        "reason": reason,
        "riskScore": risk_score,
        "threatLevel": threat,
        "screenshotPath": str(file_path),
        "createdAt": now_utc()
    })

    save_alert(
        user_id,
        "SCREENSHOT_EVIDENCE",
        f"{threat} evidence captured: {reason}",
        risk_score
    )

    return jsonify({
        "message": "Evidence saved",
        "threatLevel": threat,
        "filename": filename
    })


@app.route("/api/desktop/evaluate", methods=["POST"])
def desktop_evaluate():
    ok, resp, code = db_required()
    if not ok:
        return resp, code

    data = request.json or {}
    user_id = data.get("userId")
    role = data.get("role", "user")
    page = data.get("page", "desktop_agent")
    events = data.get("events", {})

    if not user_id or user_id == "unknown":
        return jsonify({"error": "No logged desktop user"}), 400

    desktop_rule_risk, desktop_reasons = desktop_rule_detection(events)
    summary, feature_vec = save_behavior_session_doc(
        user_id,
        role,
        page,
        events,
        desktop_rule_risk,
        desktop_reasons
    )

    baseline = db.training.find_one(
        {"userId": {"$regex": f"^{user_id}$", "$options": "i"}}
    )

    if not baseline:
        return jsonify({
            "status": "NO_BASELINE",
            "riskScore": desktop_rule_risk,
            "warningCount": 0,
            "lockRequired": False,
            "message": "Training baseline required",
            "summary": summary
        })

    current_vec = normalize_vector(feature_vec)
    base_mean = normalize_vector(baseline.get("baselineMean", [0.0] * FEATURE_SIZE))
    base_std = normalize_vector(baseline.get("baselineStd", [0.0] * FEATURE_SIZE))
    threshold = float(baseline.get("personalThreshold", 0.60))

    similarity = compare_vectors(base_mean, current_vec)
    mismatch_count, tolerance_alerts = tolerance_check(base_mean, base_std, current_vec)
    ai_score, ai_alerts = ai_risk_from_similarity(similarity, threshold)

    risk = min(ai_score + desktop_rule_risk + int(mismatch_count * 5), 100)
    status = classify_user(similarity, mismatch_count, desktop_rule_risk, threshold)
    alerts = ai_alerts + tolerance_alerts + desktop_reasons

    if risk >= 90:
        status = "FRAUD"
    elif risk >= 45 and status != "FRAUD":
        status = "SUSPICIOUS"

    decision = update_user_decision_state(user_id, status, risk)

    db.analysis.insert_one({
        "userId": user_id,
        "riskScore": risk,
        "alerts": alerts,
        "similarity": float(similarity),
        "sameUser": bool(similarity >= threshold),
        "status": status,
        "samples": [events],
        "featureVector": current_vec.tolist(),
        "mismatchCount": float(mismatch_count),
        "source": "desktop_agent",
        "warningCount": decision["warningCount"],
        "createdAt": now_utc()
    })

    if decision["warningTriggered"]:
        save_alert(
            user_id,
            "DESKTOP_WARNING",
            f"Desktop warning {decision['warningCount']}/5 | Risk {risk} | Status {status}",
            risk
        )

    if decision["lockRequired"]:
        save_alert(
            user_id,
            "DESKTOP_AUTO_LOCK",
            "User reached 5 desktop warnings. Windows lock required.",
            risk
        )

    return jsonify({
        "status": status,
        "riskScore": risk,
        "similarity": float(similarity),
        "alerts": alerts,
        "mismatchCount": float(mismatch_count),
        "warningCount": decision["warningCount"],
        "warningTriggered": decision["warningTriggered"],
        "lockRequired": decision["lockRequired"],
        "summary": summary
    })


@app.route("/api/auth/register", methods=["POST"])
def register():
    ok, resp, code = db_required()
    if not ok:
        return resp, code

    data = request.json or {}

    # Frontend can send either email or username. For external project, email is used as username.
    email = normalize_email(data.get("email") or data.get("username"))
    username = normalize_email(data.get("username") or email)
    password = str(data.get("password", ""))

    # Public signup must create normal user only.
    # Admin account should be created manually in DB or through protected admin workflow.
    role = "user"

    if not username or not password:
        return jsonify({"error": "Email ID and password required"}), 400

    if not is_valid_email(username):
        return jsonify({"error": "Please enter a valid email id"}), 400

    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    if db.users.find_one({
        "$or": [
            {"username": {"$regex": f"^{re.escape(username)}$", "$options": "i"}},
            {"email": {"$regex": f"^{re.escape(email)}$", "$options": "i"}}
        ]
    }):
        return jsonify({"error": "Account already exists. Please login."}), 409

    hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    db.users.insert_one({
        "username": username,
        "email": email,
        "password": hashed,
        "authProvider": "password",
        "role": role,
        "isBlocked": False,
        "hasBaseline": False,
        "createdAt": now_utc()
    })

    return jsonify({"message": "Account created successfully. Please login."}), 201


@app.route("/api/auth/login", methods=["POST"])
def login():
    ok, resp, code = db_required()
    if not ok:
        return resp, code

    data = request.json or {}
    username = normalize_email(data.get("username") or data.get("email"))
    password = str(data.get("password", "")).strip()

    if not username or not password:
        return jsonify({"error": "Email ID and password required"}), 400

    user = db.users.find_one({
        "$or": [
            {"username": {"$regex": f"^{re.escape(username)}$", "$options": "i"}},
            {"email": {"$regex": f"^{re.escape(username)}$", "$options": "i"}}
        ]
    })

    if not user:
        return jsonify({"error": "Invalid email id or password"}), 401

    if user.get("isBlocked", False):
        return jsonify({"error": "Your account has been blocked by admin"}), 403

    if user.get("authProvider") == "google" and not user.get("password"):
        return jsonify({"error": "This account uses Google login. Please continue with Google."}), 401

    stored_password = user.get("password", "")
    password_ok = False

    try:
        stored_bytes = (
            stored_password.encode("utf-8")
            if isinstance(stored_password, str)
            else stored_password
        )
        password_ok = bcrypt.checkpw(password.encode("utf-8"), stored_bytes)
    except Exception:
        password_ok = stored_password == password

    if not password_ok:
        return jsonify({"error": "Invalid email id or password"}), 401

    real_username = user.get("username", username)
    role = str(user.get("role", "user")).lower()

    baseline_exists = db.training.find_one({
        "userId": {"$regex": f"^{re.escape(real_username)}$", "$options": "i"}
    }) is not None

    db.users.update_one(
        {"username": {"$regex": f"^{re.escape(real_username)}$", "$options": "i"}},
        {"$set": {"hasBaseline": baseline_exists, "lastLoginAt": now_utc()}}
    )

    db.login_logs.insert_one({
        "username": real_username,
        "email": user.get("email", real_username),
        "role": role,
        "authProvider": user.get("authProvider", "password"),
        "loginAt": now_utc()
    })

    return jsonify({
        "message": "Login success",
        "user": public_user_payload(user, baseline_exists)
    })


@app.route("/api/auth/google", methods=["GET"])
def google_login():
    ok, resp, code = db_required()
    if not ok:
        return resp, code

    if google is None:
        return jsonify({
            "error": "Google login not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Render environment variables."
        }), 500

    return google.authorize_redirect(GOOGLE_REDIRECT_URI)


@app.route("/api/auth/google/callback", methods=["GET"])
def google_callback():
    ok, resp, code = db_required()
    if not ok:
        return resp, code

    if google is None:
        return jsonify({"error": "Google login not configured"}), 500

    try:
        token = google.authorize_access_token()
        info = token.get("userinfo")

        if not info:
            info = google.parse_id_token(token)

        email = normalize_email(info.get("email"))
        name = info.get("name", email)
        picture = info.get("picture", "")

        if not email:
            return jsonify({"error": "Google account email not received"}), 400

        user = db.users.find_one({
            "$or": [
                {"username": {"$regex": f"^{re.escape(email)}$", "$options": "i"}},
                {"email": {"$regex": f"^{re.escape(email)}$", "$options": "i"}}
            ]
        })

        if user and user.get("isBlocked", False):
            return redirect(safe_redirect_to_frontend("/login", {
                "error": "Your account has been blocked by admin"
            }))

        if not user:
            # Google login creates only normal user. Admin must be manually created in DB.
            new_user = {
                "username": email,
                "email": email,
                "name": name,
                "picture": picture,
                "password": "",
                "authProvider": "google",
                "role": "user",
                "isBlocked": False,
                "hasBaseline": False,
                "createdAt": now_utc(),
                "lastLoginAt": now_utc()
            }
            db.users.insert_one(new_user)
            user = new_user
        else:
            # Keep existing admin role if email already belongs to admin.
            db.users.update_one(
                {"_id": user["_id"]},
                {
                    "$set": {
                        "email": email,
                        "name": name,
                        "picture": picture,
                        "lastLoginAt": now_utc()
                    },
                    "$setOnInsert": {"authProvider": "google"}
                }
            )
            user = db.users.find_one({"_id": user["_id"]})

        real_username = user.get("username", email)
        role = str(user.get("role", "user")).lower()

        baseline_exists = db.training.find_one({
            "userId": {"$regex": f"^{re.escape(real_username)}$", "$options": "i"}
        }) is not None

        db.users.update_one(
            {"username": {"$regex": f"^{re.escape(real_username)}$", "$options": "i"}},
            {"$set": {"hasBaseline": baseline_exists}}
        )

        db.login_logs.insert_one({
            "username": real_username,
            "email": email,
            "role": role,
            "authProvider": "google",
            "loginAt": now_utc()
        })

        # Frontend should create /google-success route and store these values in localStorage.
        return redirect(safe_redirect_to_frontend("/google-success", {
            "username": real_username,
            "email": email,
            "role": role,
            "hasBaseline": "true" if baseline_exists else "false",
            "redirectPath": "/admin" if role == "admin" else "/user"
        }))

    except Exception as e:
        print("GOOGLE LOGIN ERROR:", str(e))
        return redirect(safe_redirect_to_frontend("/login", {
            "error": "Google login failed. Please try again."
        }))


@app.route("/api/admin/create-user", methods=["POST"])
def admin_create_user():
    return register()


@app.route("/api/admin/delete-user/<username>", methods=["DELETE"])
def delete_user(username):
    ok, resp, code = db_required()
    if not ok:
        return resp, code

    user = db.users.find_one({"username": {"$regex": f"^{username}$", "$options": "i"}})
    real_username = user.get("username", username) if user else username
    user_filter = {"userId": {"$regex": f"^{real_username}$", "$options": "i"}}
    login_filter = {"username": {"$regex": f"^{real_username}$", "$options": "i"}}

    db.users.delete_many({"username": {"$regex": f"^{real_username}$", "$options": "i"}})
    db.training.delete_many(user_filter)
    db.exam.delete_many(user_filter)
    db.analysis.delete_many(user_filter)
    db.alerts.delete_many(user_filter)
    db.login_logs.delete_many(login_filter)
    db.behavior_sessions.delete_many(user_filter)
    db.user_decision_state.delete_many(user_filter)

    return jsonify({"message": "User deleted successfully"})


@app.route("/api/admin/block-user/<username>", methods=["POST"])
def block_user(username):
    ok, resp, code = db_required()
    if not ok:
        return resp, code

    result = db.users.update_one(
        {"username": {"$regex": f"^{username}$", "$options": "i"}},
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
        {"username": {"$regex": f"^{username}$", "$options": "i"}},
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

    user = db.users.find_one({
        "username": {"$regex": f"^{username}$", "$options": "i"}
    })

    real_username = user.get("username", username) if user else username

    user_filter = {
        "userId": {"$regex": f"^{real_username}$", "$options": "i"}
    }

    db.training.delete_many(user_filter)
    db.user_decision_state.delete_many(user_filter)

    db.users.update_one(
        {"username": {"$regex": f"^{real_username}$", "$options": "i"}},
        {
            "$set": {
                "hasBaseline": False,
                "trainingResetAt": now_utc()
            },
            "$unset": {
                "trainingCompletedAt": ""
            }
        }
    )

    save_alert(
        real_username,
        "TRAINING_RESET",
        f"Admin reset training baseline for {real_username}",
        0
    )

    return jsonify({
        "message": "Training reset successful",
        "hasBaseline": False
    })


@app.route("/api/admin/reset-warnings/<username>", methods=["POST"])
def reset_warnings(username):
    ok, resp, code = db_required()
    if not ok:
        return resp, code

    user_filter = {"userId": {"$regex": f"^{username}$", "$options": "i"}}
    db.user_decision_state.update_one(
        user_filter,
        {"$set": {"userId": username, "warningCount": 0, "lastStatuses": [], "updatedAt": now_utc()}},
        upsert=True
    )

    save_alert(username, "WARNING_RESET", f"Admin reset warning count for {username}")
    return jsonify({"message": "Warnings reset successful"})


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

    total_keys = 0
    for sample in samples:
        raw = sample.get("rawEvents", sample) if isinstance(sample, dict) else {}
        total_keys += len(raw.get("keys", raw.get("keyEvents", [])))

    if quality_score < 80:
        return jsonify({"error": "Training quality too low. Please complete training properly."}), 400

    stats = compute_training_statistics(samples)

    db.training.replace_one(
        {"userId": {"$regex": f"^{user_id}$", "$options": "i"}},
        {
            "userId": user_id,
            "data": samples,
            "featureVectors": stats["featureVectors"],
            "baselineMean": stats["baselineMean"],
            "baselineStd": stats["baselineStd"],
            "personalThreshold": stats["personalThreshold"],
            "qualityScore": quality_score,
            "status": "COMPLETED",
            "updatedAt": now_utc()
        },
        upsert=True
    )

    db.users.update_one(
        {"username": {"$regex": f"^{user_id}$", "$options": "i"}},
        {
            "$set": {
                "hasBaseline": True,
                "trainingCompletedAt": now_utc()
            },
            "$unset": {
                "trainingResetAt": ""
            }
        }
    )

    db.user_decision_state.update_one(
        {"userId": {"$regex": f"^{user_id}$", "$options": "i"}},
        {"$set": {"userId": user_id, "warningCount": 0, "lastStatuses": [], "updatedAt": now_utc()}},
        upsert=True
    )

    save_alert(user_id, "TRAINING_COMPLETED", f"Training completed with quality score {quality_score}%", quality_score)

    return jsonify({"message": "Training saved successfully", "qualityScore": quality_score, "stats": stats})


@app.route("/api/training/baseline/<user_id>", methods=["GET"])
def get_baseline(user_id):
    ok, resp, code = db_required()
    if not ok:
        return resp, code

    baseline = db.training.find_one({"userId": {"$regex": f"^{user_id}$", "$options": "i"}}, {"_id": 0})
    if not baseline:
        return jsonify({"error": "No baseline found"}), 404

    return jsonify(clean_doc(baseline))


@app.route("/api/admin/add-sentence", methods=["POST"])
def add_sentence():
    ok, resp, code = db_required()
    if not ok:
        return resp, code

    sentence = (request.json or {}).get("sentence", "").strip()
    if not sentence:
        return jsonify({"error": "Sentence required"}), 400

    db.sentences.insert_one({"sentence": sentence, "createdAt": now_utc()})
    return jsonify({"message": "Sentence added successfully"})


@app.route("/api/sentences", methods=["GET"])
def get_sentences():
    ok, resp, code = db_required()
    if not ok:
        return resp, code

    return jsonify(clean_docs(list(db.sentences.find({}, {"_id": 0}).sort("createdAt", -1).limit(100))))


@app.route("/api/behavior/analyze", methods=["POST"])
def analyze():
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

    baseline = db.training.find_one({
        "userId": {"$regex": f"^{user_id}$", "$options": "i"}
    })

    if not baseline:
        return jsonify({"error": "No baseline"}), 404

    current_vec = extract_features(samples)
    base_mean = normalize_vector(baseline.get("baselineMean"))
    base_std = normalize_vector(baseline.get("baselineStd"))
    threshold = float(baseline.get("personalThreshold", 0.62))

    copy_paste = int(data.get("copyPaste", 0))
    tab_switch = int(data.get("tabSwitch", 0))
    warnings = int(data.get("warnings", 0))
    focus_lost = int(data.get("focusLost", 0))
    drag_count = int(data.get("dragCount", 0))

    similarity = compare_vectors(base_mean, current_vec)
    mismatch_count, tolerance_alerts = tolerance_check(base_mean, base_std, current_vec)
    ai_score, ai_alerts = ai_risk_from_similarity(similarity, threshold)
    rule_score, rule_alerts = rule_based_detection(
        copy_paste, tab_switch, warnings, focus_lost, drag_count
    )

    ai_component = ai_score * 0.45
    mismatch_component = min(mismatch_count * 7, 35)
    rule_component = rule_score * 0.45

    raw_risk = int(min(ai_component + mismatch_component + rule_component, 100))
    raw_status = classify_user(similarity, mismatch_count, rule_score, threshold)

    status, risk = smoothed_status(user_id, raw_status, raw_risk)

    alerts = list(dict.fromkeys(ai_alerts + rule_alerts + tolerance_alerts))
    decision = update_user_decision_state(user_id, status, risk)

    if status in ["SUSPICIOUS", "FRAUD"]:
        save_alert(
            user_id,
            status,
            f"User {user_id} flagged as {status} | Risk {risk} | Similarity {round(similarity, 3)}",
            risk
        )

    db.analysis.insert_one({
        "userId": user_id,
        "riskScore": int(risk),
        "rawRiskScore": int(raw_risk),
        "alerts": alerts,
        "similarity": float(similarity),
        "threshold": float(threshold),
        "sameUser": bool(similarity >= threshold),
        "status": status,
        "rawStatus": raw_status,
        "samples": samples,
        "featureVector": current_vec.tolist(),
        "baselineMean": base_mean.tolist(),
        "copyPaste": copy_paste,
        "tabSwitch": tab_switch,
        "warnings": warnings,
        "focusLost": focus_lost,
        "dragCount": drag_count,
        "mismatchCount": float(mismatch_count),
        "aiScore": int(ai_score),
        "ruleScore": int(rule_score),
        "warningCount": decision["warningCount"],
        "source": "exam_or_training",
        "createdAt": now_utc()
    })

    return jsonify({
        "riskScore": int(risk),
        "rawRiskScore": int(raw_risk),
        "alerts": alerts,
        "similarity": float(similarity),
        "threshold": float(threshold),
        "sameUser": bool(similarity >= threshold),
        "status": status,
        "rawStatus": raw_status,
        "mismatchCount": float(mismatch_count),
        "aiScore": int(ai_score),
        "ruleScore": int(rule_score),
        "warningCount": decision["warningCount"],
        "lockRequired": decision["lockRequired"]
    })

@app.route("/api/behavior/session-save", methods=["POST"])
def save_behavior_session():
    ok, resp, code = db_required()
    if not ok:
        return resp, code

    data = request.json or {}
    user_id = data.get("userId")

    if not user_id:
        return jsonify({"error": "userId required"}), 400

    summary, feature_vec = save_behavior_session_doc(
        user_id,
        data.get("role", "user"),
        data.get("page", "unknown"),
        data.get("events", {}),
        int(data.get("desktopRisk", 0)),
        data.get("desktopReasons", [])
    )

    return jsonify({"message": "Behavior session saved", "summary": summary, "featureVector": feature_vec})


@app.route("/api/exam/save", methods=["POST"])
def save_exam():
    ok, resp, code = db_required()
    if not ok:
        return resp, code

    data = request.json or {}
    user_id = data.get("userId")

    if not user_id:
        return jsonify({"error": "userId required"}), 400

    total_questions = int(data.get("totalQuestions", 0))
    correct_answers = int(data.get("correctAnswers", 0))
    wrong_answers = int(data.get("wrongAnswers", 0))
    unanswered = int(data.get("unanswered", 0))
    warnings = int(data.get("warnings", 0))

    score_percent = 0
    if total_questions > 0:
        score_percent = round((correct_answers / total_questions) * 100, 2)

    if score_percent >= 80 and warnings <= 2:
        result = "PASS"
    elif score_percent >= 50:
        result = "REVIEW"
    else:
        result = "FAIL"

    if warnings >= 5:
        result = "SUSPICIOUS"

    exam_doc = {
        "userId": user_id,
        "totalQuestions": total_questions,
        "correctAnswers": correct_answers,
        "wrongAnswers": wrong_answers,
        "unanswered": unanswered,
        "scorePercent": score_percent,
        "warnings": warnings,
        "result": result,
        "answers": data.get("answers", []),
        "warningDetails": data.get("warningDetails", []),
        "behaviorSummary": data.get("behaviorSummary", {}),
        "startedAt": data.get("startedAt"),
        "submittedAt": now_utc(),
        "createdAt": now_utc()
    }

    db.exam.insert_one(exam_doc)

    if warnings > 0 or result in ["SUSPICIOUS", "FAIL"]:
        save_alert(
            user_id,
            "EXAM_ALERT",
            f"Exam result: {result}, Score: {score_percent}%, Warnings: {warnings}",
            warnings
        )

    return jsonify({
        "message": "Exam saved successfully",
        "scorePercent": score_percent,
        "result": result,
        "correctAnswers": correct_answers,
        "wrongAnswers": wrong_answers,
        "unanswered": unanswered,
        "warnings": warnings
    })


@app.route("/api/exam/results/<username>", methods=["GET"])
def get_user_exam_results(username):
    ok, resp, code = db_required()
    if not ok:
        return resp, code

    results = list(
        db.exam.find(
            {"userId": {"$regex": f"^{username}$", "$options": "i"}},
            {"_id": 0}
        ).sort("createdAt", -1)
    )

    return jsonify(clean_docs(results))


@app.route("/api/admin/exam-results", methods=["GET"])
def admin_exam_results():
    ok, resp, code = db_required()
    if not ok:
        return resp, code

    username = request.args.get("username", "").strip()
    result = request.args.get("result", "").strip()
    date = request.args.get("date", "").strip()

    query = {}

    if username:
        query["userId"] = {"$regex": username, "$options": "i"}

    if result:
        query["result"] = result

    docs = list(db.exam.find(query, {"_id": 0}).sort("createdAt", -1))

    if date:
        docs = [
            d for d in docs
            if d.get("createdAt") and d.get("createdAt").date().isoformat() == date
        ]

    return jsonify(clean_docs(docs))


@app.route("/api/admin/users", methods=["GET"])
def get_users():
    ok, resp, code = db_required()
    if not ok:
        return resp, code

    return jsonify(clean_docs(list(db.users.find({}, {"_id": 0, "password": 0}).sort("createdAt", -1).limit(200))))


@app.route("/api/admin/reports", methods=["GET"])
def get_reports():
    ok, resp, code = db_required()
    if not ok:
        return resp, code

    return jsonify(clean_docs(list(db.exam.find({}, {"_id": 0}).sort("createdAt", -1).limit(100))))


@app.route("/api/admin/analysis", methods=["GET"])
def get_analysis():
    ok, resp, code = db_required()
    if not ok:
        return resp, code

    return jsonify(clean_docs(list(db.analysis.find({}, {"_id": 0}).sort("createdAt", -1).limit(100))))


@app.route("/api/admin/alerts", methods=["GET"])
def get_alerts():
    ok, resp, code = db_required()
    if not ok:
        return resp, code

    return jsonify(clean_docs(list(db.alerts.find({}, {"_id": 0}).sort("createdAt", -1).limit(100))))


@app.route("/api/admin/login-logs", methods=["GET"])
def get_login_logs():
    ok, resp, code = db_required()
    if not ok:
        return resp, code

    return jsonify(clean_docs(list(db.login_logs.find({}, {"_id": 0}).sort("loginAt", -1).limit(100))))


@app.route("/api/admin/user-details/<username>", methods=["GET"])
def get_user_details(username):
    ok, resp, code = db_required()
    if not ok:
        return resp, code

    try:
        summary = get_user_full_summary(username)

        if not summary.get("user"):
            return jsonify({"error": "User not found"}), 404

        return jsonify(summary)

    except Exception as e:
        print("USER DETAILS ERROR:", str(e))
        return jsonify({"error": str(e)}), 500


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
    state = summary.get("decisionState", {}) or {}

    pdf.setFont("Helvetica-Bold", 16)
    pdf.drawString(45, y, "Continuous User Authentication Report")
    y -= 30

    line(f"Username: {user.get('username')}", bold=True)
    line(f"Role: {user.get('role')}")
    line(f"Blocked: {user.get('isBlocked', False)}")
    line(f"Training Status: {training.get('status', 'Not Completed')}")
    line(f"Training Quality: {training.get('qualityScore', 0)}%")
    line(f"Personal Threshold: {training.get('personalThreshold', 0.60)}")
    line(f"Warning Count: {state.get('warningCount', 0)}", 25)

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
        line(f"Page: {s.get('page')} | Keys: {sm.get('keys')} | Mouse: {sm.get('mouse')} | Clicks: {sm.get('clicks')} | Risk: {s.get('desktopRisk', 0)}")

    line("4. Alerts", bold=True)
    for a in summary["alerts"][:10]:
        line(f"Type: {a.get('type')} | Risk: {a.get('riskScore')} | Message: {a.get('message')}")

    pdf.save()
    buffer.seek(0)

    return send_file(
        buffer,
        as_attachment=True,
        download_name=f"{username}_full_report.pdf",
        mimetype="application/pdf"
    )




@app.route("/api/admin/evidence", methods=["GET"])
def get_all_evidence():
    ok, resp, code = db_required()
    if not ok:
        return resp, code

    docs = list(
        db.evidence.find({}, {"_id": 0})
        .sort("createdAt", -1)
        .limit(100)
    )

    return jsonify(clean_docs(docs))


@app.route("/api/admin/evidence/<username>", methods=["GET"])
def get_user_evidence(username):
    ok, resp, code = db_required()
    if not ok:
        return resp, code

    docs = list(
        db.evidence.find(
            {"userId": {"$regex": f"^{username}$", "$options": "i"}},
            {"_id": 0}
        )
        .sort("createdAt", -1)
        .limit(50)
    )

    return jsonify(clean_docs(docs))


@app.route("/api/admin/threat-summary", methods=["GET"])
def threat_summary():
    ok, resp, code = db_required()
    if not ok:
        return resp, code

    critical = db.evidence.count_documents({"threatLevel": "CRITICAL"})
    high = db.evidence.count_documents({"threatLevel": "HIGH"})
    medium = db.evidence.count_documents({"threatLevel": "MEDIUM"})
    low = db.evidence.count_documents({"threatLevel": "LOW"})

    recent_alerts = list(
        db.alerts.find({}, {"_id": 0})
        .sort("createdAt", -1)
        .limit(10)
    )

    return jsonify({
        "critical": critical,
        "high": high,
        "medium": medium,
        "low": low,
        "recentAlerts": clean_docs(recent_alerts)
    })
@app.route("/api/admin/user-analytics/<username>", methods=["GET"])
def user_analytics(username):
    ok, resp, code = db_required()
    if not ok:
        return resp, code

    user_filter = {"userId": {"$regex": f"^{username}$", "$options": "i"}}

    analysis_docs = list(
        db.analysis.find(user_filter, {"_id": 0})
        .sort("createdAt", -1)
        .limit(20)
    )

    alert_docs = list(
        db.alerts.find(user_filter, {"_id": 0})
        .sort("createdAt", -1)
        .limit(50)
    )

    session_docs = list(
        db.behavior_sessions.find(user_filter, {"_id": 0})
        .sort("createdAt", -1)
        .limit(20)
    )

    risk_trend = []
    similarity_trend = []

    for a in reversed(analysis_docs):
        risk_trend.append({
            "time": clean_value(a.get("createdAt")),
            "value": a.get("riskScore", 0),
            "status": a.get("status", "N/A")
        })

        similarity_trend.append({
            "time": clean_value(a.get("createdAt")),
            "value": round(float(a.get("similarity", 0)) * 100, 2)
            if a.get("similarity") is not None else 0
        })

    warning_count = {}
    for a in alert_docs:
        t = a.get("type", "UNKNOWN")
        warning_count[t] = warning_count.get(t, 0) + 1

    total_keys = total_mouse = total_clicks = total_sessions = 0

    for s in session_docs:
        sm = s.get("summary", {})
        total_keys += sm.get("keys", 0)
        total_mouse += sm.get("mouse", 0)
        total_clicks += sm.get("clicks", 0)
        total_sessions += 1

    metrics = {
        "sessions": total_sessions,
        "avgKeys": round(total_keys / total_sessions, 2) if total_sessions else 0,
        "avgMouse": round(total_mouse / total_sessions, 2) if total_sessions else 0,
        "avgClicks": round(total_clicks / total_sessions, 2) if total_sessions else 0,
        "latestRisk": analysis_docs[0].get("riskScore", 0) if analysis_docs else 0,
        "latestStatus": analysis_docs[0].get("status", "NO DATA") if analysis_docs else "NO DATA",
        "latestSimilarity": round(float(analysis_docs[0].get("similarity", 0)) * 100, 2)
        if analysis_docs and analysis_docs[0].get("similarity") is not None else 0
    }

    timeline = []

    for a in alert_docs[:10]:
        timeline.append({
            "type": "Alert",
            "title": a.get("type", "ALERT"),
            "message": a.get("message", ""),
            "time": clean_value(a.get("createdAt"))
        })

    for a in analysis_docs[:10]:
        timeline.append({
            "type": "Analysis",
            "title": a.get("status", "N/A"),
            "message": f"Risk {a.get('riskScore', 0)}",
            "time": clean_value(a.get("createdAt"))
        })

    return jsonify({
        "metrics": metrics,
        "riskTrend": risk_trend,
        "similarityTrend": similarity_trend,
        "warnings": warning_count,
        "timeline": timeline
    })


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))
