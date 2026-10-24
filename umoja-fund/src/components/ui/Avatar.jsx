import { initials } from "../../utils/formatters.js";

const GRADIENTS = [
  "from-orange-400 to-rose-500", "from-sky-400 to-indigo-500", "from-emerald-400 to-teal-500",
  "from-fuchsia-400 to-purple-500", "from-amber-300 to-orange-500", "from-lime-400 to-green-500",
];

export default function Avatar({ name, index = 0, size = "h-10 w-10" }) {
  return (
    <div className={`${size} flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-sm font-semibold text-white ${GRADIENTS[index % GRADIENTS.length]}`}>
      {initials(name)}
    </div>
  );
}
