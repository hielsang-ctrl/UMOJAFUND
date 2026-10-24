export const fmt = (n) => "KES " + n.toLocaleString();
export const initials = (name) => name.split(" ").map((s) => s[0]).join("").slice(0, 2);
