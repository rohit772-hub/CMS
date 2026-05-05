import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Building2, UserCog, Users, Layers, BookOpen, BookText, FileStack, Boxes, Package, ShoppingCart, CreditCard,
  Plus, ArrowRight, Activity, GraduationCap,
} from "lucide-react";
import api from "../../lib/api";
import { GlassCard, PageHeader } from "../../components/dashboard/Common";
import { Button } from "../../components/ui/button";
import { fmtDate } from "../../lib/resources";
import { useAuth } from "../../contexts/AuthContext";

const KPIS = [
  { key: "schools",        label: "Total Schools",       icon: Building2 },
  { key: "school_admins",  label: "Total School Admins", icon: UserCog },
  { key: "students",       label: "Total Students",      icon: Users },
  { key: "classes",        label: "Total Classes",       icon: Layers },
  { key: "courses",        label: "Total Courses",       icon: BookOpen },
  { key: "subjects",       label: "Total Subjects",      icon: BookText },
  { key: "chapters",       label: "Total Chapters",      icon: FileStack },
  { key: "resources",      label: "Total Resources",     icon: Boxes },
  { key: "products",       label: "Total Products",      icon: Package },
  { key: "orders",         label: "Total Orders",        icon: ShoppingCart },
  { key: "payments",       label: "Total Payments",      icon: CreditCard },
];

const QUICK_ACTIONS = [
  { label: "Add School",       to: "/admin/schools",        icon: Building2 },
  { label: "Add School Admin", to: "/admin/school-admins",  icon: UserCog },
  { label: "Add Student",      to: "/admin/students",       icon: Users },
  { label: "Add Class",        to: "/admin/classes",        icon: Layers },
  { label: "Add Course",       to: "/admin/courses",        icon: BookOpen },
  { label: "Add Subject",      to: "/admin/subjects",       icon: BookText },
  { label: "Add Chapter",      to: "/admin/chapters",       icon: FileStack },
  { label: "Explore Courses",  to: "/admin/courses",        icon: GraduationCap },
];

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [totals, setTotals] = useState({});
  const [acts, setActs] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/admin/dashboard");
        setTotals(data.totals || {});
        setActs(data.recent_activities || []);
      } catch (_) {}
    })();
  }, []);

  return (
    <div data-testid="admin-dashboard">
      <PageHeader
        eyebrow="Admin Console"
        title={`Welcome back, ${user?.name?.split(" ")[0] || "Admin"}.`}
        subtitle="Your control center for the entire platform — every number, every action, one click away."
        action={
          <Button onClick={() => navigate("/admin/schools")} className="bg-gradient-to-r from-[#00E5FF] to-[#0055FF] text-white shadow-[0_8px_28px_rgba(0,229,255,0.35)]" data-testid="admin-add-school">
            <Plus size={16} className="mr-2" /> Onboard School
          </Button>
        }
      />

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {KPIS.map((k, i) => {
          const Icon = k.icon;
          return (
            <motion.div
              key={k.key}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className="glass p-4 hover:border-white/20 hover:-translate-y-0.5 transition"
              data-testid={`kpi-${k.key}`}
            >
              <div className="flex items-center justify-between">
                <p className="text-[11px] uppercase tracking-widest text-[#A0ABC0] font-semibold">{k.label}</p>
                <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-cyan-300 flex items-center justify-center"><Icon size={14} /></div>
              </div>
              <p className="font-heading text-3xl font-semibold mt-2 tracking-tight">{totals[k.key] ?? 0}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Recent Activities + Quick Actions */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mt-6">
        <GlassCard title="Recent activities" className="xl:col-span-2" action={<Activity size={16} className="text-cyan-300" />} testid="admin-recent-activities">
          <ul className="divide-y divide-white/5">
            {acts.length === 0 && <li className="py-6 text-center text-sm text-[#64748B]">Recent changes will show up here — try adding a school or class!</li>}
            {acts.map((a, i) => (
              <li key={i} className="py-3 flex items-start gap-3" data-testid={`activity-${i}`}>
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm">
                    <span className="text-white">{a.by_name || "Someone"}</span>
                    <span className="text-[#A0ABC0]"> {a.action.startsWith("status:") ? a.action.replace("status:", "marked ") : a.action}d </span>
                    <span className="text-cyan-200">{a.kind}</span>
                    <span className="text-[#A0ABC0]">: </span>
                    <span className="text-white">{a.label}</span>
                  </p>
                  <p className="text-[11px] text-[#64748B] mt-0.5">{fmtDate(a.created_at)}</p>
                </div>
              </li>
            ))}
          </ul>
        </GlassCard>

        <GlassCard title="Quick actions" testid="admin-quick-actions">
          <div className="grid grid-cols-2 gap-2.5">
            {QUICK_ACTIONS.map((q) => {
              const Icon = q.icon;
              return (
                <button
                  key={q.label}
                  onClick={() => navigate(q.to)}
                  className="group flex items-center gap-2 px-3 py-3 rounded-xl bg-white/3 border border-white/10 hover:border-cyan-400/40 hover:bg-cyan-400/5 transition text-left"
                  data-testid={`quick-action-${q.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400/15 to-blue-500/10 border border-cyan-400/20 text-cyan-300 flex items-center justify-center">
                    <Icon size={14} />
                  </div>
                  <span className="flex-1 text-sm text-white">{q.label}</span>
                  <ArrowRight size={12} className="text-[#64748B] group-hover:text-cyan-300 transition" />
                </button>
              );
            })}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
