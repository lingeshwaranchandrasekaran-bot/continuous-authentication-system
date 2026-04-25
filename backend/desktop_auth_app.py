import subprocess
import requests
import tkinter as tk
from tkinter import messagebox
import webbrowser

API_BASE = "http://127.0.0.1:5000"
LOGIN_URL = f"{API_BASE}/api/auth/login"
SET_USER_URL = f"{API_BASE}/api/desktop/set-user"

agent_process = None


def start_desktop_agent():
    global agent_process

    try:
        agent_process = subprocess.Popen(
            ["python", "desktop_agent.py"],
            creationflags=subprocess.CREATE_NEW_CONSOLE
        )
    except Exception as e:
        messagebox.showerror(
            "Agent Error",
            f"Desktop agent start failed:\n{e}"
        )


def login_user():
    username = username_entry.get().strip()
    password = password_entry.get().strip()

    if not username or not password:
        messagebox.showwarning(
            "Required",
            "Username and password required"
        )
        return

    try:
        res = requests.post(
            LOGIN_URL,
            json={
                "username": username,
                "password": password
            },
            timeout=5
        )

        data = res.json()

        if not res.ok:
            messagebox.showerror(
                "Login Failed",
                data.get("error", "Invalid login")
            )
            return

        user = data.get("user", {})
        role = user.get("role", "user")
        has_baseline = user.get("hasBaseline", False)

        requests.post(
            SET_USER_URL,
            json={
                "userId": username,
                "role": role
            },
            timeout=5
        )

        messagebox.showinfo(
            "Success",
            f"Login success: {username}"
        )

        start_desktop_agent()

        if not has_baseline:
            webbrowser.open("http://localhost:3000/training")
        else:
            webbrowser.open("http://localhost:3000/user")

        root.destroy()

    except Exception as e:
        messagebox.showerror(
            "Backend Error",
            f"Backend not reachable.\nPlease start app.py first.\n\n{e}"
        )


def block_close():
    messagebox.showwarning(
        "Login Required",
        "Please login first to access desktop."
    )


root = tk.Tk()
root.title("Continuous Authentication Desktop Login")
root.attributes("-fullscreen", True)
root.attributes("-topmost", True)
root.protocol("WM_DELETE_WINDOW", block_close)
root.configure(bg="#0f172a")

container = tk.Frame(root, bg="white", padx=40, pady=40)
container.place(relx=0.5, rely=0.5, anchor="center")

title = tk.Label(
    container,
    text="Continuous User Authentication",
    font=("Arial", 24, "bold"),
    bg="white",
    fg="#1d4ed8"
)
title.pack(pady=(0, 10))

subtitle = tk.Label(
    container,
    text="Desktop Security Login",
    font=("Arial", 14),
    bg="white",
    fg="#475569"
)
subtitle.pack(pady=(0, 30))

username_label = tk.Label(
    container,
    text="Username",
    font=("Arial", 12, "bold"),
    bg="white",
    anchor="w"
)
username_label.pack(fill="x")

username_entry = tk.Entry(
    container,
    font=("Arial", 14),
    width=30,
    bd=2
)
username_entry.pack(pady=(5, 15), ipady=8)

password_label = tk.Label(
    container,
    text="Password",
    font=("Arial", 12, "bold"),
    bg="white",
    anchor="w"
)
password_label.pack(fill="x")

password_entry = tk.Entry(
    container,
    font=("Arial", 14),
    width=30,
    show="*",
    bd=2
)
password_entry.pack(pady=(5, 25), ipady=8)

login_button = tk.Button(
    container,
    text="Login & Start Monitoring",
    font=("Arial", 14, "bold"),
    bg="#2563eb",
    fg="white",
    width=28,
    height=2,
    command=login_user
)
login_button.pack()

note = tk.Label(
    container,
    text="First-time user will be redirected to Training Mode.",
    font=("Arial", 10),
    bg="white",
    fg="#64748b"
)
note.pack(pady=(20, 0))

username_entry.focus()

root.mainloop()