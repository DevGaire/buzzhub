import { NextRequest, NextResponse } from "next/server";
import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { NotificationType } from "@prisma/client";

interface NotifyBody {
  channelId?: string;
  text?: string;
  mentionedUsernames?: string[];
  dmRecipientId?: string;
}

export async function POST(req: NextRequest) {
  const { user: sender } = await validateRequest();
  if (!sender) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: NotifyBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const mentionedUsernames = (body.mentionedUsernames || []).filter(Boolean);
  const dmRecipientId = body.dmRecipientId || undefined;
  const text = (body.text || "").toString();

  // Resolve recipients via Prisma
  const recipients: { id: string; email: string | null; username: string | null; displayName: string }[] = [];

  if (mentionedUsernames.length > 0) {
    const users = await prisma.user.findMany({
      where: { username: { in: mentionedUsernames } },
      select: { id: true, email: true, username: true, displayName: true },
    });
    for (const u of users) recipients.push(u);
  } else if (dmRecipientId) {
    const u = await prisma.user.findUnique({
      where: { id: dmRecipientId },
      select: { id: true, email: true, username: true, displayName: true },
    });
    if (u) recipients.push(u);
  }

  // Filter out sender and users without email
  const finalRecipients = recipients
    .filter((r) => r.id !== sender.id)
    .filter((r, idx, arr) => arr.findIndex((x) => x.id === r.id) === idx); // dedupe

  // Load notification preferences and filter by type
  const prefs = await prisma.notificationSettings.findMany({
    where: { userId: { in: finalRecipients.map(r => r.id) } },
    select: { userId: true, emailMentions: true },
  });
  const prefByUser = new Map(prefs.map(p => [p.userId, p]));

  if (finalRecipients.length === 0) {
    return NextResponse.json({ ok: true, notified: 0 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const channelLink = body.channelId ? `${appUrl}/messages?cid=${encodeURIComponent(body.channelId)}` : `${appUrl}/messages`;
  const preview = text.slice(0, 160) || "You have a new message";

  const subjectBase = `${sender.displayName || sender.username || "Someone"} sent you a message`;
  const isMentionFlow = mentionedUsernames.length > 0;

  const tasks = finalRecipients
    .filter((r) => !!r.email)
    .filter((r) => {
      const pref = prefByUser.get(r.id);
      if (isMentionFlow) return pref ? pref.emailMentions : true; // default allow
      // For DM notifications, we currently default to allow (no dedicated field in DB yet)
      return true;
    })
    .map((r) => {
      const subject = isMentionFlow ? `${sender.displayName || sender.username} mentioned you` : subjectBase;
      const html = `
        <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;">
          <h2 style="margin:0 0 12px;">${subject}</h2>
          <p style="margin:0 0 8px; color:#444">${preview}</p>
          <p style="margin:16px 0;">
            <a href="${channelLink}" style="display:inline-block;padding:10px 14px;background:#111;color:#fff;border-radius:8px;text-decoration:none">Open conversation</a>
          </p>
          <p style="margin-top:24px;color:#777;font-size:12px;">You received this because of your notification preferences.</p>
        </div>
      `;
      return sendEmail({ to: r.email!, subject, text: preview, html });
    });

  try {
    await Promise.all(tasks);
    return NextResponse.json({ ok: true, notified: tasks.length });
  } catch (e) {
    console.error("notify: failed to send email(s)", e);
    return NextResponse.json({ error: "Failed to send email(s)" }, { status: 500 });
  }
}
