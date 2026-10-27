// The API speaks snake_case; the existing pages speak camelCase. Converting here keeps the pages unchanged.

export const toExpense = (e) => ({
  id: e.id, title: e.title, vendor: e.vendor, amount: e.amount, category: e.category, date: e.date, postId: e.post_id,
});

export const toPayment = (p) => ({
  id: p.id, memberId: p.member_id, name: p.name, amount: p.amount,
  method: p.method === "mpesa" ? "M-Pesa" : "Cash", ref: p.reference || "", date: p.date, status: p.status,
});

export const toMessage = (m) => ({ id: m.id, to: m.to, body: m.body, date: m.date });

export const toPlan = (p) => ({
  id: p.id, name: p.name, dailyAmount: p.daily_amount, periodId: p.period, months: p.months,
  startDate: p.start_date, maturityDate: p.maturity_date, status: p.status,
  withdrawnOn: p.withdrawn_on, withdrawnAmount: p.withdrawn_amount,
  deposits: (p.deposits || []).map((d) => ({ id: d.id, date: d.date, amount: d.amount, ref: d.reference || "" })),
});
