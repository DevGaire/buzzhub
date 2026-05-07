"use client";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import kyInstance from "@/lib/ky";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64String = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64String);
  const out = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) out[i] = rawData.charCodeAt(i);
  return out;
}

type State = "unknown" | "unsupported" | "denied" | "off" | "on";

export default function PushOptIn() {
  const { toast } = useToast();
  const [state, setState] = useState<State>("unknown");
  const [busy, setBusy] = useState(false);

  const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !vapid) {
      setState("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setState(sub ? "on" : "off"))
      .catch(() => setState("off"));
  }, [vapid]);

  async function enable() {
    if (!vapid) return;
    setBusy(true);
    try {
      const reg =
        (await navigator.serviceWorker.getRegistration("/sw.js")) ??
        (await navigator.serviceWorker.register("/sw.js"));
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapid),
      });
      const json = sub.toJSON();
      await kyInstance.post("/api/push/subscribe", { json });
      setState("on");
      toast({ description: "Push notifications enabled" });
    } catch (err) {
      console.error(err);
      toast({
        variant: "destructive",
        description: "Could not enable push notifications",
      });
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await kyInstance.delete("/api/push/subscribe", {
          json: { endpoint: sub.endpoint },
        });
        await sub.unsubscribe();
      }
      setState("off");
      toast({ description: "Push notifications disabled" });
    } catch (err) {
      console.error(err);
      toast({
        variant: "destructive",
        description: "Could not disable push notifications",
      });
    } finally {
      setBusy(false);
    }
  }

  if (state === "unsupported" || state === "unknown") return null;

  if (state === "denied") {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        <BellOff className="size-4" />
        Push notifications are blocked in your browser settings.
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between rounded-lg border bg-card px-4 py-3">
      <div className="flex items-center gap-2 text-sm">
        <Bell className="size-4" />
        {state === "on"
          ? "Push notifications are on"
          : "Get notified when something happens — even when BuzzHub is closed."}
      </div>
      <Button
        size="sm"
        variant={state === "on" ? "outline" : "default"}
        onClick={state === "on" ? disable : enable}
        disabled={busy}
      >
        {busy && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
        {state === "on" ? "Turn off" : "Enable"}
      </Button>
    </div>
  );
}
