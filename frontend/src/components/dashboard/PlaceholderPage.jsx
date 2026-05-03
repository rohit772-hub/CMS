import React from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { GlassCard, PageHeader } from "./Common";

/**
 * Generic placeholder page used by sub-routes that aren't deeply built yet.
 * Every sidebar link still navigates here so nothing is dead.
 */
export default function PlaceholderPage({ eyebrow, title, subtitle, bullets }) {
  return (
    <div data-testid={`placeholder-${(title || "").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>
      <PageHeader eyebrow={eyebrow} title={title} subtitle={subtitle} />
      <GlassCard className="overflow-hidden">
        <div className="flex flex-col md:flex-row gap-6 items-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="w-44 h-44 shrink-0 rounded-2xl bg-gradient-to-br from-cyan-400/20 to-blue-700/20 border border-white/10 flex items-center justify-center relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-mesh-soft opacity-60" />
            <Sparkles className="text-cyan-300 relative" size={56} strokeWidth={1.4} />
          </motion.div>
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-cyan-300 font-bold">Coming together</p>
            <h3 className="font-heading text-2xl md:text-3xl tracking-tight mt-1">This panel is being polished.</h3>
            <p className="text-sm text-[#A0ABC0] mt-2 max-w-xl">
              The route is wired up and the page is reachable from the sidebar — the deep-dive functionality lands in the next iteration.
            </p>
            {bullets && (
              <ul className="mt-4 space-y-2 text-sm text-[#A0ABC0]">
                {bullets.map((b, i) => (
                  <li key={i} className="flex gap-2 items-start"><span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" /> {b}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
