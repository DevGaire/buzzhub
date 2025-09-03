import { NextRequest, NextResponse } from "next/server";
import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";

// POST /api/report
// Body: { targetType: 'POST' | 'COMMENT' | 'USER', targetId: string, reason: string }
export async function POST(req: NextRequest) {
  try {
    const { user } = await validateRequest();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({} as any));
    const targetType = String(body.targetType || "").toUpperCase();
    const targetId = String(body.targetId || "").trim();
    const reason = String(body.reason || "").trim();

    if (!targetType || !targetId || !reason) {
      return NextResponse.json({ error: "targetType, targetId and reason are required" }, { status: 400 });
    }

    if (!["POST", "COMMENT", "USER"].includes(targetType)) {
      return NextResponse.json({ error: "Invalid targetType" }, { status: 400 });
    }

    // Optional existence checks (lightweight)
    try {
      if (targetType === "POST") {
        const exists = await prisma.post.findUnique({ where: { id: targetId }, select: { id: true } });
        if (!exists) return NextResponse.json({ error: "Post not found" }, { status: 404 });
      } else if (targetType === "COMMENT") {
        const exists = await prisma.comment.findUnique({ where: { id: targetId }, select: { id: true } });
        if (!exists) return NextResponse.json({ error: "Comment not found" }, { status: 404 });
      } else if (targetType === "USER") {
        const exists = await prisma.user.findUnique({ where: { id: targetId }, select: { id: true } });
        if (!exists) return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
    } catch (e) {
      // If existence checks fail unexpectedly
      console.warn("[report][existence-check]", e);
    }

    const created = await prisma.report.create({
      data: {
        createdById: user.id,
        targetType: targetType as any,
        targetId,
        reason,
      },
    });

    return NextResponse.json({ ok: true, reportId: created.id });
  } catch (e) {
    console.error("[report][POST]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
