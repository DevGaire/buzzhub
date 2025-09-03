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
        secure: false, // true for 465, false for other ports like 587
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      const mailOptions = {
        from: process.env.MAIL_FROM,
        to: email,
        subject: `🔐 Password Reset Request for @${user.username}`,
        text: `Hi ${user.displayName || user.username}!\n\nYou requested a password reset for your Buzzhub account (@${user.username}).\n\nClick the link below to reset your password:\n${resetUrl}\n\nThis link will expire in 1 hour for security reasons.\n\nAccount Details:\n- Username: @${user.username}\n- Email: ${email}\n- Reset Link: ${resetUrl}\n\nIf you didn't request this password reset, please ignore this email and your password will remain unchanged.\n\nBest regards,\nThe Buzzhub Team`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reset Your Buzzhub Password</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">🔐 Password Reset</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Buzzhub Account Security</p>
            </div>
            
            <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
              <h2 style="color: #495057; margin-top: 0;">Hi ${user.displayName || user.username}! 👋</h2>
              
              <p style="font-size: 16px; margin-bottom: 20px;">
                You requested a password reset for your Buzzhub account <strong>@${user.username}</strong>. No worries, it happens to the best of us!
              </p>
              
              <div style="background: #e3f2fd; border: 1px solid #bbdefb; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h3 style="color: #1565c0; margin: 0 0 10px 0; font-size: 16px;">📋 Account Information</h3>
                <table style="width: 100%; font-size: 14px;">
                  <tr>
                    <td style="padding: 5px 0; color: #666;"><strong>Username:</strong></td>
                    <td style="padding: 5px 0; color: #333;">@${user.username}</td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 0; color: #666;"><strong>Email:</strong></td>
                    <td style="padding: 5px 0; color: #333;">${email}</td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 0; color: #666;"><strong>Request Time:</strong></td>
                    <td style="padding: 5px 0; color: #333;">${new Date().toLocaleString()}</td>
                  </tr>
                </table>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" 
                   style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                          color: white; 
                          padding: 15px 30px; 
                          text-decoration: none; 
                          border-radius: 25px; 
                          font-weight: bold; 
                          font-size: 16px;
                          display: inline-block;
                          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);">
                  🔑 Reset My Password
                </a>
              </div>
              
              <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; font-size: 14px; color: #856404;">
                  ⏰ <strong>Important:</strong> This reset link will expire in 1 hour for security reasons.
                </p>
              </div>
              
              <div style="background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 5px; padding: 15px; margin: 20px 0;">
                <p style="margin: 0 0 10px 0; font-size: 14px; color: #495057; font-weight: bold;">🔗 Reset Link:</p>
                <p style="margin: 0; font-size: 12px; word-break: break-all; color: #6c757d; font-family: monospace; background: white; padding: 10px; border-radius: 4px;">
                  ${resetUrl}
                </p>
              </div>
              
              <hr style="border: none; border-top: 1px solid #e9ecef; margin: 30px 0;">
              
              <div style="background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 5px; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; font-size: 14px; color: #721c24;">
                  <strong>🚨 Security Notice:</strong> If you didn't request this password reset, please ignore this email and your password will remain unchanged. Consider enabling two-factor authentication for better security.
                </p>
              </div>
              
              <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef;">
                <p style="font-size: 14px; color: #6c757d; margin: 0;">
                  Best regards,<br>
                  <strong style="color: #495057;">The Buzzhub Team</strong> 🚀
                </p>
                <p style="font-size: 12px; color: #adb5bd; margin: 10px 0 0 0;">
                  This email was sent to ${email} for account @${user.username}
                </p>
              </div>
            </div>
          </body>
          </html>
        `,
      };

      try {
        console.log("Attempting to send password reset email to:", email, "for user:", user.username);
        console.log("SMTP Config:", {
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT,
          user: process.env.SMTP_USER,
          from: process.env.MAIL_FROM
        });
        
        const info = await transporter.sendMail(mailOptions);
        console.log("Password reset email sent successfully:", info.messageId);
        
      } catch (mailErr) {
        console.error("Failed to send reset email:", mailErr);
        // Fall back to logging the link so devs can still access it
        console.log("Password reset link for", user.username, ":", resetUrl);
        return { error: "Failed to send email. Please try again later." };
      }
    } else {
      // No SMTP configured, log link for development
      console.log("Password reset link for", user.username, ":", resetUrl);
    }

    return { success: "If that email exists, a reset link has been sent." };
  } catch (e) {
    console.error(e);
    return { error: "Something went wrong. Please try again." };
  }
}