import React, { useEffect, useState } from "react";
import api from "../../lib/api";
import { motion } from "framer-motion";
import { Play, Lock } from "lucide-react";
import { GlassCard, PageHeader } from "../../components/dashboard/Common";

export default function StudentCourses() {
  const [courses, setCourses] = useState([]);
  useEffect(() => { (async () => { try { const { data } = await api.get("/student/courses"); setCourses(data.courses || []); } catch (_) {} })(); }, []);

  return (
    <div data-testid="student-courses-page">
      <PageHeader eyebrow="Library" title="My courses" subtitle="Pick up where you left off." />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {courses.map((c, i) => {
          const locked = c.progress === 0 && i > 3;
          return (
            <motion.div key={c.id} whileHover={{ y: -4 }} className="rounded-xl overflow-hidden border border-white/5 bg-white/3" data-testid={`student-course-card-${c.id}`}>
              <div className="relative aspect-video bg-cover bg-center" style={{ backgroundImage: `url(${c.thumbnail})` }}>
                <div className="absolute inset-0 bg-gradient-to-t from-[#060814] via-transparent to-transparent" />
                <button className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-white/95 text-[#0B1120] flex items-center justify-center hover:scale-110 transition shadow-lg" aria-label={locked ? "Locked" : "Play"}>
                  {locked ? <Lock size={16} /> : <Play size={16} fill="#0B1120" />}
                </button>
              </div>
              <div className="p-4">
                <p className="text-[10px] uppercase tracking-widest text-cyan-300">{c.category}</p>
                <h4 className="font-heading text-base font-medium mt-1">{c.title}</h4>
                <p className="text-xs text-[#64748B] mt-1">{c.lessons} lessons · {c.instructor}</p>
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#00E5FF] to-[#0055FF]" style={{ width: `${c.progress}%` }} />
                  </div>
                  <span className="text-xs text-[#A0ABC0] font-mono">{c.progress}%</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
