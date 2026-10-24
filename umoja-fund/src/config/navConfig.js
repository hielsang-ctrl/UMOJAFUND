import { LayoutGrid, Users, Receipt, Camera, PiggyBank, Info, Contact } from "lucide-react";

export const NAV_ITEMS = [
  // `short` is the label used in the cramped mobile tab bar
  { to: "/", label: "Overview", icon: LayoutGrid, end: true },
  { to: "/contributions", label: "Contributions", short: "Pay", icon: Users },
  { to: "/expenses", label: "Expenses", icon: Receipt },
  { to: "/proof", label: "Ideas & proof", short: "Proof", icon: Camera },
  { to: "/savings", label: "Savings", icon: PiggyBank },
  { to: "/about", label: "About", icon: Info },
  { to: "/contacts", label: "Contacts", icon: Contact },
];
