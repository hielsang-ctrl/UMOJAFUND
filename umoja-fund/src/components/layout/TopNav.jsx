import { NavLink } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import Pill from "../ui/Pill.jsx";
import Avatar from "../ui/Avatar.jsx";
import { NAV_ITEMS } from "../../config/navConfig.js";
import { useFund } from "../../context/FundContext.jsx";

export default function TopNav() {
  const { role, setRole } = useFund();
  return (
    <div className="flex justify-center">
    <Pill className="inline-flex items-center gap-1 px-2 py-1.5">
      {/* Logo */}
      <div className="flex items-center gap-2 px-2 py-1">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm font-bold text-white">U</span>
        <span className="pr-1 text-sm font-semibold">Umoja</span>
      </div>

      <div className="mx-1 h-5 w-px bg-stone-200" />

      {/* Nav links */}
      <nav className="hidden items-center gap-0 lg:flex">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end}
            className={({ isActive }) =>
              `whitespace-nowrap rounded-full px-3 py-1.5 text-sm transition ${
                isActive ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100"}`}>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="mx-1 hidden h-5 w-px bg-stone-200 lg:block" />

      {/* Actions */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2">
          <Avatar name="Admin User" size="h-8 w-8" />
          <select value={role} onChange={(e) => setRole(e.target.value)} className="bg-transparent text-sm outline-none" aria-label="Viewing as">
            <option value="admin">Admin</option>
            <option value="member">Member</option>
          </select>
          <ChevronDown size={14} className="text-stone-400" />
        </div>
      </div>
    </Pill>
    </div>
  );
}
