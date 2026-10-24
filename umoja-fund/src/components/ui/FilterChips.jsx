// options: [{ id, label, count? }]
export default function FilterChips({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button key={o.id} onClick={() => onChange(o.id)}
          className={`rounded-full px-3.5 py-1.5 text-sm transition ${value === o.id ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"}`}>
          {o.label}
          {o.count !== undefined && <span className={`ml-1.5 text-xs ${value === o.id ? "text-stone-300" : "text-stone-400"}`}>{o.count}</span>}
        </button>
      ))}
    </div>
  );
}
