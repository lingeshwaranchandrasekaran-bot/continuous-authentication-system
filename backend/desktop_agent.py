import time
import ctypes
import requests
import pygetwindow as gw
from pynput import keyboard, mouse

API_BASE = "http://127.0.0.1:5000"
CURRENT_USER_URL = f"{API_BASE}/api/desktop/current-user"
DESKTOP_EVALUATE_URL = f"{API_BASE}/api/desktop/evaluate"

SEND_LIMIT = 60
SEND_INTERVAL_SECONDS = 10

events = {}
last_window = None
last_send_time = time.time()


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


events = reset_events()


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


def send_session(page="desktop_agent"):
    global events, last_send_time

    user_id, role = get_current_user()

    if user_id == "unknown":
        print("⚠️ No website/desktop user logged in. Desktop data not sent.")
        events = reset_events()
        last_send_time = time.time()
        return

    try:
        res = requests.post(
            DESKTOP_EVALUATE_URL,
            json={
                "userId": user_id,
                "role": role,
                "page": page,
                "events": events
            },
            timeout=5
        )

        data = res.json()

        if not res.ok:
            print("❌ Desktop evaluate error:", data)
            events = reset_events()
            return

        print(
            f"✅ Desktop behavior sent for {user_id} | "
            f"Status: {data.get('status')} | "
            f"Risk: {data.get('riskScore')} | "
            f"Warning: {data.get('warningCount')}/3"
        )

        if data.get("warningTriggered"):
            print("⚠️ Desktop warning triggered:", data.get("alerts", []))

        if data.get("lockRequired"):
            lock_windows()

        events = reset_events()
        last_send_time = time.time()

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


def on_scroll(x, y, dx, dy):
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
            title = window.title or "Unknown Window"

            if title != last_window:
                events["focusEvents"].append({
                    "type": "active_window_change",
                    "window": title[:120],
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
    on_click=on_click,
    on_scroll=on_scroll
)

keyboard_listener.start()
mouse_listener.start()

print("✅ Desktop Agent Running...")
print("✅ Privacy-safe mode: actual typed text is NOT stored")
print("✅ Monitoring Word / Excel / Notepad / Browser / VS Code / Desktop usage")
print("⚠️ 3 warnings = Windows auto lock")

while True:
    monitor_window()

    total_events = (
        len(events["keys"]) +
        len(events["mouse"]) +
        len(events["clicks"]) +
        len(events["scrolls"]) +
        len(events["focusEvents"])
    )

    time_due = time.time() - last_send_time >= SEND_INTERVAL_SECONDS

    if total_events >= SEND_LIMIT or (time_due and total_events > 0):
        send_session()

    time.sleep(2)