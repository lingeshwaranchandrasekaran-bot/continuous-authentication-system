import numpy as np

# =========================================
# FEATURE EXTRACTION
# =========================================
def extract_features(data):
    """
    Input:
    data = [
      {
        "keys": [...],
        "mouse": [...],
        "clicks": [...],
        "holdTimes": [...],
        "flightTimes": [...],
        "mouseSpeeds": [...]
      }
    ]

    Output:
    Feature vector (8 values)
    """

    if not data:
        return np.array([0.0] * 8, dtype=np.float32)

    hold_times_all = []
    flight_times_all = []
    mouse_speeds_all = []
    key_counts = []
    click_counts = []

    for d in data:
        keys = d.get("keys", [])
        clicks = d.get("clicks", [])
        mouse = d.get("mouse", [])

        hold_times = d.get("holdTimes", [])
        flight_times = d.get("flightTimes", [])
        mouse_speeds = d.get("mouseSpeeds", [])

        key_counts.append(len(keys))
        click_counts.append(len(clicks))

        # direct values
        if hold_times:
            hold_times_all.extend([float(x) for x in hold_times if x])

        if flight_times:
            flight_times_all.extend([float(x) for x in flight_times if x])

        if mouse_speeds:
            mouse_speeds_all.extend([float(x) for x in mouse_speeds if x])

        # fallback → keys
        if not hold_times and keys:
            key_down = {}
            for k in keys:
                if k.get("type") == "down":
                    key_down[k["key"]] = k["time"]
                elif k.get("type") == "up":
                    if k["key"] in key_down:
                        hold = k["time"] - key_down[k["key"]]
                        if hold > 0:
                            hold_times_all.append(float(hold))

        if not flight_times and keys:
            times = [k["time"] for k in keys if "time" in k]
            if len(times) > 1:
                diff = np.diff(times)
                diff = diff[diff > 0]
                flight_times_all.extend(diff.tolist())

        # fallback → mouse
        if not mouse_speeds and mouse:
            for i in range(1, len(mouse)):
                p = mouse[i - 1]
                c = mouse[i]

                if "x" in p and "x" in c:
                    dx = c["x"] - p["x"]
                    dy = c["y"] - p["y"]
                    dt = c["time"] - p["time"]

                    if dt > 0:
                        speed = np.sqrt(dx**2 + dy**2) / dt
                        mouse_speeds_all.append(float(speed))

    # ===== Final features =====
    mean_hold = float(np.mean(hold_times_all)) if hold_times_all else 0.0
    std_hold = float(np.std(hold_times_all)) if hold_times_all else 0.0

    mean_flight = float(np.mean(flight_times_all)) if flight_times_all else 0.0
    std_flight = float(np.std(flight_times_all)) if flight_times_all else 0.0

    mean_mouse = float(np.mean(mouse_speeds_all)) if mouse_speeds_all else 0.0
    std_mouse = float(np.std(mouse_speeds_all)) if mouse_speeds_all else 0.0

    avg_keys = float(np.mean(key_counts)) if key_counts else 0.0
    avg_clicks = float(np.mean(click_counts)) if click_counts else 0.0

    return np.array([
        mean_hold,
        std_hold,
        mean_flight,
        std_flight,
        mean_mouse,
        std_mouse,
        avg_keys,
        avg_clicks
    ], dtype=np.float32)


# =========================================
# RULE BASED FRAUD DETECTION
# =========================================
def rule_based_detection(copy_paste=0, tab_switch=0, warnings=0):
    """
    Rule-based fraud detection
    """

    risk = 0
    alerts = []

    if copy_paste > 0:
        risk += 25
        alerts.append("COPY_PASTE")

    if tab_switch > 0:
        risk += 25
        alerts.append("TAB_SWITCH")

    if warnings > 0:
        risk += min(warnings * 10, 30)
        alerts.append("WARNING")

    return risk, alerts


# =========================================
# FINAL FRAUD DECISION
# =========================================
def calculate_final_risk(base_vec, curr_vec, similarity):
    """
    Combine AI + Rule logic
    """

    risk = 0
    alerts = []

    # AI mismatch
    if similarity < 0.7:
        risk += 40
        alerts.append("AI_MISMATCH")

    # very low similarity
    if similarity < 0.5:
        risk += 20
        alerts.append("LOW_SIMILARITY")

    return risk, alerts