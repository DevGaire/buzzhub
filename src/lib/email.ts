import nodemailer from "nodemailer";

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  tls?: {
    rejectUnauthorized: boolean;
  };
}

export function createEmailTransporter() {
  // Check if all required environment variables are present
  if (
    !process.env.SMTP_HOST ||
    !process.env.SMTP_PORT ||
    !process.env.SMTP_USER ||
    !process.env.SMTP_PASS
  ) {
    throw new Error("Missing required SMTP environment variables");
  }

  const config: EmailConfig = {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: Number(process.env.SMTP_PORT) === 465, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  };

  // Add TLS configuration for Gmail and other providers
  if (process.env.SMTP_HOST.includes('gmail.com')) {
    config.tls = {
      rejectUnauthorized: false
    };
  }

  return nodemailer.createTransporter(config);
}

export async function sendEmail({
  to,
  subject,
  text,
  html,
}: {
  to: string;
  subject: string;
  text: string;
  html: string;
}) {
  const transporter = createEmailTransporter();
  
  // Verify connection
  try {
    await transporter.verify();
    console.log("SMTP connection verified successfully");
  } catch (error) {
    console.error("SMTP verification failed:", error);
    throw new Error(`SMTP connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Send email
  const info = await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to,
    subject,
    text,
    html,
  });

  console.log("Email sent successfully:", info.messageId);
  return info;
}