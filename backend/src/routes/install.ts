import { Router, Response, Request } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import { execSync } from 'child_process';
import multer from 'multer';
import bcrypt from 'bcryptjs';

const router = Router();

// Path constants
const BACKEND_DIR = path.resolve(process.cwd());
const ENV_PATH = path.join(BACKEND_DIR, '.env');
const PRISMA_SCHEMA = path.join(BACKEND_DIR, 'prisma', 'schema.prisma');

// Multer for backup restore
const UPLOAD_DIR = path.join(BACKEND_DIR, '..', 'tmp', 'znode-restore');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}
const upload = multer({
  dest: UPLOAD_DIR,
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.originalname.endsWith('.zip') || file.originalname.endsWith('.sql.gz') || file.originalname.endsWith('.sql')) {
      cb(null, true);
    } else {
      cb(new Error('Only .zip, .sql.gz or .sql files are allowed'));
    }
  },
});

// Helper: check if system is already installed
async function isInstalled(): Promise<{ installed: boolean; reason: string }> {
  // Check 1: .env exists
  if (!fs.existsSync(ENV_PATH)) {
    return { installed: false, reason: 'no_env' };
  }

  // Check 2: DATABASE_URL is configured
  const envContent = fs.readFileSync(ENV_PATH, 'utf-8');
  const dbUrlMatch = envContent.match(/DATABASE_URL="?([^"\n]+)"?/);
  if (!dbUrlMatch || dbUrlMatch[1].includes('username:password')) {
    return { installed: false, reason: 'no_database' };
  }

  // Check 3: Can connect to database and admin exists
  try {
    const { PrismaClient } = await import('@prisma/client');
    const testPrisma = new PrismaClient({ datasources: { db: { url: dbUrlMatch[1] } } });
    try {
      const adminCount = await testPrisma.user.count({ where: { role: 'ADMIN' } });
      await testPrisma.$disconnect();
      if (adminCount === 0) {
        return { installed: false, reason: 'no_admin' };
      }
      return { installed: true, reason: 'ok' };
    } catch (e: any) {
      await testPrisma.$disconnect();
      // Table doesn't exist yet
      if (e.code === 'P2021' || e.message?.includes('does not exist')) {
        return { installed: false, reason: 'no_tables' };
      }
      return { installed: false, reason: 'db_error' };
    }
  } catch {
    return { installed: false, reason: 'prisma_error' };
  }
}

// GET /api/install/status - Check installation status
router.get('/status', async (req: Request, res: Response) => {
  try {
    const status = await isInstalled();
    const hasEnv = fs.existsSync(ENV_PATH);
    
    let envConfig: Record<string, string> = {};
    if (hasEnv) {
      const content = fs.readFileSync(ENV_PATH, 'utf-8');
      for (const line of content.split('\n')) {
        const match = line.match(/^([^#=]+)=["']?([^"'\n]*)["']?$/);
        if (match) envConfig[match[1].trim()] = match[2].trim();
      }
    }

    res.json({
      installed: status.installed,
      reason: status.reason,
      hasEnv,
      config: hasEnv ? {
        port: envConfig.PORT || '3002',
        hasDatabase: !!envConfig.DATABASE_URL && !envConfig.DATABASE_URL.includes('username:password'),
        frontendUrl: envConfig.FRONTEND_URL || '',
      } : null,
    });
  } catch (error: any) {
    console.error('[Install] Status check error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/install/test-database - Test database connection
router.post('/test-database', async (req: Request, res: Response) => {
  try {
    const { databaseUrl } = req.body;
    if (!databaseUrl) {
      return res.status(400).json({ error: 'Database URL is required' });
    }

    const { PrismaClient } = await import('@prisma/client');
    const testPrisma = new PrismaClient({
      datasources: { db: { url: databaseUrl } },
    });

    try {
      await testPrisma.$queryRaw`SELECT 1`;
      await testPrisma.$disconnect();
      res.json({ success: true, code: 'connection_success' });
    } catch (dbError: any) {
      await testPrisma.$disconnect();
      const rawMsg = dbError.message || 'Unknown error';
      let code = 'unknown_error';
      const meta: Record<string, string> = {};
      if (rawMsg.includes('ECONNREFUSED')) {
        code = 'connection_refused';
      } else if (rawMsg.includes('ENOTFOUND') || rawMsg.includes('getaddrinfo')) {
        code = 'host_not_found';
      } else if (rawMsg.includes('Access denied') || rawMsg.includes('Authentication failed')) {
        code = 'auth_failed';
      } else if (rawMsg.includes('Unknown database') || rawMsg.includes('does not exist')) {
        code = 'db_not_found';
        meta.dbName = rawMsg.match(/Unknown database '([^']+)'/)?.[1] || rawMsg.match(/database "([^"]+)"/)?.[1] || '';
      } else if (rawMsg.includes('ETIMEDOUT')) {
        code = 'connection_timeout';
      } else if (rawMsg.includes('Can\'t reach database') || rawMsg.includes('ECONNRESET')) {
        code = 'server_unreachable';
      } else if (rawMsg.includes('invalid URL') || rawMsg.includes('Invalid connection string')) {
        code = 'invalid_url';
      }
      res.json({ success: false, code, meta });
    }
  } catch (error: any) {
    res.json({ success: false, code: 'unknown_error' });
  }
});

// POST /api/install/setup - Full installation
router.post('/setup', async (req: Request, res: Response) => {
  try {
    // Block if already installed
    const status = await isInstalled();
    if (status.installed) {
      return res.status(403).json({ error: 'System is already installed' });
    }

    const {
      databaseUrl,
      frontendUrl,
      port,
      adminEmail,
      adminPassword,
      adminName,
      siteName,
      siteSlogan,
    } = req.body;

    // Validate required fields
    if (!databaseUrl || !adminEmail || !adminPassword) {
      return res.status(400).json({ error: 'Database URL, admin email and password are required' });
    }

    const jwtSecret = crypto.randomBytes(64).toString('hex');
    const sessionSecret = crypto.randomBytes(32).toString('hex');
    const finalPort = port || '3002';
    const finalFrontendUrl = frontendUrl || 'http://localhost:5173';

    // Step 1: Create/merge .env file
    console.log('[Install] Step 1: Creating .env file...');

    // Read existing .env to preserve values set by install.sh (PORT, API_URL, etc.)
    let existingEnv: Record<string, string> = {};
    if (fs.existsSync(ENV_PATH)) {
      const existingContent = fs.readFileSync(ENV_PATH, 'utf-8');
      for (const line of existingContent.split('\n')) {
        const match = line.match(/^([^#=]+)=["']?([^"'\n]*)["']?$/);
        if (match) existingEnv[match[1].trim()] = match[2].trim();
      }
      console.log('[Install] Existing .env found, merging values...');
    }

    // Use existing values as fallback (install.sh may have set PORT, FRONTEND_URL, API_URL)
    const mergedPort = existingEnv.PORT || finalPort;
    const mergedFrontendUrl = existingEnv.FRONTEND_URL || finalFrontendUrl;
    const mergedApiUrl = existingEnv.API_URL || existingEnv.FRONTEND_URL || finalFrontendUrl;

    const envContent = [
      '# Server',
      `PORT=${mergedPort}`,
      'NODE_ENV=production',
      '',
      '# Database (MariaDB/MySQL)',
      `DATABASE_URL="${databaseUrl}"`,
      '',
      '# JWT',
      `JWT_SECRET="${jwtSecret}"`,
      'JWT_EXPIRES_IN="7d"',
      '',
      '# Session',
      `SESSION_SECRET="${sessionSecret}"`,
      '',
      '# Frontend URL (for CORS and redirects)',
      `FRONTEND_URL="${mergedFrontendUrl}"`,
      `API_URL="${mergedApiUrl}"`,
    ].join('\n');

    fs.writeFileSync(ENV_PATH, envContent, 'utf-8');
    console.log('[Install] .env file created');

    // Reload env vars
    process.env.DATABASE_URL = databaseUrl;
    process.env.JWT_SECRET = jwtSecret;
    process.env.SESSION_SECRET = sessionSecret;
    process.env.PORT = mergedPort;
    process.env.FRONTEND_URL = mergedFrontendUrl;
    process.env.API_URL = mergedApiUrl;

    // Step 2: Run Prisma migrations
    console.log('[Install] Step 2: Running database migrations...');
    try {
      execSync('npx prisma db push --accept-data-loss', {
        cwd: BACKEND_DIR,
        env: { ...process.env, DATABASE_URL: databaseUrl },
        stdio: 'pipe',
        timeout: 60000,
      });
      console.log('[Install] Database schema pushed');
    } catch (dbError: any) {
      console.error('[Install] Prisma push failed:', dbError.stderr?.toString());
      // Try generate first then push
      try {
        execSync('npx prisma generate', {
          cwd: BACKEND_DIR,
          env: { ...process.env, DATABASE_URL: databaseUrl },
          stdio: 'pipe',
          timeout: 60000,
        });
        execSync('npx prisma db push --accept-data-loss', {
          cwd: BACKEND_DIR,
          env: { ...process.env, DATABASE_URL: databaseUrl },
          stdio: 'pipe',
          timeout: 60000,
        });
      } catch (retryError: any) {
        throw new Error(`Database migration failed: ${retryError.stderr?.toString() || retryError.message}`);
      }
    }

    // Step 3: Create admin user with fresh Prisma connection
    console.log('[Install] Step 3: Creating admin account...');
    const { PrismaClient } = await import('@prisma/client');
    const installPrisma = new PrismaClient({
      datasources: { db: { url: databaseUrl } },
    });

    try {
      const hashedPassword = await bcrypt.hash(adminPassword, 12);
      await installPrisma.user.create({
        data: {
          email: adminEmail,
          password: hashedPassword,
          name: adminName || 'Admin',
          role: 'ADMIN',
          emailVerified: new Date(),
        },
      });
      console.log('[Install] Admin account created');

      // Step 4: Seed default data
      console.log('[Install] Step 4: Seeding default data...');

      // 4a: General settings
      const generalSettings = {
        siteName: siteName || 'ZNode',
        siteSlogan: siteSlogan || 'Free Web Hosting',
        siteLogo: '',
        siteFavicon: '',
        emailVerificationEnabled: true,
        maintenanceMode: false,
        maintenanceMessage: 'We are currently performing scheduled maintenance. Please check back shortly.',
        maintenanceAllowedIPs: '',
        turnstileEnabled: false,
        turnstileSiteKey: '',
        turnstileSecretKey: '',
        turnstileServices: {
          emailVerify: true,
          createHosting: false,
          register: false,
          login: false,
          forgotPassword: false,
          contactForm: false,
          ticketCreate: false,
        },
      };
      await installPrisma.setting.upsert({
        where: { key: 'general_settings' },
        update: { value: JSON.stringify(generalSettings) },
        create: { key: 'general_settings', value: JSON.stringify(generalSettings) },
      });

      // 4b: SEO settings
      const seoSettings = {
        languages: {
          en: {
            title: `${siteName || 'ZNode'} - ${siteSlogan || 'Free Web Hosting'}`,
            description: `Get free web hosting with ${siteName || 'ZNode'}. Fast, reliable, and completely free hosting service with cPanel, SSL, and 24/7 support.`,
            ogTitle: `${siteName || 'ZNode'} - ${siteSlogan || 'Free Web Hosting'}`,
            ogDescription: `Free web hosting service with cPanel, SSL certificates, and 24/7 support.`,
            ogImage: '',
          },
        },
        robotsTxt: `User-agent: Googlebot\nAllow: /\n\nUser-agent: Bingbot\nAllow: /\n\nUser-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /api/\nDisallow: /user/\n\nSitemap: ${finalFrontendUrl}/sitemap.xml`,
        sitemapEnabled: true,
        sitemapCustomUrls: '',
        canonicalUrl: finalFrontendUrl,
      };
      await installPrisma.setting.upsert({
        where: { key: 'seo_settings' },
        update: { value: JSON.stringify(seoSettings) },
        create: { key: 'seo_settings', value: JSON.stringify(seoSettings) },
      });

      // 4c: Email templates
      const emailTemplates: { code: string; name: string; subject: string; body: string; type: 'SYSTEM' | 'CUSTOM'; isActive: boolean }[] = [
        {
          code: 'HOSTING_CREATED',
          name: 'Hosting Account Created',
          subject: 'Your hosting account has been created',
          body: '<h2>Hello {{name}},</h2><p>Your hosting account has been created successfully!</p><p><strong>Domain:</strong> {{domain}}<br/><strong>Username:</strong> {{username}}<br/><strong>Password:</strong> {{password}}</p><p>You can access your cPanel at: <a href="{{cpanelUrl}}">{{cpanelUrl}}</a></p>',
          type: 'SYSTEM',
          isActive: true,
        },
        {
          code: 'HOSTING_ACTIVATED',
          name: 'Hosting Account Activated',
          subject: 'Your hosting account is now active',
          body: '<h2>Hello {{name}},</h2><p>Your hosting account <strong>{{domain}}</strong> has been activated and is now ready to use!</p>',
          type: 'SYSTEM',
          isActive: true,
        },
        {
          code: 'HOSTING_SUSPENDED',
          name: 'Hosting Account Suspended',
          subject: 'Your hosting account has been suspended',
          body: '<h2>Hello {{name}},</h2><p>Your hosting account <strong>{{domain}}</strong> has been suspended.</p><p><strong>Reason:</strong> {{reason}}</p>',
          type: 'SYSTEM',
          isActive: true,
        },
        {
          code: 'HOSTING_REACTIVATED',
          name: 'Hosting Account Reactivated',
          subject: 'Your hosting account has been reactivated',
          body: '<h2>Hello {{name}},</h2><p>Your hosting account <strong>{{domain}}</strong> has been reactivated and is ready to use again!</p>',
          type: 'SYSTEM',
          isActive: true,
        },
        {
          code: 'PASSWORD_CHANGED',
          name: 'Hosting Password Changed',
          subject: 'Your hosting password has been changed',
          body: '<h2>Hello {{name}},</h2><p>The password for your hosting account <strong>{{domain}}</strong> has been changed successfully.</p><p><strong>New Password:</strong> {{password}}</p>',
          type: 'SYSTEM',
          isActive: true,
        },
        {
          code: 'TICKET_REPLY',
          name: 'Support Ticket Reply',
          subject: 'New reply to your support ticket #{{ticketId}}',
          body: '<h2>Hello {{name}},</h2><p>There is a new reply to your support ticket <strong>#{{ticketId}}: {{ticketSubject}}</strong></p><div style="background:#f5f5f5;padding:16px;border-radius:8px;margin:16px 0">{{replyContent}}</div><p><a href="{{ticketUrl}}">View Ticket</a></p>',
          type: 'SYSTEM',
          isActive: true,
        },
        {
          code: 'WELCOME',
          name: 'Welcome Email',
          subject: 'Welcome to {{siteName}}!',
          body: '<h2>Welcome {{name}}!</h2><p>Thank you for joining <strong>{{siteName}}</strong>. Your account has been created successfully.</p><p><a href="{{dashboardUrl}}">Go to Dashboard</a></p>',
          type: 'SYSTEM',
          isActive: true,
        },
        {
          code: 'PASSWORD_RESET',
          name: 'Password Reset',
          subject: 'Reset your password',
          body: '<h2>Hello {{name}},</h2><p>We received a request to reset your password. Click the button below to set a new password:</p><p><a href="{{resetLink}}" style="display:inline-block;background:#3b82f6;color:white;padding:12px 24px;border-radius:8px;text-decoration:none">Reset Password</a></p><p>This link expires in 1 hour. If you did not request this, please ignore this email.</p>',
          type: 'SYSTEM',
          isActive: true,
        },
        {
          code: 'EMAIL_VERIFICATION',
          name: 'Email Verification',
          subject: 'Verify your email address',
          body: '<h2>Hello {{name}},</h2><p>Please verify your email address using the OTP code below:</p><div style="text-align:center;margin:24px 0"><span style="font-size:32px;font-weight:bold;letter-spacing:8px;background:#f0f0f0;padding:16px 32px;border-radius:8px;display:inline-block">{{otp}}</span></div><p>Or click: <a href="{{verifyLink}}">Verify Email</a></p><p>This code expires in 30 minutes.</p>',
          type: 'SYSTEM',
          isActive: true,
        },
        {
          code: 'DATA_IMPORT_CREDENTIALS',
          name: 'Data Import - New Credentials',
          subject: 'Your account has been migrated to {{siteName}}',
          body: '<h2>Your Account Has Been Migrated</h2><p>Hello {{name}},</p><p>We have migrated our hosting platform to a new system. Your account data has been transferred successfully.</p><p>Please use the following credentials to log in:</p><div style="background:#f3f4f6;padding:15px;border-radius:8px;margin:20px 0"><p><strong>Email:</strong> {{email}}</p><p><strong>New Password:</strong> {{password}}</p></div><p><a href="{{loginUrl}}" style="display:inline-block;background:#2563eb;color:white;padding:12px 24px;border-radius:8px;text-decoration:none">Login Now</a></p><p style="color:#e11d48;font-weight:bold">⚠️ Please change your password after your first login.</p>',
          type: 'SYSTEM',
          isActive: true,
        },
      ];

      for (const template of emailTemplates) {
        const exists = await installPrisma.emailTemplate.findUnique({
          where: { code: template.code },
        });
        if (!exists) {
          await installPrisma.emailTemplate.create({ data: template });
        }
      }

      // 4d: Seed KB categories + articles from JSON data file
      const kbSeedPath = path.join(BACKEND_DIR, 'src', 'data', 'kb-seed.json');
      if (fs.existsSync(kbSeedPath)) {
        try {
          const kbData = JSON.parse(fs.readFileSync(kbSeedPath, 'utf-8'));
          const categoryIdMap: Record<string, string> = {};

          // Seed categories
          for (const cat of kbData.categories || []) {
            const exists = await installPrisma.kBCategory.findFirst({ where: { slug: cat.slug } });
            if (!exists) {
              const created = await installPrisma.kBCategory.create({
                data: {
                  name: cat.name,
                  slug: cat.slug,
                  description: cat.description || '',
                  icon: cat.icon || 'folder',
                  order: cat.order ?? 0,
                  isActive: cat.isActive ?? true,
                  translations: cat.translations || {},
                },
              });
              categoryIdMap[cat.slug] = created.id;
            } else {
              categoryIdMap[cat.slug] = exists.id;
            }
          }

          // Seed articles
          for (const art of kbData.articles || []) {
            const categoryId = categoryIdMap[art.categorySlug];
            if (!categoryId) continue;
            const exists = await installPrisma.kBArticle.findFirst({ where: { slug: art.slug } });
            if (!exists) {
              await installPrisma.kBArticle.create({
                data: {
                  title: art.title,
                  slug: art.slug,
                  content: art.content || '',
                  categoryId,
                  order: art.order ?? 0,
                  isActive: art.isActive ?? true,
                  translations: art.translations || {},
                },
              });
            }
          }
          console.log(`[Install] Seeded ${kbData.categories?.length || 0} KB categories, ${kbData.articles?.length || 0} articles`);
        } catch (kbError: any) {
          console.error('[Install] KB seed error (non-fatal):', kbError.message);
        }
      } else {
        console.log('[Install] No KB seed data found, skipping');
      }

      // 4e: Default landing page
      const defaultLandingHtml = `<body><section class="hero-section" style="background:linear-gradient(135deg,#1e3a5f 0%,#0f172a 100%);padding:80px 20px;text-align:center;min-height:60vh;display:flex;align-items:center;justify-content:center"><div style="max-width:800px;margin:0 auto"><h1 style="color:#fff;font-size:48px;font-weight:800;margin-bottom:16px">Free Web Hosting Made Simple</h1><p style="color:rgba(255,255,255,0.8);font-size:20px;margin-bottom:32px">Get your website online in minutes with our free hosting service. No credit card required.</p><div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap"><a href="/register" style="background:#3b82f6;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px">Get Started Free</a><a href="#features" style="background:rgba(255,255,255,0.1);color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;border:1px solid rgba(255,255,255,0.2)">Learn More</a></div></div></section><section id="features" style="padding:80px 20px;background:#f8fafc"><div style="max-width:1000px;margin:0 auto;text-align:center"><h2 style="font-size:36px;font-weight:700;margin-bottom:48px;color:#1e293b">Why Choose Us?</h2><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:24px"><div style="background:#fff;padding:32px;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.1)"><h3 style="font-size:20px;font-weight:600;margin-bottom:8px;color:#1e293b">Fast & Reliable</h3><p style="color:#64748b">High-performance servers with 99.9% uptime guarantee</p></div><div style="background:#fff;padding:32px;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.1)"><h3 style="font-size:20px;font-weight:600;margin-bottom:8px;color:#1e293b">Free SSL</h3><p style="color:#64748b">Free SSL certificates for all your domains</p></div><div style="background:#fff;padding:32px;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.1)"><h3 style="font-size:20px;font-weight:600;margin-bottom:8px;color:#1e293b">100% Free</h3><p style="color:#64748b">No hidden costs, no credit card required</p></div></div></div></section><section style="padding:80px 20px;background:linear-gradient(135deg,#3b82f6 0%,#1d4ed8 100%);text-align:center"><div style="max-width:600px;margin:0 auto"><h2 style="font-size:36px;font-weight:700;color:#fff;margin-bottom:16px">Ready to Get Started?</h2><p style="color:rgba(255,255,255,0.9);font-size:18px;margin-bottom:32px">Join thousands of users who trust us for their web hosting needs.</p><a href="/register" style="background:#fff;color:#3b82f6;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;display:inline-block">Create Free Account</a></div></section></body>`;

      const defaultLandingCss = `* { margin: 0; padding: 0; box-sizing: border-box; } body { font-family: 'Inter', -apple-system, sans-serif; }`;

      await installPrisma.landingPage.upsert({
        where: { locale: 'en' },
        update: {},
        create: {
          locale: 'en',
          html: defaultLandingHtml,
          css: defaultLandingCss,
          projectData: { assets: [], styles: [], pages: [{ component: defaultLandingHtml }] },
          isActive: false,
        },
      });

      // Landing page disabled by default - admin enables manually
      await installPrisma.setting.upsert({
        where: { key: 'LANDING_PAGE_ENABLED' },
        update: {},
        create: { key: 'LANDING_PAGE_ENABLED', value: 'false' },
      });

      console.log('[Install] Default data seeded');

      await installPrisma.$disconnect();
    } catch (seedError: any) {
      await installPrisma.$disconnect();
      throw seedError;
    }

    console.log('[Install] Installation completed successfully');
    res.json({
      success: true,
      message: 'Installation completed successfully',
      needsRestart: true,
    });

    // Schedule server restart so PM2 auto-restarts with new .env
    setTimeout(() => {
      console.log('[Install] Restarting server to apply new configuration...');
      process.exit(0);
    }, 1500);
  } catch (error: any) {
    console.error('[Install] Setup error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/install/restore - Restore from backup during install
router.post('/restore', upload.single('backup'), async (req: Request, res: Response) => {
  try {
    // Must have .env and database configured first
    if (!fs.existsSync(ENV_PATH)) {
      if (req.file) try { fs.unlinkSync(req.file.path); } catch (e) {}
      return res.status(400).json({ error: 'Please complete environment setup first (Step 1)' });
    }

    // Check no admin exists
    const status = await isInstalled();
    if (status.installed) {
      if (req.file) try { fs.unlinkSync(req.file.path); } catch (e) {}
      return res.status(403).json({ error: 'System is already installed' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No backup file uploaded' });
    }

    console.log('[Install Restore] Received file:', req.file.originalname, 'size:', req.file.size);

    let fileToRestore: string;
    const originalName = req.file.originalname;

    if (originalName.endsWith('.zip')) {
      console.log('[Install Restore] Extracting .zip file...');
      const extractDir = path.join(UPLOAD_DIR, `extract_${Date.now()}`);
      if (!fs.existsSync(extractDir)) {
        fs.mkdirSync(extractDir, { recursive: true });
      }
      try {
        execSync(`unzip -q "${req.file.path}" -d "${extractDir}"`);
      } catch (error: any) {
        throw new Error(`Failed to extract .zip file: ${error.message}`);
      }
      const sqlPath = path.join(extractDir, 'database.sql');
      if (!fs.existsSync(sqlPath)) {
        throw new Error('No database.sql found in backup .zip file');
      }
      fileToRestore = sqlPath;
      try { fs.unlinkSync(req.file.path); } catch (e) {}
    } else {
      const newPath = req.file.path + (originalName.endsWith('.gz') ? '.sql.gz' : '.sql');
      fs.renameSync(req.file.path, newPath);
      fileToRestore = newPath;
    }

    console.log('[Install Restore] Starting restore...');

    // Parse DATABASE_URL to get mysql credentials
    const dbUrl = process.env.DATABASE_URL || '';
    const dbMatch = dbUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
    if (!dbMatch) {
      throw new Error('Invalid DATABASE_URL. Please check your database configuration.');
    }
    const db = {
      user: dbMatch[1],
      password: dbMatch[2],
      host: dbMatch[3],
      port: dbMatch[4],
      database: dbMatch[5].split('?')[0],
    };

    // Import SQL directly into database (no need for prisma tables)
    try {
      execSync(
        `mysql -h ${db.host} -P ${db.port} -u ${db.user} -p'${db.password}' ${db.database} < "${fileToRestore}"`,
        { stdio: 'pipe', timeout: 120000 }
      );
      console.log('[Install Restore] Database imported successfully');
    } catch (importError: any) {
      throw new Error(`Database import failed: ${importError.stderr?.toString() || importError.message}`);
    }

    try { fs.unlinkSync(fileToRestore); } catch (e) {}

    console.log('[Install Restore] Restore completed');
    res.json({ success: true, needsRestart: true });

    // Schedule server restart so PM2 auto-restarts with new .env
    setTimeout(() => {
      console.log('[Install] Restarting server after restore...');
      process.exit(0);
    }, 1500);
  } catch (error: any) {
    console.error('[Install Restore] Error:', error);
    if (req.file) try { fs.unlinkSync(req.file.path); } catch (e) {}
    res.status(500).json({ error: error.message });
  }
});

// POST /api/install/save-env - Save just the .env file (for restore flow)
router.post('/save-env', async (req: Request, res: Response) => {
  try {
    const status = await isInstalled();
    if (status.installed) {
      return res.status(403).json({ error: 'System is already installed' });
    }

    const { databaseUrl, frontendUrl, port } = req.body;
    if (!databaseUrl) {
      return res.status(400).json({ error: 'Database URL is required' });
    }

    const jwtSecret = crypto.randomBytes(64).toString('hex');
    const sessionSecret = crypto.randomBytes(32).toString('hex');

    // Read existing .env to preserve values set by install.sh
    let existingEnv: Record<string, string> = {};
    if (fs.existsSync(ENV_PATH)) {
      const existingContent = fs.readFileSync(ENV_PATH, 'utf-8');
      for (const line of existingContent.split('\n')) {
        const match = line.match(/^([^#=]+)=["']?([^"'\n]*)["']?$/);
        if (match) existingEnv[match[1].trim()] = match[2].trim();
      }
    }

    const mergedPort = existingEnv.PORT || port || '3002';
    const mergedFrontendUrl = existingEnv.FRONTEND_URL || frontendUrl || 'http://localhost:5173';
    const mergedApiUrl = existingEnv.API_URL || existingEnv.FRONTEND_URL || frontendUrl || 'http://localhost:5173';

    const envContent = [
      '# Server',
      `PORT=${mergedPort}`,
      'NODE_ENV=production',
      '',
      '# Database (MariaDB/MySQL)',
      `DATABASE_URL="${databaseUrl}"`,
      '',
      '# JWT',
      `JWT_SECRET="${jwtSecret}"`,
      'JWT_EXPIRES_IN="7d"',
      '',
      '# Session',
      `SESSION_SECRET="${sessionSecret}"`,
      '',
      '# Frontend URL (for CORS and redirects)',
      `FRONTEND_URL="${mergedFrontendUrl}"`,
      `API_URL="${mergedApiUrl}"`,
    ].join('\n');

    fs.writeFileSync(ENV_PATH, envContent, 'utf-8');

    // Update process env
    process.env.DATABASE_URL = databaseUrl;
    process.env.JWT_SECRET = jwtSecret;
    process.env.SESSION_SECRET = sessionSecret;
    process.env.PORT = mergedPort;
    process.env.FRONTEND_URL = mergedFrontendUrl;
    process.env.API_URL = mergedApiUrl;

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
