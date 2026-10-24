// Surface colour: white by default, dark with the `dark` prop.
// If a caller passes its own bg-* class (older pages do), that wins instead of
// fighting bg-white in Tailwind's generated CSS order.
export default function Card({ children, className = "", dark = false }) {
  const customBg = /(^|\s)bg-/.test(className);
  const surface = dark ? "bg-stone-900 text-white" : customBg ? "" : "bg-white";
  return <div className={`rounded-3xl p-5 shadow-sm ${surface} ${className}`}>{children}</div>;
}
