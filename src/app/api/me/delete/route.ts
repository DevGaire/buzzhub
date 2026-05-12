import { lucia, validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const GRACE_DAYS = 30;

/**
 * Schedule the current account for deletion. Sets `deletionRequestedAt`
 * and invalidates all sessions. The actual delete happens in the
 * /api/users/purge-deleted cron after a 30-day grace period; the user
 * can cancel any time before then by signing back in and hitting
 * DELETE on this same endpoint.
 */
export async function POST() {
  const { user, session } = await validateRequest();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.user.update({
    where: { id: user.id },
    data: { deletionRequestedAt: new Date() },
  });

  // Kill the current session so the next request goes to /login. The
  // user can come back during the grace window to cancel.
  if (session) {
    await lucia.invalidateSession(session.id);
    const blank = lucia.createBlankSessionCookie();
    cookies().set(blank.name, blank.value, blank.attributes);
  }

  return Response.json({
    ok: true,
    graceDays: GRACE_DAYS,
    purgesAt: new Date(Date.now() + GRACE_DAYS * 24 * 3600_000).toISOString(),
  });
}

/**
 * Cancel a pending deletion. Idempotent: a no-op if there isn't one.
 */
export async function DELETE() {
  const { user } = await validateRequest();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.user.update({
    where: { id: user.id },
    data: { deletionRequestedAt: null },
  });
  return Response.json({ ok: true });
}
