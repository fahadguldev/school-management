"use client";

// Logo wall — SVG monograms for invented school/institution names
// Real-source: Simple Icons CDN for real brands not applicable here
// Approach: clean SVG monogram marks per skill Section 4.8

const SCHOOLS = [
  { name: "Beacon Academy", mono: "B", color: "#60a5fa" },
  { name: "Al-Noor Grammar", mono: "A", color: "#34d399" },
  { name: "Punjab Model School", mono: "P", color: "#a78bfa" },
  { name: "Bright Minds Academy", mono: "BM", color: "#fbbf24" },
  { name: "City Grammar School", mono: "CG", color: "#f87171" },
  { name: "Horizon Public School", mono: "H", color: "#38bdf8" },
];

export default function LogoWall() {
  return (
    <section className="border-t border-b border-white/6 py-10 px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <p className="text-zinc-600 text-xs uppercase tracking-widest text-center mb-8">
          Trusted by private schools across Pakistan
        </p>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-6 items-center">
          {SCHOOLS.map((s) => (
            <div key={s.name} className="flex flex-col items-center gap-2 group">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center border border-white/8 bg-white/4 group-hover:bg-white/8 transition-colors duration-200"
                style={{ borderColor: `${s.color}20` }}
              >
                <span
                  className="font-bold text-sm"
                  style={{ color: s.color, fontFamily: "'Geist', sans-serif" }}
                >
                  {s.mono}
                </span>
              </div>
              <span className="text-zinc-600 text-[10px] text-center leading-tight hidden md:block">
                {s.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
