import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Sparkles, BookOpen, Flame, Trophy, Crown, ArrowRight,
  Bell, FileText, Megaphone, GraduationCap, School,
} from "lucide-react";
import api from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";

const VIVID = [
  { bg: "linear-gradient(135deg, #fbd86b 0%, #f59849 100%)", text: "#5e3b00" },
  { bg: "linear-gradient(135deg, #1c8e8a 0%, #0d3b3f 100%)", text: "#fff" },
  { bg: "linear-gradient(135deg, #8b6dd9 0%, #5b3a9c 100%)", text: "#fff" },
  { bg: "linear-gradient(135deg, #4d80f4 0%, #2a4ea8 100%)", text: "#fff" },
  { bg: "linear-gradient(135deg, #d23028 0%, #a31f1a 100%)", text: "#fff" },
];

// Pretty relative time — "Just now", "5m ago", "2h ago", "Yesterday", "Apr 12"
function timeAgo(iso) {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (!then) return "";
  const diff = Math.max(0, Date.now() - then);
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "Yesterday";
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// Audience → icon + tint
const AUDIENCE = {
  all:    { Icon: Megaphone,     tint: "from-[#fbd86b] to-[#f59849]", text: "text-amber-700",  badge: "Announcement" },
  school: { Icon: School,        tint: "from-[#1c8e8a] to-[#0d3b3f]", text: "text-teal-700",   badge: "School" },
  class:  { Icon: GraduationCap, tint: "from-[#4d80f4] to-[#2a4ea8]", text: "text-blue-700",   badge: "Class" },
  info:   { Icon: Bell,          tint: "from-[#d23028] to-[#a31f1a]", text: "text-red-700",    badge: "Info" },
};

export default function StudentHome() {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/student/site/init");
        setCourses(data.courses || []);
        setChapters(data.chapters || []);
        setNotifications(data.notifications || []);
      } catch (_) {
        try {
          const [c, ch, nt] = await Promise.all([
            api.get("/student/site/courses"),
            api.get("/student/site/chapters?limit=6"),
            api.get("/student/site/notifications"),
          ]);
          setCourses(c.data.courses || []);
          setChapters(ch.data.chapters || []);
          setNotifications(nt.data.notifications || []);
        } catch (__) {}
      }
    })();
  }, []);

  const firstName = (user?.name || "Friend").split(" ")[0];

  return (
    <div className="space-y-8" data-testid="student-home">
      {/* ─── Hero banner ─── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="relative rounded-3xl overflow-hidden shadow-md ring-1 ring-[#e3eeee] bg-white"
        data-testid="student-hero-banner"
      >
        <img
          src="/student-banner.png"
          alt="Unleash a New Learning Paradigm — welcome aboard, learner!"
          className="w-full h-auto block select-none"
          draggable={false}
        />
        {/* Subtle greeting overlay (top-right corner) */}
        <div className="absolute top-3 right-4 hidden md:block">
          <span className="inline-flex items-center gap-2 bg-white/90 backdrop-blur px-3 py-1.5 rounded-full text-xs font-semibold text-[var(--cms-teal-deep)] shadow-sm">
            <Sparkles size={12} className="text-[var(--cms-yellow)]" /> Hi {firstName}!
          </span>
        </div>
      </motion.div>

      {/* ─── Notifications ─── */}
      <section data-testid="student-notifications-section">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--cms-muted)] font-semibold">Stay in the loop</p>
            <h2 className="font-heading text-2xl md:text-3xl font-bold text-[var(--cms-teal-deep)] tracking-tight mt-1">
              NOTIFICATIONS
            </h2>
          </div>
          <span className="cms-pill cms-chip-red" data-testid="student-notifications-count">
            {notifications.length} new
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="student-notifications-list">
          {notifications.length === 0 && (
            <div className="col-span-full bg-white rounded-2xl border border-[#e3eeee] p-8 text-center">
              <div className="w-12 h-12 mx-auto rounded-full bg-[var(--cms-teal-soft)] grid place-items-center mb-2">
                <Bell size={20} className="text-[var(--cms-teal)]" />
              </div>
              <p className="text-sm text-[var(--cms-muted)]">You're all caught up — no new notifications.</p>
            </div>
          )}

          {notifications.map((n, i) => {
            const cfg = AUDIENCE[(n.audience || "info")] || AUDIENCE.info;
            const Icon = cfg.Icon;
            const img = typeof n.image === "string" ? n.image : n.image?.url;
            return (
              <motion.article
                key={n.id}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="bg-white rounded-2xl border border-[#e3eeee] shadow-sm hover:shadow-md hover:-translate-y-0.5 transition p-4 flex gap-3"
                data-testid={`notif-${n.id}`}
              >
                <div className={`w-11 h-11 shrink-0 rounded-xl bg-gradient-to-br ${cfg.tint} grid place-items-center text-white shadow-sm`}>
                  <Icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-heading text-base font-semibold text-[var(--cms-teal-deep)] leading-tight line-clamp-2">{n.title}</h3>
                    <span className={`text-[10px] uppercase tracking-wider font-bold ${cfg.text} bg-zinc-50 px-2 py-0.5 rounded-full shrink-0`}>{cfg.badge}</span>
                  </div>
                  {n.body && <p className="text-xs text-[var(--cms-muted)] mt-1.5 line-clamp-2 leading-relaxed">{n.body}</p>}
                  <div className="flex items-center justify-between mt-2.5 gap-2">
                    <span className="text-[11px] text-[var(--cms-muted)] font-medium" data-testid={`notif-time-${n.id}`}>
                      {timeAgo(n.created_at)}
                    </span>
                    {img && (
                      <img src={img} alt="" loading="lazy" className="w-8 h-8 rounded-md object-cover border border-[#e3eeee]" />
                    )}
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      </section>

      {/* ─── Quick stats ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Courses enrolled", value: courses.length, icon: BookOpen, accent: "linear-gradient(135deg, #1c8e8a, #126b6e)" },
          { label: "Day streak",       value: "14",            icon: Flame,    accent: "linear-gradient(135deg, #f59849, #d23028)" },
          { label: "Points earned",    value: "1,250",         icon: Trophy,   accent: "linear-gradient(135deg, #fbd86b, #f59849)" },
          { label: "Subscription",     value: "Pro · Active",  icon: Crown,    accent: "linear-gradient(135deg, #8b6dd9, #5b3a9c)" },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="cms-card p-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white" style={{ background: s.accent }}>
                  <Icon size={18} />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-widest text-[var(--cms-muted)]">{s.label}</p>
                  <p className="font-heading text-2xl font-semibold">{s.value}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ─── My Courses ─── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-heading text-2xl font-semibold">My Courses</h2>
          <Link to="/student/classroom" className="text-sm text-[var(--cms-teal)] font-semibold inline-flex items-center gap-1">
            View all <ArrowRight size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {courses.slice(0, 4).map((c, i) => {
            const v = VIVID[i % VIVID.length];
            return (
              <Link key={c.id} to={`/student/classroom/${c.id}`} data-testid={`home-course-${c.id}`}
                className="cms-card overflow-hidden hover:-translate-y-1 transition shadow-sm hover:shadow-lg">
                <div className="aspect-[5/3] bg-cover bg-center" style={{ backgroundImage: c.image ? `url(${typeof c.image === "string" ? c.image : c.image.url})` : v.bg }} />
                <div className="p-4">
                  <p className="text-xs uppercase tracking-widest text-[var(--cms-muted)]">{Array.isArray(c.class_names) ? c.class_names[0] : c.class_name || "Course"}</p>
                  <h4 className="font-heading text-lg font-semibold mt-1 text-[var(--cms-teal-deep)]">{c.name}</h4>
                  <button className="cms-btn-primary mt-4 w-full text-sm">Continue</button>
                </div>
              </Link>
            );
          })}
          {!courses.length && <p className="text-sm text-[var(--cms-muted)] col-span-full">No courses assigned yet. Ask your school admin to enroll you.</p>}
        </div>
      </section>

      {/* ─── Recent resources ─── */}
      <section className="cms-card p-5">
        <h3 className="font-heading text-xl font-semibold mb-3">Recent resources</h3>
        {chapters.length === 0 && <p className="text-sm text-[var(--cms-muted)]">No resources uploaded yet — check back soon.</p>}
        <ul className="divide-y divide-[#e3eeee]">
          {chapters.map((ch) => (
            <li key={ch.id} className="py-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[var(--cms-teal-soft)] text-[var(--cms-teal)] flex items-center justify-center"><FileText size={16} /></div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate text-[var(--cms-teal-deep)]">{ch.name}</p>
                <p className="text-xs text-[var(--cms-muted)] truncate">{ch.subject_name} · {ch.course_name} · {ch.class_name}</p>
              </div>
              <span className="cms-pill cms-chip-yellow">New</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
