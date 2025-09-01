import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { NextRequest } from "next/server";

// Like a comment
export async function POST(
  req: NextRequest,
  { params }: { params: { postId: string; commentId: string } }
) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if comment exists
    const comment = await prisma.comment.findUnique({
      where: { id: params.commentId },
      select: { 
        userId: true, 
        postId: true,
        parentId: true,
        user: {
          select: {
            displayName: true
          }
        }
      },
    });

    if (!comment) {
      return Response.json({ error: "Comment not found" }, { status: 404 });
    }

    if (comment.postId !== params.postId) {
      return Response.json({ error: "Comment does not belong to this post" }, { status: 400 });
    }

    // Check if already liked
    const existingLike = await prisma.commentLike.findUnique({
      where: {
        userId_commentId: {
          userId: user.id,
          commentId: params.commentId,
        },
      },
    });

    if (existingLike) {
      return Response.json({ error: "Already liked" }, { status: 400 });
    }

    // Create like
    await prisma.commentLike.create({
      data: {
        userId: user.id,
        commentId: params.commentId,
      },
    });

    // Create notification if it's not the user's own comment
    if (comment.userId !== user.id) {
      // Determine notification type and message
      const isReply = comment.parentId !== null;
      const notificationMessage = isReply 
        ? `liked your reply` 
        : `liked your comment`;

      await prisma.notification.create({
        data: {
          recipientId: comment.userId,
          issuerId: user.id,
          postId: params.postId,
          type: "COMMENT_LIKE",
        },
      });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error liking comment:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Unlike a comment
export async function DELETE(
  req: NextRequest,
  { params }: { params: { postId: string; commentId: string } }
) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if like exists
    const existingLike = await prisma.commentLike.findUnique({
      where: {
        userId_commentId: {
          userId: user.id,
          commentId: params.commentId,
        },
      },
    });

    if (!existingLike) {
      return Response.json({ error: "Like not found" }, { status: 404 });
    }

    // Delete like
    await prisma.commentLike.delete({
      where: {
        userId_commentId: {
          userId: user.id,
          commentId: params.commentId,
        },
      },
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error unliking comment:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}