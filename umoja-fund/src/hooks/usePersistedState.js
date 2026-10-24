import { useEffect, useState } from "react";
import { CONSENT_EVENT, PREF_PREFIX, hasConsent } from "./useCookieConsent.js";

/**
 * useState that remembers its value between visits, but only while the member
 * has allowed "Preferences" cookies. Without consent it behaves like plain useState.
 * Use it for harmless view choices (filters, sort order, "viewing as"), never for money data.
 */
export default function usePersistedState(key, initial) {
  const storageKey = PREF_PREFIX + key;

  const [value, setValue] = useState(() => {
    if (!hasConsent("preferences")) return initial;
    try {
      const raw = window.localStorage.getItem(storageKey);
      return raw === null ? initial : JSON.parse(raw);
    } catch {
      return initial;
    }
  });

  const [allowed, setAllowed] = useState(() => hasConsent("preferences"));
  useEffect(() => {
    const sync = () => setAllowed(hasConsent("preferences"));
    window.addEventListener(CONSENT_EVENT, sync);
    return () => window.removeEventListener(CONSENT_EVENT, sync);
  }, []);

  useEffect(() => {
    try {
      if (allowed) window.localStorage.setItem(storageKey, JSON.stringify(value));
      else window.localStorage.removeItem(storageKey);
    } catch { /* storage blocked */ }
  }, [allowed, storageKey, value]);

  return [value, setValue];
}
