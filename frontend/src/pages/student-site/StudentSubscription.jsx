import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, Crown, Sparkles } from "lucide-react";
import api from "../../lib/api";
import { toast } from "sonner";

export default function StudentSubscription() {
  const [plan, setPlan] = useState("monthly");
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { api.get("/student/site/subscription").then(({ data }) => setStatus(data)).catch(() => {}); }, []);

  const price = plan === "monthly" ? 200 : 2400;
  const billed = plan === "monthly" ? "/month" : "/year";

  const subscribe = async () => {
    setBusy(true);
    try {
      await api.post("/student/site/subscription/subscribe", { plan });
      const { data } = await api.get("/student/site/subscription");
      setStatus(data);
      toast.success("Subscription activated — welcome to Pro!");
    } catch (_) { toast.error("Could not subscribe right now."); }
    finally { setBusy(false); }
  };

  return (
    <div className="max-w-3xl mx-auto" data-testid="student-subscription">
      <h1 className="font-heading text-3xl md:text-4xl font-bold text-center">Upgrade to Pro</h1>
      <p className="text-center text-[var(--cms-muted)] mt-2">Unlock premium learning, kits and the full Student Dashboard.</p>

      <div className="flex justify-center mt-6">
        <div className="inline-flex rounded-full p-1 bg-[var(--cms-teal-soft)]">
          {["monthly", "yearly"].map((p) => (
            <button key={p} onClick={() => setPlan(p)} data-testid={`plan-toggle-${p}`}
              className={`px-5 py-2 rounded-full text-sm font-semibold ${plan === p ? "bg-[var(--cms-teal)] text-white shadow" : "text-[var(--cms-teal-deep)]"}`}>
              {p === "monthly" ? "Monthly" : "Yearly · save 17%"}
            </button>
          ))}
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
        className="cms-card mt-8 p-7 relative overflow-hidden" data-testid="subscription-card">
        <div className="absolute -right-10 -top-10 w-56 h-56 rounded-full bg-[var(--cms-yellow)]/30 blur-3xl" />
        <div className="absolute -left-10 -bottom-10 w-56 h-56 rounded-full bg-[var(--cms-teal)]/15 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[var(--cms-yellow)] flex items-center justify-center shadow-md"><Crown size={22} className="text-[#5e3b00]" /></div>
          <div>
            <p className="text-xs uppercase tracking-widest text-[var(--cms-muted)]">Pro Membership</p>
            <h2 className="font-heading text-3xl font-bold text-[var(--cms-teal-deep)]">CMS Pro</h2>
          </div>
          <div className="ml-auto text-right">
            <p className="text-3xl font-bold text-[var(--cms-red)]">₹{price}</p>
            <p className="text-xs text-[var(--cms-muted)]">{billed}</p>
          </div>
        </div>

        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-6 relative">
          {[
            "Interactive Energy Bar",
            "Kit Purchase included",
            "Student Learning Dashboard",
            "Access to premium learning resources",
            "Better learning experience",
            "Progress tracking",
            "Priority access to new activities",
            "Robo Buddy AI tutor",
          ].map((f) => (
            <li key={f} className="flex items-center gap-2 text-sm text-[var(--cms-teal-deep)]">
              <span className="w-5 h-5 rounded-full bg-[var(--cms-teal-soft)] text-[var(--cms-teal)] inline-flex items-center justify-center"><Check size={12} /></span>
              {f}
            </li>
          ))}
        </ul>

        <div className="mt-7 flex flex-wrap items-center gap-3 relative">
          {status?.active ? (
            <span className="cms-pill cms-chip-yellow"><Sparkles size={12} /> Already Pro · expires {status.expires_at?.slice(0,10) || "—"}</span>
          ) : (
            <button onClick={subscribe} disabled={busy} className="cms-btn-primary" data-testid="subscribe-button">
              {busy ? "Activating…" : `Subscribe Now · ₹${price}${billed}`}
            </button>
          )}
          <span className="text-xs text-[var(--cms-muted)]">Cancel anytime · No hidden fees</span>
        </div>
      </motion.div>
    </div>
  );
}
