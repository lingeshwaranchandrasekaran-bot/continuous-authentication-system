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
  Legend
} from "recharts";

function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");

  const [stats, setStats] = useState({
    totalUsers: 0,
    totalReports: 0,
    totalAlerts: 0,
    fraudCount: 0,
    suspiciousCount: 0,
    genuineCount: 0
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

  const loadAll = async () => {
    try {
      const [
        statsRes,
        usersRes,
        reportsRes,
        analysisRes,
        alertsRes,
        loginLogsRes
      ] = await Promise.all([
        fetch("http://localhost:5000/api/admin/stats"),
        fetch("http://localhost:5000/api/admin/users"),
        fetch("http://localhost:5000/api/admin/reports"),
        fetch("http://localhost:5000/api/admin/analysis"),
        fetch("http://localhost:5000/api/admin/alerts"),
        fetch("http://localhost:5000/api/admin/login-logs")
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
  };

  const handleDeleteUser = async () => {
    if (!deleteUsername) {
      alert("Enter username to delete");
      return;
    }

    const res = await fetch(`http://localhost:5000/api/admin/delete-user/${deleteUsername}`, {
      method: "DELETE"
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Delete failed");
      return;
    }

    alert("User deleted successfully");
    setDeleteUsername("");
    loadAll();
  };

  const handleResetTraining = async () => {
    if (!resetUsername) {
      alert("Enter username to reset training");
      return;
    }

    const res = await fetch(`http://localhost:5000/api/admin/reset-training/${resetUsername}`, {
      method: "POST"
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Reset failed");
      return;
    }

    alert("Training reset successful");
    setResetUsername("");
    loadAll();
  };

  const handleAddSentence = async () => {
    if (!newSentence.trim()) {
      alert("Enter sentence");
      return;
    }

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
  };

  const pieData = [
    { name: "Genuine", value: stats.genuineCount || 0 },
    { name: "Suspicious", value: stats.suspiciousCount || 0 },
    { name: "Fraud", value: stats.fraudCount || 0 }
  ];

  const barData = [
    { name: "Users", value: stats.totalUsers || 0 },
    { name: "Reports", value: stats.totalReports || 0 },
    { name: "Alerts", value: stats.totalAlerts || 0 }
  ];

  const renderContent = () => {
    if (activeTab === "dashboard") {
      return (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-xl">
              <h3 className="font-bold">Total Users</h3>
              <p className="text-2xl font-bold">{stats.totalUsers}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-xl">
              <h3 className="font-bold">Total Reports</h3>
              <p className="text-2xl font-bold">{stats.totalReports}</p>
            </div>
            <div className="bg-red-50 p-4 rounded-xl">
              <h3 className="font-bold">Total Alerts</h3>
              <p className="text-2xl font-bold">{stats.totalAlerts}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border rounded-xl p-4 h-80">
              <h3 className="font-bold mb-4">User Status Distribution</h3>
              <ResponsiveContainer width="100%" height="90%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    outerRadius={100}
                    label
                  >
                    <Cell />
                    <Cell />
                    <Cell />
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white border rounded-xl p-4 h-80">
              <h3 className="font-bold mb-4">System Summary</h3>
              <ResponsiveContainer width="100%" height="90%">
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="value" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      );
    }

    if (activeTab === "users") {
      return (
        <div className="space-y-4">
          <div className="bg-white border rounded-xl p-4">
            <h3 className="font-bold mb-3">Create User</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <input
                className="border rounded p-2"
                placeholder="Username"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
              />
              <input
                className="border rounded p-2"
                placeholder="Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <select
                className="border rounded p-2"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
              <button
                onClick={handleCreateUser}
                className="bg-green-600 text-white rounded p-2"
              >
                Create User
              </button>
            </div>
          </div>

          <div className="bg-white border rounded-xl p-4">
            <h3 className="font-bold mb-3">Delete User</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                className="border rounded p-2"
                placeholder="Username to delete"
                value={deleteUsername}
                onChange={(e) => setDeleteUsername(e.target.value)}
              />
              <button
                onClick={handleDeleteUser}
                className="bg-red-600 text-white rounded p-2"
              >
                Delete User
              </button>
            </div>
          </div>

          <div className="bg-white border rounded-xl p-4">
            <h3 className="font-bold mb-3">Reset Training</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                className="border rounded p-2"
                placeholder="Username to reset training"
                value={resetUsername}
                onChange={(e) => setResetUsername(e.target.value)}
              />
              <button
                onClick={handleResetTraining}
                className="bg-yellow-600 text-white rounded p-2"
              >
                Reset Training
              </button>
            </div>
          </div>

          <div className="bg-white border rounded-xl p-4">
            <h3 className="font-bold mb-3">Users List</h3>
            {users.map((u, i) => (
              <div key={i} className="border p-3 rounded mb-2">
                {u.username} - {u.role}
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (activeTab === "sentences") {
      return (
        <div className="bg-white border rounded-xl p-4">
          <h3 className="font-bold mb-3">Add Training Sentence</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <input
              className="border rounded p-2 md:col-span-4"
              placeholder="Enter training sentence"
              value={newSentence}
              onChange={(e) => setNewSentence(e.target.value)}
            />
            <button
              onClick={handleAddSentence}
              className="bg-purple-600 text-white rounded p-2"
            >
              Add Sentence
            </button>
          </div>
        </div>
      );
    }

    if (activeTab === "activity") {
      return (
        <div className="bg-white border rounded-xl p-4">
          <h3 className="font-bold mb-3">User Activity / Analysis Logs</h3>
          {analysis.map((a, i) => (
            <div key={i} className="border p-3 rounded mb-2">
              {a.userId} - {a.status} - similarity: {typeof a.similarity === "number" ? a.similarity.toFixed(3) : a.similarity} - risk: {a.riskScore}
            </div>
          ))}
        </div>
      );
    }

    if (activeTab === "logins") {
      return (
        <div className="bg-white border rounded-xl p-4">
          <h3 className="font-bold mb-3">Login Logs</h3>
          {loginLogs.map((l, i) => (
            <div key={i} className="border p-3 rounded mb-2">
              {l.username} - {l.role} - {l.loginAt ? new Date(l.loginAt).toLocaleString() : ""}
            </div>
          ))}
        </div>
      );
    }

    if (activeTab === "alerts") {
      return (
        <div className="bg-white border rounded-xl p-4">
          <h3 className="font-bold mb-3">Alerts</h3>
          {alerts.map((a, i) => (
            <div key={i} className="border p-3 rounded mb-2 bg-red-50">
              {a.userId} - {a.type} - {a.message}
            </div>
          ))}
        </div>
      );
    }

    if (activeTab === "reports") {
      return (
        <div className="bg-white border rounded-xl p-4">
          <h3 className="font-bold mb-3">Exam Reports</h3>
          {reports.map((r, i) => (
            <div key={i} className="border p-3 rounded mb-2">
              {r.userId} - {r.result} - warnings: {r.warnings}
            </div>
          ))}
        </div>
      );
    }

    return <div>No data</div>;
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <div className="w-72 bg-white shadow-lg p-4">
        <h1 className="text-2xl font-bold text-blue-700 mb-6">Admin Panel</h1>

        <button className="block w-full text-left p-3 rounded hover:bg-gray-100" onClick={() => setActiveTab("dashboard")}>
          Dashboard
        </button>
        <button className="block w-full text-left p-3 rounded hover:bg-gray-100" onClick={() => setActiveTab("users")}>
          Users
        </button>
        <button className="block w-full text-left p-3 rounded hover:bg-gray-100" onClick={() => setActiveTab("sentences")}>
          Training Sentences
        </button>
        <button className="block w-full text-left p-3 rounded hover:bg-gray-100" onClick={() => setActiveTab("activity")}>
          User Activity
        </button>
        <button className="block w-full text-left p-3 rounded hover:bg-gray-100" onClick={() => setActiveTab("logins")}>
          Login Logs
        </button>
        <button className="block w-full text-left p-3 rounded hover:bg-gray-100" onClick={() => setActiveTab("alerts")}>
          Alerts
        </button>
        <button className="block w-full text-left p-3 rounded hover:bg-gray-100" onClick={() => setActiveTab("reports")}>
          Exam Reports
        </button>

        <button
          className="mt-6 w-full bg-blue-600 text-white rounded p-2"
          onClick={loadAll}
        >
          Refresh All
        </button>
      </div>

      <div className="flex-1 p-6">
        {renderContent()}
      </div>
    </div>
  );
}

export default AdminDashboard;