import React, { useMemo } from "react";
import { Badge } from "../../components/ui/badge";
import ResourceManager, { useResourceList } from "../../components/admin/ResourceManager";
import { fmtDate } from "../../lib/resources";

export default function ManageNotifications() {
  const [schools] = useResourceList("schools");
  const [classes] = useResourceList("classes");
  const schoolOpts = useMemo(() => schools.map((s) => ({ value: s.name, label: s.name })), [schools]);
  const classOpts = useMemo(() => classes.map((c) => ({ value: c.name, label: c.name })), [classes]);

  return (
    <ResourceManager
      kind="notifications"
      eyebrow="Communication"
      title="Notifications"
      subtitle="Send announcements to all students, a specific school, or a single class."
      excelEnabled={false}
      fields={[
        { key: "title", label: "Title", type: "text", required: true },
        { key: "audience", label: "Audience", type: "select", required: true, options: [
          { value: "all", label: "All students" },
          { value: "school", label: "Specific school" },
          { value: "class", label: "Specific class" },
        ] },
        { key: "school_name", label: "School (if audience = school)", type: "select", options: schoolOpts, placeholder: "Pick school" },
        { key: "class_name", label: "Class (if audience = class)", type: "select", options: classOpts, placeholder: "Pick class" },
        { key: "image", label: "Banner Image", type: "image" },
        { key: "body", label: "Message", type: "textarea", required: true, span: 2 },
      ]}
      columns={[
        { key: "image", label: "Banner", render: (r) => {
          const url = typeof r.image === "string" ? r.image : r.image?.url;
          return url ? <img src={url} alt="" loading="lazy" className="w-14 h-10 rounded-md object-cover border border-white/10" /> : <span className="text-[#64748B]">—</span>;
        }},
        { key: "title", label: "Title" },
        { key: "audience", label: "Audience", render: (r) => (
          <Badge variant="outline" className="border-violet-400/40 text-violet-200 bg-violet-500/10">{r.audience || "all"}</Badge>
        )},
        { key: "target", label: "Target", render: (r) => r.audience === "school" ? r.school_name : r.audience === "class" ? r.class_name : "Everyone" },
        { key: "body", label: "Message", render: (r) => <span className="text-white/80 line-clamp-1 max-w-[280px] inline-block truncate">{r.body || "—"}</span> },
        { key: "status", label: "Status", render: (r) => (
          <Badge variant="outline" className={r.status === "disabled" ? "border-red-400/40 text-red-300 bg-red-500/10" : "border-emerald-400/40 text-emerald-300 bg-emerald-500/10"}>{r.status || "active"}</Badge>
        )},
        { key: "created_at", label: "Sent", render: (r) => fmtDate(r.created_at) },
      ]}
      filters={[
        { key: "audience", label: "Audience", options: [
          { value: "all", label: "All" }, { value: "school", label: "School" }, { value: "class", label: "Class" },
        ] },
      ]}
      downloadable
      viewable
    />
  );
}
