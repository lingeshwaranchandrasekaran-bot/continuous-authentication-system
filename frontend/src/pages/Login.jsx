import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const API = "https://continuous-authentication-system.onrender.com";

function Login() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password.trim()) {
      setError("Please enter username and password.");
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
          username: username.trim(),
          password: password.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Invalid username or password.");
        setLoading(false);
        return;
      }

      const user = data.user || {};
      const role = String(user.role || "user").toLowerCase();
      const realUsername = user.username || username.trim();
      const hasBaseline = Boolean(user.hasBaseline);

      localStorage.setItem(
        "user",
        JSON.stringify({
          username: realUsername,
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
    } catch {
      setError("Backend not reachable. Please try again after a few seconds.");
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
          <div className="mb-8">
            <p className="text-blue-600 text-xs font-black uppercase tracking-[0.25em]">
              Secure Access Portal
            </p>

            <h2 className="text-4xl font-black text-slate-950 mt-3">
              Login
            </h2>

            <p className="text-slate-500 mt-2">
              Enter your authorized credentials to continue.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 mb-5 font-semibold">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Username
              </label>

              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-4 outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter username"
                autoComplete="username"
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
                  autoComplete="current-password"
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

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-2xl py-4 font-black text-lg"
            >
              {loading ? "Verifying..." : "Login Securely"}
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