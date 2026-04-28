import subprocess
import requests
import tkinter as tk
from tkinter import messagebox
import webbrowser

API_BASE = "http://127.0.0.1:5000"

LOGIN_URL = f"{API_BASE}/api/auth/login"
SET_USER_URL = f"{API_BASE}/api/desktop/set-user"
CLEAR_USER_URL = f"{API_BASE}/api/desktop/clear-user"

agent_process = None
logged_user = None


def start_desktop_agent():
    global agent_process

    if agent_process is not None:
        return

    try:
        agent_process = subprocess.Popen(
            ["python", "desktop_agent.py"],
            creationflags=subprocess.CREATE_NEW_CONSOLE
        )
    except Exception as e:
        messagebox.showerror("Agent Error", f"Desktop agent start failed:\n{e}")


def stop_desktop_agent():
    global agent_process

    try:
        if agent_process is not None:
            agent_process.terminate()
            agent_process = None
    except Exception:
        pass


def set_desktop_user(username, role):
    requests.post(
        SET_USER_URL,
        json={
            "userId": username,
            "role": role
        },
        timeout=5
    )


def clear_desktop_user():
    try:
        requests.post(CLEAR_USER_URL, timeout=5)
    except Exception:
        pass


def show_login_screen():
    login_frame.pack(fill="both", expand=True)
    mode_frame.pack_forget()

    username_entry.delete(0, tk.END)
    password_entry.delete(0, tk.END)
    username_entry.focus()


def show_mode_screen(username, role, has_baseline):
    user_label.config(
        text=f"Logged in as: {username} | Role: {role}"
    )

    baseline_label.config(
        text="Training Status: Completed" if has_baseline else "Training Status: Not Completed"
    )

    login_frame.pack_forget()
    mode_frame.pack(fill="both", expand=True)


def login_user():
    global logged_user

    username = username_entry.get().strip()
    password = password_entry.get().strip()

    if not username or not password:
        messagebox.showwarning("Required", "Username and password required")
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
            messagebox.showerror("Login Failed", data.get("error", "Invalid login"))
            return

        user = data.get("user", {})
        role = user.get("role", "user")
        has_baseline = user.get("hasBaseline", False)

        set_desktop_user(username, role)

        logged_user = {
            "username": username,
            "role": role,
            "hasBaseline": has_baseline
        }

        start_desktop_agent()
        show_mode_screen(username, role, has_baseline)

    except Exception as e:
        messagebox.showerror(
            "Backend Error",
            f"Backend not reachable.\nPlease start app.py first.\n\n{e}"
        )


def open_training_mode():
    if not logged_user:
        return

    webbrowser.open("http://localhost:3000/training")
    messagebox.showinfo(
        "Training Mode",
        "Training page opened. Complete baseline training."
    )


def open_exam_mode():
    if not logged_user:
        return

    if not logged_user.get("hasBaseline", False):
        messagebox.showwarning(
            "Training Required",
            "First complete training before exam mode."
        )
        webbrowser.open("http://localhost:3000/training")
        return

    webbrowser.open("http://localhost:3000/exam")
    messagebox.showinfo(
        "Exam Mode",
        "Exam mode opened. Browser + desktop monitoring active."
    )


def start_monitor_mode():
    if not logged_user:
        return

    if not logged_user.get("hasBaseline", False):
        messagebox.showwarning(
            "Training Required",
            "First complete training before monitor mode."
        )
        webbrowser.open("http://localhost:3000/training")
        return

    start_desktop_agent()

    messagebox.showinfo(
        "Monitor Mode",
        "Desktop monitoring active. You can use Word, Excel, Notepad, Browser, VS Code, etc."
    )

    root.iconify()


def logout_user():
    global logged_user

    confirm = messagebox.askyesno(
        "Logout",
        "Do you want to logout current user?"
    )

    if not confirm:
        return

    clear_desktop_user()
    stop_desktop_agent()

    logged_user = None

    messagebox.showinfo(
        "Logged Out",
        "User logged out. Next user can login now."
    )

    root.deiconify()
    root.attributes("-fullscreen", True)
    root.attributes("-topmost", True)
    show_login_screen()


def block_close():
    messagebox.showwarning(
        "Login Required",
        "Please login or logout properly."
    )


root = tk.Tk()
root.title("Continuous Authentication Desktop Login")
root.attributes("-fullscreen", True)
root.attributes("-topmost", True)
root.protocol("WM_DELETE_WINDOW", block_close)
root.configure(bg="#0f172a")

main_container = tk.Frame(root, bg="#0f172a")
main_container.pack(fill="both", expand=True)

# ================= LOGIN SCREEN =================

login_frame = tk.Frame(main_container, bg="#0f172a")

login_card = tk.Frame(login_frame, bg="white", padx=40, pady=40)
login_card.place(relx=0.5, rely=0.5, anchor="center")

title = tk.Label(
    login_card,
    text="Continuous User Authentication",
    font=("Arial", 24, "bold"),
    bg="white",
    fg="#1d4ed8"
)
title.pack(pady=(0, 10))

subtitle = tk.Label(
    login_card,
    text="Desktop Security Login",
    font=("Arial", 14),
    bg="white",
    fg="#475569"
)
subtitle.pack(pady=(0, 30))

tk.Label(
    login_card,
    text="Username",
    font=("Arial", 12, "bold"),
    bg="white",
    anchor="w"
).pack(fill="x")

username_entry = tk.Entry(
    login_card,
    font=("Arial", 14),
    width=30,
    bd=2
)
username_entry.pack(pady=(5, 15), ipady=8)

tk.Label(
    login_card,
    text="Password",
    font=("Arial", 12, "bold"),
    bg="white",
    anchor="w"
).pack(fill="x")

password_entry = tk.Entry(
    login_card,
    font=("Arial", 14),
    width=30,
    show="*",
    bd=2
)
password_entry.pack(pady=(5, 25), ipady=8)

tk.Button(
    login_card,
    text="Login",
    font=("Arial", 14, "bold"),
    bg="#2563eb",
    fg="white",
    width=28,
    height=2,
    command=login_user
).pack()

tk.Label(
    login_card,
    text="Login required before accessing desktop modes.",
    font=("Arial", 10),
    bg="white",
    fg="#64748b"
).pack(pady=(20, 0))


# ================= MODE SCREEN =================

mode_frame = tk.Frame(main_container, bg="#0f172a")

mode_card = tk.Frame(mode_frame, bg="white", padx=40, pady=40)
mode_card.place(relx=0.5, rely=0.5, anchor="center")

tk.Label(
    mode_card,
    text="Select Mode",
    font=("Arial", 24, "bold"),
    bg="white",
    fg="#1d4ed8"
).pack(pady=(0, 15))

user_label = tk.Label(
    mode_card,
    text="Logged in as:",
    font=("Arial", 13, "bold"),
    bg="white",
    fg="#334155"
)
user_label.pack(pady=(0, 5))

baseline_label = tk.Label(
    mode_card,
    text="Training Status:",
    font=("Arial", 11),
    bg="white",
    fg="#64748b"
)
baseline_label.pack(pady=(0, 25))

tk.Button(
    mode_card,
    text="Training Mode",
    font=("Arial", 14, "bold"),
    bg="#16a34a",
    fg="white",
    width=30,
    height=2,
    command=open_training_mode
).pack(pady=8)

tk.Button(
    mode_card,
    text="Exam Mode",
    font=("Arial", 14, "bold"),
    bg="#dc2626",
    fg="white",
    width=30,
    height=2,
    command=open_exam_mode
).pack(pady=8)

tk.Button(
    mode_card,
    text="Monitor Mode",
    font=("Arial", 14, "bold"),
    bg="#2563eb",
    fg="white",
    width=30,
    height=2,
    command=start_monitor_mode
).pack(pady=8)

tk.Button(
    mode_card,
    text="Logout",
    font=("Arial", 14, "bold"),
    bg="#475569",
    fg="white",
    width=30,
    height=2,
    command=logout_user
).pack(pady=(20, 5))

tk.Label(
    mode_card,
    text="Monitor Mode supports Word, Excel, Notepad, Browser and normal desktop usage.",
    font=("Arial", 10),
    bg="white",
    fg="#64748b"
).pack(pady=(15, 0))

show_login_screen()

root.mainloop()