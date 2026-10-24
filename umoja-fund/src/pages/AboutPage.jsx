import { useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, Camera, ChevronDown, Mail, Receipt, ShieldCheck, Target, Users, Wallet } from "lucide-react";
import Card from "../components/ui/Card.jsx";
import CardHeader from "../components/ui/CardHeader.jsx";
import Avatar from "../components/ui/Avatar.jsx";
import PageHeader from "../components/ui/PageHeader.jsx";
import { useFund } from "../context/FundContext.jsx";
import { TARGET_PER_MEMBER } from "../data/seedData.js";
import { GROUP_FAQS, GROUP_INFO, GROUP_RULES } from "../data/aboutData.js";
import { fmt } from "../utils/formatters.js";

const STEPS = [
  { icon: Wallet, title: "Contribute", text: "Each member pays their share. The admin records every payment." },
  { icon: Users, title: "Track", text: "Everyone can see who has paid and who is still pending." },
  { icon: Receipt, title: "Spend", text: "The admin records each expense against the shared balance." },
  { icon: Camera, title: "Prove", text: "Photos and notes show what the money actually achieved." },
];

const RULE_ICONS = [Target, ShieldCheck, Camera, Users];

export default function AboutPage() {
  const { members, totals, expenses } = useFund();
  const [open, setOpen] = useState(0);
  const officers = members.filter((m) => m.role !== "Member");

  const facts = [
    { label: "Members", value: members.length },
    { label: "Target each", value: fmt(TARGET_PER_MEMBER) },
    { label: "Raised so far", value: fmt(totals.collected) },
    { label: "Expenses logged", value: expenses.length },
  ];

  return (
    <>
      <PageHeader title="About" subtitle="Who we are, how the fund works and the rules we all agree to." />

      <div className="space-y-4">
        {/* ---------- Hero + key facts ---------- */}
        <div className="grid gap-4 lg:grid-cols-12">
          <Card dark className="flex flex-col justify-between gap-8 lg:col-span-7">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs text-stone-300">
                <span className="h-2 w-2 rounded-full bg-accent" /> Active project: {GROUP_INFO.project}
              </span>
              <h2 className="mt-5 text-3xl font-medium tracking-tight sm:text-4xl">{GROUP_INFO.name}</h2>
              <p className="mt-1 text-lg text-orange-300">{GROUP_INFO.tagline}</p>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-stone-300">{GROUP_INFO.mission}</p>
            </div>
            <div className="flex flex-wrap gap-6 text-sm text-stone-400">
              <span className="inline-flex items-center gap-2"><Calendar size={14} /> Founded {GROUP_INFO.founded}</span>
              <span className="inline-flex items-center gap-2"><Target size={14} /> Goal date {GROUP_INFO.deadline}</span>
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-4 lg:col-span-5">
            {facts.map((f) => (
              <Card key={f.label} className="flex flex-col justify-between gap-6">
                <p className="text-sm text-stone-500">{f.label}</p>
                <p className="text-2xl font-medium tracking-tight">{f.value}</p>
              </Card>
            ))}
          </div>
        </div>

        {/* ---------- How it works ---------- */}
        <Card>
          <CardHeader title="How the fund works" subtitle="Four simple steps, all visible to every member." />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {STEPS.map((s, i) => (
              <div key={s.title} className="rounded-2xl bg-stone-50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-white"><s.icon size={18} /></span>
                  <span className="text-xs text-stone-400">Step {i + 1}</span>
                </div>
                <p className="font-medium">{s.title}</p>
                <p className="mt-1 text-sm text-stone-500">{s.text}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* ---------- Rules + officers ---------- */}
        <div className="grid gap-4 lg:grid-cols-12">
          <Card className="lg:col-span-7">
            <CardHeader title="Group rules" subtitle="What every member agrees to" />
            <ul className="space-y-4">
              {GROUP_RULES.map((r, i) => {
                const Icon = RULE_ICONS[i % RULE_ICONS.length];
                return (
                  <li key={r.title} className="flex gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-700"><Icon size={16} /></span>
                    <div>
                      <p className="text-sm font-medium">{r.title}</p>
                      <p className="text-sm text-stone-500">{r.text}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card className="lg:col-span-5">
            <CardHeader title="Group officers" subtitle="The people running the fund" to="/contacts" linkLabel="Contact" />
            <ul className="space-y-3">
              {officers.map((m) => (
                <li key={m.id} className="flex items-center gap-3 rounded-2xl border border-stone-100 p-3">
                  <Avatar name={m.name} index={m.id} size="h-11 w-11" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{m.name}</p>
                    <p className="text-xs text-stone-500">{m.role}</p>
                  </div>
                  <a href={`mailto:${m.email}`} title="Email" className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-100 hover:bg-stone-200">
                    <Mail size={14} />
                  </a>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* ---------- FAQ + CTA ---------- */}
        <div className="grid gap-4 lg:grid-cols-12">
          <Card className="lg:col-span-8">
            <CardHeader title="Frequently asked questions" />
            <ul className="divide-y divide-stone-100">
              {GROUP_FAQS.map((f, i) => (
                <li key={f.q}>
                  <button onClick={() => setOpen(open === i ? -1 : i)} className="flex w-full items-center justify-between gap-4 py-3 text-left">
                    <span className="text-sm font-medium">{f.q}</span>
                    <ChevronDown size={16} className={`shrink-0 text-stone-400 transition ${open === i ? "rotate-180" : ""}`} />
                  </button>
                  {open === i && <p className="pb-4 text-sm text-stone-500">{f.a}</p>}
                </li>
              ))}
            </ul>
          </Card>

          <Card className="flex flex-col justify-between gap-6 bg-gradient-to-br from-orange-400 to-rose-500 text-white lg:col-span-4">
            <div>
              <p className="text-lg font-medium">Still have a question?</p>
              <p className="mt-2 text-sm text-white/80">Send the admin a message or reach any officer directly.</p>
            </div>
            <Link to="/contacts" className="inline-flex w-fit items-center gap-2 rounded-full bg-stone-900 px-5 py-2.5 text-sm text-white hover:bg-black">
              <Mail size={14} /> Go to contacts
            </Link>
          </Card>
        </div>
      </div>
    </>
  );
}
