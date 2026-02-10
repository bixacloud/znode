import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import prisma from '../lib/prisma.js';
import { registerSchema, loginSchema } from '../lib/validation.js';
import { 
  generateAccessToken, 
  generateRefreshToken, 
  setTokenCookies, 
  clearTokenCookies,
  verifyToken 
} from '../lib/jwt.js';
import { adminMiddleware, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// Check if admin registration is available
router.get('/check-registration', async (req: Request, res: Response) => {
  try {
    const adminCount = await prisma.user.count({
      where: { role: 'ADMIN' },
    });

    res.json({
      registrationOpen: adminCount === 0,
      message: adminCount === 0 
        ? 'Admin registration is available' 
        : 'Admin registration is closed',
    });
  } catch (error) {
    console.error('Check admin registration error:', error);
    res.status(500).json({ error: 'Failed to check registration status' });
  }
});

// Admin Register (only works if no admin exists)
router.post('/register', async (req: Request, res: Response) => {
  try {
    // Check if admin already exists
    const adminCount = await prisma.user.count({
      where: { role: 'ADMIN' },
    });

    if (adminCount > 0) {
      return res.status(403).json({ 
        error: 'Admin registration is closed',
        message: 'An admin account already exists' 
      });
    }

    const validation = registerSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: validation.error.errors 
      });
    }

    const { email, password, name } = validation.data;

    // Check if email is already used
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create admin user
    const admin = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: 'ADMIN',
        emailVerified: new Date(),
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        createdAt: true,
      },
    });

    // Generate tokens
    const accessToken = generateAccessToken({ userId: admin.id, email: admin.email });
    const refreshToken = generateRefreshToken({ userId: admin.id, email: admin.email });

    setTokenCookies(res, accessToken, refreshToken);

    res.status(201).json({
      message: 'Admin registration successful',
      user: admin,
      accessToken,
    });
  } catch (error) {
    console.error('Admin register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Admin Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const validation = loginSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: validation.error.errors 
      });
    }

    const { email, password } = validation.data;

    // Find admin user
    const admin = await prisma.user.findUnique({
      where: { email },
    });

    if (!admin || !admin.password) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check if user is admin
    if (admin.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied. Admin account required.' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, admin.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate tokens
    const accessToken = generateAccessToken({ userId: admin.id, email: admin.email });
    const refreshToken = generateRefreshToken({ userId: admin.id, email: admin.email });

    setTokenCookies(res, accessToken, refreshToken);

    res.json({
      message: 'Login successful',
      user: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        avatar: admin.avatar,
        role: admin.role,
      },
      accessToken,
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get admin profile
router.get('/me', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const admin = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    if (!admin || admin.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ user: admin });
  } catch (error) {
    console.error('Get admin error:', error);
    res.status(500).json({ error: 'Failed to get admin profile' });
  }
});

// ==================== Admin Management Routes ====================

// Get all users (admin only)
router.get('/users', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          avatar: true,
          role: true,
          emailVerified: true,
          createdAt: true,
          _count: {
            select: { accounts: true },
          },
        },
      }),
      prisma.user.count(),
    ]);

    res.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// Get user by ID (admin only)
router.get('/users/:id', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.params.id as string;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        accounts: {
          select: {
            id: true,
            provider: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Delete user (admin only)
router.delete('/users/:id', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    // Prevent admin from deleting themselves
    if (id === req.user!.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const user = await prisma.user.findUnique({
      where: { id: id },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await prisma.user.delete({
      where: { id: id },
    });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Create user (admin only)
router.post('/users', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email, password, name, role } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || null,
        role: role === 'ADMIN' ? 'ADMIN' : (role === 'SUPPORT' ? 'SUPPORT' : 'USER'),
        emailVerified: new Date(),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    res.status(201).json({
      message: 'User created successfully',
      user,
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update user (admin only)
router.put('/users/:id', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.params.id as string;
    const { name, email, password, role } = req.body;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent changing own role
    if (userId === req.user!.id && role && role !== existingUser.role) {
      return res.status(400).json({ error: 'Cannot change your own role' });
    }

    // Check if new email is already taken
    if (email && email !== existingUser.email) {
      const emailTaken = await prisma.user.findUnique({
        where: { email },
      });
      if (emailTaken) {
        return res.status(400).json({ error: 'Email already registered' });
      }
    }

    // Build update data
    const updateData: {
      name?: string;
      email?: string;
      password?: string;
      role?: 'USER' | 'SUPPORT' | 'ADMIN';
      emailVerified?: Date | null;
    } = {};

    if (name !== undefined) updateData.name = name;
    if (email) updateData.email = email;
    if (role && ['USER', 'SUPPORT', 'ADMIN'].includes(role)) updateData.role = role;
    
    // Handle emailVerified - admin can manually verify/unverify users
    const { emailVerified } = req.body;
    if (emailVerified !== undefined) {
      updateData.emailVerified = emailVerified ? new Date() : null;
    }

    // Hash new password if provided
    if (password && password.length >= 6) {
      updateData.password = await bcrypt.hash(password, 12);
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({
      message: 'User updated successfully',
      user,
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Get dashboard stats (admin only)
router.get('/stats', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const [totalUsers, totalAdmins, recentUsers, totalHostings, activeHostings, suspendedHostings] = await Promise.all([
      prisma.user.count({ where: { role: 'USER' } }),
      prisma.user.count({ where: { role: 'ADMIN' } }),
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
      }),
      prisma.hosting.count(),
      prisma.hosting.count({ where: { status: 'ACTIVE' } }),
      prisma.hosting.count({ where: { status: 'SUSPENDED' } }),
    ]);

    res.json({
      stats: {
        totalUsers,
        totalAdmins,
        recentUsers,
        totalHostings,
        activeHostings,
        suspendedHostings,
      },
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// ==================== SYSTEM HEALTH CHECK ====================

// Get system health status (admin only)
router.get('/health', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const checks: Record<string, { status: 'online' | 'offline' | 'unconfigured'; latency?: number; message?: string }> = {};

  // 1. API check (always online if we reach here)
  checks.api = { status: 'online', message: 'Backend running' };

  // 2. Database check
  const dbStart = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { status: 'online', latency: Date.now() - dbStart, message: 'Database connected' };
  } catch (err: any) {
    checks.database = { status: 'offline', latency: Date.now() - dbStart, message: err.message || 'Database connection failed' };
  }

  // 3. MOFH API check
  try {
    const mofhSetting = await prisma.setting.findUnique({ where: { key: 'mofh_config' } });
    if (!mofhSetting) {
      checks.mofh = { status: 'unconfigured', message: 'MOFH not configured' };
    } else {
      const mofhConfig = JSON.parse(mofhSetting.value);
      if (!mofhConfig.enabled) {
        checks.mofh = { status: 'unconfigured', message: 'MOFH disabled' };
      } else if (!mofhConfig.apiUsername || !mofhConfig.apiPassword) {
        checks.mofh = { status: 'unconfigured', message: 'MOFH credentials not set' };
      } else {
        const mofhStart = Date.now();
        const authString = Buffer.from(`${mofhConfig.apiUsername}:${mofhConfig.apiPassword}`).toString('base64');
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        try {
          const resp = await fetch('https://panel.myownfreehost.net/json-api/getdomainlist', {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${authString}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({ api_user: mofhConfig.apiUsername, api_key: mofhConfig.apiPassword }).toString(),
            signal: controller.signal,
          });
          clearTimeout(timeout);
          checks.mofh = resp.ok || resp.status === 200
            ? { status: 'online', latency: Date.now() - mofhStart, message: 'MOFH connection OK' }
            : { status: 'offline', latency: Date.now() - mofhStart, message: `MOFH returned ${resp.status}` };
        } catch (fetchErr: any) {
          clearTimeout(timeout);
          checks.mofh = { status: 'offline', latency: Date.now() - mofhStart, message: fetchErr.name === 'AbortError' ? 'MOFH timeout (10s)' : (fetchErr.message || 'MOFH connection failed') };
        }
      }
    }
  } catch (err: any) {
    checks.mofh = { status: 'offline', message: err.message || 'Failed to check MOFH' };
  }

  // 4. SMTP check
  try {
    const smtpSettings = await prisma.setting.findMany({
      where: { key: { in: ['smtp_host', 'smtp_port', 'smtp_secure', 'smtp_user', 'smtp_pass'] } },
    });
    const smtpMap = smtpSettings.reduce((acc, s) => { acc[s.key] = s.value; return acc; }, {} as Record<string, string>);

    if (!smtpMap.smtp_host || !smtpMap.smtp_user || !smtpMap.smtp_pass) {
      checks.smtp = { status: 'unconfigured', message: 'SMTP not configured' };
    } else {
      const smtpStart = Date.now();
      try {
        const transporter = nodemailer.createTransport({
          host: smtpMap.smtp_host,
          port: parseInt(smtpMap.smtp_port || '587'),
          secure: smtpMap.smtp_secure === 'true',
          auth: { user: smtpMap.smtp_user, pass: smtpMap.smtp_pass },
          connectionTimeout: 10000,
        });
        await transporter.verify();
        transporter.close();
        checks.smtp = { status: 'online', latency: Date.now() - smtpStart, message: 'Email sending works' };
      } catch (smtpErr: any) {
        checks.smtp = { status: 'offline', latency: Date.now() - smtpStart, message: smtpErr.message || 'SMTP connection failed' };
      }
    }
  } catch (err: any) {
    checks.smtp = { status: 'offline', message: err.message || 'Failed to check SMTP' };
  }

  // 5. Cloudflare (SSL DNS) check
  try {
    const cfSetting = await prisma.setting.findUnique({ where: { key: 'CLOUDFLARE_API_TOKEN' } });
    if (!cfSetting || !cfSetting.value) {
      checks.cloudflare = { status: 'unconfigured', message: 'Cloudflare not configured' };
    } else {
      const cfStart = Date.now();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      try {
        const resp = await fetch('https://api.cloudflare.com/client/v4/user/tokens/verify', {
          headers: { 'Authorization': `Bearer ${cfSetting.value}` },
          signal: controller.signal,
        });
        clearTimeout(timeout);
        const data = await resp.json() as any;
        checks.cloudflare = data.success
          ? { status: 'online', latency: Date.now() - cfStart, message: 'Cloudflare connected' }
          : { status: 'offline', latency: Date.now() - cfStart, message: 'Invalid API token' };
      } catch (cfErr: any) {
        clearTimeout(timeout);
        checks.cloudflare = { status: 'offline', latency: Date.now() - cfStart, message: cfErr.name === 'AbortError' ? 'Cloudflare timeout' : (cfErr.message || 'Cloudflare check failed') };
      }
    }
  } catch (err: any) {
    checks.cloudflare = { status: 'offline', message: err.message || 'Failed to check Cloudflare' };
  }

  const allOnline = Object.values(checks).every(c => c.status === 'online');
  const hasOffline = Object.values(checks).some(c => c.status === 'offline');

  res.json({
    overall: hasOffline ? 'degraded' : (allOnline ? 'healthy' : 'partial'),
    checks,
    timestamp: new Date().toISOString(),
  });
});

// ==================== ADMIN HOSTING MANAGEMENT ====================

// Get all hosting accounts (admin only)
router.get('/hostings', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string || '';
    const status = req.query.status as string || '';
    
    const where: any = {};
    
    if (search) {
      where.OR = [
        { vpUsername: { contains: search } },
        { domain: { contains: search } },
        { label: { contains: search } },
      ];
    }
    
    if (status && status !== 'all') {
      where.status = status;
    }
    
    const [hostings, total] = await Promise.all([
      prisma.hosting.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.hosting.count({ where }),
    ]);

    res.json({
      hostings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get admin hostings error:', error);
    res.status(500).json({ error: 'Failed to get hosting accounts' });
  }
});

// Get single hosting account (admin only)
router.get('/hostings/:vpUsername', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const vpUsername = req.params.vpUsername as string;
    
    const hosting = await prisma.hosting.findFirst({
      where: { vpUsername },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    if (!hosting) {
      return res.status(404).json({ error: 'Hosting account not found' });
    }

    res.json({ hosting });
  } catch (error) {
    console.error('Get admin hosting error:', error);
    res.status(500).json({ error: 'Failed to get hosting account' });
  }
});

// Helper function to check if text is English only
function isEnglishOnly(text: string): boolean {
  // Allow letters, numbers, spaces, and basic punctuation
  return /^[a-zA-Z0-9\s.,!?'"\-_():;@#$%&*+=\/\\]+$/.test(text);
}

// Admin suspend hosting (by admin)
router.post('/hostings/:vpUsername/suspend', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const vpUsername = req.params.vpUsername as string;
    const { reason } = req.body;
    const adminId = req.user!.id;
    
    // Validate reason is provided and in English
    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({ error: 'Suspend reason is required' });
    }
    
    if (!isEnglishOnly(reason)) {
      return res.status(400).json({ error: 'Suspend reason must be in English only' });
    }
    
    const hosting = await prisma.hosting.findFirst({
      where: { vpUsername },
    });

    if (!hosting) {
      return res.status(404).json({ error: 'Hosting account not found' });
    }

    if (hosting.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'Can only suspend active accounts' });
    }

    // Get admin info for logging
    const admin = await prisma.user.findUnique({
      where: { id: adminId },
      select: { email: true, name: true },
    });

    // Call MOFH API to suspend
    const setting = await prisma.setting.findUnique({
      where: { key: 'mofh_config' },
    });
    
    if (!setting) {
      return res.status(500).json({ error: 'MOFH not configured' });
    }
    
    const config = JSON.parse(setting.value);
    const authString = Buffer.from(`${config.apiUsername}:${config.apiPassword}`).toString('base64');
    
    const suspendReason = reason || 'Suspended by admin';
    const adminName = admin?.name || admin?.email?.split('@')[0] || 'Admin';
    const fullReason = `[Admin: ${adminName}] ${suspendReason}`;
    
    const params = new URLSearchParams({
      user: hosting.username, // Use 8-char username for MOFH
      reason: fullReason,
    });
    
    const response = await fetch('https://panel.myownfreehost.net/json-api/suspendacct.php', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });
    
    const responseText = await response.text();
    console.log('[ADMIN SUSPEND] Raw response:', responseText);
    
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      console.error('[ADMIN SUSPEND] Failed to parse JSON:', responseText);
      return res.status(500).json({ error: 'Invalid response from MOFH API' });
    }
    
    console.log('[ADMIN SUSPEND]', vpUsername, result);
    
    // Check MOFH response - format is { result: [{ status: 1, statusmsg: '...' }] }
    const status = result?.result?.[0]?.status;
    const statusMsg = result?.result?.[0]?.statusmsg || '';
    
    if (status !== 1) {
      return res.status(400).json({ 
        error: statusMsg || 'MOFH failed to suspend account',
      });
    }
    
    // Set to SUSPENDING, will change to SUSPENDED via callback
    await prisma.hosting.update({
      where: { id: hosting.id },
      data: {
        status: 'SUSPENDING',
        suspendReason: `[BY ADMIN] ${suspendReason}`,
        suspendedAt: new Date(),
      },
    });
    
    res.json({ 
      success: true, 
      message: 'Suspend request sent successfully',
      status: 'SUSPENDING',
    });
  } catch (error) {
    console.error('Admin suspend error:', error);
    res.status(500).json({ error: 'Failed to suspend hosting account' });
  }
});

// Admin unsuspend hosting (only admin can unsuspend admin-suspended accounts)
router.post('/hostings/:vpUsername/unsuspend', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const vpUsername = req.params.vpUsername as string;
    
    const hosting = await prisma.hosting.findFirst({
      where: { vpUsername },
    });

    if (!hosting) {
      return res.status(404).json({ error: 'Hosting account not found' });
    }

    if (hosting.status !== 'SUSPENDED') {
      return res.status(400).json({ error: 'Can only unsuspend suspended accounts' });
    }

    // Call MOFH API to unsuspend
    const setting = await prisma.setting.findUnique({
      where: { key: 'mofh_config' },
    });
    
    if (!setting) {
      return res.status(500).json({ error: 'MOFH not configured' });
    }
    
    const config = JSON.parse(setting.value);
    const authString = Buffer.from(`${config.apiUsername}:${config.apiPassword}`).toString('base64');
    
    const params = new URLSearchParams({
      user: hosting.username, // Use 8-char username for MOFH
    });
    
    const response = await fetch('https://panel.myownfreehost.net/json-api/unsuspendacct.php', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });
    
    const responseText = await response.text();
    console.log('[ADMIN UNSUSPEND] Raw response:', responseText);
    
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      console.error('[ADMIN UNSUSPEND] Failed to parse JSON:', responseText);
      return res.status(500).json({ error: 'Invalid response from MOFH API' });
    }
    
    console.log('[ADMIN UNSUSPEND]', vpUsername, result);
    
    // Check MOFH response - format is { result: [{ status: 1, statusmsg: '...' }] }
    const status = result?.result?.[0]?.status;
    const statusMsg = result?.result?.[0]?.statusmsg || '';
    
    if (status !== 1) {
      return res.status(400).json({ 
        error: statusMsg || 'MOFH failed to unsuspend account',
      });
    }
    
    // Set to REACTIVATING, will change to ACTIVE via callback
    await prisma.hosting.update({
      where: { id: hosting.id },
      data: {
        status: 'REACTIVATING',
        suspendReason: null,
      },
    });
    
    res.json({ 
      success: true, 
      message: 'Unsuspend request sent successfully',
      status: 'REACTIVATING',
    });
  } catch (error) {
    console.error('Admin unsuspend error:', error);
    res.status(500).json({ error: 'Failed to unsuspend hosting account' });
  }
});

// Admin get file manager link
router.get('/hostings/:vpUsername/filemanager', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const vpUsername = req.params.vpUsername as string;
    const dir = (req.query.dir as string) || '/htdocs/';
    
    const hosting = await prisma.hosting.findFirst({
      where: { vpUsername },
    });

    if (!hosting) {
      return res.status(404).json({ error: 'Hosting account not found' });
    }

    if (hosting.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'Hosting account is not active' });
    }

    // XOR + Base64 encode password
    const FM_KEY = 'ERFgjowETHGj9wf';
    let out = '';
    for (let i = 0; i < hosting.password.length; i++) {
      out += String.fromCharCode(hosting.password.charCodeAt(i) ^ FM_KEY.charCodeAt(i % FM_KEY.length));
    }
    const encodedPassword = Buffer.from(out, 'binary').toString('base64');
    
    const u = encodeURIComponent(hosting.vpUsername);
    const p = encodeURIComponent(encodedPassword);
    const home = dir ? '&home=' + encodeURIComponent(dir) : '';
    const link = `https://filemanager.ai/new3/index.php?u=${u}&p=${p}${home}`;

    res.json({ link });
  } catch (error) {
    console.error('Admin get file manager link error:', error);
    res.status(500).json({ error: 'Failed to get file manager link' });
  }
});

export default router;
