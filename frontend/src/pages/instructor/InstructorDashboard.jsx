import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Layers, Users, GraduationCap, BookText, BookOpen, FileQuestion, ListChecks, Activity } from "lucide-react";
import api from "../../lib/api";
import { GlassCard, PageHeader } from "../../components/dashboard/Common";
import { Badge } from "../../components/ui/badge";
import { useAuth } from "../../contexts/AuthContext";
import { fmtDate } from "../../lib/resources";

const KPIS = [
  { key: "classes",       label: "Total Classes",      icon: Layers },
  { key: "students",      label: "Total Students",     icon: Users },
  { key: "instructors",   label: "Total Instructors",  icon: GraduationCap },
  { key: "subjects",      label: "Total Subjects",     icon: BookText },
  { key: "courses",       label: "Total Courses",      icon: BookOpen },
  { key: "quizzes",       label: "Total Quizzes",      icon: FileQuestion },
  { key: "quiz_attempts", label: "Total Quiz Attempts",icon: ListChecks },
];

export default function InstructorDashboard() {
  const { user } = useAuth();
  const [totals, setTotals] = useState({});
  const [activities, setActivities] = useState([]);
  const [latest, setLatest] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/instructor/dashboard");
        setTotals(data.totals || {}); setActivities(data.recent_activities || []); setLatest(data.latest_results || []);
      } catch (_) {}
    })();
  }, []);

  return (
    <div data-testid="instructor-dashboard">
      <PageHeader
        eyebrow="Instructor Studio"
        title={`Hi ${user?.name?.split(" ")[0] || "Instructor"}, here's today's snapshot.`}
        subtitle="Your classroom at a glance — students, quizzes and the latest results."
      />

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {KPIS.map((k, i) => {
          const Icon = k.icon;
          return (
            <motion.div key={k.key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className="glass p-4 hover:border-white/20 hover:-translate-y-0.5 transition" data-testid={`instructor-kpi-${k.key}`}>
              <div className="flex items-center justify-between">
                <p className="text-[11px] uppercase tracking-widest text-[#A0ABC0] font-semibold">{k.label}</p>
                <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-cyan-300 flex items-center justify-center"><Icon size={14} /></div>
              </div>
              <p className="font-heading text-3xl font-semibold mt-2 tracking-tight">{totals[k.key] ?? 0}</p>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mt-6">
        <GlassCard title="Recent student activity" action={<Activity size={16} className="text-cyan-300" />} testid="instructor-activity">
          <ul className="divide-y divide-white/5">
            {activities.length === 0 && <li className="py-6 text-center text-sm text-[#64748B]">No recent activity yet.</li>}
            {activities.map((a, i) => (
              <li key={i} className="py-3 flex items-start gap-3">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm"><span className="text-white">{a.by_name || "Someone"}</span><span className="text-[#A0ABC0]"> {a.action}d </span><span className="text-cyan-200">{a.kind}</span><span className="text-[#A0ABC0]">: </span><span className="text-white">{a.label}</span></p>
                  <p className="text-[11px] text-[#64748B] mt-0.5">{fmtDate(a.created_at)}</p>
                </div>
              </li>
            ))}
          </ul>
        </GlassCard>

        <GlassCard title="Latest quiz results" testid="instructor-latest-results">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-widest text-[#64748B]">
                  <th className="px-2 py-2 font-medium">Student</th>
                  <th className="px-2 py-2 font-medium">Quiz</th>
                  <th className="px-2 py-2 font-medium">Score</th>
                  <th className="px-2 py-2 font-medium">Result</th>
                </tr>
              </thead>
              <tbody>
                {latest.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-[#64748B]">No quiz attempts yet.</td></tr>}
                {latest.map((r) => (
                  <tr key={r.id} className="border-t border-white/5">
                    <td className="px-2 py-2.5 text-white">{r.student_name}</td>
                    <td className="px-2 py-2.5 text-[#A0ABC0]">{r.quiz_name}</td>
                    <td className="px-2 py-2.5 font-mono text-cyan-200">{r.marks_obtained}/{r.total_marks}</td>
                    <td className="px-2 py-2.5">
                      <Badge variant="outline" className={r.result_status === "Pass" ? "border-emerald-400/40 text-emerald-300 bg-emerald-500/10" : "border-red-400/40 text-red-300 bg-red-500/10"}>{r.result_status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
