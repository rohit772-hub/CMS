import React from "react";
import ResourceManager from "../../components/admin/ResourceManager";
import { fmtDate } from "../../lib/resources";

export default function ManageClasses() {
  return (
    <ResourceManager
      kind="classes"
      eyebrow="Manage Resources"
      title="Classes"
      subtitle="Create classes like Class 6, Class 7, Grade 10, etc. and manage them."
      excelHint="Expected column: name. Example: name — Class 10"
      fields={[
        { key: "name", label: "Class Name", type: "text", required: true, placeholder: "e.g. Class 10", span: 2 },
      ]}
      columns={[
        { key: "name", label: "Class" },
        { key: "created_at", label: "Date", render: (r) => fmtDate(r.created_at) },
      ]}
    />
  );
}
