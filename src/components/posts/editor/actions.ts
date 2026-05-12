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
  status?: "draft" | "published";
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

  const { content, mediaIds, visibility, status } = createPostSchema.parse(input as any);
  const isDraft = status === "draft";

  // Rate-limit only real publishes — drafts shouldn't burn the budget.
  if (!isDraft) {
    const rl = limit(`post:${user.id}`, 10, 60_000);
    if (!rl.ok) {
      throw new Error("Slow down — you're posting too quickly.");
    }
  }

  const mappedVisibility =
    visibility === "followers" ? "FOLLOWERS" : visibility === "only_me" ? "ONLY_ME" : "PUBLIC";

  const newPost = await prisma.post.create({
    data: {
      content,
      userId: user.id,
      status: isDraft ? "DRAFT" : "PUBLISHED",
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

  if (!isDraft) {
    await sendMentionNotifications(newPost.id, content, user.id, user.displayName);
  }

  return newPost;
}

async function sendMentionNotifications(
  postId: string,
  content: string,
  authorId: string,
  authorName: string,
) {
  const mentioned = Array.from(
    new Set((content.match(/@([a-zA-Z0-9_]+)/g) || []).map((m) => m.slice(1).toLowerCase())),
  );
  if (!mentioned.length) return;

  const users = await prisma.user.findMany({
    where: { username: { in: mentioned } },
    select: { id: true },
  });
  const recipients = users.filter((u) => u.id !== authorId);
  if (!recipients.length) return;

  await prisma.notification.createMany({
    data: recipients.map((u) => ({
      issuerId: authorId,
      recipientId: u.id,
      postId,
      type: "MENTION",
    })),
    skipDuplicates: true,
  });
  for (const r of recipients) {
    pushToUser(r.id, {
      title: `${authorName} mentioned you`,
      body: content.slice(0, 80),
      url: `/posts/${postId}`,
    }).catch(() => {});
  }
}

/**
 * Promote a draft to PUBLISHED. Refreshes createdAt so it appears at the top
 * of feeds (drafts that sat for a week shouldn't bury themselves on publish).
 */
export async function publishDraft(postId: string) {
  const { user } = await validateRequest();
  if (!user) throw new Error("Unauthorized");

  const guard = await prisma.user.findUnique({
    where: { id: user.id },
    select: { suspendedAt: true },
  });
  if (guard?.suspendedAt) {
    throw new Error("Your account is suspended.");
  }

  const rl = limit(`post:${user.id}`, 10, 60_000);
  if (!rl.ok) {
    throw new Error("Slow down — you're posting too quickly.");
  }

  const draft = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, userId: true, status: true, content: true },
  });
  if (!draft || draft.userId !== user.id) throw new Error("Not found");
  if (draft.status !== "DRAFT") throw new Error("Already published");

  const published = await prisma.post.update({
    where: { id: postId },
    data: { status: "PUBLISHED", createdAt: new Date() },
    include: getPostDataInclude(user.id),
  });

  await sendMentionNotifications(published.id, draft.content, user.id, user.displayName);

  return published;
}
