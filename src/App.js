import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/AdminDashboard";
import Monitor from "./pages/Monitor";
import Alerts from "./pages/Alerts";

// 🔥 NEW IMPORTS
import UserDashboard from "./pages/UserDashboard";
import Training from "./pages/Training";
import Exam from "./pages/Exam";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* 🔐 Login */}
        <Route path="/" element={<Login />} />

        {/* 👨‍💼 Admin */}
        <Route path="/admin" element={<Admin />} />

        {/* 👤 User */}
        <Route path="/user" element={<UserDashboard />} />

        {/* 🧠 Training */}
        <Route path="/training" element={<Training />} />

        {/* 📝 Exam */}
        <Route path="/exam" element={<Exam />} />

        {/* 📡 Monitor */}
        <Route path="/monitor" element={<Monitor />} />

        {/* 🚨 Alerts */}
        <Route path="/alerts" element={<Alerts />} />

        {/* (Optional old dashboard) */}
        <Route path="/dashboard" element={<Dashboard />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;