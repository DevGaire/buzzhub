import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { CommentsPage, getCommentDataInclude } from "@/lib/types";
import { NextRequest } from "next/server";

export async function GET(
  req: NextRequest,
  { params: { postId } }: { params: { postId: string } },
) {
  try {
    const cursor = req.nextUrl.searchParams.get("cursor") || undefined;
    const parentId = req.nextUrl.searchParams.get("parentId") || null;

    const pageSize = 5;

    const { user } = await validateRequest();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const comments = await prisma.comment.findMany({
      where: { 
        postId,
        parentId: parentId // null for top-level comments, or specific parentId for replies
      },
      include: {
        ...getCommentDataInclude(user.id),
        _count: {
          select: {
            replies: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
      take: -pageSize - 1,
      cursor: cursor ? { id: cursor } : undefined,
    });

    const previousCursor = comments.length > pageSize ? comments[0].id : null;

    const data: CommentsPage = {
      comments: comments.length > pageSize ? comments.slice(1) : comments,
      previousCursor,
    };

    return Response.json(data);
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// CREATE a new comment or reply
export async function POST(
  req: NextRequest,
  { params: { postId } }: { params: { postId: string } },
) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { content, parentId } = body;

    // Validate input
    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return Response.json({ error: "Content is required" }, { status: 400 });
    }

    // Check if post exists
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { userId: true },
    });

    if (!post) {
      return Response.json({ error: "Post not found" }, { status: 404 });
    }

    // If parentId is provided, check if parent comment exists
    if (parentId) {
      const parentComment = await prisma.comment.findUnique({
        where: { id: parentId },
        select: { postId: true },
      });

      if (!parentComment) {
        return Response.json({ error: "Parent comment not found" }, { status: 404 });
      }

      if (parentComment.postId !== postId) {
        return Response.json({ error: "Parent comment does not belong to this post" }, { status: 400 });
      }
    }

    // Create the comment
    const comment = await prisma.comment.create({
      data: {
        content: content.trim(),
        userId: user.id,
        postId,
        parentId: parentId || null,
      },
      include: getCommentDataInclude(user.id),
    });

    // Create notification for post owner (if it's not their own comment)
    if (post.userId !== user.id && !parentId) {
      await prisma.notification.create({
        data: {
          recipientId: post.userId,
          issuerId: user.id,
          postId,
          type: "COMMENT",
        },
      });
    }

    // Create notification for parent comment owner (if it's a reply and not their own)
    if (parentId) {
      const parentComment = await prisma.comment.findUnique({
        where: { id: parentId },
        select: { userId: true },
      });

      if (parentComment && parentComment.userId !== user.id) {
        await prisma.notification.create({
          data: {
            recipientId: parentComment.userId,
            issuerId: user.id,
            postId,
            type: "REPLY",
          },
        });
      }
    }

    return Response.json(comment, { status: 201 });
  } catch (error) {
    console.error("Error creating comment:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}