import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { visiblePostFilter } from "@/lib/moderation";
import { getPostDataInclude } from "@/lib/types";
import { formatNumber } from "@/lib/utils";
import { cacheKeys, cached } from "@/lib/cache";
import Post from "@/components/posts/Post";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Suspense } from "react";

export const metadata = {
  title: "Explore • Buzzhub",
  description: "Discover trending posts and topics on Buzzhub",
};

async function getTrendingTopics(): Promise<{ hashtag: string; count: number }[]> {
  // Cache-aside, 60s TTL — every viewer of /explore shares the same answer,
  // and the cron refreshes the underlying table at most every 24h anyway.
  return cached(cacheKeys.trendingTags, 60, async () => {
    // Read the precomputed table first (refreshed by /api/trending/refresh
    // cron). Fall back to a live 24h aggregation if the table is empty —
    // happens before the first cron run.
    const rows = await prisma.trendingTag.findMany({
      orderBy: [{ count: "desc" }, { tag: "asc" }],
      take: 10,
    });
    if (rows.length > 0) {
      return rows.map((t) => ({ hashtag: t.tag, count: t.count }));
    }
    const live = await prisma.$queryRaw<{ hashtag: string; count: bigint }[]>`
      SELECT LOWER(unnest(regexp_matches(content, '#[[:alnum:]_]+', 'g'))) AS hashtag, COUNT(*) AS count
      FROM posts
      WHERE "createdAt" >= NOW() - INTERVAL '24 hours'
        AND archived = false
        AND "deletedAt" IS NULL
        AND status = 'PUBLISHED'
      GROUP BY (hashtag)
      ORDER BY count DESC, hashtag ASC
      LIMIT 10
    `;
    return live.map((r) => ({ hashtag: r.hashtag, count: Number(r.count) }));
  });
}

async function getTrendingPosts(loggedInUserId: string) {
  // Top posts by like count in the last 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const posts = await prisma.post.findMany({
    where: { ...visiblePostFilter, createdAt: { gte: sevenDaysAgo }, archived: false },
    include: getPostDataInclude(loggedInUserId),
    orderBy: [{ likes: { _count: "desc" } }, { createdAt: "desc" }],
    take: 25,
  });
  return posts;
}

export default async function ExplorePage() {
  const { user } = await validateRequest();
  if (!user) {
    return (
      <main className="rounded-2xl bg-card p-5 shadow-sm">
        <p className="text-muted-foreground">Please sign in to explore trending content.</p>
      </main>
    );
  }

  const [topics, posts] = await Promise.all([
    getTrendingTopics(),
    getTrendingPosts(user.id),
  ]);

  return (
    <main className="flex w-full gap-6">
      <div className="flex-1 space-y-6">
        <section className="rounded-2xl bg-card p-5 shadow-sm">
          <h1 className="mb-4 text-xl font-bold">Trending topics</h1>
          {topics.length === 0 ? (
            <p className="text-sm text-muted-foreground">No trending topics yet.</p>
          ) : (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {topics.map(({ hashtag, count }) => {
                const title = hashtag.split("#")[1];
                return (
                  <li key={hashtag}>
                    <Link href={`/hashtag/${title}`} className="block rounded-lg border p-3 hover:bg-muted/40">
                      <p className="line-clamp-1 break-all font-semibold hover:underline" title={hashtag}>
                        {hashtag}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatNumber(count)} {count === 1 ? "post" : "posts"}
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold">Trending posts</h2>
          {posts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No trending posts yet.</p>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <Post key={post.id} post={post as any} />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Right sidebar: lazy in case future additions are added */}
      <aside className="hidden w-80 flex-none md:block">
        <Suspense fallback={<Loader2 className="mx-auto animate-spin" />}> 
          <div className="rounded-2xl bg-card p-5 shadow-sm">
            <h3 className="text-lg font-semibold">Tips</h3>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
              <li>Use #hashtags in your posts to help others discover your content.</li>
              <li>Engage with posts you like to improve recommendations.</li>
            </ul>
          </div>
        </Suspense>
      </aside>
    </main>
  );
}