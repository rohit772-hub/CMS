import React, { useEffect, useState } from "react";
import api from "../../lib/api";
import { motion } from "framer-motion";
import { Eye, Edit3 } from "lucide-react";
import { GlassCard, PageHeader } from "../../components/dashboard/Common";
import { Button } from "../../components/ui/button";

export default function InstructorCourses() {
  const [courses, setCourses] = useState([]);
  useEffect(() => { (async () => { try { const { data } = await api.get("/instructor/courses"); setCourses(data.courses || []); } catch (_) {} })(); }, []);
  return (
    <div data-testid="instructor-courses-page">
      <PageHeader eyebrow="My Studio" title="Courses you teach" subtitle="Edit, schedule, and analyze each course." action={<Button className="bg-gradient-to-r from-[#00E5FF] to-[#0055FF] text-white">+ New course</Button>} />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {courses.map((c) => (
          <motion.div key={c.id} whileHover={{ y: -4 }} className="rounded-xl overflow-hidden border border-white/5 bg-white/3" data-testid={`instructor-course-card-${c.id}`}>
            <div className="aspect-video bg-cover bg-center" style={{ backgroundImage: `url(${c.thumbnail})` }} />
            <div className="p-4">
              <p className="text-[10px] uppercase tracking-widest text-cyan-300">{c.category}</p>
              <h4 className="font-heading text-lg font-medium mt-1">{c.title}</h4>
              <p className="text-xs text-[#64748B] mt-1">{c.lessons} lessons</p>
              <div className="flex gap-2 mt-3">
                <Button size="sm" variant="outline" className="bg-white/5 border-white/10 text-white"><Eye size={14} className="mr-1.5"/>View</Button>
                <Button size="sm" className="bg-gradient-to-r from-[#00E5FF] to-[#0055FF] text-white"><Edit3 size={14} className="mr-1.5"/>Edit</Button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
