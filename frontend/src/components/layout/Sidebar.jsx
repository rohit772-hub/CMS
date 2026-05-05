import React, { useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Sparkles, ChevronDown, ChevronLeft, ChevronRight,
  GraduationCap, BookOpen, Users, BarChart3, Bell, Settings, LifeBuoy,
  Megaphone, ShieldCheck, ShoppingBag, FileBarChart, MessagesSquare,
  Trophy, Heart, ScrollText, Wallet, Star, Calendar, X,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";

const ADMIN_NAV = [
  { type: "item", label: "Dashboard", to: "/admin/dashboard", icon: LayoutDashboard },
  { type: "group", label: "Manage Resources", icon: BookOpen, items: [
    { label: "Classes", to: "/admin/classes" },
    { label: "Quiz", to: "/admin/quiz" },
    { label: "Courses", to: "/admin/courses" },
  ]},
  { type: "group", label: "Store", icon: ShoppingBag, items: [
    { label: "Plans / Subscription", to: "/admin/plans" },
    { label: "Products", to: "/admin/products" },
    { label: "Payments", to: "/admin/payments" },
    { label: "Orders", to: "/admin/orders" },
  ]},
  { type: "group", label: "Users", icon: Users, items: [
    { label: "Instructors", to: "/admin/users?tab=instructors" },
    { label: "Students", to: "/admin/users?tab=students" },
    { label: "Parents", to: "/admin/users?tab=parents" },
  ]},
  { type: "group", label: "Analytics", icon: BarChart3, items: [
    { label: "Revenue", to: "/admin/analytics?tab=revenue" },
    { label: "Enrollments", to: "/admin/analytics?tab=enrollments" },
    { label: "Growth", to: "/admin/analytics?tab=growth" },
  ]},
  { type: "group", label: "Communication", icon: Megaphone, items: [
    { label: "Notifications", to: "/admin/notifications" },
    { label: "Emails", to: "/admin/emails" },
    { label: "Announcements", to: "/admin/announcements" },
  ]},
  { type: "group", label: "Settings", icon: Settings, items: [
    { label: "General", to: "/admin/settings" },
    { label: "Payment Gateway", to: "/admin/settings#payment" },
    { label: "Branding", to: "/admin/settings?tab=branding" },
    { label: "Google Login", to: "/admin/settings?tab=google" },
    { label: "SMTP", to: "/admin/settings?tab=smtp" },
    { label: "Security", to: "/admin/settings?tab=security" },
  ]},
  { type: "group", label: "Support", icon: LifeBuoy, items: [
    { label: "Help Center", to: "/admin/support?tab=help" },
    { label: "Feedback", to: "/admin/support?tab=feedback" },
    { label: "Tickets", to: "/admin/support?tab=tickets" },
  ]},
];

const INSTRUCTOR_NAV = [
  { type: "item", label: "Dashboard", to: "/instructor/dashboard", icon: LayoutDashboard },
  { type: "item", label: "My Courses", to: "/instructor/courses", icon: BookOpen },
  { type: "item", label: "Students", to: "/instructor/students", icon: Users },
  { type: "item", label: "Assignments", to: "/instructor/assignments", icon: ScrollText },
  { type: "item", label: "Live Classes", to: "/instructor/live", icon: Calendar },
  { type: "item", label: "Analytics", to: "/instructor/analytics", icon: BarChart3 },
  { type: "item", label: "Announcements", to: "/instructor/announcements", icon: Megaphone },
  { type: "item", label: "Settings", to: "/instructor/settings", icon: Settings },
];

const STUDENT_NAV = [
  { type: "item", label: "Dashboard", to: "/student/dashboard", icon: LayoutDashboard },
  { type: "item", label: "My Courses", to: "/student/courses", icon: BookOpen },
  { type: "item", label: "Explore", to: "/student/explore", icon: GraduationCap },
  { type: "item", label: "Assignments", to: "/student/assignments", icon: ScrollText },
  { type: "item", label: "Quizzes", to: "/student/quizzes", icon: FileBarChart },
  { type: "item", label: "Leaderboard", to: "/student/leaderboard", icon: Trophy },
  { type: "item", label: "Achievements", to: "/student/achievements", icon: Star },
  { type: "item", label: "Wishlist", to: "/student/wishlist", icon: Heart },
  { type: "item", label: "Messages", to: "/student/messages", icon: MessagesSquare },
  { type: "item", label: "Billing", to: "/student/billing", icon: Wallet },
  { type: "item", label: "Settings", to: "/student/settings", icon: Settings },
];

const NAV_BY_ROLE = { admin: ADMIN_NAV, instructor: INSTRUCTOR_NAV, student: STUDENT_NAV };

function NavItem({ to, icon: Icon, label, collapsed }) {
  const link = (
    <NavLink
      to={to}
      data-testid={`nav-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
      className={({ isActive }) =>
        [
          "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all",
          isActive
            ? "bg-gradient-to-r from-cyan-400/15 to-blue-500/10 text-white border border-cyan-400/20 shadow-[0_0_24px_rgba(0,229,255,0.15)]"
            : "text-[#A0ABC0] hover:bg-white/5 hover:text-white border border-transparent",
        ].join(" ")
      }
    >
      <Icon size={18} strokeWidth={1.6} className="shrink-0" />
      {!collapsed && <span className="truncate font-medium">{label}</span>}
    </NavLink>
  );
  if (!collapsed) return link;
  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right" className="bg-[#0B1120] border border-white/10 text-white">{label}</TooltipContent>
    </Tooltip>
  );
}

function NavGroup({ group, collapsed }) {
  const location = useLocation();
  const open0 = group.items.some((i) => location.pathname.startsWith(i.to.split("?")[0]));
  const [open, setOpen] = useState(open0);
  const Icon = group.icon;
  if (collapsed) {
    // In collapsed mode, render group as icon trigger w/ tooltip listing items
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <button
            data-testid={`nav-group-${group.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
            className="w-full flex items-center justify-center rounded-xl px-3 py-2.5 text-[#A0ABC0] hover:bg-white/5 hover:text-white transition"
          >
            <Icon size={18} strokeWidth={1.6} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="bg-[#0B1120] border border-white/10 text-white p-2 min-w-[180px]">
          <div className="text-xs uppercase tracking-widest text-cyan-300 mb-2 px-1">{group.label}</div>
          <ul className="space-y-1">
            {group.items.map((it) => (
              <li key={it.to}>
                <Link to={it.to} className="block rounded-md px-2 py-1.5 text-sm hover:bg-white/5">{it.label}</Link>
              </li>
            ))}
          </ul>
        </TooltipContent>
      </Tooltip>
    );
  }
  return (
    <div>
      <button
        data-testid={`nav-group-${group.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[#A0ABC0] hover:bg-white/5 hover:text-white transition"
      >
        <Icon size={18} strokeWidth={1.6} />
        <span className="flex-1 text-left font-medium">{group.label}</span>
        <ChevronDown size={16} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden ml-7 my-1 border-l border-white/5 space-y-0.5"
          >
            {group.items.map((it) => (
              <li key={it.to}>
                <NavLink
                  to={it.to}
                  data-testid={`nav-${it.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                  className={({ isActive }) =>
                    [
                      "block pl-4 pr-2 py-1.5 text-sm rounded-md transition",
                      isActive ? "text-cyan-300" : "text-[#A0ABC0] hover:text-white",
                    ].join(" ")
                  }
                >
                  {it.label}
                </NavLink>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Sidebar({ role, collapsed, onToggle, mobileOpen, onMobileClose }) {
  const nav = NAV_BY_ROLE[role] || STUDENT_NAV;
  const width = collapsed ? 80 : 264;

  const Inner = (
    <TooltipProvider delayDuration={0}>
      <div className="flex flex-col h-full">
        <div className={`flex items-center ${collapsed ? "justify-center" : "justify-between"} px-4 h-16 border-b border-white/5`}>
          <Link to={`/${role}/dashboard`} className="flex items-center gap-2" data-testid="sidebar-brand">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#00E5FF] to-[#0055FF] flex items-center justify-center glow-primary">
              <Sparkles size={18} strokeWidth={1.6} />
            </div>
            {!collapsed && (
              <div>
                <p className="font-heading text-base font-semibold leading-none">CMS Edu AI</p>
                <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-300 mt-1">{role}</p>
              </div>
            )}
          </Link>
          {!collapsed && (
            <button onClick={onToggle} className="hidden lg:flex w-8 h-8 rounded-lg items-center justify-center hover:bg-white/5 text-[#A0ABC0]" data-testid="sidebar-collapse-button" aria-label="Collapse sidebar">
              <ChevronLeft size={16} />
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {nav.map((n, i) =>
            n.type === "item"
              ? <NavItem key={i} to={n.to} icon={n.icon} label={n.label} collapsed={collapsed} />
              : <NavGroup key={i} group={n} collapsed={collapsed} />
          )}
        </div>
        <div className={`px-3 py-3 border-t border-white/5 ${collapsed ? "flex justify-center" : ""}`}>
          {collapsed ? (
            <button onClick={onToggle} className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-white/5 text-[#A0ABC0]" data-testid="sidebar-expand-button" aria-label="Expand sidebar">
              <ChevronRight size={16} />
            </button>
          ) : (
            <div className="glass-soft p-3 text-xs text-[#A0ABC0]">
              <div className="flex items-center gap-2 text-cyan-300 mb-1"><ShieldCheck size={14} /> AI co-pilot</div>
              Try asking: <span className="text-white">“Recommend a course”</span>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );

  return (
    <>
      {/* Desktop fixed */}
      <aside
        className="hidden lg:flex fixed inset-y-0 left-0 z-40 flex-col bg-[#0B1120]/80 backdrop-blur-2xl border-r border-white/10 transition-all duration-300"
        style={{ width }}
        data-testid="sidebar-desktop"
      >
        {Inner}
      </aside>
      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={onMobileClose}
              className="fixed inset-0 z-50 bg-black/60 lg:hidden"
            />
            <motion.aside
              initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }}
              transition={{ type: "spring", stiffness: 260, damping: 30 }}
              className="fixed inset-y-0 left-0 z-50 w-72 bg-[#0B1120]/95 backdrop-blur-2xl border-r border-white/10 lg:hidden"
              data-testid="sidebar-mobile"
            >
              <button onClick={onMobileClose} className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5 text-[#A0ABC0]" aria-label="Close sidebar" data-testid="sidebar-mobile-close">
                <X size={16} />
              </button>
              {Inner}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
