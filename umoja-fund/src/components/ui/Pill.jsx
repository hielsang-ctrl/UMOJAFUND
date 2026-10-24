export default function Pill({ children, className = "" }) {
  return <div className={`rounded-full bg-white shadow-sm ${className}`}>{children}</div>;
}
