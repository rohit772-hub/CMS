import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { GraduationCap, BookOpen, ArrowRight } from "lucide-react";
import ParticleBackground from "../../components/auth/ParticleBackground";
import Brand from "../../components/Brand";

const ROLES = [
  {
    key: "instructor",
    label: "School Admin Login",
    desc: "Manage your school's students, courses and resources.",
    icon: BookOpen,
    accent: "from-[#126b6e] to-[#0d3b3f]",
    glow: "rgba(18,107,110,0.5)",
  },
  {
    key: "student",
    label: "Student Login",
    desc: "Open your classroom, learn and earn rewards.",
    icon: GraduationCap,
    accent: "from-[#d23028] to-[#a31f1a]",
    glow: "rgba(210,48,40,0.45)",
  },
];

export default function LoginSelection() {
  return (
    <div className="min-h-screen w-full flex flex-col text-white relative overflow-hidden" data-testid="login-selection-page">
      <ParticleBackground density="dense" />
      <div className="relative z-10 flex flex-col min-h-screen">
        <header className="px-8 py-6 flex items-center justify-between">
          <Link to="/" data-testid="brand-link"><Brand /></Link>
          <span className="text-xs text-[#A0ABC0] uppercase tracking-[0.32em]">Welcome back</span>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
          <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-xs uppercase tracking-[0.32em] font-bold text-[#5fc8c4] mb-4">
            Sign in
          </motion.p>
          <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="font-heading text-4xl md:text-5xl lg:text-6xl tracking-tighter font-semibold text-center max-w-3xl">
            Choose how you want to <span className="text-gradient-primary">enter the studio</span>.
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="text-[#A0ABC0] text-base md:text-lg max-w-xl text-center mt-4">
            Two tailored experiences. One AI-native learning platform.
          </motion.p>

          <motion.div initial="hidden" animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.12, delayChildren: 0.18 } } }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl w-full mt-12">
            {ROLES.map((r) => {
              const Icon = r.icon;
              return (
                <motion.div key={r.key} variants={{ hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } }} whileHover={{ y: -6 }} transition={{ type: "spring", stiffness: 220, damping: 22 }}>
                  <Link to={`/login/${r.key}`} data-testid={`role-card-${r.key}`}
                    className="group relative block glass p-7 h-full transition hover:border-white/25"
                    style={{ boxShadow: `0 8px 30px rgba(0,0,0,0.5)` }}>
                    <div aria-hidden className="absolute -inset-px rounded-2xl opacity-0 group-hover:opacity-100 transition pointer-events-none"
                      style={{ background: `linear-gradient(135deg, ${r.glow}, transparent 60%)`, padding: 1, WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)", WebkitMaskComposite: "xor", maskComposite: "exclude" }} />
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${r.accent} flex items-center justify-center mb-6 shadow-lg`}>
                      <Icon size={22} strokeWidth={1.6} />
                    </div>
                    <h3 className="font-heading text-2xl font-medium tracking-tight">{r.label}</h3>
                    <p className="text-sm text-[#A0ABC0] mt-2 leading-relaxed">{r.desc}</p>
                    <div className="flex items-center gap-2 mt-7 text-sm text-[#5fc8c4] group-hover:text-[#7ad8d2] transition">
                      Sign in <ArrowRight size={16} className="group-hover:translate-x-1 transition" />
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>

          <p className="text-xs text-[#64748B] mt-12 text-center max-w-xl">
            Accounts are created by your school administrator.<br />
            <span className="text-[#A0ABC0]">If you need help signing in, contact your school.</span>
          </p>
        </main>
      </div>
    </div>
  );
}
