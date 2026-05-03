import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldCheck, GraduationCap, BookOpen, ArrowRight, Sparkles } from "lucide-react";
import ParticleBackground from "../../components/auth/ParticleBackground";

const ROLES = [
  {
    key: "admin",
    label: "Continue as Admin",
    desc: "Manage platform, instructors and analytics.",
    icon: ShieldCheck,
    accent: "from-[#00E5FF] to-[#0055FF]",
    glow: "rgba(0,229,255,0.45)",
  },
  {
    key: "instructor",
    label: "Continue as Instructor",
    desc: "Build courses, host live classes, grade work.",
    icon: BookOpen,
    accent: "from-[#FFC800] to-[#FF7A00]",
    glow: "rgba(255,200,0,0.4)",
  },
  {
    key: "student",
    label: "Continue as Student",
    desc: "Learn, earn streaks, climb the leaderboard.",
    icon: GraduationCap,
    accent: "from-[#8A2BE2] to-[#4F46E5]",
    glow: "rgba(138,43,226,0.4)",
  },
];

export default function LoginSelection() {
  return (
    <div className="min-h-screen w-full flex flex-col text-white relative overflow-hidden" data-testid="login-selection-page">
      <ParticleBackground density="dense" />
      <div className="relative z-10 flex flex-col min-h-screen">
        <header className="px-8 py-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3" data-testid="brand-link">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00E5FF] to-[#0055FF] flex items-center justify-center glow-primary">
              <Sparkles size={20} strokeWidth={1.6} />
            </div>
            <div>
              <p className="font-heading text-xl font-semibold tracking-tight">CMS Edu AI</p>
              <p className="text-xs text-[#A0ABC0]">Create · Mind · Studio</p>
            </div>
          </Link>
          <Link to="/register" className="text-sm text-[#A0ABC0] hover:text-white transition" data-testid="header-register-link">
            New here? <span className="text-cyan-400">Create account →</span>
          </Link>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
          <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-xs uppercase tracking-[0.32em] font-bold text-[#00E5FF] mb-4">
            Sign in
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="font-heading text-4xl md:text-5xl lg:text-6xl tracking-tighter font-semibold text-center max-w-3xl"
          >
            Choose how you want to <span className="text-gradient-primary">enter the studio</span>.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-[#A0ABC0] text-base md:text-lg max-w-xl text-center mt-4"
          >
            Three perfectly tailored experiences. One AI-native platform.
          </motion.p>

          <motion.div
            initial="hidden" animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.12, delayChildren: 0.18 } } }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full mt-12"
          >
            {ROLES.map((r) => {
              const Icon = r.icon;
              return (
                <motion.div
                  key={r.key}
                  variants={{ hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } }}
                  whileHover={{ y: -6 }}
                  transition={{ type: "spring", stiffness: 220, damping: 22 }}
                >
                  <Link
                    to={`/login/${r.key}`}
                    data-testid={`role-card-${r.key}`}
                    className="group relative block glass p-7 h-full transition hover:border-white/25"
                    style={{ boxShadow: `0 8px 30px rgba(0,0,0,0.5)` }}
                  >
                    <div
                      aria-hidden
                      className="absolute -inset-px rounded-2xl opacity-0 group-hover:opacity-100 transition pointer-events-none"
                      style={{ background: `linear-gradient(135deg, ${r.glow}, transparent 60%)`, padding: 1, WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)", WebkitMaskComposite: "xor", maskComposite: "exclude" }}
                    />
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${r.accent} flex items-center justify-center mb-6 shadow-lg`}>
                      <Icon size={22} strokeWidth={1.6} />
                    </div>
                    <h3 className="font-heading text-2xl font-medium tracking-tight">{r.label}</h3>
                    <p className="text-sm text-[#A0ABC0] mt-2 leading-relaxed">{r.desc}</p>
                    <div className="flex items-center gap-2 mt-7 text-sm text-cyan-300 group-hover:text-cyan-200 transition">
                      Sign in <ArrowRight size={16} className="group-hover:translate-x-1 transition" />
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>

          <p className="text-xs text-[#64748B] mt-12">
            Demo accounts (password <span className="font-mono text-[#A0ABC0]">Demo@123</span>):
            <span className="text-[#A0ABC0]"> admin@cmsedu.ai · instructor@cmsedu.ai · student@cmsedu.ai</span>
          </p>
        </main>
      </div>
    </div>
  );
}
