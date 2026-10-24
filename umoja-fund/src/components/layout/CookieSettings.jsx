import { useEffect, useState } from "react";
import Modal from "../ui/Modal.jsx";
import Button from "../ui/Button.jsx";

const CATEGORIES = [
  { id: "necessary", title: "Strictly necessary", locked: true,
    text: "Keep you signed in and the app working. These cannot be switched off." },
  { id: "preferences", title: "Preferences",
    text: "Remember choices such as your filters, sort order and the view you last used." },
  { id: "analytics", title: "Analytics",
    text: "Anonymous usage statistics that help us see which pages are used and improve the app." },
];

function Switch({ on, onChange, disabled, label }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} disabled={disabled} onClick={() => onChange(!on)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${on ? "bg-accent" : "bg-stone-300"} ${disabled ? "opacity-60" : ""}`}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-[1.375rem]" : "left-0.5"}`} />
    </button>
  );
}

export default function CookieSettings({ open, onClose, consent, onSave, onAcceptAll }) {
  const [draft, setDraft] = useState(consent);
  useEffect(() => { if (open) setDraft(consent); }, [open, consent]);

  return (
    <Modal open={open} onClose={onClose} title="Cookie settings">
      <p className="mb-4 text-sm text-stone-500">Choose which cookies Umoja Fund may use. You can change this at any time from the footer.</p>
      <ul className="space-y-3">
        {CATEGORIES.map((c) => (
          <li key={c.id} className="flex items-start justify-between gap-4 rounded-2xl bg-stone-50 p-4">
            <div>
              <p className="text-sm font-medium">{c.title}{c.locked && <span className="ml-2 text-xs font-normal text-stone-400">Always on</span>}</p>
              <p className="mt-1 text-xs text-stone-500">{c.text}</p>
            </div>
            <Switch label={c.title} on={c.locked ? true : !!draft[c.id]} disabled={c.locked} onChange={(v) => setDraft({ ...draft, [c.id]: v })} />
          </li>
        ))}
      </ul>
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <button onClick={onAcceptAll} className="rounded-full bg-stone-100 px-5 py-2.5 text-sm text-stone-700 hover:bg-stone-200">Accept all</button>
        <Button onClick={() => { onSave(draft); onClose(); }}>Save preferences</Button>
      </div>
    </Modal>
  );
}
