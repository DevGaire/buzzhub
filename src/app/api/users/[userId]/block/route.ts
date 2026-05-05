import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { BlockInfo } from "@/lib/types";

export async function GET(
  req: Request,
  { params: { userId } }: { params: { userId: string } },
) {
  try {
    const { user: loggedInUser } = await validateRequest();
    if (!loggedInUser) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const block = await prisma.block.findUnique({
      where: { blockerId_blockedId: { blockerId: loggedInUser.id, blockedId: userId } },
    });

    const data: BlockInfo = { isBlockedByUser: !!block };
    return Response.json(data);
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params: { userId } }: { params: { userId: string } },
) {
  try {
    const { user: loggedInUser } = await validateRequest();
    if (!loggedInUser) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (loggedInUser.id === userId) return Response.json({ error: "Cannot block yourself" }, { status: 400 });

    const existing = await prisma.block.findUnique({
      where: { blockerId_blockedId: { blockerId: loggedInUser.id, blockedId: userId } },
    });

    if (existing) {
      await prisma.block.delete({
        where: { blockerId_blockedId: { blockerId: loggedInUser.id, blockedId: userId } },
      });
      const data: BlockInfo = { isBlockedByUser: false };
      return Response.json(data);
    } else {
      await prisma.block.create({
        data: { blockerId: loggedInUser.id, blockedId: userId },
      });
      // Also unfollow if following
      await prisma.follow.deleteMany({
        where: {
          OR: [
            { followerId: loggedInUser.id, followingId: userId },
            { followerId: userId, followingId: loggedInUser.id },
          ],
        },
      });
      const data: BlockInfo = { isBlockedByUser: true };
      return Response.json(data);
    }
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
