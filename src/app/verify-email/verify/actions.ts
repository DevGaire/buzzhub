"use server";

import prisma from "@/lib/prisma";
import { createHash } from "node:crypto";

export async function verifyEmail({ token }: { token: string }): Promise<{ error?: string; success?: string }> {
  try {
    if (!token) return { error: "Invalid or expired token" };
    const tokenHash = createHash("sha256").update(token).digest("hex");

    const record = await prisma.emailVerificationToken.findUnique({ where: { tokenHash } });
    if (!record || record.expiresAt < new Date()) {
      return { error: "Invalid or expired token" };
    }

    await prisma.$transaction([
      prisma.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: new Date() } }),
      prisma.emailVerificationToken.deleteMany({ where: { userId: record.userId } }),
    ]);

    return { success: "Email verified successfully. You can now log in." };
  } catch (e) {
    console.error(e);
    return { error: "Something went wrong. Please try again." };
  }
}
