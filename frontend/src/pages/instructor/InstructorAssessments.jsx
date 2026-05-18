import React from "react";
import { Badge } from "../../components/ui/badge";
import ResourceManager from "../../components/admin/ResourceManager";
import { fmtDate } from "../../lib/resources";

const BASE = "/resources";

export function InstructorQuizzes() {
  return (
    <ResourceManager basePath={BASE} kind="quizzes" readOnly viewable
      eyebrow="Assessments" title="Quizzes" subtitle="View-only by default. Edit/Disable/Delete require admin permission."
      fields={[]}
      columns={[
        { key: "quiz_id", label: "Quiz ID", render: (r) => <span className="font-mono text-xs text-cyan-200">{r.quiz_id || r.id}</span> },
        { key: "title", label: "Quiz Title" },
        { key: "class_name", label: "Class" },
        { key: "subject_name", label: "Subject" },
        { key: "total_questions", label: "Q's" },
        { key: "total_marks", label: "Total Marks" },
        { key: "created_at", label: "Date", render: (r) => fmtDate(r.created_at) },
        { key: "status", label: "Status", render: (r) => (
          <Badge variant="outline" className={r.status === "disabled" ? "border-red-400/40 text-red-300 bg-red-500/10" : "border-emerald-400/40 text-emerald-300 bg-emerald-500/10"}>{r.status || "active"}</Badge>
        )},
      ]}
    />
  );
}

export function InstructorQuizResults() {
  const classOpts = [{ value: "Class 8", label: "Class 8" }, { value: "Class 9", label: "Class 9" }, { value: "Class 10", label: "Class 10" }];
  const divOpts = [{ value: "A", label: "A" }, { value: "B", label: "B" }];
  const subjOpts = [{ value: "Math", label: "Math" }, { value: "Python", label: "Python" }, { value: "HTML", label: "HTML" }];
  return (
    <ResourceManager basePath={BASE} kind="quiz-results" readOnly viewable downloadable
      eyebrow="Performance" title="Quiz Results" subtitle="Student-wise quiz performance across classes."
      fields={[]}
      filters={[
        { key: "class_name", label: "Class", options: classOpts },
        { key: "division",   label: "Division", options: divOpts },
        { key: "subject_name", label: "Subject", options: subjOpts },
      ]}
      columns={[
        { key: "student_id", label: "Student ID", render: (r) => <span className="font-mono text-xs text-cyan-200">{r.student_id}</span> },
        { key: "student_name", label: "Student" },
        { key: "class_name", label: "Class" },
        { key: "division", label: "Div" },
        { key: "subject_name", label: "Subject" },
        { key: "quiz_name", label: "Quiz" },
        { key: "marks_obtained", label: "Marks", render: (r) => <span className="font-mono">{r.marks_obtained}/{r.total_marks}</span> },
        { key: "percentage", label: "%", render: (r) => `${r.percentage}%` },
        { key: "created_at", label: "Date", render: (r) => fmtDate(r.created_at) },
        { key: "result_status", label: "Result", render: (r) => (
          <Badge variant="outline" className={r.result_status === "Pass" ? "border-emerald-400/40 text-emerald-300 bg-emerald-500/10" : "border-red-400/40 text-red-300 bg-red-500/10"}>{r.result_status}</Badge>
        )},
      ]}
    />
  );
}

export function InstructorResults() {
  const classOpts = [{ value: "Class 8", label: "Class 8" }, { value: "Class 9", label: "Class 9" }, { value: "Class 10", label: "Class 10" }];
  const divOpts = [{ value: "A", label: "A" }, { value: "B", label: "B" }];
  const subjOpts = [{ value: "Math", label: "Math" }, { value: "Python", label: "Python" }, { value: "HTML", label: "HTML" }];
  return (
    <ResourceManager basePath={BASE} kind="results" readOnly viewable downloadable
      eyebrow="Overall" title="Results" subtitle="Overall performance of students across subjects."
      fields={[]}
      filters={[
        { key: "class_name", label: "Class", options: classOpts },
        { key: "division",   label: "Division", options: divOpts },
        { key: "subject_name", label: "Subject", options: subjOpts },
      ]}
      columns={[
        { key: "student_id", label: "Student ID", render: (r) => <span className="font-mono text-xs text-cyan-200">{r.student_id}</span> },
        { key: "student_name", label: "Student" },
        { key: "class_name", label: "Class" },
        { key: "division", label: "Div" },
        { key: "subject_name", label: "Subject" },
        { key: "marks", label: "Marks" },
        { key: "grade", label: "Grade", render: (r) => <span className="font-mono text-cyan-200">{r.grade}</span> },
        { key: "percentage", label: "%", render: (r) => `${r.percentage}%` },
        { key: "created_at", label: "Date", render: (r) => fmtDate(r.created_at) },
      ]}
    />
  );
}
