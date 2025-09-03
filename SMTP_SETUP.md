# 📧 SMTP Email Setup Guide

## Current Issue
Brevo SMTP authentication is failing because we're using the API key instead of the Master Password.

## 🔧 Quick Fixes

### Option 1: Fix Brevo SMTP (Recommended)

1. **Go to Brevo Dashboard**: https://app.brevo.com/settings/keys/smtp
2. **Find your Master Password** (not the API key)
3. **Update .env file**:
   ```
   SMTP_PASS=YOUR_MASTER_PASSWORD_HERE
   ```

### Option 2: Use Mailtrap (Easiest for Testing)

1. **Sign up**: https://mailtrap.io/
2. **Go to Email Sending** → **Domains**
3. **Add your domain** or use their subdomain
4. **Get SMTP credentials**
5. **Update .env**:
   ```
   SMTP_HOST=live.smtp.mailtrap.io
   SMTP_PORT=587
   SMTP_USER=api
   SMTP_PASS=your-mailtrap-password
   MAIL_FROM="Buzzhub <your-email@yourdomain.com>"
   ```

### Option 3: Use Resend (Developer-Friendly)

1. **Sign up**: https://resend.com/
2. **Get API key**
3. **Install**: `npm install resend`
4. **Use Resend instead of nodemailer**

## 🧪 Test Your Configuration

1. **Start dev server**: `npm run dev`
2. **Visit**: http://localhost:3000/test-email
3. **Enter your email** and test

## 📊 Email Service Comparison

| Service | Free Tier | Setup Difficulty | Deliverability |
|---------|-----------|------------------|----------------|
| Brevo | 300/day | Medium | High |
| Mailtrap | 100/month | Easy | High |
| Resend | 100/day | Easy | Very High |
| Gmail | Unlimited | Hard | Medium |

## 🔍 Current Configuration

- **Host**: smtp-relay.brevo.com
- **Port**: 587
- **User**: 95b69b002@smtp-brevo.com
- **Issue**: Need Master Password, not API key

## 📝 Next Steps

1. Get your Brevo Master Password
2. Update SMTP_PASS in .env file
3. Test email delivery
4. If still issues, switch to Mailtrap or Resend