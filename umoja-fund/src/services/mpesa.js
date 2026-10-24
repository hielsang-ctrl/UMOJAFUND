/**
 * M-Pesa (Safaricom Daraja) STK Push service.
 *
 * DEMO MODE: no money moves. requestStkPush() only simulates the three stages
 * a real payment goes through, so the UI can be built and tested.
 *
 * GOING LIVE: the Daraja consumer key/secret and passkey must NEVER be in the
 * frontend. Build a small backend that:
 *   1. POST /api/mpesa/stkpush   -> calls Daraja "STK Push" with phone, amount, accountRef
 *   2. receives Safaricom's callback at /api/mpesa/callback and stores the result
 *   3. GET  /api/mpesa/status/:checkoutRequestId -> frontend polls this
 * Then replace the body of requestStkPush() with fetch calls to those routes.
 */

// Accepts 0712345678, 712345678, 254712345678, +254 712 345 678 -> "254712345678"
export function normalisePhone(input) {
  let n = String(input).replace(/\D/g, "");
  if (n.startsWith("254")) n = n.slice(3);
  else if (n.startsWith("0")) n = n.slice(1);
  return /^[17]\d{8}$/.test(n) ? "254" + n : null;
}

export const displayPhone = (p) => `+${p.slice(0, 3)} ${p.slice(3, 6)} ${p.slice(6, 9)} ${p.slice(9)}`;

const wait = (ms, signal) =>
  new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => { clearTimeout(t); reject(new Error("cancelled")); });
  });

export async function requestStkPush({ phone, amount, accountRef }, onStage, signal) {
  onStage("sending");   // request sent to Safaricom
  await wait(1400, signal);
  onStage("awaiting");  // prompt is on the member's phone, waiting for the PIN
  await wait(3500, signal);
  onStage("confirmed"); // callback says the payment succeeded
  const receipt = "S" + Math.random().toString(36).slice(2, 11).toUpperCase();
  return { receipt, phone, amount, accountRef };
}

/**
 * DEMO payout of matured savings to a member's M-Pesa number.
 * GOING LIVE: this is Daraja "B2C" and needs the same backend as above
 * (POST /api/mpesa/payout -> Daraja B2C, result arrives on your result URL).
 */
export async function requestPayout({ phone, amount, reference }, onStage, signal) {
  onStage("sending");     // payout request received
  await wait(1400, signal);
  onStage("processing");  // being sent to the member
  await wait(2500, signal);
  onStage("confirmed");
  const receipt = "P" + Math.random().toString(36).slice(2, 11).toUpperCase();
  return { receipt, phone, amount, reference };
}
