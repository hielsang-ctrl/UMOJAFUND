import { useRef, useState } from "react";
import usePersistedState from "../hooks/usePersistedState.js";
import { Banknote, CheckCircle2, Hourglass, Loader2, PiggyBank, Smartphone, Users } from "lucide-react";
import Card from "../components/ui/Card.jsx";
import CardHeader from "../components/ui/CardHeader.jsx";
import StatCard from "../components/ui/StatCard.jsx";
import Avatar from "../components/ui/Avatar.jsx";
import PageHeader from "../components/ui/PageHeader.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import Modal from "../components/ui/Modal.jsx";
import FilterChips from "../components/ui/FilterChips.jsx";
import SearchBar from "../components/ui/SearchBar.jsx";
import Button, { inputClass } from "../components/ui/Button.jsx";
import { ProgressBar, ProgressRing } from "../components/ui/Progress.jsx";
import { useFund } from "../context/FundContext.jsx";
import { TARGET_PER_MEMBER as TARGET } from "../data/seedData.js";
import { MPESA_INFO } from "../data/extraData.js";
import { displayPhone, normalisePhone, requestStkPush } from "../services/mpesa.js";
import { prettyDate } from "../utils/dates.js";
import { fmt } from "../utils/formatters.js";

const STEPS = [
  { id: "sending", label: "Request sent" },
  { id: "awaiting", label: "Enter PIN" },
  { id: "confirmed", label: "Confirmed" },
];

export default function ContributionsPage() {
  const { members, payments, totals, isAdmin, recordPayment } = useFund();

  /* list controls */
  const [filter, setFilter] = usePersistedState("contrib.filter", "all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = usePersistedState("contrib.sort", "name");
  const [method, setMethod] = usePersistedState("contrib.method", "all");

  /* M-Pesa form + flow */
  const firstPending = members.find((m) => m.paid < TARGET) || members[0];
  const [form, setForm] = useState({ memberId: firstPending?.id ?? "", phone: "", amount: "" });
  const [pay, setPay] = useState({ open: false, stage: null, receipt: null });
  const abortRef = useRef(null);
  const formRef = useRef(null);

  /* admin cash payment */
  const [cash, setCash] = useState(null); // { member, amount }

  /* ---- derived ---- */
  const paidIn = (m) => m.paid >= TARGET;
  const counts = {
    all: members.length,
    paid: members.filter(paidIn).length,
    partial: members.filter((m) => m.paid > 0 && !paidIn(m)).length,
    pending: members.filter((m) => m.paid === 0).length,
  };
  const outstanding = Math.max(0, totals.expected - totals.collected);
  const pct = totals.percent; // 0 (never NaN) when there are no members
  const mpesaTotal = payments.filter((p) => p.method === "M-Pesa").reduce((s, p) => s + p.amount, 0);
  const mpesaShare = totals.collected ? Math.round((mpesaTotal / totals.collected) * 100) : 0;

  const list = members
    .filter((m) => (filter === "all" ? true : filter === "paid" ? paidIn(m) : filter === "partial" ? m.paid > 0 && !paidIn(m) : m.paid === 0))
    .filter((m) => m.name.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => (sort === "name" ? a.name.localeCompare(b.name) : sort === "paid" ? b.paid - a.paid : a.paid - b.paid));

  const history = payments.filter((p) => method === "all" || p.method === method);
  const historyTotal = history.reduce((s, p) => s + p.amount, 0);

  /* ---- M-Pesa form state ---- */
  const member = members.find((m) => m.id === Number(form.memberId));
  const remaining = member ? Math.max(0, TARGET - member.paid) : 0;
  const phone = normalisePhone(form.phone);
  const amount = Number(form.amount);
  const phoneError = form.phone && !phone ? "Enter a valid Safaricom number, e.g. 0712 345 678" : "";
  const amountError = form.amount && (amount < 10 ? "Minimum is KES 10" : amount > remaining ? `Maximum is ${fmt(remaining)} (what is left for ${member?.name.split(" ")[0]})` : "");
  const canPay = member && remaining > 0 && phone && amount >= 10 && amount <= remaining;

  const choose = (m) => {
    setForm({ memberId: m.id, phone: m.phone, amount: String(Math.max(0, TARGET - m.paid)) });
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const startPay = async () => {
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setPay({ open: true, stage: "sending", receipt: null });
    try {
      const res = await requestStkPush({ phone, amount, accountRef: member.name }, (stage) => setPay((p) => ({ ...p, stage })), ctrl.signal);
      recordPayment(member.id, amount, { method: "M-Pesa", ref: res.receipt });
      setPay({ open: true, stage: "confirmed", receipt: { ...res, name: member.name } });
      setForm((f) => ({ ...f, amount: "" }));
    } catch (err) {
      setPay(err.message === "cancelled" ? { open: false, stage: null, receipt: null } : { open: true, stage: "error", receipt: null });
    }
  };
  const closePay = () => {
    if (pay.stage === "sending" || pay.stage === "awaiting") abortRef.current?.abort();
    else setPay({ open: false, stage: null, receipt: null });
  };

  const saveCash = () => {
    const v = Number(cash.amount);
    if (v > 0 && v <= TARGET - cash.member.paid) {
      recordPayment(cash.member.id, v, { method: "Cash" });
      setCash(null);
    }
  };

  const stageIndex = STEPS.findIndex((s) => s.id === pay.stage);

  return (
    <>
      <PageHeader title="Contributions" subtitle="Pay your share, see who has paid and track every payment." />

      <div className="space-y-4">
        {/* ---------- stats ---------- */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total collected" value={fmt(totals.collected)} sub={`${Math.round(pct)}% of ${fmt(totals.expected)}`} icon={PiggyBank} />
          <StatCard label="Still to collect" value={fmt(outstanding)} sub={`${members.length - counts.paid} members yet to complete`} icon={Hourglass} />
          <StatCard label="Paid in full" value={`${counts.paid} / ${members.length}`} sub={`${counts.partial} partial · ${counts.pending} not paid`} icon={Users} />
          <StatCard label="Paid via M-Pesa" value={`${mpesaShare}%`} sub={`${fmt(mpesaTotal)} of all payments`} icon={Smartphone} dark />
        </div>

        <div className="grid gap-4 lg:grid-cols-12">
          {/* ---------- members ---------- */}
          <Card className="lg:col-span-7">
            <CardHeader title="Members" subtitle={`Target ${fmt(TARGET)} each`} />
            <div className="mb-4 space-y-3">
              <div className="flex flex-wrap gap-2">
                <SearchBar value={query} onChange={setQuery} placeholder="Search members" className="min-w-[10rem] flex-1" />
                <select value={sort} onChange={(e) => setSort(e.target.value)} className={inputClass} aria-label="Sort members">
                  <option value="name">Sort: Name</option>
                  <option value="paid">Sort: Most paid</option>
                  <option value="least">Sort: Least paid</option>
                </select>
              </div>
              <FilterChips value={filter} onChange={setFilter}
                options={[{ id: "all", label: "All", count: counts.all }, { id: "paid", label: "Paid", count: counts.paid },
                  { id: "partial", label: "Partial", count: counts.partial }, { id: "pending", label: "Not paid", count: counts.pending }]} />
            </div>

            <ul className="divide-y divide-stone-100">
              {list.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center gap-3 py-3">
                  <Avatar name={m.name} index={m.id} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{m.name}</p>
                    <div className="mt-1 flex items-center gap-3">
                      <div className="w-28"><ProgressBar value={(m.paid / TARGET) * 100} /></div>
                      <span className="text-xs text-stone-500">{fmt(m.paid)} / {fmt(TARGET)}</span>
                    </div>
                  </div>
                  <StatusBadge paid={m.paid} />
                  {!paidIn(m) && (
                    <div className="flex gap-1.5">
                      <button onClick={() => choose(m)} className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1.5 text-xs text-white hover:bg-emerald-700">
                        <Smartphone size={12} /> Pay
                      </button>
                      {isAdmin && (
                        <button onClick={() => setCash({ member: m, amount: String(TARGET - m.paid) })} className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-200">
                          <Banknote size={12} /> Cash
                        </button>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
            {!list.length && <p className="py-8 text-center text-sm text-stone-500">No members match your filters.</p>}
          </Card>

          {/* ---------- M-Pesa + progress ---------- */}
          <div className="space-y-4 lg:col-span-5">
            <Card>
              <div ref={formRef} />
              <CardHeader title="Pay with M-Pesa" subtitle="You will get a prompt on your phone"
                right={<span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">M-PESA</span>} />
              <div className="space-y-3">
                <label className="block text-xs text-stone-500">Paying for
                  <select value={form.memberId} onChange={(e) => setForm({ ...form, memberId: e.target.value, amount: "" })} className={`${inputClass} mt-1 w-full`}>
                    {members.map((m) => <option key={m.id} value={m.id}>{m.name} · {paidIn(m) ? "paid in full" : `${fmt(TARGET - m.paid)} left`}</option>)}
                  </select>
                </label>

                <label className="block text-xs text-stone-500">M-Pesa phone number
                  <div className="mt-1 flex">
                    <span className="flex items-center rounded-l-xl border border-r-0 border-stone-200 bg-stone-100 px-3 text-sm text-stone-600">+254</span>
                    <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} inputMode="tel" placeholder="712 345 678"
                      className={`${inputClass} w-full rounded-l-none`} />
                  </div>
                  {phoneError && <span className="mt-1 block text-rose-600">{phoneError}</span>}
                </label>

                <label className="block text-xs text-stone-500">Amount (KES)
                  <input type="number" min="10" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="e.g. 1000" className={`${inputClass} mt-1 w-full`} />
                  {amountError && <span className="mt-1 block text-rose-600">{amountError}</span>}
                </label>

                {remaining > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {[...new Set([500, 1000, 2500, remaining].filter((v) => v <= remaining))].map((v) => (
                      <button key={v} onClick={() => setForm({ ...form, amount: String(v) })}
                        className="rounded-full bg-stone-100 px-3 py-1 text-xs text-stone-600 hover:bg-stone-200">
                        {v === remaining ? `Full balance ${fmt(v)}` : fmt(v)}
                      </button>
                    ))}
                  </div>
                )}

                <button disabled={!canPay} onClick={startPay}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-400">
                  <Smartphone size={16} />
                  {remaining === 0 ? "Fully paid" : canPay ? `Pay ${fmt(amount)} via M-Pesa` : "Pay via M-Pesa"}
                </button>
              </div>

              <div className="mt-4 rounded-2xl bg-stone-50 p-3 text-xs text-stone-500">
                <p className="font-medium text-stone-700">Prefer to pay manually?</p>
                <p className="mt-1">Paybill <b className="text-stone-800">{MPESA_INFO.paybill}</b> · Account <b className="text-stone-800">{MPESA_INFO.account}</b></p>
                <p className="mt-1">Then tell the admin so the payment can be recorded.</p>
              </div>
              <p className="mt-3 text-[11px] text-stone-400">Demo mode: no real money moves. See src/services/mpesa.js to connect the live Daraja API.</p>
            </Card>

            <Card className="flex items-center gap-5">
              <ProgressRing value={pct} size={100} />
              <div>
                <p className="font-medium">Overall progress</p>
                <p className="mt-1 text-sm text-stone-500">{fmt(totals.collected)} of {fmt(totals.expected)}</p>
                <p className="mt-1 text-xs text-stone-400">{fmt(outstanding)} to go</p>
              </div>
            </Card>
          </div>
        </div>

        {/* ---------- payment history ---------- */}
        <Card>
          <CardHeader title="Payment history" subtitle={`${history.length} payments · ${fmt(historyTotal)}`}
            right={<FilterChips value={method} onChange={setMethod} options={[{ id: "all", label: "All" }, { id: "M-Pesa", label: "M-Pesa" }, { id: "Cash", label: "Cash" }]} />} />
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-stone-400">
                <tr>
                  <th className="py-2 pr-4 font-normal">Member</th>
                  <th className="py-2 pr-4 font-normal">Date</th>
                  <th className="py-2 pr-4 font-normal">Reference</th>
                  <th className="py-2 pr-4 font-normal">Method</th>
                  <th className="py-2 text-right font-normal">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {history.map((p) => (
                  <tr key={p.id}>
                    <td className="py-3 pr-4"><span className="flex items-center gap-2"><Avatar name={p.name} index={p.memberId} size="h-8 w-8" /><span className="font-medium">{p.name}</span></span></td>
                    <td className="py-3 pr-4 text-stone-500">{prettyDate(p.date)}</td>
                    <td className="py-3 pr-4 font-mono text-xs text-stone-500">{p.ref}</td>
                    <td className="py-3 pr-4">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs ${p.method === "M-Pesa" ? "bg-emerald-50 text-emerald-700" : "bg-stone-100 text-stone-600"}`}>{p.method}</span>
                    </td>
                    <td className="py-3 text-right font-medium">{fmt(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!history.length && <p className="py-8 text-center text-sm text-stone-500">No payments yet.</p>}
        </Card>
      </div>

      {/* ---------- M-Pesa modal ---------- */}
      <Modal open={pay.open} onClose={closePay} title="M-Pesa payment">
        {pay.stage === "error" ? (
          <div className="text-center">
            <p className="font-medium text-rose-600">The payment could not be completed</p>
            <p className="mt-1 text-sm text-stone-500">Nothing was charged. Please try again.</p>
            <Button className="mt-4" onClick={closePay}>Close</Button>
          </div>
        ) : (
          <>
            <ol className="mb-5 flex items-center gap-2">
              {STEPS.map((s, i) => (
                <li key={s.id} className="flex flex-1 flex-col items-center gap-1">
                  <span className={`h-1.5 w-full rounded-full ${i <= stageIndex ? "bg-emerald-600" : "bg-stone-200"}`} />
                  <span className={`text-[11px] ${i <= stageIndex ? "text-emerald-700" : "text-stone-400"}`}>{s.label}</span>
                </li>
              ))}
            </ol>

            {pay.stage === "sending" && (
              <div className="py-4 text-center">
                <Loader2 className="mx-auto animate-spin text-emerald-600" size={36} />
                <p className="mt-3 font-medium">Sending request…</p>
                <p className="text-sm text-stone-500">Contacting M-Pesa for {phone && displayPhone(phone)}</p>
              </div>
            )}
            {pay.stage === "awaiting" && (
              <div className="py-4 text-center">
                <Smartphone className="mx-auto text-emerald-600" size={36} />
                <p className="mt-3 font-medium">Check your phone</p>
                <p className="mx-auto max-w-xs text-sm text-stone-500">Enter your M-Pesa PIN to pay <b>{fmt(amount)}</b> to {MPESA_INFO.name}.</p>
                <Button className="mt-4 bg-stone-100 !text-stone-700 hover:!bg-stone-200" onClick={closePay}>Cancel payment</Button>
              </div>
            )}
            {pay.stage === "confirmed" && pay.receipt && (
              <div className="py-2 text-center">
                <CheckCircle2 className="mx-auto text-emerald-600" size={40} />
                <p className="mt-2 text-lg font-medium">Payment confirmed</p>
                <dl className="mt-4 space-y-2 rounded-2xl bg-stone-50 p-4 text-left text-sm">
                  {[["Receipt", pay.receipt.receipt], ["Amount", fmt(pay.receipt.amount)], ["For", pay.receipt.name], ["From", displayPhone(pay.receipt.phone)]].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-3"><dt className="text-stone-500">{k}</dt><dd className="font-medium">{v}</dd></div>
                  ))}
                </dl>
                <Button className="mt-4" onClick={closePay}>Done</Button>
              </div>
            )}
          </>
        )}
      </Modal>

      {/* ---------- cash modal (admin) ---------- */}
      <Modal open={!!cash} onClose={() => setCash(null)} title="Record cash payment">
        {cash && (
          <div className="space-y-3">
            <p className="text-sm text-stone-600">{cash.member.name} still owes <b>{fmt(TARGET - cash.member.paid)}</b>.</p>
            <input type="number" min="1" max={TARGET - cash.member.paid} value={cash.amount} onChange={(e) => setCash({ ...cash, amount: e.target.value })} className={`${inputClass} w-full`} />
            {Number(cash.amount) > TARGET - cash.member.paid && <p className="text-xs text-rose-600">That is more than the balance owed.</p>}
            <Button onClick={saveCash}><Banknote size={14} /> Record payment</Button>
          </div>
        )}
      </Modal>
    </>
  );
}
