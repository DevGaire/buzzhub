"use server";

import prisma from "@/lib/prisma";
import streamServerClient from "@/lib/stream";
import { signUpSchema, SignUpValues } from "@/lib/validation";
import { hash } from "@node-rs/argon2";
import { generateIdFromEntropySize } from "lucia";
import { isRedirectError } from "next/dist/client/components/redirect";
import { createHash, randomBytes } from "node:crypto";
import nodemailer from "nodemailer";

export async function signUp(
  credentials: SignUpValues,
): Promise<{ error?: string; success?: string }> {
  try {
    const { username, email, password } = signUpSchema.parse(credentials);

    const passwordHash = await hash(password, {
      memoryCost: 19456,
      timeCost: 2,
      outputLen: 32,
      parallelism: 1,
    });

    const userId = generateIdFromEntropySize(10);

    const existingUsername = await prisma.user.findFirst({
      where: {
        username: {
          equals: username,
          mode: "insensitive",
        },
      },
    });

    if (existingUsername) {
      return {
        error: "Username already taken",
      };
    }

    const existingEmail = await prisma.user.findFirst({
      where: {
        email: {
          equals: email,
          mode: "insensitive",
        },
      },
    });

    if (existingEmail) {
      return {
        error: "Email already taken",
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.create({
        data: {
          id: userId,
          username,
          displayName: username,
          email,
          passwordHash,
        },
      });
      await streamServerClient.upsertUser({
        id: userId,
        username,
        name: username,
      });
    });

    // Issue email verification token
    const token = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24 hours
    await prisma.emailVerificationToken.create({
      data: { tokenHash, userId, expiresAt },
    });

    const verifyUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/verify-email?token=${token}`;

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

      try {
        console.log("Attempting to send verification email to:", email);
        
        const info = await transporter.sendMail({
          from: process.env.MAIL_FROM,
          to: email,
          subject: "🎉 Welcome to Buzzhub - Verify Your Email",
          text: `Welcome to Buzzhub!\n\nThank you for joining our community! To get started, please verify your email address by clicking the link below:\n\n${verifyUrl}\n\nThis link will expire in 24 hours.\n\nIf you didn't create this account, please ignore this email.\n\nBest regards,\nThe Buzzhub Team`,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Welcome to Buzzhub</title>
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Welcome to Buzzhub!</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Let's verify your email address</p>
              </div>
              
              <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
                <h2 style="color: #495057; margin-top: 0;">Hi ${username}! 👋</h2>
                
                <p style="font-size: 16px; margin-bottom: 20px;">
                  Thank you for joining our community! We're excited to have you on board.
                </p>
                
                <p style="font-size: 16px; margin-bottom: 20px;">
                  To get started and secure your account, please verify your email address by clicking the button below:
                </p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${verifyUrl}" 
                     style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                            color: white; 
                            padding: 15px 30px; 
                            text-decoration: none; 
                            border-radius: 25px; 
                            font-weight: bold; 
                            font-size: 16px;
                            display: inline-block;
                            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);">
                    Verify My Email
                  </a>
                </div>
                
                <div style="background: #d1ecf1; border: 1px solid #bee5eb; border-radius: 5px; padding: 15px; margin: 20px 0;">
                  <p style="margin: 0; font-size: 14px; color: #0c5460;">
                    ⏰ <strong>Note:</strong> This verification link will expire in 24 hours.
                  </p>
                </div>
                
                <p style="font-size: 14px; color: #6c757d; margin-top: 20px;">
                  If the button doesn't work, copy and paste this link into your browser:<br>
                  <a href="${verifyUrl}" style="color: #667eea; word-break: break-all;">${verifyUrl}</a>
                </p>
                
                <hr style="border: none; border-top: 1px solid #e9ecef; margin: 30px 0;">
                
                <p style="font-size: 14px; color: #6c757d;">
                  <strong>Didn't create this account?</strong> No worries! You can safely ignore this email.
                </p>
                
                <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef;">
                  <p style="font-size: 14px; color: #6c757d; margin: 0;">
                    Welcome to the community!<br>
                    <strong style="color: #495057;">The Buzzhub Team</strong> 🚀
                  </p>
                </div>
              </div>
            </body>
            </html>
          `,
        });
        
        console.log("Verification email sent successfully:", info.messageId);
        
      } catch (mailErr) {
        console.error("Failed to send verification email:", mailErr);
        // Fall back to logging the link so devs can still access it
        console.log("Email verification link:", verifyUrl);
      }
    } else {
      // No SMTP configured, log link for development
      console.log("Email verification link:", verifyUrl);
    }

    return { success: "Verification email sent. Please check your inbox." };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error(error);
    return {
      error: "Something went wrong. Please try again.",
    };
  }
}