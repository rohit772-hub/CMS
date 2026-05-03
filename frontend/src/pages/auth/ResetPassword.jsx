import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, Lock, Eye, EyeOff } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { toast } from "sonner";
import AuthLayout from "../../components/auth/AuthLayout";
import api, { formatApiError } from "../../lib/api";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [token, setToken] = useState(params.get("token") || "");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault(); setErr("");
    if (password.length < 6) { setErr("Password must be at least 6 characters."); return; }
    setBusy(true);
    try {
      await api.post("/auth/reset-password", { token, password });
      toast.success("Password updated. Please sign in.");
      navigate("/login", { replace: true });
    } catch (e) {
      const msg = formatApiError(e.response?.data?.detail) || "Reset failed.";
      setErr(msg); toast.error(msg);
    } finally { setBusy(false); }
  };

  return (
    <AuthLayout role="default" title="Reset your password" subtitle="Set a strong, unique password for your account.">
      <form onSubmit={onSubmit} className="space-y-5" data-testid="reset-form">
        <div className="space-y-2">
          <Label className="text-sm font-medium text-[#A0ABC0]">Reset token</Label>
          <Input value={token} onChange={(e) => setToken(e.target.value)} required placeholder="Paste your token here"
            className="h-12 bg-white/5 border-white/10 text-white placeholder:text-[#64748B] focus-visible:ring-cyan-400/60 font-mono text-xs"
            data-testid="reset-token-input" />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium text-[#A0ABC0]">New password</Label>
          <div className="relative">
            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
            <Input type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required
              className="pl-9 pr-10 h-12 bg-white/5 border-white/10 text-white placeholder:text-[#64748B] focus-visible:ring-cyan-400/60"
              placeholder="••••••••" data-testid="reset-password-input" />
            <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A0ABC0]" data-testid="reset-toggle-password" aria-label="Toggle password">
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        {err && <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2" data-testid="reset-error">{err}</div>}
        <Button type="submit" disabled={busy} className="w-full h-12 text-base font-semibold bg-gradient-to-r from-[#00E5FF] to-[#0055FF] text-white shadow-[0_8px_28px_rgba(0,229,255,0.35)]" data-testid="reset-submit-button">
          {busy ? <><Loader2 size={18} className="animate-spin mr-2" /> Updating…</> : "Update password"}
        </Button>
        <p className="text-center text-sm text-[#A0ABC0]"><Link to="/login" className="text-cyan-300 hover:text-cyan-200">← Back to sign in</Link></p>
      </form>
    </AuthLayout>
  );
}
