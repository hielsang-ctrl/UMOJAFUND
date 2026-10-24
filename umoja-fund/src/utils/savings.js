import { addDays, daysBetween, today } from "./dates.js";

const sum = (xs) => xs.reduce((s, x) => s + x.amount, 0);

/** Everything the Savings page needs to know about one plan, worked out from its deposits. */
export function planStats(plan, now = today()) {
  const totalDays = daysBetween(plan.startDate, plan.maturityDate);
  const target = plan.dailyAmount * totalDays;
  const saved = sum(plan.deposits);
  const matured = now >= plan.maturityDate;

  // days that have started so far, today included
  const elapsed = Math.min(totalDays, Math.max(0, daysBetween(plan.startDate, now) + 1));
  const expected = plan.dailyAmount * elapsed;
  const behind = Math.max(0, expected - saved);
  const savedToday = sum(plan.deposits.filter((d) => d.date === now));

  // only today is outstanding -> "due"; older days missing too -> "behind"
  const before = plan.dailyAmount * Math.max(0, elapsed - 1);
  const pace = matured ? "matured" : saved >= expected ? "ontrack" : saved >= before ? "due" : "behind";

  return {
    totalDays, target, saved, matured, elapsed, expected, behind, savedToday, pace,
    pct: target ? Math.min(100, (saved / target) * 100) : 0,
    daysLeft: Math.max(0, daysBetween(now, plan.maturityDate)),
    daysSaved: new Set(plan.deposits.map((d) => d.date)).size,
    canDeposit: plan.status === "active" && !matured,
    canWithdraw: plan.status === "active" && matured && saved > 0,
  };
}

/**
 * A Monday-to-Sunday calendar grid of `weeks` weeks ending with the current week.
 * Each cell is "met" (saved the daily amount), "part", "missed", or "off" (outside the plan or in the future).
 */
export function monthGrid(plan, weeks = 5, now = today()) {
  const weekdayIndex = (new Date(now + "T00:00:00").getDay() + 6) % 7; // Monday = 0
  const last = addDays(now, 6 - weekdayIndex);
  const count = weeks * 7;

  const byDay = new Map();
  plan.deposits.forEach((d) => byDay.set(d.date, (byDay.get(d.date) || 0) + d.amount));

  return Array.from({ length: count }, (_, i) => {
    const date = addDays(last, i - (count - 1));
    const amount = byDay.get(date) || 0;
    const live = date >= plan.startDate && date < plan.maturityDate && date <= now;
    return {
      date, amount, isToday: date === now,
      state: !live ? "off" : amount >= plan.dailyAmount ? "met" : amount > 0 ? "part" : "missed",
    };
  });
}
