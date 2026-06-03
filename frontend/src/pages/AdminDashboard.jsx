import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const API = "http://https://continuous-authentication-system.onrender.com";

const navItems = [
  { label: "Overview", value: "dashboard" },
  { label: "Users", value: "users" },
  { label: "Activity", value: "activity" },
  { label: "Alerts", value: "alerts" },
  { label: "Reports", value: "reports" },
  { label: "Evidence", value: "evidence" },
  { label: "Login Logs", value: "logins" },
  { label: "Sentences", value: "sentences" },
];

const statusStyle = {
  GENUINE: "bg-green-50 text-green-700 border-green-200",
  SUSPICIOUS: "bg-orange-50 text-orange-700 border-orange-200",
  FRAUD: "bg-red-50 text-red-700 border-red-200",
  ACTIVE: "bg-green-50 text-green-700 border-green-200",
  BLOCKED: "bg-red-50 text-red-700 border-red-200",
  COMPLETED: "bg-blue-50 text-blue-700 border-blue-200",
  PENDING: "bg-yellow-50 text-yellow-700 border-yellow-200",
  PASS: "bg-green-50 text-green-700 border-green-200",
  REVIEW: "bg-orange-50 text-orange-700 border-orange-200",
  FAIL: "bg-red-50 text-red-700 border-red-200",
  LOW: "bg-green-50 text-green-700 border-green-200",
  MEDIUM: "bg-orange-50 text-orange-700 border-orange-200",
  HIGH: "bg-red-50 text-red-700 border-red-200",
  CRITICAL: "bg-red-100 text-red-800 border-red-300",
};

const formatIST = (time) => {
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
};

const safe = (value) => value ?? "N/A";

function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedUserTab, setSelectedUserTab] = useState("overview");
  const [loading, setLoading] = useState(false);

  const [stats, setStats] = useState({
    totalUsers: 0,
    totalReports: 0,
    totalAlerts: 0,
    fraudCount: 0,
    suspiciousCount: 0,
    genuineCount: 0,
    blockedUsers: 0,
    behaviorSessions: 0,
  });

  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [analysis, setAnalysis] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loginLogs, setLoginLogs] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [threatSummary, setThreatSummary] = useState({
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  });

  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedUserData, setSelectedUserData] = useState(null);

  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("user");
  const [newSentence, setNewSentence] = useState("");

  const [userSearch, setUserSearch] = useState("");
  const [alertFilter, setAlertFilter] = useState("ALL");
  const [reportDateFilter, setReportDateFilter] = useState("");
  const [reportUserFilter, setReportUserFilter] = useState("");
  const [reportResultFilter, setReportResultFilter] = useState("");
  const [evidenceUserFilter, setEvidenceUserFilter] = useState("");
  const [evidenceLevelFilter, setEvidenceLevelFilter] = useState("");

  const loadAll = async () => {
    try {
      setLoading(true);

      const requests = [
        fetch(`${API}/api/admin/stats`),
        fetch(`${API}/api/admin/users`),
        fetch(`${API}/api/admin/reports`),
        fetch(`${API}/api/admin/analysis`),
        fetch(`${API}/api/admin/alerts`),
        fetch(`${API}/api/admin/login-logs`),
      ];

      const evidenceReq = fetch(`${API}/api/admin/evidence`).catch(() => null);
      const threatReq = fetch(`${API}/api/admin/threat-summary`).catch(() => null);

      const [statsRes, usersRes, reportsRes, analysisRes, alertsRes, loginLogsRes] =
        await Promise.all(requests);

      setStats(await statsRes.json());
      setUsers(await usersRes.json());
      setReports(await reportsRes.json());
      setAnalysis(await analysisRes.json());
      setAlerts(await alertsRes.json());
      setLoginLogs(await loginLogsRes.json());

      const evidenceRes = await evidenceReq;
      if (evidenceRes && evidenceRes.ok) {
        setEvidence(await evidenceRes.json());
      }

      const threatRes = await threatReq;
      if (threatRes && threatRes.ok) {
        setThreatSummary(await threatRes.json());
      }
    } catch (error) {
      console.error(error);
      alert("Failed to load admin dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    const interval = setInterval(loadAll, 30000);
    return () => clearInterval(interval);
  }, []);

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
      setSelectedUserTab("overview");
    } catch (error) {
      console.error(error);
      alert("Failed to load user details");
    }
  };

  const handleCreateUser = async () => {
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
    if (!res.ok) {
      alert(data.error || "Failed to create user");
      return;
    }

    alert("User created successfully");
    setNewUsername("");
    setNewPassword("");
    setNewRole("user");
    loadAll();
  };

  const handleBlockUser = async (username) => {
    const res = await fetch(`${API}/api/admin/block-user/${username}`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) return alert(data.error || "Block failed");
    alert("User blocked successfully");
    loadAll();
    loadUserDetails(username);
  };

  const handleUnblockUser = async (username) => {
    const res = await fetch(`${API}/api/admin/unblock-user/${username}`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) return alert(data.error || "Unblock failed");
    alert("User unblocked successfully");
    loadAll();
    loadUserDetails(username);
  };

  const handleResetTraining = async (username) => {
    const ok = window.confirm(`Reset training baseline for ${username}?`);
    if (!ok) return;

    const res = await fetch(`${API}/api/admin/reset-training/${username}`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) return alert(data.error || "Training reset failed");
    alert("Training reset successful");
    loadAll();
    loadUserDetails(username);
  };

  const handleResetWarnings = async (username) => {
    const res = await fetch(`${API}/api/admin/reset-warnings/${username}`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) return alert(data.error || "Warning reset failed");
    alert("Warnings reset successful");
    loadAll();
    loadUserDetails(username);
  };

  const handleDeleteUser = async (username) => {
    const ok = window.confirm(`Delete user "${username}" and all related data?`);
    if (!ok) return;

    const res = await fetch(`${API}/api/admin/delete-user/${username}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) return alert(data.error || "Delete failed");

    alert("User deleted successfully");
    setSelectedUser(null);
    setSelectedUserData(null);
    loadAll();
  };

  const handleAddSentence = async () => {
    if (!newSentence.trim()) {
      alert("Enter sentence");
      return;
    }

    const res = await fetch(`${API}/api/admin/add-sentence`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sentence: newSentence }),
    });

    const data = await res.json();
    if (!res.ok) return alert(data.error || "Failed to add sentence");

    alert("Sentence added successfully");
    setNewSentence("");
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) =>
      u.username?.toLowerCase().includes(userSearch.toLowerCase())
    );
  }, [users, userSearch]);

  const filteredAlerts = useMemo(() => {
    return alerts.filter((a) => {
      if (alertFilter === "ALL") return true;
      return a.type === alertFilter || a.status === alertFilter;
    });
  }, [alerts, alertFilter]);

  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      const matchDate =
        !reportDateFilter ||
        (r.createdAt && new Date(r.createdAt).toISOString().slice(0, 10) === reportDateFilter);

      const matchUser =
        !reportUserFilter ||
        r.userId?.toLowerCase().includes(reportUserFilter.toLowerCase());

      const matchResult =
        !reportResultFilter || r.result === reportResultFilter;

      return matchDate && matchUser && matchResult;
    });
  }, [reports, reportDateFilter, reportUserFilter, reportResultFilter]);

  const filteredEvidence = useMemo(() => {
    return evidence.filter((e) => {
      const matchUser =
        !evidenceUserFilter ||
        e.userId?.toLowerCase().includes(evidenceUserFilter.toLowerCase());

      const matchLevel =
        !evidenceLevelFilter || e.threatLevel === evidenceLevelFilter;

      return matchUser && matchLevel;
    });
  }, [evidence, evidenceUserFilter, evidenceLevelFilter]);

  const riskLevel = useMemo(() => {
    if ((threatSummary.critical || 0) > 0 || stats.fraudCount > 0) return { label: "High Risk", color: "red" };
    if ((threatSummary.high || 0) > 0 || stats.suspiciousCount > 0) return { label: "Medium Risk", color: "orange" };
    return { label: "Normal", color: "green" };
  }, [stats, threatSummary]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="flex min-h-screen">
        <aside className="hidden lg:flex w-80 bg-white border-r border-slate-200 p-6 flex-col">
          <div className="mb-8">
            <div className="h-12 w-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-xl shadow-sm">
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

          <div className="mt-auto rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm text-slate-500">System Risk Level</p>
            <div className="flex items-center gap-3 mt-3">
              <span
                className={`h-3 w-3 rounded-full ${
                  riskLevel.color === "red"
                    ? "bg-red-500"
                    : riskLevel.color === "orange"
                    ? "bg-orange-500"
                    : "bg-green-500"
                } animate-pulse`}
              />
              <h2
                className={`text-2xl font-black ${
                  riskLevel.color === "red"
                    ? "text-red-600"
                    : riskLevel.color === "orange"
                    ? "text-orange-600"
                    : "text-green-600"
                }`}
              >
                {riskLevel.label}
              </h2>
            </div>

            <button
              onClick={loadAll}
              className="w-full mt-5 rounded-2xl bg-blue-600 px-4 py-3 font-bold text-white hover:bg-blue-700 transition"
            >
              {loading ? "Refreshing..." : "Refresh Data"}
            </button>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[1800px] mx-auto p-5 lg:p-8 space-y-7">
            <Header riskLevel={riskLevel} loading={loading} loadAll={loadAll} />

            <div className="lg:hidden rounded-3xl bg-white border border-slate-200 p-3 flex gap-2 overflow-x-auto">
              {navItems.map((item) => (
                <button
                  key={item.value}
                  onClick={() => setActiveTab(item.value)}
                  className={`px-4 py-2 rounded-2xl whitespace-nowrap text-sm font-bold ${
                    activeTab === item.value
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {activeTab === "dashboard" && (
              <DashboardView
                stats={stats}
                alerts={alerts}
                analysis={analysis}
                reports={reports}
                threatSummary={threatSummary}
                evidence={evidence}
              />
            )}

            {activeTab === "users" && (
              <UsersView
                users={filteredUsers}
                userSearch={userSearch}
                setUserSearch={setUserSearch}
                selectedUser={selectedUser}
                selectedUserData={selectedUserData}
                selectedUserTab={selectedUserTab}
                setSelectedUserTab={setSelectedUserTab}
                loadUserDetails={loadUserDetails}
                newUsername={newUsername}
                setNewUsername={setNewUsername}
                newPassword={newPassword}
                setNewPassword={setNewPassword}
                newRole={newRole}
                setNewRole={setNewRole}
                handleCreateUser={handleCreateUser}
                handleBlockUser={handleBlockUser}
                handleUnblockUser={handleUnblockUser}
                handleResetTraining={handleResetTraining}
                handleResetWarnings={handleResetWarnings}
                handleDeleteUser={handleDeleteUser}
              />
            )}

            {activeTab === "activity" && <ActivityView analysis={analysis} />}
            {activeTab === "alerts" && (
              <AlertsView alerts={filteredAlerts} alertFilter={alertFilter} setAlertFilter={setAlertFilter} />
            )}
            {activeTab === "reports" && (
              <ReportsView
                reports={filteredReports}
                reportDateFilter={reportDateFilter}
                setReportDateFilter={setReportDateFilter}
                reportUserFilter={reportUserFilter}
                setReportUserFilter={setReportUserFilter}
                reportResultFilter={reportResultFilter}
                setReportResultFilter={setReportResultFilter}
              />
            )}
            {activeTab === "evidence" && (
              <EvidenceView
                evidence={filteredEvidence}
                evidenceUserFilter={evidenceUserFilter}
                setEvidenceUserFilter={setEvidenceUserFilter}
                evidenceLevelFilter={evidenceLevelFilter}
                setEvidenceLevelFilter={setEvidenceLevelFilter}
              />
            )}
            {activeTab === "logins" && <LoginLogsView loginLogs={loginLogs} />}
            {activeTab === "sentences" && (
              <SentencesView
                newSentence={newSentence}
                setNewSentence={setNewSentence}
                handleAddSentence={handleAddSentence}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function Header({ riskLevel, loading, loadAll }) {
  return (
    <header className="rounded-[32px] bg-white border border-slate-200 p-6 lg:p-8 shadow-sm">
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
        <div>
          <p className="text-blue-600 text-xs font-black uppercase tracking-[0.28em]">
            Cyber Security Monitoring Center
          </p>
          <h1 className="text-4xl lg:text-5xl font-black mt-3 text-slate-950">
            Admin Command Center
          </h1>
          <p className="text-slate-500 mt-3 max-w-3xl text-base lg:text-lg">
            Professional dashboard for user behavior monitoring, anomaly detection,
            training baselines, exam scores, evidence, alerts, reports, and security governance.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 min-w-full xl:min-w-[520px]">
          <div className="rounded-3xl bg-slate-50 border border-slate-200 p-5">
            <p className="text-slate-500 text-sm">System Time</p>
            <h2 className="text-xl font-black text-slate-900 mt-2">{formatIST(new Date())}</h2>
          </div>
          <div className="rounded-3xl bg-slate-50 border border-slate-200 p-5">
            <p className="text-slate-500 text-sm">Risk Level</p>
            <h2
              className={`text-2xl font-black mt-2 ${
                riskLevel.color === "red"
                  ? "text-red-600"
                  : riskLevel.color === "orange"
                  ? "text-orange-600"
                  : "text-green-600"
              }`}
            >
              {riskLevel.label}
            </h2>
          </div>
        </div>
      </div>

      <button
        onClick={loadAll}
        className="mt-5 lg:hidden rounded-2xl bg-blue-600 px-5 py-3 font-bold text-white"
      >
        {loading ? "Refreshing..." : "Refresh"}
      </button>
    </header>
  );
}

function DashboardView({ stats, alerts, analysis, reports, threatSummary, evidence }) {
  const pieData = [
    { name: "Genuine", value: Number(stats.genuineCount || 0) },
    { name: "Suspicious", value: Number(stats.suspiciousCount || 0) },
    { name: "Fraud", value: Number(stats.fraudCount || 0) },
  ];

  const barData = [
    { name: "Users", value: Number(stats.totalUsers || 0) },
    { name: "Sessions", value: Number(stats.behaviorSessions || 0) },
    { name: "Alerts", value: Number(stats.totalAlerts || 0) },
    { name: "Reports", value: Number(stats.totalReports || 0) },
  ];

  const threatData = [
    { name: "Critical", value: Number(threatSummary.critical || 0), fill: "#ef4444" },
    { name: "High", value: Number(threatSummary.high || 0), fill: "#f97316" },
    { name: "Medium", value: Number(threatSummary.medium || 0), fill: "#f59e0b" },
    { name: "Low", value: Number(threatSummary.low || 0), fill: "#22c55e" },
  ];

  return (
    <div className="space-y-7">
      <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-4 gap-5">
        <MetricCard title="Total Users" value={stats.totalUsers} sub="Registered accounts" tone="blue" />
        <MetricCard title="Behavior Sessions" value={stats.behaviorSessions} sub="Desktop + browser monitoring" tone="green" />
        <MetricCard title="Alerts" value={stats.totalAlerts} sub="Security events" tone="red" />
        <MetricCard title="Evidence" value={evidence.length} sub="Screenshot proof records" tone="orange" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <Panel title="Authentication Status">
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" innerRadius={70} outerRadius={108} paddingAngle={5}>
                  <Cell fill="#22c55e" />
                  <Cell fill="#f97316" />
                  <Cell fill="#ef4444" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <MiniStatus label="Genuine" value={stats.genuineCount} color="green" />
            <MiniStatus label="Suspicious" value={stats.suspiciousCount} color="orange" />
            <MiniStatus label="Fraud" value={stats.fraudCount} color="red" />
          </div>
        </Panel>

        <Panel title="System Summary" className="xl:col-span-2">
          <div className="h-[370px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip />
                <Bar dataKey="value" fill="#2563eb" radius={[12, 12, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <Panel title="Evidence Threat Levels">
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {threatData.map((item) => (
            <div key={item.name} className="rounded-3xl bg-slate-50 border border-slate-200 p-5">
              <p className="text-sm text-slate-500">{item.name}</p>
              <h3 className="text-4xl font-black mt-2" style={{ color: item.fill }}>
                {item.value}
              </h3>
            </div>
          ))}
        </div>
      </Panel>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Panel title="Latest Security Alerts">
          <List items={alerts.slice(0, 8)} render={(a, i) => <AlertItem key={i} alert={a} />} empty="No alerts found" />
        </Panel>

        <Panel title="Recent AI Decisions">
          <List items={analysis.slice(0, 8)} render={(a, i) => <AnalysisItem key={i} item={a} />} empty="No analysis logs found" />
        </Panel>
      </div>

      <Panel title="Recent Exam Reports">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {reports.slice(0, 6).length === 0 && <Empty text="No reports found" />}
          {reports.slice(0, 6).map((r, i) => <ReportCard key={i} report={r} />)}
        </div>
      </Panel>
    </div>
  );
}

function UsersView(props) {
  const {
    users, userSearch, setUserSearch, selectedUser, selectedUserData,
    selectedUserTab, setSelectedUserTab, loadUserDetails,
    newUsername, setNewUsername, newPassword, setNewPassword, newRole, setNewRole,
    handleCreateUser, handleBlockUser, handleUnblockUser,
    handleResetTraining, handleResetWarnings, handleDeleteUser,
  } = props;

  return (
    <div className="grid grid-cols-1 2xl:grid-cols-12 gap-5">
      <div className="2xl:col-span-4 space-y-5">
        <Panel title="Create User">
          <div className="space-y-4">
            <Input placeholder="Username" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} />
            <Input placeholder="Password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            <select
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
            <button onClick={handleCreateUser} className="w-full rounded-2xl bg-blue-600 px-4 py-3 font-bold text-white hover:bg-blue-700">
              Create User
            </button>
          </div>
        </Panel>

        <Panel title="User Directory">
          <Input placeholder="Search user..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)} />
          <div className="space-y-3 mt-5 max-h-[620px] overflow-y-auto pr-2">
            {users.length === 0 && <Empty text="No users found" />}
            {users.map((u) => (
              <button
                key={u.username}
                onClick={() => loadUserDetails(u.username)}
                className={`w-full text-left rounded-3xl p-5 transition border ${
                  selectedUser === u.username
                    ? "bg-blue-50 border-blue-300 shadow-sm"
                    : "bg-white border-slate-200 hover:border-blue-200 hover:bg-slate-50"
                }`}
              >
                <div className="flex justify-between items-center gap-4">
                  <div className="min-w-0">
                    <p className="font-black text-slate-950 truncate text-lg">{u.username}</p>
                    <p className="text-sm text-slate-500 mt-1">{u.role}</p>
                  </div>
                  <Badge label={u.isBlocked ? "BLOCKED" : "ACTIVE"} className={u.isBlocked ? statusStyle.BLOCKED : statusStyle.ACTIVE} />
                </div>

                <div className="flex gap-2 mt-4">
                  <Badge
                    label={u.hasBaseline ? "TRAINED" : "PENDING"}
                    className={u.hasBaseline ? statusStyle.COMPLETED : statusStyle.PENDING}
                  />
                </div>
              </button>
            ))}
          </div>
        </Panel>
      </div>

      <div className="2xl:col-span-8">
        <SelectedUserPanel
          data={selectedUserData}
          selectedUserTab={selectedUserTab}
          setSelectedUserTab={setSelectedUserTab}
          handleBlockUser={handleBlockUser}
          handleUnblockUser={handleUnblockUser}
          handleResetTraining={handleResetTraining}
          handleResetWarnings={handleResetWarnings}
          handleDeleteUser={handleDeleteUser}
        />
      </div>
    </div>
  );
}

function SelectedUserPanel({
  data,
  selectedUserTab,
  setSelectedUserTab,
  handleBlockUser,
  handleUnblockUser,
  handleResetTraining,
  handleResetWarnings,
  handleDeleteUser,
}) {
  if (!data || !data.user) {
    return (
      <Panel title="User Intelligence">
        <Empty text="Select a user to view profile, training baseline, warnings, alerts, reports, and behavior sessions." />
      </Panel>
    );
  }

  const user = data.user;
  const training = data.training || {};
  const decisionState = data.decisionState || {};
  const reports = data.reports || [];
  const alerts = data.alerts || [];
  const analysis = data.analysis || [];
  const logins = data.logins || [];
  const sessions = data.sessions || [];

  const latestAnalysis = analysis[0] || {};
  const latestSession = sessions[0] || {};
  const latestSummary = latestSession.summary || {};

  return (
    <div className="space-y-5">
      <Panel title="Identity Risk Profile">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          <div className="xl:col-span-8">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="h-16 w-16 rounded-3xl bg-blue-600 text-white flex items-center justify-center text-2xl font-black">
                {String(user.username || "U").slice(0, 1).toUpperCase()}
              </div>
              <div>
                <h2 className="text-4xl font-black text-slate-950">{user.username}</h2>
                <div className="flex gap-2 mt-2 flex-wrap">
                  <Badge label={user.role || "user"} className="bg-blue-50 text-blue-700 border-blue-200" />
                  <Badge label={user.isBlocked ? "BLOCKED" : "ACTIVE"} className={user.isBlocked ? statusStyle.BLOCKED : statusStyle.ACTIVE} />
                  <Badge label={training.status === "COMPLETED" ? "TRAINED" : "TRAINING PENDING"} className={training.status === "COMPLETED" ? statusStyle.COMPLETED : statusStyle.PENDING} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mt-7">
              <Info label="Risk Score" value={latestAnalysis.riskScore ?? 0} />
              <Info label="AI Status" value={latestAnalysis.status || "N/A"} />
              <Info label="Similarity" value={typeof latestAnalysis.similarity === "number" ? latestAnalysis.similarity.toFixed(3) : "N/A"} />
              <Info label="Warnings" value={`${decisionState.warningCount || 0}/5`} />
            </div>
          </div>

          <div className="xl:col-span-4 rounded-3xl bg-slate-50 border border-slate-200 p-5">
            <p className="text-sm font-black text-slate-500 uppercase tracking-widest mb-4">Quick Actions</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-3">
              <ActionButton label="Download PDF" tone="purple" onClick={() => window.open(`${API}/api/admin/user-report-pdf/${user.username}`, "_blank")} />
              {user.isBlocked ? (
                <ActionButton label="Unblock User" tone="green" onClick={() => handleUnblockUser(user.username)} />
              ) : (
                <ActionButton label="Block User" tone="red" onClick={() => handleBlockUser(user.username)} />
              )}
              <ActionButton label="Reset Warnings" tone="orange" onClick={() => handleResetWarnings(user.username)} />
              <ActionButton label="Reset Training" tone="blue" onClick={() => handleResetTraining(user.username)} />
              <ActionButton label="Delete User" tone="dark" onClick={() => handleDeleteUser(user.username)} />
            </div>
          </div>
        </div>
      </Panel>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <MiniMetric title="Reports" value={reports.length} />
        <MiniMetric title="Alerts" value={alerts.length} />
        <MiniMetric title="Analysis Logs" value={analysis.length} />
        <MiniMetric title="Sessions" value={sessions.length} />
      </div>

      <Panel title="Latest Behavior Snapshot">
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-4">
          <BehaviorCount title="Keys" value={latestSummary.keys} />
          <BehaviorCount title="Mouse" value={latestSummary.mouse} />
          <BehaviorCount title="Clicks" value={latestSummary.clicks} />
          <BehaviorCount title="Scrolls" value={latestSummary.scrolls} />
          <BehaviorCount title="Drags" value={latestSummary.drags} />
          <BehaviorCount title="Focus" value={latestSummary.focusEvents} />
          <BehaviorCount title="Paste" value={latestSummary.pasteEvents} />
          <BehaviorCount title="Tab Switch" value={latestSummary.tabSwitches} />
        </div>
      </Panel>

      <Panel title="User Monitoring Details">
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
          {["overview", "behavior", "analysis", "alerts", "reports", "training", "logins"].map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedUserTab(tab)}
              className={`px-5 py-2 rounded-2xl capitalize text-sm font-bold whitespace-nowrap transition ${
                selectedUserTab === tab
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {selectedUserTab === "overview" && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <SubPanel title="Security Summary">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Info label="Training Quality" value={`${training.qualityScore || 0}%`} />
                <Info label="Training Status" value={training.status || "Not Completed"} />
                <Info label="Personal Threshold" value={training.personalThreshold || "0.60"} />
                <Info label="Baseline Updated" value={formatIST(training.updatedAt)} />
                <Info label="Feature Vectors" value={training.featureVectors?.length || 0} />
                <Info label="Samples" value={training.data?.length || 0} />
              </div>
            </SubPanel>

            <SubPanel title="Recent Decisions">
              <div className="space-y-3">
                {(decisionState.lastStatuses || []).length === 0 && <Empty text="No recent decision history" />}
                {(decisionState.lastStatuses || []).slice().reverse().map((s, i) => (
                  <div key={i} className="rounded-2xl bg-white border border-slate-200 p-4 flex justify-between">
                    <span className="font-black text-slate-950">{s.status}</span>
                    <span className="text-slate-500">Risk {s.risk}</span>
                  </div>
                ))}
              </div>
            </SubPanel>
          </div>
        )}

        {selectedUserTab === "behavior" && <BehaviorSessions sessions={sessions} />}
        {selectedUserTab === "analysis" && <List items={analysis} render={(a, i) => <AnalysisItem key={i} item={a} />} empty="No analysis logs found" />}
        {selectedUserTab === "alerts" && <List items={alerts} render={(a, i) => <AlertItem key={i} alert={a} />} empty="No alerts found" />}
        {selectedUserTab === "reports" && <List items={reports} render={(r, i) => <ReportCard key={i} report={r} />} empty="No reports found" />}
        {selectedUserTab === "training" && <TrainingView training={training} />}
        {selectedUserTab === "logins" && <LoginList logins={logins} />}
      </Panel>
    </div>
  );
}

function ActivityView({ analysis }) {
  return (
    <Panel title="AI Activity Logs">
      <List items={analysis} render={(a, i) => <AnalysisItem key={i} item={a} />} empty="No activity logs found" />
    </Panel>
  );
}

function AlertsView({ alerts, alertFilter, setAlertFilter }) {
  return (
    <Panel title="Security Alerts">
      <div className="flex justify-end mb-6">
        <select
          className="w-full md:max-w-xs rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
          value={alertFilter}
          onChange={(e) => setAlertFilter(e.target.value)}
        >
          <option value="ALL">All Alerts</option>
          <option value="FRAUD">Fraud</option>
          <option value="SUSPICIOUS">Suspicious</option>
          <option value="BLOCKED">Blocked</option>
          <option value="UNBLOCKED">Unblocked</option>
          <option value="TRAINING_COMPLETED">Training Completed</option>
          <option value="TRAINING_RESET">Training Reset</option>
          <option value="EXAM_ALERT">Exam Alert</option>
          <option value="SCREENSHOT_EVIDENCE">Screenshot Evidence</option>
          <option value="DESKTOP_WARNING">Desktop Warning</option>
          <option value="DESKTOP_AUTO_LOCK">Desktop Auto Lock</option>
          <option value="WARNING_RESET">Warning Reset</option>
        </select>
      </div>
      <List items={alerts} render={(a, i) => <AlertItem key={i} alert={a} />} empty="No alerts found" />
    </Panel>
  );
}

function ReportsView({
  reports,
  reportDateFilter,
  setReportDateFilter,
  reportUserFilter,
  setReportUserFilter,
  reportResultFilter,
  setReportResultFilter,
}) {
  return (
    <Panel title="Exam Reports">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
        <Input placeholder="Filter username..." value={reportUserFilter} onChange={(e) => setReportUserFilter(e.target.value)} />
        <select
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
          value={reportResultFilter}
          onChange={(e) => setReportResultFilter(e.target.value)}
        >
          <option value="">All Results</option>
          <option value="PASS">PASS</option>
          <option value="REVIEW">REVIEW</option>
          <option value="FAIL">FAIL</option>
          <option value="SUSPICIOUS">SUSPICIOUS</option>
        </select>
        <input
          type="date"
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
          value={reportDateFilter}
          onChange={(e) => setReportDateFilter(e.target.value)}
        />
        <button
          onClick={() => {
            setReportDateFilter("");
            setReportUserFilter("");
            setReportResultFilter("");
          }}
          className="rounded-2xl bg-slate-800 text-white font-bold px-4 py-3"
        >
          Clear Filters
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {reports.length === 0 && <Empty text="No reports found" />}
        {reports.map((r, i) => <ReportCard key={i} report={r} />)}
      </div>
    </Panel>
  );
}

function EvidenceView({
  evidence,
  evidenceUserFilter,
  setEvidenceUserFilter,
  evidenceLevelFilter,
  setEvidenceLevelFilter,
}) {
  return (
    <Panel title="Screenshot Evidence">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <Input
          placeholder="Filter username..."
          value={evidenceUserFilter}
          onChange={(e) => setEvidenceUserFilter(e.target.value)}
        />
        <select
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
          value={evidenceLevelFilter}
          onChange={(e) => setEvidenceLevelFilter(e.target.value)}
        >
          <option value="">All Threat Levels</option>
          <option value="LOW">LOW</option>
          <option value="MEDIUM">MEDIUM</option>
          <option value="HIGH">HIGH</option>
          <option value="CRITICAL">CRITICAL</option>
        </select>
        <button
          onClick={() => {
            setEvidenceUserFilter("");
            setEvidenceLevelFilter("");
          }}
          className="rounded-2xl bg-slate-800 text-white font-bold px-4 py-3"
        >
          Clear Filters
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {evidence.length === 0 && <Empty text="No evidence records found" />}
        {evidence.map((item, i) => <EvidenceCard key={i} item={item} />)}
      </div>
    </Panel>
  );
}

function EvidenceCard({ item }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5">
      <div className="flex justify-between gap-4 flex-wrap">
        <div>
          <p className="font-black text-slate-950">{item.userId || "Unknown User"}</p>
          <p className="text-sm text-slate-500 mt-1">{formatIST(item.createdAt)}</p>
        </div>
        <Badge
          label={item.threatLevel || "UNKNOWN"}
          className={statusStyle[item.threatLevel] || "bg-slate-50 text-slate-700 border-slate-200"}
        />
      </div>

      <p className="text-sm text-slate-600 mt-4">{item.reason || "No reason"}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-5">
        <Info label="Risk Score" value={item.riskScore || 0} />
        <Info label="Path" value={item.screenshotPath || "N/A"} />
      </div>
    </div>
  );
}

function LoginLogsView({ loginLogs }) {
  return (
    <Panel title="Login History">
      <LoginList logins={loginLogs} />
    </Panel>
  );
}

function SentencesView({ newSentence, setNewSentence, handleAddSentence }) {
  return (
    <Panel title="Training Sentence Manager">
      <p className="text-slate-500 mb-6">Add typing sentences to improve keystroke dynamics baseline quality.</p>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        <input
          className="lg:col-span-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter training sentence..."
          value={newSentence}
          onChange={(e) => setNewSentence(e.target.value)}
        />
        <button onClick={handleAddSentence} className="rounded-2xl bg-blue-600 px-4 py-3 font-bold text-white hover:bg-blue-700">
          Add Sentence
        </button>
      </div>
    </Panel>
  );
}

function TrainingView({ training }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Info label="Status" value={training.status || "Not Completed"} />
        <Info label="Quality Score" value={`${training.qualityScore || 0}%`} />
        <Info label="Personal Threshold" value={training.personalThreshold || "0.60"} />
        <Info label="Updated At" value={formatIST(training.updatedAt)} />
      </div>

      <SubPanel title="Baseline Mean">
        <p className="text-sm break-words text-slate-600 leading-7">
          {Array.isArray(training.baselineMean)
            ? training.baselineMean.map((v) => Number(v).toFixed(3)).join(", ")
            : "No baseline mean available"}
        </p>
      </SubPanel>

      <SubPanel title="Baseline Std">
        <p className="text-sm break-words text-slate-600 leading-7">
          {Array.isArray(training.baselineStd)
            ? training.baselineStd.map((v) => Number(v).toFixed(3)).join(", ")
            : "No baseline std available"}
        </p>
      </SubPanel>
    </div>
  );
}

function BehaviorSessions({ sessions }) {
  return (
    <div className="space-y-4">
      {sessions.length === 0 && <Empty text="No behavior sessions found" />}
      {sessions.map((s, i) => {
        const sm = s.summary || {};
        return (
          <div key={i} className="rounded-3xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap justify-between gap-4">
              <div>
                <p className="font-black text-slate-950 text-lg">{s.page || "desktop_monitor"}</p>
                <p className="text-slate-500 text-sm mt-1">{formatIST(s.createdAt)}</p>
              </div>
              <Badge label={`Risk ${s.desktopRisk || 0}`} className="bg-blue-50 text-blue-700 border-blue-200" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3 mt-5">
              <BehaviorCount title="Keys" value={sm.keys} />
              <BehaviorCount title="Mouse" value={sm.mouse} />
              <BehaviorCount title="Clicks" value={sm.clicks} />
              <BehaviorCount title="Scrolls" value={sm.scrolls} />
              <BehaviorCount title="Drags" value={sm.drags} />
              <BehaviorCount title="Focus" value={sm.focusEvents} />
              <BehaviorCount title="Paste" value={sm.pasteEvents} />
              <BehaviorCount title="Tab" value={sm.tabSwitches} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LoginList({ logins }) {
  return (
    <div className="space-y-4">
      {logins.length === 0 && <Empty text="No login logs found" />}
      {logins.map((l, i) => (
        <div key={i} className="rounded-3xl border border-slate-200 bg-white p-5">
          <p className="font-black text-slate-950">{l.username || l.role}</p>
          <p className="text-sm text-slate-500 mt-1">Role: {l.role}</p>
          <p className="text-sm text-slate-400 mt-2">{formatIST(l.loginAt)}</p>
        </div>
      ))}
    </div>
  );
}

function AlertItem({ alert }) {
  const risky = alert.type === "DESKTOP_AUTO_LOCK" || alert.type === "FRAUD";
  const warning = alert.type === "DESKTOP_WARNING" || alert.type === "SUSPICIOUS" || alert.type === "EXAM_ALERT";

  return (
    <div
      className={`rounded-3xl border p-5 ${
        risky
          ? "bg-red-50 border-red-200"
          : warning
          ? "bg-orange-50 border-orange-200"
          : "bg-white border-slate-200"
      }`}
    >
      <div className="flex justify-between gap-4 flex-wrap">
        <div>
          <p className="font-black text-slate-950">{alert.type || "ALERT"}</p>
          <p className="text-sm text-slate-600 mt-2 max-w-3xl">{alert.message || "No message"}</p>
          <p className="text-xs text-slate-400 mt-3">User: {alert.userId || "N/A"}</p>
        </div>
        <div className="text-right">
          <p className={`text-2xl font-black ${risky ? "text-red-600" : warning ? "text-orange-600" : "text-blue-600"}`}>
            Risk {alert.riskScore || 0}
          </p>
          <p className="text-sm text-slate-400 mt-2">{formatIST(alert.createdAt)}</p>
        </div>
      </div>
    </div>
  );
}

function AnalysisItem({ item }) {
  return (
    <div
      className={`rounded-3xl border p-5 ${
        item.status === "FRAUD"
          ? "bg-red-50 border-red-200"
          : item.status === "SUSPICIOUS"
          ? "bg-orange-50 border-orange-200"
          : "bg-green-50 border-green-200"
      }`}
    >
      <div className="flex justify-between flex-wrap gap-4">
        <div>
          <Badge label={item.status || "UNKNOWN"} className={statusStyle[item.status] || "bg-slate-50 text-slate-700 border-slate-200"} />
          <p className="text-sm text-slate-500 mt-3">User: {item.userId || "N/A"}</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-black text-slate-950">{item.riskScore || 0}</p>
          <p className="text-sm text-slate-500 mt-1">Risk Score</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5">
        <Info label="Similarity" value={typeof item.similarity === "number" ? item.similarity.toFixed(3) : item.similarity} />
        <Info label="Mismatch" value={item.mismatchCount || 0} />
        <Info label="Warnings" value={item.warningCount || 0} />
      </div>

      <p className="text-sm text-slate-600 mt-4">
        Alerts: {Array.isArray(item.alerts) && item.alerts.length > 0 ? item.alerts.join(", ") : "None"}
      </p>
    </div>
  );
}

function ReportCard({ report }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5">
      <div className="flex justify-between gap-4 flex-wrap">
        <div>
          <p className="font-black text-slate-950">{report.userId || "Unknown User"}</p>
          <p className="text-sm text-slate-400 mt-1">{formatIST(report.createdAt || report.submittedAt)}</p>
        </div>

        <Badge
          label={report.result || "UNKNOWN"}
          className={statusStyle[report.result] || "bg-slate-50 text-slate-700 border-slate-200"}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-5">
        <Info label="Score" value={`${report.scorePercent || 0}%`} />
        <Info label="Correct" value={report.correctAnswers || 0} />
        <Info label="Wrong" value={report.wrongAnswers || 0} />
        <Info label="Unanswered" value={report.unanswered || 0} />
        <Info label="Warnings" value={report.warnings || 0} />
      </div>

      {Array.isArray(report.answers) && report.answers.length > 0 && (
        <details className="mt-5">
          <summary className="font-bold cursor-pointer text-blue-700">
            View Answer Details
          </summary>

          <div className="mt-4 space-y-3">
            {report.answers.map((a, idx) => (
              <div
                key={idx}
                className={`rounded-2xl border p-4 ${
                  a.isCorrect ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
                }`}
              >
                <p className="font-semibold">
                  {a.questionNo}. {a.question}
                </p>
                <p className="text-sm mt-2">Selected: {a.selectedAnswer}</p>
                <p className="text-sm">Correct: {a.correctAnswer}</p>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function Panel({ title, children, className = "" }) {
  return (
    <section className={`rounded-[32px] bg-white border border-slate-200 p-5 lg:p-6 shadow-sm ${className}`}>
      <div className="flex items-center justify-between mb-6 gap-4">
        <h3 className="text-2xl font-black text-slate-950 tracking-tight">{title}</h3>
        <div className="h-2 w-2 rounded-full bg-blue-600" />
      </div>
      {children}
    </section>
  );
}

function SubPanel({ title, children }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
      <h4 className="font-black text-slate-950 mb-4">{title}</h4>
      {children}
    </div>
  );
}

function MetricCard({ title, value, sub, tone }) {
  const tones = {
    blue: "bg-blue-600 text-white",
    green: "bg-green-600 text-white",
    red: "bg-red-600 text-white",
    orange: "bg-orange-500 text-white",
  };

  return (
    <div className={`relative overflow-hidden rounded-[32px] ${tones[tone]} p-6 shadow-sm`}>
      <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/15" />
      <p className="text-white/80 text-sm uppercase tracking-widest">{title}</p>
      <h2 className="text-5xl font-black mt-4">{value || 0}</h2>
      <p className="text-white/80 mt-3 text-sm">{sub}</p>
    </div>
  );
}

function MiniMetric({ title, value }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{title}</p>
      <h3 className="text-3xl font-black text-slate-950 mt-2">{value || 0}</h3>
    </div>
  );
}

function MiniStatus({ label, value, color }) {
  const cls = color === "green" ? "text-green-600" : color === "orange" ? "text-orange-600" : "text-red-600";
  return (
    <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 text-center">
      <p className="text-xs text-slate-500">{label}</p>
      <h4 className={`text-2xl font-black mt-1 ${cls}`}>{value || 0}</h4>
    </div>
  );
}

function BehaviorCount({ title, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs text-slate-500">{title}</p>
      <p className="text-2xl font-black text-slate-950 mt-2">{value || 0}</p>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs text-slate-500 uppercase tracking-wider">{label}</p>
      <p className="font-black text-slate-950 break-words mt-2">{safe(value)}</p>
    </div>
  );
}

function Input(props) {
  return (
    <input
      {...props}
      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-500"
    />
  );
}

function Badge({ label, className }) {
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black border whitespace-nowrap ${className}`}>
      {label}
    </span>
  );
}

function ActionButton({ label, tone, onClick }) {
  const tones = {
    purple: "bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200",
    green: "bg-green-50 text-green-700 hover:bg-green-100 border-green-200",
    red: "bg-red-50 text-red-700 hover:bg-red-100 border-red-200",
    orange: "bg-orange-50 text-orange-700 hover:bg-orange-100 border-orange-200",
    blue: "bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200",
    dark: "bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200",
  };

  return (
    <button onClick={onClick} className={`rounded-2xl border px-4 py-3 text-sm font-black transition ${tones[tone]}`}>
      {label}
    </button>
  );
}

function List({ items, render, empty }) {
  return (
    <div className="space-y-4 max-h-[620px] overflow-y-auto pr-2">
      {items.length === 0 && <Empty text={empty} />}
      {items.map(render)}
    </div>
  );
}

function Empty({ text }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-slate-500">
      {text}
    </div>
  );
}

export default AdminDashboard;
