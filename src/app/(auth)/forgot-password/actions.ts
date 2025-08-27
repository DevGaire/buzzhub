"use server";

import prisma from "@/lib/prisma";
import { forgotPasswordSchema, ForgotPasswordValues } from "@/lib/validation";
import { createHash, randomBytes } from "node:crypto";
import nodemailer from "nodemailer";

export async function requestPasswordReset(
  credentials: ForgotPasswordValues,
): Promise<{ error?: string; success?: string }> {
  try {
    const { email } = forgotPasswordSchema.parse(credentials);

    const user = await prisma.user.findFirst({ where: { email } });
    if (!user || !user.passwordHash) {
      // Do not reveal whether email exists
      return { success: "If that email exists, a reset link has been sent." };
    }

    // Generate token and store hash
    const token = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

    await prisma.$transaction([
      prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }),
      prisma.passwordResetToken.create({
        data: { tokenHash, userId: user.id, expiresAt },
      }),
    ]);

    const resetUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/reset-password?token=${token}`;

    // Send email via SMTP if configured
    if (
      process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS &&
      process.env.MAIL_FROM
    ) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        secure: Number(process.env.SMTP_PORT) === 465, // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      const mailOptions = {
        from: process.env.MAIL_FROM,
        to: email, // use validated email string to satisfy nodemailer types
        subject: "Reset your password",
        text: `You requested a password reset. Click the link to reset your password: ${resetUrl}\n\nIf you did not request this, please ignore this email.`,
        html: `<p>You requested a password reset.</p><p>Click the link to reset your password: <a href="${resetUrl}">${resetUrl}</a></p><p>If you did not request this, please ignore this email.</p>`,
      };

      try {
        await transporter.sendMail(mailOptions);
      } catch (mailErr) {
        console.error("Failed to send reset email:", mailErr);
        // Fall back to logging the link so devs can still access it
        console.log("Password reset link:", resetUrl);
      }
    } else {
      // No SMTP configured, log link for development
      console.log("Password reset link:", resetUrl);
    }

    return { success: "If that email exists, a reset link has been sent." };
  } catch (e) {
    console.error(e);
    return { error: "Something went wrong. Please try again." };
  }
}
