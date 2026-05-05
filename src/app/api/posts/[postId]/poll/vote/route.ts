import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";

export async function POST(
  req: Request,
  { params: { postId } }: { params: { postId: string } },
) {
  try {
    const { user } = await validateRequest();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { optionId } = await req.json();
    if (!optionId) return Response.json({ error: "optionId required" }, { status: 400 });

    const poll = await prisma.poll.findUnique({
      where: { postId },
      include: { options: { select: { id: true } } },
    });

    if (!poll) return Response.json({ error: "Poll not found" }, { status: 404 });
    if (poll.expiresAt && poll.expiresAt < new Date())
      return Response.json({ error: "Poll has ended" }, { status: 400 });
    if (!poll.options.some((o) => o.id === optionId))
      return Response.json({ error: "Invalid option" }, { status: 400 });

    const existing = await prisma.pollVote.findUnique({
      where: { userId_pollId: { userId: user.id, pollId: poll.id } },
    });

    if (existing) {
      if (existing.optionId === optionId) {
        // Unvote
        await prisma.pollVote.delete({
          where: { userId_pollId: { userId: user.id, pollId: poll.id } },
        });
      } else {
        // Change vote
        await prisma.pollVote.update({
          where: { userId_pollId: { userId: user.id, pollId: poll.id } },
          data: { optionId },
        });
      }
    } else {
      await prisma.pollVote.create({
        data: { userId: user.id, optionId, pollId: poll.id },
      });
    }

    // Return updated poll state
    const updated = await prisma.poll.findUnique({
      where: { id: poll.id },
      include: {
        options: {
          include: { _count: { select: { votes: true } } },
          orderBy: { order: "asc" },
        },
        votes: {
          where: { userId: user.id },
          select: { optionId: true },
        },
        _count: { select: { votes: true } },
      },
    });

    return Response.json(updated);
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
