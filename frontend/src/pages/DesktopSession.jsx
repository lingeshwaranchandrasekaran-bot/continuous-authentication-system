import React, { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

function DesktopSession() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const username = params.get("username");
    const role = params.get("role");
    const hasBaseline = params.get("hasBaseline") === "true";

    if (!username || !role) {
      navigate("/", { replace: true });
      return;
    }

    const cleanRole = role.toLowerCase();

    localStorage.clear();

    const user = {
      username,
      role: cleanRole,
      hasBaseline,
    };

    localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem("userId", username);
    localStorage.setItem("role", cleanRole);
    localStorage.setItem("hasBaseline", hasBaseline ? "true" : "false");

    if (cleanRole === "admin") {
      navigate("/admin", { replace: true });
    } else {
      navigate("/user", { replace: true });
    }
  }, [params, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="bg-white rounded-3xl shadow p-8 text-center">
        <h1 className="text-2xl font-bold text-blue-700">
          Creating Secure Session...
        </h1>
        <p className="text-slate-600 mt-2">
          Please wait, opening dashboard.
        </p>
      </div>
    </div>
  );
}

export default DesktopSession;