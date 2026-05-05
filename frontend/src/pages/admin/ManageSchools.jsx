import React, { useMemo, useState } from "react";
import { Eye } from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../components/ui/dialog";
import ResourceManager, { useResourceList } from "../../components/admin/ResourceManager";
import { fmtDate } from "../../lib/resources";

export default function ManageSchools() {
  const [classes] = useResourceList("classes");
  const [courses] = useResourceList("courses");
  const classOpts = useMemo(() => classes.map((c) => ({ value: c.name, label: c.name })), [classes]);
  const courseOpts = useMemo(() => courses.map((c) => ({ value: c.name, label: c.name })), [courses]);
  const [viewing, setViewing] = useState(null);

  return (
    <>
      <ResourceManager
        kind="schools"
        eyebrow="School Management"
        title="Schools"
        subtitle="Onboard schools, assign classes and courses, and manage their status."
        excelHint="Columns: name, code, email, phone, principal_name, address, class_names, course_names"
        fields={[
          { key: "logo", label: "School Logo", type: "image" },
          { key: "name", label: "School Name", type: "text", required: true, placeholder: "e.g. Ridgeview Academy" },
          { key: "code", label: "School Code", type: "text", required: true, placeholder: "Unique e.g. RVA-001" },
          { key: "email", label: "School Email", type: "email", required: true, placeholder: "admin@school.edu" },
          { key: "phone", label: "Phone Number", type: "tel", placeholder: "+1 555 0100" },
          { key: "principal_name", label: "Principal Name", type: "text", placeholder: "Dr. Jane Doe" },
          { key: "class_names", label: "Classes", type: "multi-select", options: classOpts, placeholder: "Select classes" },
          { key: "course_names", label: "Courses", type: "multi-select", options: courseOpts, placeholder: "Select courses" },
          { key: "address", label: "Address", type: "textarea", placeholder: "Street, city, country", span: 2 },
        ]}
        columns={[
          { key: "name", label: "School", render: (r) => (
            <div className="flex items-center gap-2">
              {r.logo ? <img src={r.logo} alt="" className="w-7 h-7 rounded-md object-cover" /> : <div className="w-7 h-7 rounded-md bg-cyan-400/10 border border-cyan-400/20" />}
              <span className="text-white">{r.name}</span>
            </div>
          )},
          { key: "code", label: "Code", render: (r) => <span className="font-mono text-xs text-cyan-200">{r.code || "—"}</span> },
          { key: "email", label: "Email" },
          { key: "phone", label: "Phone" },
          { key: "principal_name", label: "Principal" },
          { key: "class_names", label: "Classes", render: (r) => (Array.isArray(r.class_names) ? r.class_names.length : 0) },
          { key: "course_names", label: "Courses", render: (r) => (Array.isArray(r.course_names) ? r.course_names.length : 0) },
          { key: "status", label: "Status", render: (r) => (
            <Badge variant="outline" className={r.status === "disabled" ? "border-red-400/40 text-red-300 bg-red-500/10" : "border-emerald-400/40 text-emerald-300 bg-emerald-500/10"}>
              {r.status || "active"}
            </Badge>
          )},
          { key: "created_at", label: "Date", render: (r) => fmtDate(r.created_at) },
          { key: "_view", label: "Classes", render: (r) => (
            <Button size="sm" variant="outline" onClick={() => setViewing(r)} className="h-8 bg-white/5 border-white/10 text-cyan-200 hover:bg-cyan-400/10" data-testid={`schools-view-${r.id}`}>
              <Eye size={12} className="mr-1" />View
            </Button>
          )},
        ]}
      />

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="bg-[#0B1120] border border-white/10 text-white max-w-lg" data-testid="schools-view-dialog">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">{viewing?.name}</DialogTitle>
            <DialogDescription className="text-[#A0ABC0]">Classes and courses assigned to this school.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-cyan-300 mb-2">Classes ({(viewing?.class_names || []).length})</p>
              <div className="flex flex-wrap gap-2">
                {(viewing?.class_names || []).length === 0 && <span className="text-xs text-[#64748B]">No classes assigned.</span>}
                {(viewing?.class_names || []).map((c) => (
                  <span key={c} className="px-2.5 py-1 rounded-full text-xs bg-cyan-400/10 border border-cyan-400/30 text-cyan-200">{c}</span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-amber-300 mb-2">Courses ({(viewing?.course_names || []).length})</p>
              <div className="flex flex-wrap gap-2">
                {(viewing?.course_names || []).length === 0 && <span className="text-xs text-[#64748B]">No courses assigned.</span>}
                {(viewing?.course_names || []).map((c) => (
                  <span key={c} className="px-2.5 py-1 rounded-full text-xs bg-amber-400/10 border border-amber-400/30 text-amber-200">{c}</span>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
