import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

function Login() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = () => {
    // Admin Login
    if (username === "admin" && password === "admin123") {
      navigate("/admin");
      return;
    }

    // Get users from localStorage
    const users = JSON.parse(localStorage.getItem("users")) || [];

    // Check user
    const validUser = users.find(
      (u) => u.username === username && u.password === password
    );

    if (validUser) {
      navigate("/user");
    } else {
      alert("❌ Invalid credentials");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-green-500 to-green-700">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-96">
        <h2 className="text-2xl font-bold text-green-700 text-center mb-6">
          🔐 Continuous Authentication System
        </h2>

        <input
          type="text"
          placeholder="User ID"
          className="w-full p-3 border rounded mb-3"
          onChange={(e) => setUsername(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full p-3 border rounded mb-4"
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={handleLogin}
          className="w-full bg-green-600 text-white p-3 rounded hover:bg-green-700"
        >
          Login
        </button>
      </div>
    </div>
  );
}

export default Login;