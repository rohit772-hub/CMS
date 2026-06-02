import React, { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Eye, EyeOff, Loader2, Mail, Lock, IdCard } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Checkbox } from "../../components/ui/checkbox";
import { toast } from "sonner";
import AuthLayout from "../../components/auth/AuthLayout";
import { useAuth } from "../../contexts/AuthContext";
import { formatApiError } from "../../lib/api";

const TITLES = {
  admin: { title: "Admin sign-in", subtitle: "Welcome back, captain. Your console awaits." },
  instructor: { title: "School Admin sign-in", subtitle: "Manage your school, students and courses." },
  student: { title: "Student sign-in", subtitle: "Just type your Student ID — that's all you need." },
};

const DEMOS = {
  admin: { email: "admin@cmsedu.ai", password: "Demo@123" },
  instructor: { email: "instructor@cmsedu.ai", password: "Demo@123" },
  student: { email: "STU-9999", password: "" },
};

export default function Login() {
  const { role: roleParam } = useParams();
  const role = ["admin", "instructor", "student"].includes(roleParam) ? roleParam : "student";
  const meta = TITLES[role];
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const fillDemo = () => { setEmail(DEMOS[role].email); setPassword(DEMOS[role].password); };

  const isStudent = role === "student";
  const idLabel = isStudent ? "Student ID" : "Email";

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    if (!email) { setErr(`${idLabel} is required.`); return; }
    if (!isStudent && !password) { setErr("Password is required."); return; }
    setBusy(true);
    try {
      const payload = isStudent
        ? { student_id: email.trim(), role: "student", remember }
        : { email: email.trim(), password, remember, role };
      const u = await login(payload);
      toast.success(`Welcome back, ${u.name.split(" ")[0]}!`);
      navigate(`/${u.role}/dashboard`, { replace: true });
    } catch (e) {
      const msg = formatApiError(e.response?.data?.detail) || "Login failed.";
      setErr(msg); toast.error(msg);
    } finally { setBusy(false); }
  };

  return (
    <AuthLayout role={role} title={meta.title} subtitle={meta.subtitle}>
      <form onSubmit={onSubmit} className="space-y-5" data-testid={`login-form-${role}`}>
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium text-[#A0ABC0]">{idLabel}</Label>
          <div className="relative">
            {isStudent ? (
              <IdCard size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
            ) : (
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
            )}
            <Input
              id="email" type={isStudent ? "text" : "email"} autoComplete={isStudent ? "username" : "email"} required
              value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder={isStudent ? "e.g. STU-1042" : "you@cmsedu.ai"}
              className="pl-9 h-12 bg-white/5 border-white/10 text-white placeholder:text-[#64748B] focus-visible:ring-cyan-400/60"
              data-testid="login-email-input"
            />
          </div>
          {isStudent && (
            <p className="text-[11px] text-[#64748B]">No password needed — just your Student ID. If yours isn't recognized, please contact your school admin.</p>
          )}
        </div>

        {!isStudent && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-sm font-medium text-[#A0ABC0]">Password</Label>
              <Link to="/forgot-password" className="text-xs text-cyan-300 hover:text-cyan-200" data-testid="forgot-password-link">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
              <Input
                id="password" type={show ? "text" : "password"} autoComplete="current-password" required
                value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="pl-9 pr-10 h-12 bg-white/5 border-white/10 text-white placeholder:text-[#64748B] focus-visible:ring-cyan-400/60"
                data-testid="login-password-input"
              />
              <button
                type="button" onClick={() => setShow((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A0ABC0] hover:text-white"
                data-testid="login-toggle-password"
                aria-label="Toggle password visibility"
              >
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          {!isStudent ? (
            <label className="flex items-center gap-2 text-sm text-[#A0ABC0] cursor-pointer">
              <Checkbox
                checked={remember} onCheckedChange={(v) => setRemember(!!v)}
                className="border-white/20 data-[state=checked]:bg-cyan-400 data-[state=checked]:text-black"
                data-testid="login-remember-checkbox"
              />
              Remember me
            </label>
          ) : <span />}
          <button type="button" onClick={fillDemo} className="text-xs text-[#64748B] hover:text-cyan-300" data-testid="login-fill-demo">
            Use demo {role}
          </button>
        </div>

        {err && (
          <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2" data-testid="login-error">
            {err}
          </div>
        )}

        <Button
          type="submit" disabled={busy}
          className="w-full h-12 text-base font-semibold bg-gradient-to-r from-[#00E5FF] to-[#0055FF] hover:from-[#0DEFFF] hover:to-[#0066FF] text-white shadow-[0_8px_28px_rgba(0,229,255,0.35)] hover:-translate-y-0.5 transition"
          data-testid="login-submit-button"
        >
          {busy ? <><Loader2 size={18} className="animate-spin mr-2" /> Signing in…</> : "Sign in"}
        </Button>

        <p className="text-center text-xs text-[#64748B]">
          Need a different role?{" "}
          <Link to="/login" className="hover:text-cyan-300" data-testid="login-back-selection">← back to role selection</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
