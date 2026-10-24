import { hasConsent } from "../hooks/useCookieConsent.js";

/**
 * Page-view tracking that respects the cookie choice: nothing happens
 * unless the member switched "Analytics" on.
 * Plug your provider in by listening for the event (or call it directly here), e.g.
 *   window.addEventListener("umoja:pageview", (e) => gtag("event", "page_view", { page_path: e.detail.path }));
 */
export function trackPageView(path) {
  if (!hasConsent("analytics")) return;
  window.dispatchEvent(new CustomEvent("umoja:pageview", { detail: { path } }));
}
