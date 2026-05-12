import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { limit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * GDPR data export. Returns a JSON dump of everything we hold that's
 * directly tied to the current user. Designed to be saved with
 * `Content-Disposition: attachment` so the browser downloads it rather
 * than rendering it inline.
 *
 * Rate-limited to one export per hour per user — these queries are
 * relatively heavy and the file isn't useful to refresh constantly.
 */
export async function GET() {
  const { user } = await validateRequest();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const rl = limit(`export:${user.id}`, 1, 3600_000);
  if (!rl.ok) {
    return Response.json(
      { error: "You can export your data once per hour." },
      { status: 429 },
    );
  }

  const [profile, posts, comments, likes, bookmarks, follows, followers, reports] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          username: true,
          displayName: true,
          email: true,
          bio: true,
          avatarUrl: true,
          coverUrl: true,
          isVerified: true,
          createdAt: true,
          emailVerifiedAt: true,
          suspendedAt: true,
          suspendedReason: true,
          deletionRequestedAt: true,
        },
      }),
      prisma.post.findMany({
        where: { userId: user.id },
        select: {
          id: true,
          content: true,
          createdAt: true,
          updatedAt: true,
          archived: true,
          deletedAt: true,
          status: true,
          scheduledFor: true,
          visibility: true,
          attachments: { select: { url: true, type: true } },
        },
      }),
      prisma.comment.findMany({
        where: { userId: user.id },
        select: { id: true, content: true, postId: true, createdAt: true },
      }),
      prisma.like.findMany({
        where: { userId: user.id },
        select: { postId: true },
      }),
      prisma.bookmark.findMany({
        where: { userId: user.id },
        select: { postId: true, createdAt: true },
      }),
      prisma.follow.findMany({
        where: { followerId: user.id },
        select: { followingId: true, createdAt: true },
      }),
      prisma.follow.findMany({
        where: { followingId: user.id },
        select: { followerId: true, createdAt: true },
      }),
      prisma.report.findMany({
        where: { createdById: user.id },
        select: { id: true, targetType: true, targetId: true, reason: true, status: true, createdAt: true },
      }),
    ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    profile,
    posts,
    comments,
    likes,
    bookmarks,
    follows,
    followers,
    reports,
  };

  return new Response(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="buzzhub-${user.username}-${Date.now()}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
