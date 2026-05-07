import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";

export async function POST(
  req: Request,
  { params: { userId } }: { params: { userId: string } },
) {
  try {
    const { user: loggedInUser } = await validateRequest();
    if (!loggedInUser) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const me = await prisma.user.findUnique({
      where: { id: loggedInUser.id },
      select: { isAdmin: true },
    });
    if (!me?.isAdmin) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isVerified: true },
    });
    if (!target) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { isVerified: !target.isVerified },
      select: { isVerified: true },
    });

    return Response.json({ isVerified: updated.isVerified });
  } catch (err) {
    console.error("verification toggle failed", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
