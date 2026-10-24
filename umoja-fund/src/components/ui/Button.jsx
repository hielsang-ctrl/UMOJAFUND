export default function Button({ children, className = "", ...props }) {
  return (
    <button {...props}
      className={`inline-flex items-center gap-2 rounded-full bg-stone-900 px-5 py-2.5 text-sm text-white transition hover:bg-black ${className}`}>
      {children}
    </button>
  );
}

export const inputClass =
  "rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm outline-none focus:border-stone-400";
