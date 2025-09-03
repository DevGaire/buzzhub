import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";

// Simple HMAC verification can be added if using Stream's signature. For now, use a shared secret header.
function verifyAuth(req: NextRequest) {
  const header = req.headers.get("x-webhook-secret");
  return header && process.env.STREAM_WEBHOOK_SECRET && header === process.env.STREAM_WEBHOOK_SECRET;
}

interface StreamUser {
  id: string;
  name?: string;
  image?: string;
  online?: boolean;
  email?: string; // custom field in your user storage
}

interface StreamAttachment {
  type?: string;
  asset_url?: string;
  image_url?: string;
  title?: string;
}

interface StreamMessageEventBody {
  type: string; // e.g., "message.new"
  user?: StreamUser;
  message?: {
    id: string;
    text?: string;
    html?: string;
    attachments?: StreamAttachment[];
    mentioned_users?: StreamUser[];
    cid?: string;
  };
  members?: StreamUser[];
  channel?: {
    id?: string;
    type?: string;
    cid?: string;
  };
}

export async function POST(req: NextRequest) {
  if (!verifyAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: StreamMessageEventBody | undefined;
  try {
    body = await req.json();
  } catch (e) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body || body.type !== "message.new" || !body.message) {
    return NextResponse.json({ ok: true });
  }

  const { message, user: sender, channel } = body;
  const mentioned = message.mentioned_users || [];

  // Determine recipients: if there are mentions, notify them. For 1:1 DM, notify the other member.
  const recipients: StreamUser[] = [];

  if (mentioned.length > 0) {
    recipients.push(...mentioned);
  }

  // If no mentions, and channel is messaging 1:1, fall back to other member
  // Expecting an enriched event may include members; if not available skip.
  // @ts-ignore - events shape can vary; adjust as you enrich webhooks later.
  const members: StreamUser[] = (body as any).members || [];
  if (recipients.length === 0 && channel?.type === "messaging" && members.length === 2 && sender?.id) {
    const other = members.find((m) => m.id !== sender.id);
    if (other) recipients.push(other);
  }

  const subjectBase = sender?.name || sender?.id || "New message";
  const preview = (message.text || "").slice(0, 160);
  const channelId = channel?.id || message.cid || "channel";

  const promises: Promise<unknown>[] = [];

  for (const r of recipients) {
    // Basic offline check: if online === false OR no online flag present, we still notify for mentions
    // In production, query presence or track last_seen to decide; you can refine this later.
    const shouldNotify = true;

    // Need email to send; expect you map Stream user to app user with email in custom field
    const to = r.email || (r as any).extraData?.email;
    if (!shouldNotify || !to) continue;

    const subject = `${subjectBase} mentioned you`;
    const html = `
      <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;">
        <h2 style="margin:0 0 12px;">${subjectBase}</h2>
        <p style="margin:0 0 8px; color:#444">${preview || "sent you a message"}</p>
        <p style="margin:16px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || ""}/messages?cid=${encodeURIComponent(channelId)}" style="display:inline-block;padding:10px 14px;background:#111;color:#fff;border-radius:8px;text-decoration:none">Open conversation</a>
        </p>
        <p style="margin-top:24px;color:#777;font-size:12px;">You received this because of your notification preferences.</p>
      </div>
    `;

    promises.push(
      sendEmail({
        to,
        subject,
        text: `${subjectBase}: ${preview}`,
        html,
      }),
    );
  }

  try {
    await Promise.all(promises);
    return NextResponse.json({ ok: true, notified: recipients.length });
  } catch (e) {
    console.error("Failed to send mention emails:", e);
    return NextResponse.json({ error: "Failed to send emails" }, { status: 500 });
  }
}
