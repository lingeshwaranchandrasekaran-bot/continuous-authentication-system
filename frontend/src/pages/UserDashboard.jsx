import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function UserDashboard() {
  const navigate = useNavigate();

  const [userId, setUserId] = useState("");
  const [hasBaseline, setHasBaseline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    const storedUser = localStorage.getItem("userId");

    if (!storedUser) {
      navigate("/");
      return;
    }

    setUserId(storedUser);
    checkBaseline(storedUser);
  }, [navigate]);

  const checkBaseline = async (username) => {
    try {
      const res = await fetch(
        `http://localhost:5000/api/training/baseline/${username}`
      );

      if (res.ok) {
        setHasBaseline(true);
        setStatusMessage(
          "Training already completed. You can continue to the exam module."
        );
      } else {
        setHasBaseline(false);
        setStatusMessage(
          "Training not completed yet. Complete training first to create your behavioral baseline."
        );
      }
    } catch (error) {
      console.error(error);
      setHasBaseline(false);
      setStatusMessage(
        "Unable to verify training status. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("userId");
    navigate("/");
  };

  const handleStartTraining = () => {
    navigate("/training");
  };

  const handleStartExam = () => {
    if (!hasBaseline) {
      alert("Complete training first.");
      return;
    }
    navigate("/exam");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white shadow rounded-xl p-8">
          <p className="text-lg font-semibold">Loading user dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <h1 className="text-3xl font-bold text-blue-700 mb-2">
            User Dashboard
          </h1>
          <p className="text-gray-700">
            Welcome, <span className="font-semibold">{userId}</span>
          </p>
        </div>

        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-3">Training Status</h2>
          <p className="text-gray-700 mb-3">{statusMessage}</p>

          <div className="inline-block px-4 py-2 rounded-full text-sm font-semibold bg-gray-100">
            {hasBaseline ? "Baseline Available" : "Baseline Not Available"}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {!hasBaseline && (
            <div className="bg-white rounded-xl shadow p-6 border-l-4 border-green-500">
              <h2 className="text-2xl font-bold text-green-700 mb-3">
                Training Module
              </h2>
              <p className="text-gray-700 mb-4">
                Complete the training tasks so the system can collect your
                keystroke dynamics and mouse behavior and store your baseline
                pattern in MongoDB.
              </p>

              <ul className="text-gray-700 mb-4 space-y-2">
                <li>• 10 MCQ tasks</li>
                <li>• 10 sentence typing tasks</li>
                <li>• 3 file upload tasks</li>
                <li>• 2 drag interaction tasks</li>
              </ul>

              <button
                onClick={handleStartTraining}
                className="bg-green-600 text-white px-5 py-2 rounded hover:bg-green-700"
              >
                Start Training
              </button>
            </div>
          )}

          <div className="bg-white rounded-xl shadow p-6 border-l-4 border-blue-500">
            <h2 className="text-2xl font-bold text-blue-700 mb-3">
              Exam Module
            </h2>
            <p className="text-gray-700 mb-4">
              This module continuously monitors your typing and mouse behavior
              during the exam and compares it with your stored baseline to
              detect fraud and user mismatch.
            </p>

            <ul className="text-gray-700 mb-4 space-y-2">
              <li>• 10 MCQ questions</li>
              <li>• 10 sentence typing tasks</li>
              <li>• Rule-based fraud detection</li>
              <li>• Pattern-based user verification</li>
            </ul>

            <button
              onClick={handleStartExam}
              disabled={!hasBaseline}
              className={`px-5 py-2 rounded text-white ${
                hasBaseline
                  ? "bg-blue-600 hover:bg-blue-700"
                  : "bg-gray-400 cursor-not-allowed"
              }`}
            >
              Start Exam
            </button>
          </div>
        </div>

        <div className="mt-6">
          <button
            onClick={handleLogout}
            className="bg-red-600 text-white px-5 py-2 rounded hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}

export default UserDashboard;