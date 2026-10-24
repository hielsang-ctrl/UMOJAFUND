import { useEffect, useRef, useState } from "react";
import { Banknote, CalendarClock, CheckCircle2, Coins, Loader2, Lock, PiggyBank, Plus, ShieldCheck, Smartphone, Wallet } from "lucide-react";
import Card from "../components/ui/Card.jsx";
import CardHeader from "../components/ui/CardHeader.jsx";
import StatCard from "../components/ui/StatCard.jsx";
import PageHeader from "../components/ui/PageHeader.jsx";
import Modal from "../components/ui/Modal.jsx";
import FilterChips from "../components/ui/FilterChips.jsx";
import Button, { inputClass } from "../components/ui/Button.jsx";
import { useFund } from "../context/FundContext.jsx";
import { MAX_DEPOSIT, MIN_DAILY, PLAN_PERIODS, QUICK_DAILY, SAVINGS_RULES, periodOf } from "../data/savingsData.js";
import { displayPhone, normalisePhone, requestPayout, requestStkPush } from "../services/mpesa.js";
import { addMonths, daysBetween, prettyDate, today } from "../utils/dates.js";
import { fmt } from "../utils/formatters.js";
import { monthGrid, planStats } from "../utils/savings.js";

const DEPOSIT_STEPS = [
  { id: "sending", label: "Request sent" },
  { id: "awaiting", label: "Enter PIN" },
  { id: "confirmed", label: "Confirmed" },
];
const PAYOUT_STEPS = [
  { id: "sending", label: "Request received" },
  { id: "processing", label: "Sending" },
  { id: "confirmed", label: "Sent" },
];
const BUSY = ["sending", "awaiting", "processing"];

const PACE = {
  ontrack: { label: "On track", dot: "bg-emerald-400" },
  due: { label: "Today's saving due", dot: "bg-amber-400" },
  behind: { label: "Behind schedule", dot: "bg-rose-400" },
  matured: { label: "Matured", dot: "bg-emerald-400" },
};
const CELL = {
  met: "bg-accent text-white",
  part: "bg-orange-300 text-white",
  missed: "bg-stone-200 text-stone-500",
  off: "bg-stone-50 text-stone-300",
};
const BLANK_PLAN = { name: "", daily: "100", periodId: "semiannual" };
const whole = (v) => Number.isInteger(v);
const heroBtn = "inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-stone-500";

export default function SavingsPage() {
  const { savings, createSavingsPlan, depositSavings, withdrawSavings } = useFund();
  const now = today();

  const [selectedId, setSelectedId] = useState(null);
  const [newOpen, setNewOpen] = useState(false);
  const [np, setNp] = useState(BLANK_PLAN);
  const [flow, setFlow] = useState(null); // { kind: "deposit" | "withdraw", stage, receipt }
  const [phoneText, setPhoneText] = useState("");
  const [depAmount, setDepAmount] = useState("");
  const [showAll, setShowAll] = useState(false);
  const abortRef = useRef(null);
  useEffect(() => () => abortRef.current?.abort(), []);

  /* ---- which plan is on screen ---- */
  const plan = savings.find((p) => p.id === selectedId) ?? savings.find((p) => p.status === "active") ?? savings[0];
  const st = plan ? planStats(plan, now) : null;
  const period = plan ? periodOf(plan.periodId) : null;
  const pace = !plan ? null : plan.status === "withdrawn" ? { label: "Withdrawn", dot: "bg-stone-400" } : PACE[st.pace];

  /* ---- totals across plans ---- */
  const active = savings.filter((p) => p.status === "active").map((p) => ({ p, s: planStats(p, now) }));
  const totalSaved = active.reduce((t, x) => t + x.s.saved, 0);
  const savedToday = active.reduce((t, x) => t + x.s.savedToday, 0);
  const stillDue = active.reduce((t, x) => t + (x.s.matured ? 0 : x.s.behind), 0);
  const withdrawn = savings.reduce((t, p) => t + p.withdrawnAmount, 0);
  const next = [...active].sort((a, b) => a.p.maturityDate.localeCompare(b.p.maturityDate))[0];

  /* ---- new plan form ---- */
  const dailyNum = Number(np.daily);
  const dailyOk = np.daily !== "" && whole(dailyNum) && dailyNum >= MIN_DAILY && dailyNum <= MAX_DEPOSIT;
  const dailyError = np.daily === "" ? "" : !whole(dailyNum) ? "Use a whole number of shillings" : dailyNum < MIN_DAILY ? `The minimum is ${fmt(MIN_DAILY)} a day` : dailyNum > MAX_DEPOSIT ? `The maximum is ${fmt(MAX_DEPOSIT)}` : "";
  const chosen = periodOf(np.periodId);
  const spanDays = (months) => daysBetween(now, addMonths(now, months));

  const startPlan = () => {
    if (!dailyOk) return;
    const id = createSavingsPlan({ name: np.name, dailyAmount: dailyNum, periodId: np.periodId });
    setSelectedId(id);
    setNewOpen(false);
  };

  /* ---- M-Pesa deposit / payout form ---- */
  const phone = normalisePhone(phoneText);
  const phoneError = phoneText && !phone ? "Enter a valid Safaricom number, e.g. 0712 345 678" : "";
  const amt = Number(depAmount);
  const amtError = depAmount === "" ? "" : !whole(amt) ? "Use a whole number of shillings" : amt < MIN_DAILY ? `Minimum is ${fmt(MIN_DAILY)}` : amt > MAX_DEPOSIT ? `Maximum is ${fmt(MAX_DEPOSIT)} per deposit` : "";
  const canDeposit = !!st?.canDeposit && !!phone && whole(amt) && amt >= MIN_DAILY && amt <= MAX_DEPOSIT;
  const canPayout = !!st?.canWithdraw && !!phone;

  const openDeposit = () => {
    setDepAmount(String(st.behind > 0 ? st.behind : plan.dailyAmount));
    setFlow({ kind: "deposit", stage: null, receipt: null });
  };
  const openWithdraw = () => setFlow({ kind: "withdraw", stage: null, receipt: null });

  const run = async () => {
    const kind = flow.kind;
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const onStage = (stage) => setFlow((f) => f && { ...f, stage });
    setFlow({ kind, stage: "sending", receipt: null });
    try {
      if (kind === "deposit") {
        const res = await requestStkPush({ phone, amount: amt, accountRef: plan.name }, onStage, ctrl.signal);
        depositSavings(plan.id, amt, { ref: res.receipt });
        setFlow({ kind, stage: "confirmed", receipt: { ...res, name: plan.name } });
      } else {
        const res = await requestPayout({ phone, amount: st.saved, reference: plan.name }, onStage, ctrl.signal);
        withdrawSavings(plan.id);
        setFlow({ kind, stage: "confirmed", receipt: { ...res, name: plan.name } });
      }
    } catch (err) {
      setFlow(err.message === "cancelled" ? null : { kind, stage: "error", receipt: null });
    }
  };
  const closeFlow = () => {
    if (!flow) return;
    if (BUSY.includes(flow.stage)) {
      if (flow.kind === "deposit") abortRef.current?.abort(); // a payout already on its way cannot be cancelled
    } else setFlow(null);
  };

  const steps = flow?.kind === "withdraw" ? PAYOUT_STEPS : DEPOSIT_STEPS;
  const stageIndex = steps.findIndex((s) => s.id === flow?.stage);
  const grid = plan ? monthGrid(plan, 5, now) : [];
  const shown = plan ? (showAll ? plan.deposits : plan.deposits.slice(0, 8)) : [];

  const note = !plan ? "" : plan.status === "withdrawn" ? `You withdrew ${fmt(plan.withdrawnAmount)} on ${prettyDate(plan.withdrawnOn)}.`
    : st.matured ? `Your plan has matured. You can now withdraw ${fmt(st.saved)}.`
    : st.pace === "behind" ? `You are ${fmt(st.behind)} behind plan, including today. Add it any time to catch up.`
    : st.pace === "due" ? `Today's saving of ${fmt(st.behind)} is still to come.`
    : "You have saved enough for today. The next saving is due tomorrow.";

  return (
    <>
      <PageHeader title="Savings" subtitle="Save at least KES 50 a day and withdraw when your plan matures."
        action={<Button onClick={() => { setNp(BLANK_PLAN); setNewOpen(true); }}><Plus size={14} /> New savings plan</Button>} />

      <div className="space-y-4">
        {/* ---------- stats ---------- */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total saved" value={fmt(totalSaved)} sub={`${active.length} active plan${active.length === 1 ? "" : "s"}`} icon={PiggyBank} />
          <StatCard label="Saved today" value={fmt(savedToday)} sub={!active.length ? "No active plan" : stillDue > 0 ? `${fmt(stillDue)} still due` : "You are on track"} icon={Coins} dark />
          <StatCard label="Next withdrawal" value={next ? prettyDate(next.p.maturityDate) : "None"}
            sub={next ? (next.s.matured ? "Ready to withdraw now" : `${next.s.daysLeft} day${next.s.daysLeft === 1 ? "" : "s"} to go`) : "Start a plan to set a date"} icon={CalendarClock} />
          <StatCard label="Withdrawn so far" value={fmt(withdrawn)} sub={`${savings.filter((p) => p.status === "withdrawn").length} plan(s) paid out`} icon={Wallet} />
        </div>

        {savings.length > 1 && (
          <FilterChips value={plan?.id} onChange={(id) => { setSelectedId(id); setShowAll(false); }}
            options={savings.map((p) => ({ id: p.id, label: p.status === "withdrawn" ? `${p.name} (paid out)` : p.name }))} />
        )}

        {!plan ? (
          /* ---------- empty state ---------- */
          <Card className="flex flex-col items-center gap-3 py-12 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-stone-100"><PiggyBank size={24} /></span>
            <p className="text-lg font-medium">Start your first savings plan</p>
            <p className="max-w-sm text-sm text-stone-500">Pick a daily amount of KES 50 or more and a lock period. On the maturity date you withdraw everything you saved.</p>
            <Button className="mt-2" onClick={() => { setNp(BLANK_PLAN); setNewOpen(true); }}><Plus size={14} /> New savings plan</Button>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 lg:grid-cols-12">
              {/* ---------- plan overview ---------- */}
              <Card dark className="flex flex-col justify-between gap-8 lg:col-span-7">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs text-stone-300">
                      <span className={`h-2 w-2 rounded-full ${pace.dot}`} /> {pace.label}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs text-stone-300">
                      <CalendarClock size={12} /> {period.label} plan
                    </span>
                  </div>
                  <h2 className="mt-5 text-3xl font-medium tracking-tight sm:text-4xl">{plan.name}</h2>
                  <p className="mt-4 text-sm text-stone-400">Saved so far</p>
                  <p className="text-4xl font-medium tracking-tight">{fmt(st.saved)}</p>
                  <div className="mt-4 h-2 w-full rounded-full bg-white/10">
                    <div className="h-2 rounded-full bg-accent" style={{ width: `${st.pct}%` }} />
                  </div>
                  <p className="mt-2 flex justify-between gap-3 text-xs text-stone-400">
                    <span>{Math.round(st.pct)}% of {fmt(st.target)} goal</span>
                    <span>{st.daysSaved} days with a saving</span>
                  </p>
                  <p className="mt-4 rounded-2xl bg-white/10 px-4 py-3 text-sm text-stone-200">{note}</p>
                </div>

                <div>
                  <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                    {[
                      ["Daily saving", fmt(plan.dailyAmount)],
                      ["Started", prettyDate(plan.startDate)],
                      ["Matures", prettyDate(plan.maturityDate)],
                      ["Time left", plan.status === "withdrawn" || st.matured ? "Matured" : `${st.daysLeft} day${st.daysLeft === 1 ? "" : "s"}`],
                    ].map(([k, v]) => (
                      <div key={k}><dt className="text-xs text-stone-400">{k}</dt><dd className="mt-0.5 font-medium">{v}</dd></div>
                    ))}
                  </dl>

                  {plan.status === "active" && (
                    <div className="mt-6 flex flex-wrap gap-2">
                      <button disabled={!st.canDeposit} onClick={openDeposit} className={`${heroBtn} bg-emerald-600 text-white hover:bg-emerald-700`}>
                        <Smartphone size={16} /> {st.behind > 0 ? `Save ${fmt(st.behind)}` : "Save more"}
                      </button>
                      <button disabled={!st.canWithdraw} onClick={openWithdraw} className={`${heroBtn} bg-white text-stone-900 hover:bg-stone-100`}>
                        {st.matured ? <Banknote size={16} /> : <Lock size={16} />}
                        {st.matured ? `Withdraw ${fmt(st.saved)}` : `Locked until ${prettyDate(plan.maturityDate)}`}
                      </button>
                    </div>
                  )}
                </div>
              </Card>

              {/* ---------- calendar ---------- */}
              <Card className="lg:col-span-5">
                <CardHeader title="Last 5 weeks" subtitle="Each square is a day. Today has an outline." />
                <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] text-stone-400">
                  {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <span key={i}>{d}</span>)}
                </div>
                <div className="mt-1.5 grid grid-cols-7 gap-1.5">
                  {grid.map((c) => (
                    <div key={c.date} title={`${prettyDate(c.date)}${c.amount ? ` · ${fmt(c.amount)}` : ""}`}
                      className={`flex aspect-square items-center justify-center rounded-xl text-xs ${CELL[c.state]} ${c.isToday ? "ring-2 ring-stone-900 ring-offset-2" : ""}`}>
                      {Number(c.date.slice(8))}
                    </div>
                  ))}
                </div>
                <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-500">
                  {[["bg-accent", "Saved the daily amount"], ["bg-orange-300", "Saved part of it"], ["bg-stone-200", "Missed"]].map(([dot, label]) => (
                    <li key={label} className="flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-full ${dot}`} /> {label}</li>
                  ))}
                </ul>
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-12">
              {/* ---------- deposits ---------- */}
              <Card className="lg:col-span-7">
                <CardHeader title="Deposits" subtitle={`${plan.deposits.length} deposit${plan.deposits.length === 1 ? "" : "s"} · ${fmt(st.saved)}`} />
                {plan.deposits.length ? (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="text-stone-400">
                          <tr>
                            <th className="py-2 pr-4 font-normal">Date</th>
                            <th className="py-2 pr-4 font-normal">Reference</th>
                            <th className="py-2 text-right font-normal">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                          {shown.map((d) => (
                            <tr key={d.id}>
                              <td className="py-3 pr-4 text-stone-500">{prettyDate(d.date)}</td>
                              <td className="py-3 pr-4 font-mono text-xs text-stone-500">{d.ref}</td>
                              <td className="py-3 text-right font-medium">{fmt(d.amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {plan.deposits.length > 8 && (
                      <button onClick={() => setShowAll(!showAll)} className="mt-3 rounded-full bg-stone-100 px-4 py-1.5 text-xs text-stone-600 hover:bg-stone-200">
                        {showAll ? "Show fewer" : `Show all ${plan.deposits.length}`}
                      </button>
                    )}
                  </>
                ) : (
                  <p className="py-8 text-center text-sm text-stone-500">No deposits yet. Use Save to make your first one.</p>
                )}
              </Card>

              <div className="space-y-4 lg:col-span-5">
                {/* ---------- what it adds up to ---------- */}
                <Card>
                  <CardHeader title="What it adds up to" subtitle={`Saving ${fmt(plan.dailyAmount)} every day from today`} />
                  <ul className="space-y-2">
                    {PLAN_PERIODS.map((p) => (
                      <li key={p.id} className={`flex items-center justify-between rounded-2xl px-4 py-3 text-sm ${p.id === plan.periodId ? "bg-stone-900 text-white" : "bg-stone-50"}`}>
                        <span>
                          <span className="font-medium">{p.label}</span>
                          <span className={`ml-2 text-xs ${p.id === plan.periodId ? "text-stone-300" : "text-stone-400"}`}>{p.months} months</span>
                        </span>
                        <span className="font-medium">{fmt(plan.dailyAmount * spanDays(p.months))}</span>
                      </li>
                    ))}
                  </ul>
                </Card>

                {/* ---------- rules ---------- */}
                <Card>
                  <CardHeader title="How savings work" />
                  <ul className="space-y-2.5">
                    {SAVINGS_RULES.map((r) => (
                      <li key={r} className="flex gap-2.5 text-sm text-stone-600">
                        <ShieldCheck size={16} className="mt-0.5 shrink-0 text-accent" /> <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-4 text-[11px] text-stone-400">Demo mode: no real money moves. See src/services/mpesa.js to connect the live Daraja API.</p>
                </Card>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ---------- new plan ---------- */}
      <Modal open={newOpen} onClose={() => setNewOpen(false)} title="New savings plan">
        <div className="space-y-4">
          <label className="block text-xs text-stone-500">Plan name (optional)
            <input value={np.name} maxLength={30} onChange={(e) => setNp({ ...np, name: e.target.value })} placeholder="e.g. School fees" className={`${inputClass} mt-1 w-full`} />
          </label>

          <div>
            <label className="block text-xs text-stone-500">Save each day (KES)
              <input type="number" min={MIN_DAILY} value={np.daily} onChange={(e) => setNp({ ...np, daily: e.target.value })} className={`${inputClass} mt-1 w-full`} />
              {dailyError && <span className="mt-1 block text-rose-600">{dailyError}</span>}
            </label>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {QUICK_DAILY.map((v) => (
                <button key={v} onClick={() => setNp({ ...np, daily: String(v) })} className="rounded-full bg-stone-100 px-3 py-1 text-xs text-stone-600 hover:bg-stone-200">{fmt(v)}</button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs text-stone-500">Withdraw after</p>
            <ul className="space-y-2">
              {PLAN_PERIODS.map((p) => {
                const on = np.periodId === p.id;
                return (
                  <li key={p.id}>
                    <button aria-pressed={on} onClick={() => setNp({ ...np, periodId: p.id })}
                      className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm transition ${on ? "bg-stone-900 text-white" : "bg-stone-50 hover:bg-stone-100"}`}>
                      <span><span className="font-medium">{p.label}</span><span className={`block text-xs ${on ? "text-stone-300" : "text-stone-400"}`}>{p.note}</span></span>
                      <span className="font-medium">{dailyOk ? fmt(dailyNum * spanDays(p.months)) : "–"}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {dailyOk && (
            <p className="rounded-2xl bg-stone-50 px-3 py-2 text-xs text-stone-600">
              Save {fmt(dailyNum)} a day and you can withdraw <b className="text-stone-800">{fmt(dailyNum * spanDays(chosen.months))}</b> on <b className="text-stone-800">{prettyDate(addMonths(now, chosen.months))}</b>. Until then it stays locked.
            </p>
          )}
          <Button disabled={!dailyOk} onClick={startPlan} className="disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-400"><PiggyBank size={14} /> Start plan</Button>
        </div>
      </Modal>

      {/* ---------- deposit / withdraw ---------- */}
      <Modal open={!!flow && !!plan} onClose={closeFlow} title={flow?.kind === "withdraw" ? "Withdraw savings" : "Save with M-Pesa"}>
        {flow && plan && (
          flow.stage === "error" ? (
            <div className="text-center">
              <p className="font-medium text-rose-600">{flow.kind === "withdraw" ? "The withdrawal could not be completed" : "The payment could not be completed"}</p>
              <p className="mt-1 text-sm text-stone-500">{flow.kind === "withdraw" ? "Your savings are still safe in the plan. Please try again." : "Nothing was charged. Please try again."}</p>
              <Button className="mt-4" onClick={() => setFlow(null)}>Close</Button>
            </div>
          ) : flow.stage === null ? (
            <div className="space-y-3">
              {flow.kind === "deposit" ? (
                <>
                  <p className="rounded-2xl bg-stone-50 px-3 py-2 text-xs text-stone-500">Saving into <b className="text-stone-800">{plan.name}</b>. Locked until {prettyDate(plan.maturityDate)}.</p>
                  <label className="block text-xs text-stone-500">Amount (KES)
                    <input type="number" min={MIN_DAILY} value={depAmount} onChange={(e) => setDepAmount(e.target.value)} className={`${inputClass} mt-1 w-full`} />
                    {amtError && <span className="mt-1 block text-rose-600">{amtError}</span>}
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {[...new Set([plan.dailyAmount, st.behind > plan.dailyAmount ? st.behind : null, plan.dailyAmount * 7].filter(Boolean))].map((v) => (
                      <button key={v} onClick={() => setDepAmount(String(v))} className="rounded-full bg-stone-100 px-3 py-1 text-xs text-stone-600 hover:bg-stone-200">
                        {v === st.behind && v > plan.dailyAmount ? `Catch up ${fmt(v)}` : v === plan.dailyAmount * 7 ? `A week ${fmt(v)}` : `Today ${fmt(v)}`}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <p className="rounded-2xl bg-stone-50 px-3 py-2 text-xs text-stone-500">You are withdrawing everything saved in <b className="text-stone-800">{plan.name}</b>. This closes the plan.</p>
                  <div className="rounded-2xl bg-stone-50 p-4 text-center">
                    <p className="text-xs text-stone-500">You will receive</p>
                    <p className="mt-1 text-3xl font-medium tracking-tight">{fmt(st.saved)}</p>
                  </div>
                </>
              )}
              <label className="block text-xs text-stone-500">{flow.kind === "withdraw" ? "Send to this M-Pesa number" : "M-Pesa phone number"}
                <div className="mt-1 flex">
                  <span className="flex items-center rounded-l-xl border border-r-0 border-stone-200 bg-stone-100 px-3 text-sm text-stone-600">+254</span>
                  <input value={phoneText} onChange={(e) => setPhoneText(e.target.value)} inputMode="tel" placeholder="712 345 678" className={`${inputClass} w-full rounded-l-none`} />
                </div>
                {phoneError && <span className="mt-1 block text-rose-600">{phoneError}</span>}
              </label>
              <button disabled={flow.kind === "withdraw" ? !canPayout : !canDeposit} onClick={run}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-400">
                {flow.kind === "withdraw" ? <Banknote size={16} /> : <Smartphone size={16} />}
                {flow.kind === "withdraw" ? `Withdraw ${fmt(st.saved)} to M-Pesa` : canDeposit ? `Save ${fmt(amt)} via M-Pesa` : "Save via M-Pesa"}
              </button>
            </div>
          ) : (
            <>
              <ol className="mb-5 flex items-center gap-2">
                {steps.map((s, i) => (
                  <li key={s.id} className="flex flex-1 flex-col items-center gap-1">
                    <span className={`h-1.5 w-full rounded-full ${i <= stageIndex ? "bg-emerald-600" : "bg-stone-200"}`} />
                    <span className={`text-[11px] ${i <= stageIndex ? "text-emerald-700" : "text-stone-400"}`}>{s.label}</span>
                  </li>
                ))}
              </ol>

              {flow.stage === "sending" && (
                <div className="py-4 text-center">
                  <Loader2 className="mx-auto animate-spin text-emerald-600" size={36} />
                  <p className="mt-3 font-medium">{flow.kind === "withdraw" ? "Sending your request…" : "Sending request…"}</p>
                  <p className="text-sm text-stone-500">Contacting M-Pesa for {phone && displayPhone(phone)}</p>
                </div>
              )}
              {flow.stage === "awaiting" && (
                <div className="py-4 text-center">
                  <Smartphone className="mx-auto text-emerald-600" size={36} />
                  <p className="mt-3 font-medium">Check your phone</p>
                  <p className="mx-auto max-w-xs text-sm text-stone-500">Enter your M-Pesa PIN to save <b>{fmt(amt)}</b> into {plan.name}.</p>
                  <Button className="mt-4 bg-stone-100 !text-stone-700 hover:!bg-stone-200" onClick={closeFlow}>Cancel payment</Button>
                </div>
              )}
              {flow.stage === "processing" && (
                <div className="py-4 text-center">
                  <Loader2 className="mx-auto animate-spin text-emerald-600" size={36} />
                  <p className="mt-3 font-medium">Sending your money…</p>
                  <p className="text-sm text-stone-500">This only takes a moment. Please keep this window open.</p>
                </div>
              )}
              {flow.stage === "confirmed" && flow.receipt && (
                <div className="py-2 text-center">
                  <CheckCircle2 className="mx-auto text-emerald-600" size={40} />
                  <p className="mt-2 text-lg font-medium">{flow.kind === "withdraw" ? "Withdrawal sent" : "Saving confirmed"}</p>
                  <dl className="mt-4 space-y-2 rounded-2xl bg-stone-50 p-4 text-left text-sm">
                    {[["Receipt", flow.receipt.receipt], ["Amount", fmt(flow.receipt.amount)], ["Plan", flow.receipt.name], [flow.kind === "withdraw" ? "To" : "From", displayPhone(flow.receipt.phone)]].map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-3"><dt className="text-stone-500">{k}</dt><dd className="font-medium">{v}</dd></div>
                    ))}
                  </dl>
                  <Button className="mt-4" onClick={() => setFlow(null)}>Done</Button>
                </div>
              )}
            </>
          )
        )}
      </Modal>
    </>
  );
}
