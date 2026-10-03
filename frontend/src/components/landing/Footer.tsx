"use client";

const LINKS = {
  Product: ["Features", "Analytics", "Pricing", "Changelog"],
  Company: ["About", "Blog", "Careers", "Contact"],
  Legal: ["Privacy Policy", "Terms of Service", "Security"],
};

export default function Footer() {
  return (
    <footer className="border-t border-white/6 px-6 lg:px-8 py-16 bg-[#080c14]">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-16">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 bg-blue-600 rounded-[6px] flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <rect x="1" y="1" width="5" height="5" rx="1" fill="white" />
                  <rect x="8" y="1" width="5" height="5" rx="1" fill="white" fillOpacity="0.6" />
                  <rect x="1" y="8" width="5" height="5" rx="1" fill="white" fillOpacity="0.6" />
                  <rect x="8" y="8" width="5" height="5" rx="1" fill="white" />
                </svg>
              </div>
              <span className="text-white font-semibold text-sm">SchoolOS</span>
            </div>
            <p className="text-zinc-600 text-xs leading-relaxed max-w-[180px]">
              Academic intelligence platform for private schools in Pakistan.
            </p>
          </div>

          {/* Links */}
          {Object.entries(LINKS).map(([group, items]) => (
            <div key={group}>
              <p className="text-zinc-500 text-xs uppercase tracking-widest mb-4">{group}</p>
              <ul className="flex flex-col gap-3">
                {items.map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="text-zinc-500 hover:text-white text-sm transition-colors duration-150"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pt-8 border-t border-white/6">
          <p className="text-zinc-700 text-xs">
            &copy; 2026 SchoolOS. All rights reserved.
          </p>
          <p className="text-zinc-700 text-xs">
            Hosted in Pakistan. Your data never leaves the country.
          </p>
        </div>
      </div>
    </footer>
  );
}
