import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

const GRACE_DAYS = 30;
const BATCH_LIMIT = 50;

/**
 * Cron route: hard-deletes users whose `deletionRequestedAt` was set
 * more than GRACE_DAYS ago. Auth via CORN_SECRET (matching the rest of
 * the cron routes). Cascading deletes on the User model take care of
 * posts, comments, likes, follows, sessions etc.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret =
    url.searchParams.get("secret") ||
    req.headers.get("x-cron-secret") ||
    req.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!process.env.CORN_SECRET || secret !== process.env.CORN_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - GRACE_DAYS * 24 * 3600_000);

  const due = await prisma.user.findMany({
    where: {
      deletionRequestedAt: { lte: cutoff, not: null },
      // Skip admins — accidental admin deletion deserves a manual review.
      isAdmin: false,
    },
    select: { id: true, username: true },
    take: BATCH_LIMIT,
  });

  if (!due.length) {
    return Response.json({ purged: 0, at: new Date().toISOString() });
  }

  // Delete one-by-one so a single bad row doesn't fail the whole batch.
  let purged = 0;
  const failures: Array<{ id: string; error: string }> = [];
  for (const u of due) {
    try {
      await prisma.user.delete({ where: { id: u.id } });
      purged++;
    } catch (e: any) {
      failures.push({ id: u.id, error: e?.message || String(e) });
    }
  }

  return Response.json({
    purged,
    failures,
    at: new Date().toISOString(),
  });
}
