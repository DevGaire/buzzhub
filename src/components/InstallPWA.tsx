"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";

const DISMISS_KEY = "buzzhub.pwa.install.dismissedAt";
// Don't pester someone who already said no. 14 days feels long enough that
// the next prompt is welcome, short enough that we don't miss real intent.
const DISMISS_TTL_MS = 14 * 24 * 3600_000;

/**
 * Bottom-right install card. Only renders when the browser has actually
 * fired `beforeinstallprompt` (captured by <PWAInit />), the user hasn't
 * dismissed it recently, and the app isn't already running standalone.
 */
export default function InstallPWA() {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Already installed and running standalone? Don't nag.
    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    if (isStandalone) return;

    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (dismissedAt && Date.now() - dismissedAt < DISMISS_TTL_MS) return;

    const refresh = () => {
      setAvailable(!!(window as any).__buzzhubDeferredPrompt);
    };
    refresh();
    window.addEventListener("buzzhub:pwa-installable", refresh);
    window.addEventListener("buzzhub:pwa-installed", refresh);
    return () => {
      window.removeEventListener("buzzhub:pwa-installable", refresh);
      window.removeEventListener("buzzhub:pwa-installed", refresh);
    };
  }, []);

  if (!available) return null;

  async function install() {
    const deferred = (window as any).__buzzhubDeferredPrompt;
    if (!deferred) return;
    try {
      await deferred.prompt();
      await deferred.userChoice;
    } finally {
      (window as any).__buzzhubDeferredPrompt = undefined;
      setAvailable(false);
    }
  }

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setAvailable(false);
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-xs rounded-2xl border bg-card p-4 shadow-lg">
      <div className="flex items-start gap-3">
        <div className="flex size-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Download className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Install BuzzHub</p>
          <p className="text-xs text-muted-foreground">
            Add it to your home screen for a faster, full-screen feed.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <Button size="sm" onClick={install}>
              Install
            </Button>
            <Button size="sm" variant="ghost" onClick={dismiss}>
              Not now
            </Button>
          </div>
        </div>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={dismiss}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
