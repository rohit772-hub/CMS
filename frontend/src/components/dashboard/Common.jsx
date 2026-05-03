import React from "react";
import { motion } from "framer-motion";

export function KpiCard({ label, value, delta, tone = "up", index = 0, icon: Icon }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="glass p-5 hover:border-white/20 hover:-translate-y-0.5 transition-all"
      data-testid={`kpi-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.18em] text-[#A0ABC0] font-semibold">{label}</p>
        {Icon && <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-cyan-300"><Icon size={16} strokeWidth={1.6} /></div>}
      </div>
      <p className="font-heading text-3xl md:text-4xl font-semibold mt-2 tracking-tight">{value}</p>
      <p className={`text-xs mt-1 ${tone === "down" ? "text-red-300" : "text-emerald-300"}`}>
        {tone === "down" ? "▼" : "▲"} {delta} this week
      </p>
    </motion.div>
  );
}

export function GlassCard({ title, action, children, className = "", testid }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={`glass p-6 ${className}`}
      data-testid={testid}
    >
      {(title || action) && (
        <div className="flex items-center justify-between mb-5">
          {title && <h3 className="font-heading text-lg md:text-xl font-medium tracking-tight">{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </motion.section>
  );
}

export function PageHeader({ eyebrow, title, subtitle, action }) {
  return (
    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
      <div>
        {eyebrow && <p className="text-xs uppercase tracking-[0.32em] text-cyan-300 font-bold">{eyebrow}</p>}
        <h1 className="font-heading text-3xl md:text-4xl font-semibold tracking-tight mt-1">{title}</h1>
        {subtitle && <p className="text-sm text-[#A0ABC0] mt-1 max-w-2xl">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
