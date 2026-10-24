import { Link, NavLink } from "react-router-dom";
import { Cookie, ShieldCheck } from "lucide-react";
import { NAV_ITEMS } from "../../config/navConfig.js";
import { GROUP_INFO } from "../../data/aboutData.js";

const AIMS = [
  "Pool contributions fairly, so every member carries an equal share.",
  "Keep the books open, so everyone can see who has paid and what was spent.",
  "Back every expense with proof, so the money is seen at work.",
];

export default function Footer({ onOpenCookies }) {
  return (
    <footer className="mt-10 rounded-3xl bg-black p-6 text-white shadow-sm sm:p-8">
      <div className="grid gap-8 md:grid-cols-12">
        {/* what we are */}
        <div className="md:col-span-5">
          <Link to="/" className="inline-flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-sm font-bold text-white">U</span>
            <span className="font-semibold text-white">{GROUP_INFO.name}</span>
          </Link>
          <p className="mt-4 text-sm leading-relaxed text-stone-300">
            Umoja Fund is a shared fund run by a group of people who contribute together towards a common project. It records every contribution and every expense in one place, so the whole group can see how the money is used.
          </p>
          <p className="mt-2 text-sm text-accent">{GROUP_INFO.tagline}</p>
        </div>

        {/* aim */}
        <div className="md:col-span-4">
          <p className="text-sm font-medium text-accent">Our aim</p>
          <ul className="mt-3 space-y-2.5">
            {AIMS.map((a) => (
              <li key={a} className="flex gap-2.5 text-sm text-stone-200">
                <ShieldCheck size={16} className="mt-0.5 shrink-0 text-accent" /> <span>{a}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* quick links */}
        <nav className="md:col-span-3" aria-label="Quick links">
          <p className="text-sm font-medium text-accent">Quick links</p>
          <ul className="mt-3 space-y-1.5">
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} end={item.end}
                  className={({ isActive }) => `inline-flex items-center gap-2 text-sm transition ${isActive ? "font-medium text-accent" : "text-stone-200 hover:text-accent"}`}>
                  <item.icon size={14} /> {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="mt-8 flex flex-col items-start justify-between gap-3 border-t border-white/15 pt-5 text-xs text-stone-400 sm:flex-row sm:items-center">
        <p>© {new Date().getFullYear()} {GROUP_INFO.name}. All rights reserved.</p>
        <button onClick={onOpenCookies} className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3.5 py-1.5 font-medium text-white hover:opacity-90">
          <Cookie size={13} /> Cookie settings
        </button>
      </div>
    </footer>
  );
}