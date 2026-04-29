import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function UserDashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [hasBaseline, setHasBaseline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState("");
  const [statusType, setStatusType] = useState("info");

  useEffect(() => {
    const storedUser = localStorage.getItem("user");

    if (!storedUser) {
      navigate("/");
      return;
    }

    const parsedUser = JSON.parse(storedUser);

    if (parsedUser.role === "admin") {
      navigate("/admin");
      return;
    }

    setUser(parsedUser);
    checkBaseline(parsedUser.username);
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

        const oldUser = JSON.parse(localStorage.getItem("user"));
        localStorage.setItem(
          "user",
          JSON.stringify({ ...oldUser, hasBaseline: true })
        );
      } else {
        setHasBaseline(false);
        setStatusType("warning");
        setStatusMessage(
          "Training not completed yet. Complete the training module first. Exam module is visible but locked until training is completed."
        );
      }
    } catch (error) {
      setHasBaseline(false);
      setStatusType("error");
      setStatusMessage("Unable to verify training status. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    localStorage.removeItem("user");

    try {
      await fetch("http://localhost:5000/api/desktop/clear-user", {
        method: "POST",
      });
    } catch (error) {}

    navigate("/");
  };

  const handleStartTraining = () => {
    navigate("/training");
  };

  const handleStartExam = () => {
    if (!hasBaseline) {
      alert("Please complete training first. Exam is locked until baseline is created.");
      return;
    }

    const ok = window.confirm(
      "Exam Instructions:\n\n1. Do not switch tabs.\n2. Do not copy paste.\n3. Keyboard and mouse behavior will be monitored.\n4. Suspicious activity will be reported to admin.\n\nProceed to exam?"
    );

    if (ok) {
      navigate("/exam");
    }
  };

  const statusBadgeClass =
    statusType === "success"
      ? "bg-green-100 text-green-700"
      : statusType === "warning"
      ? "bg-yellow-100 text-yellow-700"
      : statusType === "error"
      ? "bg-red-100 text-red-700"
      : "bg-blue-100 text-blue-700";

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="bg-white shadow rounded-3xl p-8">
          <p className="text-lg font-semibold">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-3xl shadow border p-6 mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-blue-700">User Dashboard</h1>
            <p className="text-slate-600 mt-2">
              Welcome, <span className="font-semibold">{user.username}</span>
            </p>
            <p className="text-sm text-slate-500 mt-1">
              Role: <span className="font-medium">{user.role}</span>
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="bg-red-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-red-700"
          >
            Logout
          </button>
        </div>

        <div className="bg-white rounded-3xl shadow border p-6 mb-6">
          <h2 className="text-2xl font-bold mb-3">Training Status</h2>
          <p className="text-slate-700 mb-4">{statusMessage}</p>

          <span className={`inline-block px-5 py-2 rounded-full text-sm font-bold ${statusBadgeClass}`}>
            {hasBaseline ? "Baseline Available" : "Baseline Not Available"}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl shadow border p-6 border-l-4 border-green-500">
            <h2 className="text-3xl font-bold text-green-700 mb-3">
              Training Module
            </h2>

            <p className="text-slate-700 mb-4">
              This module collects your typing rhythm, key hold time, mouse movement,
              clicks, scrolls, and behavior pattern to create your personal baseline.
            </p>

            <div className="bg-slate-50 border rounded-2xl p-4 mb-5">
              <h3 className="font-bold mb-2">Training Instructions</h3>
              <ul className="space-y-2 text-slate-700">
                <li>• Type naturally without copying text.</li>
                <li>• Complete 20–30 good samples.</li>
                <li>• Use mouse movement, clicks, scroll, and drag normally.</li>
                <li>• After training completion, logout and login again.</li>
              </ul>
            </div>

            <button
              onClick={handleStartTraining}
              className={`px-6 py-3 rounded-2xl text-white font-bold ${
                hasBaseline
                  ? "bg-green-500 hover:bg-green-600"
                  : "bg-green-700 hover:bg-green-800"
              }`}
            >
              {hasBaseline ? "Retrain / Improve Baseline" : "Start Training"}
            </button>
          </div>

          <div className={`bg-white rounded-3xl shadow border p-6 border-l-4 ${
            hasBaseline ? "border-blue-500" : "border-gray-400"
          }`}>
            <h2 className="text-3xl font-bold text-blue-700 mb-3">
              Exam Module
            </h2>

            <p className="text-slate-700 mb-4">
              Exam module is visible for all users, but exam writing is allowed
              only after completing training and creating a behavioral baseline.
            </p>

            <div className="bg-slate-50 border rounded-2xl p-4 mb-5">
              <h3 className="font-bold mb-2">Exam Instructions</h3>
              <ul className="space-y-2 text-slate-700">
                <li>• MCQ and typing tasks will be monitored.</li>
                <li>• Tab switch and copy-paste are treated as suspicious.</li>
                <li>• Your live behavior is compared with stored baseline.</li>
                <li>• Alerts and reports are sent to admin dashboard.</li>
              </ul>
            </div>

            {!hasBaseline && (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-2xl p-4 mb-5 font-semibold">
                Exam Locked: Complete Training First
              </div>
            )}

            <button
              onClick={handleStartExam}
              disabled={!hasBaseline}
              className={`px-6 py-3 rounded-2xl text-white font-bold ${
                hasBaseline
                  ? "bg-blue-600 hover:bg-blue-700"
                  : "bg-gray-400 cursor-not-allowed"
              }`}
            >
              {hasBaseline ? "Start Exam" : "Complete Training First"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <InfoCard title="User" value={user.username} color="text-blue-700" />
          <InfoCard title="Current Role" value={user.role} color="text-purple-700" />
          <InfoCard
            title="Baseline Status"
            value={hasBaseline ? "Completed" : "Pending"}
            color={hasBaseline ? "text-green-700" : "text-yellow-700"}
          />
        </div>
      </div>
    </div>
  );
}

function InfoCard({ title, value, color }) {
  return (
    <div className="bg-white rounded-3xl shadow border p-5">
      <p className="text-sm text-slate-500">{title}</p>
      <h3 className={`text-xl font-bold ${color}`}>{value}</h3>
    </div>
  );
}

export default UserDashboard;