import React, { useEffect, useState } from "react";
import { ExternalLink, Sparkles } from "lucide-react";
import api from "../../lib/api";

const FALLBACK = [
  { id: "fb1", title: "Wokwi",        url: "https://wokwi.com/",                description: "Online electronics & Arduino simulation", category: "Activity" },
  { id: "fb2", title: "Scratch",      url: "https://scratch.mit.edu/",          description: "Block-based coding for beginners",        category: "Game" },
  { id: "fb3", title: "AtumX Wingz",  url: "https://atumx-wingz.netlify.app/",  description: "Interactive learning & coding activities",category: "Activity" },
  { id: "fb4", title: "Tinkercad",    url: "https://www.tinkercad.com/",        description: "3D design, circuits & simulation",        category: "Activity" },
  { id: "fb5", title: "CodePen",      url: "https://codepen.io/",               description: "HTML, CSS & JavaScript practice",         category: "Challenge" },
];

const CAT_COLOR = {
  Game:      "linear-gradient(135deg, #fbd86b, #f59849)",
  Robot:     "linear-gradient(135deg, #1c8e8a, #0d3b3f)",
  Activity:  "linear-gradient(135deg, #4d80f4, #2a4ea8)",
  Challenge: "linear-gradient(135deg, #d23028, #a31f1a)",
  Video:     "linear-gradient(135deg, #8b6dd9, #5b3a9c)",
};

export default function StudentFunHub() {
  const [links, setLinks] = useState([]);
  useEffect(() => {
    api.get("/student/site/fun-hub").then(({ data }) => {
      setLinks((data.links && data.links.length) ? data.links : FALLBACK);
    }).catch(() => setLinks(FALLBACK));
  }, []);

  return (
    <div data-testid="student-fun-hub">
      <h1 className="font-heading text-3xl md:text-4xl font-bold">Fun Learning Hub</h1>
      <p className="text-[var(--cms-muted)] mb-6">Curated experiences your teachers picked just for you. Open them in a new tab and explore!</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {links.map((p) => {
          const url = typeof p.image === "string" ? p.image : p.image?.url;
          const cardBg = CAT_COLOR[p.category] || CAT_COLOR.Activity;
          return (
            <a key={p.id} href={p.url} target="_blank" rel="noreferrer" className="cms-card overflow-hidden hover:-translate-y-1 transition group shadow-sm hover:shadow-lg" data-testid={`fun-hub-${p.id}`}>
              <div className="aspect-[5/3] bg-cover bg-center relative" style={{ background: url ? undefined : cardBg, backgroundImage: url ? `url(${url})` : undefined }}>
                {!url && <div className="absolute inset-0 grid place-items-center text-white/80"><Sparkles size={42} /></div>}
                {p.category && <span className="absolute top-3 left-3 text-[10px] uppercase tracking-widest bg-white/85 text-[var(--cms-teal-deep)] px-2 py-1 rounded-full font-semibold">{p.category}</span>}
              </div>
              <div className="p-5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-heading text-xl font-semibold text-[var(--cms-teal-deep)]">{p.title}</h3>
                  <ExternalLink size={16} className="text-[var(--cms-teal)] group-hover:text-[var(--cms-red)] transition" />
                </div>
                <p className="text-sm text-[var(--cms-muted)] mt-1 line-clamp-2">{p.description}</p>
                <button className="cms-btn-primary mt-4 text-sm w-full">Visit</button>
              </div>
            </a>
          );
        })}
        {!links.length && <p className="text-sm text-[var(--cms-muted)] col-span-full">No fun hub links yet — check back soon!</p>}
      </div>
    </div>
  );
}
