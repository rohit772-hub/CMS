import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import AuthLayout from "../../components/auth/AuthLayout";
import api, { formatApiError } from "../../lib/api";

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState(token ? "loading" : "no-token");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    (async () => {
      try { await api.post("/auth/verify-email", { token }); setState("success"); }
      catch (e) { setError(formatApiError(e.response?.data?.detail) || "Verification failed."); setState("error"); }
    })();
  }, [token]);

  return (
    <AuthLayout role="default" title="Email verification" subtitle="Confirming your email address with the studio.">
      <div className="space-y-5" data-testid="verify-email-page">
        {state === "loading" && (
          <div className="glass p-6 flex items-center gap-3">
            <Loader2 className="animate-spin text-cyan-300" /> Verifying…
          </div>
        )}
        {state === "success" && (
          <div className="glass p-6 flex items-start gap-3">
            <CheckCircle2 className="text-emerald-400 mt-0.5" />
            <div>
              <p className="font-medium">You're verified!</p>
              <p className="text-sm text-[#A0ABC0]">Your email is confirmed. You can now access all features.</p>
            </div>
          </div>
        )}
        {state === "error" && (
          <div className="glass p-6 flex items-start gap-3">
            <AlertCircle className="text-red-400 mt-0.5" />
            <div>
              <p className="font-medium">We couldn't verify this link.</p>
              <p className="text-sm text-[#A0ABC0]">{error}</p>
            </div>
          </div>
        )}
        {state === "no-token" && (
          <div className="glass p-6">
            <p className="text-sm text-[#A0ABC0]">Open the verification link sent to your inbox to verify your email.</p>
          </div>
        )}
        <Link to="/login" className="block text-center text-sm text-cyan-300 hover:text-cyan-200" data-testid="verify-back-login">← Back to sign in</Link>
      </div>
    </AuthLayout>
  );
}
