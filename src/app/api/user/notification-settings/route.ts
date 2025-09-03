import { NextRequest, NextResponse } from "next/server";
import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";

// Shape used by the UI
interface NotificationPreferences {
  emailLikes: boolean;
  emailComments: boolean;
  emailFollows: boolean;
  emailMentions: boolean;
  emailStories: boolean; // not persisted in current schema
  pushLikes: boolean;    // not persisted in current schema
  pushComments: boolean; // not persisted in current schema
  pushFollows: boolean;  // not persisted in current schema
  pushMentions: boolean; // not persisted in current schema
  pushStories: boolean;  // not persisted in current schema
  pushMessages: boolean; // not persisted in current schema
}

function toResponseShape(db: { emailLikes: boolean; emailComments: boolean; emailFollows: boolean; emailMentions: boolean; }): NotificationPreferences {
  return {
    emailLikes: db.emailLikes,
    emailComments: db.emailComments,
    emailFollows: db.emailFollows,
    emailMentions: db.emailMentions,
    // Defaults for fields not in DB (kept client-side only for now)
    emailStories: false,
    pushLikes: true,
    pushComments: true,
    pushFollows: true,
    pushMentions: true,
    pushStories: true,
    pushMessages: true,
  };
}

export async function GET() {
  try {
    const { user } = await validateRequest();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let settings = await prisma.notificationSettings.findUnique({ where: { userId: user.id } });
    if (!settings) {
      // Create with defaults
      settings = await prisma.notificationSettings.create({
        data: {
          userId: user.id,
          emailLikes: true,
          emailComments: true,
          emailFollows: true,
          emailMentions: true,
        },
      });
    }

    return NextResponse.json(toResponseShape(settings));
  } catch (e) {
    console.error("notification-settings GET failed", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { user } = await validateRequest();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));

    // Only persist fields that exist in the current schema
    const data: Partial<{ emailLikes: boolean; emailComments: boolean; emailFollows: boolean; emailMentions: boolean; }> = {};
    if (typeof body.emailLikes === 'boolean') data.emailLikes = body.emailLikes;
    if (typeof body.emailComments === 'boolean') data.emailComments = body.emailComments;
    if (typeof body.emailFollows === 'boolean') data.emailFollows = body.emailFollows;
    if (typeof body.emailMentions === 'boolean') data.emailMentions = body.emailMentions;

    // Upsert
    const updated = await prisma.notificationSettings.upsert({
      where: { userId: user.id },
      update: data,
      create: {
        userId: user.id,
        emailLikes: data.emailLikes ?? true,
        emailComments: data.emailComments ?? true,
        emailFollows: data.emailFollows ?? true,
        emailMentions: data.emailMentions ?? true,
      },
    });

    return NextResponse.json(toResponseShape(updated));
  } catch (e) {
    console.error("notification-settings PUT failed", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
