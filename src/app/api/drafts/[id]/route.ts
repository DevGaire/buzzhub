import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { getPostDataInclude } from "@/lib/types";
import { updatePostSchema } from "@/lib/validation";
import { NextRequest } from "next/server";

const MIN_SCHEDULE_LEAD_MS = 60_000;
const MAX_SCHEDULE_HORIZON_MS = 90 * 24 * 3600_000;

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { user } = await validateRequest();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parsed = updatePostSchema.partial().parse(body);
    // scheduledFor / cancelSchedule live outside the post-update schema since
    // they're draft-flow only. Treat them as untrusted strings here.
    const scheduledForRaw =
      typeof body.scheduledFor === "string" ? body.scheduledFor : undefined;
    const cancelSchedule = body.cancelSchedule === true;

    const draft = await prisma.post.findUnique({
      where: { id: params.id },
      select: { userId: true, status: true },
    });
    if (!draft || draft.userId !== user.id) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
    if (draft.status !== "DRAFT" && draft.status !== "SCHEDULED") {
      return Response.json({ error: "Not a draft" }, { status: 400 });
    }

    const visibility = parsed.visibility
      ? parsed.visibility === "followers"
        ? "FOLLOWERS"
        : parsed.visibility === "only_me"
          ? "ONLY_ME"
          : "PUBLIC"
      : undefined;

    let newStatus: "DRAFT" | "SCHEDULED" | undefined;
    let newScheduledFor: Date | null | undefined;

    if (cancelSchedule) {
      newStatus = "DRAFT";
      newScheduledFor = null;
    } else if (scheduledForRaw !== undefined) {
      const at = new Date(scheduledForRaw);
      const lead = at.getTime() - Date.now();
      if (Number.isNaN(at.getTime()) || lead < MIN_SCHEDULE_LEAD_MS) {
        return Response.json(
          { error: "Schedule must be at least 1 minute in the future." },
          { status: 400 },
        );
      }
      if (lead > MAX_SCHEDULE_HORIZON_MS) {
        return Response.json(
          { error: "Schedule must be within 90 days." },
          { status: 400 },
        );
      }
      newScheduledFor = at;
      newStatus = "SCHEDULED";
    }

    const updated = await prisma.post.update({
      where: { id: params.id },
      data: {
        ...(parsed.content !== undefined ? { content: parsed.content } : {}),
        ...(visibility ? { visibility: visibility as any } : {}),
        ...(newStatus ? { status: newStatus } : {}),
        ...(newScheduledFor !== undefined ? { scheduledFor: newScheduledFor } : {}),
      },
      include: getPostDataInclude(user.id),
    });

    return Response.json(updated);
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { user } = await validateRequest();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const draft = await prisma.post.findUnique({
      where: { id: params.id },
      select: { userId: true, status: true },
    });
    if (!draft || draft.userId !== user.id) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
    if (draft.status !== "DRAFT" && draft.status !== "SCHEDULED") {
      return Response.json({ error: "Not a draft" }, { status: 400 });
    }

    await prisma.post.delete({ where: { id: params.id } });
    return Response.json({ ok: true });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
