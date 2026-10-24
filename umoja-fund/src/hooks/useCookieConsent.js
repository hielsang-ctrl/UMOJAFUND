import { useState } from "react";

const KEY = "umoja_cookie_consent";
export const PREF_PREFIX = "umoja_pref_"; // everything saved by usePersistedState starts with this
export const CONSENT_EVENT = "umoja:consent-changed";
const DEFAULTS = { necessary: true, preferences: false, analytics: false };

const read = () => {
  try {
    const raw = typeof window !== "undefined" && window.localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

/** Reads a saved choice anywhere in the app, e.g. before loading analytics: hasConsent("analytics") */
export const hasConsent = (category) => !!read()?.[category];

// Switching "Preferences" off must also delete what was remembered under it
function clearPreferences() {
  try {
    Object.keys(window.localStorage).filter((k) => k.startsWith(PREF_PREFIX)).forEach((k) => window.localStorage.removeItem(k));
  } catch { /* storage blocked */ }
}

export default function useCookieConsent() {
  const [saved, setSaved] = useState(read);

  const save = (choices) => {
    const next = { ...DEFAULTS, ...choices, necessary: true, date: new Date().toISOString() };
    try { window.localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* storage blocked */ }
    if (!next.preferences) clearPreferences();
    setSaved(next);
    window.dispatchEvent(new Event(CONSENT_EVENT));
  };

  return {
    consent: saved ?? DEFAULTS,
    decided: !!saved,
    save,
    acceptAll: () => save({ preferences: true, analytics: true }),
    rejectAll: () => save({ preferences: false, analytics: false }),
  };
}
