import React from "react";

function SecurityBot({ status, riskScore, message }) {
  const isDanger = status === "FRAUD";
  const isWarning = status === "SUSPICIOUS";

  return (
    <div
      className={`fixed bottom-5 right-5 w-80 rounded-2xl shadow-xl p-4 border ${
        isDanger
          ? "bg-red-50 border-red-400"
          : isWarning
          ? "bg-yellow-50 border-yellow-400"
          : "bg-green-50 border-green-400"
      }`}
    >
      <h3 className="font-bold text-lg">Security Bot</h3>
      <p className="mt-2">
        Status: <strong>{status || "Monitoring"}</strong>
      </p>
      <p>Risk Score: {riskScore || 0}</p>
      <p className="text-sm text-gray-600 mt-2">
        {message || "User behavior is being monitored continuously."}
      </p>
    </div>
  );
}

export default SecurityBot;