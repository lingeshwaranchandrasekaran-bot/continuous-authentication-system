import time
import requests
import pygetwindow as gw
from pynput import keyboard, mouse

API_URL = "http://127.0.0.1:5000/api/behavior/session-save"
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


def get_current_user():
    try:
        res = requests.get(CURRENT_USER_URL, timeout=2)
        data = res.json()

        user_id = data.get("userId", "unknown")
        role = data.get("role", "user")

        return user_id, role
    except Exception:
        return "unknown", "user"


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


def send_session(page="desktop_agent"):
    global events

    username, role = get_current_user()

    if username == "unknown":
        print("⚠️ No website user logged in. Desktop data not sent.")
        return

    try:
        requests.post(API_URL, json={
            "userId": username,
            "role": role,
            "page": page,
            "events": events
        })

        print(f"✅ Desktop behavior sent for {username}")

        events = reset_events()

    except Exception as e:
        print("❌ Backend error:", e)


def on_key_press(key):
    events["keys"].append({
        "key": str(key),
        "type": "down",
        "time": int(time.time() * 1000)
    })


def on_key_release(key):
    events["keys"].append({
        "key": str(key),
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
            title = window.title

            if title != last_window:
                events["focusEvents"].append({
                    "type": "active_window_change",
                    "window": title,
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

while True:
    monitor_window()

    total_events = (
        len(events["keys"]) +
        len(events["mouse"]) +
        len(events["clicks"]) +
        len(events["focusEvents"])
    )

    if total_events > 50:
        send_session()

    time.sleep(5)