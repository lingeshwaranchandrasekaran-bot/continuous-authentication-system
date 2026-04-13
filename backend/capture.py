from pynput import keyboard, mouse
import time
import json

key_data = []
mouse_data = []

key_down_time = {}
last_key_time = None

# ⌨️ keyboard capture
def on_press(key):
    global last_key_time
    now = time.time()

    try:
        k = key.char
    except:
        k = str(key)

    key_down_time[k] = now

    if last_key_time:
        flight = now - last_key_time
        key_data.append({
            "type": "flight",
            "value": flight,
            "time": now
        })

    last_key_time = now

def on_release(key):
    now = time.time()

    try:
        k = key.char
    except:
        k = str(key)

    if k in key_down_time:
        hold = now - key_down_time[k]

        key_data.append({
            "type": "hold",
            "key": k,
            "value": hold,
            "time": now
        })

# 🖱️ mouse capture
last_mouse = None

def on_move(x, y):
    global last_mouse
    now = time.time()

    if last_mouse:
        dx = x - last_mouse["x"]
        dy = y - last_mouse["y"]
        dt = now - last_mouse["time"]

        if dt > 0:
            speed = ((dx**2 + dy**2)**0.5) / dt
            mouse_data.append({
                "type": "move",
                "speed": speed,
                "time": now
            })

    last_mouse = {"x": x, "y": y, "time": now}

def on_click(x, y, button, pressed):
    mouse_data.append({
        "type": "click",
        "button": str(button),
        "pressed": pressed,
        "time": time.time()
    })

# 🚀 start capture
def start_capture():
    print("✅ Behavior Capture Started")

    with keyboard.Listener(on_press=on_press, on_release=on_release) as k_listener, \
         mouse.Listener(on_move=on_move, on_click=on_click) as m_listener:

        k_listener.join()
        m_listener.join()

# 💾 save data
def save_data():
    with open("capture_data.json", "w") as f:
        json.dump({
            "keyboard": key_data,
            "mouse": mouse_data
        }, f)

if __name__ == "__main__":
    try:
        start_capture()
    except KeyboardInterrupt:
        save_data()
        print("✅ Data saved")