import Card from "./Card.jsx";

export default function StatCard({ label, value, sub, icon: Icon, dark = false }) {
  return (
    <Card dark={dark} className="flex flex-col justify-between gap-6">
      <div className="flex items-center justify-between">
        <p className={`text-sm ${dark ? "text-stone-400" : "text-stone-500"}`}>{label}</p>
        {Icon && (
          <span className={`flex h-9 w-9 items-center justify-center rounded-full ${dark ? "bg-white/10" : "bg-stone-100"}`}>
            <Icon size={16} />
          </span>
        )}
      </div>
      <div>
        <p className="text-3xl font-medium tracking-tight">{value}</p>
        {sub && <p className={`mt-1 text-xs ${dark ? "text-stone-400" : "text-stone-500"}`}>{sub}</p>}
      </div>
    </Card>
  );
}
