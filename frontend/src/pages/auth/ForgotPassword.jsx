import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Mail } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { toast } from "sonner";
import AuthLayout from "../../components/auth/AuthLayout";
import api, { formatApiError } from "../../lib/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null); // {ok, dev_token?}

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post("/auth/forgot-password", { email: email.trim() });
      setDone(data);
      toast.success("If that email exists, we just sent a reset link.");
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Could not send reset email.");
    } finally { setBusy(false); }
  };

  return (
    <AuthLayout role="default" title="Forgot your password?" subtitle="Enter your email and we'll ship you a one-time reset link.">
      {!done ? (
        <form onSubmit={onSubmit} className="space-y-5" data-testid="forgot-form">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#A0ABC0]">Email</Label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@cmsedu.ai"
                className="pl-9 h-12 bg-white/5 border-white/10 text-white placeholder:text-[#64748B] focus-visible:ring-cyan-400/60"
                data-testid="forgot-email-input" />
            </div>
          </div>
          <Button type="submit" disabled={busy} className="w-full h-12 text-base font-semibold bg-gradient-to-r from-[#00E5FF] to-[#0055FF] text-white shadow-[0_8px_28px_rgba(0,229,255,0.35)]" data-testid="forgot-submit-button">
            {busy ? <><Loader2 size={18} className="animate-spin mr-2" /> Sending…</> : "Send reset link"}
          </Button>
          <p className="text-center text-sm text-[#A0ABC0]">
            Remembered? <Link to="/login" className="text-cyan-300 hover:text-cyan-200" data-testid="forgot-back-login">Back to sign in</Link>
          </p>
        </form>
      ) : (
        <div className="space-y-4" data-testid="forgot-success">
          <div className="glass p-5">
            <p className="text-sm text-[#A0ABC0]">Check your inbox for a reset link. (In this dev environment, the token is logged below.)</p>
            {done.dev_token && (
              <div className="mt-4">
                <p className="text-xs uppercase tracking-widest text-cyan-300 mb-2">Dev token</p>
                <code className="block break-all bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-[#A0ABC0]">{done.dev_token}</code>
                <Link
                  to={`/reset-password?token=${encodeURIComponent(done.dev_token)}`}
                  className="inline-block mt-3 text-cyan-300 hover:text-cyan-200 text-sm"
                  data-testid="forgot-use-token-link"
                >
                  Use this token to reset →
                </Link>
              </div>
            )}
          </div>
          <Link to="/login" className="block text-center text-sm text-[#A0ABC0] hover:text-white">← Back to sign in</Link>
        </div>
      )}
    </AuthLayout>
  );
}
