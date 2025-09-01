"use server";

import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { getCommentDataInclude, PostData } from "@/lib/types";
import { createCommentSchema, updateCommentSchema } from "@/lib/validation";

export async function submitComment({
  post,
  content,
}: {
  post: PostData;
  content: string;
}) {
  const { user } = await validateRequest();

  if (!user) throw new Error("Unauthorized");

  const { content: contentValidated } = createCommentSchema.parse({ content });

  const [newComment] = await prisma.$transaction([
    prisma.comment.create({
      data: {
        content: contentValidated,
        postId: post.id,
        userId: user.id,
      },
      include: getCommentDataInclude(user.id),
    }),
    ...(post.user.id !== user.id
      ? [
          prisma.notification.create({
            data: {
              issuerId: user.id,
              recipientId: post.user.id,
              postId: post.id,
              type: "COMMENT",
            },
          }),
        ]
      : []),
  ]);

  // mention notifications in comment
  const mentioned = Array.from(new Set(
    (contentValidated.match(/@([a-zA-Z0-9_]+)/g) || []).map((m) => m.slice(1).toLowerCase())
  ));
  if (mentioned.length) {
    const users = await prisma.user.findMany({
      where: { username: { in: mentioned } },
      select: { id: true },
    });
    await prisma.notification.createMany({
      data: users
        .filter((u) => u.id !== user.id)
        .map((u) => ({ issuerId: user.id, recipientId: u.id, postId: post.id, type: "MENTION" })),
      skipDuplicates: true,
    });
  }

  return newComment;
}

export async function updateComment({
  id,
  content,
}: {
  id: string;
  content: string;
}) {
  const { user } = await validateRequest();
  if (!user) throw new Error("Unauthorized");

  const { content: contentValidated } = updateCommentSchema.parse({ content });

  const existing = await prisma.comment.findUnique({ where: { id } });
  if (!existing) throw new Error("Comment not found");
  if (existing.userId !== user.id) throw new Error("Unauthorized");

  const updated = await prisma.comment.update({
    where: { id },
    data: { content: contentValidated },
    include: getCommentDataInclude(user.id),
  });

  return updated;
}

export async function deleteComment(id: string) {
  const { user } = await validateRequest();

  if (!user) throw new Error("Unauthorized");

  const comment = await prisma.comment.findUnique({
    where: { id },
  });

  if (!comment) throw new Error("Comment not found");

  if (comment.userId !== user.id) throw new Error("Unauthorized");

  const deletedComment = await prisma.comment.delete({
    where: { id },
    include: getCommentDataInclude(user.id),
  });

  return deletedComment;
}
