import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { limit } from "@/lib/rate-limit";

export async function POST(
  _req: Request,
  { params }: { params: { postId: string } },
) {
  const { user } = await validateRequest();
  if (!user) return Response.json({ ok: false }, { status: 401 });

  // Per-user impression spam cap: 240/min ≈ 4 per second. A normal scroll
  // session shouldn't come close; this just keeps a malicious client from
  // padding their own analytics.
  const rl = limit(`impr:${user.id}`, 240, 60_000);
  if (!rl.ok) return Response.json({ ok: false }, { status: 429 });

  const post = await prisma.post.findUnique({
    where: { id: params.postId },
    select: { userId: true, status: true, deletedAt: true },
  });
  if (!post || post.deletedAt || post.status !== "PUBLISHED") {
    return Response.json({ ok: false }, { status: 404 });
  }
  // Don't record the author viewing their own post — keeps own-views out of
  // analytics so creators see how their content travels to other people.
  if (post.userId === user.id) {
    return Response.json({ ok: true, skipped: "self" });
  }

  await prisma.postImpression.create({
    data: { postId: params.postId, viewerId: user.id },
  });

  return Response.json({ ok: true });
}
