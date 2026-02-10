import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import passport from 'passport';
import dotenv from 'dotenv';
import * as pathModule from 'path';
import * as fs from 'fs';

// Load environment variables
dotenv.config();

import { configurePassport } from './strategies/index.js';
import prisma from './lib/prisma.js';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import settingsRoutes from './routes/settings.js';
import userSettingsRoutes from './routes/user-settings.js';
import mofhRoutes from './routes/mofh.js';
import hostingRoutes from './routes/hosting.js';
import vistapanelRoutes from './routes/vistapanel.js';
import ticketRoutes from './routes/ticket.js';
import emailRoutes from './routes/email.js';
import notificationRoutes from './routes/notification.js';
import sslRoutes from './routes/ssl.js';
import backupRoutes from './routes/backup.js';
import setupRoutes from './routes/setup.js';
import installRoutes from './routes/install.js';
import landingPageRoutes from './routes/landing-page.js';
import knowledgebaseRoutes from './routes/knowledgebase.js';
import premiumPlansRoutes from './routes/premium-plans.js';
import cdnSearchRoutes from './routes/cdn-search.js';
import builderRoutes from './routes/builder.js';
import importRoutes from './routes/import.js';
import forumRoutes from './routes/forum.js';
import { initializeBackupScheduler } from './lib/backup/index.js';

const app = express();
const PORT = process.env.PORT || 3002;

// CORS configuration
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:8080',
  'http://localhost:8081',
  process.env.FRONTEND_URL,
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.text()); // For raw text bodies
app.use(cookieParser());

// Session configuration (required for Passport OAuth)
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Load OAuth settings from database and configure Passport
async function initializeOAuth() {
  try {
    const setting = await prisma.setting.findUnique({
      where: { key: 'oauth_config' },
    });

    if (setting) {
      const oauthConfig = JSON.parse(setting.value);
      
      // Set environment variables from database config
      if (oauthConfig.google?.enabled) {
        process.env.GOOGLE_CLIENT_ID = oauthConfig.google.clientId;
        process.env.GOOGLE_CLIENT_SECRET = oauthConfig.google.clientSecret;
      }
      if (oauthConfig.facebook?.enabled) {
        process.env.FACEBOOK_APP_ID = oauthConfig.facebook.clientId;
        process.env.FACEBOOK_APP_SECRET = oauthConfig.facebook.clientSecret;
      }
      if (oauthConfig.microsoft?.enabled) {
        process.env.MICROSOFT_CLIENT_ID = oauthConfig.microsoft.clientId;
        process.env.MICROSOFT_CLIENT_SECRET = oauthConfig.microsoft.clientSecret;
      }
      if (oauthConfig.discord?.enabled) {
        process.env.DISCORD_CLIENT_ID = oauthConfig.discord.clientId;
        process.env.DISCORD_CLIENT_SECRET = oauthConfig.discord.clientSecret;
      }
      if (oauthConfig.github?.enabled) {
        process.env.GITHUB_CLIENT_ID = oauthConfig.github.clientId;
        process.env.GITHUB_CLIENT_SECRET = oauthConfig.github.clientSecret;
      }
      
      console.log('✅ OAuth settings loaded from database');
    }
  } catch (error) {
    console.error('Failed to load OAuth settings from database:', error);
  }
  
  // Configure Passport strategies after loading settings
  configurePassport();
}

// Start the application
async function startServer() {
  // Initialize OAuth first (skip if database not configured)
  try {
    await initializeOAuth();
  } catch (error) {
    console.warn('⚠️ Could not initialize OAuth (database may not be configured yet)');
  }

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/settings', settingsRoutes);
  app.use('/api/user-settings', userSettingsRoutes);
  app.use('/api/mofh', mofhRoutes);
  app.use('/api/hosting', hostingRoutes);
  app.use('/api/vistapanel', vistapanelRoutes);
  app.use('/api/tickets', ticketRoutes);
  app.use('/api/email', emailRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/ssl', sslRoutes);
  app.use('/api/backup', backupRoutes);
  app.use('/api/setup', setupRoutes);
  app.use('/api/install', installRoutes);
  app.use('/api/landing-page', landingPageRoutes);
  app.use('/api/kb', knowledgebaseRoutes);
  app.use('/api/premium-plans', premiumPlansRoutes);
  app.use('/api/tools/cdn-search', cdnSearchRoutes);
  app.use('/api/builder', builderRoutes);
  app.use('/api/admin/import', importRoutes);
  app.use('/api/forum', forumRoutes);

  // SEO: Serve robots.txt and sitemap.xml dynamically (proxy to API handlers)
  app.get('/robots.txt', async (req, res) => {
    try {
      const setting = await prisma.setting.findUnique({ where: { key: 'seo_settings' } });
      let robotsTxt = 'User-agent: *\nAllow: /';
      if (setting?.value) {
        const settings = JSON.parse(setting.value);
        robotsTxt = settings.robotsTxt || robotsTxt;
      }
      const siteUrl = req.protocol + '://' + req.get('host');
      robotsTxt = robotsTxt.replace(/\{\{SITE_URL\}\}/g, siteUrl);
      res.type('text/plain').send(robotsTxt);
    } catch (error) {
      res.type('text/plain').send('User-agent: *\nAllow: /');
    }
  });
  app.get('/sitemap.xml', async (req, res) => {
    try {
      const seoSetting = await prisma.setting.findUnique({ where: { key: 'seo_settings' } });
      const defaultSettings = { sitemapEnabled: true, languages: { en: {} }, canonicalUrl: '', sitemapCustomUrls: '' };
      const seoSettings = seoSetting?.value ? { ...defaultSettings, ...JSON.parse(seoSetting.value) } : defaultSettings;

      if (!seoSettings.sitemapEnabled) {
        return res.status(404).send('Sitemap is disabled');
      }

      const siteUrl = seoSettings.canonicalUrl || (req.protocol + '://' + req.get('host'));
      const now = new Date().toISOString().split('T')[0];
      const languages = Object.keys(seoSettings.languages);

      const staticPages = [
        { loc: '/', priority: '1.0', changefreq: 'daily' },
        { loc: '/login', priority: '0.6', changefreq: 'monthly' },
        { loc: '/register', priority: '0.6', changefreq: 'monthly' },
        { loc: '/kb', priority: '0.8', changefreq: 'weekly' },
      ];

      const customUrls: { loc: string; priority: string; changefreq: string }[] = [];
      if (seoSettings.sitemapCustomUrls) {
        const lines = seoSettings.sitemapCustomUrls.split('\n').filter((l: string) => l.trim());
        for (const line of lines) {
          const parts = line.trim().split('|');
          customUrls.push({ loc: parts[0]?.trim() || '', priority: parts[1]?.trim() || '0.5', changefreq: parts[2]?.trim() || 'weekly' });
        }
      }

      let kbUrls: { loc: string; priority: string; changefreq: string }[] = [];
      try {
        const categories = await prisma.kBCategory.findMany({
          where: { isActive: true },
          include: { articles: { where: { isActive: true }, select: { slug: true } } },
        });
        for (const cat of categories) {
          kbUrls.push({ loc: `/kb/${cat.slug}`, priority: '0.7', changefreq: 'weekly' });
          for (const article of cat.articles) {
            kbUrls.push({ loc: `/kb/${cat.slug}/${article.slug}`, priority: '0.6', changefreq: 'weekly' });
          }
        }
      } catch (e) { /* KB tables may not exist */ }

      const allPages = [...staticPages, ...kbUrls, ...customUrls].filter(p => p.loc);

      let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n`;
      for (const page of allPages) {
        const fullUrl = page.loc.startsWith('http') ? page.loc : `${siteUrl}${page.loc}`;
        xml += `  <url>\n    <loc>${fullUrl}</loc>\n    <lastmod>${now}</lastmod>\n    <changefreq>${page.changefreq}</changefreq>\n    <priority>${page.priority}</priority>\n`;
        if (languages.length > 1) {
          for (const lang of languages) {
            xml += `    <xhtml:link rel="alternate" hreflang="${lang}" href="${fullUrl}?lang=${lang}" />\n`;
          }
          xml += `    <xhtml:link rel="alternate" hreflang="x-default" href="${fullUrl}" />\n`;
        }
        xml += `  </url>\n`;
      }
      xml += `</urlset>`;

      res.type('application/xml').send(xml);
    } catch (error) {
      res.status(500).type('text/plain').send('Error generating sitemap');
    }
  });

  // Generate static SEO files (robots.txt & sitemap.xml) into dist/ for Nginx
  const frontendDist = pathModule.resolve(process.cwd(), '..', 'dist');
  async function generateStaticSEOFiles() {
    if (!fs.existsSync(frontendDist)) return;
    try {
      // Generate robots.txt
      const seoSetting = await prisma.setting.findUnique({ where: { key: 'seo_settings' } });
      const defaultRobots = 'User-agent: *\nAllow: /';
      let robotsTxt = defaultRobots;
      const defaultSettings = { sitemapEnabled: true, languages: { en: {} }, canonicalUrl: '', sitemapCustomUrls: '', robotsTxt: defaultRobots };
      const seoSettings = seoSetting?.value ? { ...defaultSettings, ...JSON.parse(seoSetting.value) } : defaultSettings;

      robotsTxt = seoSettings.robotsTxt || defaultRobots;
      const siteUrl = seoSettings.canonicalUrl || process.env.FRONTEND_URL || 'https://demo.znode.app';
      robotsTxt = robotsTxt.replace(/\{\{SITE_URL\}\}/g, siteUrl);
      fs.writeFileSync(pathModule.join(frontendDist, 'robots.txt'), robotsTxt, 'utf-8');

      // Generate sitemap.xml
      if (seoSettings.sitemapEnabled) {
        const now = new Date().toISOString().split('T')[0];
        const languages = Object.keys(seoSettings.languages);
        const staticPages = [
          { loc: '/', priority: '1.0', changefreq: 'daily' },
          { loc: '/login', priority: '0.6', changefreq: 'monthly' },
          { loc: '/register', priority: '0.6', changefreq: 'monthly' },
          { loc: '/kb', priority: '0.8', changefreq: 'weekly' },
        ];

        const customUrls: { loc: string; priority: string; changefreq: string }[] = [];
        if (seoSettings.sitemapCustomUrls) {
          const lines = seoSettings.sitemapCustomUrls.split('\n').filter((l: string) => l.trim());
          for (const line of lines) {
            const parts = line.trim().split('|');
            customUrls.push({ loc: parts[0]?.trim() || '', priority: parts[1]?.trim() || '0.5', changefreq: parts[2]?.trim() || 'weekly' });
          }
        }

        let kbUrls: { loc: string; priority: string; changefreq: string }[] = [];
        try {
          const categories = await prisma.kBCategory.findMany({
            where: { isActive: true },
            include: { articles: { where: { isActive: true }, select: { slug: true } } },
          });
          for (const cat of categories) {
            kbUrls.push({ loc: `/kb/${cat.slug}`, priority: '0.7', changefreq: 'weekly' });
            for (const article of cat.articles) {
              kbUrls.push({ loc: `/kb/${cat.slug}/${article.slug}`, priority: '0.6', changefreq: 'weekly' });
            }
          }
        } catch (e) { /* KB tables may not exist */ }

        const allPages = [...staticPages, ...kbUrls, ...customUrls].filter(p => p.loc);
        let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n`;
        for (const page of allPages) {
          const fullUrl = page.loc.startsWith('http') ? page.loc : `${siteUrl}${page.loc}`;
          xml += `  <url>\n    <loc>${fullUrl}</loc>\n    <lastmod>${now}</lastmod>\n    <changefreq>${page.changefreq}</changefreq>\n    <priority>${page.priority}</priority>\n`;
          if (languages.length > 1) {
            for (const lang of languages) {
              xml += `    <xhtml:link rel="alternate" hreflang="${lang}" href="${fullUrl}?lang=${lang}" />\n`;
            }
            xml += `    <xhtml:link rel="alternate" hreflang="x-default" href="${fullUrl}" />\n`;
          }
          xml += `  </url>\n`;
        }
        xml += `</urlset>`;
        fs.writeFileSync(pathModule.join(frontendDist, 'sitemap.xml'), xml, 'utf-8');
      }

      console.log('🔍 SEO files generated (robots.txt, sitemap.xml)');
    } catch (error) {
      console.warn('⚠️ Could not generate static SEO files:', error);
    }
  }

  // Export for use in settings route when SEO settings are updated
  (app as any).generateStaticSEOFiles = generateStaticSEOFiles;

  // Initialize backup scheduler (skip if database not configured)
  try {
    await initializeBackupScheduler();
  } catch (error) {
    console.warn('⚠️ Could not initialize backup scheduler (database may not be configured yet)');
  }

  // Generate static SEO files on startup
  await generateStaticSEOFiles();

  // Serve frontend static files (SPA)
  if (fs.existsSync(frontendDist)) {
    app.use(express.static(frontendDist));
    // SPA fallback: serve index.html for non-API routes
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/') || req.path === '/health') {
        return next();
      }
      res.sendFile(pathModule.join(frontendDist, 'index.html'));
    });
    console.log(`📂 Serving frontend from ${frontendDist}`);
  }

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Error handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
      error: err.message || 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
  });

  // Start server
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  });
}

// Run the server
startServer();

export default app;
