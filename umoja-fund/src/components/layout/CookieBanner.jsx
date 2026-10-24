import { Cookie } from "lucide-react";

export default function CookieBanner({ onAcceptAll, onRejectAll, onCustomise }) {
  return (
    <div role="dialog" aria-label="Cookie notice"
      className="fixed inset-x-3 bottom-20 z-50 mx-auto max-w-xl rounded-3xl bg-stone-900 p-5 text-white shadow-xl md:bottom-4">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10"><Cookie size={16} /></span>
        <div className="flex-1">
          <p className="font-medium">We use cookies</p>
          <p className="mt-1 text-sm text-stone-300">Essential cookies keep the app working. With your permission we also use cookies to remember your preferences and understand how the app is used.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={onAcceptAll} className="rounded-full bg-white px-4 py-2 text-sm font-medium text-stone-900 hover:bg-stone-100">Accept all</button>
            <button onClick={onRejectAll} className="rounded-full bg-white/10 px-4 py-2 text-sm hover:bg-white/20">Essential only</button>
            <button onClick={onCustomise} className="rounded-full px-4 py-2 text-sm text-stone-300 underline hover:text-white">Customise</button>
          </div>
        </div>
      </div>
    </div>
  );
}
