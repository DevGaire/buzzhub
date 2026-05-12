import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Sparkline from "./Sparkline";

export const metadata: Metadata = { title: "Analytics" };

// Days of history shown across all 30-day charts and "recent top posts".
const WINDOW_DAYS = 30;

export default async function Page() {
  const { user } = await validateRequest();
  if (!user) redirect("/login");

  const now = new Date();
  const windowStart = new Date(now.getTime() - WINDOW_DAYS * 24 * 3600_000);

  const [
    postsCount,
    likesReceived,
    commentsReceived,
    bookmarksReceived,
    impressionsTotal,
    followers,
    followerSeries,
    impressionSeries,
    topPosts,
  ] = await Promise.all([
    prisma.post.count({
      where: { userId: user.id, status: "PUBLISHED", deletedAt: null },
    }),
    prisma.like.count({ where: { post: { userId: user.id, deletedAt: null } } }),
    prisma.comment.count({
      where: { post: { userId: user.id, deletedAt: null } },
    }),
    prisma.bookmark.count({
      where: { post: { userId: user.id, deletedAt: null } },
    }),
    prisma.postImpression.count({
      where: { post: { userId: user.id, deletedAt: null } },
    }),
    prisma.follow.count({ where: { followingId: user.id } }),
    prisma.$queryRaw<{ day: Date; count: bigint }[]>`
      SELECT date_trunc('day', "createdAt") AS day, COUNT(*)::bigint AS count
      FROM follows
      WHERE "followingId" = ${user.id}
        AND "createdAt" >= ${windowStart}
      GROUP BY day
      ORDER BY day ASC
    `,
    prisma.$queryRaw<{ day: Date; count: bigint }[]>`
      SELECT date_trunc('day', i."createdAt") AS day, COUNT(*)::bigint AS count
      FROM post_impressions i
      JOIN posts p ON p.id = i."postId"
      WHERE p."userId" = ${user.id}
        AND i."createdAt" >= ${windowStart}
      GROUP BY day
      ORDER BY day ASC
    `,
    prisma.post.findMany({
      where: {
        userId: user.id,
        status: "PUBLISHED",
        deletedAt: null,
        createdAt: { gte: windowStart },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        content: true,
        createdAt: true,
        _count: {
          select: {
            likes: true,
            comments: true,
            bookmarks: true,
            impressions: true,
          },
        },
      },
    }),
  ]);

  // Bucket by day and fill zeros so the sparkline reads as a real time series.
  const followerDaily = fillDailySeries(followerSeries, windowStart, now);
  const impressionDaily = fillDailySeries(impressionSeries, windowStart, now);

  const top = [...topPosts]
    .sort((a, b) => b._count.impressions - a._count.impressions)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-card p-5 shadow-sm">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Last {WINDOW_DAYS} days. Impressions track other people viewing your posts; your own views don&apos;t count.
        </p>
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Posts" value={postsCount} />
        <StatCard label="Followers" value={followers} />
        <StatCard label="Impressions" value={impressionsTotal} />
        <StatCard label="Likes" value={likesReceived} />
        <StatCard label="Comments" value={commentsReceived} />
        <StatCard label="Bookmarks" value={bookmarksReceived} />
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard
          title="New followers per day"
          total={followerDaily.reduce((a, b) => a + b, 0)}
          subtitle="last 30 days"
        >
          <Sparkline values={followerDaily} />
        </ChartCard>
        <ChartCard
          title="Impressions per day"
          total={impressionDaily.reduce((a, b) => a + b, 0)}
          subtitle="last 30 days"
        >
          <Sparkline values={impressionDaily} />
        </ChartCard>
      </section>

      <section className="rounded-2xl bg-card p-5 shadow-sm">
        <h2 className="text-lg font-bold">Top posts</h2>
        <p className="text-xs text-muted-foreground mb-3">
          Your most-seen posts from the last 30 days.
        </p>
        {top.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No posts in the last 30 days yet.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {top.map((p) => (
              <li key={p.id} className="py-3">
                <Link
                  href={`/posts/${p.id}`}
                  className="block hover:underline"
                >
                  <p className="line-clamp-2 text-sm">
                    {p.content || (
                      <span className="italic text-muted-foreground">(no text)</span>
                    )}
                  </p>
                </Link>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>{p._count.impressions} impressions</span>
                  <span>{p._count.likes} likes</span>
                  <span>{p._count.comments} comments</span>
                  <span>{p._count.bookmarks} bookmarks</span>
                  <span>{new Date(p.createdAt).toLocaleDateString()}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-card p-4 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold tabular-nums">
        {value.toLocaleString()}
      </div>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  total,
  children,
}: {
  title: string;
  subtitle?: string;
  total: number;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-card p-5 shadow-sm">
      <div className="mb-3 flex items-end justify-between">
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div className="text-xl font-bold tabular-nums">
          {total.toLocaleString()}
        </div>
      </div>
      {children}
    </div>
  );
}

function fillDailySeries(
  rows: { day: Date; count: bigint }[],
  start: Date,
  end: Date,
): number[] {
  const startDay = startOfDay(start);
  const endDay = startOfDay(end);
  const days = Math.round((endDay.getTime() - startDay.getTime()) / 86_400_000) + 1;
  const byKey = new Map<string, number>();
  for (const r of rows) {
    const d = startOfDay(new Date(r.day));
    byKey.set(d.toISOString(), Number(r.count));
  }
  const out: number[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(startDay.getTime() + i * 86_400_000);
    out.push(byKey.get(d.toISOString()) ?? 0);
  }
  return out;
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}
