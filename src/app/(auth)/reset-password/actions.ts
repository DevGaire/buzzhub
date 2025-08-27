"use server";

import prisma from "@/lib/prisma";
import { resetPasswordSchema, ResetPasswordValues } from "@/lib/validation";
import { createHash } from "node:crypto";
import { hash } from "@node-rs/argon2";
import { lucia } from "@/auth";

export async function resetPassword(
  input: ResetPasswordValues & { token: string },
): Promise<{ error?: string; success?: string }> {
  try {
    const { password } = resetPasswordSchema.parse({ password: input.password });
    const token = input.token;

    if (!token) return { error: "Invalid or expired token" };

    const tokenHash = createHash("sha256").update(token).digest("hex");

    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });
    if (!record || record.expiresAt < new Date()) {
      return { error: "Invalid or expired token" };
    }

    const passwordHash = await hash(password, {
      memoryCost: 19456,
      timeCost: 2,
      outputLen: 32,
      parallelism: 1,
    });

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.deleteMany({ where: { userId: record.userId } }),
    ]);

    // Invalidate all sessions for this user to force re-login
    await lucia.invalidateUserSessions(record.userId);

    return { success: "Password has been reset. You can now log in." };
  } catch (e) {
    console.error(e);
    return { error: "Something went wrong. Please try again." };
  }
}
