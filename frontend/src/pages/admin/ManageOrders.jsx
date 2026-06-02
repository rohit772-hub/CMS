import React from "react";
import { Badge } from "../../components/ui/badge";
import ResourceManager from "../../components/admin/ResourceManager";
import { fmtDate } from "../../lib/resources";

const STATUSES = ["Pending", "Confirmed", "Shipped", "Delivered", "Cancelled", "Returned"];
const COLORS = {
  Pending:   "border-amber-400/40 text-amber-200 bg-amber-500/10",
  Confirmed: "border-cyan-400/40 text-cyan-200 bg-cyan-500/10",
  Shipped:   "border-violet-400/40 text-violet-200 bg-violet-500/10",
  Delivered: "border-emerald-400/40 text-emerald-300 bg-emerald-500/10",
  Cancelled: "border-red-400/40 text-red-300 bg-red-500/10",
  Returned:  "border-zinc-400/40 text-zinc-200 bg-zinc-500/10",
};

export default function ManageOrders() {
  return (
    <ResourceManager
      kind="orders"
      eyebrow="Store"
      title="Orders"
      subtitle="Every checkout placed by students — update status to keep them in the loop."
      excelEnabled={false}
      fields={[
        { key: "product_name", label: "Product", type: "text", required: true },
        { key: "user_name", label: "Student", type: "text" },
        { key: "user_email", label: "Student Email", type: "email" },
        { key: "price", label: "Price (₹)", type: "number" },
        { key: "status", label: "Status", type: "select", options: STATUSES.map((s) => ({ value: s, label: s })) },
        { key: "address", label: "Shipping Address", type: "textarea", span: 2 },
        { key: "notes", label: "Internal Notes", type: "textarea", span: 2 },
      ]}
      columns={[
        { key: "id", label: "Order ID", render: (r) => <span className="font-mono text-xs text-cyan-200">{r.id}</span> },
        { key: "user_name", label: "Student", render: (r) => r.user_name || r.user_email || "—" },
        { key: "product_name", label: "Product" },
        { key: "price", label: "Amount", render: (r) => <span className="text-cyan-200">₹ {r.price ?? 0}</span> },
        { key: "status", label: "Status", render: (r) => (
          <Badge variant="outline" className={COLORS[r.status] || COLORS.Pending}>{r.status || "Pending"}</Badge>
        )},
        { key: "created_at", label: "Placed", render: (r) => fmtDate(r.created_at) },
      ]}
      filters={[
        { key: "status", label: "Status", options: STATUSES.map((v) => ({ value: v, label: v })) },
      ]}
      downloadable
      viewable
    />
  );
}
