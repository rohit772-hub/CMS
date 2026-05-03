import React, { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { useAuth } from "../../contexts/AuthContext";

export default function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useAuth();
  const location = useLocation();

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  if (!user) return null;
  return (
    <div className="min-h-screen bg-mesh-soft text-white flex" data-testid="dashboard-layout">
      <Sidebar
        role={user.role}
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div
        className="flex-1 flex flex-col min-h-screen transition-all duration-300"
        style={{ marginLeft: typeof window !== "undefined" && window.innerWidth >= 1024 ? (collapsed ? 80 : 264) : 0 }}
      >
        <Topbar user={user} onBurger={() => setMobileOpen(true)} />
        <main className="flex-1 p-4 md:p-6 lg:p-8" data-testid="dashboard-main">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
