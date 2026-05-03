import React from "react";
import { motion } from "framer-motion";

/**
 * Animated background — gradient mesh + floating glassmorphism shapes.
 * Uses pure CSS / framer-motion instead of tsparticles for a lighter bundle.
 */
export default function ParticleBackground({ density = "normal" }) {
  const shapes = density === "dense" ? 14 : 8;
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" data-testid="particle-bg">
      <div className="absolute inset-0 bg-mesh" />
      {/* Aurora blobs */}
      <div className="absolute -top-40 -left-40 w-[520px] h-[520px] rounded-full bg-cyan-500/20 blur-3xl aurora" />
      <div className="absolute -bottom-40 -right-32 w-[560px] h-[560px] rounded-full bg-blue-700/30 blur-3xl aurora" />
      <div className="absolute top-1/3 right-1/4 w-[320px] h-[320px] rounded-full bg-violet-600/20 blur-3xl aurora" />
      {/* Floating glass squares */}
      {Array.from({ length: shapes }).map((_, i) => {
        const size = 24 + ((i * 17) % 60);
        const left = (i * 73) % 95;
        const top = (i * 41) % 90;
        const dur = 8 + (i % 5) * 2;
        return (
          <motion.div
            key={i}
            className="absolute rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm"
            style={{ width: size, height: size, left: `${left}%`, top: `${top}%` }}
            animate={{ y: [0, -18, 0], rotate: [0, 8, 0], opacity: [0.35, 0.7, 0.35] }}
            transition={{ duration: dur, repeat: Infinity, ease: "easeInOut", delay: i * 0.25 }}
          />
        );
      })}
      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage: "radial-gradient(ellipse at center, black 40%, transparent 80%)",
        }}
      />
    </div>
  );
}
