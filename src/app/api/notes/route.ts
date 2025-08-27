import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function GET() {
  try {
    const { user } = await validateRequest();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const now = new Date();

    // Get following IDs
    const following = await prisma.follow.findMany({
      where: { followerId: user.id },
      select: { followingId: true },
    });
    const allowedUserIds = [user.id, ...following.map((f) => f.followingId)];

    const notes = await prisma.note.findMany({
      where: { userId: { in: allowedUserIds }, expiresAt: { gt: now } },
      include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return Response.json({ notes });
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
    const content = (body?.content || "").toString().trim();
    if (!content) return Response.json({ error: "Content required" }, { status: 400 });
    if (content.length > 60) return Response.json({ error: "Max 60 characters" }, { status: 400 });

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    await prisma.$transaction([
      prisma.note.deleteMany({ where: { userId: user.id, expiresAt: { gt: now } } }),
      prisma.note.create({ data: { userId: user.id, content, expiresAt } }),
    ]);

    return new Response(null, { status: 201 });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const { user } = await validateRequest();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const now = new Date();
    await prisma.note.deleteMany({ where: { userId: user.id, expiresAt: { gt: now } } });
    return new Response(null, { status: 204 });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
