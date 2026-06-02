import React, { useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutDashboard, BookOpen, Crown, ShoppingBag, Receipt, Sparkles, LogOut, Menu, X, User } from "lucide-react";
import Brand from "../Brand";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "sonner";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator,
} from "../ui/dropdown-menu";
import ChatWidget from "../student/ChatWidget";
import "../../styles/student.css";

const NAV = [
  { to: "/student/dashboard",     label: "Dashboard",        icon: LayoutDashboard },
  { to: "/student/classroom",     label: "Classroom",        icon: BookOpen },
  { to: "/student/subscription",  label: "Subscription",     icon: Crown },
  { to: "/student/shop",          label: "Shop",             icon: ShoppingBag },
  { to: "/student/order",         label: "Order",            icon: Receipt },
  { to: "/student/fun-hub",       label: "Fun Learning Hub", icon: Sparkles },
];

export default function StudentSiteLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const initials = (user?.name || "S").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="student-site" data-testid="student-site">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 bg-white border-b border-[#e3eeee]">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 h-16 flex items-center gap-6">
          <button className="md:hidden p-2 -ml-1" onClick={() => setOpen(true)} aria-label="Open menu" data-testid="student-burger">
            <Menu size={20} />
          </button>
          <Brand theme="light" />
          <nav className="hidden md:flex items-center gap-1 ml-4">
            {NAV.map((n) => {
              const Icon = n.icon;
              return (
                <NavLink key={n.to} to={n.to} data-testid={`student-nav-${n.label.toLowerCase().replace(/[^a-z]/g, "-")}`}
                  className={({ isActive }) => [
                    "px-3.5 py-2 rounded-full text-sm font-medium inline-flex items-center gap-2 transition",
                    isActive ? "bg-[var(--cms-teal)] text-white shadow-[0_6px_18px_rgba(18,107,110,0.25)]" : "text-[var(--cms-teal-deep)] hover:bg-[var(--cms-teal-soft)]",
                  ].join(" ")}>
                  <Icon size={14} /> {n.label}
                </NavLink>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 pl-1.5 pr-1.5 py-1 rounded-full hover:bg-[var(--cms-teal-soft)] transition" data-testid="student-profile-trigger">
                  <div className="w-10 h-10 rounded-full bg-[var(--cms-teal)] text-white flex items-center justify-center font-semibold text-sm shadow-md ring-2 ring-[var(--cms-yellow)]" data-testid="student-avatar">
                    {initials}
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="!bg-white !border !border-[#e3eeee] !text-[#0d3b3f] min-w-[220px] shadow-lg">
                <DropdownMenuLabel className="text-xs text-[var(--cms-muted)] truncate max-w-[200px] font-normal">{user?.email || "Student"}</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-[#e3eeee]" />
                <DropdownMenuItem onClick={() => navigate("/student/profile")} data-testid="student-menu-profile" className="cursor-pointer text-[#0d3b3f] focus:bg-[var(--cms-teal-soft)] focus:text-[#0d3b3f]">
                  <User size={14} className="mr-2" /> My Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-[#e3eeee]" />
                <DropdownMenuItem
                  onClick={async () => { await logout(); toast.success("See you soon!"); navigate("/login", { replace: true }); }}
                  data-testid="student-menu-logout"
                  className="text-[var(--cms-red)] focus:text-[var(--cms-red)] focus:bg-red-50 cursor-pointer"
                >
                  <LogOut size={14} className="mr-2" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div className="fixed inset-0 bg-black/40 z-50 md:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
            <motion.aside initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }} transition={{ type: "spring", damping: 30 }} className="fixed inset-y-0 left-0 z-50 w-72 bg-white md:hidden p-5 space-y-3">
              <div className="flex items-center justify-between mb-4">
                <Brand theme="light" />
                <button onClick={() => setOpen(false)} className="p-2" aria-label="Close menu"><X size={18} /></button>
              </div>
              {NAV.map((n) => {
                const Icon = n.icon;
                return (
                  <NavLink key={n.to} to={n.to} onClick={() => setOpen(false)}
                    className={({ isActive }) => `block px-3 py-2.5 rounded-xl text-sm font-medium ${isActive ? "bg-[var(--cms-teal)] text-white" : "text-[var(--cms-teal-deep)] hover:bg-[var(--cms-teal-soft)]"}`}>
                    <Icon size={14} className="inline mr-2" />{n.label}
                  </NavLink>
                );
              })}
              <button onClick={async () => { await logout(); navigate("/login"); }} className="block w-full text-left mt-4 px-3 py-2.5 rounded-xl text-sm text-[var(--cms-red)] hover:bg-red-50">
                <LogOut size={14} className="inline mr-2" />Sign out
              </button>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <main className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
        <AnimatePresence mode="wait">
          <motion.div key={location.pathname} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.3 }}>
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Floating AI study buddy */}
      <ChatWidget context={location.pathname.startsWith("/student/classroom") ? "the student is inside a classroom lesson" : ""} />
    </div>
  );
}
