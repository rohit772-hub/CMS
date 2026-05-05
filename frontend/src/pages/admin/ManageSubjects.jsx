import React, { useMemo } from "react";
import ResourceManager, { useResourceList } from "../../components/admin/ResourceManager";
import { fmtDate } from "../../lib/resources";

export default function ManageSubjects() {
  const [classes] = useResourceList("classes");
  const [courses] = useResourceList("courses");
  const classOptions = useMemo(() => classes.map((c) => ({ value: c.name, label: c.name })), [classes]);
  const courseOptions = useMemo(() => courses.map((c) => ({ value: c.name, label: c.name })), [courses]);

  return (
    <ResourceManager
      kind="subjects"
      eyebrow="Manage Resources"
      title="Subjects"
      subtitle="Subjects like HTML, Python — linked to classes and courses."
      excelHint="Columns: name, class_names, course_names (comma separated)"
      fields={[
        { key: "image", label: "Subject Image", type: "image" },
        { key: "class_names", label: "Classes", type: "multi-select", options: classOptions, placeholder: "Select classes", required: true },
        { key: "course_names", label: "Courses", type: "multi-select", options: courseOptions, placeholder: "Select courses", required: true },
        { key: "name", label: "Subject Name", type: "text", required: true, placeholder: "e.g. Python", span: 2 },
      ]}
      columns={[
        { key: "class_names", label: "Class", render: (r) => (Array.isArray(r.class_names) ? r.class_names.join(", ") : (r.class_names || "—")) },
        { key: "course_names", label: "Course", render: (r) => (Array.isArray(r.course_names) ? r.course_names.join(", ") : (r.course_names || "—")) },
        { key: "name", label: "Subject" },
        { key: "created_at", label: "Date", render: (r) => fmtDate(r.created_at) },
      ]}
    />
  );
}
