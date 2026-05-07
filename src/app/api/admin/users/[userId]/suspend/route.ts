import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-guard";

export async function POST(
  req: Request,
  { params: { userId } }: { params: { userId: string } },
) {
  const guard = await requireAdmin();
  if (guard instanceof Response) return guard;

  if (userId === guard.user.id) {
    return Response.json({ error: "Cannot suspend yourself" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const reason = typeof body?.reason === "string" ? body.reason.slice(0, 500) : null;

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { suspendedAt: true, isAdmin: true },
  });
  if (!target) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }
  if (target.isAdmin) {
    return Response.json({ error: "Cannot suspend an admin" }, { status: 400 });
  }

  const isCurrentlySuspended = target.suspendedAt !== null;
  await prisma.user.update({
    where: { id: userId },
    data: {
      suspendedAt: isCurrentlySuspended ? null : new Date(),
      suspendedReason: isCurrentlySuspended ? null : reason,
    },
  });

  return Response.json({ suspended: !isCurrentlySuspended });
}
