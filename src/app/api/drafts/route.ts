import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { getPostDataInclude, PostsPage } from "@/lib/types";
import { NextRequest } from "next/server";

const PAGE_SIZE = 20;

export async function GET(req: NextRequest) {
  try {
    const { user } = await validateRequest();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const cursor = req.nextUrl.searchParams.get("cursor") || undefined;
    const type = req.nextUrl.searchParams.get("type") || "all";

    const status =
      type === "scheduled"
        ? ("SCHEDULED" as const)
        : type === "drafts"
          ? ("DRAFT" as const)
          : { in: ["DRAFT", "SCHEDULED"] as ("DRAFT" | "SCHEDULED")[] };

    // Scheduled first (soonest publish time), then drafts by recency.
    // updatedAt is a good proxy for draft freshness.
    const drafts = await prisma.post.findMany({
      where: { userId: user.id, status, deletedAt: null },
      include: getPostDataInclude(user.id),
      orderBy: [
        { scheduledFor: { sort: "asc", nulls: "last" } },
        { updatedAt: "desc" },
      ],
      take: PAGE_SIZE + 1,
      cursor: cursor ? { id: cursor } : undefined,
    });

    const nextCursor = drafts.length > PAGE_SIZE ? drafts[PAGE_SIZE].id : null;
    return Response.json({
      posts: drafts.slice(0, PAGE_SIZE),
      nextCursor,
    } satisfies PostsPage);
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
