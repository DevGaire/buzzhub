import prisma from "@/lib/prisma";
import { cacheDel, cacheKeys } from "@/lib/cache";

export const dynamic = "force-dynamic";

// Aggregates hashtags from posts in the last 24h into the trending_tags
// table. Run on a Vercel cron every 30–60 minutes. Auth via CORN_SECRET.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret =
    url.searchParams.get("secret") ||
    req.headers.get("x-cron-secret") ||
    req.headers.get("authorization")?.replace(/^Bearer /, "");
  // Accept CRON_SECRET (Vercel's convention) and the older CORN_SECRET
  // typo for backwards compat.
  const expected = process.env.CRON_SECRET || process.env.CORN_SECRET;
  if (!expected || secret !== expected) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  type Row = { hashtag: string; count: bigint };
  const rows = await prisma.$queryRaw<Row[]>`
    SELECT LOWER(unnest(regexp_matches(content, '#[[:alnum:]_]+', 'g'))) AS hashtag,
           COUNT(*)::int AS count
    FROM posts
    WHERE "createdAt" >= NOW() - INTERVAL '24 hours'
      AND archived = false
      AND "deletedAt" IS NULL
      AND status = 'PUBLISHED'
    GROUP BY hashtag
    ORDER BY count DESC, hashtag ASC
    LIMIT 50
  `;

  const now = new Date();
  await prisma.$transaction([
    prisma.trendingTag.deleteMany({}),
    ...(rows.length
      ? [
          prisma.trendingTag.createMany({
            data: rows.map((r) => ({
              tag: r.hashtag,
              count: Number(r.count),
              refreshedAt: now,
            })),
            skipDuplicates: true,
          }),
        ]
      : []),
  ]);

  // The /explore page caches the trending list for 60s; bust it now so the
  // next viewer sees the fresh aggregate immediately.
  await cacheDel(cacheKeys.trendingTags);

  return Response.json({ refreshed: rows.length, at: now.toISOString() });
}
