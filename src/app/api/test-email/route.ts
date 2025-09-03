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
      from: process.env.MAIL_FROM,
      passLength: process.env.SMTP_PASS?.length || 0
    });

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: Number(process.env.SMTP_PORT) === 465, // true for 465, false for other ports like 587
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false
      },
      debug: true, // Enable debug logs
      logger: true // Enable logger
    });

    // Verify connection
    try {
      console.log("Attempting SMTP connection verification...");
      await transporter.verify();
      console.log("✅ SMTP connection verified successfully");
    } catch (verifyError) {
      console.error("❌ SMTP verification failed:", verifyError);
      
      // Provide specific error messages for common issues
      let errorMessage = "SMTP connection failed";
      let suggestions = [];
      
      if (verifyError instanceof Error) {
        if (verifyError.message.includes("Invalid login") || verifyError.message.includes("Username and Password not accepted")) {
          errorMessage = "Invalid Gmail credentials";
          suggestions = [
            "1. Enable 2-Factor Authentication on your Gmail account",
            "2. Generate a new App Password at https://myaccount.google.com/apppasswords",
            "3. Use the 16-character app password (remove spaces)",
            "4. Make sure you're using your Gmail address as SMTP_USER",
            "5. Current password length: " + (process.env.SMTP_PASS?.length || 0) + " characters"
          ];
        } else if (verifyError.message.includes("ECONNREFUSED")) {
          errorMessage = "Cannot connect to SMTP server";
          suggestions = [
            "1. Check your internet connection",
            "2. Verify SMTP_HOST and SMTP_PORT are correct",
            "3. Try using port 465 with secure: true"
          ];
        }
      }
      
      return NextResponse.json({ 
        error: errorMessage,
        details: verifyError instanceof Error ? verifyError.message : "Unknown error",
        suggestions,
        config: {
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT,
          user: process.env.SMTP_USER,
          passLength: process.env.SMTP_PASS?.length || 0
        }
      }, { status: 500 });
    }

    // Send test email
    const info = await transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: email,
      subject: "🧪 Buzzhub Email Test - Success!",
      text: "This is a test email from Buzzhub. If you received this, email configuration is working correctly!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center; border-radius: 10px; color: white;">
            <h1>🧪 Email Test Successful!</h1>
            <p>This is a test email from Buzzhub</p>
          </div>
          <div style="padding: 20px; background: #f8f9fa; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
            <p><strong>🎉 Congratulations!</strong> If you received this email, it means:</p>
            <ul>
              <li>✅ SMTP configuration is correct</li>
              <li>✅ Email delivery is working</li>
              <li>✅ Your email provider is accepting messages</li>
              <li>✅ Password reset emails should now work</li>
            </ul>
            <div style="background: #d4edda; border: 1px solid #c3e6cb; border-radius: 5px; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; font-size: 14px; color: #155724;">
                <strong>✅ Email Configuration Status:</strong> Working perfectly!
              </p>
            </div>
            <p><strong>Test completed at:</strong> ${new Date().toISOString()}</p>
            <p><strong>SMTP Server:</strong> ${process.env.SMTP_HOST}:${process.env.SMTP_PORT}</p>
          </div>
        </div>
      `
    });

    console.log("✅ Test email sent successfully:", info.messageId);

    return NextResponse.json({ 
      success: true, 
      messageId: info.messageId,
      message: "Test email sent successfully! Check your inbox.",
      config: {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        user: process.env.SMTP_USER
      }
    });

  } catch (error) {
    console.error("❌ Email test failed:", error);
    return NextResponse.json({ 
      error: "Failed to send test email", 
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}