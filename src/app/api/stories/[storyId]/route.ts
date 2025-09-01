import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { storyId: string } }
) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { storyId } = params;

    // Check if story exists and belongs to the user
    const story = await prisma.story.findUnique({
      where: {
        id: storyId,
      },
      select: {
        userId: true,
      },
    });

    if (!story) {
      return Response.json({ error: "Story not found" }, { status: 404 });
    }

    if (story.userId !== user.id) {
      return Response.json({ error: "Unauthorized to delete this story" }, { status: 403 });
    }

    // Delete the story (cascading delete will handle related records)
    await prisma.story.delete({
      where: {
        id: storyId,
      },
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error deleting story:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}