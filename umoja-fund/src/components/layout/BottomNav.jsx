import { NavLink } from "react-router-dom";
import { NAV_ITEMS } from "../../config/navConfig.js";

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-stone-100 bg-white md:hidden">
      {NAV_ITEMS.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.end}
          className={({ isActive }) =>
            `flex min-w-0 flex-1 flex-col items-center gap-1 py-3 text-[10px] transition ${
              isActive ? "text-stone-900" : "text-stone-400"}`}>
          <item.icon size={20} />
          <span className="max-w-full truncate px-0.5">{item.short ?? item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
