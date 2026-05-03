import React, { useEffect, useState } from "react";
import api from "../../lib/api";
import { GlassCard, PageHeader } from "../../components/dashboard/Common";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Avatar, AvatarFallback } from "../../components/ui/avatar";
import { Badge } from "../../components/ui/badge";
import { Search, Plus } from "lucide-react";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("all");

  useEffect(() => {
    (async () => {
      try { const { data } = await api.get("/admin/users"); setUsers(data.users || []); } catch (_) {}
    })();
  }, []);

  const params = new URLSearchParams(window.location.search);
  useEffect(() => { const t = params.get("tab"); if (t) setTab(t); /* eslint-disable-next-line */ }, []);

  const filtered = users.filter((u) => {
    const matchQ = !q || u.name.toLowerCase().includes(q.toLowerCase()) || u.email.toLowerCase().includes(q.toLowerCase());
    const matchTab = tab === "all" || (tab === "instructors" && u.role === "instructor") || (tab === "students" && u.role === "student") || (tab === "parents" && u.role === "parent");
    return matchQ && matchTab;
  });

  return (
    <div data-testid="admin-users-page">
      <PageHeader
        eyebrow="Users"
        title="Manage every member"
        subtitle="Instructors, students and parents — all from one place."
        action={<Button className="bg-gradient-to-r from-[#00E5FF] to-[#0055FF] text-white" data-testid="admin-users-add"><Plus size={16} className="mr-2"/>Invite</Button>}
      />
      <GlassCard>
        <div className="flex flex-wrap gap-3 items-center mb-4">
          <div className="relative flex-1 min-w-[240px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
            <Input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Search users…" className="pl-9 bg-white/5 border-white/10 text-white" data-testid="admin-users-search" />
          </div>
          <div className="flex gap-2 flex-wrap">
            {["all","instructors","students","parents"].map((t) => (
              <button key={t} onClick={()=>setTab(t)} className={`px-3 py-1.5 rounded-full text-xs uppercase tracking-widest border ${tab===t?"border-cyan-400/40 bg-cyan-400/10 text-cyan-200":"border-white/10 text-[#A0ABC0] hover:bg-white/5"}`} data-testid={`admin-users-tab-${t}`}>{t}</button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-widest text-[#64748B]">
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Email</th>
                <th className="px-3 py-2 font-medium">Role</th>
                <th className="px-3 py-2 font-medium">Provider</th>
                <th className="px-3 py-2 font-medium">Verified</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const initials = u.name.split(" ").map((s)=>s[0]).slice(0,2).join("").toUpperCase();
                return (
                  <tr key={u.user_id} className="border-t border-white/5 hover:bg-white/3" data-testid={`admin-user-row-${u.user_id}`}>
                    <td className="px-3 py-3 text-white">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8"><AvatarFallback className="bg-gradient-to-br from-[#00E5FF] to-[#0055FF] text-white text-xs">{initials}</AvatarFallback></Avatar>
                        {u.name}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-[#A0ABC0]">{u.email}</td>
                    <td className="px-3 py-3"><Badge variant="outline" className="border-cyan-400/40 text-cyan-200 bg-cyan-400/10">{u.role}</Badge></td>
                    <td className="px-3 py-3 text-[#A0ABC0]">{u.auth_provider}</td>
                    <td className="px-3 py-3">{u.email_verified ? <span className="text-emerald-300 text-xs">verified</span> : <span className="text-[#64748B] text-xs">pending</span>}</td>
                  </tr>
                );
              })}
              {!filtered.length && <tr><td colSpan={5} className="px-3 py-8 text-center text-[#64748B]">No users match your filters.</td></tr>}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
