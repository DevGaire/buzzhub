import prisma from "@/lib/prisma";
import { sendMentionNotifications } from "@/components/posts/editor/actions";

export const dynamic = "force-dynamic";

// Flips SCHEDULED posts whose scheduledFor has passed to PUBLISHED and fires
// mention notifications. Run on a frequent cron (e.g. every minute). Auth via
// CORN_SECRET to match the other cron routes.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret =
    url.searchParams.get("secret") ||
    req.headers.get("x-cron-secret") ||
    req.headers.get("authorization")?.replace(/^Bearer /, "");
  const expected = process.env.CRON_SECRET || process.env.CORN_SECRET;
  if (!expected || secret !== expected) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  // Cap the batch so one stuck/slow run can't melt the API. Anything missed
  // will be picked up on the next tick.
  const BATCH_LIMIT = 100;

  const due = await prisma.post.findMany({
    where: {
      status: "SCHEDULED",
      scheduledFor: { lte: now },
      deletedAt: null,
    },
    select: {
      id: true,
      userId: true,
      content: true,
      user: { select: { displayName: true, suspendedAt: true } },
    },
    orderBy: { scheduledFor: "asc" },
    take: BATCH_LIMIT,
  });

  if (!due.length) {
    return Response.json({ published: 0, at: now.toISOString() });
  }

  // Skip posts whose author was suspended after scheduling — don't help a
  // suspended account get content out via a parked timer.
  const eligible = due.filter((p) => !p.user.suspendedAt);
  const eligibleIds = eligible.map((p) => p.id);

  if (eligibleIds.length) {
    await prisma.post.updateMany({
      where: { id: { in: eligibleIds } },
      data: { status: "PUBLISHED", scheduledFor: null, createdAt: now },
    });
  }

  // Mention notifications run after the status flip so a failure here
  // doesn't leave the post permanently SCHEDULED.
  for (const p of eligible) {
    try {
      await sendMentionNotifications(p.id, p.content, p.userId, p.user.displayName);
    } catch (e) {
      console.error("scheduled mention notify failed", p.id, e);
    }
  }

  return Response.json({
    published: eligibleIds.length,
    skipped: due.length - eligibleIds.length,
    at: now.toISOString(),
  });
}
