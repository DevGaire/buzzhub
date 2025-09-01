import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: { storyId: string } }
) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { storyId } = params;

    // Check if story exists and is not expired
    const story = await prisma.story.findFirst({
      where: {
        id: storyId,
        expiresAt: { gt: new Date() },
      },
    });

    if (!story) {
      return Response.json({ error: "Story not found or expired" }, { status: 404 });
    }

    // Don't track views for own stories
    if (story.userId === user.id) {
      return Response.json({ success: true });
    }

    // Create or update view record
    await prisma.storyView.upsert({
      where: {
        userId_storyId: {
          userId: user.id,
          storyId: storyId,
        },
      },
      update: {
        viewedAt: new Date(),
      },
      create: {
        userId: user.id,
        storyId: storyId,
      },
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}