import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2, Mail, Lock, User } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { toast } from "sonner";
import AuthLayout from "../../components/auth/AuthLayout";
import GoogleButton from "../../components/auth/GoogleButton";
import { useAuth } from "../../contexts/AuthContext";
import { formatApiError } from "../../lib/api";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "student" });
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }));

  const onSubmit = async (e) => {
    e.preventDefault(); setErr("");
    if (!form.name || !form.email || !form.password) { setErr("All fields are required."); return; }
    if (form.password.length < 6) { setErr("Password must be at least 6 characters."); return; }
    setBusy(true);
    try {
      const u = await register(form);
      toast.success(`Welcome to CMS Edu AI, ${u.name.split(" ")[0]}!`);
      navigate(`/${u.role}/dashboard`, { replace: true });
    } catch (e) {
      const msg = formatApiError(e.response?.data?.detail) || "Registration failed.";
      setErr(msg); toast.error(msg);
    } finally { setBusy(false); }
  };

  return (
    <AuthLayout role={form.role} title="Create your account" subtitle="One account. Three premium experiences.">
      <form onSubmit={onSubmit} className="space-y-5" data-testid="register-form">
        <div className="space-y-2">
          <Label className="text-sm font-medium text-[#A0ABC0]">Full name</Label>
          <div className="relative">
            <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
            <Input value={form.name} onChange={set("name")} placeholder="Jane Doe"
              className="pl-9 h-12 bg-white/5 border-white/10 text-white placeholder:text-[#64748B] focus-visible:ring-cyan-400/60"
              data-testid="register-name-input" />
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium text-[#A0ABC0]">Email</Label>
          <div className="relative">
            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
            <Input type="email" value={form.email} onChange={set("email")} placeholder="you@cmsedu.ai"
              className="pl-9 h-12 bg-white/5 border-white/10 text-white placeholder:text-[#64748B] focus-visible:ring-cyan-400/60"
              data-testid="register-email-input" />
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium text-[#A0ABC0]">Password</Label>
          <div className="relative">
            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
            <Input type={show ? "text" : "password"} value={form.password} onChange={set("password")} placeholder="At least 6 characters"
              className="pl-9 pr-10 h-12 bg-white/5 border-white/10 text-white placeholder:text-[#64748B] focus-visible:ring-cyan-400/60"
              data-testid="register-password-input" />
            <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A0ABC0] hover:text-white" data-testid="register-toggle-password" aria-label="Toggle password">
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium text-[#A0ABC0]">I am a…</Label>
          <Select value={form.role} onValueChange={set("role")}>
            <SelectTrigger className="h-12 bg-white/5 border-white/10 text-white" data-testid="register-role-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#0B1120] border-white/10 text-white">
              <SelectItem value="student" data-testid="register-role-student">Student</SelectItem>
              <SelectItem value="instructor" data-testid="register-role-instructor">Instructor</SelectItem>
              <SelectItem value="admin" data-testid="register-role-admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {err && <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2" data-testid="register-error">{err}</div>}

        <Button type="submit" disabled={busy} className="w-full h-12 text-base font-semibold bg-gradient-to-r from-[#00E5FF] to-[#0055FF] text-white shadow-[0_8px_28px_rgba(0,229,255,0.35)] hover:-translate-y-0.5 transition" data-testid="register-submit-button">
          {busy ? <><Loader2 size={18} className="animate-spin mr-2" /> Creating account…</> : "Create account"}
        </Button>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10" /></div>
          <div className="relative flex justify-center text-xs uppercase tracking-widest text-[#64748B]"><span className="bg-[#060814] px-3">or</span></div>
        </div>
        <GoogleButton label="Sign up with Google" />

        <p className="text-center text-sm text-[#A0ABC0] pt-3">
          Already have an account?{" "}
          <Link to="/login" className="text-cyan-300 hover:text-cyan-200" data-testid="register-go-login">Sign in</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
