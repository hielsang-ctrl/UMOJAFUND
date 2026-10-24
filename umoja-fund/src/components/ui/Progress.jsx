export function ProgressBar({ value }) {
  return (
    <div className="h-2 w-full rounded-full bg-stone-100">
      <div className="h-2 rounded-full bg-accent" style={{ width: `${Math.min(100, value)}%` }} />
    </div>
  );
}

export function ProgressRing({ value, size = 96 }) {
  const r = 38;
  const c = 2 * Math.PI * r;
  const pct = Math.min(100, value);
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={`${Math.round(pct)} percent`}>
      <circle cx="50" cy="50" r={r} fill="none" stroke="#f1f1f1" strokeWidth="9" />
      <circle cx="50" cy="50" r={r} fill="none" stroke="#EF6A3C" strokeWidth="9" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} transform="rotate(-90 50 50)" />
      <text x="50" y="56" textAnchor="middle" fontSize="20" fontWeight="600" fill="#1c1917">{Math.round(pct)}%</text>
    </svg>
  );
}
