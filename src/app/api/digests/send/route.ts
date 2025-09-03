import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

async function buildUserDigest(userId: string) {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // New followers in last 7 days
  const newFollowers = await prisma.follow.findMany({
    where: {
      followingId: userId,
      // Created time isn't on Follow; if not present, fallback to all and slice in email
    },
    select: {
      follower: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
    },
    orderBy: { followerId: "asc" },
    take: 50,
  });

  // People the user follows
  const following = await prisma.follow.findMany({
    where: { followerId: userId },
    select: { followingId: true },
  });
  const followingIds = following.map((f) => f.followingId);

  // Top posts by followed users in last week by likes count
  let topPosts: { id: string; content: string; createdAt: Date; _count: { likes: number } }[] = [];
  if (followingIds.length > 0) {
    topPosts = await prisma.post.findMany({
      where: {
        userId: { in: followingIds },
        archived: false,
        createdAt: { gte: since },
      },
      select: { id: true, content: true, createdAt: true, _count: { select: { likes: true } } },
      orderBy: [{ likes: { _count: "desc" } }, { createdAt: "desc" }],
      take: 5,
    });
  }

  return { newFollowers, topPosts };
}

function renderDigestHtml(opts: {
  appUrl: string;
  username: string;
  newFollowers: { follower: { id: string; username: string | null; displayName: string } }[];
  topPosts: { id: string; content: string; createdAt: Date; _count: { likes: number } }[];
}) {
  const { appUrl, username, newFollowers, topPosts } = opts;
  const followerItems = newFollowers
    .slice(0, 10)
    .map((f) => {
      const u = f.follower;
      const name = u.displayName || u.username || u.id;
      const href = `${appUrl}/users/${u.username ?? u.id}`;
      return `<li><a href="${href}" style="color:#0ea5e9;text-decoration:none;">${name}</a></li>`;
    })
    .join("");

  const postItems = topPosts
    .map((p) => {
      const href = `${appUrl}/posts/${p.id}`;
      const text = (p.content || "").slice(0, 140).replace(/</g, "&lt;").replace(/>/g, "&gt;");
      return `<li><a href="${href}" style="color:#0ea5e9;text-decoration:none;">${text || "View post"}</a> <span style="color:#666;">(${p._count.likes} likes)</span></li>`;
    })
    .join("");

  const hasContent = newFollowers.length > 0 || topPosts.length > 0;

  return {
    hasContent,
    html: `
      <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; line-height:1.5;">
        <h2 style="margin:0 0 12px;">Your weekly Buzzhub digest</h2>
        <p style="margin:0 0 16px; color:#444;">@${username}, here’s what you missed this week.</p>
        ${newFollowers.length > 0 ? `
        <h3 style="margin:16px 0 8px;">New followers</h3>
        <ul style="margin:0 0 16px 18px; padding:0;">${followerItems}</ul>` : ""}
        ${topPosts.length > 0 ? `
        <h3 style="margin:16px 0 8px;">Top posts from people you follow</h3>
        <ul style="margin:0 0 16px 18px; padding:0;">${postItems}</ul>` : ""}
        ${!hasContent ? `<p style="color:#666;">Quiet week — nothing major to report.</p>` : ""}
        <p style="margin-top:24px;">
          <a href="${appUrl}/explore" style="display:inline-block;padding:10px 14px;background:#111;color:#fff;border-radius:8px;text-decoration:none">Explore</a>
        </p>
        <p style="margin-top:24px;color:#777;font-size:12px;">You’re receiving this because you have a Buzzhub account.</p>
      </div>
    `,
    text: `Your weekly Buzzhub digest\n\nNew followers: ${newFollowers.length}\nTop posts: ${topPosts.length}\nVisit: ${appUrl}/explore`,
  };
}

async function processDigests() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  if (!appUrl) throw new Error("Missing NEXT_PUBLIC_APP_URL");

  // All users with an email address
  const users = await prisma.user.findMany({
    where: { email: { not: null } },
    select: { id: true, email: true, username: true, displayName: true },
    orderBy: { createdAt: "asc" },
    take: 2000, // safety cap
  });

  let sent = 0;
  for (const u of users) {
    const { newFollowers, topPosts } = await buildUserDigest(u.id);
    const { hasContent, html, text } = renderDigestHtml({
      appUrl,
      username: u.username,
      newFollowers,
      topPosts,
    });
    if (!hasContent) continue;
    if (!u.email) continue;

    await sendEmail({
      to: u.email,
      subject: `Your weekly Buzzhub digest`,
      html,
      text,
    });
    sent++;
  }

  return { users: users.length, sent };
}

function isAuthorized(req: NextRequest) {
  const header = req.headers.get("authorization") || req.headers.get("x-cron-secret");
  const token = header?.replace(/^Bearer\s+/i, "").trim();
  return token && process.env.CRON_SECRET && token === process.env.CRON_SECRET;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const result = await processDigests();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("[digests][GET]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const result = await processDigests();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("[digests][POST]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
