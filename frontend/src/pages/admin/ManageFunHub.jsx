import React from "react";
import { Badge } from "../../components/ui/badge";
import ResourceManager from "../../components/admin/ResourceManager";
import { fmtDate } from "../../lib/resources";

const CATEGORIES = ["Game", "Robot", "Activity", "Challenge", "Video"];

export default function ManageFunHub() {
  return (
    <ResourceManager
      kind="fun-hub"
      eyebrow="Engagement"
      title="Fun Learning Hub"
      subtitle="Curate links, mini-games and activities that surface on the student Fun Hub tab."
      excelHint="Columns: title, category, description, url"
      fields={[
        { key: "title", label: "Title", type: "text", required: true },
        { key: "category", label: "Category", type: "select", required: true,
          options: CATEGORIES.map((c) => ({ value: c, label: c })) },
        { key: "url", label: "Destination URL", type: "text", placeholder: "https://…", required: true },
        { key: "image", label: "Cover Image", type: "image" },
        { key: "description", label: "Short Description", type: "textarea", span: 2 },
      ]}
      columns={[
        { key: "image", label: "Cover", render: (r) => {
          const url = typeof r.image === "string" ? r.image : r.image?.url;
          return url ? <img src={url} alt="" loading="lazy" className="w-12 h-12 rounded-lg object-cover border border-white/10" /> : <span className="text-[#64748B]">—</span>;
        }},
        { key: "title", label: "Title" },
        { key: "category", label: "Category", render: (r) => (
          <Badge variant="outline" className="border-cyan-400/40 text-cyan-200 bg-cyan-500/10">{r.category || "—"}</Badge>
        )},
        { key: "url", label: "URL", render: (r) => r.url ? <a href={r.url} target="_blank" rel="noreferrer" className="text-cyan-300 underline truncate inline-block max-w-[260px]">{r.url}</a> : "—" },
        { key: "status", label: "Status", render: (r) => (
          <Badge variant="outline" className={r.status === "disabled" ? "border-red-400/40 text-red-300 bg-red-500/10" : "border-emerald-400/40 text-emerald-300 bg-emerald-500/10"}>{r.status || "active"}</Badge>
        )},
        { key: "created_at", label: "Added", render: (r) => fmtDate(r.created_at) },
      ]}
      filters={[
        { key: "category", label: "Category", options: CATEGORIES.map((v) => ({ value: v, label: v })) },
      ]}
      downloadable
      viewable
    />
  );
}
