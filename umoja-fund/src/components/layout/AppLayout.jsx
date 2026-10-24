import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import TopNav from "./TopNav.jsx";
import SideRail from "./SideRail.jsx";
import BottomNav from "./BottomNav.jsx";
import Footer from "./Footer.jsx";
import CookieBanner from "./CookieBanner.jsx";
import CookieSettings from "./CookieSettings.jsx";
import useCookieConsent from "../../hooks/useCookieConsent.js";
import { trackPageView } from "../../utils/analytics.js";

export default function AppLayout() {
  const { pathname } = useLocation();
  const cookies = useCookieConsent();
  const [settingsOpen, setSettingsOpen] = useState(false);

  // footer links sit at the bottom of the page, so start each new page at the top
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);

  // page views are only counted when "Analytics" cookies are on
  useEffect(() => { trackPageView(pathname); }, [pathname, cookies.consent.analytics]);

  return (
    // Grey canvas: the white pills and cards float on top of it
    <div className="flex min-h-screen flex-col bg-stone-100">
      <header className="sticky top-0 z-40 bg-stone-100/90 px-3 py-3 backdrop-blur sm:px-6">
        <TopNav />
      </header>
      <div className="flex flex-1">
        <SideRail />
        <main className="min-w-0 flex-1 px-4 py-6 pb-24 sm:px-6 md:pb-6">
          <div className="mx-auto max-w-6xl">
            <Outlet />
            <Footer onOpenCookies={() => setSettingsOpen(true)} />
          </div>
        </main>
      </div>
      <BottomNav />

      {!cookies.decided && !settingsOpen && (
        <CookieBanner onAcceptAll={cookies.acceptAll} onRejectAll={cookies.rejectAll} onCustomise={() => setSettingsOpen(true)} />
      )}
      <CookieSettings open={settingsOpen} onClose={() => setSettingsOpen(false)} consent={cookies.consent} onSave={cookies.save} onAcceptAll={() => { cookies.acceptAll(); setSettingsOpen(false); }} />
    </div>
  );
}
