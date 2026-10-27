import { api } from "./api.js";

// Accepts 0712345678, 712345678, 254712345678, +254 712 345 678 -> "254712345678"
export function normalisePhone(input) {
  let n = String(input).replace(/\D/g, "");
  if (n.startsWith("254")) n = n.slice(3);
  else if (n.startsWith("0")) n = n.slice(1);
  return /^[17]\d{8}$/.test(n) ? "254" + n : null;
}

export const displayPhone = (p) => `+${p.slice(0, 3)} ${p.slice(3, 6)} ${p.slice(6, 9)} ${p.slice(9)}`;

const sleep = (ms, signal) =>
  new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => { clearTimeout(t); reject(new DOMException("cancelled", "AbortError")); }, { once: true });
  });

/**
 * After an STK Push is started, Safaricom confirms by calling the BACKEND, not the browser.
 * So we poll the backend until it has the answer. Resolves with { status, done, receipt, message }
 * where status is "success" | "cancelled" | "timeout" | "failed", or { timedOut: true } if still pending.
 */
export async function waitForPayment(checkoutId, { signal, intervalMs = 3000, maxMs = 120000 } = {}) {
  const started = Date.now();
  while (Date.now() - started < maxMs) {
    await sleep(intervalMs, signal);
    try {
      const s = await api(`/mpesa/status/${checkoutId}/`, { signal });
      if (s.done) return s;
    } catch (err) {
      if (err.status !== 0) throw err; // a brief network blip should not end the wait
    }
  }
  return { status: "pending", done: false, timedOut: true };
}

/** A withdrawal has no checkout id: poll the plan until it leaves "withdrawing". */
export async function waitForPlan(planId, { signal, intervalMs = 3000, maxMs = 90000 } = {}) {
  const started = Date.now();
  let last = null;
  while (Date.now() - started < maxMs) {
    await sleep(intervalMs, signal);
    try {
      last = await api(`/savings/plans/${planId}/`, { signal });
      if (last.status !== "withdrawing") return last;
    } catch (err) {
      if (err.status !== 0) throw err;
    }
  }
  return last ?? { status: "withdrawing" };
}
