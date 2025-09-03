const nodemailer = require('nodemailer');

// Test email configuration
async function testEmail() {
  console.log('🧪 Testing Brevo SMTP Configuration...\n');

  const config = {
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false,
    auth: {
      user: '95b69b002@smtp-brevo.com',
      pass: 'aMv02Xnhs3pVTIyc',
    },
    tls: {
      rejectUnauthorized: false
    }
  };

  console.log('📧 SMTP Config:', {
    host: config.host,
    port: config.port,
    user: config.auth.user,
    passLength: config.auth.pass.length
  });

  try {
    console.log('\n🔗 Creating transporter...');
    const transporter = nodemailer.createTransport(config);

    console.log('✅ Verifying SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully!');

    console.log('\n📤 Sending test email...');
    const info = await transporter.sendMail({
      from: 'Buzzhub <hendrygaire@gmail.com>',
      to: 'hendrygaire@gmail.com',
      subject: '🧪 Buzzhub Email Test - Direct Script',
      text: 'This is a direct test from the debug script. If you receive this, SMTP is working!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center; border-radius: 10px; color: white;">
            <h1>🧪 Direct Email Test Success!</h1>
            <p>This email was sent directly from the debug script</p>
          </div>
          <div style="padding: 20px; background: #f8f9fa; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
            <p><strong>✅ SMTP Configuration is working!</strong></p>
            <p>If you received this email, the Brevo SMTP setup is correct.</p>
            <p><strong>Test Time:</strong> ${new Date().toISOString()}</p>
          </div>
        </div>
      `
    });

    console.log('✅ Email sent successfully!');
    console.log('📧 Message ID:', info.messageId);
    console.log('📬 Check your inbox at: hendrygaire@gmail.com');

  } catch (error) {
    console.error('❌ Email test failed:', error.message);
    
    if (error.code === 'EAUTH') {
      console.log('\n🔧 Authentication failed. Possible solutions:');
      console.log('1. Check if the Brevo Master Password is correct');
      console.log('2. Verify the SMTP login: 95b69b002@smtp-brevo.com');
      console.log('3. Make sure your Brevo account is active');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('\n🔧 Connection refused. Check:');
      console.log('1. Internet connection');
      console.log('2. SMTP host and port');
    }
  }
}

testEmail();