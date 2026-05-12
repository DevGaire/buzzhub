"use server";

import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { pushToUser } from "@/lib/push";
import { limit } from "@/lib/rate-limit";
import { getPostDataInclude } from "@/lib/types";
import { createPostSchema } from "@/lib/validation";

// A scheduled post must land at least this far in the future, and no more
// than this far out. Keeps the cron loop from chasing posts that are about
// to fire and prevents someone parking a post in 2099.
const MIN_SCHEDULE_LEAD_MS = 60_000; // 1 minute
const MAX_SCHEDULE_HORIZON_MS = 90 * 24 * 3600_000; // 90 days

export async function submitPost(input: {
  content: string;
  mediaIds: string[];
  visibility?: "public" | "followers" | "only_me";
  poll?: { options: string[]; expiresInHours?: number };
  quotedPostId?: string;
  status?: "draft" | "published" | "scheduled";
  scheduledFor?: string;
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

  const { content, mediaIds, visibility, status, scheduledFor } =
    createPostSchema.parse(input as any);

  let resolvedStatus: "DRAFT" | "SCHEDULED" | "PUBLISHED" =
    status === "draft" ? "DRAFT" : status === "scheduled" ? "SCHEDULED" : "PUBLISHED";
  let scheduledAt: Date | null = null;

  if (resolvedStatus === "SCHEDULED") {
    if (!scheduledFor) throw new Error("Pick a time to schedule the post.");
    scheduledAt = new Date(scheduledFor);
    const lead = scheduledAt.getTime() - Date.now();
    if (Number.isNaN(scheduledAt.getTime()) || lead < MIN_SCHEDULE_LEAD_MS) {
      throw new Error("Schedule must be at least 1 minute in the future.");
    }
    if (lead > MAX_SCHEDULE_HORIZON_MS) {
      throw new Error("Schedule must be within 90 days.");
    }
  }

  // Only real publishes count against the per-minute budget. Drafts and
  // scheduled posts publish on their own clock and don't need the same guard.
  if (resolvedStatus === "PUBLISHED") {
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
      status: resolvedStatus,
      scheduledFor: scheduledAt,
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

  if (resolvedStatus === "PUBLISHED") {
    await sendMentionNotifications(newPost.id, content, user.id, user.displayName);
  }

  return newPost;
}

export async function sendMentionNotifications(
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
 * Promote a draft or scheduled post to PUBLISHED immediately. Refreshes
 * createdAt so it lands at the top of feeds (a draft that sat for a week
 * shouldn't bury itself when published).
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
  if (draft.status !== "DRAFT" && draft.status !== "SCHEDULED") {
    throw new Error("Already published");
  }

  const published = await prisma.post.update({
    where: { id: postId },
    data: { status: "PUBLISHED", scheduledFor: null, createdAt: new Date() },
    include: getPostDataInclude(user.id),
  });

  await sendMentionNotifications(published.id, draft.content, user.id, user.displayName);

  return published;
}
