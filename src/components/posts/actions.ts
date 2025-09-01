"use server";

import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { getPostDataInclude } from "@/lib/types";
import { updatePostSchema } from "@/lib/validation";

export async function deletePost(id: string) {
  const { user } = await validateRequest();

  if (!user) throw new Error("Unauthorized");

  const post = await prisma.post.findUnique({
    where: { id },
  });

  if (!post) throw new Error("Post not found");

  if (post.userId !== user.id) throw new Error("Unauthorized");

  const deletedPost = await prisma.post.delete({
    where: { id },
    include: getPostDataInclude(user.id),
  });

  return deletedPost;
}

export async function repostPost(postId: string) {
  const { user } = await validateRequest();
  if (!user) throw new Error("Unauthorized");

  const original = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      user: { select: { username: true, displayName: true } },
    },
  });

  if (!original) throw new Error("Post not found");

  const content = `RP @${original.user.username}: ${original.content}`;

  const newPost = await prisma.post.create({
    data: {
      content,
      userId: user.id,
    },
    include: getPostDataInclude(user.id),
  });

  if (original.user && user.id !== original.userId) {
    try {
      await prisma.notification.create({
        data: {
          issuerId: user.id,
          recipientId: original.userId,
          postId: newPost.id,
          type: "MENTION",
        },
      });
    } catch (e) {
      // non-fatal
      console.error(e);
    }
  }

  return newPost;
}

export async function updatePost(input: {
  id: string;
  content: string;
  visibility?: "public" | "followers" | "only_me";
}) {
  const { user } = await validateRequest();
  if (!user) throw new Error("Unauthorized");

  const parsed = updatePostSchema.parse({ content: input.content, visibility: input.visibility });
  const post = await prisma.post.findUnique({ where: { id: input.id } });
  if (!post) throw new Error("Post not found");
  if (post.userId !== user.id) throw new Error("Unauthorized");

  const mappedVisibility = parsed.visibility
    ? parsed.visibility === "followers"
      ? "FOLLOWERS"
      : parsed.visibility === "only_me"
      ? "ONLY_ME"
      : "PUBLIC"
    : undefined;

  const updated = await prisma.post.update({
    where: { id: input.id },
    data: {
      content: parsed.content,
      ...(mappedVisibility ? { visibility: mappedVisibility as any } : {}),
    },
    include: getPostDataInclude(user.id),
  });

  return updated;
}

export async function setPostArchived(input: { id: string; archived: boolean }) {
  const { user } = await validateRequest();
  if (!user) throw new Error("Unauthorized");

  const post = await prisma.post.findUnique({ where: { id: input.id } });
  if (!post) throw new Error("Post not found");
  if (post.userId !== user.id) throw new Error("Unauthorized");

  const updated = await prisma.post.update({
    where: { id: input.id },
    data: { archived: input.archived },
    include: getPostDataInclude(user.id),
  });

  return updated;
}
