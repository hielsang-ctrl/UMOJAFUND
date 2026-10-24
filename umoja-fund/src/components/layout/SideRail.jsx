import { NavLink } from "react-router-dom";
import { HelpCircle, LogOut } from "lucide-react";
import Pill from "../ui/Pill.jsx";
import { NAV_ITEMS } from "../../config/navConfig.js";

export default function SideRail() {
  return (
    <aside className="hidden md:flex md:flex-col">
      <Pill className="sticky top-[73px] m-3 flex flex-col items-center gap-2 px-2 py-3">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} title={item.label}
            className={({ isActive }) =>
              `flex h-10 w-10 items-center justify-center rounded-full ${
                isActive ? "bg-stone-900 text-white" : "text-stone-500 hover:bg-stone-100"}`}>
            <item.icon size={18} />
          </NavLink>
        ))}
        <div className="my-1 h-px w-6 bg-stone-200" />
        <HelpCircle size={18} className="my-2 text-stone-400" />
        <LogOut size={18} className="my-2 text-stone-400" />
      </Pill>
    </aside>
  );
}
