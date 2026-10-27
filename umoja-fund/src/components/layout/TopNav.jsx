import { NavLink } from "react-router-dom";
import { LogOut } from "lucide-react";
import Pill from "../ui/Pill.jsx";
import Avatar from "../ui/Avatar.jsx";
import { NAV_ITEMS } from "../../config/navConfig.js";
import { useAuth } from "../../context/AuthContext.jsx";

export default function TopNav() {
  const { user, logout } = useAuth();
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
        <div className="flex items-center gap-2 rounded-full py-1 pl-1 pr-1">
          <Avatar name={user.name} size="h-8 w-8" />
          <div className="hidden text-left leading-tight sm:block">
            <p className="text-sm font-medium">{user.name.split(" ")[0]}</p>
            <p className="text-[11px] text-stone-400">{user.access === "admin" ? "Admin" : user.role}</p>
          </div>
          <button onClick={logout} title="Sign out" aria-label="Sign out"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-100 text-stone-600 hover:bg-stone-200">
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </Pill>
    </div>
  );
}
