import { createContext, useContext, useMemo, useState } from "react";
import usePersistedState from "../hooks/usePersistedState.js";
import { seedMembers, seedExpenses, seedPosts, TARGET_PER_MEMBER } from "../data/seedData.js";
import { seedPayments } from "../data/extraData.js";
import { MAX_DEPOSIT, MIN_DAILY, periodOf, seedSavings } from "../data/savingsData.js";
import { addMonths, today } from "../utils/dates.js";
import { planStats } from "../utils/savings.js";

const FundContext = createContext(null);

/**
 * Single source of truth. Each action maps to one backend endpoint:
 *   recordPayment -> POST /payments        (M-Pesa rows are written by the Daraja callback)
 *   addExpense    -> POST /expenses
 *   linkProof     -> PATCH /expenses/:id
 *   addPost       -> POST /posts
 *   toggleLike    -> POST /posts/:id/like
 *   addComment    -> POST /posts/:id/comments
 *   sendMessage   -> POST /messages
 *   createSavingsPlan  -> POST /savings/plans
 *   depositSavings     -> POST /savings/plans/:id/deposits   (M-Pesa rows written by the Daraja callback)
 *   withdrawSavings    -> POST /savings/plans/:id/withdraw   (server re-checks the maturity date, then pays out via B2C)
 */
export function FundProvider({ children }) {
  const [role, setRole] = usePersistedState("role", "admin"); // "admin" | "member" (remembered only with Preferences cookies)
  const [members, setMembers] = useState(seedMembers);
  const [expenses, setExpenses] = useState(seedExpenses);
  const [posts, setPosts] = useState(() => seedPosts.map((p) => ({ likes: 0, liked: false, comments: [], ...p })));
  const [payments, setPayments] = useState(seedPayments);
  const [messages, setMessages] = useState([]);
  const [savings, setSavings] = useState(seedSavings); // the signed-in person's own plans

  const totals = useMemo(() => {
    const collected = members.reduce((s, m) => s + m.paid, 0);
    const spent = expenses.reduce((s, e) => s + e.amount, 0);
    const expected = members.length * TARGET_PER_MEMBER;
    // percent is 0 (not NaN) when the group has no members yet
    return { collected, spent, expected, balance: collected - spent, percent: expected ? (collected / expected) * 100 : 0 };
  }, [members, expenses]);

  const value = {
    role, setRole, isAdmin: role === "admin",
    members, expenses, posts, payments, messages, savings, totals,

    recordPayment: (id, amount, { method = "Cash", ref } = {}) => {
      const member = members.find((m) => m.id === id);
      setMembers((ms) => ms.map((m) => (m.id === id ? { ...m, paid: m.paid + amount } : m)));
      setPayments((ps) => [
        { id: Date.now(), memberId: id, name: member?.name ?? "Member", amount, method,
          ref: ref || "CASH-" + String(Date.now()).slice(-6), date: today() },
        ...ps,
      ]);
    },

    addExpense: (e) => setExpenses((x) => [{ ...e, id: Date.now() }, ...x]),
    // one proof post can back only one expense
    linkProof: (expenseId, postId) =>
      setExpenses((xs) =>
        xs.some((e) => e.postId === postId && e.id !== expenseId)
          ? xs
          : xs.map((e) => (e.id === expenseId ? { ...e, postId } : e))
      ),

    // returns the new post id so a proof post can be linked to an expense straight away
    addPost: (p) => {
      const id = Date.now();
      setPosts((x) => [{ likes: 0, liked: false, comments: [], ...p, id }, ...x]);
      return id;
    },
    toggleLike: (id) =>
      setPosts((ps) => ps.map((p) => (p.id === id ? { ...p, liked: !p.liked, likes: p.likes + (p.liked ? -1 : 1) } : p))),
    addComment: (id, text, author) =>
      setPosts((ps) => ps.map((p) => (p.id === id ? { ...p, comments: [...p.comments, { id: Date.now(), author, text }] } : p))),

    sendMessage: (msg) => setMessages((m) => [{ id: Date.now(), date: today(), ...msg }, ...m]),

    /* ---------- personal savings ---------- */
    // starts today and locks until today + the chosen period; returns the new plan id
    createSavingsPlan: ({ name, dailyAmount, periodId }) => {
      const period = periodOf(periodId);
      const startDate = today();
      const id = Date.now();
      setSavings((ps) => [{
        id, name: name?.trim() || "My savings", dailyAmount: Math.max(MIN_DAILY, Math.round(dailyAmount)),
        periodId: period.id, months: period.months, startDate, maturityDate: addMonths(startDate, period.months),
        deposits: [], status: "active", withdrawnOn: null, withdrawnAmount: 0,
      }, ...ps]);
      return id;
    },
    depositSavings: (planId, amount, { ref } = {}) =>
      setSavings((ps) => ps.map((p) => {
        if (p.id !== planId || !planStats(p).canDeposit) return p;
        if (!(amount >= MIN_DAILY && amount <= MAX_DEPOSIT)) return p;
        return { ...p, deposits: [{ id: Date.now(), date: today(), amount, ref: ref || "SV" + String(Date.now()).slice(-6) }, ...p.deposits] };
      })),
    // only pays out once the maturity date has been reached
    withdrawSavings: (planId) =>
      setSavings((ps) => ps.map((p) => {
        const st = planStats(p);
        return p.id === planId && st.canWithdraw ? { ...p, status: "withdrawn", withdrawnOn: today(), withdrawnAmount: st.saved } : p;
      })),
  };

  return <FundContext.Provider value={value}>{children}</FundContext.Provider>;
}

export const useFund = () => {
  const ctx = useContext(FundContext);
  if (!ctx) throw new Error("useFund must be used inside <FundProvider>");
  return ctx;
};
