"use server";

import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { getPostDataInclude } from "@/lib/types";
import { createPostSchema } from "@/lib/validation";

export async function submitPost(input: {
  content: string;
  mediaIds: string[];
  visibility?: "public" | "followers" | "only_me";
}) {
  const { user } = await validateRequest();

  if (!user) throw new Error("Unauthorized");

  const { content, mediaIds, visibility } = createPostSchema.parse(input as any);
  const mappedVisibility = visibility === "followers" ? "FOLLOWERS" : visibility === "only_me" ? "ONLY_ME" : "PUBLIC";

  const newPost = await prisma.post.create({
    data: {
      content,
      userId: user.id,
      visibility: mappedVisibility as any,
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
