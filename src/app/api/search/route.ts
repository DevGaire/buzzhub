import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { visiblePostFilter } from "@/lib/moderation";
import { getPostDataInclude, PostData, PostsPage } from "@/lib/types";
import { NextRequest } from "next/server";

const PAGE_SIZE = 10;

export async function GET(req: NextRequest) {
  try {
    const rawQ = req.nextUrl.searchParams.get("q") || "";
    const cursor = req.nextUrl.searchParams.get("cursor") || undefined;
    const sort = req.nextUrl.searchParams.get("sort") === "top" ? "top" : "new";

    const q = rawQ.trim();

    const { user } = await validateRequest();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!q) {
      return Response.json({ posts: [], nextCursor: null } satisfies PostsPage);
    }

    if (sort === "top") {
      return await searchTop(q, cursor, user.id);
    }
    return await searchNew(q, cursor, user.id);
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function searchNew(q: string, cursor: string | undefined, userId: string) {
  const searchQuery = q.split(/\s+/).filter(Boolean).join(" & ");

  const posts = await prisma.post.findMany({
    where: {
      ...visiblePostFilter,
      OR: [
        { content: { search: searchQuery } },
        { user: { displayName: { search: searchQuery } } },
        { user: { username: { search: searchQuery } } },
      ],
    },
    include: getPostDataInclude(userId),
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE + 1,
    cursor: cursor ? { id: cursor } : undefined,
  });

  const nextCursor = posts.length > PAGE_SIZE ? posts[PAGE_SIZE].id : null;
  return Response.json({
    posts: posts.slice(0, PAGE_SIZE),
    nextCursor,
  } satisfies PostsPage);
}

async function searchTop(q: string, cursor: string | undefined, userId: string) {
  const page = cursor ? Math.max(0, parseInt(cursor, 10) || 0) : 0;
  const offset = page * PAGE_SIZE;

  // websearch_to_tsquery handles user-friendly input (quoted phrases, OR, -term).
  // setweight: username=A, displayName=B, content=C — username matches rank highest.
  // Score combines text relevance with light engagement and a recency penalty so
  // a strong textual match still beats older, more popular but weaker matches.
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT p.id
    FROM posts p
    JOIN users u ON u.id = p."userId"
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::float AS n FROM likes WHERE "postId" = p.id
    ) lk ON true
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::float AS n FROM comments WHERE "postId" = p.id
    ) cm ON true
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::float AS n FROM bookmarks WHERE "postId" = p.id
    ) bm ON true
    WHERE p."deletedAt" IS NULL
      AND u."suspendedAt" IS NULL
      AND (
        setweight(to_tsvector('simple', coalesce(u.username, '')), 'A') ||
        setweight(to_tsvector('simple', coalesce(u."displayName", '')), 'B') ||
        setweight(to_tsvector('simple', coalesce(p.content, '')), 'C')
      ) @@ websearch_to_tsquery('simple', ${q})
    ORDER BY (
      ts_rank_cd(
        setweight(to_tsvector('simple', coalesce(u.username, '')), 'A') ||
        setweight(to_tsvector('simple', coalesce(u."displayName", '')), 'B') ||
        setweight(to_tsvector('simple', coalesce(p.content, '')), 'C'),
        websearch_to_tsquery('simple', ${q})
      ) * 10
      + LN(1 + lk.n)
      + LN(1 + cm.n) * 1.5
      + LN(1 + bm.n) * 2
      - EXTRACT(EPOCH FROM (NOW() - p."createdAt")) / 86400.0 * 0.15
    ) DESC, p."createdAt" DESC
    LIMIT ${PAGE_SIZE + 1}
    OFFSET ${offset}
  `;

  const hasMore = rows.length > PAGE_SIZE;
  const ids = rows.slice(0, PAGE_SIZE).map((r) => r.id);

  if (ids.length === 0) {
    return Response.json({ posts: [], nextCursor: null } satisfies PostsPage);
  }

  const unordered = await prisma.post.findMany({
    where: { id: { in: ids } },
    include: getPostDataInclude(userId),
  });
  const byId = new Map(unordered.map((p) => [p.id, p]));
  const posts = ids
    .map((id) => byId.get(id))
    .filter((p): p is PostData => Boolean(p));

  return Response.json({
    posts,
    nextCursor: hasMore ? String(page + 1) : null,
  } satisfies PostsPage);
}
