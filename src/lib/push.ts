import "server-only";
import webpush from "web-push";
import prisma from "@/lib/prisma";

let configured = false;

export function isPushConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY &&
      process.env.VAPID_SUBJECT,
  );
}

function ensureConfigured() {
  if (configured) return;
  if (!isPushConfigured()) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  configured = true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

/**
 * Fan-out: deliver a push payload to every active subscription a user has.
 * Stale subscriptions (404 / 410) are pruned. Failures are swallowed so
 * a broken push never breaks the request that triggered it.
 */
export async function pushToUser(userId: string, payload: PushPayload) {
  ensureConfigured();
  if (!configured) return;

  const subs = await prisma.pushSubscription.findMany({
    where: { userId },
  });
  if (!subs.length) return;

  const json = JSON.stringify(payload);
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: s.endpoint,
            keys: { p256dh: s.p256dh, auth: s.auth },
          },
          json,
        );
      } catch (err: any) {
        const status = err?.statusCode;
        if (status === 404 || status === 410) {
          await prisma.pushSubscription
            .delete({ where: { id: s.id } })
            .catch(() => {});
        } else {
          console.error("push send failed", status, err?.message);
        }
      }
    }),
  );
}
