import { addDays, addMonths, today } from "../utils/dates.js";

export const MIN_DAILY = 50;        // smallest daily saving a plan can commit to (KES)
export const MAX_DEPOSIT = 100000;  // sanity cap for one deposit (KES)
export const QUICK_DAILY = [50, 100, 200, 500];

export const PLAN_PERIODS = [
  { id: "quarterly", label: "Quarterly", months: 3, note: "Every 3 months" },
  { id: "semiannual", label: "Semi-annually", months: 6, note: "Every 6 months" },
  { id: "annual", label: "Annually", months: 12, note: "Every 12 months" },
];
export const periodOf = (id) => PLAN_PERIODS.find((p) => p.id === id) ?? PLAN_PERIODS[0];

export const SAVINGS_RULES = [
  "Save at least KES 50 a day. You can add more, or catch up on days you missed.",
  "Your savings stay locked until the plan matures, so you cannot dip into them early.",
  "On the maturity date you withdraw everything you saved, straight to M-Pesa.",
  "Savings are personal. They are not part of the group fund balance.",
];

// Demo plan: started 45 days ago, a few days missed, nothing saved yet today.
function seedPlan() {
  const startDate = addDays(today(), -45);
  const skipped = new Set([3, 10, 17, 20, 24, 31, 38, 45]);
  const deposits = [];
  for (let i = 0; i < 45; i++) {
    if (skipped.has(i)) continue;
    deposits.unshift({ id: 9000 + i, date: addDays(startDate, i), amount: 100, ref: "SV" + (40100 + i * 7) });
  }
  return {
    id: 1, name: "School fees", dailyAmount: 100, periodId: "semiannual", months: 6,
    startDate, maturityDate: addMonths(startDate, 6), deposits, status: "active",
    withdrawnOn: null, withdrawnAmount: 0,
  };
}
export const seedSavings = [seedPlan()];
