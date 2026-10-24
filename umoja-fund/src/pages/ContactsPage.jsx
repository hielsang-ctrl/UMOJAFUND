import { useEffect, useState } from "react";
import { Bell, Calendar, Check, Copy, Mail, MapPin, MessageCircle, Phone, Send, Users } from "lucide-react";
import Card from "../components/ui/Card.jsx";
import CardHeader from "../components/ui/CardHeader.jsx";
import Avatar from "../components/ui/Avatar.jsx";
import PageHeader from "../components/ui/PageHeader.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import FilterChips from "../components/ui/FilterChips.jsx";
import SearchBar from "../components/ui/SearchBar.jsx";
import Button, { inputClass } from "../components/ui/Button.jsx";
import { useFund } from "../context/FundContext.jsx";
import { TARGET_PER_MEMBER as TARGET } from "../data/seedData.js";
import { MESSAGE_TEMPLATES, NEXT_MEETING } from "../data/extraData.js";
import { prettyDate } from "../utils/dates.js";
import { fmt } from "../utils/formatters.js";

const iconBtn = "flex h-8 w-8 items-center justify-center rounded-full bg-stone-100 text-stone-700 hover:bg-stone-200";
const RSVP = ["Going", "Maybe", "Can't make it"];

export default function ContactsPage() {
  const { members, messages, isAdmin, sendMessage } = useFund();
  const admin = members.find((m) => m.role === "Chairperson") || members[0]; // undefined if the group has no members
  // phone and email are shared with admins and officers only
  const canSee = (m) => isAdmin || m.role !== "Member";

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [to, setTo] = useState(isAdmin ? "pending" : "admin"); // "pending" | "all" | "admin" | "m:<id>"
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [copied, setCopied] = useState("");
  const [rsvp, setRsvp] = useState("");

  // switching to the Member view must not leave an admin-only recipient selected
  useEffect(() => {
    const target = to.startsWith("m:") ? members.find((m) => `m:${m.id}` === to) : null;
    if (!isAdmin && (to === "pending" || to === "all" || target?.role === "Member")) setTo("admin");
  }, [isAdmin, to, members]);

  const pending = members.filter((m) => m.paid < TARGET);
  const officers = members.filter((m) => m.role !== "Member");
  const list = members
    .filter((m) => (filter === "officers" ? m.role !== "Member" : filter === "pending" ? m.paid < TARGET : true))
    .filter((m) => `${m.name} ${m.role} ${canSee(m) ? `${m.phone} ${m.email}` : ""}`.toLowerCase().includes(query.toLowerCase()));

  const recipientLabel = to === "pending" ? `All pending members (${pending.length})` : to === "all" ? `All members (${members.length})` : to === "admin" ? `Admin${admin ? ` (${admin.name})` : ""}` : members.find((m) => `m:${m.id}` === to)?.name ?? "";
  const recipientOptions = [
    ...(isAdmin ? [{ id: "pending", label: "All pending", count: pending.length }, { id: "all", label: "Everyone", count: members.length }] : []),
    { id: "admin", label: "Admin" },
  ];
  const selectedMember = to.startsWith("m:") ? members.find((m) => `m:${m.id}` === to) : null;

  const send = () => {
    if (!message.trim()) return;
    // real app: POST /messages { to, body } and let the server send SMS / email / WhatsApp
    sendMessage({ to: recipientLabel, body: message.trim() });
    setNotice(`Message sent to ${recipientLabel}.`);
    setMessage("");
    setTimeout(() => setNotice(""), 4000);
  };

  const copy = async (key, value) => {
    try { await navigator.clipboard.writeText(value); } catch { /* clipboard unavailable */ }
    setCopied(key);
    setTimeout(() => setCopied(""), 1500);
  };

  const digits = (p) => p.replace(/\D/g, "");

  return (
    <>
      <PageHeader title="Contacts" subtitle="Reach any member, message the group and keep track of meetings."
        action={isAdmin && (
          <Button onClick={() => { setTo("pending"); setMessage(MESSAGE_TEMPLATES[0].body.replace("{target}", fmt(TARGET))); }}>
            <Bell size={14} /> Remind pending ({pending.length})
          </Button>
        )} />

      <div className="grid gap-4 lg:grid-cols-12">
        {/* ---------- directory ---------- */}
        <Card className="lg:col-span-7">
          <CardHeader title="Member directory" subtitle={`${members.length} members · ${officers.length} officers`} />
          <div className="mb-4 space-y-3">
            <SearchBar value={query} onChange={setQuery} placeholder={isAdmin ? "Search name, role, phone or email" : "Search name or role"} />
            <FilterChips value={filter} onChange={setFilter}
              options={[{ id: "all", label: "All", count: members.length }, { id: "officers", label: "Officers", count: officers.length }, { id: "pending", label: "Pending payment", count: pending.length }]} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {list.map((m) => (
              <div key={m.id} className={`rounded-2xl border p-4 transition ${to === `m:${m.id}` ? "border-accent bg-orange-50/40" : "border-stone-100"}`}>
                <div className="flex items-center gap-3">
                  <Avatar name={m.name} index={m.id} size="h-12 w-12" />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{m.name}</p>
                    <p className="text-xs text-stone-500">{m.role}</p>
                  </div>
                </div>
                {canSee(m) ? (
                <div className="mt-3 space-y-1 text-sm text-stone-600">
                  <button onClick={() => copy(`p${m.id}`, m.phone)} className="flex w-full items-center justify-between gap-2 text-left hover:text-stone-900" title="Copy number">
                    <span>{m.phone}</span>{copied === `p${m.id}` ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} className="text-stone-400" />}
                  </button>
                  <button onClick={() => copy(`e${m.id}`, m.email)} className="flex w-full items-center justify-between gap-2 text-left hover:text-stone-900" title="Copy email">
                    <span className="truncate">{m.email}</span>{copied === `e${m.id}` ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} className="text-stone-400" />}
                  </button>
                </div>
                ) : (
                  <p className="mt-3 text-xs text-stone-400">Phone and email are shared with admins and officers only.</p>
                )}
                <div className="mt-3 flex items-center justify-between">
                  <StatusBadge paid={m.paid} />
                  {canSee(m) && (
                  <div className="flex gap-1.5">
                    <a href={`tel:${m.phone.replace(/\s/g, "")}`} title="Call" className={iconBtn}><Phone size={14} /></a>
                    <a href={`https://wa.me/${digits(m.phone)}?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer" title="WhatsApp" className={iconBtn}><MessageCircle size={14} /></a>
                    <a href={`mailto:${m.email}`} title="Email" className={iconBtn}><Mail size={14} /></a>
                    <button onClick={() => setTo(`m:${m.id}`)} title="Message in app" className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-white"><Send size={14} /></button>
                  </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          {!list.length && <p className="py-8 text-center text-sm text-stone-500">No members match your search.</p>}
        </Card>

        {/* ---------- composer, admin, meeting ---------- */}
        <div className="space-y-4 lg:col-span-5">
          <Card>
            <CardHeader title="Send a message" subtitle="Choose who should receive it" />
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <FilterChips value={selectedMember ? "" : to} onChange={setTo} options={recipientOptions} />
              {selectedMember && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3.5 py-1.5 text-sm text-white">
                  {selectedMember.name}
                  <button onClick={() => setTo(isAdmin ? "pending" : "admin")} aria-label="Clear recipient" className="text-white/80 hover:text-white">×</button>
                </span>
              )}
            </div>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {MESSAGE_TEMPLATES.map((t) => (
                <button key={t.label} onClick={() => setMessage(t.body.replace("{target}", fmt(TARGET)))} className="rounded-full border border-stone-200 px-3 py-1 text-xs text-stone-600 hover:bg-stone-50">{t.label}</button>
              ))}
            </div>
            <textarea rows={5} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={320} placeholder="Write your message or pick a template" className={`${inputClass} w-full`} />
            <div className="mt-3 flex items-center justify-between gap-2">
              <span className="text-xs text-stone-400">{message.length}/320 · To: {recipientLabel}</span>
              <Button onClick={send} disabled={!message.trim()} className="disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-400"><Send size={14} /> Send</Button>
            </div>
            {notice && <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{notice}</p>}

            {messages.length > 0 && (
              <div className="mt-4 border-t border-stone-100 pt-3">
                <p className="mb-2 text-xs font-medium text-stone-500">Recently sent</p>
                <ul className="space-y-2">
                  {messages.slice(0, 3).map((m) => (
                    <li key={m.id} className="rounded-xl bg-stone-50 px-3 py-2 text-xs text-stone-600">
                      <p className="font-medium text-stone-700">To {m.to} · {prettyDate(m.date)}</p>
                      <p className="mt-0.5 line-clamp-2">{m.body}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>

          {admin && (
          <Card dark>
            <p className="text-sm text-stone-400">Group admin</p>
            <p className="mt-1 text-lg font-medium">{admin.name}</p>
            <div className="mt-4 space-y-2 text-sm">
              {[["phone", admin.phone, Phone], ["email", "admin@umojafund.co.ke", Mail]].map(([k, v, Icon]) => (
                <button key={k} onClick={() => copy(`admin-${k}`, v)} className="flex w-full items-center justify-between rounded-2xl bg-white/10 px-3 py-2 text-left hover:bg-white/15">
                  <span className="flex items-center gap-2 text-stone-200"><Icon size={14} /> {v}</span>
                  {copied === `admin-${k}` ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} className="text-stone-400" />}
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-stone-400">Questions about payments or expenses go here. Tap a line to copy it.</p>
          </Card>
          )}

          <Card>
            <CardHeader title="Next meeting" subtitle={NEXT_MEETING.title} />
            <div className="space-y-2 text-sm text-stone-600">
              <p className="flex items-center gap-2"><Calendar size={14} className="text-stone-400" /> {NEXT_MEETING.date} · {NEXT_MEETING.time}</p>
              <p className="flex items-center gap-2"><MapPin size={14} className="text-stone-400" /> {NEXT_MEETING.venue}</p>
              <p className="flex items-start gap-2"><Users size={14} className="mt-0.5 text-stone-400" /> {NEXT_MEETING.agenda.join(" · ")}</p>
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {RSVP.map((r) => (
                <button key={r} onClick={() => setRsvp(r)} className={`rounded-full px-3.5 py-1.5 text-sm transition ${rsvp === r ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"}`}>{r}</button>
              ))}
            </div>
            {rsvp && <p className="mt-2 text-xs text-emerald-700">Your reply: {rsvp}. The admin will see it.</p>}
          </Card>
        </div>
      </div>
    </>
  );
}
