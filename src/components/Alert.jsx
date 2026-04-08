import React from "react";

function Alert({ message }) {
  return (
    <div className="bg-red-100 text-red-700 p-4 rounded-lg border border-red-300 mb-3 shadow-sm">
      🚨 {message}
    </div>
  );
}

export default Alert;