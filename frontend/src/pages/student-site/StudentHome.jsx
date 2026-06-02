import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, BookOpen, Flame, Trophy, ShoppingBag, Crown, ArrowRight, Bell, FileText } from "lucide-react";
import api from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";

const VIVID = [
  { bg: "linear-gradient(135deg, #fbd86b 0%, #f59849 100%)", text: "#5e3b00" },
  { bg: "linear-gradient(135deg, #1c8e8a 0%, #0d3b3f 100%)", text: "#fff" },
  { bg: "linear-gradient(135deg, #8b6dd9 0%, #5b3a9c 100%)", text: "#fff" },
  { bg: "linear-gradient(135deg, #4d80f4 0%, #2a4ea8 100%)", text: "#fff" },
  { bg: "linear-gradient(135deg, #d23028 0%, #a31f1a 100%)", text: "#fff" },
];

export default function StudentHome() {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [notifications, setNotifications] = useState([]);
  useEffect(() => {
    (async () => {
      try {
        // Single round-trip — backend runs the 3 queries in parallel via asyncio.gather.
        const { data } = await api.get("/student/site/init");
        setCourses(data.courses || []);
        setChapters(data.chapters || []);
        setNotifications(data.notifications || []);
      } catch (_) {
        // Best-effort fallback to individual endpoints (older deployments)
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
    <div className="space-y-6" data-testid="student-home">
      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="cms-card-vivid relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0d3b3f 0%, #126b6e 60%, #1c8e8a 100%)" }}>
        <div className="absolute -right-10 -top-10 w-72 h-72 rounded-full bg-[var(--cms-red)]/20 blur-3xl" />
        <div className="absolute -right-20 bottom-0 w-56 h-56 rounded-full bg-[var(--cms-yellow)]/20 blur-3xl" />
        <div className="relative">
          <p className="text-xs uppercase tracking-[0.32em] text-[var(--cms-yellow)] font-semibold">Hi {firstName} 👋</p>
          <h1 className="font-heading text-4xl md:text-5xl font-bold mt-2 leading-tight">Ready for today's <span className="text-[var(--cms-yellow)]">learning adventure?</span></h1>
          <p className="text-white/85 mt-3 max-w-xl">Build robots, code games and explore AI — your studio is open!</p>
          <div className="flex flex-wrap gap-3 mt-5">
            <Link to="/student/classroom" className="cms-btn-primary" data-testid="hero-start-learning">▶ Start Learning</Link>
            <Link to="/student/fun-hub" className="cms-btn-ghost"><Sparkles size={14} className="inline mr-1" /> Fun Hub</Link>
          </div>
        </div>
      </motion.div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Courses enrolled", value: courses.length, icon: BookOpen, accent: "linear-gradient(135deg, #1c8e8a, #126b6e)" },
          { label: "Day streak", value: "14", icon: Flame, accent: "linear-gradient(135deg, #f59849, #d23028)" },
          { label: "Points earned", value: "1,250", icon: Trophy, accent: "linear-gradient(135deg, #fbd86b, #f59849)" },
          { label: "Subscription", value: "Pro · Active", icon: Crown, accent: "linear-gradient(135deg, #8b6dd9, #5b3a9c)" },
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

      {/* My Courses */}
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

      {/* Recently uploaded resources + Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <section className="lg:col-span-2 cms-card p-5">
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

        <section className="cms-card p-5">
          <h3 className="font-heading text-xl font-semibold mb-3 flex items-center gap-2"><Bell size={18} className="text-[var(--cms-red)]" /> Notifications</h3>
          <ul className="space-y-3 max-h-[420px] overflow-y-auto pr-1" data-testid="student-notifications-list">
            {notifications.length === 0 && (
              <li className="text-sm text-[var(--cms-muted)] py-4">You're all caught up! No new notifications.</li>
            )}
            {notifications.map((n) => {
              const img = typeof n.image === "string" ? n.image : n.image?.url;
              const chip = n.audience === "all" ? "All" : n.audience === "school" ? "School" : n.audience === "class" ? "Class" : "Info";
              return (
                <li key={n.id} className="flex items-start gap-3 p-3 rounded-xl bg-[var(--cms-teal-soft)]/40" data-testid={`notif-${n.id}`}>
                  {img ? (
                    <img src={img} alt="" loading="lazy" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                  ) : (
                    <span className="mt-1 w-1.5 h-1.5 rounded-full bg-[var(--cms-red)] shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--cms-teal-deep)] truncate">{n.title}</p>
                    {n.body && <p className="text-xs text-[var(--cms-muted)] line-clamp-2">{n.body}</p>}
                  </div>
                  <span className="cms-pill cms-chip-red shrink-0">{chip}</span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}
