import React, { useEffect, useState } from "react";
import api from "../../lib/api";
import { toast } from "sonner";

const STATUS_COLORS = {
  Pending: "cms-chip-yellow",
  Confirmed: "cms-chip-blue",
  Shipped: "cms-chip-purple",
  Delivered: "cms-chip-yellow",
  Cancelled: "cms-chip-red",
  Returned: "cms-chip-red",
};

export default function StudentOrders() {
  const [orders, setOrders] = useState([]);
  const reload = async () => { try { const { data } = await api.get("/student/site/orders"); setOrders(data.orders || []); } catch {} };
  useEffect(() => { reload(); }, []);

  const action = async (o, status) => {
    try { await api.patch(`/student/site/orders/${o.id}/status`, { status }); toast.success(`Order ${status.toLowerCase()}`); reload(); }
    catch { toast.error("Could not update order"); }
  };

  return (
    <div data-testid="student-orders">
      <h1 className="font-heading text-3xl md:text-4xl font-bold">My Orders</h1>
      <p className="text-[var(--cms-muted)] mb-6">Track every kit and product you've ordered.</p>

      <div className="cms-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-widest text-[var(--cms-muted)] border-b border-[#e3eeee]">
              <th className="px-4 py-3 font-semibold">Sr</th>
              <th className="px-4 py-3 font-semibold">Product</th>
              <th className="px-4 py-3 font-semibold">Price</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Date</th>
              <th className="px-4 py-3 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o, i) => (
              <tr key={o.id} className="border-t border-[#e3eeee] hover:bg-[var(--cms-teal-soft)]/30" data-testid={`order-row-${o.id}`}>
                <td className="px-4 py-3 font-mono text-[var(--cms-muted)]">{i + 1}</td>
                <td className="px-4 py-3 font-semibold text-[var(--cms-teal-deep)]">{o.product_name}</td>
                <td className="px-4 py-3">₹{o.price}</td>
                <td className="px-4 py-3"><span className={`cms-pill ${STATUS_COLORS[o.status] || "cms-chip-blue"}`}>{o.status}</span></td>
                <td className="px-4 py-3 text-[var(--cms-muted)]">{(o.created_at || "").slice(0, 10)}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2 justify-end">
                    {["Pending", "Confirmed"].includes(o.status) && (
                      <button onClick={() => action(o, "Cancelled")} className="cms-btn-ghost text-xs" data-testid={`order-cancel-${o.id}`}>Cancel</button>
                    )}
                    {o.status === "Delivered" && (
                      <button onClick={() => action(o, "Returned")} className="cms-btn-ghost text-xs" data-testid={`order-return-${o.id}`}>Return</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!orders.length && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-[var(--cms-muted)]">No orders yet — visit the Shop to start.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
