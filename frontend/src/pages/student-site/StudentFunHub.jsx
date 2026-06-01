import React from "react";
import { ExternalLink } from "lucide-react";

const PLATFORMS = [
  { name: "Wokwi",        url: "https://wokwi.com/",                purpose: "Online electronics & Arduino simulation", emoji: "🤖", bg: "linear-gradient(135deg, #1c8e8a, #0d3b3f)" },
  { name: "Scratch",      url: "https://scratch.mit.edu/",          purpose: "Block-based coding for beginners",        emoji: "🐱", bg: "linear-gradient(135deg, #fbd86b, #f59849)" },
  { name: "AtumX Wingz",  url: "https://atumx-wingz.netlify.app/",  purpose: "Interactive learning & coding activities",emoji: "🪽", bg: "linear-gradient(135deg, #8b6dd9, #5b3a9c)" },
  { name: "Tinkercad",    url: "https://www.tinkercad.com/",        purpose: "3D design, circuits & simulation",        emoji: "🛠️", bg: "linear-gradient(135deg, #4d80f4, #2a4ea8)" },
  { name: "CodePen",      url: "https://codepen.io/",               purpose: "HTML, CSS & JavaScript practice",         emoji: "✨", bg: "linear-gradient(135deg, #d23028, #a31f1a)" },
];

export default function StudentFunHub() {
  return (
    <div data-testid="student-fun-hub">
      <h1 className="font-heading text-3xl md:text-4xl font-bold">Fun Learning Hub</h1>
      <p className="text-[var(--cms-muted)] mb-6">Curated platforms to make learning playful. Open them in a new tab and explore!</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {PLATFORMS.map((p) => (
          <a key={p.name} href={p.url} target="_blank" rel="noreferrer" className="cms-card overflow-hidden hover:-translate-y-1 transition group" data-testid={`fun-hub-${p.name.toLowerCase().replace(/\W+/g, "-")}`}>
            <div className="aspect-[5/3] flex items-center justify-center text-6xl" style={{ background: p.bg }}>
              <span>{p.emoji}</span>
            </div>
            <div className="p-5">
              <div className="flex items-center justify-between">
                <h3 className="font-heading text-xl font-semibold text-[var(--cms-teal-deep)]">{p.name}</h3>
                <ExternalLink size={16} className="text-[var(--cms-teal)] group-hover:text-[var(--cms-red)] transition" />
              </div>
              <p className="text-sm text-[var(--cms-muted)] mt-1">{p.purpose}</p>
              <button className="cms-btn-primary mt-4 text-sm w-full">Visit</button>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
