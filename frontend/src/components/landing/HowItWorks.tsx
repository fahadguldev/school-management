"use client";

import Image from "next/image";

// Layout family: numbered vertical steps with full-width image at bottom.
// Completely different from all previous sections (no grid, no split, no bento).

const STEPS = [
  {
    n: "01",
    title: "Set up your school in under a day",
    body: "Create classes, subjects, teachers, and students. Assign roles. Done.",
  },
  {
    n: "02",
    title: "Enter marks — by hand or Excel",
    body: "Teachers log in to their assigned subjects only. Upload a spreadsheet or enter row by row. Every import validates atomically before committing.",
  },
  {
    n: "03",
    title: "Review and publish results",
    body: "Admin reviews. One click publishes the entire exam. Marks lock permanently — no disputes, no reruns.",
  },
  {
    n: "04",
    title: "Principal sees everything",
    body: "School-wide analytics update immediately: strongest students, weakest subjects, class performance trends. No waiting for a report.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-28 md:py-40 px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h2
          className="text-white font-bold tracking-tight mb-16"
          style={{ fontSize: "clamp(1.6rem, 3vw, 2.4rem)", lineHeight: 1.15 }}
        >
          From setup to insights
          <br />
          in one school day.
        </h2>

        {/* Steps — horizontal on desktop, vertical on mobile */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-white/6 rounded-xl overflow-hidden mb-16">
          {STEPS.map((s) => (
            <div key={s.n} className="bg-[#080c14] p-8 flex flex-col gap-4">
              <span className="text-blue-600 font-mono text-xs font-bold">{s.n}</span>
              <h3 className="text-white font-semibold text-base leading-snug">{s.title}</h3>
              <p className="text-zinc-500 text-sm leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>

        {/* School image — full width, editorial */}
        <div className="relative rounded-xl overflow-hidden border border-white/8 aspect-video shadow-2xl shadow-black/40">
          <Image
            src="/school_wide.jpg"
            alt="Private school students in uniform"
            fill
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#080c14]/60 via-transparent to-transparent" />
          <div className="absolute bottom-8 left-8 max-w-xs">
            <p className="text-white/70 text-xs uppercase tracking-widest mb-2">Built for</p>
            <p className="text-white font-bold text-2xl leading-tight">Private schools that compete.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
