import nodemailer from 'nodemailer';
import { config } from '../config';
import { OTPType } from '../lib/enums';

const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: false,
  auth: {
    user: config.email.user,
    pass: config.email.password,
  },
});

export class EmailService {
  static async sendOTP(email: string, otp: string, type: OTPType): Promise<void> {
    const subject = type === OTPType.REGISTRATION
      ? 'Verify Your Email - Smart Coop Hub'
      : type === OTPType.PASSWORD_RESET
      ? 'Reset Your Password - Smart Coop Hub'
      : 'Your OTP Code - Smart Coop Hub';

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
            .content { background: #f9fafb; padding: 30px; border-radius: 8px; margin: 20px 0; }
            .otp { font-size: 32px; font-weight: bold; color: #2563eb; text-align: center; letter-spacing: 5px; padding: 20px; background: white; border-radius: 8px; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Smart Coop Hub</h1>
            </div>
            <div class="content">
              <h2>Your OTP Code</h2>
              <p>Use the following code to complete your verification:</p>
              <div class="otp">${otp}</div>
              <p>This code will expire in ${config.otp.expiryMinutes} minutes.</p>
              <p>If you didn't request this code, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Smart Coop Hub. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await transporter.sendMail({
      from: config.email.from,
      to: email,
      subject,
      html,
    });
  }

  static async sendWelcomeEmail(email: string, name: string): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
            .content { background: #f9fafb; padding: 30px; border-radius: 8px; margin: 20px 0; }
            .button { display: inline-block; padding: 12px 30px; background: #2563eb; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to Smart Coop Hub!</h1>
            </div>
            <div class="content">
              <h2>Hello ${name},</h2>
              <p>Welcome to Smart Coop Hub - Your digital platform for cooperative management and marketplace.</p>
              <p>We're excited to have you on board! Here's what you can do:</p>
              <ul>
                <li>Manage your cooperative members and finances</li>
                <li>Connect with buyers through our marketplace</li>
                <li>Post job opportunities and announcements</li>
                <li>Generate transparent reports</li>
              </ul>
              <a href="${config.frontend.url}/dashboard" class="button">Go to Dashboard</a>
              <p>If you have any questions, feel free to reach out to our support team.</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Smart Coop Hub. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await transporter.sendMail({
      from: config.email.from,
      to: email,
      subject: 'Welcome to Smart Coop Hub!',
      html,
    });
  }

  static async sendInvitationEmail(
    email: string,
    cooperativeName: string,
    role: string,
    inviteLink: string
  ): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
            .content { background: #f9fafb; padding: 30px; border-radius: 8px; margin: 20px 0; }
            .button { display: inline-block; padding: 12px 30px; background: #10b981; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .info-box { background: white; padding: 15px; border-left: 4px solid #2563eb; margin: 15px 0; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>You're Invited!</h1>
            </div>
            <div class="content">
              <h2>Cooperative Membership Invitation</h2>
              <p>You have been invited to join <strong>${cooperativeName}</strong> on Smart Coop Hub.</p>
              <div class="info-box">
                <p><strong>Your Role:</strong> ${role}</p>
                <p><strong>Cooperative:</strong> ${cooperativeName}</p>
              </div>
              <p>Click the button below to accept your invitation and set up your account:</p>
              <a href="${inviteLink}" class="button">Accept Invitation</a>
              <p><small>This invitation link will expire in 7 days.</small></p>
              <p>If you didn't expect this invitation, you can safely ignore this email.</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Smart Coop Hub. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await transporter.sendMail({
      from: config.email.from,
      to: email,
      subject: `Invitation to Join ${cooperativeName} - Smart Coop Hub`,
      html,
    });
  }

  static async sendPasswordResetEmail(email: string, resetLink: string): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
            .content { background: #f9fafb; padding: 30px; border-radius: 8px; margin: 20px 0; }
            .button { display: inline-block; padding: 12px 30px; background: #ef4444; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset Request</h1>
            </div>
            <div class="content">
              <h2>Reset Your Password</h2>
              <p>We received a request to reset your password. Click the button below to proceed:</p>
              <a href="${resetLink}" class="button">Reset Password</a>
              <p><small>This link will expire in 1 hour.</small></p>
              <p>If you didn't request a password reset, please ignore this email and your password will remain unchanged.</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Smart Coop Hub. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await transporter.sendMail({
      from: config.email.from,
      to: email,
      subject: 'Password Reset - Smart Coop Hub',
      html,
    });
  }

  static async sendContactConfirmationEmail(email: string, name: string): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #0854f8ff; color: white; padding: 20px; text-align: center; }
            .content { background: #f9fafb; padding: 30px; border-radius: 8px; margin: 20px 0; }
            .info-box { background: white; padding: 20px; border-left: 4px solid #10b981; margin: 20px 0; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Smart Coop Hub</h1>
            </div>
            <div class="content">
              <h2>Contact Received Successfully!</h2>
              <p>Dear ${name},</p>
              <div class="info-box">
                <p>✅ <strong>Your contact form has been received successfully!</strong></p>
                <p>Thank you for reaching out to us. We appreciate your interest in Smart Coop Hub.</p>
              </div>
              <p>Our support team will review your inquiry and get back to you within 24-48 hours.</p>
              <p>In the meantime, feel free to explore our platform or contact us if you have any urgent questions.</p>
              <p>We look forward to assisting you!</p>
              <p>Best regards,<br>The Smart Coop Hub Team</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Smart Coop Hub. All rights reserved.</p>
              <p>info@smartcoophub.rw | +250 XXX XXX XXX | Kigali, Rwanda</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await transporter.sendMail({
      from: config.email.from,
      to: email,
      subject: 'Contact Received - Smart Coop Hub',
      html,
    });
  }

  static async sendContactResponseEmail(
    email: string,
    name: string,
    originalMessage: string,
    response: string,
    responderName: string
  ): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #111827; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1d4ed8; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .section { margin-bottom: 20px; padding: 20px; background: white; border-radius: 8px; border: 1px solid #e5e7eb; }
            .response { border-left: 4px solid #10b981; }
            .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Smart Coop Hub</h1>
              <p>Your message has been answered</p>
            </div>
            <div class="content">
              <p>Hi ${name},</p>
              <div class="section">
                <h3 style="margin: 0 0 8px;">What you shared</h3>
                <p style="margin: 0;">${originalMessage}</p>
              </div>
              <div class="section response">
                <h3 style="margin: 0 0 8px;">Our response</h3>
                <p style="margin: 0;">${response}</p>
              </div>
              <div class="section">
                <p style="margin: 0;">Answered by <strong>${responderName}</strong></p>
              </div>
              <p>If you need anything else, reply to this email or visit <a href="${config.frontend.url}/contact">our support page</a>.</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Smart Coop Hub. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await transporter.sendMail({
      from: config.email.from,
      to: email,
      subject: 'Reply from Smart Coop Hub Support',
      html,
    });
  }

  static async sendAdminCredentials(
    email: string,
    firstName: string,
    cooperativeName: string,
    loginEmail: string,
    password: string
  ): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #10b981; color: white; padding: 20px; text-align: center; }
            .content { background: #f9fafb; padding: 30px; border-radius: 8px; margin: 20px 0; }
            .credentials-box { background: white; padding: 20px; border: 2px solid #10b981; border-radius: 8px; margin: 20px 0; }
            .credential-item { padding: 10px; margin: 5px 0; background: #f3f4f6; border-radius: 4px; }
            .credential-label { font-weight: bold; color: #374151; }
            .credential-value { color: #1f2937; font-family: monospace; font-size: 14px; }
            .button { display: inline-block; padding: 12px 30px; background: #10b981; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Cooperative Approved!</h1>
            </div>
            <div class="content">
              <h2>Congratulations ${firstName}!</h2>
              <p>Your cooperative <strong>${cooperativeName}</strong> has been approved by the Super Admin.</p>
              <p>Your admin account has been created. Below are your login credentials:</p>
              
              <div class="credentials-box">
                <h3 style="margin-top: 0; color: #10b981;">Login Credentials</h3>
                <div class="credential-item">
                  <span class="credential-label">Email:</span><br>
                  <span class="credential-value">${loginEmail}</span>
                </div>
                <div class="credential-item">
                  <span class="credential-label">Password:</span><br>
                  <span class="credential-value">${password}</span>
                </div>
              </div>

              <div class="warning">
                <strong>⚠️ Important Security Notice:</strong>
                <ul style="margin: 10px 0;">
                  <li>Please change your password immediately after your first login</li>
                  <li>Do not share these credentials with anyone</li>
                  <li>Keep this email secure or delete it after changing your password</li>
                </ul>
              </div>

              <p>Click the button below to log in to your dashboard:</p>
              <a href="${config.frontend.url}/login" class="button">Login to Dashboard</a>

              <p><strong>Next Steps:</strong></p>
              <ul>
                <li>Complete your profile information in settings</li>
                <li>Add members to your cooperative</li>
                <li>Start listing your products on the marketplace</li>
                <li>Manage your cooperative's finances and transactions</li>
              </ul>

              <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
              
              <p>Welcome aboard!<br>The Smart Coop Hub Team</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Smart Coop Hub. All rights reserved.</p>
              <p>info@smartcoophub.rw | Kigali, Rwanda</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await transporter.sendMail({
      from: config.email.from,
      to: email,
      subject: `${cooperativeName} Approved - Your Admin Credentials`,
      html,
    });
  }

  static async sendMemberCredentials(
    email: string,
    firstName: string,
    cooperativeName: string,
    loginEmail: string,
    password: string,
    role: string
  ): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
            .content { background: #f9fafb; padding: 30px; border-radius: 8px; margin: 20px 0; }
            .credentials-box { background: white; padding: 20px; border: 2px solid #2563eb; border-radius: 8px; margin: 20px 0; }
            .credential-item { padding: 10px; margin: 5px 0; background: #f3f4f6; border-radius: 4px; }
            .credential-label { font-weight: bold; color: #374151; }
            .credential-value { color: #1f2937; font-family: monospace; font-size: 14px; }
            .button { display: inline-block; padding: 12px 30px; background: #2563eb; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
            .info-box { background: white; padding: 15px; border-left: 4px solid #2563eb; margin: 15px 0; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 You're Invited!</h1>
            </div>
            <div class="content">
              <h2>Welcome ${firstName}!</h2>
              <p>You have been invited to join <strong>${cooperativeName}</strong> on Smart Coop Hub.</p>
              
              <div class="info-box">
                <p><strong>Your Role:</strong> ${role}</p>
                <p><strong>Cooperative:</strong> ${cooperativeName}</p>
              </div>

              <p>Your member account has been created. Below are your login credentials:</p>
              
              <div class="credentials-box">
                <h3 style="margin-top: 0; color: #2563eb;">Login Credentials</h3>
                <div class="credential-item">
                  <span class="credential-label">Email:</span><br>
                  <span class="credential-value">${loginEmail}</span>
                </div>
                <div class="credential-item">
                  <span class="credential-label">Password:</span><br>
                  <span class="credential-value">${password}</span>
                </div>
              </div>

              <div class="warning">
                <strong>⚠️ Important Security Notice:</strong>
                <ul style="margin: 10px 0;">
                  <li>Please change your password immediately after your first login</li>
                  <li>Do not share these credentials with anyone</li>
                  <li>Keep this email secure or delete it after changing your password</li>
                </ul>
              </div>

              <p>Click the button below to log in to your dashboard:</p>
              <a href="${config.frontend.url}/login" class="button">Login to Dashboard</a>

              <p><strong>What you can do:</strong></p>
              <ul>
                <li>View your cooperative's announcements and updates</li>
                <li>Track your contributions and financial records</li>
                <li>Access member documents and resources</li>
                <li>View products and marketplace listings</li>
              </ul>

              <p>If you have any questions or need assistance, please contact your cooperative administrator.</p>
              
              <p>Welcome aboard!<br>The Smart Coop Hub Team</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Smart Coop Hub. All rights reserved.</p>
              <p>info@smartcoophub.rw | Kigali, Rwanda</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await transporter.sendMail({
      from: config.email.from,
      to: email,
      subject: `Welcome to ${cooperativeName} - Your Member Credentials`,
      html,
    });
  }

  static async sendNotificationEmail(to: string, subject: string, html: string): Promise<void> {
    await transporter.sendMail({
      from: config.email.from,
      to,
      subject,
      html,
    });
  }
}
