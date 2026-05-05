import React, { useMemo } from "react";

const formatIST = (time) => {
  if (!time) return "N/A";

  return new Date(time).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "medium",
  });
};

function BehaviorTracker({ sessions = [], analysis = [] }) {
  const latestSession = sessions[0] || {};
  const latestSummary = latestSession.summary || {};

  const recentWindows = useMemo(() => {
    const focusEvents = latestSession?.events?.focusEvents || [];
    return focusEvents.slice(-8).reverse();
  }, [latestSession]);

  const latestAnalysis = analysis[0] || {};

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-3xl p-6 shadow-sm">
          <p className="text-blue-100 text-sm">Latest Behavior Session</p>
          <h3 className="text-3xl font-bold mt-2">
            {latestSession.page || "No Session"}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5">
            <InfoDark label="Role" value={latestSession.role || "N/A"} />
            <InfoDark label="Time" value={formatIST(latestSession.createdAt)} />
            <InfoDark label="Desktop Risk" value={latestSession.desktopRisk || 0} />
          </div>

          {Array.isArray(latestSession.desktopReasons) &&
            latestSession.desktopReasons.length > 0 && (
              <div className="mt-5 bg-white/10 border border-white/20 rounded-2xl p-4">
                <p className="text-sm text-blue-100 mb-2">Risk Reasons</p>
                <div className="flex flex-wrap gap-2">
                  {latestSession.desktopReasons.map((r, i) => (
                    <span
                      key={i}
                      className="bg-white/20 px-3 py-1 rounded-full text-sm"
                    >
                      {r}
                    </span>
                  ))}
                </div>
              </div>
            )}
        </div>

        <div className="bg-white border rounded-3xl p-6 shadow-sm">
          <p className="text-sm text-slate-500">Latest AI Decision</p>
          <h3
            className={`text-3xl font-bold mt-2 ${
              latestAnalysis.status === "FRAUD"
                ? "text-red-600"
                : latestAnalysis.status === "SUSPICIOUS"
                ? "text-orange-600"
                : "text-green-600"
            }`}
          >
            {latestAnalysis.status || "N/A"}
          </h3>

          <div className="space-y-3 mt-5">
            <MiniLine label="Risk Score" value={latestAnalysis.riskScore || 0} />
            <MiniLine
              label="Similarity"
              value={
                typeof latestAnalysis.similarity === "number"
                  ? latestAnalysis.similarity.toFixed(3)
                  : latestAnalysis.similarity || "N/A"
              }
            />
            <MiniLine
              label="Warning Count"
              value={`${latestAnalysis.warningCount || 0}/3`}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-4">
        <Metric title="Keys" value={latestSummary.keys || 0} />
        <Metric title="Mouse" value={latestSummary.mouse || 0} />
        <Metric title="Clicks" value={latestSummary.clicks || 0} />
        <Metric title="Scrolls" value={latestSummary.scrolls || 0} />
        <Metric title="Drags" value={latestSummary.drags || 0} />
        <Metric title="Focus" value={latestSummary.focusEvents || 0} />
        <Metric title="Paste" value={latestSummary.pasteEvents || 0} />
        <Metric title="Tab Switch" value={latestSummary.tabSwitches || 0} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Panel title="Recent Desktop / App Switches">
          {recentWindows.length === 0 ? (
            <Empty text="No app switch data found in latest session." />
          ) : (
            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
              {recentWindows.map((w, i) => (
                <div key={i} className="bg-slate-50 border rounded-2xl p-4">
                  <p className="font-semibold text-slate-900">
                    {w.window || "Unknown Window"}
                  </p>
                  <p className="text-sm text-slate-500 mt-1">
                    {formatIST(w.time)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Recent Behavior Sessions">
          {sessions.length === 0 ? (
            <Empty text="No behavior sessions found." />
          ) : (
            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
              {sessions.slice(0, 10).map((s, i) => (
                <div key={i} className="bg-white border rounded-2xl p-4 shadow-sm">
                  <div className="flex justify-between gap-3 flex-wrap">
                    <div>
                      <p className="font-bold text-slate-900">
                        {s.page || "Unknown"}
                      </p>
                      <p className="text-sm text-slate-500">
                        {formatIST(s.createdAt)}
                      </p>
                    </div>

                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold border h-fit ${
                        (s.desktopRisk || 0) >= 70
                          ? "bg-red-100 text-red-700 border-red-200"
                          : (s.desktopRisk || 0) >= 30
                          ? "bg-orange-100 text-orange-700 border-orange-200"
                          : "bg-green-100 text-green-700 border-green-200"
                      }`}
                    >
                      Risk {s.desktopRisk || 0}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mt-4 text-sm">
                    <SmallMetric label="Keys" value={s.summary?.keys || 0} />
                    <SmallMetric label="Mouse" value={s.summary?.mouse || 0} />
                    <SmallMetric label="Clicks" value={s.summary?.clicks || 0} />
                    <SmallMetric label="Focus" value={s.summary?.focusEvents || 0} />
                    <SmallMetric label="Paste" value={s.summary?.pasteEvents || 0} />
                    <SmallMetric label="Scroll" value={s.summary?.scrolls || 0} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <Panel title="Recent AI Behavior Analysis">
        {analysis.length === 0 ? (
          <Empty text="No AI analysis found." />
        ) : (
          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
            {analysis.slice(0, 10).map((a, i) => (
              <div
                key={i}
                className={`border rounded-2xl p-4 ${
                  a.status === "FRAUD"
                    ? "bg-red-50 border-red-200"
                    : a.status === "SUSPICIOUS"
                    ? "bg-orange-50 border-orange-200"
                    : "bg-green-50 border-green-200"
                }`}
              >
                <div className="flex justify-between flex-wrap gap-3">
                  <div>
                    <p className="font-bold text-slate-900">{a.status}</p>
                    <p className="text-sm text-slate-500">
                      {formatIST(a.createdAt)}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="font-bold text-slate-900">
                      Risk {a.riskScore || 0}
                    </p>
                    <p className="text-sm text-slate-500">
                      Warning {a.warningCount || 0}/3
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                  <Info label="Similarity" value={typeof a.similarity === "number" ? a.similarity.toFixed(3) : a.similarity || "N/A"} />
                  <Info label="Mismatch" value={a.mismatchCount || 0} />
                  <Info label="Source" value={a.source || "N/A"} />
                </div>

                <p className="text-sm text-slate-600 mt-3">
                  Alerts:{" "}
                  {Array.isArray(a.alerts) && a.alerts.length > 0
                    ? a.alerts.join(", ")
                    : "None"}
                </p>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <section className="bg-white border rounded-3xl p-5 shadow-sm">
      <h3 className="text-xl font-bold text-slate-900 mb-5">{title}</h3>
      {children}
    </section>
  );
}

function Metric({ title, value }) {
  return (
    <div className="bg-white border rounded-2xl p-4 shadow-sm">
      <p className="text-xs text-slate-500">{title}</p>
      <h3 className="text-2xl font-bold text-slate-900 mt-1">{value}</h3>
    </div>
  );
}

function SmallMetric({ label, value }) {
  return (
    <div className="bg-slate-50 border rounded-xl p-2">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="font-bold text-slate-900">{value}</p>
    </div>
  );
}

function InfoDark({ label, value }) {
  return (
    <div className="bg-white/10 border border-white/20 rounded-2xl p-4">
      <p className="text-xs text-blue-100">{label}</p>
      <p className="font-bold text-white mt-1 break-words">{value}</p>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="bg-white/70 border rounded-xl p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="font-semibold text-slate-800 break-words">{value}</p>
    </div>
  );
}

function MiniLine({ label, value }) {
  return (
    <div className="flex justify-between border-b pb-2">
      <span className="text-slate-500">{label}</span>
      <span className="font-bold text-slate-900">{value}</span>
    </div>
  );
}

function Empty({ text }) {
  return (
    <div className="border border-dashed rounded-2xl p-8 text-center text-slate-500 bg-slate-50">
      {text}
    </div>
  );
}

export default BehaviorTracker;