import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { motion } from "framer-motion";

export default function ProtectedRoute({ allow, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-mesh flex items-center justify-center" data-testid="protected-loading">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass px-8 py-6 text-sm text-[#A0ABC0]"
        >
          <span className="inline-block w-2 h-2 mr-2 rounded-full bg-cyan-400 animate-pulse" />
          Verifying session…
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allow && Array.isArray(allow) && !allow.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}
