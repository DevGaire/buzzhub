import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { visiblePostFilter } from "@/lib/moderation";
import { getPostDataInclude, PostsPage } from "@/lib/types";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const cursor = req.nextUrl.searchParams.get("cursor") || undefined;
    const pageSize = 10;

    const { user } = await validateRequest();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    // Get users the current user follows for engagement boost
    const following = await prisma.follow.findMany({
      where: { followerId: user.id },
      select: { followingId: true },
    });
    const followingIds = following.map((f) => f.followingId);

    // Get IDs of users who have blocked the logged-in user
    const blockedByUsers = await prisma.block.findMany({
      where: { blockedId: user.id },
      select: { blockerId: true },
    });
    const blockedByIds = blockedByUsers.map((b) => b.blockerId);

    // Get IDs of users the logged-in user has blocked
    const blockedUsers = await prisma.block.findMany({
      where: { blockerId: user.id },
      select: { blockedId: true },
    });
    const blockedIds = blockedUsers.map((b) => b.blockedId);

    const hiddenIds = [...new Set([...blockedByIds, ...blockedIds])];

    if (cursor) {
      // Cursor-based page: simple recent order
      const posts = await prisma.post.findMany({
        where: {
          ...visiblePostFilter,
          archived: false,
          visibility: "PUBLIC",
          userId: { notIn: hiddenIds },
        },
        include: getPostDataInclude(user.id),
        orderBy: { createdAt: "desc" },
        take: pageSize + 1,
        cursor: { id: cursor },
      });

      const nextCursor = posts.length > pageSize ? posts[pageSize].id : null;
      const data: PostsPage = { posts: posts.slice(0, pageSize), nextCursor };
      return Response.json(data);
    }

    // First page: engagement-scored ranking.
    // Fetch a larger pool — followees + friends-of-friends — and sort by score.
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

    const fofRows = followingIds.length
      ? await prisma.follow.findMany({
          where: { followerId: { in: followingIds } },
          select: { followingId: true },
          take: 500,
        })
      : [];
    const fofIds = Array.from(
      new Set(fofRows.map((r) => r.followingId)),
    ).filter((id) => id !== user.id && !hiddenIds.includes(id));

    const pool = await prisma.post.findMany({
      where: {
        ...visiblePostFilter,
        archived: false,
        visibility: "PUBLIC",
        userId: { notIn: hiddenIds },
        createdAt: { gte: threeDaysAgo },
      },
      include: getPostDataInclude(user.id),
      orderBy: { createdAt: "desc" },
      take: 80,
    });

    // Score: likes×1 + comments×2 + bookmarks×3 + follow/fof boost + recency decay.
    const now = Date.now();
    const fofSet = new Set(fofIds);
    const followSet = new Set(followingIds);
    const scored = pool.map((post) => {
      const ageHours = (now - new Date(post.createdAt).getTime()) / 3_600_000;
      const recency = Math.max(0, 1 - ageHours / 72); // decay over 72h
      const followBoost = followSet.has(post.userId)
        ? 10
        : fofSet.has(post.userId)
          ? 4
          : 0;
      const bookmarkCount = (post as any).bookmarks?.length ?? 0;
      const score =
        post._count.likes * 1 +
        post._count.comments * 2 +
        bookmarkCount * 3 +
        followBoost +
        recency * 15;
      return { post, score };
    });

    scored.sort((a, b) => b.score - a.score);

    // Diversity: cap to 2 posts per author in the top page.
    const perAuthor = new Map<string, number>();
    const topPosts: typeof pool = [];
    for (const { post } of scored) {
      const n = perAuthor.get(post.userId) ?? 0;
      if (n >= 2) continue;
      perAuthor.set(post.userId, n + 1);
      topPosts.push(post);
      if (topPosts.length >= pageSize) break;
    }

    // If pool is small, fetch older posts for next cursor pagination
    const oldPosts = await prisma.post.findMany({
      where: {
        ...visiblePostFilter,
        archived: false,
        visibility: "PUBLIC",
        userId: { notIn: hiddenIds },
        createdAt: { lt: threeDaysAgo },
      },
      include: getPostDataInclude(user.id),
      orderBy: { createdAt: "desc" },
      take: 1,
    });

    const nextCursor = oldPosts.length > 0 ? oldPosts[0].id : null;
    const data: PostsPage = { posts: topPosts, nextCursor };
    return Response.json(data);
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
