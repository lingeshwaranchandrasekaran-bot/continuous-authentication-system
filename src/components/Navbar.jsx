import React from "react";
import { useNavigate } from "react-router-dom";

function Navbar() {
  const navigate = useNavigate();

  return (
    <div className="bg-green-600 text-white px-6 py-4 flex justify-between items-center shadow-md">
      
      <h1 className="text-xl font-bold tracking-wide">
        🛡 Monitor System
      </h1>

      <button
        onClick={() => navigate("/")}
        className="bg-white text-green-600 px-4 py-1 rounded-lg hover:bg-gray-200 transition"
      >
        Logout
      </button>

    </div>
  );
}

export default Navbar;