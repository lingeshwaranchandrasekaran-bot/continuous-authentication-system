import time
import ctypes
import requests
import pygetwindow as gw
from pynput import keyboard, mouse

API_BASE = "http://127.0.0.1:5000"
SESSION_SAVE_URL = f"{API_BASE}/api/behavior/session-save"
CURRENT_USER_URL = f"{API_BASE}/api/desktop/current-user"
ALERT_URL = f"{API_BASE}/api/desktop/alert"

WARNING_LIMIT = 3
SEND_LIMIT = 60

events = {
    "keys": [],
    "mouse": [],
    "clicks": [],
    "scrolls": [],
    "drags": [],
    "files": [],
    "focusEvents": [],
    "pasteEvents": [],
    "tabSwitches": []
}

last_window = None
warning_count = 0
last_warning_time = 0


def reset_events():
    return {
        "keys": [],
        "mouse": [],
        "clicks": [],
        "scrolls": [],
        "drags": [],
        "files": [],
        "focusEvents": [],
        "pasteEvents": [],
        "tabSwitches": []
    }


def get_current_user():
    try:
        res = requests.get(CURRENT_USER_URL, timeout=2)
        data = res.json()
        return data.get("userId", "unknown"), data.get("role", "user")
    except Exception:
        return "unknown", "user"


def lock_windows():
    print("🔒 3 warnings reached. Locking Windows...")
    ctypes.windll.user32.LockWorkStation()


def send_admin_alert(user_id, alert_type, message, risk_score=0):
    try:
        requests.post(
            ALERT_URL,
            json={
                "userId": user_id,
                "type": alert_type,
                "message": message,
                "riskScore": risk_score
            },
            timeout=3
        )
    except Exception as e:
        print("❌ Alert send failed:", e)


def calculate_desktop_risk():
    risk = 0
    reasons = []

    key_count = len(events["keys"])
    mouse_count = len(events["mouse"])
    click_count = len(events["clicks"])
    focus_count = len(events["focusEvents"])

    if focus_count >= 5:
        risk += 25
        reasons.append("FREQUENT_APP_SWITCHING")

    if key_count > 200:
        risk += 15
        reasons.append("HIGH_TYPING_ACTIVITY")

    if mouse_count > 500:
        risk += 10
        reasons.append("HIGH_MOUSE_ACTIVITY")

    if click_count > 80:
        risk += 10
        reasons.append("HIGH_CLICK_ACTIVITY")

    return risk, reasons


def handle_warning(user_id, risk, reasons):
    global warning_count, last_warning_time

    now = time.time()

    # Avoid repeated warning every second
    if now - last_warning_time < 10:
        return

    warning_count += 1
    last_warning_time = now

    message = f"Desktop warning {warning_count}/3 | Risk: {risk} | Reasons: {', '.join(reasons)}"

    print("⚠️", message)

    send_admin_alert(
        user_id=user_id,
        alert_type="DESKTOP_WARNING",
        message=message,
        risk_score=risk
    )

    if warning_count >= WARNING_LIMIT:
        send_admin_alert(
            user_id=user_id,
            alert_type="DESKTOP_AUTO_LOCK",
            message="User reached 3 desktop behavior warnings. Windows locked automatically.",
            risk_score=risk
        )
        lock_windows()


def send_session(page="desktop_agent"):
    global events

    user_id, role = get_current_user()

    if user_id == "unknown":
        print("⚠️ No website user logged in. Desktop data not sent.")
        events = reset_events()
        return

    risk, reasons = calculate_desktop_risk()

    try:
        requests.post(
            SESSION_SAVE_URL,
            json={
                "userId": user_id,
                "role": role,
                "page": page,
                "events": events,
                "desktopRisk": risk,
                "desktopReasons": reasons
            },
            timeout=5
        )

        print(f"✅ Desktop behavior sent for {user_id} | Risk: {risk}")

        if risk >= 30:
            handle_warning(user_id, risk, reasons)

        events = reset_events()

    except Exception as e:
        print("❌ Backend error:", e)


def on_key_press(key):
    events["keys"].append({
        "key": "KEY_PRESSED",
        "type": "down",
        "time": int(time.time() * 1000)
    })


def on_key_release(key):
    events["keys"].append({
        "key": "KEY_RELEASED",
        "type": "up",
        "time": int(time.time() * 1000)
    })


def on_move(x, y):
    events["mouse"].append({
        "type": "move",
        "x": x,
        "y": y,
        "time": int(time.time() * 1000)
    })


def on_click(x, y, button, pressed):
    if pressed:
        events["clicks"].append({
            "type": "click",
            "x": x,
            "y": y,
            "button": str(button),
            "time": int(time.time() * 1000)
        })


def monitor_window():
    global last_window

    try:
        window = gw.getActiveWindow()

        if window:
            title = window.title or "Unknown Window"

            if title != last_window:
                events["focusEvents"].append({
                    "type": "active_window_change",
                    "window": title[:100],
                    "time": int(time.time() * 1000)
                })

                last_window = title
    except Exception:
        pass


keyboard_listener = keyboard.Listener(
    on_press=on_key_press,
    on_release=on_key_release
)

mouse_listener = mouse.Listener(
    on_move=on_move,
    on_click=on_click
)

keyboard_listener.start()
mouse_listener.start()

print("✅ Desktop Agent Running...")
print("✅ Monitoring Word / Excel / Notepad / Browser / VS Code / Desktop usage")
print("⚠️ 3 warnings = Windows auto lock")

while True:
    monitor_window()

    total_events = (
        len(events["keys"]) +
        len(events["mouse"]) +
        len(events["clicks"]) +
        len(events["focusEvents"])
    )

    if total_events >= SEND_LIMIT:
        send_session()

    time.sleep(5)