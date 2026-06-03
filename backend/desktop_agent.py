
import time
import requests
import pygetwindow as gw
from pynput import keyboard, mouse
import ctypes
import base64
from io import BytesIO

try:
    from PIL import ImageGrab
except Exception:
    ImageGrab = None

API_BASE = "https://continuous-authentication-system.onrender.com"
API_EVALUATE = f"{API_BASE}/api/desktop/evaluate"
API_CURRENT_USER = f"{API_BASE}/api/desktop/current-user"
API_EVIDENCE = f"{API_BASE}/api/desktop/evidence"

SEND_INTERVAL = 30
MIN_EVENTS = 35
IDLE_LIMIT = 120
MOUSE_THROTTLE_MS = 80

SUSPICIOUS_APPS = [
    "anydesk", "teamviewer", "ultraviewer", "chrome remote desktop",
    "remote desktop", "obs", "screen recorder", "zoom", "meet",
    "telegram", "whatsapp", "chatgpt", "gemini", "copilot"
]

events = {
    "keys": [], "mouse": [], "clicks": [], "scrolls": [],
    "drags": [], "files": [], "focusEvents": [],
    "pasteEvents": [], "tabSwitches": []
}

last_window = None
last_activity_time = time.time()
last_send_time = time.time()
last_mouse_time_ms = 0
mouse_down_pos = None


def now_ms():
    return int(time.time() * 1000)


def lock_windows():
    try:
        ctypes.windll.user32.LockWorkStation()
        print("Windows locked")
    except Exception as e:
        print("Lock failed:", e)


def get_logged_user():
    try:
        res = requests.get(API_CURRENT_USER, timeout=5)
        data = res.json()
        return data.get("userId", "unknown"), data.get("role", "user")
    except Exception:
        return "unknown", "user"


def reset_events():
    global events
    events = {
        "keys": [], "mouse": [], "clicks": [], "scrolls": [],
        "drags": [], "files": [], "focusEvents": [],
        "pasteEvents": [], "tabSwitches": []
    }


def event_count():
    return (
        len(events["keys"]) + len(events["mouse"]) + len(events["clicks"]) +
        len(events["scrolls"]) + len(events["drags"]) +
        len(events["focusEvents"]) + len(events["pasteEvents"]) +
        len(events["tabSwitches"])
    )


def is_idle():
    return time.time() - last_activity_time > IDLE_LIMIT


def touch_activity():
    global last_activity_time
    last_activity_time = time.time()


def capture_screenshot_base64():
    if ImageGrab is None:
        return None
    try:
        image = ImageGrab.grab()
        image.thumbnail((1280, 720))
        buffer = BytesIO()
        image.save(buffer, format="JPEG", quality=65)
        return base64.b64encode(buffer.getvalue()).decode("utf-8")
    except Exception as e:
        print("Screenshot failed:", e)
        return None


def send_evidence(user_id, reason, risk_score):
    screenshot = capture_screenshot_base64()
    if not screenshot:
        return

    try:
        requests.post(
            API_EVIDENCE,
            json={
                "userId": user_id,
                "reason": reason,
                "riskScore": risk_score,
                "screenshotBase64": screenshot,
                "createdAt": now_ms(),
            },
            timeout=15,
        )
        print("Evidence screenshot saved")
    except Exception as e:
        print("Evidence upload failed:", e)


def detect_suspicious_window(title):
    title_lower = title.lower()
    matched = [app for app in SUSPICIOUS_APPS if app in title_lower]
    if matched:
        events["focusEvents"].append({
            "type": "suspicious_window",
            "window": title[:180],
            "matched": matched,
            "time": now_ms(),
        })


def monitor_window():
    global last_window
    try:
        win = gw.getActiveWindow()
        if not win:
            return
        title = (win.title or "").strip()
        if not title:
            return
        if title != last_window:
            events["focusEvents"].append({
                "type": "window_change",
                "window": title[:180],
                "time": now_ms(),
            })
            detect_suspicious_window(title)
            print("Active Window:", title[:80])
            last_window = title
    except Exception:
        pass


def send_session():
    global last_send_time

    user_id, role = get_logged_user()

    if not user_id or user_id == "unknown":
        print("No desktop user logged in")
        reset_events()
        return

    if is_idle():
        print("User idle, skipping")
        reset_events()
        return

    if event_count() < MIN_EVENTS:
        print("Not enough data:", event_count())
        return

    try:
        res = requests.post(
            API_EVALUATE,
            json={
                "userId": user_id,
                "role": role,
                "page": "desktop_monitor",
                "events": events,
            },
            timeout=15,
        )

        data = res.json()

        if not res.ok:
            print("Backend rejected:", data)
            return

        status = data.get("status", "UNKNOWN")
        risk = int(data.get("riskScore", 0))
        warning = int(data.get("warningCount", 0))
        lock_required = bool(data.get("lockRequired", False))

        print(f"Sent | {user_id} | {status} | Risk {risk} | Warning {warning}/5")

        if risk >= 70 or status in ["FRAUD", "SUSPICIOUS"]:
            send_evidence(user_id, f"{status} desktop behavior detected", risk)

        if lock_required:
            send_evidence(user_id, "AUTO_LOCK_TRIGGERED", risk)
            lock_windows()

        reset_events()
        last_send_time = time.time()

    except Exception as e:
        print("Backend error:", e)


def on_key_press(key):
    touch_activity()
    key_text = str(key).lower()
    events["keys"].append({"key": key_text, "type": "down", "time": now_ms()})
    if "ctrl" in key_text:
        events["focusEvents"].append({"type": "ctrl_key_used", "key": key_text, "time": now_ms()})


def on_key_release(key):
    touch_activity()
    events["keys"].append({"key": str(key).lower(), "type": "up", "time": now_ms()})


def on_move(x, y):
    global last_mouse_time_ms
    touch_activity()
    current = now_ms()
    if current - last_mouse_time_ms < MOUSE_THROTTLE_MS:
        return
    last_mouse_time_ms = current
    events["mouse"].append({"type": "move", "x": int(x), "y": int(y), "time": current})


def on_click(x, y, button, pressed):
    global mouse_down_pos
    touch_activity()

    if pressed:
        mouse_down_pos = (x, y, now_ms())
        events["clicks"].append({
            "type": "click", "x": int(x), "y": int(y),
            "button": str(button), "time": now_ms()
        })
    else:
        if mouse_down_pos:
            dx = abs(x - mouse_down_pos[0])
            dy = abs(y - mouse_down_pos[1])
            if dx > 20 or dy > 20:
                events["drags"].append({
                    "type": "drag",
                    "startX": int(mouse_down_pos[0]),
                    "startY": int(mouse_down_pos[1]),
                    "endX": int(x),
                    "endY": int(y),
                    "startTime": mouse_down_pos[2],
                    "endTime": now_ms(),
                })
        mouse_down_pos = None


def on_scroll(x, y, dx, dy):
    touch_activity()
    events["scrolls"].append({
        "type": "scroll", "x": int(x), "y": int(y),
        "dx": int(dx), "dy": int(dy), "time": now_ms()
    })


keyboard_listener = keyboard.Listener(on_press=on_key_press, on_release=on_key_release)
mouse_listener = mouse.Listener(on_move=on_move, on_click=on_click, on_scroll=on_scroll)

keyboard_listener.start()
mouse_listener.start()

print("Professional Desktop Agent Running")
print("Efficient mouse throttle enabled")
print("Suspicious app/window detection enabled")
print("Screenshot evidence enabled")

while True:
    monitor_window()
    if time.time() - last_send_time >= SEND_INTERVAL:
        send_session()
    time.sleep(2)
