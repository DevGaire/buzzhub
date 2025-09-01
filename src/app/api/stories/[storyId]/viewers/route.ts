import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { storyId: string } }
) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { storyId } = params;

    // Check if the story belongs to the current user
    const story = await prisma.story.findUnique({
      where: { id: storyId },
      select: { userId: true },
    });

    if (!story) {
      return Response.json({ error: "Story not found" }, { status: 404 });
    }

    // Only the story owner can see the viewers list
    if (story.userId !== user.id) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get viewers with user details
    const viewers = await prisma.storyView.findMany({
      where: { storyId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            followers: {
              where: { followerId: user.id },
              select: { followerId: true },
            },
            _count: {
              select: { followers: true },
            },
          },
        },
      },
      orderBy: { viewedAt: "desc" },
    });

    const totalCount = await prisma.storyView.count({
      where: { storyId },
    });

    return Response.json({ viewers, totalCount });
  } catch (error) {
    console.error("Error fetching story viewers:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}