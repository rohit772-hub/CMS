import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { Loader2, ShieldCheck, Truck, CreditCard, ArrowRight, CheckCircle2 } from "lucide-react";
import api from "../../lib/api";
import { toast } from "sonner";

const EMPTY = {
  name: "", phone: "", line1: "", line2: "", city: "", state: "", pincode: "", country: "India",
};

const RZP_SDK_URL = "https://checkout.razorpay.com/v1/checkout.js";
function loadRazorpaySdk() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const existing = document.querySelector(`script[src="${RZP_SDK_URL}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(true));
      existing.addEventListener("error", () => resolve(false));
      return;
    }
    const s = document.createElement("script");
    s.src = RZP_SDK_URL; s.async = true;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

/**
 * <BuyNowDialog product={p} open onOpenChange={...} onSuccess={(order)=>{}} />
 * Three steps: address → payment → success.
 */
export default function BuyNowDialog({ product, open, onOpenChange, onSuccess }) {
  const [step, setStep] = useState(1); // 1=address, 2=launching/paying, 3=success
  const [busy, setBusy] = useState(false);
  const [addr, setAddr] = useState(EMPTY);
  const [createdOrder, setCreatedOrder] = useState(null);

  const reset = () => { setStep(1); setBusy(false); setAddr(EMPTY); setCreatedOrder(null); };

  const valid = () => {
    if (!addr.name.trim()) return "Please enter your name.";
    if (!/^\+?\d[\d\s-]{5,}$/.test(addr.phone)) return "Phone number looks invalid.";
    if (!addr.line1.trim()) return "Address line 1 is required.";
    if (!addr.city.trim() || !addr.state.trim()) return "City and State are required.";
    if (!/^\d{4,8}$/.test(addr.pincode.trim())) return "Pincode looks invalid.";
    return "";
  };

  const launchRazorpay = async () => {
    const err = valid();
    if (err) { toast.error(err); return; }
    setBusy(true);
    try {
      const { data } = await api.post("/payments/create-order", {
        product_id: product.id, quantity: 1, address: addr,
      });
      setCreatedOrder(data.order);
      const ok = await loadRazorpaySdk();
      if (!ok || !window.Razorpay) {
        toast.error("Could not load the payment widget. Please retry.");
        setBusy(false); return;
      }
      const options = {
        key: data.key_id,
        amount: data.amount,
        currency: data.currency,
        order_id: data.razorpay_order_id,
        name: "Create Mind Studio",
        description: product.name,
        image: "/cms-logo.png",
        prefill: data.prefill,
        theme: { color: "#126b6e" },
        handler: async (res) => {
          try {
            const v = await api.post("/payments/verify", {
              order_id: data.order.id,
              razorpay_order_id: res.razorpay_order_id,
              razorpay_payment_id: res.razorpay_payment_id,
              razorpay_signature: res.razorpay_signature,
            });
            setCreatedOrder(v.data.order);
            setStep(3);
            onSuccess?.(v.data.order);
            toast.success("Payment confirmed — your order is on the way!");
          } catch (e) {
            toast.error(e.response?.data?.detail || "Payment verification failed.");
          } finally { setBusy(false); }
        },
        modal: {
          ondismiss: () => { setBusy(false); toast("Payment cancelled."); },
        },
      };
      setStep(2);
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (e) {
      const msg = e.response?.data?.detail || "Could not start payment.";
      toast.error(msg);
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange?.(o); if (!o) reset(); }}>
      <DialogContent className="max-w-lg bg-white text-[var(--cms-teal-deep)] border-0 shadow-2xl" data-testid="buy-now-dialog">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl flex items-center gap-2">
            <Truck size={18} className="text-[var(--cms-teal)]" /> Buy Now · {product?.name}
          </DialogTitle>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center justify-center gap-2 text-xs my-2">
          {["Address", "Payment", "Done"].map((label, i) => {
            const n = i + 1;
            const done = step > n; const active = step === n;
            return (
              <React.Fragment key={label}>
                <span className={`px-2.5 py-1 rounded-full font-semibold ${done ? "bg-emerald-100 text-emerald-700" : active ? "bg-[var(--cms-teal)] text-white" : "bg-zinc-100 text-zinc-500"}`}>{n}. {label}</span>
                {i < 2 && <ArrowRight size={12} className="text-zinc-400" />}
              </React.Fragment>
            );
          })}
        </div>

        {step !== 3 && (
          <div className="space-y-4 mt-1" data-testid="buynow-address-step">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-[var(--cms-teal-deep)] mb-1 block">Full name *</Label>
                <Input value={addr.name} onChange={(e) => setAddr({ ...addr, name: e.target.value })} placeholder="e.g. Noah Patel" data-testid="buynow-name" />
              </div>
              <div>
                <Label className="text-xs font-semibold text-[var(--cms-teal-deep)] mb-1 block">Phone *</Label>
                <Input value={addr.phone} onChange={(e) => setAddr({ ...addr, phone: e.target.value })} placeholder="+91 98xxxxxx00" data-testid="buynow-phone" />
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold text-[var(--cms-teal-deep)] mb-1 block">Address line 1 *</Label>
              <Input value={addr.line1} onChange={(e) => setAddr({ ...addr, line1: e.target.value })} placeholder="House / flat / building" data-testid="buynow-line1" />
            </div>
            <div>
              <Label className="text-xs font-semibold text-[var(--cms-teal-deep)] mb-1 block">Address line 2 (optional)</Label>
              <Input value={addr.line2} onChange={(e) => setAddr({ ...addr, line2: e.target.value })} placeholder="Area, landmark…" data-testid="buynow-line2" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-semibold text-[var(--cms-teal-deep)] mb-1 block">City *</Label>
                <Input value={addr.city} onChange={(e) => setAddr({ ...addr, city: e.target.value })} placeholder="Bangalore" data-testid="buynow-city" />
              </div>
              <div>
                <Label className="text-xs font-semibold text-[var(--cms-teal-deep)] mb-1 block">State *</Label>
                <Input value={addr.state} onChange={(e) => setAddr({ ...addr, state: e.target.value })} placeholder="KA" data-testid="buynow-state" />
              </div>
              <div>
                <Label className="text-xs font-semibold text-[var(--cms-teal-deep)] mb-1 block">Pincode *</Label>
                <Input value={addr.pincode} onChange={(e) => setAddr({ ...addr, pincode: e.target.value })} placeholder="560001" data-testid="buynow-pincode" />
              </div>
            </div>
            <div className="bg-[var(--cms-teal-soft)]/50 rounded-xl p-3 flex items-start gap-2 text-xs text-[var(--cms-teal-deep)]">
              <ShieldCheck size={14} className="mt-0.5 shrink-0 text-[var(--cms-teal)]" />
              <span>Payments are processed securely by <strong>Razorpay</strong>. We never store your card or UPI details.</span>
            </div>
            <div className="flex items-center justify-between border-t pt-3">
              <div>
                <p className="text-xs text-[var(--cms-muted)]">Total payable</p>
                <p className="text-2xl font-bold text-[var(--cms-red)]">₹ {product?.price}</p>
              </div>
              <Button onClick={launchRazorpay} disabled={busy} className="bg-[var(--cms-teal)] hover:bg-[var(--cms-teal-deep)] text-white" data-testid="buynow-pay-button">
                {busy ? <><Loader2 size={14} className="animate-spin mr-2" /> Starting…</> : <><CreditCard size={14} className="mr-2" /> Pay ₹{product?.price}</>}
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="text-center py-6" data-testid="buynow-success">
            <div className="w-16 h-16 rounded-full bg-emerald-100 mx-auto grid place-items-center">
              <CheckCircle2 size={32} className="text-emerald-600" />
            </div>
            <h3 className="font-heading text-2xl font-bold mt-3">Payment confirmed!</h3>
            <p className="text-sm text-[var(--cms-muted)] mt-1">Order <span className="font-mono">{createdOrder?.id}</span> is on its way. Track it in <strong>Orders</strong>.</p>
            <DialogFooter className="mt-5 flex justify-center">
              <Button onClick={() => { onOpenChange?.(false); reset(); }} className="cms-btn-primary" data-testid="buynow-close">Continue shopping</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
