import { Search } from "lucide-react";

export default function SearchBar({ value, onChange, placeholder = "Search", className = "" }) {
  return (
    <div className={`flex items-center gap-2 rounded-full bg-stone-100 px-4 py-2 ${className}`}>
      <Search size={16} className="shrink-0 text-stone-400" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-transparent text-sm outline-none" />
    </div>
  );
}
