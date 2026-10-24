// All dates are ISO strings (YYYY-MM-DD) in the LOCAL timezone.
// (toISOString() is UTC, which would report yesterday between midnight and 3 AM in Kenya.)
const pad = (n) => String(n).padStart(2, "0");
const toDate = (iso) => new Date(iso + "T00:00:00");
export const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const today = () => toISO(new Date());
export const prettyDate = (iso) =>
  toDate(iso).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });

export const addDays = (iso, n) => {
  const d = toDate(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
};

// 31 Aug + 6 months lands on 28/29 Feb, not on 3 Mar
export const addMonths = (iso, n) => {
  const d = toDate(iso);
  const day = d.getDate();
  d.setMonth(d.getMonth() + n);
  if (d.getDate() !== day) d.setDate(0);
  return toISO(d);
};

export const daysBetween = (from, to) => Math.round((toDate(to) - toDate(from)) / 86400000);
