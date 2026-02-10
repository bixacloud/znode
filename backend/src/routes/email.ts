import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';
import { 
  getSmtpConfig, 
  testSmtpConnection, 
  sendEmail, 
  sendTemplateEmail,
  initializeDefaultTemplates,
  replaceTemplateVariables
} from '../lib/email.js';

const router = Router();

// All routes require admin
router.use(authMiddleware, adminMiddleware);

// ==================== SMTP Settings ====================

// Get SMTP settings
router.get('/smtp', async (req: Request, res: Response) => {
  try {
    const settings = await prisma.setting.findMany({
      where: {
        key: {
          in: ['smtp_host', 'smtp_port', 'smtp_secure', 'smtp_user', 'smtp_pass', 'smtp_from', 'smtp_from_name']
        }
      }
    });

    const config: Record<string, string> = {};
    settings.forEach(s => {
      // Don't expose password in full
      if (s.key === 'smtp_pass') {
        config[s.key] = s.value ? '********' : '';
      } else {
        config[s.key] = s.value;
      }
    });

    res.json(config);
  } catch (error: any) {
    console.error('Get SMTP error:', error);
    res.status(500).json({ error: 'Failed to get SMTP settings' });
  }
});

// Save SMTP settings
router.post('/smtp', async (req: Request, res: Response) => {
  try {
    const { host, port, secure, user, pass, from, fromName } = req.body;

    const settings = [
      { key: 'smtp_host', value: host || '' },
      { key: 'smtp_port', value: String(port || 587) },
      { key: 'smtp_secure', value: String(secure || false) },
      { key: 'smtp_user', value: user || '' },
      { key: 'smtp_from', value: from || '' },
      { key: 'smtp_from_name', value: fromName || '' }
    ];

    // Only update password if provided (not masked)
    if (pass && pass !== '********') {
      settings.push({ key: 'smtp_pass', value: pass });
    }

    for (const setting of settings) {
      await prisma.setting.upsert({
        where: { key: setting.key },
        update: { value: setting.value },
        create: setting
      });
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Save SMTP error:', error);
    res.status(500).json({ error: 'Failed to save SMTP settings' });
  }
});

// Test SMTP connection
router.post('/smtp/test', async (req: Request, res: Response) => {
  try {
    const { host, port, secure, user, pass, testEmail } = req.body;

    // Get current password if not provided
    let password = pass;
    if (!password || password === '********') {
      const passSetting = await prisma.setting.findUnique({ where: { key: 'smtp_pass' } });
      password = passSetting?.value;
    }

    // Test connection
    const result = await testSmtpConnection({ host, port, secure, user, pass: password });
    
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    // Send test email if address provided
    if (testEmail) {
      // Temporarily save settings for sending
      const tempSettings = [
        { key: 'smtp_host', value: host },
        { key: 'smtp_port', value: String(port) },
        { key: 'smtp_secure', value: String(secure) },
        { key: 'smtp_user', value: user },
        { key: 'smtp_pass', value: password },
        { key: 'smtp_from', value: req.body.from || user },
        { key: 'smtp_from_name', value: req.body.fromName || 'Test' }
      ];

      for (const setting of tempSettings) {
        await prisma.setting.upsert({
          where: { key: setting.key },
          update: { value: setting.value },
          create: setting
        });
      }

      const emailResult = await sendEmail({
        to: testEmail,
        subject: 'SMTP Test Email',
        html: '<h1>Test Email</h1><p>This is a test email to verify SMTP configuration.</p>'
      });

      if (!emailResult.success) {
        return res.status(400).json({ error: emailResult.error });
      }

      res.json({ success: true, message: 'Test email sent successfully' });
    } else {
      res.json({ success: true, message: 'SMTP connection successful' });
    }
  } catch (error: any) {
    console.error('Test SMTP error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== Email Templates ====================

// Initialize default templates
router.post('/templates/init', async (req: Request, res: Response) => {
  try {
    await initializeDefaultTemplates();
    res.json({ success: true });
  } catch (error: any) {
    console.error('Init templates error:', error);
    res.status(500).json({ error: 'Failed to initialize templates' });
  }
});

// Get all templates
router.get('/templates', async (req: Request, res: Response) => {
  try {
    // Initialize default templates if none exist
    const count = await prisma.emailTemplate.count();
    if (count === 0) {
      await initializeDefaultTemplates();
    }

    const templates = await prisma.emailTemplate.findMany({
      orderBy: [{ type: 'asc' }, { name: 'asc' }]
    });

    res.json(templates);
  } catch (error: any) {
    console.error('Get templates error:', error);
    res.status(500).json({ error: 'Failed to get templates' });
  }
});

// Get single template
router.get('/templates/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const template = await prisma.emailTemplate.findUnique({
      where: { id }
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json(template);
  } catch (error: any) {
    console.error('Get template error:', error);
    res.status(500).json({ error: 'Failed to get template' });
  }
});

// Create template (only CUSTOM type)
router.post('/templates', async (req: Request, res: Response) => {
  try {
    const { code, name, subject, body, isActive } = req.body;

    // Check if code already exists
    const existing = await prisma.emailTemplate.findUnique({ where: { code } });
    if (existing) {
      return res.status(400).json({ error: 'Template code already exists' });
    }

    const template = await prisma.emailTemplate.create({
      data: {
        code,
        name,
        subject,
        body,
        type: 'CUSTOM',
        isActive: isActive !== false
      }
    });

    res.json(template);
  } catch (error: any) {
    console.error('Create template error:', error);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// Update template
router.put('/templates/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { name, subject, body, isActive } = req.body;

    const template = await prisma.emailTemplate.findUnique({
      where: { id }
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // For SYSTEM templates, only allow editing name, subject, body, isActive
    // For CUSTOM templates, also allow editing code
    const updateData: any = { name, subject, body };
    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }
    if (template.type === 'CUSTOM' && req.body.code) {
      updateData.code = req.body.code;
    }

    const updated = await prisma.emailTemplate.update({
      where: { id },
      data: updateData
    });

    res.json(updated);
  } catch (error: any) {
    console.error('Update template error:', error);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

// Delete template (only CUSTOM type)
router.delete('/templates/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const template = await prisma.emailTemplate.findUnique({
      where: { id }
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    if (template.type === 'SYSTEM') {
      return res.status(400).json({ error: 'Cannot delete system templates' });
    }

    await prisma.emailTemplate.delete({
      where: { id }
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Delete template error:', error);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

// ==================== Send Email ====================

// Get users for email selection
router.get('/users', async (req: Request, res: Response) => {
  try {
    const { search } = req.query;

    const where: any = {};
    if (search) {
      where.OR = [
        { email: { contains: String(search) } },
        { name: { contains: String(search) } }
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true
      },
      orderBy: { email: 'asc' },
      take: 100
    });

    res.json(users);
  } catch (error: any) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// Send email to users
router.post('/send', async (req: Request, res: Response) => {
  try {
    const { templateId, userIds, subject, body, sendToAll } = req.body;

    let recipients: string[] = [];

    if (sendToAll) {
      // Get all user emails
      const users = await prisma.user.findMany({
        select: { email: true }
      });
      recipients = users.map(u => u.email);
    } else if (userIds && userIds.length > 0) {
      // Get selected user emails
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { email: true }
      });
      recipients = users.map(u => u.email);
    }

    if (recipients.length === 0) {
      return res.status(400).json({ error: 'No recipients selected' });
    }

    // Check SMTP configuration
    const smtpConfig = await getSmtpConfig();
    if (!smtpConfig) {
      return res.status(400).json({ error: 'SMTP not configured' });
    }

    // Send email
    let result;
    if (templateId) {
      // Get template
      const template = await prisma.emailTemplate.findUnique({
        where: { id: templateId }
      });
      
      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }

      // Use template with optional variable overrides
      result = await sendEmail({
        to: recipients,
        subject: subject || template.subject,
        html: body || template.body,
        templateId
      });
    } else {
      // Send custom email
      if (!subject || !body) {
        return res.status(400).json({ error: 'Subject and body are required' });
      }

      result = await sendEmail({
        to: recipients,
        subject,
        html: body
      });
    }

    if (result.success) {
      res.json({ success: true, sent: recipients.length });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error: any) {
    console.error('Send email error:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

// Preview template with variables
router.post('/preview', async (req: Request, res: Response) => {
  try {
    const { templateId, variables } = req.body;

    const template = await prisma.emailTemplate.findUnique({
      where: { id: templateId }
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const subject = replaceTemplateVariables(template.subject, variables || {});
    const body = replaceTemplateVariables(template.body, variables || {});

    res.json({ subject, body });
  } catch (error: any) {
    console.error('Preview error:', error);
    res.status(500).json({ error: 'Failed to preview template' });
  }
});

// ==================== Email Logs ====================

// Get email logs
router.get('/logs', async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (status) {
      where.status = status;
    }

    const [logs, total] = await Promise.all([
      prisma.emailLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit)
      }),
      prisma.emailLog.count({ where })
    ]);

    res.json({
      logs,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit))
    });
  } catch (error: any) {
    console.error('Get logs error:', error);
    res.status(500).json({ error: 'Failed to get email logs' });
  }
});

export default router;
