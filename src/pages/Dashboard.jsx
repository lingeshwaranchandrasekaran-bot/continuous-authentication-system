import React from "react";
import Navbar from "../components/Navbar";

function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-100">
      
      <Navbar />

      <div className="p-6 max-w-7xl mx-auto">

        {/* Title */}
        <h1 className="text-3xl font-bold text-green-700 mb-6">
          System Monitoring Dashboard 🌿
        </h1>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">

          <div className="bg-white p-6 rounded-2xl shadow hover:shadow-lg transition border-l-4 border-green-500">
            <h3 className="text-gray-500">Active Users</h3>
            <p className="text-3xl font-bold text-green-600">120</p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow hover:shadow-lg transition border-l-4 border-red-500">
            <h3 className="text-gray-500">Alerts</h3>
            <p className="text-3xl font-bold text-red-500">5</p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow hover:shadow-lg transition border-l-4 border-green-500">
            <h3 className="text-gray-500">System Status</h3>
            <p className="text-3xl font-bold text-green-600">Secure</p>
          </div>

        </div>

        {/* Activity */}
        <div className="bg-white p-6 rounded-2xl shadow mb-6">
          <h2 className="text-xl font-semibold text-green-700 mb-4">
            Recent Activity
          </h2>

          <ul className="space-y-2">
            <li className="text-gray-600">✅ User admin logged in</li>
            <li className="text-gray-600">📱 New device connected</li>
            <li className="text-red-500 font-semibold">
              🚨 Suspicious login detected
            </li>
          </ul>
        </div>

        {/* Alerts */}
        <div className="bg-white p-6 rounded-2xl shadow">
          <h2 className="text-xl font-semibold text-green-700 mb-4">
            Security Alerts
          </h2>

          <div className="bg-red-100 text-red-700 p-4 rounded-lg border border-red-300">
            ⚠ Multiple failed login attempts detected
          </div>
        </div>

      </div>
    </div>
  );
}

export default Dashboard;