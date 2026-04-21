import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function UserDashboard() {
  const navigate = useNavigate();

  const [userId, setUserId] = useState("");
  const [role, setRole] = useState("");
  const [hasBaseline, setHasBaseline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState("");
  const [statusType, setStatusType] = useState("info");

  useEffect(() => {
    const storedUser = localStorage.getItem("userId");
    const storedRole = localStorage.getItem("role");

    if (!storedUser) {
      navigate("/");
      return;
    }

    if (storedRole === "admin") {
      navigate("/admin");
      return;
    }

    setUserId(storedUser);
    setRole(storedRole || "user");
    checkBaseline(storedUser);
  }, [navigate]);

  const checkBaseline = async (username) => {
    try {
      const res = await fetch(
        `http://localhost:5000/api/training/baseline/${username}`
      );

      if (res.ok) {
        setHasBaseline(true);
        setStatusType("success");
        setStatusMessage(
          "Training completed successfully. Your baseline typing and mouse behavior are already stored."
        );
      } else {
        setHasBaseline(false);
        setStatusType("warning");
        setStatusMessage(
          "Training not completed yet. Complete the training module first to create your behavioral baseline."
        );
      }
    } catch (error) {
      console.error(error);
      setHasBaseline(false);
      setStatusType("error");
      setStatusMessage("Unable to verify training status. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("userId");
    localStorage.removeItem("role");
    localStorage.removeItem("hasBaseline");
    navigate("/");
  };

  const handleStartTraining = () => {
    navigate("/training");
  };

  const handleStartExam = () => {
    if (!hasBaseline) {
      alert("Please complete training first.");
      return;
    }
    navigate("/exam");
  };

  const statusBadgeClass =
    statusType === "success"
      ? "bg-green-100 text-green-700"
      : statusType === "warning"
      ? "bg-yellow-100 text-yellow-700"
      : statusType === "error"
      ? "bg-red-100 text-red-700"
      : "bg-blue-100 text-blue-700";

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white shadow rounded-2xl p-8">
          <p className="text-lg font-semibold">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow border p-6 mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-blue-700">User Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Welcome, <span className="font-semibold">{userId}</span>
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Role: <span className="font-medium">{role}</span>
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="bg-red-600 text-white px-5 py-3 rounded-xl hover:bg-red-700"
          >
            Logout
          </button>
        </div>

        {/* Status */}
        <div className="bg-white rounded-2xl shadow border p-6 mb-6">
          <h2 className="text-xl font-bold mb-3">Training Status</h2>
          <p className="text-gray-700 mb-4">{statusMessage}</p>

          <span className={`inline-block px-4 py-2 rounded-full text-sm font-semibold ${statusBadgeClass}`}>
            {hasBaseline ? "Baseline Available" : "Baseline Not Available"}
          </span>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {!hasBaseline && (
            <div className="bg-white rounded-2xl shadow border p-6 border-l-4 border-green-500">
              <h2 className="text-2xl font-bold text-green-700 mb-3">
                Training Module
              </h2>

              <p className="text-gray-700 mb-4">
                Complete this module so the system can collect your typing pattern
                and mouse behavior and save them in MongoDB as baseline data.
              </p>

              <div className="bg-gray-50 border rounded-xl p-4 mb-4">
                <h3 className="font-semibold mb-2">Training Includes</h3>
                <ul className="space-y-2 text-gray-700">
                  <li>• 10 MCQ tasks</li>
                  <li>• 10 sentence typing tasks</li>
                  <li>• File upload / interaction capture</li>
                  <li>• Mouse movement and click analysis</li>
                </ul>
              </div>

              <button
                onClick={handleStartTraining}
                className="bg-green-600 text-white px-5 py-3 rounded-xl hover:bg-green-700"
              >
                Start Training
              </button>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow border p-6 border-l-4 border-blue-500">
            <h2 className="text-2xl font-bold text-blue-700 mb-3">
              Exam Module
            </h2>

            <p className="text-gray-700 mb-4">
              During the exam, the system monitors your current typing and mouse
              behavior and compares it with the stored baseline to detect suspicious
              activity and fraud.
            </p>

            <div className="bg-gray-50 border rounded-xl p-4 mb-4">
              <h3 className="font-semibold mb-2">Exam Features</h3>
              <ul className="space-y-2 text-gray-700">
                <li>• MCQ and typing tasks</li>
                <li>• Rule-based fraud detection</li>
                <li>• Pattern-based user verification</li>
                <li>• Alert generation and admin reporting</li>
              </ul>
            </div>

            <button
              onClick={handleStartExam}
              disabled={!hasBaseline}
              className={`px-5 py-3 rounded-xl text-white ${
                hasBaseline
                  ? "bg-blue-600 hover:bg-blue-700"
                  : "bg-gray-400 cursor-not-allowed"
              }`}
            >
              Start Exam
            </button>
          </div>
        </div>

        {/* Info cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-white rounded-2xl shadow border p-5">
            <p className="text-sm text-gray-500">User</p>
            <h3 className="text-xl font-bold text-blue-700">{userId}</h3>
          </div>

          <div className="bg-white rounded-2xl shadow border p-5">
            <p className="text-sm text-gray-500">Current Role</p>
            <h3 className="text-xl font-bold text-purple-700">{role}</h3>
          </div>

          <div className="bg-white rounded-2xl shadow border p-5">
            <p className="text-sm text-gray-500">Baseline Status</p>
            <h3 className={`text-xl font-bold ${hasBaseline ? "text-green-700" : "text-yellow-700"}`}>
              {hasBaseline ? "Completed" : "Pending"}
            </h3>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserDashboard;