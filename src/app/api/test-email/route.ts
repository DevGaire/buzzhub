import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Check if SMTP is configured
    if (
      !process.env.SMTP_HOST ||
      !process.env.SMTP_PORT ||
      !process.env.SMTP_USER ||
      !process.env.SMTP_PASS ||
      !process.env.MAIL_FROM
    ) {
      return NextResponse.json({ 
        error: "SMTP not configured",
        config: {
          host: !!process.env.SMTP_HOST,
          port: !!process.env.SMTP_PORT,
          user: !!process.env.SMTP_USER,
          pass: !!process.env.SMTP_PASS,
          from: !!process.env.MAIL_FROM
        }
      }, { status: 500 });
    }

    console.log("Testing email with config:", {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      user: process.env.SMTP_USER,
      from: process.env.MAIL_FROM
    });

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

    // Verify connection
    try {
      await transporter.verify();
      console.log("SMTP connection verified successfully");
    } catch (verifyError) {
      console.error("SMTP verification failed:", verifyError);
      return NextResponse.json({ 
        error: "SMTP connection failed", 
        details: verifyError instanceof Error ? verifyError.message : "Unknown error"
      }, { status: 500 });
    }

    // Send test email
    const info = await transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: email,
      subject: "🧪 Buzzhub Email Test",
      text: "This is a test email from Buzzhub. If you received this, email configuration is working correctly!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center; border-radius: 10px; color: white;">
            <h1>🧪 Email Test Successful!</h1>
            <p>This is a test email from Buzzhub</p>
          </div>
          <div style="padding: 20px; background: #f8f9fa; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
            <p>If you received this email, it means:</p>
            <ul>
              <li>✅ SMTP configuration is correct</li>
              <li>✅ Email delivery is working</li>
              <li>✅ Your email provider is accepting messages</li>
            </ul>
            <p><strong>Test completed at:</strong> ${new Date().toISOString()}</p>
          </div>
        </div>
      `
    });

    console.log("Test email sent successfully:", info.messageId);

    return NextResponse.json({ 
      success: true, 
      messageId: info.messageId,
      message: "Test email sent successfully"
    });

  } catch (error) {
    console.error("Email test failed:", error);
    return NextResponse.json({ 
      error: "Failed to send test email", 
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}