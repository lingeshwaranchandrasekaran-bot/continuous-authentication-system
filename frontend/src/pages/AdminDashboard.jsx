import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const API = "https://continuous-authentication-system.onrender.com";

const navItems = [
  { label: "Overview", value: "dashboard" },
  { label: "Users", value: "users" },
  { label: "Activity", value: "activity" },
  { label: "Alerts", value: "alerts" },
  { label: "Reports", value: "reports" },
  { label: "Login Logs", value: "logins" },
];

function AdminDashboard() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("dashboard");
  const [loading, setLoading] = useState(false);

  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [analysis, setAnalysis] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loginLogs, setLoginLogs] = useState([]);

  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedUserData, setSelectedUserData] = useState(null);

  const [userSearch, setUserSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("ALL");

  const [showCreate, setShowCreate] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("user");

  useEffect(() => {
    const role = localStorage.getItem("role");
    if (role !== "admin") {
      navigate("/");
      return;
    }

    loadAll();
    const timer = setInterval(loadAll, 30000);
    return () => clearInterval(timer);
  }, [navigate]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes, reportsRes, analysisRes, alertsRes, logsRes] =
        await Promise.all([
          fetch(`${API}/api/admin/stats`),
          fetch(`${API}/api/admin/users`),
          fetch(`${API}/api/admin/reports`),
          fetch(`${API}/api/admin/analysis`),
          fetch(`${API}/api/admin/alerts`),
          fetch(`${API}/api/admin/login-logs`),
        ]);

      setStats(await statsRes.json());
      setUsers(await usersRes.json());
      setReports(await reportsRes.json());
      setAnalysis(await analysisRes.json());
      setAlerts(await alertsRes.json());
      setLoginLogs(await logsRes.json());
    } catch {
      alert("Failed to load admin dashboard data");
    }
    setLoading(false);
  };

  const logout = async () => {
    localStorage.clear();
    try {
      await fetch(`${API}/api/desktop/clear-user`, { method: "POST" });
    } catch {}
    navigate("/");
  };

  const latestAnalysisOf = (username) =>
    analysis.find(
      (a) =>
        String(a.userId || "").toLowerCase() ===
        String(username || "").toLowerCase()
    );

  const riskOf = (username) => latestAnalysisOf(username)?.status || "NO DATA";

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const username = String(u.username || "");
      const risk = riskOf(username);

      const matchSearch = username
        .toLowerCase()
        .includes(userSearch.toLowerCase());

      const matchRisk =
        riskFilter === "ALL" ||
        riskFilter === risk ||
        (riskFilter === "BLOCKED" && u.isBlocked);

      return matchSearch && matchRisk;
    });
  }, [users, userSearch, riskFilter, analysis]);

  const loadUserDetails = async (username) => {
    try {
      const res = await fetch(`${API}/api/admin/user-details/${username}`);
      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Failed to load user details");
        return;
      }

      setSelectedUser(username);
      setSelectedUserData(data);
    } catch {
      alert("Failed to load user details");
    }
  };

  const createUser = async () => {
    if (!newUsername || !newPassword) {
      alert("Enter username and password");
      return;
    }

    const res = await fetch(`${API}/api/admin/create-user`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: newUsername, password: newPassword, role: newRole }),
    });

    const data = await res.json();
    if (!res.ok) return alert(data.error || "User creation failed");

    alert("User created successfully");
    setNewUsername("");
    setNewPassword("");
    setNewRole("user");
    setShowCreate(false);
    loadAll();
  };

  const blockUser = async (username) => {
    const res = await fetch(`${API}/api/admin/block-user/${username}`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) return alert(data.error || "Block failed");

    alert("User blocked successfully");
    await loadAll();
    loadUserDetails(username);
  };

  const unblockUser = async (username) => {
    const res = await fetch(`${API}/api/admin/unblock-user/${username}`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) return alert(data.error || "Unblock failed");

    alert("User unblocked successfully");
    await loadAll();
    loadUserDetails(username);
  };

  const resetTraining = async (username) => {
    if (!window.confirm(`Reset training baseline for ${username}?`)) return;

    const res = await fetch(`${API}/api/admin/reset-training/${username}`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) return alert(data.error || "Training reset failed");

    alert("Training reset successful");
    await loadAll();
    loadUserDetails(username);
  };

  const resetWarnings = async (username) => {
    const res = await fetch(`${API}/api/admin/reset-warnings/${username}`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) return alert(data.error || "Warning reset failed");

    alert("Warnings reset successful");
    await loadAll();
    loadUserDetails(username);
  };

  const deleteUser = async (username) => {
    if (!window.confirm(`Delete user "${username}"?`)) return;

    const res = await fetch(`${API}/api/admin/delete-user/${username}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) return alert(data.error || "Delete failed");

    alert("User deleted successfully");
    setSelectedUser(null);
    setSelectedUserData(null);
    loadAll();
  };

  const downloadPDF = (username) => {
    window.open(`${API}/api/admin/user-report-pdf/${username}`, "_blank");
  };

  const selectedUserObj = selectedUserData?.user;
  const selectedTraining = selectedUserData?.training || {};
  const selectedDecision = selectedUserData?.decisionState || {};
  const selectedReports = selectedUserData?.reports || [];
  const selectedAlerts = selectedUserData?.alerts || [];
  const selectedAnalysis = selectedUserData?.analysis || [];

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="flex min-h-screen">
        <aside className="hidden lg:flex w-72 bg-white border-r border-slate-200 p-5 flex-col">
          <div className="mb-7">
            <div className="h-12 w-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-xl">
              C
            </div>
            <h1 className="text-2xl font-black mt-4">CUA Admin</h1>
            <p className="text-slate-500 text-sm mt-1">Security Monitoring Console</p>
          </div>

          <div className="space-y-2">
            {navItems.map((item) => (
              <button
                key={item.value}
                onClick={() => setActiveTab(item.value)}
                className={`w-full text-left rounded-2xl px-4 py-3 font-bold transition ${
                  activeTab === item.value
                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                    : "text-slate-600 hover:bg-slate-100 border border-transparent"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="mt-auto space-y-3">
            <button onClick={() => setShowCreate(true)} className="side-btn bg-green-600">
              + Add User
            </button>
            <button onClick={loadAll} className="side-btn bg-blue-600">
              {loading ? "Refreshing..." : "Refresh"}
            </button>
            <button onClick={logout} className="side-btn bg-red-600">
              Logout
            </button>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[1600px] mx-auto p-4 lg:p-6 space-y-5">
            <header className="bg-white border rounded-3xl p-5 shadow-sm">
              <h1 className="text-3xl font-black text-blue-700">
                Continuous Authentication Admin
              </h1>
              <p className="text-slate-500 mt-1">
                User control, risk monitoring, reports, alerts and behavior analytics
              </p>

              <div className="lg:hidden flex gap-2 overflow-x-auto mt-4">
                {navItems.map((item) => (
                  <button
                    key={item.value}
                    onClick={() => setActiveTab(item.value)}
                    className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap ${
                      activeTab === item.value
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </header>

            {showCreate && (
              <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-xl">
                  <h2 className="text-2xl font-black mb-4">Create User</h2>
                  <div className="space-y-3">
                    <Input placeholder="Username" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} />
                    <Input placeholder="Password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                    <select value={newRole} onChange={(e) => setNewRole(e.target.value)} className="input">
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>

                    <div className="flex gap-2">
                      <button onClick={createUser} className="modal-btn bg-blue-600">
                        Create
                      </button>
                      <button onClick={() => setShowCreate(false)} className="modal-btn bg-slate-700">
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "dashboard" && (
              <>
                <section className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
                  <Stat title="Users" value={stats.totalUsers || 0} color="blue" />
                  <Stat title="Reports" value={stats.totalReports || 0} color="green" />
                  <Stat title="Alerts" value={stats.totalAlerts || 0} color="red" />
                  <Stat title="Fraud" value={stats.fraudCount || 0} color="red" />
                  <Stat title="Suspicious" value={stats.suspiciousCount || 0} color="orange" />
                  <Stat title="Genuine" value={stats.genuineCount || 0} color="green" />
                  <Stat title="Blocked" value={stats.blockedUsers || 0} color="red" />
                  <Stat title="Sessions" value={stats.behaviorSessions || 0} color="purple" />
                </section>

                <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  <Panel title="Recent Alerts">
                    <CompactList
                      items={alerts.slice(0, 8)}
                      empty="No alerts found"
                      render={(a, i) => (
                        <Row key={i}>
                          <div>
                            <p className="font-black">{a.userId || "N/A"}</p>
                            <p className="text-sm text-slate-600">{a.type}</p>
                            <p className="text-xs text-slate-400">{formatIST(a.createdAt)}</p>
                          </div>
                          <p className="font-black text-red-600">Risk {a.riskScore || 0}</p>
                        </Row>
                      )}
                    />
                  </Panel>

                  <Panel title="Recent Reports">
                    <CompactList
                      items={reports.slice(0, 8)}
                      empty="No reports found"
                      render={(r, i) => (
                        <Row key={i}>
                          <div>
                            <p className="font-black">{r.userId || "N/A"}</p>
                            <p className="text-xs text-slate-400">
                              {formatIST(r.createdAt || r.submittedAt)}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge label={r.result || "N/A"} type={r.result} />
                            <p className="font-black text-blue-700 mt-1">{r.scorePercent || 0}%</p>
                          </div>
                        </Row>
                      )}
                    />
                  </Panel>
                </section>
              </>
            )}

            {activeTab === "users" && (
              <section className="grid grid-cols-1 xl:grid-cols-12 gap-4">
                <div className="xl:col-span-4 space-y-4">
                  <Panel title="Search & Filter">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 gap-2">
                      <Input
                        placeholder="Search user..."
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                      />
                      <select value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)} className="input">
                        <option value="ALL">All Users</option>
                        <option value="GENUINE">Genuine Users</option>
                        <option value="SUSPICIOUS">Suspicious Users</option>
                        <option value="FRAUD">Fraud Users</option>
                        <option value="BLOCKED">Blocked Users</option>
                        <option value="NO DATA">No Data</option>
                      </select>
                    </div>
                  </Panel>

                  <Panel title={`Users (${filteredUsers.length})`}>
                    <div className="space-y-2 max-h-[650px] overflow-y-auto pr-1">
                      {filteredUsers.length === 0 && <Empty text="No users found" />}

                      {filteredUsers.map((u) => {
                        const risk = riskOf(u.username);
                        const latest = latestAnalysisOf(u.username);

                        return (
                          <button
                            key={u.username}
                            onClick={() => loadUserDetails(u.username)}
                            className={`w-full text-left border rounded-2xl p-4 transition ${
                              selectedUser === u.username
                                ? "bg-blue-50 border-blue-400"
                                : "bg-white hover:bg-slate-50"
                            }`}
                          >
                            <div className="flex justify-between gap-2">
                              <div className="min-w-0">
                                <h3 className="font-black truncate">{u.username}</h3>
                                <p className="text-xs text-slate-500 uppercase">{u.role}</p>
                              </div>
                              <Badge label={u.isBlocked ? "BLOCKED" : risk} type={u.isBlocked ? "FRAUD" : risk} />
                            </div>

                            <div className="grid grid-cols-3 gap-2 mt-3">
                              <Mini title="Train" value={u.hasBaseline ? "Yes" : "No"} />
                              <Mini title="Risk" value={latest?.riskScore ?? 0} />
                              <Mini title="Status" value={u.isBlocked ? "Blocked" : "Active"} />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </Panel>
                </div>

                <div className="xl:col-span-8 space-y-4">
                  {!selectedUserObj ? (
                    <Panel title="User Details">
                      <Empty text="Select a user to view details, actions and analytics" />
                    </Panel>
                  ) : (
                    <>
                      <Panel title="Selected User Control">
                        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
                          <div>
                            <h2 className="text-3xl font-black">{selectedUserObj.username}</h2>
                            <div className="flex flex-wrap gap-2 mt-2">
                              <Badge label={selectedUserObj.role} type="INFO" />
                              <Badge
                                label={selectedUserObj.isBlocked ? "BLOCKED" : "ACTIVE"}
                                type={selectedUserObj.isBlocked ? "FRAUD" : "GENUINE"}
                              />
                              <Badge
                                label={selectedTraining.status === "COMPLETED" ? "TRAINED" : "TRAINING PENDING"}
                                type={selectedTraining.status === "COMPLETED" ? "GENUINE" : "SUSPICIOUS"}
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">
                            <Action label="PDF" color="purple" onClick={() => downloadPDF(selectedUserObj.username)} />
                            {selectedUserObj.isBlocked ? (
                              <Action label="Unblock" color="green" onClick={() => unblockUser(selectedUserObj.username)} />
                            ) : (
                              <Action label="Block" color="red" onClick={() => blockUser(selectedUserObj.username)} />
                            )}
                            <Action label="Reset Train" color="blue" onClick={() => resetTraining(selectedUserObj.username)} />
                            <Action label="Reset Warn" color="orange" onClick={() => resetWarnings(selectedUserObj.username)} />
                            <Action label="Delete" color="dark" onClick={() => deleteUser(selectedUserObj.username)} />
                            <Action label="Reload" color="slate" onClick={() => loadUserDetails(selectedUserObj.username)} />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
                          <Info title="Risk Score" value={selectedAnalysis[0]?.riskScore ?? 0} />
                          <Info title="AI Status" value={selectedAnalysis[0]?.status || "N/A"} />
                          <Info
                            title="Similarity"
                            value={
                              typeof selectedAnalysis[0]?.similarity === "number"
                                ? `${Math.round(selectedAnalysis[0].similarity * 100)}%`
                                : "N/A"
                            }
                          />
                          <Info title="Warnings" value={`${selectedDecision.warningCount || 0}/5`} />
                        </div>
                      </Panel>

                      <AnalyticsPanel username={selectedUserObj.username} />

                      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <Panel title="Training Summary">
                          <div className="grid grid-cols-2 gap-3">
                            <Info title="Status" value={selectedTraining.status || "Not Completed"} />
                            <Info title="Quality" value={`${selectedTraining.qualityScore || 0}%`} />
                            <Info title="Threshold" value={selectedTraining.personalThreshold || "0.60"} />
                            <Info title="Samples" value={selectedTraining.data?.length || selectedTraining.featureVectors?.length || 0} />
                          </div>
                        </Panel>

                        <Panel title="Latest Exam">
                          {selectedReports.length === 0 ? (
                            <Empty text="No exam report" />
                          ) : (
                            <div className="grid grid-cols-2 gap-3">
                              <Info title="Result" value={selectedReports[0].result || "N/A"} />
                              <Info title="Score" value={`${selectedReports[0].scorePercent || 0}%`} />
                              <Info title="Correct" value={selectedReports[0].correctAnswers || 0} />
                              <Info title="Warnings" value={selectedReports[0].warnings || 0} />
                            </div>
                          )}
                        </Panel>
                      </section>

                      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <Panel title="User Alerts">
                          <CompactList
                            items={selectedAlerts.slice(0, 8)}
                            empty="No alerts"
                            render={(a, i) => (
                              <Row key={i}>
                                <div>
                                  <p className="font-black">{a.type || "ALERT"}</p>
                                  <p className="text-sm text-slate-600">{a.message || "No message"}</p>
                                  <p className="text-xs text-slate-400">{formatIST(a.createdAt)}</p>
                                </div>
                                <p className="font-black text-red-600">Risk {a.riskScore || 0}</p>
                              </Row>
                            )}
                          />
                        </Panel>

                        <Panel title="AI Analysis">
                          <CompactList
                            items={selectedAnalysis.slice(0, 8)}
                            empty="No analysis"
                            render={(a, i) => (
                              <Row key={i}>
                                <div>
                                  <Badge label={a.status || "UNKNOWN"} type={a.status} />
                                  <p className="text-xs text-slate-500 mt-1">{formatIST(a.createdAt)}</p>
                                </div>
                                <div className="text-right">
                                  <p className="font-black text-3xl">{a.riskScore || 0}</p>
                                  <p className="text-xs text-slate-500">Risk</p>
                                </div>
                              </Row>
                            )}
                          />
                        </Panel>
                      </section>
                    </>
                  )}
                </div>
              </section>
            )}

            {activeTab === "activity" && (
              <Panel title="AI Activity Logs">
                <CompactList
                  items={analysis}
                  empty="No activity logs"
                  render={(a, i) => (
                    <Row key={i}>
                      <div>
                        <p className="font-black">{a.userId || "N/A"}</p>
                        <Badge label={a.status || "UNKNOWN"} type={a.status} />
                        <p className="text-xs text-slate-400 mt-1">{formatIST(a.createdAt)}</p>
                      </div>
                      <p className="font-black text-2xl">{a.riskScore || 0}</p>
                    </Row>
                  )}
                />
              </Panel>
            )}

            {activeTab === "alerts" && (
              <Panel title="Security Alerts">
                <CompactList
                  items={alerts}
                  empty="No alerts"
                  render={(a, i) => (
                    <Row key={i}>
                      <div>
                        <p className="font-black">{a.userId || "N/A"}</p>
                        <p className="text-sm text-slate-600">{a.type}</p>
                        <p className="text-xs text-slate-400">{formatIST(a.createdAt)}</p>
                      </div>
                      <p className="font-black text-red-600">Risk {a.riskScore || 0}</p>
                    </Row>
                  )}
                />
              </Panel>
            )}

            {activeTab === "reports" && (
              <Panel title="Exam Reports">
                <CompactList
                  items={reports}
                  empty="No reports"
                  render={(r, i) => (
                    <Row key={i}>
                      <div>
                        <p className="font-black">{r.userId || "N/A"}</p>
                        <p className="text-xs text-slate-400">{formatIST(r.createdAt || r.submittedAt)}</p>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-center">
                        <Mini title="Score" value={`${r.scorePercent || 0}%`} />
                        <Mini title="Correct" value={r.correctAnswers || 0} />
                        <Mini title="Wrong" value={r.wrongAnswers || 0} />
                        <Mini title="Warn" value={r.warnings || 0} />
                      </div>
                    </Row>
                  )}
                />
              </Panel>
            )}

            {activeTab === "logins" && (
              <Panel title="Login Logs">
                <CompactList
                  items={loginLogs}
                  empty="No login logs"
                  render={(l, i) => (
                    <Row key={i}>
                      <div>
                        <p className="font-black">{l.username || "N/A"}</p>
                        <p className="text-xs text-slate-500">{l.role}</p>
                      </div>
                      <p className="text-sm text-slate-500">{formatIST(l.loginAt)}</p>
                    </Row>
                  )}
                />
              </Panel>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function AnalyticsPanel({ username }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!username) return;

    fetch(`${API}/api/admin/user-analytics/${username}`)
      .then((res) => res.json())
      .then((d) => setData(d))
      .catch(() => setData(null));
  }, [username]);

  if (!data) {
    return (
      <Panel title="Behavior Analytics">
        <Empty text="Loading analytics..." />
      </Panel>
    );
  }

  const metrics = data.metrics || {};
  const warnings = data.warnings || {};

  return (
    <Panel title="Behavior Analytics">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Info title="Latest Risk" value={metrics.latestRisk || 0} />
        <Info title="Similarity" value={`${metrics.latestSimilarity || 0}%`} />
        <Info title="Status" value={metrics.latestStatus || "NO DATA"} />
        <Info title="Sessions" value={metrics.sessions || 0} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TrendBox title="Risk Trend" items={data.riskTrend || []} color="red" suffix="" />
        <TrendBox title="Similarity Trend" items={data.similarityTrend || []} color="green" suffix="%" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <div className="border rounded-2xl p-4 bg-slate-50">
          <h3 className="font-black mb-3">Warning Breakdown</h3>
          {Object.keys(warnings).length === 0 ? (
            <p className="text-slate-500 text-sm">No warnings</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(warnings).map(([key, value]) => (
                <div key={key} className="flex justify-between border-b pb-1">
                  <span className="text-sm font-bold">{key}</span>
                  <span className="font-black">{value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border rounded-2xl p-4 bg-slate-50">
          <h3 className="font-black mb-3">Behavior Metrics</h3>
          <div className="grid grid-cols-3 gap-2">
            <Mini title="Keys" value={metrics.avgKeys || 0} />
            <Mini title="Mouse" value={metrics.avgMouse || 0} />
            <Mini title="Clicks" value={metrics.avgClicks || 0} />
          </div>
        </div>
      </div>
    </Panel>
  );
}

function TrendBox({ title, items, color, suffix }) {
  const barColor = color === "red" ? "bg-red-500" : "bg-green-500";

  return (
    <div className="border rounded-2xl p-4 bg-slate-50">
      <h3 className="font-black mb-3">{title}</h3>
      <div className="space-y-2">
        {items.length === 0 ? (
          <p className="text-sm text-slate-500">No trend data</p>
        ) : (
          items.slice(-8).map((r, i) => (
            <div key={i}>
              <div className="flex justify-between text-xs font-bold">
                <span>{r.status || title}</span>
                <span>{r.value}{suffix}</span>
              </div>
              <div className="h-2 bg-white rounded-full overflow-hidden">
                <div className={`h-full ${barColor}`} style={{ width: `${Math.min(r.value, 100)}%` }} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Stat({ title, value, color }) {
  const colors = {
    blue: "bg-blue-600",
    green: "bg-green-600",
    red: "bg-red-600",
    orange: "bg-orange-500",
    purple: "bg-purple-600",
  };

  return (
    <div className={`${colors[color] || colors.blue} text-white rounded-2xl p-4 shadow-sm`}>
      <p className="text-xs text-white/80 font-bold uppercase">{title}</p>
      <h2 className="text-3xl font-black mt-1">{value}</h2>
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <section className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
      <h2 className="text-xl font-black mb-4">{title}</h2>
      {children}
    </section>
  );
}

function Input(props) {
  return <input {...props} className="input" />;
}

function Info({ title, value }) {
  return (
    <div className="border border-slate-200 rounded-2xl p-3 bg-slate-50">
      <p className="text-xs text-slate-500 uppercase">{title}</p>
      <p className="font-black mt-1 break-words">{value ?? "N/A"}</p>
    </div>
  );
}

function Mini({ title, value }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-2">
      <p className="text-[10px] text-slate-500">{title}</p>
      <p className="font-black truncate">{value}</p>
    </div>
  );
}

function Badge({ label, type }) {
  const cls =
    type === "GENUINE" || type === "PASS" || type === "ACTIVE"
      ? "bg-green-100 text-green-700"
      : type === "FRAUD" || type === "FAIL" || type === "BLOCKED"
      ? "bg-red-100 text-red-700"
      : type === "SUSPICIOUS" || type === "REVIEW"
      ? "bg-orange-100 text-orange-700"
      : "bg-blue-100 text-blue-700";

  return (
    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-black ${cls}`}>
      {label}
    </span>
  );
}

function Action({ label, color, onClick }) {
  const colors = {
    purple: "bg-purple-600 hover:bg-purple-700",
    green: "bg-green-600 hover:bg-green-700",
    red: "bg-red-600 hover:bg-red-700",
    blue: "bg-blue-600 hover:bg-blue-700",
    orange: "bg-orange-500 hover:bg-orange-600",
    dark: "bg-slate-800 hover:bg-slate-900",
    slate: "bg-slate-500 hover:bg-slate-600",
  };

  return (
    <button onClick={onClick} className={`${colors[color] || colors.blue} text-white px-3 py-2 rounded-xl text-sm font-bold`}>
      {label}
    </button>
  );
}

function Row({ children }) {
  return (
    <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 flex items-center justify-between gap-4">
      {children}
    </div>
  );
}

function CompactList({ items, render, empty }) {
  if (!items || items.length === 0) return <Empty text={empty} />;
  return <div className="space-y-2 max-h-[430px] overflow-y-auto pr-1">{items.map(render)}</div>;
}

function Empty({ text }) {
  return (
    <div className="border border-dashed rounded-2xl p-6 text-center text-slate-500 bg-slate-50">
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

export default AdminDashboard;