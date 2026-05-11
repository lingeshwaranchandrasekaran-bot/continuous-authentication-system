import subprocess
import requests
import tkinter as tk
from tkinter import messagebox
import webbrowser
from urllib.parse import quote

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
    try:
        requests.post(
            SET_USER_URL,
            json={"userId": username, "role": role},
            timeout=5
        )
    except Exception:
        pass


def clear_desktop_user():
    try:
        requests.post(CLEAR_USER_URL, timeout=5)
    except Exception:
        pass


def clear_inputs():
    username_entry.delete(0, tk.END)
    password_entry.delete(0, tk.END)


def open_browser_session(path_after_login="dashboard"):
    if not logged_user:
        return

    username = quote(logged_user.get("username", ""))
    role = quote(logged_user.get("role", "user").lower())
    has_baseline = "true" if logged_user.get("hasBaseline", False) else "false"

    webbrowser.open(
        f"http://localhost:3000/desktop-session"
        f"?username={username}&role={role}&hasBaseline={has_baseline}&next={path_after_login}"
    )


def show_login_screen():
    root.deiconify()
    root.attributes("-fullscreen", True)
    root.attributes("-topmost", True)

    mode_frame.pack_forget()
    login_frame.pack(fill="both", expand=True)

    clear_inputs()
    username_entry.focus()


def show_mode_screen(username, role, has_baseline):
    root.deiconify()
    root.attributes("-fullscreen", True)
    root.attributes("-topmost", True)

    login_frame.pack_forget()
    mode_frame.pack(fill="both", expand=True)

    display_name_label.config(text=username)
    role_label.config(text=f"Role: {role.upper()}")

    if has_baseline:
        training_status_label.config(
            text="Training Completed",
            bg="#dcfce7",
            fg="#166534"
        )
    else:
        training_status_label.config(
            text="Training Required",
            bg="#fef3c7",
            fg="#92400e"
        )


def login_user():
    global logged_user

    username = username_entry.get().strip()
    password = password_entry.get().strip()

    if not username or not password:
        messagebox.showwarning("Required", "Username and password required")
        return

    login_button.config(text="Checking...", state="disabled")

    try:
        res = requests.post(
            LOGIN_URL,
            json={"username": username, "password": password},
            timeout=5
        )

        data = res.json()

        if not res.ok:
            messagebox.showerror("Login Failed", data.get("error", "Invalid login"))
            login_button.config(text="Login Securely", state="normal")
            return

        user = data.get("user", {})

        real_username = user.get("username", username)
        role = user.get("role", "user").lower()
        has_baseline = bool(user.get("hasBaseline", False))

        logged_user = {
            "username": real_username,
            "role": role,
            "hasBaseline": has_baseline
        }

        set_desktop_user(real_username, role)

        if role == "admin":
            messagebox.showinfo(
                "Admin Login",
                "Admin login successful. Opening Admin Dashboard."
            )
            open_browser_session("admin")
            root.attributes("-topmost", False)
            root.iconify()
            login_button.config(text="Login Securely", state="normal")
            return

        start_desktop_agent()
        show_mode_screen(real_username, role, has_baseline)

    except Exception as e:
        messagebox.showerror(
            "Backend Error",
            f"Backend not reachable.\nPlease start app.py first.\n\n{e}"
        )

    login_button.config(text="Login Securely", state="normal")


def open_training_mode():
    if not logged_user:
        return

    role = logged_user.get("role", "user").lower()

    if role == "admin":
        open_browser_session("admin")
        return

    if logged_user.get("hasBaseline", False):
        messagebox.showinfo(
            "Training Already Completed",
            "Training already completed.\n\nAdmin reset pannina mattum again training open aagum."
        )
        return

    open_browser_session("training")
    messagebox.showinfo(
        "Training Mode",
        "Training page opened.\nComplete training to unlock Exam and Monitor Mode."
    )


def open_exam_mode():
    if not logged_user:
        return

    role = logged_user.get("role", "user").lower()

    if role == "admin":
        open_browser_session("admin")
        return

    if not logged_user.get("hasBaseline", False):
        messagebox.showwarning(
            "Training Required",
            "Please complete training before Exam Mode."
        )
        open_browser_session("training")
        return

    open_browser_session("exam")
    messagebox.showinfo(
        "Exam Mode",
        "Exam mode opened.\nBrowser and desktop monitoring are active."
    )


def start_monitor_mode():
    if not logged_user:
        return

    role = logged_user.get("role", "user").lower()

    if role == "admin":
        open_browser_session("admin")
        return

    if not logged_user.get("hasBaseline", False):
        messagebox.showwarning(
            "Training Required",
            "Please complete training before Monitor Mode."
        )
        open_browser_session("training")
        return

    start_desktop_agent()

    messagebox.showinfo(
        "Monitor Mode",
        "Desktop monitoring is active.\n\nThis app will minimize to taskbar."
    )

    root.attributes("-topmost", False)
    root.iconify()


def open_dashboard():
    if not logged_user:
        return

    role = logged_user.get("role", "user").lower()

    if role == "admin":
        open_browser_session("admin")
    else:
        open_browser_session("user")

    messagebox.showinfo("Dashboard", "Dashboard opened in browser.")


def return_to_mode_screen():
    if not logged_user:
        show_login_screen()
        return

    role = logged_user.get("role", "user").lower()

    if role == "admin":
        open_browser_session("admin")
        root.iconify()
        return

    show_mode_screen(
        logged_user["username"],
        logged_user["role"],
        logged_user.get("hasBaseline", False)
    )


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
        "User logged out successfully.\nNext user can login now."
    )

    show_login_screen()


def block_close():
    messagebox.showwarning(
        "Security Layer Active",
        "Please use Logout button before leaving this security screen."
    )


def on_enter_key(event):
    login_user()


def create_button(parent, title, desc, color, command):
    card = tk.Frame(
        parent,
        bg="#ffffff",
        highlightbackground="#e2e8f0",
        highlightthickness=1
    )
    card.pack(fill="x", pady=8)

    inner = tk.Frame(card, bg="#ffffff", padx=18, pady=14)
    inner.pack(fill="x")

    left = tk.Frame(inner, bg="#ffffff")
    left.pack(side="left", fill="x", expand=True)

    tk.Label(
        left,
        text=title,
        font=("Segoe UI", 14, "bold"),
        bg="#ffffff",
        fg="#0f172a",
        anchor="w"
    ).pack(anchor="w")

    tk.Label(
        left,
        text=desc,
        font=("Segoe UI", 9),
        bg="#ffffff",
        fg="#64748b",
        anchor="w"
    ).pack(anchor="w", pady=(4, 0))

    tk.Button(
        inner,
        text="Open",
        font=("Segoe UI", 10, "bold"),
        bg=color,
        fg="white",
        width=10,
        height=2,
        bd=0,
        activebackground=color,
        activeforeground="white",
        command=command
    ).pack(side="right")


root = tk.Tk()
root.title("Continuous Authentication Desktop Security")
root.attributes("-fullscreen", True)
root.attributes("-topmost", True)
root.protocol("WM_DELETE_WINDOW", block_close)
root.configure(bg="#020617")
root.bind("<Return>", on_enter_key)

main_container = tk.Frame(root, bg="#020617")
main_container.pack(fill="both", expand=True)

# ================= LOGIN SCREEN =================

login_frame = tk.Frame(main_container, bg="#020617")

login_left = tk.Frame(login_frame, bg="#020617")
login_left.place(relx=0.25, rely=0.5, anchor="center")

tk.Label(
    login_left,
    text="Continuous\nUser Authentication",
    font=("Segoe UI", 36, "bold"),
    bg="#020617",
    fg="#ffffff",
    justify="left"
).pack(anchor="w")

tk.Label(
    login_left,
    text="Secure desktop access using password,\nkeystroke dynamics and mouse behavior.",
    font=("Segoe UI", 14),
    bg="#020617",
    fg="#94a3b8",
    justify="left"
).pack(anchor="w", pady=(20, 0))

tk.Label(
    login_left,
    text="✓ Training Mode\n✓ Exam Mode\n✓ Monitor Mode\n✓ Admin Dashboard\n✓ Warning Based Auto Lock",
    font=("Segoe UI", 13),
    bg="#020617",
    fg="#38bdf8",
    justify="left"
).pack(anchor="w", pady=(35, 0))

login_card = tk.Frame(login_frame, bg="#ffffff", padx=45, pady=45)
login_card.place(relx=0.72, rely=0.5, anchor="center")

tk.Label(
    login_card,
    text="Desktop Security Login",
    font=("Segoe UI", 24, "bold"),
    bg="#ffffff",
    fg="#0f172a"
).pack(anchor="w")

tk.Label(
    login_card,
    text="Login to access secure desktop modes",
    font=("Segoe UI", 11),
    bg="#ffffff",
    fg="#64748b"
).pack(anchor="w", pady=(5, 30))

tk.Label(
    login_card,
    text="Username",
    font=("Segoe UI", 11, "bold"),
    bg="#ffffff",
    fg="#334155"
).pack(anchor="w")

username_entry = tk.Entry(
    login_card,
    font=("Segoe UI", 14),
    width=32,
    bd=1,
    relief="solid"
)
username_entry.pack(pady=(8, 18), ipady=8)

tk.Label(
    login_card,
    text="Password",
    font=("Segoe UI", 11, "bold"),
    bg="#ffffff",
    fg="#334155"
).pack(anchor="w")

password_entry = tk.Entry(
    login_card,
    font=("Segoe UI", 14),
    width=32,
    show="*",
    bd=1,
    relief="solid"
)
password_entry.pack(pady=(8, 28), ipady=8)

login_button = tk.Button(
    login_card,
    text="Login Securely",
    font=("Segoe UI", 13, "bold"),
    bg="#2563eb",
    fg="white",
    width=30,
    height=2,
    bd=0,
    activebackground="#1d4ed8",
    activeforeground="white",
    command=login_user
)
login_button.pack(fill="x")

tk.Label(
    login_card,
    text="Actual typed content is not stored. Only behavior timing is analyzed.",
    font=("Segoe UI", 9),
    bg="#ffffff",
    fg="#64748b",
    wraplength=350,
    justify="center"
).pack(pady=(20, 0))


# ================= MODE SCREEN =================

mode_frame = tk.Frame(main_container, bg="#f1f5f9")

top_bar = tk.Frame(mode_frame, bg="#0f172a", height=95)
top_bar.pack(fill="x")

top_content = tk.Frame(top_bar, bg="#0f172a", padx=35, pady=18)
top_content.pack(fill="both", expand=True)

tk.Label(
    top_content,
    text="Continuous Authentication Control Center",
    font=("Segoe UI", 22, "bold"),
    bg="#0f172a",
    fg="#ffffff"
).pack(side="left")

logout_top_btn = tk.Button(
    top_content,
    text="Logout",
    font=("Segoe UI", 11, "bold"),
    bg="#ef4444",
    fg="white",
    width=12,
    height=2,
    bd=0,
    command=logout_user
)
logout_top_btn.pack(side="right")

body = tk.Frame(mode_frame, bg="#f1f5f9", padx=45, pady=35)
body.pack(fill="both", expand=True)

profile_card = tk.Frame(
    body,
    bg="#ffffff",
    padx=25,
    pady=22,
    highlightbackground="#e2e8f0",
    highlightthickness=1
)
profile_card.pack(fill="x", pady=(0, 25))

profile_left = tk.Frame(profile_card, bg="#ffffff")
profile_left.pack(side="left", fill="x", expand=True)

tk.Label(
    profile_left,
    text="Logged In User",
    font=("Segoe UI", 10),
    bg="#ffffff",
    fg="#64748b"
).pack(anchor="w")

display_name_label = tk.Label(
    profile_left,
    text="Username",
    font=("Segoe UI", 25, "bold"),
    bg="#ffffff",
    fg="#0f172a"
)
display_name_label.pack(anchor="w", pady=(2, 0))

role_label = tk.Label(
    profile_left,
    text="Role: USER",
    font=("Segoe UI", 11, "bold"),
    bg="#ffffff",
    fg="#2563eb"
)
role_label.pack(anchor="w", pady=(5, 0))

training_status_label = tk.Label(
    profile_card,
    text="Training Status",
    font=("Segoe UI", 11, "bold"),
    bg="#dcfce7",
    fg="#166534",
    padx=18,
    pady=8
)
training_status_label.pack(side="right")

content_grid = tk.Frame(body, bg="#f1f5f9")
content_grid.pack(fill="both", expand=True)

left_panel = tk.Frame(content_grid, bg="#f1f5f9")
left_panel.pack(side="left", fill="both", expand=True, padx=(0, 20))

right_panel = tk.Frame(
    content_grid,
    bg="#ffffff",
    padx=25,
    pady=22,
    highlightbackground="#e2e8f0",
    highlightthickness=1
)
right_panel.pack(side="right", fill="y")

tk.Label(
    left_panel,
    text="Choose Working Mode",
    font=("Segoe UI", 22, "bold"),
    bg="#f1f5f9",
    fg="#0f172a"
).pack(anchor="w", pady=(0, 15))

create_button(
    left_panel,
    "Training Mode",
    "Only for new users or users reset by admin.",
    "#16a34a",
    open_training_mode
)

create_button(
    left_panel,
    "Exam Mode",
    "Start exam monitoring with fraud detection and alert logging.",
    "#dc2626",
    open_exam_mode
)

create_button(
    left_panel,
    "Monitor Mode",
    "Use Word, Excel, Notepad, Browser and desktop normally.",
    "#2563eb",
    start_monitor_mode
)

create_button(
    left_panel,
    "Open Dashboard",
    "Open user/admin dashboard based on logged-in role.",
    "#7c3aed",
    open_dashboard
)

tk.Label(
    right_panel,
    text="How to Use",
    font=("Segoe UI", 18, "bold"),
    bg="#ffffff",
    fg="#0f172a"
).pack(anchor="w")

instructions = [
    "1. Admin login goes directly to Admin Dashboard.",
    "2. New user must complete Training Mode.",
    "3. Trained user can directly use Exam or Monitor Mode.",
    "4. If admin resets training, user must train again.",
    "5. Logout before another person uses the system."
]

for item in instructions:
    tk.Label(
        right_panel,
        text=item,
        font=("Segoe UI", 11),
        bg="#ffffff",
        fg="#475569",
        wraplength=330,
        justify="left"
    ).pack(anchor="w", pady=8)

tk.Frame(right_panel, bg="#e2e8f0", height=1).pack(fill="x", pady=18)

tk.Button(
    right_panel,
    text="Return to Mode Screen",
    font=("Segoe UI", 11, "bold"),
    bg="#0891b2",
    fg="white",
    width=28,
    height=2,
    bd=0,
    command=return_to_mode_screen
).pack(pady=(0, 10))

tk.Button(
    right_panel,
    text="Logout Current User",
    font=("Segoe UI", 11, "bold"),
    bg="#334155",
    fg="white",
    width=28,
    height=2,
    bd=0,
    command=logout_user
).pack()

show_login_screen()
root.mainloop()