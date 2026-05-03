import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip as ReTooltip, XAxis, YAxis } from "recharts";
import { Users, BookOpen, Star, Clock } from "lucide-react";
import api from "../../lib/api";
import { KpiCard, GlassCard, PageHeader } from "../../components/dashboard/Common";
import { useAuth } from "../../contexts/AuthContext";
import { Button } from "../../components/ui/button";

const ICONS = [Users, BookOpen, Star, Clock];

const tooltipStyle = {
  contentStyle: { background: "rgba(11,17,32,0.85)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#fff", backdropFilter: "blur(8px)" },
  itemStyle: { color: "#fff" }, labelStyle: { color: "#A0ABC0", fontSize: 12 },
};

export default function InstructorDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [courses, setCourses] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const [s, c] = await Promise.all([api.get("/instructor/stats"), api.get("/instructor/courses")]);
        setData(s.data); setCourses(c.data.courses || []);
      } catch (_) {}
    })();
  }, []);

  return (
    <div data-testid="instructor-dashboard">
      <PageHeader
        eyebrow="Instructor Studio"
        title={`Welcome, ${user?.name?.split(" ")[0] || "Instructor"}.`}
        subtitle="Today's a great day to teach. Here's what's happening across your classroom."
        action={<Button className="bg-gradient-to-r from-[#00E5FF] to-[#0055FF] text-white shadow-[0_8px_28px_rgba(0,229,255,0.35)]" data-testid="instructor-new-lesson">+ New lesson</Button>}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {(data?.kpis || []).map((k, i) => <KpiCard key={k.label} index={i} {...k} icon={ICONS[i % ICONS.length]} />)}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mt-6">
        <GlassCard title="Course performance" className="xl:col-span-2" testid="instructor-performance">
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={data?.performance_series || []}>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="#64748B" fontSize={12} />
                <YAxis stroke="#64748B" fontSize={12} />
                <ReTooltip {...tooltipStyle} />
                <Bar dataKey="value" fill="url(#gBarI)" radius={[8, 8, 0, 0]} />
                <defs>
                  <linearGradient id="gBarI" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FFC800" />
                    <stop offset="100%" stopColor="#FF7A00" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard title="Today's pulse" testid="instructor-pulse">
          <ul className="space-y-3 text-sm text-[#A0ABC0]">
            {[
              "12 new submissions in 'AI 101'.",
              "Live class 'Calculus' starts in 1h 20m.",
              "3 students completed certificates.",
              "Reminder: review 7 quizzes by EOD.",
            ].map((t, i) => (
              <motion.li key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.06 * i }} className="flex gap-3 items-start">
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                <span>{t}</span>
              </motion.li>
            ))}
          </ul>
        </GlassCard>
      </div>

      <GlassCard title="Your courses" className="mt-6" testid="instructor-courses-card">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {courses.map((c) => (
            <motion.div key={c.id} whileHover={{ y: -4 }} className="rounded-xl overflow-hidden border border-white/5 bg-white/3" data-testid={`instructor-course-${c.id}`}>
              <div className="aspect-video bg-cover bg-center" style={{ backgroundImage: `url(${c.thumbnail})` }} />
              <div className="p-4">
                <p className="text-[10px] uppercase tracking-widest text-cyan-300">{c.category}</p>
                <h4 className="font-heading text-lg font-medium mt-1">{c.title}</h4>
                <p className="text-xs text-[#64748B] mt-1">{c.lessons} lessons · {c.instructor}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
