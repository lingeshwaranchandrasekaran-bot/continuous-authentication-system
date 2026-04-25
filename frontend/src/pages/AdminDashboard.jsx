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

const formatIST = (time) => {
  if (!time) return "N/A";

  return new Date(time).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "medium",
  });
};

function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");

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
  const [selectedUserTab, setSelectedUserTab] = useState("reports");

  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("user");
  const [newSentence, setNewSentence] = useState("");
  const [deleteUsername, setDeleteUsername] = useState("");
  const [resetUsername, setResetUsername] = useState("");

  const [loading, setLoading] = useState(false);
  const [reportDateFilter, setReportDateFilter] = useState("");
  const [reportUserFilter, setReportUserFilter] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [alertFilter, setAlertFilter] = useState("ALL");

  const API = "http://localhost:5000";

  const loadAll = async () => {
    try {
      setLoading(true);

      const [
        statsRes,
        usersRes,
        reportsRes,
        analysisRes,
        alertsRes,
        loginLogsRes,
      ] = await Promise.all([
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
      alert("Failed to load admin data");
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
      setSelectedUserTab("reports");
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
      body: JSON.stringify({
        username: newUsername,
        password: newPassword,
        role: newRole,
      }),
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

  const handleDeleteUser = async () => {
    if (!deleteUsername) {
      alert("Enter username to delete");
      return;
    }

    const res = await fetch(`${API}/api/admin/delete-user/${deleteUsername}`, {
      method: "DELETE",
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Delete failed");
      return;
    }

    alert("User deleted successfully");
    setDeleteUsername("");
    setSelectedUser(null);
    setSelectedUserData(null);
    loadAll();
  };

  const handleResetTraining = async () => {
    if (!resetUsername) {
      alert("Enter username to reset training");
      return;
    }

    const res = await fetch(`${API}/api/admin/reset-training/${resetUsername}`, {
      method: "POST",
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Reset failed");
      return;
    }

    alert("Training reset successful");
    setResetUsername("");
    loadAll();

    if (selectedUser === resetUsername) {
      loadUserDetails(resetUsername);
    }
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

    if (!res.ok) {
      alert(data.error || "Failed to add sentence");
      return;
    }

    alert("Sentence added successfully");
    setNewSentence("");
  };

  const handleBlockUser = async (username) => {
    const res = await fetch(`${API}/api/admin/block-user/${username}`, {
      method: "POST",
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Block failed");
      return;
    }

    alert("User blocked successfully");
    loadAll();

    if (selectedUser === username) {
      loadUserDetails(username);
    }
  };

  const handleUnblockUser = async (username) => {
    const res = await fetch(`${API}/api/admin/unblock-user/${username}`, {
      method: "POST",
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Unblock failed");
      return;
    }

    alert("User unblocked successfully");
    loadAll();

    if (selectedUser === username) {
      loadUserDetails(username);
    }
  };

  const handleDownloadPdf = (username) => {
    window.open(`${API}/api/admin/user-report-pdf/${username}`, "_blank");
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) =>
      u.username?.toLowerCase().includes(userSearch.toLowerCase())
    );
  }, [users, userSearch]);

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

  const colors = ["#22c55e", "#facc15", "#ef4444"];

  const SidebarButton = ({ label, value }) => (
    <button
      onClick={() => setActiveTab(value)}
      className={`w-full text-left px-4 py-3 rounded-xl transition mb-2 font-medium ${
        activeTab === value
          ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow"
          : "bg-gray-100 hover:bg-gray-200 text-gray-800"
      }`}
    >
      {label}
    </button>
  );

  const DetailTab = ({ label, value }) => (
    <button
      onClick={() => setSelectedUserTab(value)}
      className={`px-4 py-2 rounded-lg ${
        selectedUserTab === value
          ? "bg-blue-600 text-white"
          : "bg-gray-100 text-gray-700"
      }`}
    >
      {label}
    </button>
  );

  const renderSelectedUserPanel = () => {
    if (!selectedUserData || !selectedUserData.user) {
      return (
        <div className="bg-white rounded-2xl shadow border p-6">
          <h3 className="text-xl font-bold mb-2">User Details</h3>
          <p className="text-gray-500">
            Click a username to view reports, alerts, training quality, behavior tracking, analysis, and login history.
          </p>
        </div>
      );
    }

    const user = selectedUserData.user;
    const training = selectedUserData.training || {};
    const userReports = selectedUserData.reports || [];
    const userAlerts = selectedUserData.alerts || [];
    const userAnalysis = selectedUserData.analysis || [];
    const logins = selectedUserData.logins || [];
    const sessions = selectedUserData.sessions || [];

    return (
      <div className="bg-white rounded-2xl shadow border p-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-5">
          <div>
            <h3 className="text-2xl font-bold text-blue-700">{user.username}</h3>
            <p className="text-gray-600">Role: {user.role}</p>
            <p className="text-gray-600">
              Status: {user.isBlocked ? "Blocked" : "Active"}
            </p>
            <p className="text-gray-600">
              Training Quality: {training.qualityScore || 0}%
            </p>
            <p className="text-gray-600">
              Training Status: {training.status || "Not Completed"}
            </p>
            <p className="text-gray-600">
              Baseline Updated: {formatIST(training.updatedAt)}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleDownloadPdf(user.username)}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg"
            >
              Download PDF
            </button>

            {user.isBlocked ? (
              <button
                onClick={() => handleUnblockUser(user.username)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg"
              >
                Unblock
              </button>
            ) : (
              <button
                onClick={() => handleBlockUser(user.username)}
                className="bg-red-600 text-white px-4 py-2 rounded-lg"
              >
                Block
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <MiniCard title="Reports" value={userReports.length} />
          <MiniCard title="Alerts" value={userAlerts.length} />
          <MiniCard title="Analysis" value={userAnalysis.length} />
          <MiniCard title="Behavior" value={sessions.length} />
        </div>

        <div className="flex flex-wrap gap-2 mb-5">
          <DetailTab label="Reports" value="reports" />
          <DetailTab label="Alerts" value="alerts" />
          <DetailTab label="Analysis" value="analysis" />
          <DetailTab label="Behavior" value="behavior" />
          <DetailTab label="Training" value="training" />
          <DetailTab label="Logins" value="logins" />
        </div>

        {selectedUserTab === "reports" && (
          <div className="space-y-3">
            {userReports.length === 0 && (
              <p className="text-gray-500">No reports found</p>
            )}

            {userReports.map((r, i) => (
              <div key={i} className="border rounded-xl p-4 bg-gray-50">
                <p>
                  <span className="font-semibold">Result:</span> {r.result}
                </p>
                <p>
                  <span className="font-semibold">Warnings:</span> {r.warnings}
                </p>
                <p>
                  <span className="font-semibold">Time:</span>{" "}
                  {formatIST(r.createdAt)}
                </p>

                {Array.isArray(r.warningDetails) &&
                  r.warningDetails.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {r.warningDetails.map((w, idx) => (
                        <div key={idx} className="bg-red-50 border rounded-lg p-3">
                          <p>
                            <span className="font-medium">Type:</span> {w.kind}
                          </p>
                          <p>
                            <span className="font-medium">Reason:</span>{" "}
                            {w.reason}
                          </p>
                          <p>
                            <span className="font-medium">Question No:</span>{" "}
                            {w.questionNo}
                          </p>
                          <p>
                            <span className="font-medium">Time:</span>{" "}
                            {formatIST(w.time)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
              </div>
            ))}
          </div>
        )}

        {selectedUserTab === "alerts" && (
          <div className="space-y-3">
            {userAlerts.length === 0 && (
              <p className="text-gray-500">No alerts found</p>
            )}

            {userAlerts.map((a, i) => (
              <div
                key={i}
                className={`border rounded-xl p-4 ${
                  a.type === "DESKTOP_AUTO_LOCK"
                    ? "bg-red-100"
                    : a.type === "DESKTOP_WARNING"
                    ? "bg-orange-100"
                    : a.type === "TRAINING_COMPLETED"
                    ? "bg-green-100"
                    : "bg-red-50"
                }`}
              >
                <p>
                  <span className="font-semibold">Type:</span> {a.type}
                </p>
                <p>
                  <span className="font-semibold">Risk Score:</span>{" "}
                  {a.riskScore || 0}
                </p>
                <p>
                  <span className="font-semibold">Message:</span> {a.message}
                </p>
                <p>
                  <span className="font-semibold">Time:</span>{" "}
                  {formatIST(a.createdAt)}
                </p>
              </div>
            ))}
          </div>
        )}

        {selectedUserTab === "analysis" && (
          <div className="space-y-3">
            {userAnalysis.length === 0 && (
              <p className="text-gray-500">No analysis logs found</p>
            )}

            {userAnalysis.map((a, i) => (
              <div
                key={i}
                className={`border rounded-xl p-4 ${
                  a.status === "FRAUD"
                    ? "bg-red-50"
                    : a.status === "SUSPICIOUS"
                    ? "bg-yellow-50"
                    : "bg-green-50"
                }`}
              >
                <p>
                  <span className="font-semibold">Status:</span> {a.status}
                </p>
                <p>
                  <span className="font-semibold">Similarity:</span>{" "}
                  {typeof a.similarity === "number"
                    ? a.similarity.toFixed(3)
                    : a.similarity}
                </p>
                <p>
                  <span className="font-semibold">Risk Score:</span>{" "}
                  {a.riskScore}
                </p>
                <p>
                  <span className="font-semibold">Mismatch Count:</span>{" "}
                  {a.mismatchCount}
                </p>
                <p>
                  <span className="font-semibold">Time:</span>{" "}
                  {formatIST(a.createdAt)}
                </p>
                <p>
                  <span className="font-semibold">Alerts:</span>{" "}
                  {Array.isArray(a.alerts) ? a.alerts.join(", ") : ""}
                </p>
              </div>
            ))}
          </div>
        )}

        {selectedUserTab === "behavior" && (
          <BehaviorTracker sessions={sessions} analysis={userAnalysis} />
        )}

        {selectedUserTab === "training" && (
          <div className="space-y-4">
            <div className="border rounded-xl p-4 bg-green-50">
              <p>
                <span className="font-semibold">Training Status:</span>{" "}
                {training.status || "Not Completed"}
              </p>
              <p>
                <span className="font-semibold">Quality Score:</span>{" "}
                {training.qualityScore || 0}%
              </p>
              <p>
                <span className="font-semibold">Updated At:</span>{" "}
                {formatIST(training.updatedAt)}
              </p>
              <p>
                <span className="font-semibold">Feature Vectors:</span>{" "}
                {training.featureVectors?.length || 0}
              </p>
              <p>
                <span className="font-semibold">Samples:</span>{" "}
                {training.data?.length || 0}
              </p>
            </div>

            <div className="border rounded-xl p-4 bg-gray-50">
              <h4 className="font-bold mb-2">Baseline Mean</h4>
              <p className="text-sm break-words">
                {Array.isArray(training.baselineMean)
                  ? training.baselineMean
                      .map((v) => Number(v).toFixed(3))
                      .join(", ")
                  : "No baseline mean available"}
              </p>
            </div>

            <div className="border rounded-xl p-4 bg-gray-50">
              <h4 className="font-bold mb-2">Baseline Std</h4>
              <p className="text-sm break-words">
                {Array.isArray(training.baselineStd)
                  ? training.baselineStd
                      .map((v) => Number(v).toFixed(3))
                      .join(", ")
                  : "No baseline std available"}
              </p>
            </div>
          </div>
        )}

        {selectedUserTab === "logins" && (
          <div className="space-y-3">
            {logins.length === 0 && (
              <p className="text-gray-500">No login logs found</p>
            )}

            {logins.map((l, i) => (
              <div key={i} className="border rounded-xl p-4 bg-blue-50">
                <p>
                  <span className="font-semibold">Role:</span> {l.role}
                </p>
                <p>
                  <span className="font-semibold">Login Time:</span>{" "}
                  {formatIST(l.loginAt)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-700 to-indigo-700 text-white rounded-2xl p-6 shadow">
        <h2 className="text-3xl font-bold">Admin Overview</h2>
        <p className="mt-2 text-blue-100">
          Monitor users, reports, alerts, AI analysis, desktop warnings, and behavior tracking.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Total Users" value={stats.totalUsers || 0} color="blue" />
        <StatCard title="Total Reports" value={stats.totalReports || 0} color="green" />
        <StatCard title="Total Alerts" value={stats.totalAlerts || 0} color="red" />
        <StatCard title="Behavior Sessions" value={stats.behaviorSessions || 0} color="purple" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Genuine" value={stats.genuineCount || 0} color="green" />
        <StatCard title="Suspicious" value={stats.suspiciousCount || 0} color="yellow" />
        <StatCard title="Fraud" value={stats.fraudCount || 0} color="red" />
        <StatCard title="Blocked Users" value={stats.blockedUsers || 0} color="red" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow p-5 border h-96">
          <h3 className="font-bold mb-4">Status Distribution</h3>
          <ResponsiveContainer width="100%" height="90%">
            <PieChart>
              <Pie data={pieData} dataKey="value" outerRadius={110} label>
                {pieData.map((_, index) => (
                  <Cell key={index} fill={colors[index]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl shadow p-5 border h-96">
          <h3 className="font-bold mb-4">System Summary</h3>
          <ResponsiveContainer width="100%" height="90%">
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#2563eb" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );

  const renderUsers = () => (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <div className="space-y-6">
        <div className="bg-white rounded-2xl shadow border p-5">
          <h3 className="text-xl font-bold mb-4">Create User</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              className="border rounded-lg p-3"
              placeholder="Username"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
            />
            <input
              className="border rounded-lg p-3"
              placeholder="Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <select
              className="border rounded-lg p-3"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <button
            onClick={handleCreateUser}
            className="mt-4 bg-green-600 text-white rounded-lg px-4 py-3"
          >
            Create User
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow border p-5">
          <h3 className="text-xl font-bold mb-4">Delete User</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              className="border rounded-lg p-3"
              placeholder="Username to delete"
              value={deleteUsername}
              onChange={(e) => setDeleteUsername(e.target.value)}
            />
            <button
              onClick={handleDeleteUser}
              className="bg-red-600 text-white rounded-lg p-3"
            >
              Delete User
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow border p-5">
          <h3 className="text-xl font-bold mb-4">Reset Training</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              className="border rounded-lg p-3"
              placeholder="Username to reset training"
              value={resetUsername}
              onChange={(e) => setResetUsername(e.target.value)}
            />
            <button
              onClick={handleResetTraining}
              className="bg-yellow-500 text-white rounded-lg p-3"
            >
              Reset Training
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow border p-5">
          <div className="flex items-center justify-between mb-4 gap-3">
            <h3 className="text-xl font-bold">Users</h3>

            <input
              className="border rounded-lg p-2"
              placeholder="Search user..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
            />
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {filteredUsers.map((u, i) => (
              <div
                key={i}
                onClick={() => loadUserDetails(u.username)}
                className={`border rounded-xl p-4 cursor-pointer transition ${
                  selectedUser === u.username
                    ? "bg-blue-50 border-blue-400"
                    : "bg-gray-50 hover:bg-gray-100"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-lg text-blue-700">{u.username}</p>
                    <p className="text-sm text-gray-600">{u.role}</p>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      u.isBlocked
                        ? "bg-red-100 text-red-700"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {u.isBlocked ? "Blocked" : "Active"}
                  </span>
                </div>
              </div>
            ))}

            {filteredUsers.length === 0 && (
              <p className="text-gray-500">No users found</p>
            )}
          </div>
        </div>
      </div>

      {renderSelectedUserPanel()}
    </div>
  );

  const renderSentences = () => (
    <div className="bg-white rounded-2xl shadow border p-5">
      <h3 className="text-xl font-bold mb-4">Add Training Sentence</h3>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <input
          className="border rounded-lg p-3 md:col-span-4"
          placeholder="Enter training sentence"
          value={newSentence}
          onChange={(e) => setNewSentence(e.target.value)}
        />

        <button
          onClick={handleAddSentence}
          className="bg-purple-600 text-white rounded-lg p-3"
        >
          Add Sentence
        </button>
      </div>
    </div>
  );

  const renderActivity = () => (
    <div className="bg-white rounded-2xl shadow border p-5">
      <h3 className="text-xl font-bold mb-4">User Activity / Analysis Logs</h3>

      <div className="space-y-3">
        {analysis.map((a, i) => (
          <div key={i} className="border rounded-xl p-4 bg-gray-50">
            <p>
              <span className="font-semibold">User:</span> {a.userId}
            </p>
            <p>
              <span className="font-semibold">Status:</span> {a.status}
            </p>
            <p>
              <span className="font-semibold">Similarity:</span>{" "}
              {typeof a.similarity === "number"
                ? a.similarity.toFixed(3)
                : a.similarity}
            </p>
            <p>
              <span className="font-semibold">Risk Score:</span> {a.riskScore}
            </p>
            <p>
              <span className="font-semibold">Time:</span>{" "}
              {formatIST(a.createdAt)}
            </p>
            <p>
              <span className="font-semibold">Alerts:</span>{" "}
              {Array.isArray(a.alerts) ? a.alerts.join(", ") : ""}
            </p>
          </div>
        ))}

        {analysis.length === 0 && (
          <p className="text-gray-500">No activity logs found</p>
        )}
      </div>
    </div>
  );

  const renderLoginLogs = () => (
    <div className="bg-white rounded-2xl shadow border p-5">
      <h3 className="text-xl font-bold mb-4">Login Details</h3>

      <div className="space-y-3">
        {loginLogs.map((l, i) => (
          <div key={i} className="border rounded-xl p-4 bg-blue-50">
            <p>
              <span className="font-semibold">Username:</span> {l.username}
            </p>
            <p>
              <span className="font-semibold">Role:</span> {l.role}
            </p>
            <p>
              <span className="font-semibold">Login Time:</span>{" "}
              {formatIST(l.loginAt)}
            </p>
          </div>
        ))}

        {loginLogs.length === 0 && (
          <p className="text-gray-500">No login logs found</p>
        )}
      </div>
    </div>
  );

  const renderAlerts = () => {
    const filteredAlerts = alerts.filter((a) => {
      if (alertFilter === "ALL") return true;
      return a.type === alertFilter || a.status === alertFilter;
    });

    return (
      <div className="bg-white rounded-2xl shadow border p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <h3 className="text-xl font-bold">System Alerts</h3>

          <select
            className="border rounded-lg p-2"
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
          </select>
        </div>

        <div className="space-y-3">
          {filteredAlerts.map((a, i) => (
            <div
              key={i}
              className={`border rounded-xl p-4 ${
                a.type === "DESKTOP_AUTO_LOCK" || a.type === "FRAUD"
                  ? "bg-red-100"
                  : a.type === "DESKTOP_WARNING" || a.type === "SUSPICIOUS"
                  ? "bg-orange-100"
                  : a.type === "TRAINING_COMPLETED"
                  ? "bg-green-100"
                  : "bg-red-50"
              }`}
            >
              <p>
                <span className="font-semibold">User:</span> {a.userId}
              </p>
              <p>
                <span className="font-semibold">Type:</span> {a.type}
              </p>
              <p>
                <span className="font-semibold">Risk Score:</span>{" "}
                {a.riskScore || 0}
              </p>
              <p>
                <span className="font-semibold">Message:</span> {a.message}
              </p>
              <p>
                <span className="font-semibold">Time:</span>{" "}
                {formatIST(a.createdAt)}
              </p>
            </div>
          ))}

          {filteredAlerts.length === 0 && (
            <p className="text-gray-500">No alerts found for selected filter</p>
          )}
        </div>
      </div>
    );
  };

  const renderReports = () => {
    const filteredReports = reports.filter((r) => {
      const matchDate =
        !reportDateFilter ||
        (r.createdAt &&
          new Date(r.createdAt).toISOString().slice(0, 10) ===
            reportDateFilter);

      const matchUser =
        !reportUserFilter ||
        r.userId?.toLowerCase().includes(reportUserFilter.toLowerCase());

      return matchDate && matchUser;
    });

    return (
      <div className="bg-white rounded-2xl shadow border p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-3">
          <h3 className="text-xl font-bold">Exam Reports</h3>

          <div className="flex gap-2 flex-wrap">
            <input
              type="text"
              className="border rounded-lg p-2"
              placeholder="Filter username..."
              value={reportUserFilter}
              onChange={(e) => setReportUserFilter(e.target.value)}
            />

            <input
              type="date"
              className="border rounded-lg p-2"
              value={reportDateFilter}
              onChange={(e) => setReportDateFilter(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-4">
          {filteredReports.map((r, i) => (
            <div key={i} className="border rounded-xl p-4 bg-gray-50">
              <p>
                <span className="font-semibold">User:</span> {r.userId}
              </p>
              <p>
                <span className="font-semibold">Result:</span> {r.result}
              </p>
              <p>
                <span className="font-semibold">Warnings:</span> {r.warnings}
              </p>
              <p>
                <span className="font-semibold">Time:</span>{" "}
                {formatIST(r.createdAt)}
              </p>
            </div>
          ))}

          {filteredReports.length === 0 && (
            <p className="text-gray-500">No reports found for selected filter</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <div className="w-72 bg-white shadow-xl p-5">
        <h1 className="text-2xl font-bold text-blue-700 mb-6">
          Admin Dashboard
        </h1>

        <SidebarButton label="Dashboard" value="dashboard" />
        <SidebarButton label="Users" value="users" />
        <SidebarButton label="Training Sentences" value="sentences" />
        <SidebarButton label="User Activity" value="activity" />
        <SidebarButton label="Login Details" value="logins" />
        <SidebarButton label="Alerts" value="alerts" />
        <SidebarButton label="Exam Reports" value="reports" />

        <button
          onClick={loadAll}
          className="mt-6 w-full bg-blue-600 text-white rounded-xl p-3"
        >
          {loading ? "Refreshing..." : "Refresh All"}
        </button>
      </div>

      <div className="flex-1 p-6 space-y-6">
        {activeTab === "dashboard" && renderDashboard()}
        {activeTab === "users" && renderUsers()}
        {activeTab === "sentences" && renderSentences()}
        {activeTab === "activity" && renderActivity()}
        {activeTab === "logins" && renderLoginLogs()}
        {activeTab === "alerts" && renderAlerts()}
        {activeTab === "reports" && renderReports()}
      </div>
    </div>
  );
}

function StatCard({ title, value, color = "blue" }) {
  const map = {
    blue: "border-blue-600 text-blue-700",
    green: "border-green-600 text-green-700",
    red: "border-red-600 text-red-700",
    purple: "border-purple-600 text-purple-700",
    yellow: "border-yellow-500 text-yellow-700",
  };

  return (
    <div className={`bg-white rounded-2xl shadow p-5 border-l-4 ${map[color]}`}>
      <p className="text-sm text-gray-500">{title}</p>
      <h3 className="text-3xl font-bold">{value}</h3>
    </div>
  );
}

function MiniCard({ title, value }) {
  return (
    <div className="bg-gray-50 border rounded-xl p-3">
      <p className="text-sm text-gray-500">{title}</p>
      <h3 className="text-xl font-bold text-blue-700">{value}</h3>
    </div>
  );
}

export default AdminDashboard;