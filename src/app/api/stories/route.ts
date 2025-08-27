import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function GET() {
  try {
    const { user } = await validateRequest();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const now = new Date();

    const following = await prisma.follow.findMany({
      where: { followerId: user.id },
      select: { followingId: true },
    });
    const allowedUserIds = [user.id, ...following.map((f) => f.followingId)];

    const stories = await prisma.story.findMany({
      where: { userId: { in: allowedUserIds }, expiresAt: { gt: now } },
      include: {
        user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        items: { include: { media: true }, orderBy: { order: "asc" } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return Response.json({ stories });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await validateRequest();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const mediaIds = (body?.mediaIds || []) as string[];
    if (!Array.isArray(mediaIds) || mediaIds.length === 0) {
      return Response.json({ error: "mediaIds array required" }, { status: 400 });
    }

    // Validate media constraints
    const medias = await prisma.media.findMany({ where: { id: { in: mediaIds } } });
    if (medias.length !== mediaIds.length) {
      return Response.json({ error: "Some media not found" }, { status: 400 });
    }

    const imageCount = medias.filter((m) => m.type === "IMAGE").length;
    const videoCount = medias.filter((m) => m.type === "VIDEO").length;

    if (imageCount > 10) {
      return Response.json({ error: "Maximum 10 images allowed in a story" }, { status: 400 });
    }
    if (videoCount > 1) {
      return Response.json({ error: "Maximum 1 video allowed in a story" }, { status: 400 });
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const story = await prisma.story.create({
      data: {
        userId: user.id,
        expiresAt,
        items: {
          createMany: {
            data: mediaIds.map((id, idx) => ({ mediaId: id, order: idx })),
          },
        },
      },
    });

    return Response.json({ id: story.id }, { status: 201 });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
