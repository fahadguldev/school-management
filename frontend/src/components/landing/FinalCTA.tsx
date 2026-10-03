"use client";

// Final CTA — centered manifesto-style layout.
// Centered hero IS allowed here per the skill: "editorial / manifesto / launch-announcement briefs where the message itself is the design"
// This is the action moment — different from all previous layouts.

export default function FinalCTA() {
  return (
    <section className="relative py-36 md:py-56 px-6 lg:px-8 border-t border-white/6 overflow-hidden">
      {/* Restrained blue radial — different from hero, stronger, closer */}
      <div
        aria-hidden
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, rgba(37,99,235,0.18) 0%, transparent 65%)",
        }}
      />

      <div className="relative z-10 max-w-2xl mx-auto text-center">
        <h2
          className="text-white font-bold tracking-tight mb-6"
          style={{ fontSize: "clamp(2rem, 4.5vw, 3.6rem)", lineHeight: 1.1 }}
        >
          Your school. Running on data.
        </h2>
        <p className="text-zinc-400 text-lg leading-relaxed mb-10 max-w-[44ch] mx-auto">
          Set up in one day. See your first insights by the first exam. Join 40+ schools already on SchoolOS.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <a
            href="#demo"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white text-sm font-semibold px-6 py-3.5 rounded-lg transition-colors duration-150 shadow-xl shadow-blue-600/25"
          >
            Book a Demo
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 7h10M8 3l4 4-4 4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
          <a
            href="#pricing"
            className="inline-flex items-center gap-2 border border-white/12 hover:border-white/24 hover:bg-white/4 active:scale-[0.98] text-zinc-300 text-sm font-medium px-6 py-3.5 rounded-lg transition-all duration-150"
          >
            View pricing
          </a>
        </div>

        {/* Trust micro-strip — belongs here, not in hero */}
        <div className="flex flex-wrap items-center justify-center gap-6 mt-10 text-zinc-600 text-xs">
          {["14-day free trial", "No credit card", "Setup in 1 day", "Data stays in Pakistan"].map(
            (t) => (
              <div key={t} className="flex items-center gap-1.5">
                <div className="w-1 h-1 rounded-full bg-zinc-700" />
                {t}
              </div>
            )
          )}
        </div>
      </div>
    </section>
  );
}
