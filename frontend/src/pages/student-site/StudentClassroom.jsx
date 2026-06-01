import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, BookOpen, FileText, Download, Image as ImgIcon, Video, FileType, Sparkles } from "lucide-react";
import api from "../../lib/api";

const VIVID = [
  "linear-gradient(135deg, #fbd86b, #f59849)",
  "linear-gradient(135deg, #1c8e8a, #0d3b3f)",
  "linear-gradient(135deg, #8b6dd9, #5b3a9c)",
  "linear-gradient(135deg, #4d80f4, #2a4ea8)",
  "linear-gradient(135deg, #d23028, #a31f1a)",
  "linear-gradient(135deg, #2bb673, #0f8a52)",
];

function CourseList() {
  const [courses, setCourses] = useState([]);
  useEffect(() => { api.get("/student/site/courses").then(({ data }) => setCourses(data.courses || [])).catch(() => {}); }, []);
  return (
    <div data-testid="classroom-list">
      <h1 className="font-heading text-3xl md:text-4xl font-bold mb-2">Classroom</h1>
      <p className="text-[var(--cms-muted)] mb-6">Pick a course to view its subjects and chapters.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {courses.map((c, i) => (
          <Link key={c.id} to={`/student/classroom/${c.id}`} data-testid={`course-card-${c.id}`}
            className="cms-card overflow-hidden hover:-translate-y-1 transition shadow-sm hover:shadow-lg">
            <div className="aspect-[5/3] bg-cover bg-center" style={{ backgroundImage: c.image ? `url(${typeof c.image === "string" ? c.image : c.image.url})` : VIVID[i % VIVID.length] }} />
            <div className="p-5">
              <p className="text-xs uppercase tracking-widest text-[var(--cms-muted)]">{Array.isArray(c.class_names) ? c.class_names.join(", ") : c.class_name || "Course"}</p>
              <h3 className="font-heading text-xl font-semibold mt-1 text-[var(--cms-teal-deep)]">{c.name}</h3>
              <p className="text-sm text-[var(--cms-muted)] mt-1">{c.description || "Tap to start exploring this course."}</p>
              <button className="cms-btn-secondary text-sm mt-4">View Course</button>
            </div>
          </Link>
        ))}
        {!courses.length && <p className="text-sm text-[var(--cms-muted)] col-span-full">No courses assigned yet.</p>}
      </div>
    </div>
  );
}

function SubjectList() {
  const { courseId } = useParams();
  const [course, setCourse] = useState(null);
  const [subjects, setSubjects] = useState([]);
  useEffect(() => {
    api.get(`/student/site/courses/${courseId}/subjects`).then(({ data }) => { setCourse(data.course || null); setSubjects(data.subjects || []); }).catch(() => {});
  }, [courseId]);
  return (
    <div data-testid="classroom-subjects">
      <Link to="/student/classroom" className="inline-flex items-center gap-1 text-[var(--cms-teal)] text-sm font-semibold mb-3"><ArrowLeft size={14} /> Back to classroom</Link>
      <h1 className="font-heading text-3xl md:text-4xl font-bold">{course?.name || "Course"}</h1>
      <p className="text-[var(--cms-muted)] mb-6">{course?.description || "Select a subject to explore chapters."}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {subjects.map((s, i) => (
          <Link key={s.id} to={`/student/classroom/${courseId}/subjects/${s.id}`} data-testid={`subject-card-${s.id}`}
            className="cms-card overflow-hidden hover:-translate-y-1 transition">
            <div className="aspect-[5/3] flex items-center justify-center" style={{ background: s.image ? undefined : VIVID[(i + 1) % VIVID.length], backgroundImage: s.image ? `url(${typeof s.image === "string" ? s.image : s.image.url})` : undefined, backgroundSize: "cover", backgroundPosition: "center" }}>
              {!s.image && <Sparkles size={42} className="text-white/70" />}
            </div>
            <div className="p-5">
              <p className="text-xs uppercase tracking-widest text-[var(--cms-muted)]">Subject</p>
              <h3 className="font-heading text-xl font-semibold mt-1 text-[var(--cms-teal-deep)]">{s.name}</h3>
              <button className="cms-btn-primary text-sm mt-4">View Chapters</button>
            </div>
          </Link>
        ))}
        {!subjects.length && <p className="text-sm text-[var(--cms-muted)] col-span-full">No subjects yet for this course.</p>}
      </div>
    </div>
  );
}

function fileMeta(resource) {
  if (!resource) return null;
  if (typeof resource === "string") {
    const isData = resource.startsWith("data:");
    const mime = isData ? resource.slice(5).split(";")[0] : "";
    return { url: resource, name: "resource", type: mime };
  }
  return resource;
}

function ResourceViewer({ resource, fallbackTitle }) {
  const meta = fileMeta(resource);
  if (!meta?.url) {
    return <div className="cms-card p-10 text-center text-[var(--cms-muted)]">No resource attached for <span className="text-[var(--cms-teal-deep)] font-semibold">{fallbackTitle}</span> yet.</div>;
  }
  const t = meta.type || "";
  const url = meta.url;
  const name = meta.name || "resource";

  if (t.startsWith("image") || /\.(png|jpe?g|gif|webp|svg)$/i.test(name)) {
    return <img src={url} alt={fallbackTitle} className="rounded-2xl max-h-[70vh] mx-auto" />;
  }
  if (t.startsWith("video") || /\.(mp4|webm|mov)$/i.test(name)) {
    return <video controls src={url} className="w-full rounded-2xl max-h-[70vh] bg-black" />;
  }
  if (t === "application/pdf" || /\.pdf$/i.test(name) || url.startsWith("data:application/pdf")) {
    return <iframe title={fallbackTitle} src={url} className="w-full h-[75vh] rounded-2xl bg-white" />;
  }
  // Fallback: downloadable card
  return (
    <div className="cms-card p-8 text-center">
      <FileType size={42} className="mx-auto text-[var(--cms-teal)]" />
      <p className="mt-3 font-semibold text-[var(--cms-teal-deep)]">{name}</p>
      <p className="text-xs text-[var(--cms-muted)] mt-1">This file format opens better outside the browser.</p>
      <a href={url} download={name} className="cms-btn-primary mt-5 inline-flex items-center gap-2">
        <Download size={14} /> Download
      </a>
    </div>
  );
}

function ChapterViewer() {
  const { courseId, subjectId } = useParams();
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState({ subject: null, chapters: [] });
  useEffect(() => {
    api.get(`/student/site/subjects/${subjectId}/chapters`).then(({ data }) => setData({ subject: data.subject, chapters: data.chapters || [] })).catch(() => {});
  }, [subjectId]);

  const activeId = params.get("chapter");
  const active = useMemo(() => data.chapters.find((c) => c.id === activeId) || data.chapters[0], [data, activeId]);

  return (
    <div data-testid="classroom-chapters">
      <Link to={`/student/classroom/${courseId}`} className="inline-flex items-center gap-1 text-[var(--cms-teal)] text-sm font-semibold mb-3"><ArrowLeft size={14} /> Back to subjects</Link>
      <h1 className="font-heading text-3xl font-bold">{data.subject?.name || "Subject"}</h1>
      <p className="text-[var(--cms-muted)] mb-6">Tap a chapter on the left to open its resource.</p>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">
        <aside className="cms-card p-3 h-fit">
          <p className="text-xs uppercase tracking-widest text-[var(--cms-muted)] px-2 py-2">Chapters</p>
          {data.chapters.length === 0 && <p className="px-2 py-2 text-sm text-[var(--cms-muted)]">No chapters yet.</p>}
          <ul className="space-y-1">
            {data.chapters.map((c) => {
              const isActive = active?.id === c.id;
              return (
                <li key={c.id}>
                  <button onClick={() => setParams({ chapter: c.id })} data-testid={`chapter-link-${c.id}`}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-sm flex items-center gap-2 transition ${isActive ? "bg-[var(--cms-teal)] text-white" : "text-[var(--cms-teal-deep)] hover:bg-[var(--cms-teal-soft)]"}`}>
                    <BookOpen size={14} className="shrink-0" />
                    <span className="truncate">{c.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        <section className="cms-card p-5">
          {active ? (
            <>
              <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                <div>
                  <p className="text-xs uppercase tracking-widest text-[var(--cms-muted)]">Chapter</p>
                  <h2 className="font-heading text-2xl font-bold text-[var(--cms-teal-deep)]">{active.name}</h2>
                </div>
                {active.resource && (
                  <a href={(fileMeta(active.resource) || {}).url} download={(fileMeta(active.resource) || {}).name || "resource"} className="cms-btn-ghost text-xs inline-flex items-center gap-2" data-testid="chapter-download">
                    <Download size={12} /> Download
                  </a>
                )}
              </div>
              <ResourceViewer resource={active.resource} fallbackTitle={active.name} />
            </>
          ) : (
            <div className="text-center text-[var(--cms-muted)] py-10">Select a chapter to begin.</div>
          )}
        </section>
      </div>
    </div>
  );
}

export default function StudentClassroom() { return <CourseList />; }
export { SubjectList, ChapterViewer };
