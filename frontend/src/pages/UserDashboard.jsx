import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const API = "https://continuous-authentication-system.onrender.com";

function UserDashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [baseline, setBaseline] = useState(null);
  const [examResults, setExamResults] = useState([]);
  const [analysis, setAnalysis] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loginLogs, setLoginLogs] = useState([]);
  const [loading, setLoading] = useState(true);

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
    loadDashboard(parsedUser.username);
  }, [navigate]);

  const loadDashboard = async (username) => {
    setLoading(true);

    try {
      const [baselineRes, examRes, analysisRes, alertsRes, loginRes] =
        await Promise.all([
          fetch(`${API}/api/training/baseline/${username}`).catch(() => null),
          fetch(`${API}/api/exam/results/${username}`).catch(() => null),
          fetch(`${API}/api/admin/analysis`).catch(() => null),
          fetch(`${API}/api/admin/alerts`).catch(() => null),
          fetch(`${API}/api/admin/login-logs`).catch(() => null),
        ]);

      if (baselineRes && baselineRes.ok) {
        const data = await baselineRes.json();
        setBaseline(data);

        const oldUser = JSON.parse(localStorage.getItem("user"));
        localStorage.setItem(
          "user",
          JSON.stringify({ ...oldUser, hasBaseline: true })
        );
        localStorage.setItem("hasBaseline", "true");
      } else {
        setBaseline(null);

        const oldUser = JSON.parse(localStorage.getItem("user"));
        localStorage.setItem(
          "user",
          JSON.stringify({ ...oldUser, hasBaseline: false })
        );
        localStorage.setItem("hasBaseline", "false");
      }

      if (examRes && examRes.ok) {
        const data = await examRes.json();
        setExamResults(Array.isArray(data) ? data : []);
      }

      if (analysisRes && analysisRes.ok) {
        const data = await analysisRes.json();
        setAnalysis(
          Array.isArray(data)
            ? data.filter(
                (x) =>
                  String(x.userId || "").toLowerCase() ===
                  username.toLowerCase()
              )
            : []
        );
      }

      if (alertsRes && alertsRes.ok) {
        const data = await alertsRes.json();
        setAlerts(
          Array.isArray(data)
            ? data.filter(
                (x) =>
                  String(x.userId || "").toLowerCase() ===
                  username.toLowerCase()
              )
            : []
        );
      }

      if (loginRes && loginRes.ok) {
        const data = await loginRes.json();
        setLoginLogs(
          Array.isArray(data)
            ? data.filter(
                (x) =>
                  String(x.username || "").toLowerCase() ===
                  username.toLowerCase()
              )
            : []
        );
      }
    } catch {
      alert("Unable to load dashboard data.");
    }

    setLoading(false);
  };

  const hasBaseline = Boolean(baseline);
  const latestExam = examResults[0];
  const latestAnalysis = analysis[0];
  const latestLogin = loginLogs[0];

  const riskScore = latestAnalysis?.riskScore ?? 0;
  const aiStatus = latestAnalysis?.status || "NO DATA";
  const similarity =
    typeof latestAnalysis?.similarity === "number"
      ? Math.round(latestAnalysis.similarity * 100)
      : 0;

  const trainingQuality = baseline?.qualityScore || 0;
  const warnings = latestExam?.warnings || latestAnalysis?.warningCount || 0;

  const health = useMemo(() => {
    if (!hasBaseline) return { label: "Training Required", color: "yellow" };
    if (aiStatus === "FRAUD" || riskScore >= 75)
      return { label: "Fraud Risk", color: "red" };
    if (aiStatus === "SUSPICIOUS" || riskScore >= 45)
      return { label: "Suspicious", color: "orange" };
    if (aiStatus === "GENUINE" || riskScore < 45)
      return { label: "Genuine", color: "green" };
    return { label: "Monitoring", color: "blue" };
  }, [hasBaseline, aiStatus, riskScore]);

  const handleLogout = async () => {
    localStorage.clear();
    try {
      await fetch(`${API}/api/desktop/clear-user`, { method: "POST" });
    } catch {}
    navigate("/");
  };

  const startTraining = () => {
    if (hasBaseline) {
      alert("Training already completed. Admin reset pannina mattum again training open aagum.");
      return;
    }
    navigate("/training");
  };

  const startExam = () => {
    if (!hasBaseline) {
      alert("Please complete training first.");
      return;
    }

    const ok = window.confirm(
      "Exam Instructions:\n\n1. Do not switch tabs.\n2. Do not copy-paste.\n3. Keyboard and mouse behavior will be monitored.\n4. Suspicious activity will be reported to admin.\n\nProceed to exam?"
    );

    if (ok) navigate("/exam");
  };

  const downloadReport = () => {
    if (!user?.username) return;
    window.open(`${API}/api/admin/user-report-pdf/${user.username}`, "_blank");
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="bg-white rounded-3xl shadow p-8">
          <p className="text-lg font-bold">Loading user dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="max-w-[1500px] mx-auto p-5 space-y-5">
        <header className="bg-white rounded-3xl border shadow-sm p-6">
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">
            <div>
              <p className="text-blue-600 text-xs font-black uppercase tracking-[0.25em]">
                Continuous User Authentication
              </p>

              <h1 className="text-4xl font-black mt-2">
                User Security Dashboard
              </h1>

              <p className="text-slate-600 mt-2">
                Welcome, <span className="font-black">{user.username}</span>
              </p>

              <div className="flex flex-wrap gap-2 mt-3">
                <Badge label={`Role: ${user.role}`} color="blue" />
                <Badge label={health.label} color={health.color} />
                <Badge
                  label={hasBaseline ? "Training Completed" : "Training Pending"}
                  color={hasBaseline ? "green" : "yellow"}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button onClick={() => loadDashboard(user.username)} className="btn bg-blue-600">
                Refresh
              </button>

              <button onClick={downloadReport} className="btn bg-purple-600">
                Download Report
              </button>

              <button onClick={handleLogout} className="btn bg-red-600">
                Logout
              </button>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          <Metric
            title="Training Quality"
            value={`${trainingQuality}%`}
            sub="Baseline strength"
            color="green"
          />

          <Metric
            title="Risk Score"
            value={riskScore}
            sub={aiStatus}
            color={riskScore >= 60 ? "red" : "blue"}
          />

          <Metric
            title="Similarity"
            value={`${similarity}%`}
            sub="Behavior match"
            color="purple"
          />

          <Metric
            title="Status"
            value={health.label}
            sub="AI decision"
            color={health.color}
          />

          <Metric
            title="Warnings"
            value={warnings}
            sub="Exam / AI warnings"
            color={warnings >= 3 ? "red" : "orange"}
          />

          <Metric
            title="Last Login"
            value={latestLogin ? "Active" : "N/A"}
            sub={formatIST(latestLogin?.loginAt)}
            color="slate"
          />
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <Panel title="Training Status" className="xl:col-span-2">
            {hasBaseline ? (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-3xl p-5">
                  <h2 className="text-2xl font-black text-green-700">
                    Behavioral Baseline Created Successfully
                  </h2>
                  <p className="text-green-800 mt-2">
                    Exam mode and continuous monitoring are unlocked for this user.
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Info title="Quality" value={`${baseline?.qualityScore || 0}%`} />
                  <Info title="Threshold" value={baseline?.personalThreshold || "0.60"} />
                  <Info title="Samples" value={baseline?.data?.length || baseline?.featureVectors?.length || 0} />
                  <Info title="Updated" value={formatIST(baseline?.updatedAt)} />
                </div>
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-3xl p-5">
                <h2 className="text-2xl font-black text-yellow-700">
                  Training Required
                </h2>
                <p className="text-yellow-800 mt-2">
                  Complete sentence typing, file upload and drag-drop tasks to create your behavioral baseline.
                </p>

                <button onClick={startTraining} className="mt-5 btn bg-green-600">
                  Start Training
                </button>
              </div>
            )}
          </Panel>

          <Panel title="AI Decision">
            <div className="space-y-3">
              <Info title="Decision" value={aiStatus} />
              <Info title="Risk Score" value={riskScore} />
              <Info title="Similarity" value={`${similarity}%`} />
              <Info
                title="Access"
                value={
                  health.color === "red"
                    ? "Review Required"
                    : health.color === "orange"
                    ? "Monitor Closely"
                    : "Allowed"
                }
              />
            </div>
          </Panel>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <ActionCard
            title="Exam Module"
            desc="Start monitored exam mode. Tab switch, copy-paste, focus loss and abnormal behavior will be detected."
            button={hasBaseline ? "Start Exam" : "Complete Training First"}
            color={hasBaseline ? "blue" : "gray"}
            disabled={!hasBaseline}
            onClick={startExam}
          />

          {!hasBaseline ? (
            <ActionCard
              title="Training Module"
              desc="Create your behavioral baseline using typing, file upload and drag-drop tasks."
              button="Start Training"
              color="green"
              onClick={startTraining}
            />
          ) : (
            <ActionCard
              title="Security Report"
              desc="Download your user report containing risk score, similarity, alerts, exam score and AI decision."
              button="Download My Report"
              color="purple"
              onClick={downloadReport}
            />
          )}
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <Panel title="Latest Exam Result">
            {!latestExam ? (
              <Empty text="No exam attempted yet." />
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <Badge
                      label={latestExam.result || "N/A"}
                      color={
                        latestExam.result === "PASS"
                          ? "green"
                          : latestExam.result === "FAIL"
                          ? "red"
                          : "orange"
                      }
                    />
                    <p className="text-sm text-slate-500 mt-2">
                      {formatIST(latestExam.createdAt || latestExam.submittedAt)}
                    </p>
                  </div>

                  <h2 className="text-5xl font-black text-blue-700">
                    {latestExam.scorePercent || 0}%
                  </h2>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Info title="Correct" value={latestExam.correctAnswers || 0} />
                  <Info title="Wrong" value={latestExam.wrongAnswers || 0} />
                  <Info title="Unanswered" value={latestExam.unanswered || 0} />
                  <Info title="Warnings" value={latestExam.warnings || 0} />
                </div>
              </div>
            )}
          </Panel>

          <Panel title="Recent Alerts">
            {alerts.length === 0 ? (
              <Empty text="No alerts found." />
            ) : (
              <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                {alerts.slice(0, 8).map((a, i) => (
                  <div key={i} className="border rounded-2xl p-4 bg-slate-50">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-black">{a.type || "ALERT"}</p>
                        <p className="text-sm text-slate-600 mt-1">
                          {a.message || "No message"}
                        </p>
                        <p className="text-xs text-slate-400 mt-2">
                          {formatIST(a.createdAt)}
                        </p>
                      </div>

                      <p className="font-black text-red-600">
                        Risk {a.riskScore || 0}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <Panel title="Recent AI Analysis">
            {analysis.length === 0 ? (
              <Empty text="No AI analysis logs found." />
            ) : (
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {analysis.slice(0, 10).map((a, i) => (
                  <div key={i} className="border rounded-2xl p-4 bg-slate-50">
                    <div className="flex items-center justify-between">
                      <Badge
                        label={a.status || "UNKNOWN"}
                        color={
                          a.status === "GENUINE"
                            ? "green"
                            : a.status === "FRAUD"
                            ? "red"
                            : "orange"
                        }
                      />

                      <p className="text-3xl font-black">{a.riskScore || 0}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <Info
                        title="Similarity"
                        value={
                          typeof a.similarity === "number"
                            ? `${Math.round(a.similarity * 100)}%`
                            : "N/A"
                        }
                      />
                      <Info title="Mismatch" value={a.mismatchCount || 0} />
                    </div>

                    <p className="text-xs text-slate-400 mt-3">
                      {formatIST(a.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Exam History">
            {examResults.length === 0 ? (
              <Empty text="No exam results found." />
            ) : (
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {examResults.map((r, i) => (
                  <div key={i} className="border rounded-2xl p-4 bg-slate-50">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <Badge
                          label={r.result || "N/A"}
                          color={
                            r.result === "PASS"
                              ? "green"
                              : r.result === "FAIL"
                              ? "red"
                              : "orange"
                          }
                        />
                        <p className="text-xs text-slate-400 mt-2">
                          {formatIST(r.createdAt || r.submittedAt)}
                        </p>
                      </div>

                      <p className="text-4xl font-black text-blue-700">
                        {r.scorePercent || 0}%
                      </p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
                      <Info title="Total" value={r.totalQuestions || 0} />
                      <Info title="Correct" value={r.correctAnswers || 0} />
                      <Info title="Wrong" value={r.wrongAnswers || 0} />
                      <Info title="Unanswered" value={r.unanswered || 0} />
                      <Info title="Warnings" value={r.warnings || 0} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </section>
      </div>
    </div>
  );
}

function Metric({ title, value, sub, color }) {
  const colors = {
    blue: "bg-blue-600",
    green: "bg-green-600",
    red: "bg-red-600",
    orange: "bg-orange-500",
    purple: "bg-purple-600",
    yellow: "bg-yellow-500",
    slate: "bg-slate-700",
  };

  return (
    <div className={`${colors[color] || colors.blue} text-white rounded-3xl p-5 shadow`}>
      <p className="text-white/80 text-xs font-bold uppercase">{title}</p>
      <h2 className="text-3xl font-black mt-2 break-words">{value}</h2>
      <p className="text-white/80 text-xs mt-2">{sub}</p>
    </div>
  );
}

function Panel({ title, children, className = "" }) {
  return (
    <section className={`bg-white rounded-3xl border shadow-sm p-5 ${className}`}>
      <h2 className="text-xl font-black mb-4">{title}</h2>
      {children}
    </section>
  );
}

function Info({ title, value }) {
  return (
    <div className="border rounded-2xl p-3 bg-slate-50">
      <p className="text-xs text-slate-500 uppercase">{title}</p>
      <p className="font-black mt-1 break-words">{value ?? "N/A"}</p>
    </div>
  );
}

function ActionCard({ title, desc, button, color, onClick, disabled }) {
  const colors = {
    blue: "bg-blue-600 hover:bg-blue-700",
    green: "bg-green-600 hover:bg-green-700",
    purple: "bg-purple-600 hover:bg-purple-700",
    gray: "bg-gray-400 cursor-not-allowed",
  };

  return (
    <div className="bg-white rounded-3xl border shadow-sm p-6">
      <h2 className="text-2xl font-black">{title}</h2>
      <p className="text-slate-600 mt-2 mb-5">{desc}</p>
      <button
        onClick={onClick}
        disabled={disabled}
        className={`${colors[color]} text-white px-6 py-3 rounded-2xl font-bold`}
      >
        {button}
      </button>
    </div>
  );
}

function Badge({ label, color }) {
  const colors = {
    blue: "bg-blue-100 text-blue-700",
    green: "bg-green-100 text-green-700",
    yellow: "bg-yellow-100 text-yellow-700",
    red: "bg-red-100 text-red-700",
    orange: "bg-orange-100 text-orange-700",
  };

  return (
    <span className={`inline-flex px-4 py-2 rounded-full text-xs font-black ${colors[color] || colors.blue}`}>
      {label}
    </span>
  );
}

function Empty({ text }) {
  return (
    <div className="border border-dashed rounded-2xl p-8 text-center text-slate-500 bg-slate-50">
      {text}
    </div>
  );
}

function formatIST(time) {
  if (!time) return "N/A";
  try {
    return new Date(time).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return "N/A";
  }
}

export default UserDashboard;