import React, { useEffect, useState } from "react";
import api from "../../lib/api";
import { motion } from "framer-motion";
import { GlassCard, PageHeader } from "../../components/dashboard/Common";
import { Button } from "../../components/ui/button";
import { Plus } from "lucide-react";

export default function AdminCourses() {
  const [courses, setCourses] = useState([]);
  useEffect(() => { (async () => { try { const { data } = await api.get("/courses"); setCourses(data.courses || []); } catch (_) {} })(); }, []);

  return (
    <div data-testid="admin-courses-page">
      <PageHeader
        eyebrow="Courses"
        title="All courses"
        subtitle="Create, edit, and orchestrate the entire course library."
        action={<Button className="bg-gradient-to-r from-[#00E5FF] to-[#0055FF] text-white" data-testid="admin-courses-new"><Plus size={16} className="mr-2"/>New course</Button>}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {courses.map((c) => (
          <motion.div key={c.id} whileHover={{ y: -4 }} className="rounded-xl overflow-hidden border border-white/5 bg-white/3" data-testid={`admin-course-${c.id}`}>
            <div className="aspect-video bg-cover bg-center" style={{ backgroundImage: `url(${c.thumbnail})` }} />
            <div className="p-4">
              <p className="text-[10px] uppercase tracking-widest text-cyan-300">{c.category}</p>
              <h4 className="font-heading text-lg font-medium mt-1">{c.title}</h4>
              <p className="text-xs text-[#64748B] mt-1">{c.lessons} lessons · ${c.price}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
