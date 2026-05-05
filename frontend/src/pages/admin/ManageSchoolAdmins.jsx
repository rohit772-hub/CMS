import React, { useMemo } from "react";
import { Badge } from "../../components/ui/badge";
import ResourceManager, { useResourceList } from "../../components/admin/ResourceManager";
import { fmtDate } from "../../lib/resources";

export default function ManageSchoolAdmins() {
  const [schools] = useResourceList("schools");
  const schoolOpts = useMemo(() => schools.map((s) => ({ value: s.name, label: `${s.name}${s.code ? ` (${s.code})` : ""}` })), [schools]);

  return (
    <ResourceManager
      kind="school-admins"
      eyebrow="School Admins"
      title="School Admins"
      subtitle="Assign admins to schools. New schools appear here automatically."
      excelHint="Columns: name, email, mobile, school_name, password"
      fields={[
        { key: "avatar_url", label: "Profile Image", type: "image" },
        { key: "school_name", label: "School", type: "select", options: schoolOpts, placeholder: "Select school", required: true },
        { key: "name", label: "Admin Name", type: "text", required: true },
        { key: "email", label: "Email", type: "email", required: true },
        { key: "mobile", label: "Mobile Number", type: "tel", placeholder: "+1 555 0100" },
        { key: "password", label: "Password", type: "password", required: true, placeholder: "Login password" },
      ]}
      columns={[
        { key: "name", label: "Admin" },
        { key: "school_name", label: "School" },
        { key: "email", label: "Email" },
        { key: "mobile", label: "Mobile" },
        { key: "status", label: "Status", render: (r) => (
          <Badge variant="outline" className={r.status === "disabled" ? "border-red-400/40 text-red-300 bg-red-500/10" : "border-emerald-400/40 text-emerald-300 bg-emerald-500/10"}>
            {r.status || "active"}
          </Badge>
        )},
        { key: "created_at", label: "Date", render: (r) => fmtDate(r.created_at) },
      ]}
    />
  );
}
