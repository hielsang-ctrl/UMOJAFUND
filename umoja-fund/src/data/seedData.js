export const TARGET_PER_MEMBER = 5000;

export const seedMembers = [
  { id: 1, name: "Amina Wanjiru", phone: "+254 712 000 001", email: "amina@mail.com", paid: 5000, role: "Chairperson" },
  { id: 2, name: "Brian Otieno", phone: "+254 712 000 002", email: "brian@mail.com", paid: 5000, role: "Treasurer" },
  { id: 3, name: "Cynthia Mwende", phone: "+254 712 000 003", email: "cynthia@mail.com", paid: 2500, role: "Member" },
  { id: 4, name: "David Kamau", phone: "+254 712 000 004", email: "david@mail.com", paid: 0, role: "Member" },
  { id: 5, name: "Esther Njeri", phone: "+254 712 000 005", email: "esther@mail.com", paid: 5000, role: "Secretary" },
  { id: 6, name: "Felix Mutua", phone: "+254 712 000 006", email: "felix@mail.com", paid: 1000, role: "Member" },
];

export const seedExpenses = [
  { id: 1, title: "Cement (50 bags)", amount: 9000, date: "2026-10-02", category: "Materials", postId: 1 },
  { id: 2, title: "Labour - week 1", amount: 4500, date: "2026-10-09", category: "Labour", postId: null },
];

export const seedPosts = [
  { id: 1, author: "Amina Wanjiru", text: "Cement delivered to site. Foundation work starts Monday.", image: "", date: "2026-10-03", kind: "proof" },
  { id: 2, author: "Felix Mutua", text: "Idea: buy a water tank in bulk next month, supplier offers 10% off.", image: "", date: "2026-10-12", kind: "idea" },
];
