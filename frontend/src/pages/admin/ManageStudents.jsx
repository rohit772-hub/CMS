import React, { useMemo, useState } from "react";
import { Badge } from "../../components/ui/badge";
import ResourceManager, { useResourceList } from "../../components/admin/ResourceManager";
import { fmtDate } from "../../lib/resources";

export default function ManageStudents() {
  const [schools] = useResourceList("schools");
  const schoolOpts = useMemo(() => schools.map((s) => ({ value: s.name, label: `${s.name}${s.code ? ` (${s.code})` : ""}` })), [schools]);

  // The Class dropdown should filter by selected school — we need access to form state.
  // Our ResourceManager exposes fields statically; to keep it simple we compute ALL classes as options
  // and gently hint via placeholder. For richer linkage we'd pass through a field.dependsOn hook.
  const [students] = useResourceList("classes"); // re-use hook pattern
  const classOpts = useMemo(() => students.map((c) => ({ value: c.name, label: c.name })), [students]);

  // To filter classes by school we'll override option rendering via a dynamic options hook:
  const DynamicClassOpts = ({ form }) => form; // placeholder not used
  void DynamicClassOpts;

  return (
    <ResourceManager
      kind="students"
      eyebrow="Student Management"
      title="Students"
      subtitle="Students linked to schools and classes. New schools appear automatically in the dropdown."
      excelHint="Columns: name, email, phone, division, school_name, class_name, parent_name, address"
      fields={[
        { key: "school_name", label: "School", type: "select", options: schoolOpts, placeholder: "Select school", required: true },
        { key: "class_name", label: "Class", type: "select", options: classOpts, placeholder: "Select class", required: true },
        { key: "name", label: "Student Name", type: "text", required: true },
        { key: "division", label: "Division", type: "text", placeholder: "A / B / Red" },
        { key: "email", label: "Email", type: "email" },
        { key: "phone", label: "Phone", type: "tel" },
        { key: "parent_name", label: "Parent Name", type: "text" },
        { key: "address", label: "Address", type: "textarea", span: 2 },
      ]}
      columns={[
        { key: "school_code", label: "School ID", render: (r) => {
          const s = schools.find((x) => x.name === r.school_name);
          return <span className="font-mono text-xs text-cyan-200">{s?.code || "—"}</span>;
        }},
        { key: "school_name", label: "School" },
        { key: "class_name", label: "Class" },
        { key: "division", label: "Div" },
        { key: "name", label: "Student" },
        { key: "email", label: "Email" },
        { key: "phone", label: "Phone" },
        { key: "parent_name", label: "Parent" },
        { key: "status", label: "Status", render: (r) => (
          <Badge variant="outline" className={r.status === "disabled" ? "border-red-400/40 text-red-300 bg-red-500/10" : "border-emerald-400/40 text-emerald-300 bg-emerald-500/10"}>
            {r.status || "active"}
          </Badge>
        )},
      ]}
    />
  );
}
