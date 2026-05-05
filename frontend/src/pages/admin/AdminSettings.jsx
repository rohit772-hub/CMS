import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Save, Globe, Mail, Phone, MapPin, KeyRound, Lock, Eye, EyeOff, CreditCard, Settings as SettingsIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { GlassCard, PageHeader } from "../../components/dashboard/Common";
import api, { formatApiError } from "../../lib/api";

export default function AdminSettings() {
  const [tab, setTab] = useState("general");
  const [loaded, setLoaded] = useState(false);

  const [general, setGeneral] = useState({ site_name: "", email: "", phone: "", address: "" });
  const [savingGeneral, setSavingGeneral] = useState(false);

  const [payment, setPayment] = useState({ razorpay_key: "", razorpay_secret: "", razorpay_secret_set: false });
  const [showSecret, setShowSecret] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/admin/settings");
        setGeneral(data.general || general);
        setPayment({ razorpay_key: data.payment?.razorpay_key || "", razorpay_secret: "", razorpay_secret_set: !!data.payment?.razorpay_secret_set });
      } catch (e) {
        toast.error(formatApiError(e.response?.data?.detail) || "Failed to load settings");
      } finally { setLoaded(true); }
    })();
    // eslint-disable-next-line
  }, []);

  const inputCls = "h-11 bg-white/5 border-white/10 text-white placeholder:text-[#64748B] focus-visible:ring-cyan-400/60";

  const saveGeneral = async (e) => {
    e.preventDefault();
    if (!general.site_name?.trim()) { toast.error("Site name is required"); return; }
    if (!general.email?.trim()) { toast.error("Email is required"); return; }
    setSavingGeneral(true);
    try {
      await api.put("/admin/settings/general", { ...general, site_name: general.site_name.trim(), email: general.email.trim() });
      toast.success("General settings saved");
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Failed to save general settings");
    } finally { setSavingGeneral(false); }
  };

  const savePayment = async (e) => {
    e.preventDefault();
    setSavingPayment(true);
    try {
      const body = { razorpay_key: payment.razorpay_key.trim(), razorpay_secret: payment.razorpay_secret };
      const { data } = await api.put("/admin/settings/payment", body);
      setPayment((p) => ({ ...p, razorpay_secret: "", razorpay_secret_set: !!data.razorpay_secret_set }));
      toast.success("Payment gateway settings saved");
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Failed to save payment settings");
    } finally { setSavingPayment(false); }
  };

  return (
    <div data-testid="admin-settings-page">
      <PageHeader eyebrow="Settings" title="Platform settings" subtitle="Configure how CMS Edu AI looks and how it gets paid." />

      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { key: "general", label: "General settings", icon: SettingsIcon, testid: "settings-tab-general" },
          { key: "payment", label: "Payment Gateway",  icon: CreditCard,   testid: "settings-tab-payment" },
        ].map(({ key, label, icon: Icon, testid }) => (
          <button
            key={key} onClick={() => setTab(key)}
            data-testid={testid}
            className={[
              "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm border transition",
              tab === key
                ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-200 shadow-[0_0_24px_rgba(0,229,255,0.15)]"
                : "border-white/10 text-[#A0ABC0] hover:text-white hover:bg-white/5",
            ].join(" ")}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {tab === "general" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <GlassCard testid="general-settings-card">
            <div className="mb-5">
              <h3 className="font-heading text-xl font-medium tracking-tight">General settings</h3>
              <p className="text-sm text-[#A0ABC0] mt-1">Public information shown in invoices, emails and the marketing site.</p>
            </div>
            <form onSubmit={saveGeneral} className="grid grid-cols-1 md:grid-cols-2 gap-5" data-testid="general-settings-form">
              <div className="space-y-2 md:col-span-2">
                <Label className="text-sm font-medium text-[#A0ABC0]">Site Name</Label>
                <div className="relative">
                  <Globe size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
                  <Input value={general.site_name} onChange={(e) => setGeneral((g) => ({ ...g, site_name: e.target.value }))} placeholder="CMS Edu AI" className={`pl-9 ${inputCls}`} data-testid="settings-site-name-input" />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-[#A0ABC0]">Email</Label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
                  <Input type="email" value={general.email} onChange={(e) => setGeneral((g) => ({ ...g, email: e.target.value }))} placeholder="hello@cmsedu.ai" className={`pl-9 ${inputCls}`} data-testid="settings-email-input" />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-[#A0ABC0]">Phone</Label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
                  <Input value={general.phone} onChange={(e) => setGeneral((g) => ({ ...g, phone: e.target.value }))} placeholder="+1 555 0100" className={`pl-9 ${inputCls}`} data-testid="settings-phone-input" />
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label className="text-sm font-medium text-[#A0ABC0]">Address</Label>
                <div className="relative">
                  <MapPin size={16} className="absolute left-3 top-3 text-[#64748B]" />
                  <Textarea
                    value={general.address}
                    onChange={(e) => setGeneral((g) => ({ ...g, address: e.target.value }))}
                    rows={3}
                    placeholder="Street, city, country…"
                    className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-[#64748B] focus-visible:ring-cyan-400/60 resize-none"
                    data-testid="settings-address-input"
                  />
                </div>
              </div>

              <div className="md:col-span-2 pt-1">
                <Button type="submit" disabled={savingGeneral || !loaded} className="bg-gradient-to-r from-[#00E5FF] to-[#0055FF] text-white shadow-[0_8px_28px_rgba(0,229,255,0.35)] hover:-translate-y-0.5 transition" data-testid="settings-general-save-button">
                  {savingGeneral ? <><Loader2 size={16} className="animate-spin mr-2" />Saving…</> : <><Save size={16} className="mr-2" />Save changes</>}
                </Button>
              </div>
            </form>
          </GlassCard>
        </motion.div>
      )}

      {tab === "payment" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <GlassCard testid="payment-settings-card">
            <div className="mb-5">
              <h3 className="font-heading text-xl font-medium tracking-tight">Payment gateway settings</h3>
              <p className="text-sm text-[#A0ABC0] mt-1">Razorpay credentials are stored securely and never shown after saving.</p>
            </div>
            <form onSubmit={savePayment} className="grid grid-cols-1 md:grid-cols-2 gap-5" data-testid="payment-settings-form">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-[#A0ABC0]">Razorpay Key</Label>
                <div className="relative">
                  <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
                  <Input
                    value={payment.razorpay_key}
                    onChange={(e) => setPayment((p) => ({ ...p, razorpay_key: e.target.value }))}
                    placeholder="rzp_live_xxxxxxxxxxxxxx"
                    className={`pl-9 font-mono text-xs ${inputCls}`}
                    data-testid="settings-razorpay-key-input"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-[#A0ABC0]">
                  Razorpay Secret {payment.razorpay_secret_set && <span className="ml-2 text-[10px] uppercase tracking-widest text-emerald-300">stored</span>}
                </Label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
                  <Input
                    type={showSecret ? "text" : "password"}
                    value={payment.razorpay_secret}
                    onChange={(e) => setPayment((p) => ({ ...p, razorpay_secret: e.target.value }))}
                    placeholder={payment.razorpay_secret_set ? "•••••••• (leave blank to keep)" : "Paste your secret"}
                    className={`pl-9 pr-10 font-mono text-xs ${inputCls}`}
                    data-testid="settings-razorpay-secret-input"
                  />
                  <button type="button" onClick={() => setShowSecret((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A0ABC0] hover:text-white" aria-label="Toggle secret visibility" data-testid="settings-razorpay-secret-toggle">
                    {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="md:col-span-2 pt-1">
                <Button type="submit" disabled={savingPayment || !loaded} className="bg-gradient-to-r from-[#00E5FF] to-[#0055FF] text-white shadow-[0_8px_28px_rgba(0,229,255,0.35)] hover:-translate-y-0.5 transition" data-testid="settings-payment-save-button">
                  {savingPayment ? <><Loader2 size={16} className="animate-spin mr-2" />Saving…</> : <><Save size={16} className="mr-2" />Save changes</>}
                </Button>
              </div>
            </form>
          </GlassCard>
        </motion.div>
      )}
    </div>
  );
}
