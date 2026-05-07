import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { isPushConfigured } from "@/lib/push";

export async function POST(req: Request) {
  if (!isPushConfigured()) {
    return Response.json(
      { error: "Push notifications are not configured on the server" },
      { status: 503 },
    );
  }

  const { user } = await validateRequest();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const endpoint = body?.endpoint;
  const p256dh = body?.keys?.p256dh;
  const auth = body?.keys?.auth;
  if (!endpoint || !p256dh || !auth) {
    return Response.json({ error: "Invalid subscription" }, { status: 400 });
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { userId: user.id, endpoint, p256dh, auth },
    update: { userId: user.id, p256dh, auth },
  });

  return Response.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { user } = await validateRequest();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const endpoint = body?.endpoint;
  if (!endpoint) {
    return Response.json({ error: "Missing endpoint" }, { status: 400 });
  }
  await prisma.pushSubscription
    .deleteMany({ where: { endpoint, userId: user.id } })
    .catch(() => {});
  return Response.json({ ok: true });
}
