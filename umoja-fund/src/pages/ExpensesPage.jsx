import { useState } from "react";
import usePersistedState from "../hooks/usePersistedState.js";
import { Link } from "react-router-dom";
import { AlertTriangle, BadgeCheck, Download, Plus, Receipt, TrendingDown, Wallet } from "lucide-react";
import Card from "../components/ui/Card.jsx";
import CardHeader from "../components/ui/CardHeader.jsx";
import StatCard from "../components/ui/StatCard.jsx";
import PageHeader from "../components/ui/PageHeader.jsx";
import Modal from "../components/ui/Modal.jsx";
import FilterChips from "../components/ui/FilterChips.jsx";
import SearchBar from "../components/ui/SearchBar.jsx";
import Button, { inputClass } from "../components/ui/Button.jsx";
import { useFund } from "../context/FundContext.jsx";
import { CATEGORIES, CATEGORY_DOT } from "../data/extraData.js";
import { prettyDate, today } from "../utils/dates.js";
import { fmt } from "../utils/formatters.js";

const BLANK = { title: "", vendor: "", amount: "", category: "Materials", postId: "" };

export default function ExpensesPage() {
  const { expenses, posts, totals, isAdmin, addExpense, linkProof } = useFund();

  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("all");
  const [proof, setProof] = useState("all");
  const [sort, setSort] = usePersistedState("expenses.sort", "new");
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [selectedId, setSelectedId] = useState(null);

  /* ---- derived ---- */
  const missing = expenses.filter((e) => !e.postId);
  const proofPct = expenses.length ? Math.round(((expenses.length - missing.length) / expenses.length) * 100) : 100;
  const usedPct = totals.collected ? Math.min(100, (totals.spent / totals.collected) * 100) : 0;
  // a proof post can back only one expense, so offer just the ones not used yet
  const usedPostIds = new Set(expenses.map((e) => e.postId).filter(Boolean));
  const proofPosts = posts.filter((p) => p.kind === "proof" && !usedPostIds.has(p.id));

  const byCat = CATEGORIES.map((c) => ({ name: c, total: expenses.filter((e) => e.category === c).reduce((s, e) => s + e.amount, 0), count: expenses.filter((e) => e.category === c).length }))
    .filter((c) => c.count > 0).sort((a, b) => b.total - a.total);

  const list = expenses
    .filter((e) => cat === "all" || e.category === cat)
    .filter((e) => proof === "all" || (proof === "with" ? e.postId : !e.postId))
    .filter((e) => `${e.title} ${e.vendor || ""}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => (sort === "new" ? b.date.localeCompare(a.date) : b.amount - a.amount));
  const listTotal = list.reduce((s, e) => s + e.amount, 0);
  const selected = expenses.find((e) => e.id === selectedId);
  const selectedPost = selected && posts.find((p) => p.id === selected.postId);

  /* ---- add expense ---- */
  const amount = Number(form.amount);
  const formError = !form.title.trim() ? "" : amount > totals.balance ? `That is more than the available balance (${fmt(totals.balance)}).` : "";
  const canSave = form.title.trim() && amount > 0 && amount <= totals.balance;
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const save = () => {
    if (!canSave) return;
    addExpense({ title: form.title.trim(), vendor: form.vendor.trim(), amount, category: form.category, postId: form.postId ? Number(form.postId) : null, date: today() });
    setForm(BLANK);
    setAddOpen(false);
  };

  const exportCsv = () => {
    const rows = [["Date", "Item", "Vendor", "Category", "Amount", "Proof"], ...list.map((e) => [e.date, e.title, e.vendor || "", e.category, e.amount, e.postId ? "Yes" : "No"])];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url; a.download = "expenses.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <PageHeader title="Expenses" subtitle="Every shilling spent, with the proof of work attached."
        action={
          <div className="flex gap-2">
            <button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm shadow-sm hover:bg-stone-50"><Download size={14} /> Export CSV</button>
            {isAdmin && <Button onClick={() => setAddOpen(true)}><Plus size={14} /> Add expense</Button>}
          </div>
        } />

      <div className="space-y-4">
        {/* ---------- stats ---------- */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total spent" value={fmt(totals.spent)} sub={`${Math.round(usedPct)}% of collected funds`} icon={TrendingDown} />
          <StatCard label="Available balance" value={fmt(totals.balance)} sub="Ready to spend" icon={Wallet} dark />
          <StatCard label="Expenses logged" value={expenses.length} sub={`Largest ${fmt(Math.max(0, ...expenses.map((e) => e.amount)))}`} icon={Receipt} />
          <StatCard label="Backed by proof" value={`${proofPct}%`} sub={missing.length ? `${missing.length} still need proof` : "All expenses have proof"} icon={BadgeCheck} />
        </div>

        {/* ---------- missing proof alert ---------- */}
        {missing.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 rounded-3xl bg-amber-50 p-4 text-sm text-amber-800">
            <AlertTriangle size={18} className="shrink-0" />
            <p className="flex-1">{missing.length} expense{missing.length > 1 ? "s have" : " has"} no proof of work yet: {missing.map((e) => e.title).join(", ")}.</p>
            <button onClick={() => setProof("missing")} className="rounded-full bg-amber-100 px-4 py-1.5 text-xs font-medium hover:bg-amber-200">Show them</button>
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-12">
          {/* ---------- breakdown ---------- */}
          <Card className="lg:col-span-4">
            <CardHeader title="By category" subtitle="Tap a category to filter the ledger" />
            <div className="mb-4 flex h-3 overflow-hidden rounded-full bg-stone-100">
              {byCat.map((c) => <div key={c.name} className={CATEGORY_DOT[c.name]} style={{ width: `${(c.total / Math.max(totals.collected, 1)) * 100}%` }} title={`${c.name}: ${fmt(c.total)}`} />)}
            </div>
            <ul className="space-y-1">
              {byCat.map((c) => (
                <li key={c.name}>
                  <button onClick={() => setCat(cat === c.name ? "all" : c.name)}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition ${cat === c.name ? "bg-stone-900 text-white" : "hover:bg-stone-50"}`}>
                    <span className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${CATEGORY_DOT[c.name]}`} /> {c.name} <span className="text-xs opacity-60">({c.count})</span></span>
                    <span className="font-medium">{fmt(c.total)}</span>
                  </button>
                </li>
              ))}
              {!byCat.length && <p className="text-sm text-stone-500">No expenses yet.</p>}
            </ul>
          </Card>

          {/* ---------- ledger ---------- */}
          <Card className="lg:col-span-8">
            <CardHeader title="Ledger" subtitle={`${list.length} of ${expenses.length} expenses · ${fmt(listTotal)}`} />
            <div className="mb-4 space-y-3">
              <div className="flex flex-wrap gap-2">
                <SearchBar value={query} onChange={setQuery} placeholder="Search item or vendor" className="min-w-[10rem] flex-1" />
                <select value={sort} onChange={(e) => setSort(e.target.value)} className={inputClass} aria-label="Sort">
                  <option value="new">Newest first</option>
                  <option value="big">Largest first</option>
                </select>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <FilterChips value={proof} onChange={setProof} options={[{ id: "all", label: "All" }, { id: "with", label: "With proof" }, { id: "missing", label: "Missing proof", count: missing.length }]} />
                {cat !== "all" && <button onClick={() => setCat("all")} className="text-xs text-stone-500 underline">Clear category: {cat}</button>}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-stone-400">
                  <tr>
                    <th className="py-2 pr-4 font-normal">Date</th>
                    <th className="py-2 pr-4 font-normal">Item</th>
                    <th className="py-2 pr-4 font-normal">Category</th>
                    <th className="py-2 pr-4 text-right font-normal">Amount</th>
                    <th className="py-2 font-normal">Proof</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {list.map((e) => (
                    <tr key={e.id} onClick={() => setSelectedId(e.id)} className="cursor-pointer hover:bg-stone-50">
                      <td className="py-3 pr-4 text-stone-500">{prettyDate(e.date)}</td>
                      <td className="py-3 pr-4"><p className="font-medium">{e.title}</p>{e.vendor && <p className="text-xs text-stone-400">{e.vendor}</p>}</td>
                      <td className="py-3 pr-4"><span className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${CATEGORY_DOT[e.category]}`} />{e.category}</span></td>
                      <td className="py-3 pr-4 text-right font-medium">{fmt(e.amount)}</td>
                      <td className="py-3"><span className={`rounded-full px-2.5 py-0.5 text-xs ${e.postId ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{e.postId ? "Attached" : "Missing"}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!list.length && <p className="py-8 text-center text-sm text-stone-500">No expenses match your filters.</p>}
          </Card>
        </div>
      </div>

      {/* ---------- add expense ---------- */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add an expense">
        <div className="space-y-3">
          <p className="rounded-2xl bg-stone-50 px-3 py-2 text-xs text-stone-500">Available balance: <b className="text-stone-800">{fmt(totals.balance)}</b></p>
          <input className={`${inputClass} w-full`} placeholder="What was it for?" value={form.title} onChange={set("title")} />
          <input className={`${inputClass} w-full`} placeholder="Vendor or supplier (optional)" value={form.vendor} onChange={set("vendor")} />
          <div className="grid grid-cols-2 gap-3">
            <input className={inputClass} type="number" min="1" placeholder="Amount (KES)" value={form.amount} onChange={set("amount")} />
            <select className={inputClass} value={form.category} onChange={set("category")}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
          </div>
          <select className={`${inputClass} w-full`} value={form.postId} onChange={set("postId")}>
            <option value="">No proof linked yet</option>
            {!proofPosts.length && <option disabled>No unlinked proof posts yet</option>}
            {proofPosts.map((p) => <option key={p.id} value={p.id}>{p.text.slice(0, 50)}…</option>)}
          </select>
          {formError && <p className="text-xs text-rose-600">{formError}</p>}
          <Button disabled={!canSave} onClick={save} className="disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-400"><Plus size={14} /> Save expense</Button>
        </div>
      </Modal>

      {/* ---------- expense detail ---------- */}
      <Modal open={!!selected} onClose={() => setSelectedId(null)} title={selected?.title ?? ""} wide>
        {selected && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              {[["Amount", fmt(selected.amount)], ["Category", selected.category], ["Date", prettyDate(selected.date)]].map(([k, v]) => (
                <div key={k} className="rounded-2xl bg-stone-50 p-3"><p className="text-xs text-stone-500">{k}</p><p className="mt-1 font-medium">{v}</p></div>
              ))}
            </div>
            {selected.vendor && <p className="text-sm text-stone-600">Vendor: <b>{selected.vendor}</b></p>}

            <div>
              <p className="mb-2 text-sm font-medium">Proof of work</p>
              {selectedPost ? (
                <div className="rounded-2xl border border-stone-100 p-3">
                  {selectedPost.image && <img src={selectedPost.image} alt="" className="mb-3 h-48 w-full rounded-xl object-cover" />}
                  <p className="text-sm text-stone-700">{selectedPost.text}</p>
                  <p className="mt-2 text-xs text-stone-400">Posted by {selectedPost.author} · {prettyDate(selectedPost.date)}</p>
                </div>
              ) : (
                <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">
                  <p>No proof is attached to this expense yet.</p>
                  {isAdmin && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <select defaultValue="" onChange={(e) => e.target.value && linkProof(selected.id, Number(e.target.value))} className={inputClass}>
                        <option value="">Link an existing proof post…</option>
                        {proofPosts.map((p) => <option key={p.id} value={p.id}>{p.text.slice(0, 40)}…</option>)}
                      </select>
                      <Link to="/proof" className="rounded-full bg-stone-900 px-4 py-2 text-xs text-white">Post new proof</Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
