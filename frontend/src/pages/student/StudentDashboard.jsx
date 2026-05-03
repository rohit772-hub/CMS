import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip as ReTooltip, XAxis, YAxis } from "recharts";
import { Flame, Trophy, Sparkles, Play, Lock, ArrowUpRight } from "lucide-react";
import api from "../../lib/api";
import { GlassCard, PageHeader } from "../../components/dashboard/Common";
import { useAuth } from "../../contexts/AuthContext";

function ProgressCircle({ value = 0, size = 96, stroke = 9, color = "#00E5FF" }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (value / 100) * c;
  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} fill="none" />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} strokeLinecap="round" fill="none"
        strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: off }} transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
      />
    </svg>
  );
}

const tooltipStyle = {
  contentStyle: { background: "rgba(11,17,32,0.85)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#fff", backdropFilter: "blur(8px)" },
  itemStyle: { color: "#fff" }, labelStyle: { color: "#A0ABC0", fontSize: 12 },
};

export default function StudentDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [courses, setCourses] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const [s, c] = await Promise.all([api.get("/student/stats"), api.get("/student/courses")]);
        setStats(s.data); setCourses(c.data.courses || []);
      } catch (_) {}
    })();
  }, []);

  const xpPct = stats ? Math.min(100, Math.round((stats.xp / stats.next_xp) * 100)) : 0;

  return (
    <div data-testid="student-dashboard">
      <PageHeader
        eyebrow={`Level ${stats?.level ?? "—"}`}
        title={`Hey ${stats?.greeting?.split(" ")[0] || user?.name?.split(" ")[0] || "you"} — keep the streak alive!`}
        subtitle="Three lessons today and you'll unlock the 'Code Wizard' badge."
      />

      {/* Top row: Streak / XP / Quick stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="glass p-5 flex items-center gap-5" data-testid="student-streak">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-red-600 flex items-center justify-center glow-primary-strong">
            <Flame size={24} />
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-[#A0ABC0]">Daily streak</p>
            <p className="font-heading text-3xl font-semibold">{stats?.streak_days ?? 0} days</p>
            <p className="text-xs text-amber-300 mt-0.5">🔥 Best month so far</p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass p-5 flex items-center gap-5" data-testid="student-xp">
          <div className="relative">
            <ProgressCircle value={xpPct} />
            <div className="absolute inset-0 flex items-center justify-center text-xs font-mono text-cyan-300">{xpPct}%</div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-[#A0ABC0]">XP progress</p>
            <p className="font-heading text-3xl font-semibold">{stats?.xp ?? 0}<span className="text-[#64748B] text-base font-normal"> / {stats?.next_xp ?? 0}</span></p>
            <p className="text-xs text-cyan-300 mt-0.5">Next level in {Math.max(0, (stats?.next_xp ?? 0) - (stats?.xp ?? 0))} XP</p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass p-5" data-testid="student-badges">
          <p className="text-xs uppercase tracking-widest text-[#A0ABC0]">Badges</p>
          <div className="flex gap-3 mt-3 flex-wrap">
            {(stats?.badges || []).map((b) => (
              <div key={b.name} className="flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-3 py-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: b.color, boxShadow: `0 0 12px ${b.color}` }} />
                <span className="text-xs text-white">{b.name}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Weekly chart + Leaderboard */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mt-6">
        <GlassCard title="This week's learning" className="xl:col-span-2" testid="student-weekly-chart">
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={stats?.weekly_progress || []}>
                <defs>
                  <linearGradient id="gW" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00E5FF" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="#0055FF" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="#64748B" fontSize={12} />
                <YAxis stroke="#64748B" fontSize={12} />
                <ReTooltip {...tooltipStyle} />
                <Area dataKey="value" stroke="#00E5FF" strokeWidth={2.5} fill="url(#gW)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard title="Leaderboard" action={<Trophy size={18} className="text-yellow-300" />} testid="student-leaderboard">
          <ul className="space-y-2">
            {(stats?.leaderboard || []).map((row) => (
              <li
                key={row.rank}
                className={[
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 border",
                  row.is_me ? "bg-cyan-400/10 border-cyan-400/30" : "bg-white/3 border-white/5",
                ].join(" ")}
              >
                <span className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-xs font-mono">{row.rank}</span>
                <span className="flex-1 text-sm">{row.name}{row.is_me && <span className="ml-2 text-[10px] uppercase tracking-widest text-cyan-300">you</span>}</span>
                <span className="text-xs text-[#A0ABC0] font-mono">{row.xp.toLocaleString()} XP</span>
              </li>
            ))}
          </ul>
        </GlassCard>
      </div>

      {/* Continue learning */}
      <GlassCard title="Continue learning" action={<a className="text-sm text-cyan-300 hover:text-cyan-200 inline-flex items-center gap-1" href="/student/courses" data-testid="student-see-all-courses">All courses <ArrowUpRight size={14} /></a>} className="mt-6" testid="student-continue-learning">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {courses.slice(0, 6).map((c, i) => {
            const locked = c.progress === 0 && i > 3;
            return (
              <motion.div
                key={c.id} whileHover={{ y: -4 }}
                className="rounded-xl overflow-hidden border border-white/5 bg-white/3"
                data-testid={`student-course-${c.id}`}
              >
                <div className="relative aspect-video bg-cover bg-center" style={{ backgroundImage: `url(${c.thumbnail})` }}>
                  <div className="absolute inset-0 bg-gradient-to-t from-[#060814] via-transparent to-transparent" />
                  <button
                    onClick={() => null}
                    className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-white/95 text-[#0B1120] flex items-center justify-center hover:scale-110 transition shadow-lg"
                    data-testid={`student-course-play-${c.id}`}
                    aria-label={locked ? "Locked" : "Play"}
                  >
                    {locked ? <Lock size={16} /> : <Play size={16} fill="#0B1120" />}
                  </button>
                </div>
                <div className="p-4">
                  <p className="text-[10px] uppercase tracking-widest text-cyan-300">{c.category}</p>
                  <h4 className="font-heading text-base font-medium mt-1">{c.title}</h4>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-[#00E5FF] to-[#0055FF]" style={{ width: `${c.progress}%` }} />
                    </div>
                    <span className="text-xs text-[#A0ABC0] font-mono">{c.progress}%</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </GlassCard>

      <GlassCard title="AI recommendations for you" className="mt-6" testid="student-ai-recos">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {courses.slice(2, 5).map((c) => (
            <div key={c.id} className="rounded-xl border border-white/5 bg-gradient-to-br from-cyan-400/5 to-blue-700/5 p-4">
              <div className="flex items-center gap-2 text-xs text-cyan-300"><Sparkles size={14} /> Picked for you</div>
              <h4 className="font-heading text-base font-medium mt-2">{c.title}</h4>
              <p className="text-xs text-[#A0ABC0] mt-1">{c.lessons} lessons · {c.category}</p>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
