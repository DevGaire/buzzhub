import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Aggregates hashtags from posts in the last 24h into the trending_tags
// table. Run on a Vercel cron every 30–60 minutes. Auth via CORN_SECRET.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret =
    url.searchParams.get("secret") ||
    req.headers.get("x-cron-secret") ||
    req.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!process.env.CORN_SECRET || secret !== process.env.CORN_SECRET) {
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

  return Response.json({ refreshed: rows.length, at: now.toISOString() });
}
