import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { cacheKeys, cached } from "@/lib/cache";
import { getUserDataSelect } from "@/lib/types";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * "People followed by people you follow." Ranks candidates by overlap
 * count, then drops anyone the user already follows / has blocked / is
 * blocked by / themselves / suspended users.
 *
 * Falls back to popular users (by follower count) when the user has no
 * follow graph yet.
 */
export async function GET(req: NextRequest) {
  const { user } = await validateRequest();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const limit = Math.min(
    Number(req.nextUrl.searchParams.get("limit") || 10) || 10,
    25,
  );

  // Cache just the candidate ID list per user for 60s. We refetch the user
  // objects fresh each time so a new follow/unfollow shows up immediately;
  // the only thing the cache short-circuits is the expensive groupBy ranking.
  const ids = await cached(
    `${cacheKeys.suggestions(user.id)}:limit=${limit}`,
    60,
    async () => {
      const [following, blockedBy, blocked] = await Promise.all([
        prisma.follow.findMany({
          where: { followerId: user.id },
          select: { followingId: true },
        }),
        prisma.block.findMany({
          where: { blockedId: user.id },
          select: { blockerId: true },
        }),
        prisma.block.findMany({
          where: { blockerId: user.id },
          select: { blockedId: true },
        }),
      ]);

      const followingIds = following.map((f) => f.followingId);
      const excludeIds = new Set<string>([
        user.id,
        ...followingIds,
        ...blockedBy.map((b) => b.blockerId),
        ...blocked.map((b) => b.blockedId),
      ]);

      let suggestions: Array<{ id: string; score: number }> = [];

      if (followingIds.length > 0) {
        // Friends-of-friends, ranked by how many of my follows follow them.
        const fof = await prisma.follow.groupBy({
          by: ["followingId"],
          where: {
            followerId: { in: followingIds },
            followingId: { notIn: Array.from(excludeIds) },
          },
          _count: { followingId: true },
          orderBy: { _count: { followingId: "desc" } },
          take: limit * 2,
        });
        suggestions = fof.map((f) => ({
          id: f.followingId,
          score: f._count.followingId,
        }));
      }

      if (suggestions.length < limit) {
        // Backfill with popular users.
        const popular = await prisma.user.findMany({
          where: {
            id: { notIn: Array.from(excludeIds) },
            suspendedAt: null,
          },
          orderBy: { followers: { _count: "desc" } },
          take: limit - suggestions.length,
          select: { id: true },
        });
        const have = new Set(suggestions.map((s) => s.id));
        for (const p of popular) {
          if (!have.has(p.id)) {
            suggestions.push({ id: p.id, score: 0 });
          }
        }
      }

      return suggestions.slice(0, limit).map((s) => s.id);
    },
  );

  if (ids.length === 0) return Response.json({ users: [] });

  const users = await prisma.user.findMany({
    where: { id: { in: ids }, suspendedAt: null },
    select: getUserDataSelect(user.id),
  });
  // Preserve ranking order.
  const byId = new Map(users.map((u) => [u.id, u]));
  const ordered = ids.map((id) => byId.get(id)).filter(Boolean);

  return Response.json({ users: ordered });
}
