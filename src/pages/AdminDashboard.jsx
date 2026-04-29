import React, { useEffect, useMemo, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from "recharts";
import BehaviorTracker from "../components/BehaviorTracker";

const API = "http://localhost:5000";

const formatIST = (time) => {
  if (!time) return "N/A";
  return new Date(time).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "medium",
  });
};

const badgeStyle = {
  GENUINE: "bg-green-100 text-green-700 border-green-200",
  SUSPICIOUS: "bg-orange-100 text-orange-700 border-orange-200",
  FRAUD: "bg-red-100 text-red-700 border-red-200",
  ACTIVE: "bg-green-100 text-green-700 border-green-200",
  BLOCKED: "bg-red-100 text-red-700 border-red-200",
  UNKNOWN: "bg-slate-100 text-slate-700 border-slate-200",
};

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

  const loadAll = async () => {
    try {
      setLoading(true);

      const [statsRes, usersRes, reportsRes, analysisRes, alertsRes, loginLogsRes] =
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
      setLoginLogs(await loginLogsRes.json());
    } catch (error) {
      console.error(error);
      alert("Failed to load admin dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
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

  const postAction = async (url, successMessage, username = null) => {
    const res = await fetch(url, { method: "POST" });
    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Action failed");
      return;
    }

    alert(successMessage);
    loadAll();

    if (username) {
      loadUserDetails(username);
    }
  };

  const handleDeleteUser = async (username) => {
    const ok = window.confirm(`Delete user "${username}" and all related data?`);
    if (!ok) return;

    const res = await fetch(`${API}/api/admin/delete-user/${username}`, {
      method: "DELETE",
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Delete failed");
      return;
    }

    alert("User deleted successfully");
    setSelectedUser(null);
    setSelectedUserData(null);
    loadAll();
  };

  const handleAddSentence = async () => {
    if (!newSentence.trim()) {
      alert("Enter training sentence");
      return;
    }

    const res = await fetch(`${API}/api/admin/add-sentence`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sentence: newSentence }),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Failed to add sentence");
      return;
    }

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
        (r.createdAt &&
          new Date(r.createdAt).toISOString().slice(0, 10) === reportDateFilter);

      const matchUser =
        !reportUserFilter ||
        r.userId?.toLowerCase().includes(reportUserFilter.toLowerCase());

      return matchDate && matchUser;
    });
  }, [reports, reportDateFilter, reportUserFilter]);

  const pieData = [
    { name: "Genuine", value: stats.genuineCount || 0 },
    { name: "Suspicious", value: stats.suspiciousCount || 0 },
    { name: "Fraud", value: stats.fraudCount || 0 },
  ];

  const barData = [
    { name: "Users", value: stats.totalUsers || 0 },
    { name: "Reports", value: stats.totalReports || 0 },
    { name: "Alerts", value: stats.totalAlerts || 0 },
    { name: "Behavior", value: stats.behaviorSessions || 0 },
  ];

  const pieColors = ["#22c55e", "#f59e0b", "#ef4444"];

  return (
    <div className="min-h-screen bg-slate-100 flex">
      <aside className="hidden lg:flex lg:w-72 bg-slate-950 text-white p-5 flex-col">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">CUA Admin</h1>
          <p className="text-sm text-slate-400 mt-1">
            Continuous Authentication
          </p>
        </div>

        <SidebarButton label="Dashboard" value="dashboard" activeTab={activeTab} setActiveTab={setActiveTab} />
        <SidebarButton label="Users" value="users" activeTab={activeTab} setActiveTab={setActiveTab} />
        <SidebarButton label="Activity" value="activity" activeTab={activeTab} setActiveTab={setActiveTab} />
        <SidebarButton label="Alerts" value="alerts" activeTab={activeTab} setActiveTab={setActiveTab} />
        <SidebarButton label="Reports" value="reports" activeTab={activeTab} setActiveTab={setActiveTab} />
        <SidebarButton label="Login Logs" value="logins" activeTab={activeTab} setActiveTab={setActiveTab} />
        <SidebarButton label="Training Sentences" value="sentences" activeTab={activeTab} setActiveTab={setActiveTab} />

        <button
          onClick={loadAll}
          className="mt-auto rounded-2xl bg-blue-600 px-4 py-3 font-bold text-white shadow hover:bg-blue-700 transition"
        >
          {loading ? "Refreshing..." : "Refresh Data"}
        </button>
      </aside>

      <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
        <Header />

        <div className="lg:hidden mb-5 bg-white rounded-2xl border p-3 flex gap-2 overflow-x-auto">
          {["dashboard", "users", "activity", "alerts", "reports", "logins", "sentences"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl capitalize whitespace-nowrap ${
                activeTab === tab ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === "dashboard" && (
          <DashboardView
            stats={stats}
            pieData={pieData}
            barData={barData}
            pieColors={pieColors}
            latestAlerts={alerts.slice(0, 5)}
            latestAnalysis={analysis.slice(0, 5)}
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
            postAction={postAction}
            handleDeleteUser={handleDeleteUser}
          />
        )}

        {activeTab === "activity" && <ActivityView analysis={analysis} />}

        {activeTab === "alerts" && (
          <AlertsView
            alerts={filteredAlerts}
            alertFilter={alertFilter}
            setAlertFilter={setAlertFilter}
          />
        )}

        {activeTab === "reports" && (
          <ReportsView
            reports={filteredReports}
            reportDateFilter={reportDateFilter}
            setReportDateFilter={setReportDateFilter}
            reportUserFilter={reportUserFilter}
            setReportUserFilter={setReportUserFilter}
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
      </main>
    </div>
  );
}

function Header() {
  return (
    <div className="mb-6 bg-white border rounded-3xl p-6 shadow-sm">
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-950">
            Admin Monitoring Center
          </h2>
          <p className="text-slate-500 mt-1">
            Real-time users, desktop behavior, alerts, reports, and fraud analysis.
          </p>
        </div>

        <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
          IST Time: <span className="font-bold">{formatIST(new Date())}</span>
        </div>
      </div>
    </div>
  );
}

function SidebarButton({ label, value, activeTab, setActiveTab }) {
  return (
    <button
      onClick={() => setActiveTab(value)}
      className={`w-full text-left px-4 py-3 rounded-2xl mb-2 font-semibold transition ${
        activeTab === value
          ? "bg-blue-600 text-white shadow"
          : "text-slate-300 hover:bg-slate-800 hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}

function DashboardView({ stats, pieData, barData, pieColors, latestAlerts, latestAnalysis }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        <StatCard title="Total Users" value={stats.totalUsers} tone="blue" sub="Registered accounts" />
        <StatCard title="Behavior Sessions" value={stats.behaviorSessions} tone="purple" sub="Desktop + browser logs" />
        <StatCard title="Total Alerts" value={stats.totalAlerts} tone="red" sub="Security events" />
        <StatCard title="Blocked Users" value={stats.blockedUsers} tone="orange" sub="Restricted accounts" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <StatusCard title="Genuine" value={stats.genuineCount} type="GENUINE" />
        <StatusCard title="Suspicious" value={stats.suspiciousCount} type="SUSPICIOUS" />
        <StatusCard title="Fraud" value={stats.fraudCount} type="FRAUD" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Panel title="Authentication Status Distribution">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" outerRadius={105} label>
                  {pieData.map((_, index) => (
                    <Cell key={index} fill={pieColors[index]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="System Summary">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#2563eb" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Panel title="Latest Alerts">
          <div className="space-y-3">
            {latestAlerts.length === 0 && <Empty text="No alerts yet" />}
            {latestAlerts.map((a, i) => <AlertItem key={i} alert={a} />)}
          </div>
        </Panel>

        <Panel title="Latest AI Analysis">
          <div className="space-y-3">
            {latestAnalysis.length === 0 && <Empty text="No analysis logs yet" />}
            {latestAnalysis.map((a, i) => <AnalysisItem key={i} item={a} />)}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function UsersView({
  users,
  userSearch,
  setUserSearch,
  selectedUser,
  selectedUserData,
  selectedUserTab,
  setSelectedUserTab,
  loadUserDetails,
  newUsername,
  setNewUsername,
  newPassword,
  setNewPassword,
  newRole,
  setNewRole,
  handleCreateUser,
  postAction,
  handleDeleteUser,
}) {
  return (
    <div className="grid grid-cols-1 2xl:grid-cols-3 gap-6">
      <div className="2xl:col-span-1 space-y-6">
        <Panel title="Create User">
          <div className="space-y-3">
            <Input placeholder="Username" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} />
            <Input placeholder="Password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            <select
              className="w-full rounded-2xl border bg-slate-50 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
            <button onClick={handleCreateUser} className="btn-blue w-full">
              Create User
            </button>
          </div>
        </Panel>

        <Panel title="Users">
          <Input
            placeholder="Search user..."
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
          />

          <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1 mt-4">
            {users.length === 0 && <Empty text="No users found" />}
            {users.map((u) => (
              <button
                key={u.username}
                onClick={() => loadUserDetails(u.username)}
                className={`w-full text-left border rounded-3xl p-4 transition ${
                  selectedUser === u.username
                    ? "bg-blue-50 border-blue-300 shadow-sm"
                    : "bg-slate-50 hover:bg-white hover:shadow-sm"
                }`}
              >
                <div className="flex justify-between items-center gap-3">
                  <div>
                    <p className="font-bold text-slate-900">{u.username}</p>
                    <p className="text-sm text-slate-500">{u.role}</p>
                  </div>
                  <Badge
                    label={u.isBlocked ? "BLOCKED" : "ACTIVE"}
                    className={u.isBlocked ? badgeStyle.BLOCKED : badgeStyle.ACTIVE}
                  />
                </div>
              </button>
            ))}
          </div>
        </Panel>
      </div>

      <div className="2xl:col-span-2">
        <SelectedUserPanel
          data={selectedUserData}
          selectedUserTab={selectedUserTab}
          setSelectedUserTab={setSelectedUserTab}
          postAction={postAction}
          handleDeleteUser={handleDeleteUser}
        />
      </div>
    </div>
  );
}

function SelectedUserPanel({ data, selectedUserTab, setSelectedUserTab, postAction, handleDeleteUser }) {
  if (!data || !data.user) {
    return (
      <Panel title="User Details">
        <Empty text="Select a user to view full profile, behavior sessions, alerts, training quality, and reports." />
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

  return (
    <div className="space-y-6">
      <Panel title="User Profile">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <div className="flex items-center gap-3 mb-5 flex-wrap">
              <h3 className="text-4xl font-bold text-slate-950">{user.username}</h3>
              <Badge
                label={user.isBlocked ? "BLOCKED" : "ACTIVE"}
                className={user.isBlocked ? badgeStyle.BLOCKED : badgeStyle.ACTIVE}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Info label="Role" value={user.role} />
              <Info label="Training Quality" value={`${training.qualityScore || 0}%`} />
              <Info label="Training Status" value={training.status || "Not Completed"} />
              <Info label="Personal Threshold" value={training.personalThreshold || "0.60"} />
              <Info label="Warning Count" value={`${decisionState.warningCount || 0}/5`} />
              <Info label="Baseline Updated" value={formatIST(training.updatedAt)} />
            </div>
          </div>

          <div className="bg-slate-50 border rounded-3xl p-4">
            <p className="text-sm font-bold text-slate-500 mb-3">Quick Actions</p>
            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={() => window.open(`${API}/api/admin/user-report-pdf/${user.username}`, "_blank")}
                className="btn-purple"
              >
                Download PDF Report
              </button>

              {user.isBlocked ? (
                <button
                  onClick={() =>
                    postAction(`${API}/api/admin/unblock-user/${user.username}`, "User unblocked successfully", user.username)
                  }
                  className="btn-green"
                >
                  Unblock User
                </button>
              ) : (
                <button
                  onClick={() =>
                    postAction(`${API}/api/admin/block-user/${user.username}`, "User blocked successfully", user.username)
                  }
                  className="btn-red"
                >
                  Block User
                </button>
              )}

              <button
                onClick={() =>
                  postAction(`${API}/api/admin/reset-warnings/${user.username}`, "Warnings reset successful", user.username)
                }
                className="btn-orange"
              >
                Reset Warnings
              </button>

              <button
                onClick={() =>
                  postAction(`${API}/api/admin/reset-training/${user.username}`, "Training reset successful", user.username)
                }
                className="btn-yellow"
              >
                Reset Training
              </button>

              <button
                onClick={() => handleDeleteUser(user.username)}
                className="btn-dark"
              >
                Delete User
              </button>
            </div>
          </div>
        </div>
      </Panel>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MiniCard title="Reports" value={reports.length} />
        <MiniCard title="Alerts" value={alerts.length} />
        <MiniCard title="Analysis" value={analysis.length} />
        <MiniCard title="Behavior Sessions" value={sessions.length} />
      </div>

      <Panel title="User Monitoring Details">
        <div className="flex flex-wrap gap-2 mb-6">
          {["overview", "behavior", "analysis", "alerts", "reports", "training", "logins"].map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedUserTab(tab)}
              className={`px-4 py-2 rounded-2xl capitalize text-sm font-bold transition ${
                selectedUserTab === tab
                  ? "bg-blue-600 text-white shadow"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {selectedUserTab === "overview" && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="bg-slate-50 border rounded-3xl p-5">
              <h4 className="font-bold mb-4 text-slate-950">Security Summary</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Info label="Current Warning Count" value={`${decisionState.warningCount || 0}/5`} />
                <Info label="Training Quality" value={`${training.qualityScore || 0}%`} />
                <Info label="Feature Vectors" value={training.featureVectors?.length || 0} />
                <Info label="Samples" value={training.data?.length || 0} />
              </div>
            </div>

            <div className="bg-slate-50 border rounded-3xl p-5">
              <h4 className="font-bold mb-4 text-slate-950">Recent Decisions</h4>
              {(decisionState.lastStatuses || []).length === 0 && <Empty text="No recent decision history" />}
              {(decisionState.lastStatuses || []).slice().reverse().map((s, i) => (
                <div key={i} className="flex justify-between border-b py-2 text-sm">
                  <span className="font-semibold">{s.status}</span>
                  <span>Risk: {s.risk}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedUserTab === "behavior" && <BehaviorTracker sessions={sessions} analysis={analysis} />}

        {selectedUserTab === "analysis" && (
          <div className="space-y-3">
            {analysis.length === 0 && <Empty text="No analysis logs found" />}
            {analysis.map((a, i) => <AnalysisItem key={i} item={a} />)}
          </div>
        )}

        {selectedUserTab === "alerts" && (
          <div className="space-y-3">
            {alerts.length === 0 && <Empty text="No alerts found" />}
            {alerts.map((a, i) => <AlertItem key={i} alert={a} />)}
          </div>
        )}

        {selectedUserTab === "reports" && (
          <div className="space-y-3">
            {reports.length === 0 && <Empty text="No reports found" />}
            {reports.map((r, i) => (
              <div key={i} className="bg-slate-50 border rounded-3xl p-4">
                <div className="flex justify-between gap-3 flex-wrap">
                  <p className="font-bold">{r.result}</p>
                  <p className="text-sm text-slate-500">{formatIST(r.createdAt)}</p>
                </div>
                <p className="text-sm text-slate-600 mt-2">Warnings: {r.warnings}</p>
              </div>
            ))}
          </div>
        )}

        {selectedUserTab === "training" && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-3xl p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Info label="Status" value={training.status || "Not Completed"} />
                <Info label="Quality Score" value={`${training.qualityScore || 0}%`} />
                <Info label="Personal Threshold" value={training.personalThreshold || "0.60"} />
                <Info label="Updated At" value={formatIST(training.updatedAt)} />
              </div>
            </div>

            <DataBox title="Baseline Mean" data={training.baselineMean} />
            <DataBox title="Baseline Std" data={training.baselineStd} />
          </div>
        )}

        {selectedUserTab === "logins" && (
          <div className="space-y-3">
            {logins.length === 0 && <Empty text="No login logs found" />}
            {logins.map((l, i) => (
              <div key={i} className="bg-blue-50 border border-blue-100 rounded-3xl p-4">
                <p className="font-bold">{l.role}</p>
                <p className="text-sm text-slate-600">{formatIST(l.loginAt)}</p>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

function ActivityView({ analysis }) {
  return (
    <Panel title="AI Activity Logs">
      <div className="space-y-3">
        {analysis.length === 0 && <Empty text="No activity logs found" />}
        {analysis.map((a, i) => <AnalysisItem key={i} item={a} />)}
      </div>
    </Panel>
  );
}

function AlertsView({ alerts, alertFilter, setAlertFilter }) {
  return (
    <Panel title="System Alerts">
      <div className="flex justify-end mb-5">
        <select
          className="w-full md:max-w-xs rounded-2xl border bg-slate-50 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
          value={alertFilter}
          onChange={(e) => setAlertFilter(e.target.value)}
        >
          <option value="ALL">All Alerts</option>
          <option value="FRAUD">Fraud</option>
          <option value="SUSPICIOUS">Suspicious</option>
          <option value="BLOCKED">Blocked</option>
          <option value="UNBLOCKED">Unblocked</option>
          <option value="TRAINING_COMPLETED">Training Completed</option>
          <option value="EXAM_ALERT">Exam Alert</option>
          <option value="DESKTOP_WARNING">Desktop Warning</option>
          <option value="DESKTOP_AUTO_LOCK">Desktop Auto Lock</option>
          <option value="WARNING_RESET">Warning Reset</option>
        </select>
      </div>

      <div className="space-y-3">
        {alerts.length === 0 && <Empty text="No alerts found for selected filter" />}
        {alerts.map((a, i) => <AlertItem key={i} alert={a} />)}
      </div>
    </Panel>
  );
}

function ReportsView({ reports, reportDateFilter, setReportDateFilter, reportUserFilter, setReportUserFilter }) {
  return (
    <Panel title="Exam Reports">
      <div className="flex flex-col md:flex-row justify-end gap-3 mb-5">
        <Input
          placeholder="Filter username..."
          value={reportUserFilter}
          onChange={(e) => setReportUserFilter(e.target.value)}
        />
        <input
          type="date"
          className="w-full md:max-w-xs rounded-2xl border bg-slate-50 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
          value={reportDateFilter}
          onChange={(e) => setReportDateFilter(e.target.value)}
        />
      </div>

      <div className="space-y-3">
        {reports.length === 0 && <Empty text="No reports found" />}
        {reports.map((r, i) => (
          <div key={i} className="bg-white border rounded-3xl p-4 shadow-sm">
            <div className="flex justify-between flex-wrap gap-3">
              <div>
                <p className="font-bold text-slate-900">{r.userId}</p>
                <p className="text-sm text-slate-500">{formatIST(r.createdAt)}</p>
              </div>
              <Badge label={r.result || "UNKNOWN"} className={badgeStyle[r.result] || badgeStyle.UNKNOWN} />
            </div>
            <p className="mt-3 text-sm text-slate-600">Warnings: {r.warnings}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function LoginLogsView({ loginLogs }) {
  return (
    <Panel title="Login History">
      <div className="space-y-3">
        {loginLogs.length === 0 && <Empty text="No login logs found" />}
        {loginLogs.map((l, i) => (
          <div key={i} className="bg-blue-50 border border-blue-100 rounded-3xl p-4">
            <p className="font-bold">{l.username}</p>
            <p className="text-sm text-slate-600">Role: {l.role}</p>
            <p className="text-sm text-slate-600">Login: {formatIST(l.loginAt)}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function SentencesView({ newSentence, setNewSentence, handleAddSentence }) {
  return (
    <Panel title="Training Sentence Manager">
      <p className="text-slate-500 mb-4">
        Add typing sentences for collecting stronger keystroke baseline data.
      </p>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        <input
          className="lg:col-span-4 rounded-2xl border bg-slate-50 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter training sentence..."
          value={newSentence}
          onChange={(e) => setNewSentence(e.target.value)}
        />
        <button onClick={handleAddSentence} className="btn-blue">
          Add Sentence
        </button>
      </div>
    </Panel>
  );
}

function AlertItem({ alert }) {
  const isLock = alert.type === "DESKTOP_AUTO_LOCK" || alert.type === "FRAUD";
  const isWarning = alert.type === "DESKTOP_WARNING" || alert.type === "SUSPICIOUS";

  return (
    <div
      className={`border rounded-3xl p-4 ${
        isLock
          ? "bg-red-50 border-red-200"
          : isWarning
          ? "bg-orange-50 border-orange-200"
          : alert.type === "TRAINING_COMPLETED"
          ? "bg-green-50 border-green-200"
          : "bg-slate-50"
      }`}
    >
      <div className="flex justify-between flex-wrap gap-3">
        <div>
          <p className="font-bold text-slate-900">{alert.type}</p>
          <p className="text-sm text-slate-600 mt-1">{alert.message}</p>
        </div>
        <div className="text-right">
          <p className="font-bold">Risk {alert.riskScore || 0}</p>
          <p className="text-sm text-slate-500">{formatIST(alert.createdAt)}</p>
        </div>
      </div>
      <p className="text-sm text-slate-500 mt-2">User: {alert.userId}</p>
    </div>
  );
}

function AnalysisItem({ item }) {
  return (
    <div
      className={`border rounded-3xl p-4 ${
        item.status === "FRAUD"
          ? "bg-red-50 border-red-200"
          : item.status === "SUSPICIOUS"
          ? "bg-orange-50 border-orange-200"
          : "bg-green-50 border-green-200"
      }`}
    >
      <div className="flex justify-between flex-wrap gap-3">
        <div>
          <Badge label={item.status || "UNKNOWN"} className={badgeStyle[item.status] || badgeStyle.UNKNOWN} />
          <p className="text-sm text-slate-600 mt-2">User: {item.userId}</p>
        </div>
        <div className="text-right">
          <p className="font-bold">Risk {item.riskScore || 0}</p>
          <p className="text-sm text-slate-500">{formatIST(item.createdAt)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3 text-sm">
        <Info label="Similarity" value={typeof item.similarity === "number" ? item.similarity.toFixed(3) : item.similarity} />
        <Info label="Mismatch" value={item.mismatchCount || 0} />
        <Info label="Warning Count" value={item.warningCount || 0} />
      </div>

      <p className="text-sm text-slate-600 mt-3">
        Alerts: {Array.isArray(item.alerts) && item.alerts.length > 0 ? item.alerts.join(", ") : "None"}
      </p>
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <section className="bg-white border rounded-3xl p-5 lg:p-6 shadow-sm">
      <h3 className="text-xl font-bold text-slate-950 mb-5">{title}</h3>
      {children}
    </section>
  );
}

function StatCard({ title, value, tone = "blue", sub }) {
  const tones = {
    blue: "from-blue-600 to-blue-500",
    purple: "from-purple-600 to-purple-500",
    red: "from-red-600 to-red-500",
    orange: "from-orange-500 to-amber-500",
  };

  return (
    <div className={`rounded-3xl p-5 text-white bg-gradient-to-br ${tones[tone]} shadow-sm`}>
      <p className="text-white/80 text-sm">{title}</p>
      <h3 className="text-4xl font-bold mt-2">{value || 0}</h3>
      <p className="text-white/80 text-sm mt-2">{sub}</p>
    </div>
  );
}

function StatusCard({ title, value, type }) {
  return (
    <div className="bg-white border rounded-3xl p-5 shadow-sm">
      <div className="flex justify-between items-center">
        <p className="text-slate-500">{title}</p>
        <Badge label={type} className={badgeStyle[type]} />
      </div>
      <h3 className="text-4xl font-bold mt-3 text-slate-950">{value || 0}</h3>
    </div>
  );
}

function MiniCard({ title, value }) {
  return (
    <div className="bg-white border rounded-3xl p-4 shadow-sm">
      <p className="text-sm text-slate-500">{title}</p>
      <h3 className="text-2xl font-bold text-slate-950 mt-1">{value || 0}</h3>
    </div>
  );
}

function Badge({ label, className }) {
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${className}`}>
      {label}
    </span>
  );
}

function Info({ label, value }) {
  return (
    <div className="bg-white border rounded-2xl p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="font-semibold text-slate-900 break-words mt-1">{value ?? "N/A"}</p>
    </div>
  );
}

function Input(props) {
  return (
    <input
      {...props}
      className="w-full rounded-2xl border bg-slate-50 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
    />
  );
}

function DataBox({ title, data }) {
  return (
    <div className="bg-slate-50 border rounded-3xl p-5">
      <h4 className="font-bold mb-2">{title}</h4>
      <p className="text-sm break-words text-slate-600">
        {Array.isArray(data)
          ? data.map((v) => Number(v).toFixed(3)).join(", ")
          : `No ${title.toLowerCase()} available`}
      </p>
    </div>
  );
}

function Empty({ text }) {
  return (
    <div className="border border-dashed rounded-3xl p-8 text-center text-slate-500 bg-slate-50">
      {text}
    </div>
  );
}

export default AdminDashboard;