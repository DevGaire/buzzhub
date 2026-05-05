import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import streamServerClient from "@/lib/stream";

export async function GET() {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [following, followers] = await Promise.all([
      prisma.follow.findMany({
        where: { followerId: user.id },
        include: {
          following: {
            select: { id: true, username: true, displayName: true, avatarUrl: true },
          },
        },
      }),
      prisma.follow.findMany({
        where: { followingId: user.id },
        include: {
          follower: {
            select: { id: true, username: true, displayName: true, avatarUrl: true },
          },
        },
      }),
    ]);

    const map = new Map<string, { id: string; username: string | null; displayName: string; avatarUrl: string | null }>();
    for (const f of following) map.set(f.following.id, f.following);
    for (const f of followers) map.set(f.follower.id, f.follower);

    const people = Array.from(map.values());

    // Batch-upsert all people into Stream so channel creation never fails with "user doesn't exist"
    if (people.length > 0) {
      streamServerClient.upsertUsers(
        people.map((p) => ({
          id: p.id,
          name: p.displayName,
          username: p.username ?? undefined,
          image: p.avatarUrl ?? undefined,
        })),
      ).catch(() => {});
    }

    return Response.json({ people });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
