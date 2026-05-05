import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import streamServerClient from "@/lib/stream";

export async function POST(
  _req: Request,
  { params: { userId } }: { params: { userId: string } },
) {
  try {
    const { user } = await validateRequest();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, displayName: true, username: true, avatarUrl: true },
    });
    if (!target) return Response.json({ error: "User not found" }, { status: 404 });

    await streamServerClient.upsertUser({
      id: target.id,
      name: target.displayName,
      username: target.username,
      image: target.avatarUrl ?? undefined,
    });

    return Response.json({ ok: true });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
