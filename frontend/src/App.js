import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Main Pages
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import UserDashboard from "./pages/UserDashboard";
import Training from "./pages/Training";
import Exam from "./pages/Exam";

/**
 * Simple Protected Route
 */
const ProtectedRoute = ({ children, roleRequired }) => {
  const user = localStorage.getItem("userId");
  const role = localStorage.getItem("role");

  if (!user) {
    return <Navigate to="/" />;
  }

  if (roleRequired && role !== roleRequired) {
    return <Navigate to="/" />;
  }

  return children;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* 🔐 Login */}
        <Route path="/" element={<Login />} />

        {/* 👨‍💼 Admin Dashboard */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute roleRequired="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* 👤 User Dashboard */}
        <Route
          path="/user"
          element={
            <ProtectedRoute>
              <UserDashboard />
            </ProtectedRoute>
          }
        />

        {/* 🧠 Training */}
        <Route
          path="/training"
          element={
            <ProtectedRoute>
              <Training />
            </ProtectedRoute>
          }
        />

        {/* 📝 Exam */}
        <Route
          path="/exam"
          element={
            <ProtectedRoute>
              <Exam />
            </ProtectedRoute>
          }
        />

        {/* ❌ Unknown route redirect */}
        <Route path="*" element={<Navigate to="/" />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;