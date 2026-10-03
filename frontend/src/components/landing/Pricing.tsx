"use client";

const PLANS = [
  {
    name: "Starter",
    price: "PKR 4,999",
    period: "/ month",
    cap: "Up to 300 students · 1 campus",
    features: [
      "All 5 roles",
      "Result publishing",
      "Fee tracking",
      "Excel import",
      "Email support",
    ],
    cta: "Start free trial",
    highlight: false,
  },
  {
    name: "Growth",
    price: "PKR 14,999",
    period: "/ month",
    cap: "Up to 1,500 students · 3 campuses",
    features: [
      "Everything in Starter",
      "Advanced analytics",
      "Student performance segments",
      "Bulk result publishing",
      "Challan generation",
      "Priority support",
    ],
    cta: "Book a Demo",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    cap: "5,000+ students · Unlimited campuses",
    features: [
      "Everything in Growth",
      "Row-level data isolation",
      "Custom grading systems",
      "Audit log export",
      "SLA guarantee",
      "Dedicated onboarding",
    ],
    cta: "Talk to sales",
    highlight: false,
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="py-28 md:py-40 px-6 lg:px-8 bg-[#0a0f1c] border-t border-white/6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-14">
          <h2
            className="text-white font-bold tracking-tight max-w-md"
            style={{ fontSize: "clamp(1.6rem, 3vw, 2.4rem)", lineHeight: 1.15 }}
          >
            Pricing that makes sense
            <br />
            on the first term alone.
          </h2>
          <p className="text-zinc-500 text-base mt-4 max-w-md">
            One teacher saving one hour a day already covers the Starter plan.
          </p>
        </div>

        {/* Pricing cards — 3 col grid, no empty cells */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLANS.map((p) => (
            <div
              key={p.name}
              className={`rounded-xl border p-8 flex flex-col gap-6 transition-colors duration-200 ${
                p.highlight
                  ? "border-blue-600/50 bg-[#0d1830]"
                  : "border-white/8 bg-[#0d1220] hover:border-white/16"
              }`}
            >
              {p.highlight && (
                <div className="-mt-8 -mx-8 mb-0 px-8 pt-3 pb-3 border-b border-blue-600/30 bg-blue-600/10 rounded-t-xl">
                  <span className="text-blue-400 text-xs font-semibold uppercase tracking-widest">
                    Most popular
                  </span>
                </div>
              )}

              <div>
                <p className="text-zinc-400 text-sm mb-3">{p.name}</p>
                <div className="flex items-end gap-1.5 mb-1">
                  <span
                    className="text-white font-bold"
                    style={{ fontSize: p.price === "Custom" ? "2rem" : "2.2rem", lineHeight: 1 }}
                  >
                    {p.price}
                  </span>
                  {p.period && <span className="text-zinc-500 text-sm pb-1">{p.period}</span>}
                </div>
                <p className="text-zinc-600 text-xs">{p.cap}</p>
              </div>

              <div className="h-px bg-white/6" />

              <ul className="flex flex-col gap-3 flex-1">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 14 14"
                      fill="none"
                      className="flex-shrink-0 mt-0.5"
                    >
                      <circle cx="7" cy="7" r="6" fill={p.highlight ? "#1d4ed8" : "#ffffff0f"} />
                      <path d="M4.5 7l2 2 3-3" stroke={p.highlight ? "#93c5fd" : "#6b7280"} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="text-zinc-400">{f}</span>
                  </li>
                ))}
              </ul>

              <a
                href={p.highlight ? "#demo" : "#contact"}
                className={`w-full text-center text-sm font-semibold py-3 rounded-lg transition-colors duration-150 active:scale-[0.98] ${
                  p.highlight
                    ? "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20"
                    : "border border-white/12 hover:border-white/24 text-zinc-300 hover:text-white hover:bg-white/4"
                }`}
              >
                {p.cta}
              </a>
            </div>
          ))}
        </div>

        <p className="text-zinc-600 text-xs text-center mt-8">
          14-day free trial on all plans. No credit card required.
        </p>
      </div>
    </section>
  );
}
