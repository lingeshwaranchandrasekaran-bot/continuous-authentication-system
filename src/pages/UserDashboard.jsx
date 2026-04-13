import React from "react";
import { useNavigate } from "react-router-dom";

function UserDashboard() {
  const navigate = useNavigate();

  return (
    <div className="p-6 min-h-screen bg-gray-100">
      <h1 className="text-3xl text-green-700 font-bold mb-6">
        👤 User Dashboard
      </h1>

      <div className="flex gap-6">
        <button
          onClick={() => navigate("/training")}
          className="bg-green-600 text-white px-6 py-4 rounded-xl"
        >
          Training Mode
        </button>

        <button
          onClick={() => navigate("/exam")}
          className="bg-blue-600 text-white px-6 py-4 rounded-xl"
        >
          Exam Mode
        </button>
      </div>
    </div>
  );
}

export default UserDashboard;