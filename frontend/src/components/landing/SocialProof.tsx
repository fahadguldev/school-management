"use client";

import Image from "next/image";

// Social proof — split layout with real image. NOT a zigzag, NOT the same as Features.
// Layout: full-width section, left side quote / stat, right side real principal portrait.

const QUOTE = {
  text: "Before SchoolOS I was asking teachers to print reports. Now I see the entire school in real time from my phone. The first term alone, I caught three underperforming classes I would have missed.",
  author: "Mr. Tariq Hussain",
  role: "Principal, Beacon Public School, Lahore",
};

export default function SocialProof() {
  return (
    <section className="border-t border-white/6 py-28 md:py-40 px-6 lg:px-8 bg-[#0a0f1c]">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">

        {/* Left — stat strip + quote */}
        <div>
          {/* 3 key stats in a row */}
          <div className="grid grid-cols-3 gap-6 mb-14 pb-14 border-b border-white/8">
            {[
              { val: "40+", label: "Schools" },
              { val: "5,000+", label: "Students" },
              { val: "1 day", label: "Setup time" },
            ].map((s) => (
              <div key={s.label}>
                <p
                  className="text-white font-bold mb-1"
                  style={{ fontSize: "clamp(1.8rem, 3vw, 2.8rem)", lineHeight: 1 }}
                >
                  {s.val}
                </p>
                <p className="text-zinc-500 text-sm">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Quote — max 3 lines */}
          <blockquote>
            <p className="text-zinc-200 text-lg leading-relaxed mb-6">
              &ldquo;{QUOTE.text}&rdquo;
            </p>
            <footer className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-blue-600/20 border border-blue-600/30 flex items-center justify-center flex-shrink-0">
                <span className="text-blue-400 text-xs font-semibold">TH</span>
              </div>
              <div>
                <p className="text-white text-sm font-medium">{QUOTE.author}</p>
                <p className="text-zinc-500 text-xs">{QUOTE.role}</p>
              </div>
            </footer>
          </blockquote>
        </div>

        {/* Right — real portrait image */}
        <div className="relative">
          <div className="relative aspect-[3/4] rounded-xl overflow-hidden border border-white/8 shadow-2xl shadow-black/50">
            <Image
              src="/principal_portrait.jpg"
              alt="School principal reviewing academic data"
              fill
              className="object-cover object-top"
            />
            {/* Overlay gradient for text legibility */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1c]/70 via-transparent to-transparent" />
          </div>
          {/* Floating tag */}
          <div className="absolute bottom-6 left-6 right-6 bg-[#0d1220]/90 backdrop-blur-sm border border-white/10 rounded-lg px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
              <p className="text-zinc-300 text-sm">
                <span className="text-white font-semibold">34 students</span> flagged for intervention this term
              </p>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
