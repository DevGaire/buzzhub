import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { getPostDataInclude } from "@/lib/types";
import { updatePostSchema } from "@/lib/validation";
import { NextRequest } from "next/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { user } = await validateRequest();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parsed = updatePostSchema.partial().parse(body);

    const draft = await prisma.post.findUnique({
      where: { id: params.id },
      select: { userId: true, status: true },
    });
    if (!draft || draft.userId !== user.id) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
    if (draft.status !== "DRAFT") {
      return Response.json({ error: "Not a draft" }, { status: 400 });
    }

    const visibility = parsed.visibility
      ? parsed.visibility === "followers"
        ? "FOLLOWERS"
        : parsed.visibility === "only_me"
          ? "ONLY_ME"
          : "PUBLIC"
      : undefined;

    const updated = await prisma.post.update({
      where: { id: params.id },
      data: {
        ...(parsed.content !== undefined ? { content: parsed.content } : {}),
        ...(visibility ? { visibility: visibility as any } : {}),
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
    if (draft.status !== "DRAFT") {
      return Response.json({ error: "Not a draft" }, { status: 400 });
    }

    await prisma.post.delete({ where: { id: params.id } });
    return Response.json({ ok: true });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
