import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { getPostDataInclude, PostsPage } from "@/lib/types";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { user } = await validateRequest();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cursor = req.nextUrl.searchParams.get("cursor") || undefined;
    const collectionId = req.nextUrl.searchParams.get("collectionId") || undefined;
    const pageSize = 10;

    const baseWhere = collectionId
      ? {
          // Posts saved in a specific collection belonging to this user
          collectionItems: {
            some: {
              collectionId,
              collection: { userId: user.id },
            },
          },
        }
      : {
          // All posts the user bookmarked
          bookmarks: {
            some: {
              userId: user.id,
            },
          },
        };

    const posts = await prisma.post.findMany({
      where: baseWhere,
      include: getPostDataInclude(user.id),
      orderBy: { createdAt: "desc" },
      take: pageSize + 1,
      cursor: cursor ? { id: cursor } : undefined,
    });

    const nextCursor = posts.length > pageSize ? posts[pageSize].id : null;

    const data: PostsPage = {
      posts: posts.slice(0, pageSize),
      nextCursor,
    };

    return Response.json(data);
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
