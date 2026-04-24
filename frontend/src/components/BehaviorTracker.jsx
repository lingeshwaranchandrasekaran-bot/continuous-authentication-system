import React from "react";

function BehaviorTracker({ sessions = [], analysis = [] }) {
  const latestSession = sessions[0];
  const latestSummary = latestSession?.summary || {};

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card title="Keys" value={latestSummary.keys || 0} />
        <Card title="Mouse Moves" value={latestSummary.mouse || 0} />
        <Card title="Clicks" value={latestSummary.clicks || 0} />
        <Card title="Drags" value={latestSummary.drags || 0} />
        <Card title="Scrolls" value={latestSummary.scrolls || 0} />
        <Card title="Files" value={latestSummary.files || 0} />
        <Card title="Focus Events" value={latestSummary.focusEvents || 0} />
        <Card title="Paste Events" value={latestSummary.pasteEvents || 0} />
      </div>

      <div className="bg-white border rounded-2xl p-4">
        <h3 className="font-bold text-lg mb-3">Recent Behavior Sessions</h3>

        {sessions.length === 0 ? (
          <p className="text-gray-500">No behavior sessions found.</p>
        ) : (
          <div className="space-y-3 max-h-[350px] overflow-y-auto">
            {sessions.slice(0, 10).map((s, i) => (
              <div key={i} className="border rounded-xl p-4 bg-gray-50">
                <p>
                  <strong>Page:</strong> {s.page || "Unknown"}
                </p>
                <p>
                  <strong>Role:</strong> {s.role || "user"}
                </p>
                <p>
                  <strong>Time:</strong>{" "}
                  {s.createdAt ? new Date(s.createdAt).toLocaleString() : "N/A"}
                </p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3 text-sm">
                  <Mini label="Keys" value={s.summary?.keys || 0} />
                  <Mini label="Mouse" value={s.summary?.mouse || 0} />
                  <Mini label="Clicks" value={s.summary?.clicks || 0} />
                  <Mini label="Drags" value={s.summary?.drags || 0} />
                  <Mini label="Scrolls" value={s.summary?.scrolls || 0} />
                  <Mini label="Focus" value={s.summary?.focusEvents || 0} />
                  <Mini label="Paste" value={s.summary?.pasteEvents || 0} />
                  <Mini label="Tab Switch" value={s.summary?.tabSwitches || 0} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white border rounded-2xl p-4">
        <h3 className="font-bold text-lg mb-3">AI Behavior Analysis</h3>

        {analysis.length === 0 ? (
          <p className="text-gray-500">No AI analysis found.</p>
        ) : (
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {analysis.slice(0, 10).map((a, i) => (
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
                  <strong>Status:</strong> {a.status}
                </p>
                <p>
                  <strong>Risk Score:</strong> {a.riskScore}
                </p>
                <p>
                  <strong>Similarity:</strong>{" "}
                  {typeof a.similarity === "number"
                    ? a.similarity.toFixed(3)
                    : a.similarity}
                </p>
                <p>
                  <strong>Mismatch Count:</strong> {a.mismatchCount}
                </p>
                <p>
                  <strong>Alerts:</strong>{" "}
                  {Array.isArray(a.alerts) ? a.alerts.join(", ") : "None"}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Card({ title, value }) {
  return (
    <div className="bg-gray-50 border rounded-2xl p-4 shadow-sm">
      <p className="text-gray-500 text-sm">{title}</p>
      <h2 className="text-2xl font-bold text-blue-700">{value}</h2>
    </div>
  );
}

function Mini({ label, value }) {
  return (
    <div className="bg-white border rounded-lg p-2">
      <p className="text-gray-500">{label}</p>
      <p className="font-bold">{value}</p>
    </div>
  );
}

export default BehaviorTracker;