"use server";

import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { pushToUser } from "@/lib/push";
import { limit } from "@/lib/rate-limit";
import { getPostDataInclude } from "@/lib/types";
import { createPostSchema } from "@/lib/validation";

export async function submitPost(input: {
  content: string;
  mediaIds: string[];
  visibility?: "public" | "followers" | "only_me";
  poll?: { options: string[]; expiresInHours?: number };
  quotedPostId?: string;
}) {
  const { user } = await validateRequest();
  if (!user) throw new Error("Unauthorized");

  const guard = await prisma.user.findUnique({
    where: { id: user.id },
    select: { suspendedAt: true },
  });
  if (guard?.suspendedAt) {
    throw new Error("Your account is suspended.");
  }

  // 10 posts per minute per user.
  const rl = limit(`post:${user.id}`, 10, 60_000);
  if (!rl.ok) {
    throw new Error("Slow down — you're posting too quickly.");
  }

  const { content, mediaIds, visibility } = createPostSchema.parse(input as any);
  const mappedVisibility =
    visibility === "followers" ? "FOLLOWERS" : visibility === "only_me" ? "ONLY_ME" : "PUBLIC";

  const newPost = await prisma.post.create({
    data: {
      content,
      userId: user.id,
      visibility: mappedVisibility as any,
      quotedPostId: input.quotedPostId ?? null,
      attachments: { connect: mediaIds.map((id) => ({ id })) },
      ...(input.poll && input.poll.options.length >= 2
        ? {
            poll: {
              create: {
                expiresAt: input.poll.expiresInHours
                  ? new Date(Date.now() + input.poll.expiresInHours * 3_600_000)
                  : null,
                options: {
                  createMany: {
                    data: input.poll.options.map((text, order) => ({ text, order })),
                  },
                },
              },
            },
          }
        : {}),
    },
    include: getPostDataInclude(user.id),
  });

  // mention notifications
  const mentioned = Array.from(
    new Set((content.match(/@([a-zA-Z0-9_]+)/g) || []).map((m) => m.slice(1).toLowerCase())),
  );
  if (mentioned.length) {
    const users = await prisma.user.findMany({
      where: { username: { in: mentioned } },
      select: { id: true },
    });
    const recipients = users.filter((u) => u.id !== user.id);
    await prisma.notification.createMany({
      data: recipients.map((u) => ({
        issuerId: user.id,
        recipientId: u.id,
        postId: newPost.id,
        type: "MENTION",
      })),
      skipDuplicates: true,
    });
    for (const r of recipients) {
      pushToUser(r.id, {
        title: `${user.displayName} mentioned you`,
        body: content.slice(0, 80),
        url: `/posts/${newPost.id}`,
      }).catch(() => {});
    }
  }

  return newPost;
}
