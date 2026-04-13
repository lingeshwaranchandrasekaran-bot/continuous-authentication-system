import numpy as np

def extract_features(training_data):

    typing_speeds = []
    key_times = []

    for session in training_data:
        keys = session.get("keys", [])

        times = [k["time"] for k in keys]

        if len(times) > 1:
            diffs = np.diff(times)
            typing_speeds.extend(diffs)

        key_times.extend(times)

    return np.array([
        np.mean(typing_speeds) if typing_speeds else 0,
        np.std(typing_speeds) if typing_speeds else 0,
        len(key_times)
    ])