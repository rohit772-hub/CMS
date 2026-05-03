import React from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import ParticleBackground from "./ParticleBackground";

const ROLE_VISUALS = {
  admin: {
    img: "https://images.unsplash.com/photo-1771773490670-7376a45c0e96?crop=entropy&cs=srgb&fm=jpg&q=85&w=1400",
    eyebrow: "Admin Console",
    title: "Lead the platform.",
    subtitle: "Govern courses, instructors, students and revenue from a single intelligent control room.",
  },
  instructor: {
    img: "https://images.unsplash.com/photo-1758685734511-4f49ce9a382b?crop=entropy&cs=srgb&fm=jpg&q=85&w=1400",
    eyebrow: "Instructor Studio",
    title: "Teach without limits.",
    subtitle: "Design lessons, run live classes, and watch every learner thrive with rich analytics.",
  },
  student: {
    img: "https://images.unsplash.com/photo-1758270705172-07b53627dfcb?crop=entropy&cs=srgb&fm=jpg&q=85&w=1400",
    eyebrow: "Student Universe",
    title: "Learn, level up, repeat.",
    subtitle: "AI-personalised paths, daily streaks and badges — your most playful learning home yet.",
  },
  default: {
    img: "https://images.unsplash.com/photo-1776875097847-49bd9bcf1eca?crop=entropy&cs=srgb&fm=jpg&q=85&w=1400",
    eyebrow: "CMS Edu AI",
    title: "Create. Mind. Studio.",
    subtitle: "The premium AI-native LMS for teams who refuse to build boring classrooms.",
  },
};

export default function AuthLayout({ children, role = "default", title, subtitle }) {
  const v = ROLE_VISUALS[role] || ROLE_VISUALS.default;
  return (
    <div className="min-h-screen w-full flex bg-[#060814] text-white relative overflow-hidden" data-testid={`auth-layout-${role}`}>
      {/* LEFT visual */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <ParticleBackground density="dense" />
        <img
          src={v.img}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-luminosity"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#060814]/40 via-[#060814]/60 to-[#060814]/95" />
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00E5FF] to-[#0055FF] flex items-center justify-center glow-primary">
              <Sparkles size={20} strokeWidth={1.6} />
            </div>
            <div>
              <p className="font-heading text-xl font-semibold tracking-tight">CMS Edu AI</p>
              <p className="text-xs text-[#A0ABC0]">Create · Mind · Studio</p>
            </div>
          </motion.div>

          <motion.div
            initial="hidden" animate="show"
            variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.12 } } }}
            className="space-y-5 max-w-lg"
          >
            <motion.p variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }} className="text-xs uppercase tracking-[0.32em] text-[#00E5FF] font-bold">
              {v.eyebrow}
            </motion.p>
            <motion.h1 variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }} className="font-heading text-5xl font-semibold leading-[1.05]">
              {v.title}
            </motion.h1>
            <motion.p variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }} className="text-[#A0ABC0] text-lg leading-relaxed">
              {v.subtitle}
            </motion.p>
            <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }} className="flex items-center gap-3 pt-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="glass-soft px-4 py-2 text-xs text-[#A0ABC0]">
                  {["12k+ learners", "98% completion", "AI-tutored"][i]}
                </div>
              ))}
            </motion.div>
          </motion.div>

          <p className="text-xs text-[#64748B]">© {new Date().getFullYear()} CMS Edu AI · Crafted for ambitious educators</p>
        </div>
      </div>

      {/* RIGHT form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative">
        <div className="lg:hidden absolute inset-0">
          <ParticleBackground />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md relative z-10"
        >
          {(title || subtitle) && (
            <div className="mb-8">
              {title && <h2 className="font-heading text-3xl md:text-4xl font-semibold tracking-tight">{title}</h2>}
              {subtitle && <p className="text-sm text-[#A0ABC0] mt-2">{subtitle}</p>}
            </div>
          )}
          {children}
        </motion.div>
      </div>
    </div>
  );
}
