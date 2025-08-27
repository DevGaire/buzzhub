"use server";

import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { getPostDataInclude } from "@/lib/types";
import { createPostSchema } from "@/lib/validation";

export async function submitPost(input: {
  content: string;
  mediaIds: string[];
}) {
  const { user } = await validateRequest();

  if (!user) throw new Error("Unauthorized");

  const { content, mediaIds } = createPostSchema.parse(input);

  const newPost = await prisma.post.create({
    data: {
      content,
      userId: user.id,
      attachments: {
        connect: mediaIds.map((id) => ({ id })),
      },
    },
    include: getPostDataInclude(user.id),
  });

  // mention notifications for @username in content
  const mentioned = Array.from(new Set(
    (content.match(/@([a-zA-Z0-9_]+)/g) || []).map((m) => m.slice(1).toLowerCase())
  ));
  if (mentioned.length) {
    const users = await prisma.user.findMany({
      where: { username: { in: mentioned } },
      select: { id: true },
    });
    await prisma.notification.createMany({
      data: users
        .filter((u) => u.id !== user.id)
        .map((u) => ({ issuerId: user.id, recipientId: u.id, postId: newPost.id, type: "MENTION" })),
      skipDuplicates: true,
    });
  }

  return newPost;
}
