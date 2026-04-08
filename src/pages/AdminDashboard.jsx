import React, { useState, useEffect } from "react";

function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState("");
  const [newPass, setNewPass] = useState("");

  // Load users from localStorage
  useEffect(() => {
    const storedUsers = JSON.parse(localStorage.getItem("users")) || [];
    setUsers(storedUsers);
  }, []);

  // Add user
  const addUser = () => {
    if (!newUser || !newPass) return;

    const newUserData = { username: newUser, password: newPass };

    const existingUsers = JSON.parse(localStorage.getItem("users")) || [];

    const updatedUsers = [...existingUsers, newUserData];

    localStorage.setItem("users", JSON.stringify(updatedUsers));

    setUsers(updatedUsers);

    setNewUser("");
    setNewPass("");
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold text-green-700 mb-6">
        👨‍💼 Admin Dashboard
      </h1>

      {/* Create User */}
      <div className="bg-white p-6 rounded shadow mb-6">
        <h2 className="text-xl font-semibold mb-4">Create User</h2>

        <input
          className="border p-2 mr-2"
          placeholder="User ID"
          value={newUser}
          onChange={(e) => setNewUser(e.target.value)}
        />

        <input
          className="border p-2 mr-2"
          placeholder="Password"
          value={newPass}
          onChange={(e) => setNewPass(e.target.value)}
        />

        <button
          onClick={addUser}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          Add User
        </button>
      </div>

      {/* User List */}
      <div className="bg-white p-6 rounded shadow">
        <h2 className="text-xl font-semibold mb-4">
          📋 Created Users
        </h2>

        {users.length === 0 ? (
          <p>No users created</p>
        ) : (
          users.map((u, i) => (
            <p key={i} className="border-b py-2">
              👤 {u.username}
            </p>
          ))
        )}
      </div>
    </div>
  );
}

export default AdminDashboard;