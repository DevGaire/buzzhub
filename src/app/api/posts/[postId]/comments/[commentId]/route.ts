import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { getCommentDataInclude } from "@/lib/types";
import { NextRequest } from "next/server";

// UPDATE a comment
export async function PATCH(
  req: NextRequest,
  { params }: { params: { postId: string; commentId: string } }
) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { content } = body;

    // Validate input
    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return Response.json({ error: "Content is required" }, { status: 400 });
    }

    // Check if comment exists and belongs to user
    const existingComment = await prisma.comment.findUnique({
      where: { id: params.commentId },
      select: { userId: true, postId: true },
    });

    if (!existingComment) {
      return Response.json({ error: "Comment not found" }, { status: 404 });
    }

    if (existingComment.userId !== user.id) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (existingComment.postId !== params.postId) {
      return Response.json({ error: "Comment does not belong to this post" }, { status: 400 });
    }

    // Update the comment
    const updatedComment = await prisma.comment.update({
      where: { id: params.commentId },
      data: {
        content: content.trim(),
      },
      include: getCommentDataInclude(user.id),
    });

    return Response.json(updatedComment);
  } catch (error) {
    console.error("Error updating comment:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE a comment
export async function DELETE(
  req: NextRequest,
  { params }: { params: { postId: string; commentId: string } }
) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if comment exists and belongs to user
    const existingComment = await prisma.comment.findUnique({
      where: { id: params.commentId },
      select: { userId: true, postId: true },
    });

    if (!existingComment) {
      return Response.json({ error: "Comment not found" }, { status: 404 });
    }

    if (existingComment.userId !== user.id) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (existingComment.postId !== params.postId) {
      return Response.json({ error: "Comment does not belong to this post" }, { status: 400 });
    }

    // Delete the comment (cascading delete will handle replies)
    await prisma.comment.delete({
      where: { id: params.commentId },
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error deleting comment:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}