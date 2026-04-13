import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import Monitor from "./pages/Monitor";
import Alerts from "./pages/Alerts";
import UserDashboard from "./pages/UserDashboard";
import Training from "./pages/Training";
import Exam from "./pages/Exam";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Login */}
        <Route path="/" element={<Login />} />

        {/* Admin */}
        <Route path="/admin" element={<AdminDashboard />} />

        {/* User */}
        <Route path="/user" element={<UserDashboard />} />

        {/* Training */}
        <Route path="/training" element={<Training />} />

        {/* Exam */}
        <Route path="/exam" element={<Exam />} />

        {/* Optional pages */}
        <Route path="/monitor" element={<Monitor />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;