import React, { useMemo } from "react";
import ResourceManager, { useResourceList } from "../../components/admin/ResourceManager";
import { fmtDate } from "../../lib/resources";

export default function ManageCourses() {
  const [classes] = useResourceList("classes");
  const classOptions = useMemo(() => classes.map((c) => ({ value: c.name, label: c.name })), [classes]);

  return (
    <ResourceManager
      kind="courses"
      eyebrow="Manage Resources"
      title="Courses"
      subtitle="Courses like Arduino, CMS IIT Program, Robotics — linked to one or more classes."
      excelHint="Expected columns: name, class_names (comma separated). Example: name — Arduino, class_names — Class 6,Class 7"
      fields={[
        { key: "image", label: "Course Image", type: "image" },
        { key: "class_names", label: "Classes", type: "multi-select", options: classOptions, placeholder: "Select one or more classes", required: true, span: 1 },
        { key: "name", label: "Course Name", type: "text", required: true, placeholder: "e.g. Arduino", span: 2 },
      ]}
      columns={[
        { key: "class_names", label: "Class", render: (r) => (Array.isArray(r.class_names) ? r.class_names.join(", ") : (r.class_names || "—")) },
        { key: "name", label: "Course", render: (r) => (
          <div className="flex items-center gap-2">
            {r.image && <img src={r.image} alt="" className="w-8 h-8 rounded-md object-cover" />}
            <span>{r.name}</span>
          </div>
        )},
        { key: "created_at", label: "Date", render: (r) => fmtDate(r.created_at) },
      ]}
    />
  );
}
