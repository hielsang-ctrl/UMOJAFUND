import { Check, Clock, X } from "lucide-react";
import { TARGET_PER_MEMBER } from "../../data/seedData.js";

export default function StatusBadge({ paid }) {
  const full = paid >= TARGET_PER_MEMBER;
  const partial = paid > 0 && !full;
  const style = full ? "bg-emerald-50 text-emerald-700" : partial ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700";
  const Icon = full ? Check : partial ? Clock : X;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${style}`}>
      <Icon size={12} /> {full ? "Paid" : partial ? "Partial" : "Not paid"}
    </span>
  );
}
