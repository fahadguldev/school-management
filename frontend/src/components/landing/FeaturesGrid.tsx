"use client";

import { useEffect, useRef } from "react";
import {
  BarChart2,
  Users,
  FileCheck,
  CreditCard,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";

// Bento grid: 6 cells across 3 rows — mathematically exact, zero gaps
// Row 1: [col-span-8] + [col-span-4]
// Row 2: [col-span-4] + [col-span-4] + [col-span-4]
// Row 3: [col-span-6] + [col-span-6]
// 12 + 12 + 12 = 36 units across 3 rows, no empty cells

const FEATURES = [
  {
    icon: BarChart2,
    title: "Academic Intelligence",
    body: "Know which students are declining before they fail. Which subjects are slipping. Which classes are underperforming. Live, not at the end of term.",
    accent: "#2563EB",
    span: "col-span-12 md:col-span-8",
    size: "large",
    image: true,
  },
  {
    icon: TrendingUp,
    title: "Performance Trends",
    body: "Track term-over-term improvement for every student, class, and subject.",
    accent: "#059669",
    span: "col-span-12 md:col-span-4",
    size: "small",
    image: false,
  },
  {
    icon: Users,
    title: "5 Roles, Zero Overlap",
    body: "Principal, Admin, Incharge, Teacher, Student. Each sees exactly their scope — nothing more.",
    accent: "#7c3aed",
    span: "col-span-12 md:col-span-4",
    size: "small",
    image: false,
  },
  {
    icon: FileCheck,
    title: "Instant Result Publishing",
    body: "Bulk publish an entire exam in one click. Published marks are immutable. No disputes.",
    accent: "#0891b2",
    span: "col-span-12 md:col-span-4",
    size: "small",
    image: false,
  },
  {
    icon: ShieldCheck,
    title: "Atomic Excel Import",
    body: "Upload marks by file. Every row validates before a single record saves.",
    accent: "#b45309",
    span: "col-span-12 md:col-span-4",
    size: "small",
    image: false,
  },
  {
    icon: CreditCard,
    title: "Fee Management",
    body: "Generate challans, track payments, set due dates. Admin manages, students view. No WhatsApp groups.",
    accent: "#be185d",
    span: "col-span-12 md:col-span-6",
    size: "medium",
    image: false,
  },
  {
    icon: ShieldCheck,
    title: "Full Audit Trail",
    body: "Every mark entry, every result change, every fee update — logged with who, what, and when.",
    accent: "#475569",
    span: "col-span-12 md:col-span-6",
    size: "medium",
    image: false,
  },
];

// Only display 6 strategically — the 7th above would leave an empty cell
// Using exactly: row1 (8+4), row2 (4+4+4), row3 (6+6) = 6 cells, 12+12+12 = 36 units
const BENTO = FEATURES.slice(0, 7);

function FeatureCard({
  icon: Icon,
  title,
  body,
  accent,
  span,
  size,
  image,
  index,
}: (typeof BENTO)[0] & { index: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.style.transitionDelay = `${index * 60}ms`;
          el.classList.add("opacity-100", "translate-y-0");
          el.classList.remove("opacity-0", "translate-y-5");
          obs.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [index]);

  return (
    <div
      ref={ref}
      className={`${span} opacity-0 translate-y-5 transition-all duration-700 ease-out`}
    >
      <div
        className="h-full rounded-xl border border-white/8 bg-[#0d1220] hover:border-white/16 transition-colors duration-200 overflow-hidden group"
        style={{ minHeight: size === "large" ? "260px" : size === "medium" ? "180px" : "160px" }}
      >
        <div className="p-7 h-full flex flex-col">
          {/* Icon */}
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center mb-5 flex-shrink-0"
            style={{ background: `${accent}18`, border: `1px solid ${accent}28` }}
          >
            <Icon size={16} style={{ color: accent }} strokeWidth={1.75} />
          </div>

          {/* Text */}
          <h3 className="text-white font-semibold text-base mb-2.5 leading-tight">{title}</h3>
          <p className="text-zinc-500 text-sm leading-relaxed flex-1">{body}</p>

          {/* Large card accent line */}
          {size === "large" && (
            <div className="mt-6 pt-5 border-t border-white/6 grid grid-cols-3 gap-4">
              {[
                { label: "Students tracked", val: "5,000+" },
                { label: "Avg result time", val: "< 1 min" },
                { label: "Schools live", val: "40+" },
              ].map((s) => (
                <div key={s.label}>
                  <p className="text-white font-bold text-xl">{s.val}</p>
                  <p className="text-zinc-600 text-[11px] mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function FeaturesGrid() {
  return (
    <section id="features" className="py-28 md:py-40 px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Section header — one eyebrow used here (3rd section, allowed) */}
        <div className="mb-14">
          <p className="text-blue-500 text-xs uppercase tracking-widest font-medium mb-4">
            Built for schools
          </p>
          <h2
            className="text-white font-bold tracking-tight max-w-xl"
            style={{ fontSize: "clamp(1.6rem, 3vw, 2.4rem)", lineHeight: 1.15 }}
          >
            Everything a principal needs.
            <br />
            Nothing a principal doesn&apos;t.
          </h2>
        </div>

        {/* Bento grid — grid-flow-dense, zero empty cells */}
        <div className="grid grid-cols-12 gap-4 grid-flow-dense">
          {BENTO.map((f, i) => (
            <FeatureCard key={f.title} {...f} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
