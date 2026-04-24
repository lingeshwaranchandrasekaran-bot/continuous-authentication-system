import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import UserDashboard from "./pages/UserDashboard";
import Training from "./pages/Training";
import Exam from "./pages/Exam";
import BehaviorTracker from "./components/BehaviorTracker";

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
      <BehaviorTracker />

      <Routes>
        <Route path="/" element={<Login />} />

        <Route
          path="/admin"
          element={
            <ProtectedRoute roleRequired="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/user"
          element={
            <ProtectedRoute>
              <UserDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/training"
          element={
            <ProtectedRoute>
              <Training />
            </ProtectedRoute>
          }
        />

        <Route
          path="/exam"
          element={
            <ProtectedRoute>
              <Exam />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;