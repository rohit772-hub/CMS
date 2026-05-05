import React, { useRef, useState } from "react";
import { Loader2, Upload, User, Mail, Lock, Eye, EyeOff, Save, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { GlassCard, PageHeader } from "../../components/dashboard/Common";
import api, { formatApiError } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

export default function AdminProfile() {
  const { user, setUser } = useAuth();
  const fileRef = useRef(null);

  const [name, setName] = useState(user?.name || "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || "");
  const [savingProfile, setSavingProfile] = useState(false);

  const [pwd, setPwd] = useState({ current: "", next: "", confirm: "" });
  const [showPwd, setShowPwd] = useState({ current: false, next: false, confirm: false });
  const [savingPwd, setSavingPwd] = useState(false);

  const initials = (user?.name || "U").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  const onPickFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) { toast.error("Please choose an image file."); return; }
    if (f.size > 2 * 1024 * 1024) { toast.error("Image too large. Max 2MB."); return; }
    try {
      const dataUrl = await readFileAsDataUrl(f);
      setAvatarUrl(dataUrl);
      toast.success("Logo previewed — click Save to apply.");
    } catch { toast.error("Could not read image."); }
  };

  const onSaveProfile = async (e) => {
    e.preventDefault();
    if (!name.trim()) { toast.error("Name is required"); return; }
    setSavingProfile(true);
    try {
      const { data } = await api.put("/auth/profile", { name: name.trim(), avatar_url: avatarUrl || null });
      setUser(data);
      toast.success("Profile updated");
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Failed to update profile");
    } finally { setSavingProfile(false); }
  };

  const onSavePassword = async (e) => {
    e.preventDefault();
    if (!pwd.current || !pwd.next || !pwd.confirm) { toast.error("All password fields are required"); return; }
    if (pwd.next.length < 6) { toast.error("New password must be at least 6 characters"); return; }
    if (pwd.next !== pwd.confirm) { toast.error("New passwords do not match"); return; }
    setSavingPwd(true);
    try {
      await api.post("/auth/change-password", { current_password: pwd.current, new_password: pwd.next });
      setPwd({ current: "", next: "", confirm: "" });
      toast.success("Password changed successfully");
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Failed to change password");
    } finally { setSavingPwd(false); }
  };

  const inputCls = "h-11 bg-white/5 border-white/10 text-white placeholder:text-[#64748B] focus-visible:ring-cyan-400/60";

  return (
    <div data-testid="admin-profile-page">
      <PageHeader eyebrow="Account" title="My profile" subtitle="Manage your identity and credentials." />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Detail */}
        <GlassCard testid="profile-detail-card">
          <div className="mb-5">
            <h3 className="font-heading text-xl font-medium tracking-tight">Profile detail</h3>
            <p className="text-sm text-[#A0ABC0] mt-1">Update your logo, name and email shown across the platform.</p>
          </div>
          <form onSubmit={onSaveProfile} className="space-y-5" data-testid="profile-detail-form">
            {/* Logo block */}
            <div>
              <Label className="text-sm font-medium text-[#A0ABC0]">Logo</Label>
              <div className="mt-3 flex items-center gap-5">
                <div className="relative">
                  <Avatar className="w-20 h-20 ring-2 ring-cyan-400/30 shadow-[0_0_30px_rgba(0,229,255,0.25)]">
                    {avatarUrl ? <AvatarImage src={avatarUrl} alt="profile logo" /> : null}
                    <AvatarFallback className="bg-gradient-to-br from-[#00E5FF] to-[#0055FF] text-white text-lg font-semibold">{initials}</AvatarFallback>
                  </Avatar>
                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={() => setAvatarUrl("")}
                      className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-[#0B1120] border border-white/15 text-white/80 hover:text-white hover:bg-red-500/20 flex items-center justify-center"
                      data-testid="profile-logo-clear"
                      aria-label="Remove logo"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  <input ref={fileRef} type="file" accept="image/*" onChange={onPickFile} className="hidden" data-testid="profile-logo-file" />
                  <Button
                    type="button" variant="outline"
                    onClick={() => fileRef.current?.click()}
                    className="bg-white/5 border-white/10 hover:bg-white/10 text-white"
                    data-testid="profile-logo-upload-button"
                  >
                    <Upload size={14} className="mr-2" /> Upload image
                  </Button>
                  <p className="text-xs text-[#64748B]">PNG/JPG up to 2MB. Square works best.</p>
                </div>
              </div>
            </div>

            {/* Name block */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#A0ABC0]">Name</Label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className={`pl-9 ${inputCls}`} data-testid="profile-name-input" />
              </div>
            </div>

            {/* Email block (read-only) */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#A0ABC0]">Email</Label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
                <Input value={user?.email || ""} readOnly className={`pl-9 ${inputCls} cursor-not-allowed opacity-80`} data-testid="profile-email-input" />
              </div>
              <p className="text-xs text-[#64748B]">Email is your sign-in identifier and can't be changed here.</p>
            </div>

            <div className="pt-2">
              <Button type="submit" disabled={savingProfile} className="bg-gradient-to-r from-[#00E5FF] to-[#0055FF] text-white shadow-[0_8px_28px_rgba(0,229,255,0.35)] hover:-translate-y-0.5 transition" data-testid="profile-save-button">
                {savingProfile ? <><Loader2 size={16} className="animate-spin mr-2" />Saving…</> : <><Save size={16} className="mr-2" />Save changes</>}
              </Button>
            </div>
          </form>
        </GlassCard>

        {/* Change Password */}
        <GlassCard testid="change-password-card">
          <div className="mb-5">
            <h3 className="font-heading text-xl font-medium tracking-tight">Change password</h3>
            <p className="text-sm text-[#A0ABC0] mt-1">Use a strong, unique password you don't reuse anywhere else.</p>
          </div>
          <form onSubmit={onSavePassword} className="space-y-5" data-testid="change-password-form">
            {[
              { key: "current", label: "Current password", placeholder: "Enter current password", testid: "password-current-input", showKey: "current", showId: "password-current-toggle" },
              { key: "next",    label: "New password",     placeholder: "At least 6 characters",  testid: "password-new-input",     showKey: "next",    showId: "password-new-toggle" },
              { key: "confirm", label: "Confirm password", placeholder: "Repeat new password",     testid: "password-confirm-input", showKey: "confirm", showId: "password-confirm-toggle" },
            ].map(({ key, label, placeholder, testid, showKey, showId }) => (
              <div className="space-y-2" key={key}>
                <Label className="text-sm font-medium text-[#A0ABC0]">{label}</Label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
                  <Input
                    type={showPwd[showKey] ? "text" : "password"}
                    value={pwd[key]} onChange={(e) => setPwd((p) => ({ ...p, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className={`pl-9 pr-10 ${inputCls}`}
                    data-testid={testid}
                  />
                  <button type="button" onClick={() => setShowPwd((p) => ({ ...p, [showKey]: !p[showKey] }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A0ABC0] hover:text-white" aria-label="Toggle visibility" data-testid={showId}>
                    {showPwd[showKey] ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            ))}

            <div className="pt-2">
              <Button type="submit" disabled={savingPwd} className="bg-gradient-to-r from-[#00E5FF] to-[#0055FF] text-white shadow-[0_8px_28px_rgba(0,229,255,0.35)] hover:-translate-y-0.5 transition" data-testid="password-save-button">
                {savingPwd ? <><Loader2 size={16} className="animate-spin mr-2" />Saving…</> : <><Save size={16} className="mr-2" />Save changes</>}
              </Button>
            </div>
          </form>
        </GlassCard>
      </div>
    </div>
  );
}
