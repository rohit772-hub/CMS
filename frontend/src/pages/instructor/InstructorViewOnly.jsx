import React from "react";
import { Badge } from "../../components/ui/badge";
import ResourceManager from "../../components/admin/ResourceManager";
import { fmtDate } from "../../lib/resources";

const BASE = "/resources";
const statusBadge = (r) => (
  <Badge variant="outline" className={r.status === "disabled" ? "border-red-400/40 text-red-300 bg-red-500/10" : "border-emerald-400/40 text-emerald-300 bg-emerald-500/10"}>{r.status || "active"}</Badge>
);

export function InstructorClasses() {
  return (
    <ResourceManager basePath={BASE} kind="classes" readOnly
      eyebrow="Manage Resources" title="Classes" subtitle="View-only — classes added by the Admin."
      fields={[]}
      columns={[
        { key: "name", label: "Class Name" },
        { key: "division", label: "Division", render: (r) => r.division || "—" },
        { key: "assigned_instructor", label: "Assigned Instructor", render: (r) => r.assigned_instructor || "—" },
        { key: "created_at", label: "Date Added", render: (r) => fmtDate(r.created_at) },
        { key: "status", label: "Status", render: statusBadge },
      ]}
    />
  );
}

export function InstructorCoursesView() {
  return (
    <ResourceManager basePath={BASE} kind="courses" readOnly
      eyebrow="Manage Resources" title="Courses" subtitle="View-only — courses added by the Admin."
      fields={[]}
      columns={[
        { key: "name", label: "Course Name" },
        { key: "class_names", label: "Class", render: (r) => Array.isArray(r.class_names) ? r.class_names.join(", ") : (r.class_name || "—") },
        { key: "subject_name", label: "Subject", render: (r) => r.subject_name || "—" },
        { key: "created_at", label: "Date Added", render: (r) => fmtDate(r.created_at) },
        { key: "status", label: "Status", render: statusBadge },
      ]}
    />
  );
}

export function InstructorSubjects() {
  return (
    <ResourceManager basePath={BASE} kind="subjects" readOnly
      eyebrow="Manage Resources" title="Subjects" subtitle="View-only — subjects added by the Admin."
      fields={[]}
      columns={[
        { key: "name", label: "Subject Name" },
        { key: "class_names", label: "Class", render: (r) => Array.isArray(r.class_names) ? r.class_names.join(", ") : (r.class_name || "—") },
        { key: "course_names", label: "Course", render: (r) => Array.isArray(r.course_names) ? r.course_names.join(", ") : (r.course_name || "—") },
        { key: "created_at", label: "Date Added", render: (r) => fmtDate(r.created_at) },
        { key: "status", label: "Status", render: statusBadge },
      ]}
    />
  );
}

export function InstructorChapters() {
  return (
    <ResourceManager basePath={BASE} kind="chapters" readOnly
      eyebrow="Manage Resources" title="Chapters / Lessons" subtitle="View-only — chapters added by the Admin."
      fields={[]}
      columns={[
        { key: "name", label: "Chapter Name" },
        { key: "course_name", label: "Course" },
        { key: "subject_name", label: "Subject" },
        { key: "class_name", label: "Class" },
        { key: "created_at", label: "Date Added", render: (r) => fmtDate(r.created_at) },
        { key: "status", label: "Status", render: statusBadge },
      ]}
    />
  );
}
