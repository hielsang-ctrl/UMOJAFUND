import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";

export default function CardHeader({ title, subtitle, to, linkLabel = "View all", right }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <p className="font-medium text-stone-900">{title}</p>
        {subtitle && <p className="mt-0.5 text-xs text-stone-500">{subtitle}</p>}
      </div>
      {right}
      {to && (
        <Link to={to} className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-3 py-1 text-xs text-stone-600 hover:bg-stone-200">
          {linkLabel} <ArrowUpRight size={12} />
        </Link>
      )}
    </div>
  );
}
