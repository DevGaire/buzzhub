import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createHash, randomBytes } from "node:crypto";
import nodemailer from "nodemailer";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    console.log("🔍 Debug: Looking for user with email:", email);

    // Check if user exists
    const user = await prisma.user.findFirst({ where: { email } });
    
    if (!user) {
      console.log("❌ Debug: No user found with email:", email);
      return NextResponse.json({ 
        error: "No user found with this email",
        debug: { email, userFound: false }
      }, { status: 404 });
    }

    if (!user.passwordHash) {
      console.log("❌ Debug: User found but no password hash (OAuth user):", user.username);
      return NextResponse.json({ 
        error: "This account uses OAuth login (Google). No password to reset.",
        debug: { email, userFound: true, hasPassword: false, username: user.username }
      }, { status: 400 });
    }

    console.log("✅ Debug: User found:", {
      id: user.id,
      username: user.username,
      email: user.email,
      hasPassword: !!user.passwordHash
    });

    // Generate token
    const token = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

    console.log("🔑 Debug: Generated token:", { tokenLength: token.length, expiresAt });

    // Store token in database
    await prisma.$transaction([
      prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }),
      prisma.passwordResetToken.create({
        data: { tokenHash, userId: user.id, expiresAt },
      }),
    ]);

    console.log("💾 Debug: Token stored in database");

    const resetUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/reset-password?token=${token}`;
    console.log("🔗 Debug: Reset URL:", resetUrl);

    // Test SMTP configuration
    console.log("📧 Debug: SMTP Config:", {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      user: process.env.SMTP_USER,
      from: process.env.MAIL_FROM,
      hasPass: !!process.env.SMTP_PASS
    });

    if (!process.env.SMTP_HOST || !process.env.SMTP_PORT || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.log("❌ Debug: Missing SMTP configuration");
      return NextResponse.json({ 
        error: "SMTP not configured",
        debug: { resetUrl }
      }, { status: 500 });
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    console.log("🔗 Debug: Verifying SMTP connection...");
    await transporter.verify();
    console.log("✅ Debug: SMTP connection verified");

    // Send email
    console.log("📤 Debug: Sending password reset email...");
    const info = await transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: email,
      subject: `🔐 Password Reset Request for @${user.username}`,
      text: `Hi ${user.displayName || user.username}!\n\nYou requested a password reset for your Buzzhub account (@${user.username}).\n\nClick the link below to reset your password:\n${resetUrl}\n\nThis link will expire in 1 hour.\n\nBest regards,\nThe Buzzhub Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🔐 Password Reset</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Buzzhub Account Security</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
            <h2 style="color: #495057; margin-top: 0;">Hi ${user.displayName || user.username}! 👋</h2>
            
            <p style="font-size: 16px; margin-bottom: 20px;">
              You requested a password reset for your Buzzhub account <strong>@${user.username}</strong>.
            </p>
            
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
            
            <p style="font-size: 14px; color: #6c757d; word-break: break-all;">
              Reset Link: ${resetUrl}
            </p>
          </div>
        </div>
      `
    });

    console.log("✅ Debug: Email sent successfully!");
    console.log("📧 Debug: Message ID:", info.messageId);

    return NextResponse.json({ 
      success: true,
      debug: {
        user: { username: user.username, email: user.email },
        messageId: info.messageId,
        resetUrl
      }
    });

  } catch (error) {
    console.error("❌ Debug: Error in forgot password:", error);
    return NextResponse.json({ 
      error: "Debug failed", 
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}