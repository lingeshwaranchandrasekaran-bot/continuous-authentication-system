import time
import requests
import pygetwindow as gw
from pynput import keyboard, mouse
import ctypes

API_URL = "http://127.0.0.1:5000/api/desktop/evaluate"
CURRENT_USER_URL = "http://127.0.0.1:5000/api/desktop/current-user"

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
last_activity_time = time.time()
session_start_time = time.time()

mouse_down_pos = None


def lock_windows():
    try:
        ctypes.windll.user32.LockWorkStation()
        print("🔒 Windows Locked")
    except Exception as e:
        print("Lock failed:", e)


def get_logged_user():
    try:
        res = requests.get(CURRENT_USER_URL, timeout=5)
        data = res.json()

        user_id = data.get("userId", "unknown")
        role = data.get("role", "user")

        return user_id, role
    except:
        return "unknown", "user"


def reset_events():
    global events

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


def meaningful_activity():
    total = (
        len(events["keys"]) +
        len(events["mouse"]) +
        len(events["clicks"]) +
        len(events["scrolls"]) +
        len(events["focusEvents"])
    )

    return total >= 40


def is_idle():
    return (time.time() - last_activity_time) > 120


def send_session(page="desktop_monitor"):
    global last_activity_time

    user_id, role = get_logged_user()

    if not user_id or user_id == "unknown":
        print("⚠️ No website user logged in")
        reset_events()
        return

    if not meaningful_activity():
        print("⚠️ Not enough behavior data")
        return

    if is_idle():
        print("⚠️ User idle, skipping send")
        reset_events()
        return

    try:
        res = requests.post(
            API_URL,
            json={
                "userId": user_id,
                "role": role,
                "page": page,
                "events": events
            },
            timeout=10
        )

        data = res.json()

        if not res.ok:
            print("❌ Backend rejected:", data)
            return

        status = data.get("status", "UNKNOWN")
        risk = data.get("riskScore", 0)
        warning = data.get("warningCount", 0)
        lock_required = data.get("lockRequired", False)

        print(
            f"✅ Sent | {user_id} | {status} | Risk: {risk} | Warning: {warning}/3"
        )

        if lock_required:
            print("🚨 Auto lock triggered")
            lock_windows()

        reset_events()

    except Exception as e:
        print("❌ Backend error:", e)


def touch_activity():
    global last_activity_time
    last_activity_time = time.time()


def on_key_press(key):
    touch_activity()

    events["keys"].append({
        "key": str(key),
        "type": "down",
        "time": int(time.time() * 1000)
    })


def on_key_release(key):
    touch_activity()

    events["keys"].append({
        "key": str(key),
        "type": "up",
        "time": int(time.time() * 1000)
    })


def on_move(x, y):
    touch_activity()

    events["mouse"].append({
        "type": "move",
        "x": x,
        "y": y,
        "time": int(time.time() * 1000)
    })


def on_click(x, y, button, pressed):
    global mouse_down_pos

    touch_activity()

    if pressed:
        mouse_down_pos = (x, y)

        events["clicks"].append({
            "type": "click",
            "x": x,
            "y": y,
            "button": str(button),
            "time": int(time.time() * 1000)
        })

    else:
        if mouse_down_pos:
            dx = abs(x - mouse_down_pos[0])
            dy = abs(y - mouse_down_pos[1])

            if dx > 20 or dy > 20:
                events["drags"].append({
                    "startX": mouse_down_pos[0],
                    "startY": mouse_down_pos[1],
                    "endX": x,
                    "endY": y,
                    "time": int(time.time() * 1000)
                })

        mouse_down_pos = None


def on_scroll(x, y, dx, dy):
    touch_activity()

    events["scrolls"].append({
        "type": "scroll",
        "x": x,
        "y": y,
        "dx": dx,
        "dy": dy,
        "time": int(time.time() * 1000)
    })


def monitor_window():
    global last_window

    try:
        window = gw.getActiveWindow()

        if window:
            title = window.title.strip()

            if title and title != last_window:
                events["focusEvents"].append({
                    "type": "window_change",
                    "window": title,
                    "time": int(time.time() * 1000)
                })

                print("🪟 Active Window:", title)
                last_window = title

    except:
        pass


keyboard_listener = keyboard.Listener(
    on_press=on_key_press,
    on_release=on_key_release
)

mouse_listener = mouse.Listener(
    on_move=on_move,
    on_click=on_click,
    on_scroll=on_scroll
)

keyboard_listener.start()
mouse_listener.start()

print("✅ Smart Desktop Agent Running...")

while True:
    monitor_window()

    # first 10 sec ignore
    if (time.time() - session_start_time) < 10:
        time.sleep(3)
        continue

    # send every 30 sec
    if (time.time() - session_start_time) % 30 < 3:
        send_session()

    time.sleep(3)