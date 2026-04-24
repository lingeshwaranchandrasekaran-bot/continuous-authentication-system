import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

function Login() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [roleMode, setRoleMode] = useState("user");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const API = "http://localhost:5000";

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!username.trim() || !password.trim()) {
      setError("Username and password required");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const res = await fetch(`${API}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username: username.trim(),
          password
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }

      const loggedUser = data.user;

      if (roleMode === "admin" && loggedUser.role !== "admin") {
        setError("This account is not admin");
        return;
      }

      localStorage.setItem("userId", loggedUser.username);
      localStorage.setItem("role", loggedUser.role);
      localStorage.setItem("hasBaseline", loggedUser.hasBaseline ? "true" : "false");

      await fetch(`${API}/api/desktop/set-user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          userId: loggedUser.username,
          role: loggedUser.role
        })
      });

      if (loggedUser.role === "admin") {
        navigate("/admin");
        return;
      }

      if (!loggedUser.hasBaseline) {
        navigate("/training");
        return;
      }

      navigate("/user");
    } catch (err) {
      console.error(err);
      setError("Backend not reachable");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-indigo-200 flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border p-8">
        <h1 className="text-3xl font-bold text-blue-700 text-center">
          Continuous Authentication
        </h1>

        <p className="text-center text-gray-600 mt-2 mb-6">
          Keystroke + Mouse Behavior Monitoring System
        </p>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            type="button"
            onClick={() => setRoleMode("user")}
            className={`p-3 rounded-xl font-semibold ${
              roleMode === "user"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            User Login
          </button>

          <button
            type="button"
            onClick={() => setRoleMode("admin")}
            className={`p-3 rounded-xl font-semibold ${
              roleMode === "admin"
                ? "bg-purple-600 text-white"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            Admin Login
          </button>
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 border border-red-200 rounded-xl p-3 mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Username
            </label>
            <input
              className="w-full border rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Password
            </label>
            <input
              className="w-full border rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full rounded-xl p-3 text-white font-bold ${
              roleMode === "admin"
                ? "bg-purple-600 hover:bg-purple-700"
                : "bg-blue-600 hover:bg-blue-700"
            } disabled:opacity-60`}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="text-xs text-gray-500 text-center mt-5">
          Desktop Agent will use this logged-in username for full desktop behavior tracking.
        </p>
      </div>
    </div>
  );
}

export default Login;