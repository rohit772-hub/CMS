import React from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Search, LogOut, User, Settings, Menu, Sun, Moon } from "lucide-react";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator,
} from "../ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Input } from "../ui/input";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "sonner";

export default function Topbar({ user, onBurger }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const initials = (user?.name || "U").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  const onLogout = async () => {
    await logout();
    toast.success("Signed out — see you soon ✨");
    navigate("/login", { replace: true });
  };

  return (
    <header
      className="sticky top-0 z-30 h-16 flex items-center justify-between px-4 md:px-6 bg-[#0B1120]/70 backdrop-blur-xl border-b border-white/10"
      data-testid="topbar"
    >
      <div className="flex items-center gap-3 flex-1">
        <button
          onClick={onBurger}
          className="lg:hidden w-9 h-9 rounded-lg flex items-center justify-center hover:bg-white/5 text-[#A0ABC0]"
          data-testid="topbar-burger" aria-label="Open menu"
        >
          <Menu size={18} />
        </button>
        <div className="hidden md:flex items-center gap-2 max-w-md flex-1">
          <div className="relative w-full">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
            <Input
              placeholder="Search courses, students, lessons…"
              className="pl-9 h-10 bg-white/5 border-white/10 text-white placeholder:text-[#64748B] focus-visible:ring-cyan-400/50"
              data-testid="topbar-search"
            />
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => toast("Notifications panel — coming soon")}
          className="relative w-9 h-9 rounded-lg flex items-center justify-center hover:bg-white/5 text-[#A0ABC0]"
          data-testid="topbar-notifications" aria-label="Notifications"
        >
          <Bell size={18} />
          <span className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-cyan-400" />
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 pl-1.5 pr-3 py-1 rounded-full hover:bg-white/5 transition" data-testid="topbar-profile-trigger">
              <Avatar className="w-8 h-8">
                {user?.avatar_url ? <AvatarImage src={user.avatar_url} /> : null}
                <AvatarFallback className="bg-gradient-to-br from-[#00E5FF] to-[#0055FF] text-white text-xs">{initials}</AvatarFallback>
              </Avatar>
              <div className="hidden md:block text-left leading-tight">
                <p className="text-sm font-medium">{user?.name}</p>
                <p className="text-[11px] uppercase tracking-widest text-cyan-300">{user?.role}</p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-[#0B1120] border border-white/10 text-white min-w-[220px]">
            <DropdownMenuLabel className="text-[#A0ABC0] text-xs">{user?.email}</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/5" />
            <DropdownMenuItem onClick={() => navigate(`/${user.role}/dashboard`)} data-testid="topbar-menu-dashboard">
              <Sun size={14} className="mr-2" /> Dashboard
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate(`/${user.role}/profile`)} data-testid="topbar-menu-profile">
              <User size={14} className="mr-2" /> Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate(`/${user.role}/settings`)} data-testid="topbar-menu-settings">
              <Settings size={14} className="mr-2" /> Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/5" />
            <DropdownMenuItem onClick={onLogout} data-testid="topbar-menu-logout">
              <LogOut size={14} className="mr-2" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
