import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { PostVisibility } from "@prisma/client";
import { NextRequest } from "next/server";

// GET a single post
export async function GET(
  req: NextRequest,
  { params }: { params: { postId: string } }
) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const post = await prisma.post.findUnique({
      where: { id: params.postId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        attachments: true,
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
    });

    if (!post) {
      return Response.json({ error: "Post not found" }, { status: 404 });
    }

    // Check visibility permissions
    if (post.visibility === PostVisibility.ONLY_ME && post.userId !== user.id) {
      return Response.json({ error: "Post not found" }, { status: 404 });
    }

    if (post.visibility === PostVisibility.FOLLOWERS) {
      const isFollowing = await prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: user.id,
            followingId: post.userId,
          },
        },
      });

      if (!isFollowing && post.userId !== user.id) {
        return Response.json({ error: "Post not found" }, { status: 404 });
      }
    }

    return Response.json(post);
  } catch (error) {
    console.error("Error fetching post:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// UPDATE a post
export async function PATCH(
  req: NextRequest,
  { params }: { params: { postId: string } }
) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body;
    try {
      body = await req.json();
    } catch (error) {
      return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    
    const { content, visibility } = body;

    // Validate input
    if (content !== undefined && typeof content !== "string") {
      return Response.json({ error: "Invalid content" }, { status: 400 });
    }

    if (content && content.trim().length === 0) {
      return Response.json({ error: "Content cannot be empty" }, { status: 400 });
    }

    if (visibility !== undefined && !Object.values(PostVisibility).includes(visibility)) {
      return Response.json({ error: "Invalid visibility setting" }, { status: 400 });
    }

    // Check if post exists and belongs to user
    const existingPost = await prisma.post.findUnique({
      where: { id: params.postId },
      select: { userId: true },
    });

    if (!existingPost) {
      return Response.json({ error: "Post not found" }, { status: 404 });
    }

    if (existingPost.userId !== user.id) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Update the post
    const updatedPost = await prisma.post.update({
      where: { id: params.postId },
      data: {
        ...(content !== undefined && { content }),
        ...(visibility !== undefined && { visibility }),
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        attachments: true,
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
    });

    return Response.json(updatedPost);
  } catch (error) {
    console.error("Error updating post:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE a post
export async function DELETE(
  req: NextRequest,
  { params }: { params: { postId: string } }
) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if post exists and belongs to user
    const existingPost = await prisma.post.findUnique({
      where: { id: params.postId },
      select: { userId: true },
    });

    if (!existingPost) {
      return Response.json({ error: "Post not found" }, { status: 404 });
    }

    if (existingPost.userId !== user.id) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Delete the post
    await prisma.post.delete({
      where: { id: params.postId },
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error deleting post:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}