import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer,
  Tooltip as ReTooltip, XAxis, YAxis,
} from "recharts";
import { DollarSign, Users, GraduationCap, BookOpen, Sparkles } from "lucide-react";
import api from "../../lib/api";
import { KpiCard, GlassCard, PageHeader } from "../../components/dashboard/Common";
import { useAuth } from "../../contexts/AuthContext";
import { Button } from "../../components/ui/button";

const ICONS = [DollarSign, Users, GraduationCap, BookOpen];

const tooltipStyle = {
  contentStyle: { background: "rgba(11,17,32,0.85)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#fff", backdropFilter: "blur(8px)" },
  itemStyle: { color: "#fff" }, labelStyle: { color: "#A0ABC0", fontSize: 12 },
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const [s, u] = await Promise.all([api.get("/admin/stats"), api.get("/admin/users")]);
        setData(s.data); setUsers(u.data.users || []);
      } catch (e) {}
    })();
  }, []);

  return (
    <div data-testid="admin-dashboard">
      <PageHeader
        eyebrow="Admin Console"
        title={`Welcome back, ${user?.name?.split(" ")[0] || "Admin"}.`}
        subtitle="A bird's-eye view of revenue, growth, and platform health — refreshed in real time."
        action={
          <Button className="bg-gradient-to-r from-[#00E5FF] to-[#0055FF] text-white shadow-[0_8px_28px_rgba(0,229,255,0.35)]" data-testid="admin-create-course">
            <Sparkles size={16} className="mr-2" /> Launch a course
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {(data?.kpis || []).map((k, i) => (
          <KpiCard key={k.label} index={i} {...k} icon={ICONS[i % ICONS.length]} />
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mt-6">
        <GlassCard title="Revenue (last 7 days)" className="xl:col-span-2" testid="admin-revenue-chart">
          <div className="h-72">
            <ResponsiveContainer>
              <AreaChart data={data?.revenue_series || []}>
                <defs>
                  <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00E5FF" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="#0055FF" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="#64748B" fontSize={12} />
                <YAxis stroke="#64748B" fontSize={12} />
                <ReTooltip {...tooltipStyle} />
                <Area dataKey="value" stroke="#00E5FF" strokeWidth={2.5} fill="url(#gRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard title="Enrollments" testid="admin-enrollments-chart">
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={data?.enrollments_series || []}>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="#64748B" fontSize={12} />
                <YAxis stroke="#64748B" fontSize={12} />
                <ReTooltip {...tooltipStyle} />
                <Bar dataKey="value" fill="url(#gBar)" radius={[8, 8, 0, 0]} />
                <defs>
                  <linearGradient id="gBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00E5FF" />
                    <stop offset="100%" stopColor="#0055FF" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mt-6">
        <GlassCard title="Recent users" className="xl:col-span-2" testid="admin-recent-users">
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-widest text-[#64748B]">
                  <th className="px-2 py-2 font-medium">Name</th>
                  <th className="px-2 py-2 font-medium">Email</th>
                  <th className="px-2 py-2 font-medium">Role</th>
                  <th className="px-2 py-2 font-medium">Provider</th>
                </tr>
              </thead>
              <tbody>
                {users.slice(0, 8).map((u) => (
                  <tr key={u.user_id} className="border-t border-white/5 hover:bg-white/3">
                    <td className="px-2 py-3 text-white">{u.name}</td>
                    <td className="px-2 py-3 text-[#A0ABC0]">{u.email}</td>
                    <td className="px-2 py-3"><span className="text-xs uppercase tracking-widest text-cyan-300">{u.role}</span></td>
                    <td className="px-2 py-3 text-[#A0ABC0]">{u.auth_provider || "password"}</td>
                  </tr>
                ))}
                {!users.length && <tr><td colSpan={4} className="px-2 py-6 text-center text-[#64748B]">No users yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </GlassCard>

        <GlassCard title="AI insights" testid="admin-ai-insights">
          <ul className="space-y-3 text-sm text-[#A0ABC0]">
            {[
              "Revenue is up 12.4% — keep momentum with a featured AI course bundle.",
              "Enrollments peak on Thursdays — run launches midweek.",
              "3 instructors crossed 500 students — celebrate publicly.",
              "Drop-off in 'Calculus 101' lesson 4 — review pacing.",
            ].map((t, i) => (
              <motion.li key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * i }} className="flex gap-3 items-start">
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                <span>{t}</span>
              </motion.li>
            ))}
          </ul>
        </GlassCard>
      </div>
    </div>
  );
}
