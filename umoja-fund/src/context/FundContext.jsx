import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { api } from "../services/api.js";
import { toExpense, toMessage, toPayment, toPlan } from "../services/adapters.js";
import { AuthContext } from "./AuthContext.jsx";

const FundContext = createContext(null);

const EMPTY_TOTALS = { collected: 0, spent: 0, expected: 0, balance: 0, percent: 0 };

// what to fetch for each piece of data, and how to reshape it for the pages
const SOURCES = {
  members: ["/members/", (x) => x],
  summary: ["/fund/summary/", (x) => x],
  payments: ["/payments/", (l) => l.map(toPayment).filter((p) => p.status === "completed")],
  expenses: ["/expenses/", (l) => l.map(toExpense)],
  posts: ["/posts/", (x) => x],
  messages: ["/messages/", (l) => l.map(toMessage)],
  savings: ["/savings/plans/", (l) => l.map(toPlan)],
};
const ALL = Object.keys(SOURCES);

/**
 * Single source of truth, now backed by the Django API. The pages use the same names as before
 * (members, expenses, posts, payments, savings, totals, isAdmin...). Actions are async: they call the
 * backend, then refresh whatever changed. Money is only ever counted once the SERVER says so.
 */
export function FundProvider({ children }) {
  const auth = useContext(AuthContext); // null if an old provider sits outside <AuthProvider>: then it stays idle
  const user = auth?.user ?? null;

  const [data, setData] = useState({ members: [], summary: EMPTY_TOTALS, payments: [], expenses: [], posts: [], messages: [], savings: [] });
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState("");

  const refresh = useCallback(async (...names) => {
    await Promise.all(
      names.map(async (name) => {
        const [path, map] = SOURCES[name];
        const result = map(await api(path));
        setData((d) => ({ ...d, [name]: result }));
      })
    );
  }, []);

  const loadAll = useCallback(async () => {
    setLoadError("");
    try { await refresh(...ALL); setReady(true); } catch (err) { setLoadError(err.message); }
  }, [refresh]);

  const userId = user?.id;
  useEffect(() => {
    if (!userId) { setReady(false); return; }
    setReady(false);
    loadAll();
  }, [userId, loadAll]);

  if (user && !ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-100 p-4">
        {loadError ? (
          <div className="max-w-sm rounded-3xl bg-white p-6 text-center shadow-sm">
            <p className="font-medium text-rose-600">Could not load the fund</p>
            <p className="mt-1 text-sm text-stone-500">{loadError}</p>
            <button onClick={loadAll} className="mt-4 rounded-full bg-stone-900 px-5 py-2.5 text-sm text-white hover:bg-black">Try again</button>
          </div>
        ) : (
          <Loader2 className="animate-spin text-stone-400" size={32} />
        )}
      </div>
    );
  }

  const money = () => refresh("members", "summary", "payments");
  const setPosts = (fn) => setData((d) => ({ ...d, posts: fn(d.posts) }));

  const value = {
    user,
    role: user?.access,
    isAdmin: user?.access === "admin",
    members: data.members, expenses: data.expenses, posts: data.posts, payments: data.payments,
    messages: data.messages, savings: data.savings,
    totals: data.summary,
    reload: loadAll,

    /* ---------- contributions ---------- */
    recordCashPayment: async (memberId, amount, reference) => {
      await api("/payments/", { method: "POST", body: { member: memberId, amount, ...(reference ? { reference } : {}) } });
      await money();
    },
    // returns { payment_id, checkout_request_id }; then call waitForPayment() from services/mpesa.js
    startMpesaPayment: ({ memberId, amount, phone }) =>
      api("/payments/mpesa/", { method: "POST", body: { member: memberId, amount, phone } }),
    refreshMoney: money,

    /* ---------- expenses ---------- */
    addExpense: async ({ title, vendor, amount, category, postId }) => {
      await api("/expenses/", { method: "POST", body: { title, vendor, amount, category, post: postId ?? null } });
      await refresh("expenses", "summary");
    },
    linkProof: async (expenseId, postId) => {
      await api(`/expenses/${expenseId}/proof/`, { method: "PATCH", body: { post: postId } });
      await refresh("expenses");
    },

    /* ---------- ideas & proof ---------- */
    // `file` is an image Blob/File (or null). Returns the new post id so it can be linked to an expense.
    addPost: async ({ kind, text, file }) => {
      const form = new FormData();
      form.append("kind", kind);
      form.append("text", text);
      if (file) form.append("image", file, "photo.jpg");
      const post = await api("/posts/", { method: "POST", body: form });
      setPosts((ps) => [post, ...ps]);
      return post.id;
    },
    toggleLike: async (id) => {
      setPosts((ps) => ps.map((p) => (p.id === id ? { ...p, liked: !p.liked, likes: p.likes + (p.liked ? -1 : 1) } : p)));
      try {
        const r = await api(`/posts/${id}/like/`, { method: "POST" });
        setPosts((ps) => ps.map((p) => (p.id === id ? { ...p, liked: r.liked, likes: r.likes } : p)));
      } catch {
        refresh("posts").catch(() => {}); // undo the optimistic change
      }
    },
    addComment: async (id, text) => {
      const comment = await api(`/posts/${id}/comments/`, { method: "POST", body: { text } });
      setPosts((ps) => ps.map((p) => (p.id === id ? { ...p, comments: [...p.comments, comment] } : p)));
    },

    /* ---------- messages ---------- */
    sendMessage: async ({ audience, recipient, body }) => {
      await api("/messages/", { method: "POST", body: { audience, ...(recipient ? { recipient } : {}), body } });
      await refresh("messages");
    },

    /* ---------- personal savings ---------- */
    createSavingsPlan: async ({ name, dailyAmount, periodId }) => {
      const plan = await api("/savings/plans/", { method: "POST", body: { name, daily_amount: dailyAmount, period: periodId } });
      setData((d) => ({ ...d, savings: [toPlan(plan), ...d.savings] }));
      return plan.id;
    },
    startSavingsDeposit: (planId, amount, phone) =>
      api(`/savings/plans/${planId}/deposit/`, { method: "POST", body: { amount, phone } }),
    startSavingsWithdrawal: (planId, phone) =>
      api(`/savings/plans/${planId}/withdraw/`, { method: "POST", body: { phone } }),
    refreshSavings: () => refresh("savings"),
  };

  return <FundContext.Provider value={value}>{children}</FundContext.Provider>;
}

export const useFund = () => {
  const ctx = useContext(FundContext);
  if (!ctx) throw new Error("useFund must be used inside <FundProvider>");
  return ctx;
};
