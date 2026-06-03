import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API = "https://continuous-authentication-system.onrender.com";

function UserDashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [hasBaseline, setHasBaseline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState("");
  const [statusType, setStatusType] = useState("info");
  const [examResults, setExamResults] = useState([]);

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
    loadExamResults(parsedUser.username);
  }, [navigate]);

  const checkBaseline = async (username) => {
    try {
      const res = await fetch(`${API}/api/training/baseline/${username}`);

      if (res.ok) {
        setHasBaseline(true);
        setStatusType("success");
        setStatusMessage("Training completed successfully. Exam and Monitor mode are unlocked.");

        const oldUser = JSON.parse(localStorage.getItem("user"));
        localStorage.setItem("user", JSON.stringify({ ...oldUser, hasBaseline: true }));
        localStorage.setItem("hasBaseline", "true");
      } else {
        setHasBaseline(false);
        setStatusType("warning");
        setStatusMessage("Training not completed yet. Complete training first to unlock exam.");

        const oldUser = JSON.parse(localStorage.getItem("user"));
        localStorage.setItem("user", JSON.stringify({ ...oldUser, hasBaseline: false }));
        localStorage.setItem("hasBaseline", "false");
      }
    } catch (error) {
      setHasBaseline(false);
      setStatusType("error");
      setStatusMessage("Unable to verify training status. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const loadExamResults = async (username) => {
    try {
      const res = await fetch(`${API}/api/exam/results/${username}`);
      const data = await res.json();

      if (res.ok) {
        setExamResults(data);
      } else {
        setExamResults([]);
      }
    } catch {
      setExamResults([]);
    }
  };

  const handleLogout = async () => {
    localStorage.removeItem("user");
    localStorage.removeItem("userId");
    localStorage.removeItem("role");
    localStorage.removeItem("hasBaseline");

    try {
      await fetch(`${API}/api/desktop/clear-user`, { method: "POST" });
    } catch {}

    navigate("/");
  };

  const handleStartTraining = () => {
    if (hasBaseline) {
      alert("Training already completed. Admin reset pannina mattum again training open aagum.");
      return;
    }
    navigate("/training");
  };

  const handleStartExam = () => {
    if (!hasBaseline) {
      alert("Please complete training first.");
      return;
    }

    const ok = window.confirm(
      "Exam Instructions:\n\n1. Do not switch tabs.\n2. Do not copy paste.\n3. Keyboard and mouse behavior will be monitored.\n4. Suspicious activity will be reported to admin.\n\nProceed to exam?"
    );

    if (ok) navigate("/exam");
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

  const latestResult = examResults[0];

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-white rounded-3xl shadow border p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
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

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 bg-white rounded-3xl shadow border p-6">
            <h2 className="text-2xl font-bold mb-3">Training Status</h2>
            <p className="text-slate-700 mb-4">{statusMessage}</p>

            <span className={`inline-block px-5 py-2 rounded-full text-sm font-bold ${statusBadgeClass}`}>
              {hasBaseline ? "Baseline Available" : "Baseline Not Available"}
            </span>
          </div>

          <div className="bg-white rounded-3xl shadow border p-6">
            <h2 className="text-2xl font-bold mb-3">Latest Exam Result</h2>

            {!latestResult ? (
              <p className="text-slate-500">No exam attempted yet.</p>
            ) : (
              <div>
                <div className="flex justify-between items-center">
                  <p className="text-lg font-bold">{latestResult.result}</p>
                  <p className="text-4xl font-black text-blue-700">
                    {latestResult.scorePercent || 0}%
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
                  <InfoBox title="Correct" value={latestResult.correctAnswers || 0} />
                  <InfoBox title="Wrong" value={latestResult.wrongAnswers || 0} />
                  <InfoBox title="Unanswered" value={latestResult.unanswered || 0} />
                  <InfoBox title="Warnings" value={latestResult.warnings || 0} />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className={`grid grid-cols-1 ${hasBaseline ? "lg:grid-cols-1" : "lg:grid-cols-2"} gap-6`}>
          {!hasBaseline && (
            <div className="bg-white rounded-3xl shadow border p-6 border-l-4 border-green-500">
              <h2 className="text-3xl font-bold text-green-700 mb-3">Training Module</h2>
              <p className="text-slate-700 mb-4">
                Complete MCQ, typing, file and drag tasks to create your behavior baseline.
              </p>
              <button
                onClick={handleStartTraining}
                className="px-6 py-3 rounded-2xl text-white font-bold bg-green-700 hover:bg-green-800"
              >
                Start Training
              </button>
            </div>
          )}

          <div className={`bg-white rounded-3xl shadow border p-6 border-l-4 ${hasBaseline ? "border-blue-500" : "border-gray-400"}`}>
            <h2 className="text-3xl font-bold text-blue-700 mb-3">Exam Module</h2>
            <p className="text-slate-700 mb-4">
              Exam is allowed only after completing training and creating a behavioral baseline.
            </p>

            {!hasBaseline && (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-2xl p-4 mb-5 font-semibold">
                Exam Locked: Complete Training First
              </div>
            )}

            <button
              onClick={handleStartExam}
              disabled={!hasBaseline}
              className={`px-6 py-3 rounded-2xl text-white font-bold ${
                hasBaseline ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-400 cursor-not-allowed"
              }`}
            >
              {hasBaseline ? "Start Exam" : "Complete Training First"}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow border p-6">
          <h2 className="text-2xl font-bold mb-5">My Exam Results</h2>

          {examResults.length === 0 ? (
            <p className="text-slate-500">No exam results found.</p>
          ) : (
            <div className="space-y-4">
              {examResults.map((r, i) => (
                <div key={i} className="border rounded-3xl p-5 bg-slate-50">
                  <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
                    <div>
                      <h3 className="text-xl font-bold">{r.result}</h3>
                      <p className="text-sm text-slate-500">{formatIST(r.createdAt || r.submittedAt)}</p>
                    </div>

                    <p className="text-4xl font-black text-blue-700">
                      {r.scorePercent || 0}%
                    </p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-5">
                    <InfoBox title="Total" value={r.totalQuestions || 0} />
                    <InfoBox title="Correct" value={r.correctAnswers || 0} />
                    <InfoBox title="Wrong" value={r.wrongAnswers || 0} />
                    <InfoBox title="Unanswered" value={r.unanswered || 0} />
                    <InfoBox title="Warnings" value={r.warnings || 0} />
                  </div>

                  {Array.isArray(r.answers) && r.answers.length > 0 && (
                    <details className="mt-5">
                      <summary className="font-bold cursor-pointer text-blue-700">
                        View Answer Details
                      </summary>

                      <div className="mt-4 space-y-3">
                        {r.answers.map((a, idx) => (
                          <div
                            key={idx}
                            className={`rounded-2xl border p-4 ${
                              a.isCorrect ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
                            }`}
                          >
                            <p className="font-semibold">
                              {a.questionNo}. {a.question}
                            </p>
                            <p className="text-sm mt-2">Your Answer: {a.selectedAnswer}</p>
                            <p className="text-sm">Correct Answer: {a.correctAnswer}</p>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoBox({ title, value }) {
  return (
    <div className="bg-white border rounded-2xl p-3">
      <p className="text-xs text-slate-500">{title}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}

function formatIST(time) {
  if (!time) return "N/A";
  return new Date(time).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default UserDashboard;
