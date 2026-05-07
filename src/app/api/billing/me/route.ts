import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const { user } = await validateRequest();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sub = await prisma.subscription.findUnique({
    where: { userId: user.id },
    select: {
      status: true,
      plan: true,
      currentPeriodEnd: true,
      cancelAtPeriodEnd: true,
    },
  });

  const me = await prisma.user.findUnique({
    where: { id: user.id },
    select: { isVerified: true, verificationSource: true },
  });

  return Response.json({
    isVerified: !!me?.isVerified,
    verificationSource: me?.verificationSource ?? null,
    subscription: sub,
  });
}
