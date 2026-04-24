import React from "react";

function RiskBadge({ status }) {
  const s = status || "UNKNOWN";

  let cls = "bg-gray-100 text-gray-700";
  if (s === "GENUINE") cls = "bg-green-100 text-green-700";
  if (s === "SUSPICIOUS") cls = "bg-yellow-100 text-yellow-700";
  if (s === "FRAUD") cls = "bg-red-100 text-red-700";

  return (
    <span className={`px-3 py-1 rounded-full text-sm font-bold ${cls}`}>
      {s}
    </span>
  );
}

export default RiskBadge;