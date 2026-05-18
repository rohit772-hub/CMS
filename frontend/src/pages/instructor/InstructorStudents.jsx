import React, { useMemo } from "react";
import { Badge } from "../../components/ui/badge";
import ResourceManager, { useResourceList } from "../../components/admin/ResourceManager";
import { fmtDate } from "../../lib/resources";

const BASE = "/resources";

export default function InstructorStudents() {
  const [classes] = useResourceList("classes", BASE);
  const classOpts = useMemo(() => classes.map((c) => ({ value: c.name, label: c.name })), [classes]);
  const divOpts = [
    { value: "A", label: "A" }, { value: "B", label: "B" }, { value: "C", label: "C" }, { value: "D", label: "D" },
  ];

  return (
    <ResourceManager
      basePath={BASE}
      kind="students"
      eyebrow="Classroom"
      title="Students"
      subtitle="Add students individually or via Excel. Records sync to Admin automatically."
      addLabel="Add Student"
      selectable
      downloadable
      excelHint="Columns: student_id, name, class_name, division, email, phone, parent_name, address"
      fields={[
        { key: "name",         label: "Student Name",  type: "text",     required: true },
        { key: "student_id",   label: "Student ID",    type: "text",     required: true, placeholder: "e.g. STU-1042 (used for login)" },
        { key: "class_name",   label: "Class",         type: "select",   options: classOpts, placeholder: "Select class", required: true },
        { key: "division",     label: "Division",      type: "text",     placeholder: "A / B / Red" },
        { key: "email",        label: "Email",         type: "email" },
        { key: "phone",        label: "Phone Number",  type: "tel" },
        { key: "parent_name",  label: "Parent's Name", type: "text" },
        { key: "address",      label: "Address",       type: "textarea", span: 2 },
      ]}
      filters={[
        { key: "class_name", label: "Class",    options: classOpts },
        { key: "division",   label: "Division", options: divOpts },
      ]}
      columns={[
        { key: "student_id", label: "Student ID", render: (r) => <span className="font-mono text-xs text-cyan-200">{r.student_id || "—"}</span> },
        { key: "name", label: "Student Name" },
        { key: "class_name", label: "Class" },
        { key: "division", label: "Div" },
        { key: "email", label: "Email" },
        { key: "phone", label: "Phone" },
        { key: "parent_name", label: "Parent" },
        { key: "created_at", label: "Date", render: (r) => fmtDate(r.created_at) },
        { key: "status", label: "Status", render: (r) => (
          <Badge variant="outline" className={r.status === "disabled" ? "border-red-400/40 text-red-300 bg-red-500/10" : "border-emerald-400/40 text-emerald-300 bg-emerald-500/10"}>{r.status || "active"}</Badge>
        )},
      ]}
    />
  );
}
