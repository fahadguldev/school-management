"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";

export default function Hero() {
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // CSS animation on mount — no window.scroll, no useState
    const el = imgRef.current;
    if (!el) return;
    el.animate(
      [
        { opacity: 0, transform: "translateY(32px) scale(0.97)" },
        { opacity: 1, transform: "translateY(0) scale(1)" },
      ],
      { duration: 900, delay: 300, easing: "cubic-bezier(0.16,1,0.3,1)", fill: "forwards" }
    );
  }, []);

  return (
    <section className="relative min-h-[100dvh] flex flex-col justify-center pt-16 px-6 lg:px-8">
      {/* Subtle grid background */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />
      {/* Blue radial glow — one, restrained */}
      <div
        aria-hidden
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, rgba(37,99,235,0.12) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto w-full">
        {/* — HERO TEXT (max 4 elements: headline + subtext + 2 CTAs) — */}
        <div className="max-w-3xl mb-12">
          <h1
            className="font-bold tracking-tight text-white mb-5"
            style={{ fontSize: "clamp(2.4rem, 5vw, 4rem)", lineHeight: 1.08 }}
          >
            The operating system
            <br />
            for serious schools.
          </h1>
          <p className="text-zinc-400 text-lg leading-relaxed max-w-[52ch] mb-8">
            Real-time academic analytics, result publishing, and fee management
            — built for principals who run on data, not guesswork.
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href="#pricing"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white text-sm font-semibold px-5 py-3 rounded-lg transition-colors duration-150 shadow-lg shadow-blue-600/20"
            >
              Book a Demo
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 7h10M8 3l4 4-4 4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 border border-white/12 hover:border-white/24 hover:bg-white/4 active:scale-[0.98] text-zinc-300 text-sm font-medium px-5 py-3 rounded-lg transition-all duration-150"
            >
              See how it works
            </a>
          </div>
        </div>

        {/* Dashboard screenshot — real image */}
        <div ref={imgRef} className="relative opacity-0">
          <div className="relative rounded-xl overflow-hidden border border-white/10 shadow-2xl shadow-black/60">
            {/* Browser chrome */}
            <div className="bg-[#12182a] border-b border-white/8 px-4 py-3 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-zinc-700" />
                <div className="w-3 h-3 rounded-full bg-zinc-700" />
                <div className="w-3 h-3 rounded-full bg-zinc-700" />
              </div>
              <div className="flex-1 mx-4 bg-white/5 rounded-md px-3 py-1 text-xs text-zinc-500 text-center font-mono">
                app.schoolos.pk/dashboard
              </div>
            </div>
            <Image
              src="/hero_dashboard.jpg"
              alt="SchoolOS academic analytics dashboard"
              width={1400}
              height={800}
              className="w-full object-cover"
              priority
            />
            {/* Bottom fade */}
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#080c14] to-transparent" />
          </div>
        </div>
      </div>
    </section>
  );
}
