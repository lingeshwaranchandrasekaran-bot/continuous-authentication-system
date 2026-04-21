import React, { useEffect, useState } from "react";
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

function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");

  const [stats, setStats] = useState({
    totalUsers: 0,
    totalReports: 0,
    totalAlerts: 0,
    fraudCount: 0,
    suspiciousCount: 0,
    genuineCount: 0,
  });

  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [analysis, setAnalysis] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loginLogs, setLoginLogs] = useState([]);

  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("user");
  const [newSentence, setNewSentence] = useState("");
  const [deleteUsername, setDeleteUsername] = useState("");
  const [resetUsername, setResetUsername] = useState("");

  const [loading, setLoading] = useState(false);
  const [reportDateFilter, setReportDateFilter] = useState("");

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
        fetch("http://localhost:5000/api/admin/stats"),
        fetch("http://localhost:5000/api/admin/users"),
        fetch("http://localhost:5000/api/admin/reports"),
        fetch("http://localhost:5000/api/admin/analysis"),
        fetch("http://localhost:5000/api/admin/alerts"),
        fetch("http://localhost:5000/api/admin/login-logs"),
      ]);

      const statsData = await statsRes.json();
      const usersData = await usersRes.json();
      const reportsData = await reportsRes.json();
      const analysisData = await analysisRes.json();
      const alertsData = await alertsRes.json();
      const loginLogsData = await loginLogsRes.json();

      setStats(statsData || {});
      setUsers(Array.isArray(usersData) ? usersData : []);
      setReports(Array.isArray(reportsData) ? reportsData : []);
      setAnalysis(Array.isArray(analysisData) ? analysisData : []);
      setAlerts(Array.isArray(alertsData) ? alertsData : []);
      setLoginLogs(Array.isArray(loginLogsData) ? loginLogsData : []);
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

  const handleCreateUser = async () => {
    if (!newUsername || !newPassword) {
      alert("Enter username and password");
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/api/admin/create-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username: newUsername,
          password: newPassword,
          role: newRole
        })
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
    } catch (error) {
      console.error(error);
      alert("Create user failed");
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUsername) {
      alert("Enter username to delete");
      return;
    }

    try {
      const res = await fetch(
        `http://localhost:5000/api/admin/delete-user/${deleteUsername}`,
        { method: "DELETE" }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Delete failed");
        return;
      }

      alert("User deleted successfully");
      setDeleteUsername("");
      loadAll();
    } catch (error) {
      console.error(error);
      alert("Delete failed");
    }
  };

  const handleResetTraining = async () => {
    if (!resetUsername) {
      alert("Enter username to reset training");
      return;
    }

    try {
      const res = await fetch(
        `http://localhost:5000/api/admin/reset-training/${resetUsername}`,
        { method: "POST" }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Reset failed");
        return;
      }

      alert("Training reset successful");
      setResetUsername("");
      loadAll();
    } catch (error) {
      console.error(error);
      alert("Reset failed");
    }
  };

  const handleAddSentence = async () => {
    if (!newSentence.trim()) {
      alert("Enter sentence");
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/api/admin/add-sentence", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          sentence: newSentence
        })
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Failed to add sentence");
        return;
      }

      alert("Sentence added successfully");
      setNewSentence("");
    } catch (error) {
      console.error(error);
      alert("Failed to add sentence");
    }
  };

  const handleBlockUser = async (username) => {
    try {
      const res = await fetch(
        `http://localhost:5000/api/admin/block-user/${username}`,
        { method: "POST" }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Block failed");
        return;
      }

      alert("User blocked successfully");
      loadAll();
    } catch (error) {
      console.error(error);
      alert("Block failed");
    }
  };

  const handleUnblockUser = async (username) => {
    try {
      const res = await fetch(
        `http://localhost:5000/api/admin/unblock-user/${username}`,
        { method: "POST" }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Unblock failed");
        return;
      }

      alert("User unblocked successfully");
      loadAll();
    } catch (error) {
      console.error(error);
      alert("Unblock failed");
    }
  };

  const pieData = [
    { name: "Genuine", value: stats.genuineCount || 0 },
    { name: "Suspicious", value: stats.suspiciousCount || 0 },
    { name: "Fraud", value: stats.fraudCount || 0 },
  ];

  const barData = [
    { name: "Users", value: stats.totalUsers || 0 },
    { name: "Reports", value: stats.totalReports || 0 },
    { name: "Alerts", value: stats.totalAlerts || 0 },
  ];

  const colors = ["#22c55e", "#facc15", "#ef4444"];

  const SidebarButton = ({ label, value }) => (
    <button
      onClick={() => setActiveTab(value)}
      className={`w-full text-left px-4 py-3 rounded-xl transition mb-2 ${
        activeTab === value
          ? "bg-blue-600 text-white"
          : "bg-gray-100 hover:bg-gray-200 text-gray-800"
      }`}
    >
      {label}
    </button>
  );

  const renderDashboard = () => (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Dashboard Overview</h2>
        <button
          onClick={loadAll}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl shadow p-5 border">
          <p className="text-sm text-gray-500">Total Users</p>
          <h3 className="text-3xl font-bold text-blue-700">{stats.totalUsers}</h3>
        </div>
        <div className="bg-white rounded-2xl shadow p-5 border">
          <p className="text-sm text-gray-500">Total Reports</p>
          <h3 className="text-3xl font-bold text-green-700">{stats.totalReports}</h3>
        </div>
        <div className="bg-white rounded-2xl shadow p-5 border">
          <p className="text-sm text-gray-500">Total Alerts</p>
          <h3 className="text-3xl font-bold text-red-700">{stats.totalAlerts}</h3>
        </div>
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
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow border p-5">
        <h3 className="text-xl font-bold mb-4">Create User</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
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
          <button
            onClick={handleCreateUser}
            className="bg-green-600 text-white rounded-lg p-3 hover:bg-green-700"
          >
            Create User
          </button>
        </div>
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
            className="bg-red-600 text-white rounded-lg p-3 hover:bg-red-700"
          >
            Delete User
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow border p-5">
        <h3 className="text-xl font-bold mb-4">Reset User Training</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            className="border rounded-lg p-3"
            placeholder="Username to reset training"
            value={resetUsername}
            onChange={(e) => setResetUsername(e.target.value)}
          />
          <button
            onClick={handleResetTraining}
            className="bg-yellow-500 text-white rounded-lg p-3 hover:bg-yellow-600"
          >
            Reset Training
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow border p-5">
        <h3 className="text-xl font-bold mb-4">User Details</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-3 text-left border">Username</th>
                <th className="p-3 text-left border">Role</th>
                <th className="p-3 text-left border">Status</th>
                <th className="p-3 text-left border">Created At</th>
                <th className="p-3 text-left border">Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={i}>
                  <td className="p-3 border">{u.username}</td>
                  <td className="p-3 border">{u.role}</td>
                  <td className="p-3 border">
                    {u.isBlocked ? (
                      <span className="text-red-600 font-semibold">Blocked</span>
                    ) : (
                      <span className="text-green-600 font-semibold">Active</span>
                    )}
                  </td>
                  <td className="p-3 border">
                    {u.createdAt ? new Date(u.createdAt).toLocaleString() : "N/A"}
                  </td>
                  <td className="p-3 border">
                    {u.isBlocked ? (
                      <button
                        onClick={() => handleUnblockUser(u.username)}
                        className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700"
                      >
                        Unblock
                      </button>
                    ) : (
                      <button
                        onClick={() => handleBlockUser(u.username)}
                        className="bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700"
                      >
                        Block
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan="5" className="p-4 text-center text-gray-500">
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
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
          className="bg-purple-600 text-white rounded-lg p-3 hover:bg-purple-700"
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
            <p><span className="font-semibold">User:</span> {a.userId}</p>
            <p><span className="font-semibold">Status:</span> {a.status}</p>
            <p><span className="font-semibold">Similarity:</span> {typeof a.similarity === "number" ? a.similarity.toFixed(3) : a.similarity}</p>
            <p><span className="font-semibold">Risk Score:</span> {a.riskScore}</p>
            <p><span className="font-semibold">Alerts:</span> {Array.isArray(a.alerts) ? a.alerts.join(", ") : ""}</p>
          </div>
        ))}
        {analysis.length === 0 && <p className="text-gray-500">No analysis logs</p>}
      </div>
    </div>
  );

  const renderLoginLogs = () => (
    <div className="bg-white rounded-2xl shadow border p-5">
      <h3 className="text-xl font-bold mb-4">Login Details</h3>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-3 text-left border">Username</th>
              <th className="p-3 text-left border">Role</th>
              <th className="p-3 text-left border">Login Time</th>
            </tr>
          </thead>
          <tbody>
            {loginLogs.map((l, i) => (
              <tr key={i}>
                <td className="p-3 border">{l.username}</td>
                <td className="p-3 border">{l.role}</td>
                <td className="p-3 border">
                  {l.loginAt ? new Date(l.loginAt).toLocaleString() : "N/A"}
                </td>
              </tr>
            ))}
            {loginLogs.length === 0 && (
              <tr>
                <td colSpan="3" className="p-4 text-center text-gray-500">
                  No login logs
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderAlerts = () => (
    <div className="bg-white rounded-2xl shadow border p-5">
      <h3 className="text-xl font-bold mb-4">System Alerts</h3>
      <div className="space-y-3">
        {alerts.map((a, i) => (
          <div key={i} className="border rounded-xl p-4 bg-red-50">
            <p><span className="font-semibold">User:</span> {a.userId}</p>
            <p><span className="font-semibold">Type:</span> {a.type}</p>
            <p><span className="font-semibold">Message:</span> {a.message}</p>
            <p><span className="font-semibold">Time:</span> {a.createdAt ? new Date(a.createdAt).toLocaleString() : "N/A"}</p>
          </div>
        ))}
        {alerts.length === 0 && <p className="text-gray-500">No alerts</p>}
      </div>
    </div>
  );

  const renderReports = () => {
    const filteredReports = reports.filter((r) => {
      if (!reportDateFilter) return true;
      if (!r.createdAt) return false;
      return new Date(r.createdAt).toISOString().slice(0, 10) === reportDateFilter;
    });

    return (
      <div className="bg-white rounded-2xl shadow border p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-3">
          <h3 className="text-xl font-bold">Exam Reports</h3>
          <input
            type="date"
            className="border rounded-lg p-2"
            value={reportDateFilter}
            onChange={(e) => setReportDateFilter(e.target.value)}
          />
        </div>

        <div className="space-y-4">
          {filteredReports.map((r, i) => (
            <div key={i} className="border rounded-xl p-4 bg-gray-50">
              <p><span className="font-semibold">User:</span> {r.userId}</p>
              <p><span className="font-semibold">Result:</span> {r.result}</p>
              <p><span className="font-semibold">Warnings:</span> {r.warnings}</p>
              <p><span className="font-semibold">Time:</span> {r.createdAt ? new Date(r.createdAt).toLocaleString() : "N/A"}</p>

              {Array.isArray(r.warningDetails) && r.warningDetails.length > 0 && (
                <div className="mt-3">
                  <p className="font-semibold mb-2">Warning Details:</p>
                  <div className="space-y-2">
                    {r.warningDetails.map((w, idx) => (
                      <div key={idx} className="bg-red-50 border rounded-lg p-3">
                        <p><span className="font-medium">Type:</span> {w.kind}</p>
                        <p><span className="font-medium">Reason:</span> {w.reason}</p>
                        <p><span className="font-medium">Question No:</span> {w.questionNo}</p>
                        <p><span className="font-medium">Time:</span> {w.time ? new Date(w.time).toLocaleString() : "N/A"}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          {filteredReports.length === 0 && (
            <p className="text-gray-500">No reports found for selected date</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <div className="w-72 bg-white shadow-xl p-5">
        <h1 className="text-2xl font-bold text-blue-700 mb-6">Admin Dashboard</h1>

        <SidebarButton label="Dashboard" value="dashboard" />
        <SidebarButton label="Users" value="users" />
        <SidebarButton label="Training Sentences" value="sentences" />
        <SidebarButton label="User Activity" value="activity" />
        <SidebarButton label="Login Details" value="logins" />
        <SidebarButton label="Alerts" value="alerts" />
        <SidebarButton label="Exam Reports" value="reports" />

        <button
          onClick={loadAll}
          className="mt-6 w-full bg-blue-600 text-white rounded-xl p-3 hover:bg-blue-700"
        >
          {loading ? "Refreshing..." : "Refresh All"}
        </button>
      </div>

      <div className="flex-1 p-6">
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

export default AdminDashboard;