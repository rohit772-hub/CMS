import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { formatApiError, setToken } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";
import { motion } from "framer-motion";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
export default function AuthCallback() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const hasProcessed = useRef(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const hash = window.location.hash || "";
    const m = hash.match(/session_id=([^&]+)/);
    if (!m) {
      navigate("/login", { replace: true });
      return;
    }
    const session_id = decodeURIComponent(m[1]);
    (async () => {
      try {
        const { data } = await api.post("/auth/google/session", { session_id });
        if (data.access_token) setToken(data.access_token);
        setUser(data.user);
        const role = data.user.role;
        const target = role === "admin" ? "/admin/dashboard"
          : role === "instructor" ? "/instructor/dashboard"
          : "/student/dashboard";
        // strip the hash
        window.history.replaceState(null, "", window.location.pathname);
        navigate(target, { replace: true, state: { user: data.user } });
      } catch (e) {
        setError(formatApiError(e.response?.data?.detail) || "Google sign-in failed.");
        setTimeout(() => navigate("/login", { replace: true }), 2400);
      }
    })();
  }, [navigate, setUser]);

  return (
    <div className="min-h-screen bg-mesh flex items-center justify-center" data-testid="auth-callback">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass px-8 py-7 text-center"
      >
        {!error ? (
          <>
            <div className="w-10 h-10 rounded-full mx-auto mb-3 border-2 border-cyan-400/40 border-t-cyan-400 animate-spin" />
            <p className="text-sm text-[#A0ABC0]">Finalising your Google sign-in…</p>
          </>
        ) : (
          <p className="text-sm text-red-400">{error}</p>
        )}
      </motion.div>
    </div>
  );
}
