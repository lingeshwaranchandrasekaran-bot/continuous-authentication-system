import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const API = "https://continuous-authentication-system.onrender.com";

function Login() {
  const navigate = useNavigate();

  const [tab, setTab] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setMessage("");
    setMessageType("");
    setShowPassword(false);
  };

  const saveLoginData = async (user, loginEmail) => {
    const role = String(user.role || "user").toLowerCase();
    const realUsername = user.username || loginEmail;
    const hasBaseline = Boolean(user.hasBaseline);

    localStorage.setItem(
      "user",
      JSON.stringify({
        username: realUsername,
        email: user.email || loginEmail,
        role,
        hasBaseline,
      })
    );

    localStorage.setItem("userId", realUsername);
    localStorage.setItem("role", role);
    localStorage.setItem("hasBaseline", hasBaseline ? "true" : "false");

    try {
      await fetch(`${API}/api/desktop/set-user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: realUsername,
          role,
        }),
      });
    } catch {}

    if (role === "admin") {
      navigate("/admin");
    } else {
      navigate("/user");
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage("");
    setMessageType("");

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      setMessage("Please enter email id and password.");
      setMessageType("error");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: cleanEmail,
          email: cleanEmail,
          password: cleanPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error || "Invalid email id or password.");
        setMessageType("error");
        setLoading(false);
        return;
      }

      await saveLoginData(data.user || {}, cleanEmail);
    } catch {
      setMessage("Backend not reachable. Please try again after a few seconds.");
      setMessageType("error");
    }

    setLoading(false);
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setMessage("");
    setMessageType("");

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();
    const cleanConfirmPassword = confirmPassword.trim();

    if (!cleanEmail || !cleanPassword || !cleanConfirmPassword) {
      setMessage("Please fill all signup fields.");
      setMessageType("error");
      return;
    }

    if (!cleanEmail.includes("@") || !cleanEmail.includes(".")) {
      setMessage("Please enter a valid email id.");
      setMessageType("error");
      return;
    }

    if (cleanPassword.length < 6) {
      setMessage("Password must be at least 6 characters.");
      setMessageType("error");
      return;
    }

    if (cleanPassword !== cleanConfirmPassword) {
      setMessage("Password and confirm password do not match.");
      setMessageType("error");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: cleanEmail,
          email: cleanEmail,
          password: cleanPassword,
          role: "user",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error || "Signup failed. Please try again.");
        setMessageType("error");
        setLoading(false);
        return;
      }

      setMessage("Account created successfully. Please login.");
      setMessageType("success");
      setTab("signin");
      setPassword("");
      setConfirmPassword("");
    } catch {
      setMessage("Backend not reachable. Please try again after a few seconds.");
      setMessageType("error");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-5">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 bg-white rounded-[36px] overflow-hidden shadow-2xl">
        <section className="hidden lg:flex bg-gradient-to-br from-blue-700 via-blue-800 to-slate-950 p-10 flex-col justify-between text-white">
          <div>
            <div className="h-14 w-14 rounded-2xl bg-white/15 flex items-center justify-center text-2xl font-black">
              C
            </div>

            <h1 className="text-5xl font-black mt-8 leading-tight">
              Continuous User Authentication
            </h1>

            <p className="text-blue-100 mt-5 text-lg leading-8">
              Secure access system using keystroke dynamics, mouse behavior
              analysis, real-time monitoring, AI-based risk detection, and
              admin security control.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-10">
            <Feature title="Behavior Biometrics" desc="Keystroke and mouse behavior monitoring" />
            <Feature title="AI Risk Detection" desc="Behavior comparison and similarity analysis" />
            <Feature title="Exam Security" desc="Copy-paste, tab switch and focus loss detection" />
            <Feature title="Admin Control" desc="Alerts, reports, block and reset controls" />
          </div>
        </section>

        <section className="p-7 md:p-10">
          <div className="mb-6">
            <p className="text-blue-600 text-xs font-black uppercase tracking-[0.25em]">
              Secure Access Portal
            </p>

            <h2 className="text-4xl font-black text-slate-950 mt-3">
              {tab === "signin" ? "Sign In" : "Create Account"}
            </h2>

            <p className="text-slate-500 mt-2">
              {tab === "signin"
                ? "Enter your email id and password to continue."
                : "Create a new user account using your email id."}
            </p>
          </div>

          <div className="flex mb-6 bg-slate-100 rounded-2xl p-1">
            <button
              type="button"
              onClick={() => {
                setTab("signin");
                resetForm();
              }}
              className={`w-1/2 py-3 rounded-xl font-black ${
                tab === "signin"
                  ? "bg-blue-600 text-white shadow"
                  : "text-slate-600"
              }`}
            >
              Sign In
            </button>

            <button
              type="button"
              onClick={() => {
                setTab("signup");
                resetForm();
              }}
              className={`w-1/2 py-3 rounded-xl font-black ${
                tab === "signup"
                  ? "bg-blue-600 text-white shadow"
                  : "text-slate-600"
              }`}
            >
              Sign Up
            </button>
          </div>

          {message && (
            <div
              className={`rounded-2xl p-4 mb-5 font-semibold ${
                messageType === "success"
                  ? "bg-green-50 border border-green-200 text-green-700"
                  : "bg-red-50 border border-red-200 text-red-700"
              }`}
            >
              {message}
            </div>
          )}

          <form
            onSubmit={tab === "signin" ? handleLogin : handleSignup}
            className="space-y-5"
          >
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Email ID
              </label>

              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                className="w-full rounded-2xl border border-slate-300 px-4 py-4 outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your email id"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Password
              </label>

              <div className="relative">
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type={showPassword ? "text" : "password"}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-4 pr-24 outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter password"
                  autoComplete={
                    tab === "signin" ? "current-password" : "new-password"
                  }
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-blue-600"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {tab === "signup" && (
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Confirm Password
                </label>

                <input
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  type={showPassword ? "text" : "password"}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-4 outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Confirm password"
                  autoComplete="new-password"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-2xl py-4 font-black text-lg"
            >
              {loading
                ? tab === "signin"
                  ? "Verifying..."
                  : "Creating..."
                : tab === "signin"
                ? "Login Securely"
                : "Create Account"}
            </button>
          </form>

          <div className="mt-7 bg-slate-50 border border-slate-200 rounded-2xl p-4">
            <p className="text-sm text-slate-600">
              Security notice: the system analyzes behavioral timing patterns
              such as key hold time, flight time, mouse movement, clicks, and
              suspicious actions. Actual typed content is not stored for
              behavioral analysis.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

function Feature({ title, desc }) {
  return (
    <div className="rounded-3xl bg-white/10 border border-white/10 p-5">
      <h3 className="font-black">{title}</h3>
      <p className="text-sm text-blue-100 mt-2">{desc}</p>
    </div>
  );
}

export default Login;