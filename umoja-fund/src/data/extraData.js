// Static lookups used by the Contributions, Expenses and Contacts pages.
// Set the paybill/account to your real M-Pesa details.
export const MPESA_INFO = { paybill: "247247", account: "UMOJA", name: "Umoja Group Fund" };

export const CATEGORIES = ["Materials", "Labour", "Transport", "Legal", "Other"];
export const CATEGORY_DOT = {
  Materials: "bg-accent", Labour: "bg-stone-800", Transport: "bg-sky-500", Legal: "bg-emerald-500", Other: "bg-amber-400",
};

export const NEXT_MEETING = {
  title: "Monthly members' meeting",
  date: "Sat, 31 Oct 2026",
  time: "10:00 AM",
  venue: "Community hall (change to your venue)",
  agenda: ["Review contributions", "Approve next expenses", "Project progress photos"],
};

export const MESSAGE_TEMPLATES = [
  { label: "Payment reminder", body: "Friendly reminder: please complete your contribution of {target}. Pay via M-Pesa Paybill 247247, account UMOJA." },
  { label: "Meeting invite", body: "Reminder: our monthly meeting is on Sat 31 Oct at 10:00 AM. Please come ready to review the accounts." },
  { label: "Expense update", body: "New expense recorded in the ledger. Please open the app to see the details and proof of work." },
  { label: "Thank you", body: "Thank you for your contribution. Every shilling counts and you can track it in the app." },
];
