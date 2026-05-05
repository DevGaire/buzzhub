import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";

export async function POST(
  req: Request,
  { params: { postId } }: { params: { postId: string } },
) {
  try {
    const { user } = await validateRequest();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post || post.userId !== user.id)
      return Response.json({ error: "Not found" }, { status: 404 });

    const isPinned = user.pinnedPostId === postId;

    await prisma.user.update({
      where: { id: user.id },
      data: { pinnedPostId: isPinned ? null : postId },
    });

    return Response.json({ pinned: !isPinned });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
