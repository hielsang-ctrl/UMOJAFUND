import { Link } from "react-router-dom";
import { Camera, Hourglass, Lightbulb, Plus, TrendingDown, Wallet, PiggyBank } from "lucide-react";
import Card from "../components/ui/Card.jsx";
import CardHeader from "../components/ui/CardHeader.jsx";
import StatCard from "../components/ui/StatCard.jsx";
import Avatar from "../components/ui/Avatar.jsx";
import PageHeader from "../components/ui/PageHeader.jsx";
import { ProgressRing } from "../components/ui/Progress.jsx";
import { useFund } from "../context/FundContext.jsx";
import { TARGET_PER_MEMBER } from "../data/seedData.js";
import { CATEGORY_DOT } from "../data/extraData.js";
import { prettyDate } from "../utils/dates.js";
import { fmt } from "../utils/formatters.js";

// same colour per category name as the Expenses page
const dotFor = (cat) => CATEGORY_DOT[cat] ?? "bg-stone-300";

export default function OverviewPage() {
  const { members, expenses, posts, totals, isAdmin } = useFund();

  /* ---- derived numbers ---- */
  const pct = totals.percent; // 0 (never NaN) when there are no members
  const outstanding = Math.max(0, totals.expected - totals.collected);
  const fullyPaid = members.filter((m) => m.paid >= TARGET_PER_MEMBER);
  const partial = members.filter((m) => m.paid > 0 && m.paid < TARGET_PER_MEMBER);
  const unpaid = members.filter((m) => m.paid === 0);
  const pending = members.filter((m) => m.paid < TARGET_PER_MEMBER).sort((a, b) => a.paid - b.paid);
  const usedPct = totals.collected ? Math.min(100, (totals.spent / totals.collected) * 100) : 0;
  const withProof = expenses.filter((e) => e.postId).length;
  const proofPct = expenses.length ? Math.round((withProof / expenses.length) * 100) : 100;
  const recent = [...expenses].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4);
  const latestPosts = posts.slice(0, 3);
  const categories = Object.entries(
    expenses.reduce((acc, e) => ({ ...acc, [e.category]: (acc[e.category] || 0) + e.amount }), {})
  ).sort((a, b) => b[1] - a[1]);

  const legend = [
    { label: "Paid in full", count: fullyPaid.length, dot: "bg-accent" },
    { label: "Partial", count: partial.length, dot: "bg-orange-300" },
    { label: "Not paid", count: unpaid.length, dot: "bg-stone-300" },
  ];

  return (
    <>
      <PageHeader
        title="Group fund"
        subtitle="See what has been collected, what is pending and where the money went."
        action={
          isAdmin && (
            <div className="flex gap-2">
              <Link to="/contributions" className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm shadow-sm hover:bg-stone-50">
                <Plus size={14} /> Record payment
              </Link>
              <Link to="/expenses" className="inline-flex items-center gap-2 rounded-full bg-stone-900 px-5 py-2.5 text-sm text-white hover:bg-black">
                <Plus size={14} /> Add expense
              </Link>
            </div>
          )
        }
      />

      <div className="space-y-4">
        {/* ---------- Row 1: key numbers ---------- */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total collected" value={fmt(totals.collected)} sub={`${Math.round(pct)}% of ${fmt(totals.expected)} target`} icon={PiggyBank} />
          <StatCard label="Total spent" value={fmt(totals.spent)} sub={`${Math.round(usedPct)}% of collected funds used`} icon={TrendingDown} />
          <StatCard label="Available balance" value={fmt(totals.balance)} sub="Collected minus spent" icon={Wallet} dark />
          <StatCard label="Still to collect" value={fmt(outstanding)} sub={`${pending.length} member${pending.length === 1 ? "" : "s"} yet to complete`} icon={Hourglass} />
        </div>

        {/* ---------- Row 2: contributions chart + status ---------- */}
        <div className="grid gap-4 lg:grid-cols-12">
          <Card className="lg:col-span-8">
            <CardHeader title="Contributions per member" subtitle={`Target ${fmt(TARGET_PER_MEMBER)} each`} to="/contributions" />
            <div className="flex h-48 items-end gap-3 sm:gap-5">
              {members.map((m) => {
                const h = Math.max(4, (Math.min(m.paid, TARGET_PER_MEMBER) / TARGET_PER_MEMBER) * 100);
                const tone = m.paid >= TARGET_PER_MEMBER ? "bg-accent" : m.paid > 0 ? "bg-orange-300" : "bg-stone-200";
                return (
                  <div key={m.id} className="flex h-full flex-1 flex-col justify-end gap-1.5">
                    <span className="text-center text-[11px] text-stone-500">{m.paid ? (m.paid / 1000).toFixed(1).replace(".0", "") + "k" : "0"}</span>
                    <div className={`w-full rounded-xl ${tone}`} style={{ height: `${h}%`, maxHeight: "80%" }} />
                    <span className="truncate text-center text-xs text-stone-500">{m.name.split(" ")[0]}</span>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="flex flex-col lg:col-span-4">
            <CardHeader title="Collection status" subtitle={`${members.length} members in the group`} />
            <div className="flex flex-1 flex-col items-center justify-center gap-4">
              <ProgressRing value={pct} size={120} />
              <ul className="w-full space-y-2 text-sm">
                {legend.map((l) => (
                  <li key={l.label} className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-stone-600">
                      <span className={`h-2.5 w-2.5 rounded-full ${l.dot}`} /> {l.label}
                    </span>
                    <span className="font-medium">{l.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        </div>

        {/* ---------- Row 3: where the money went ---------- */}
        <div className="grid gap-4 lg:grid-cols-12">
          <Card className="lg:col-span-5">
            <CardHeader title="Where the money went" subtitle={`${fmt(totals.spent)} spent so far`} to="/expenses" />

            <p className="mb-1.5 flex justify-between text-xs text-stone-500">
              <span>Funds used</span><span>{Math.round(usedPct)}%</span>
            </p>
            <div className="mb-5 flex h-3 overflow-hidden rounded-full bg-stone-100">
              {categories.map(([cat, amt]) => (
                <div key={cat} className={dotFor(cat)} title={`${cat}: ${fmt(amt)}`}
                  style={{ width: `${totals.collected ? (amt / totals.collected) * 100 : 0}%` }} />
              ))}
            </div>

            <ul className="space-y-3">
              {categories.map(([cat, amt]) => (
                <li key={cat} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${dotFor(cat)}`} /> {cat}
                  </span>
                  <span className="text-stone-500">
                    {fmt(amt)} <span className="ml-1 text-xs text-stone-400">{Math.round((amt / totals.spent) * 100)}%</span>
                  </span>
                </li>
              ))}
              {!categories.length && <p className="text-sm text-stone-500">No expenses yet.</p>}
            </ul>
          </Card>

          <Card className="lg:col-span-7">
            <CardHeader title="Recent expenses" to="/expenses"
              right={
                <span className={`rounded-full px-2.5 py-1 text-xs ${proofPct === 100 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                  {proofPct}% backed by proof
                </span>
              } />
            <ul className="divide-y divide-stone-100">
              {recent.map((e) => (
                <li key={e.id} className="flex items-center gap-3 py-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-100 text-xs font-medium text-stone-600">
                    {e.category.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{e.title}</p>
                    <p className="text-xs text-stone-400">{e.category} · {prettyDate(e.date)}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs ${e.postId ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                    {e.postId ? "Proof attached" : "No proof"}
                  </span>
                  <span className="w-24 text-right text-sm font-medium">{fmt(e.amount)}</span>
                </li>
              ))}
              {!recent.length && <p className="py-4 text-sm text-stone-500">No expenses yet.</p>}
            </ul>
          </Card>
        </div>

        {/* ---------- Row 4: pending members + latest posts ---------- */}
        <div className="grid gap-4 lg:grid-cols-12">
          <Card className="lg:col-span-5">
            <CardHeader title="Pending contributions" subtitle={`${pending.length} still to complete`} to="/contacts" linkLabel="Send reminders" />
            <ul className="space-y-3">
              {pending.map((m) => (
                <li key={m.id} className="flex items-center gap-3">
                  <Avatar name={m.name} index={m.id} size="h-9 w-9" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{m.name}</p>
                    <p className="text-xs text-stone-400">Paid {fmt(m.paid)}</p>
                  </div>
                  <span className="text-sm font-medium text-rose-600">{fmt(TARGET_PER_MEMBER - m.paid)}</span>
                </li>
              ))}
              {!pending.length && <p className="text-sm text-emerald-700">Everyone has paid in full. 🎉</p>}
            </ul>
          </Card>

          <Card className="lg:col-span-7">
            <CardHeader title="Latest ideas & proof of work" to="/proof" />
            <ul className="space-y-3">
              {latestPosts.map((p) => (
                <li key={p.id} className="flex gap-3 rounded-2xl border border-stone-100 p-3">
                  {p.image ? (
                    <img src={p.image} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" />
                  ) : (
                    <span className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-xl ${p.kind === "proof" ? "bg-emerald-50 text-emerald-600" : "bg-sky-50 text-sky-600"}`}>
                      {p.kind === "proof" ? <Camera size={20} /> : <Lightbulb size={20} />}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{p.author}</p>
                      <span className="text-xs text-stone-400">{prettyDate(p.date)}</span>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-sm text-stone-600">{p.text}</p>
                  </div>
                </li>
              ))}
              {!latestPosts.length && <p className="text-sm text-stone-500">Nothing posted yet.</p>}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
