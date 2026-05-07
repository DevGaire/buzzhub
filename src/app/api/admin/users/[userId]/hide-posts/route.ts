import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-guard";

export async function POST(
  req: Request,
  { params: { userId } }: { params: { userId: string } },
) {
  const guard = await requireAdmin();
  if (guard instanceof Response) return guard;

  if (userId === guard.user.id) {
    return Response.json(
      { error: "Cannot hide your own posts here" },
      { status: 400 },
    );
  }

  const result = await prisma.post.updateMany({
    where: { userId, deletedAt: null },
    data: { deletedAt: new Date() },
  });

  return Response.json({ hidden: result.count });
}
