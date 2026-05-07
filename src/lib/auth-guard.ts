import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";

/**
 * Returns the logged-in user, or a 401/403 Response. Use in route handlers:
 *   const guard = await requireActiveUser();
 *   if (guard instanceof Response) return guard;
 *   const { user } = guard;
 */
export async function requireActiveUser() {
  const { user } = await validateRequest();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { suspendedAt: true, suspendedReason: true, isAdmin: true },
  });
  if (dbUser?.suspendedAt) {
    return Response.json(
      {
        error: "Your account is suspended.",
        reason: dbUser.suspendedReason ?? null,
      },
      { status: 403 },
    );
  }
  return { user, isAdmin: !!dbUser?.isAdmin };
}

export async function requireAdmin() {
  const guard = await requireActiveUser();
  if (guard instanceof Response) return guard;
  if (!guard.isAdmin) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  return guard;
}
