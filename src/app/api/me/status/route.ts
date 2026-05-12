import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Lightweight account status read used by the Settings page to decide
 * whether to show "Delete my account" or "Cancel deletion".
 */
export async function GET() {
  const { user } = await validateRequest();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const row = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      deletionRequestedAt: true,
      suspendedAt: true,
      isVerified: true,
    },
  });

  return Response.json({
    deletionRequestedAt: row?.deletionRequestedAt ?? null,
    suspendedAt: row?.suspendedAt ?? null,
    isVerified: row?.isVerified ?? false,
  });
}
