import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShieldAlert, ArrowLeft, LogOut } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "../../components/ui/button";
import ParticleBackground from "../../components/auth/ParticleBackground";
import { useAuth } from "../../contexts/AuthContext";

export default function Unauthorized() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const home = user && user.role ? `/${user.role}/dashboard` : "/login";

  return (
    <div className="min-h-screen text-white relative overflow-hidden flex items-center justify-center p-6" data-testid="unauthorized-page">
      <ParticleBackground />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 glass max-w-lg w-full p-10 text-center">
        <div className="w-14 h-14 rounded-2xl mx-auto mb-6 flex items-center justify-center bg-red-500/15 border border-red-400/20">
          <ShieldAlert className="text-red-300" />
        </div>
        <p className="text-xs uppercase tracking-[0.32em] text-cyan-300 font-bold">403</p>
        <h1 className="font-heading text-4xl md:text-5xl tracking-tight font-semibold mt-3">Restricted area</h1>
        <p className="text-[#A0ABC0] mt-3">You don't have permission to view this page with your current role.</p>
        <div className="flex flex-wrap justify-center gap-3 mt-8">
          <Button onClick={() => navigate(home)} className="h-11 bg-gradient-to-r from-[#00E5FF] to-[#0055FF] text-white" data-testid="unauthorized-go-home">
            <ArrowLeft className="mr-2" size={16} /> Back to your dashboard
          </Button>
          <Button onClick={async () => { await logout(); navigate("/login"); }} variant="outline" className="h-11 bg-white/5 border-white/10 hover:bg-white/10 text-white" data-testid="unauthorized-logout">
            <LogOut className="mr-2" size={16} /> Sign out
          </Button>
        </div>
        <Link to="/login" className="block mt-6 text-sm text-[#64748B] hover:text-cyan-300">Switch role</Link>
      </motion.div>
    </div>
  );
}
