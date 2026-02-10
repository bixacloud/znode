import nodemailer from 'nodemailer';
import { prisma } from './prisma.js';

interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  fromName: string;
}

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  templateId?: string;
  userId?: string;
}

// Get SMTP settings from database
export async function getSmtpConfig(): Promise<SmtpConfig | null> {
  const settings = await prisma.setting.findMany({
    where: {
      key: {
        in: ['smtp_host', 'smtp_port', 'smtp_secure', 'smtp_user', 'smtp_pass', 'smtp_from', 'smtp_from_name']
      }
    }
  });

  const configMap = settings.reduce((acc, s) => {
    acc[s.key] = s.value;
    return acc;
  }, {} as Record<string, string>);

  if (!configMap.smtp_host || !configMap.smtp_user || !configMap.smtp_pass) {
    return null;
  }

  return {
    host: configMap.smtp_host,
    port: parseInt(configMap.smtp_port || '587'),
    secure: configMap.smtp_secure === 'true',
    user: configMap.smtp_user,
    pass: configMap.smtp_pass,
    from: configMap.smtp_from || configMap.smtp_user,
    fromName: configMap.smtp_from_name || 'System'
  };
}

// Create transporter with current SMTP settings
export async function createTransporter() {
  const config = await getSmtpConfig();
  if (!config) {
    throw new Error('SMTP not configured');
  }

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass
    }
  });
}

// Send email
export async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; error?: string }> {
  const config = await getSmtpConfig();
  if (!config) {
    return { success: false, error: 'SMTP not configured' };
  }

  const transporter = await createTransporter();
  const recipients = Array.isArray(options.to) ? options.to : [options.to];

  const results = [];

  for (const recipient of recipients) {
    // Create email log
    const log = await prisma.emailLog.create({
      data: {
        templateId: options.templateId,
        toEmail: recipient,
        toUserId: options.userId,
        subject: options.subject,
        body: options.html,
        status: 'PENDING'
      }
    });

    try {
      await transporter.sendMail({
        from: `"${config.fromName}" <${config.from}>`,
        to: recipient,
        subject: options.subject,
        html: options.html
      });

      // Update log as sent
      await prisma.emailLog.update({
        where: { id: log.id },
        data: { status: 'SENT', sentAt: new Date() }
      });

      results.push({ email: recipient, success: true });
    } catch (error: any) {
      // Update log as failed
      await prisma.emailLog.update({
        where: { id: log.id },
        data: { status: 'FAILED', error: error.message }
      });

      results.push({ email: recipient, success: false, error: error.message });
    }
  }

  const allSuccess = results.every(r => r.success);
  const errors = results.filter(r => !r.success).map(r => `${r.email}: ${r.error}`);

  return {
    success: allSuccess,
    error: errors.length > 0 ? errors.join('; ') : undefined
  };
}

// Replace variables in template
export function replaceTemplateVariables(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }
  return result;
}

// Send email using template
export async function sendTemplateEmail(
  templateCode: string,
  to: string | string[],
  variables: Record<string, string>,
  userId?: string
): Promise<{ success: boolean; error?: string }> {
  const template = await prisma.emailTemplate.findUnique({
    where: { code: templateCode }
  });

  if (!template) {
    return { success: false, error: `Template ${templateCode} not found` };
  }

  if (!template.isActive) {
    return { success: false, error: `Template ${templateCode} is disabled` };
  }

  const subject = replaceTemplateVariables(template.subject, variables);
  const html = replaceTemplateVariables(template.body, variables);

  return sendEmail({
    to,
    subject,
    html,
    templateId: template.id,
    userId
  });
}

// Test SMTP connection
export async function testSmtpConnection(config: Partial<SmtpConfig>): Promise<{ success: boolean; error?: string }> {
  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port || 587,
      secure: config.secure || false,
      auth: {
        user: config.user,
        pass: config.pass
      }
    });

    await transporter.verify();
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Default system templates
export const DEFAULT_TEMPLATES = [
  {
    code: 'HOSTING_CREATED',
    name: 'Hosting Account Created',
    subject: 'Your hosting account {{domain}} has been created',
    body: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #2563eb;">Welcome to Your New Hosting Account!</h2>
    <p>Hello {{name}},</p>
    <p>Your hosting account has been created successfully.</p>
    <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <p><strong>Domain:</strong> {{domain}}</p>
      <p><strong>Username:</strong> {{username}}</p>
      <p><strong>Password:</strong> {{password}}</p>
    </div>
    <p>You can now login to your control panel to manage your website.</p>
    <p>Thank you for choosing us!</p>
  </div>
</body>
</html>`
  },
  {
    code: 'HOSTING_ACTIVATED',
    name: 'Hosting Account Activated',
    subject: 'Your hosting account {{domain}} is now active',
    body: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #16a34a;">Your Hosting Account is Now Active!</h2>
    <p>Hello {{name}},</p>
    <p>Great news! Your hosting account <strong>{{domain}}</strong> has been activated and is now ready to use.</p>
    <p>You can start uploading your website files and setting up your email accounts.</p>
    <p>Thank you for your patience!</p>
  </div>
</body>
</html>`
  },
  {
    code: 'HOSTING_SUSPENDED',
    name: 'Hosting Account Suspended',
    subject: 'Your hosting account {{domain}} has been suspended',
    body: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #dc2626;">Hosting Account Suspended</h2>
    <p>Hello {{name}},</p>
    <p>Your hosting account <strong>{{domain}}</strong> has been suspended.</p>
    <div style="background: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
      <p><strong>Reason:</strong> {{reason}}</p>
    </div>
    <p>If you believe this is a mistake, please contact our support team.</p>
  </div>
</body>
</html>`
  },
  {
    code: 'HOSTING_REACTIVATED',
    name: 'Hosting Account Reactivated',
    subject: 'Your hosting account {{domain}} has been reactivated',
    body: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #16a34a;">Your Hosting Account Has Been Reactivated!</h2>
    <p>Hello {{name}},</p>
    <p>Your hosting account <strong>{{domain}}</strong> has been reactivated and is now accessible again.</p>
    <p>Thank you for resolving the issue.</p>
  </div>
</body>
</html>`
  },
  {
    code: 'PASSWORD_CHANGED',
    name: 'Hosting Password Changed',
    subject: 'Your hosting password for {{domain}} has been changed',
    body: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #2563eb;">Password Changed Successfully</h2>
    <p>Hello {{name}},</p>
    <p>The password for your hosting account <strong>{{domain}}</strong> has been changed.</p>
    <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <p><strong>New Password:</strong> {{password}}</p>
    </div>
    <p>If you did not make this change, please contact our support team immediately.</p>
  </div>
</body>
</html>`
  },
  {
    code: 'TICKET_REPLY',
    name: 'Ticket Reply Notification',
    subject: 'New reply to your ticket: {{subject}}',
    body: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #2563eb;">New Reply to Your Support Ticket</h2>
    <p>Hello {{name}},</p>
    <p>You have received a new reply to your support ticket.</p>
    <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <p><strong>Subject:</strong> {{subject}}</p>
      <p><strong>Ticket ID:</strong> #{{ticketId}}</p>
    </div>
    <p>Please login to your account to view the full message and respond.</p>
  </div>
</body>
</html>`
  },
  {
    code: 'WELCOME',
    name: 'Welcome Email',
    subject: 'Welcome to {{siteName}}!',
    body: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #2563eb;">Welcome to {{siteName}}!</h2>
    <p>Hello {{name}},</p>
    <p>Thank you for registering with us. Your account has been created successfully.</p>
    <p>You can now login and start creating your hosting accounts.</p>
    <p>If you have any questions, feel free to contact our support team.</p>
    <p>Best regards,<br>The {{siteName}} Team</p>
  </div>
</body>
</html>`
  },
  {
    code: 'PASSWORD_RESET',
    name: 'Password Reset',
    subject: 'Reset your password',
    body: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #2563eb;">Reset Your Password</h2>
    <p>Hello {{name}},</p>
    <p>We received a request to reset your password. Click the button below to create a new password:</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{resetLink}}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a>
    </div>
    <p>Or copy this link to your browser:</p>
    <p style="background: #f3f4f6; padding: 10px; border-radius: 4px; word-break: break-all;">{{resetLink}}</p>
    <p style="color: #666; font-size: 14px;">This link will expire in 1 hour.</p>
    <p style="color: #666; font-size: 14px;">If you didn't request this, please ignore this email.</p>
  </div>
</body>
</html>`
  },
  {
    code: 'EMAIL_VERIFICATION',
    name: 'Email Verification',
    subject: 'Verify your email address',
    body: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #2563eb;">Verify Your Email Address</h2>
    <p>Hello {{name}},</p>
    <p>Thank you for registering! Please verify your email address by clicking the button below:</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{verifyLink}}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Verify Email</a>
    </div>
    <p>Or copy this link to your browser:</p>
    <p style="background: #f3f4f6; padding: 10px; border-radius: 4px; word-break: break-all;">{{verifyLink}}</p>
    <div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center;">
      <p style="margin: 0 0 10px 0; font-weight: bold; color: #92400e;">Your OTP Code:</p>
      <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 0; color: #2563eb; font-family: monospace;">{{otp}}</p>
    </div>
    <p style="color: #666; font-size: 14px;">This link and OTP will expire in 30 minutes.</p>
    <p style="color: #666; font-size: 14px;">If you didn't create an account, please ignore this email.</p>
    <p>Best regards,<br>The {{siteName}} Team</p>
  </div>
</body>
</html>`
  },
  {
    code: 'DATA_IMPORT_CREDENTIALS',
    name: 'Data Import - New Credentials',
    subject: 'Your account has been migrated to {{siteName}}',
    body: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #2563eb;">Your Account Has Been Migrated</h2>
    <p>Hello {{name}},</p>
    <p>We have migrated our hosting platform to a new system. Your account data has been transferred successfully.</p>
    <p>Please use the following credentials to log in to the new system:</p>
    <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <p><strong>Email:</strong> {{email}}</p>
      <p><strong>New Password:</strong> {{password}}</p>
    </div>
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{loginUrl}}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Login Now</a>
    </div>
    <p style="color: #e11d48; font-weight: bold;">⚠️ Please change your password after your first login for security purposes.</p>
    <p>Your hosting accounts and data have been preserved. If you have any questions, please contact our support team.</p>
    <p>Best regards,<br>The {{siteName}} Team</p>
  </div>
</body>
</html>`
  }
];

// Initialize default templates
export async function initializeDefaultTemplates() {
  for (const template of DEFAULT_TEMPLATES) {
    const existing = await prisma.emailTemplate.findUnique({
      where: { code: template.code }
    });

    if (!existing) {
      await prisma.emailTemplate.create({
        data: {
          ...template,
          type: 'SYSTEM'
        }
      });
    }
  }
}
