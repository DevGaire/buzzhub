"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * Mounts once at the root. Two responsibilities:
 *  - Register /sw.js on supported browsers so the PWA shell + push both
 *    work (push opt-in flow used to be the only thing that registered
 *    the SW; that meant non-opted-in users got no offline shell).
 *  - Capture the `beforeinstallprompt` event into a window-level handle
 *    so an install button anywhere in the tree can fire it.
 */
export default function PWAInit() {
  // Local state is incidental — we keep the actual deferred event on
  // window so any component (e.g. <InstallButton>) can grab it.
  const [, setReady] = useState(false);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    if ("serviceWorker" in navigator) {
      // Wait until after first paint so the SW registration doesn't
      // compete with the initial render for the main thread.
      const register = () =>
        navigator.serviceWorker.register("/sw.js").catch(() => {
          // Service worker registration is best-effort; failures here
          // shouldn't impact the page.
        });
      if (document.readyState === "complete") register();
      else window.addEventListener("load", register, { once: true });
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      (window as any).__buzzhubDeferredPrompt = e as BeforeInstallPromptEvent;
      window.dispatchEvent(new Event("buzzhub:pwa-installable"));
      setReady(true);
    };
    const onInstalled = () => {
      (window as any).__buzzhubDeferredPrompt = undefined;
      window.dispatchEvent(new Event("buzzhub:pwa-installed"));
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  return null;
}
