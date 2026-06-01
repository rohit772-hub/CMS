import React, { useMemo } from "react";
import ResourceManager, { useResourceList } from "../../components/admin/ResourceManager";
import { fmtDate } from "../../lib/resources";

export default function ManageChapters() {
  const [classes] = useResourceList("classes");
  const [courses] = useResourceList("courses");
  const [subjects] = useResourceList("subjects");
  const classOpts = useMemo(() => classes.map((c) => ({ value: c.name, label: c.name })), [classes]);
  const courseOpts = useMemo(() => courses.map((c) => ({ value: c.name, label: c.name })), [courses]);
  const subjectOpts = useMemo(() => subjects.map((s) => ({ value: s.name, label: s.name })), [subjects]);

  return (
    <ResourceManager
      kind="chapters"
      eyebrow="Manage Resources"
      title="Chapters"
      subtitle="Chapters connected to class, course and subject."
      excelHint="Columns: name, class_name, course_name, subject_name"
      fields={[
        { key: "class_name", label: "Class", type: "select", options: classOpts, placeholder: "Select class", required: true },
        { key: "course_name", label: "Course", type: "select", options: courseOpts, placeholder: "Select course", required: true },
        { key: "subject_name", label: "Subject", type: "select", options: subjectOpts, placeholder: "Select subject", required: true },
        { key: "name", label: "Chapter Name", type: "text", required: true, placeholder: "e.g. Loops & Conditions" },
        { key: "resource", label: "Chapter Content / Resource (PDF, PPT, DOC, video, image, zip)", type: "file", accept: ".pdf,.ppt,.pptx,.doc,.docx,.zip,image/*,video/*", span: 2 },
      ]}
      columns={[
        { key: "class_name", label: "Class" },
        { key: "course_name", label: "Course" },
        { key: "subject_name", label: "Subject" },
        { key: "name", label: "Chapter" },
        { key: "created_at", label: "Date", render: (r) => fmtDate(r.created_at) },
      ]}
    />
  );
}
