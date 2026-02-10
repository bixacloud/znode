import { Router, Request, Response } from 'express';
import { adminMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { sendTemplateEmail } from '../lib/email.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();
const BACKEND_DIR = path.resolve(process.cwd());
const UPLOAD_DIR = path.join(BACKEND_DIR, '..', 'tmp', 'import');

// Ensure upload directory
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const upload = multer({
  dest: UPLOAD_DIR,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (_req, file, cb) => {
    if (file.originalname.endsWith('.sql')) {
      cb(null, true);
    } else {
      cb(new Error('Only .sql files are allowed'));
    }
  },
});

// ─── SQL Parser ─────────────────────────────────────────────────────────────

interface ParsedData {
  users: { key: string; name: string; email: string; status: string; date: number }[];
  admins: { key: string; name: string; email: string; status: string; date: number }[];
  accounts: { forKey: string; label: string; username: string; password: string; domain: string; status: string; key: string; main: string; sql: string; time: number }[];
  tickets: { id: number; key: string; forKey: string; subject: string; content: string; status: string; time: number }[];
  replies: { forKey: string; byKey: string; content: string; time: number }[];
  ssl: { forKey: string; domain: string; type: string; status: string; pid: string; dnsid: string; dns: string; privateKey: string }[];
  settings: {
    mofh: { username: string; password: string; package: string; cpanel: string } | null;
    smtp: { hostname: string; username: string; password: string; from: string; name: string; port: number; encryption: string; status: string } | null;
    domains: string[];
    oauth: Record<string, unknown> | null;
  };
}

function parseSQLDump(sql: string): ParsedData {
  const result: ParsedData = {
    users: [],
    admins: [],
    accounts: [],
    tickets: [],
    replies: [],
    ssl: [],
    settings: { mofh: null, smtp: null, domains: [], oauth: null },
  };

  // Extract INSERT statements
  const insertRegex = /INSERT\s+INTO\s+`?(\w+)`?\s*(?:\([^)]*\)\s*)?VALUES\s*([\s\S]*?);\s*$/gmi;
  let match;

  while ((match = insertRegex.exec(sql)) !== null) {
    const table = match[1].toLowerCase();
    const valuesStr = match[2];

    // Parse multiple value groups: (...), (...)
    const rows = parseValueGroups(valuesStr);

    for (const row of rows) {
      switch (table) {
        case 'is_user':
          if (row.length >= 6) {
            result.users.push({
              key: clean(row[1]),    // user_key
              name: clean(row[2]),   // user_name
              email: clean(row[3]),  // user_email
              status: clean(row[5]), // user_status
              date: parseInt(clean(row[6])) || Math.floor(Date.now() / 1000),
            });
          }
          break;

        case 'is_admin':
          if (row.length >= 6) {
            result.admins.push({
              key: clean(row[1]),
              name: clean(row[2]),
              email: clean(row[3]),
              status: clean(row[5]),
              date: parseInt(clean(row[6])) || Math.floor(Date.now() / 1000),
            });
          }
          break;

        case 'is_account':
          if (row.length >= 9) {
            result.accounts.push({
              forKey: clean(row[1]),    // account_for -> user_key
              label: clean(row[2]),     // account_label
              username: clean(row[3]),  // account_username
              password: clean(row[4]), // account_password
              domain: clean(row[5]),   // account_domain
              status: clean(row[6]),   // account_status
              key: clean(row[7]),      // account_key (MOFH key)
              main: clean(row[8]),     // account_main
              sql: clean(row[9] || ''), // account_sql
              time: parseInt(clean(row[10] || '')) || Math.floor(Date.now() / 1000),
            });
          }
          break;

        case 'is_ticket':
          if (row.length >= 6) {
            result.tickets.push({
              id: parseInt(clean(row[0])) || 0,
              key: clean(row[1]),
              forKey: clean(row[2]),
              subject: clean(row[3]),
              content: clean(row[4]),
              status: clean(row[5]),
              time: parseInt(clean(row[6])) || Math.floor(Date.now() / 1000),
            });
          }
          break;

        case 'is_reply':
          if (row.length >= 4) {
            result.replies.push({
              forKey: clean(row[1]),   // reply_for -> ticket_key
              byKey: clean(row[2]),    // reply_by
              content: clean(row[3]),  // reply_content
              time: parseInt(clean(row[4])) || Math.floor(Date.now() / 1000),
            });
          }
          break;

        case 'is_ssl':
          if (row.length >= 7) {
            result.ssl.push({
              forKey: clean(row[1]),
              domain: clean(row[2]),
              type: clean(row[3]),
              status: clean(row[4]),
              pid: clean(row[5]),
              dnsid: clean(row[6]),
              dns: clean(row[7] || ''),
              privateKey: clean(row[8] || ''),
            });
          }
          break;

        case 'is_mofh':
          if (row.length >= 4) {
            result.settings.mofh = {
              username: clean(row[1]),
              password: clean(row[2]),
              package: clean(row[3]),
              cpanel: clean(row[4] || ''),
            };
          }
          break;

        case 'is_smtp':
          if (row.length >= 7) {
            result.settings.smtp = {
              hostname: clean(row[1]),
              username: clean(row[2]),
              password: clean(row[3]),
              from: clean(row[4]),
              name: clean(row[5]),
              port: parseInt(clean(row[6])) || 587,
              encryption: clean(row[7] || 'tls'),
              status: clean(row[8] || 'active'),
            };
          }
          break;

        case 'is_domain':
          if (row.length >= 2) {
            result.settings.domains.push(clean(row[1]));
          }
          break;

        case 'is_oauth':
          // OAuth settings vary, store raw
          if (row.length >= 2) {
            result.settings.oauth = result.settings.oauth || {};
          }
          break;
      }
    }
  }

  return result;
}

function parseValueGroups(valuesStr: string): string[][] {
  const groups: string[][] = [];
  let depth = 0;
  let current = '';
  let inString = false;
  let escapeNext = false;
  let stringChar = '';

  for (let i = 0; i < valuesStr.length; i++) {
    const ch = valuesStr[i];

    if (escapeNext) {
      current += ch;
      escapeNext = false;
      continue;
    }

    if (ch === '\\') {
      current += ch;
      escapeNext = true;
      continue;
    }

    if (inString) {
      current += ch;
      if (ch === stringChar) {
        inString = false;
      }
      continue;
    }

    if (ch === '\'' || ch === '"') {
      inString = true;
      stringChar = ch;
      current += ch;
      continue;
    }

    if (ch === '(') {
      if (depth === 0) {
        current = '';
      } else {
        current += ch;
      }
      depth++;
      continue;
    }

    if (ch === ')') {
      depth--;
      if (depth === 0) {
        groups.push(splitValues(current));
      } else {
        current += ch;
      }
      continue;
    }

    if (depth > 0) {
      current += ch;
    }
  }

  return groups;
}

function splitValues(str: string): string[] {
  const values: string[] = [];
  let current = '';
  let inString = false;
  let escapeNext = false;
  let stringChar = '';

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];

    if (escapeNext) {
      current += ch;
      escapeNext = false;
      continue;
    }

    if (ch === '\\') {
      escapeNext = true;
      continue; // Skip the backslash in output
    }

    if (inString) {
      if (ch === stringChar) {
        inString = false;
      } else {
        current += ch;
      }
      continue;
    }

    if (ch === '\'' || ch === '"') {
      inString = true;
      stringChar = ch;
      continue;
    }

    if (ch === ',') {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += ch;
  }

  values.push(current.trim());
  return values;
}

function clean(val: string): string {
  if (!val) return '';
  // Remove surrounding quotes
  val = val.trim();
  if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
    val = val.slice(1, -1);
  }
  if (val === 'NULL' || val === 'null') return '';
  return val.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\r/g, '\r');
}

function generatePassword(length = 12): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  let password = '';
  const randomBytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    password += chars[randomBytes[i] % chars.length];
  }
  return password;
}

function mapHostingStatus(oldStatus: string): 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'DELETED' {
  switch (oldStatus?.toLowerCase()) {
    case 'active': return 'ACTIVE';
    case 'pending': return 'PENDING';
    case 'suspended': return 'SUSPENDED';
    case 'deactivated': return 'SUSPENDED';
    case 'x': return 'DELETED';
    default: return 'PENDING';
  }
}

function mapTicketStatus(oldStatus: string): 'OPEN' | 'REPLIED' | 'CLOSED' {
  switch (oldStatus?.toLowerCase()) {
    case 'open':
    case 'customer': return 'OPEN';
    case 'answered':
    case 'admin': return 'REPLIED';
    case 'closed': return 'CLOSED';
    default: return 'OPEN';
  }
}

// ─── Routes ──────────────────────────────────────────────────────────────────

// GET /api/admin/import/status - Check if import has been done & popup state
router.get('/status', adminMiddleware, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const importDone = await prisma.setting.findUnique({ where: { key: 'data_import_completed' } });
    const popupDismissed = await prisma.setting.findUnique({ where: { key: 'data_import_popup_dismissed' } });
    const installMode = await prisma.setting.findUnique({ where: { key: 'install_mode' } });

    res.json({
      importCompleted: importDone?.value === 'true',
      popupDismissed: popupDismissed?.value === 'true',
      installMode: installMode?.value || 'fresh', // 'fresh' or 'backup'
      showPopup: !importDone && !popupDismissed && installMode?.value !== 'backup',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/import/dismiss-popup - Dismiss the import suggestion popup
router.post('/dismiss-popup', adminMiddleware, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    await prisma.setting.upsert({
      where: { key: 'data_import_popup_dismissed' },
      update: { value: 'true' },
      create: { key: 'data_import_popup_dismissed', value: 'true' },
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/import/parse - Upload & parse SQL file, return preview
router.post('/parse', adminMiddleware, upload.single('sqlFile'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No SQL file uploaded' });
    }

    const sqlContent = fs.readFileSync(req.file.path, 'utf-8');
    const parsed = parseSQLDump(sqlContent);

    // Don't delete file yet — keep for execute step
    // Store the parsed file path in a temp location
    const sessionId = crypto.randomBytes(16).toString('hex');
    const sessionPath = path.join(UPLOAD_DIR, `${sessionId}.sql`);
    fs.renameSync(req.file.path, sessionPath);

    // Check for admin email conflicts
    const currentAdmin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    const conflictingAdmins = parsed.admins.filter(
      (a) => currentAdmin && a.email.toLowerCase() === currentAdmin.email.toLowerCase()
    );

    res.json({
      sessionId,
      preview: {
        users: parsed.users.length,
        admins: parsed.admins.length,
        adminConflicts: conflictingAdmins.length,
        adminConflictEmails: conflictingAdmins.map((a) => a.email),
        accounts: parsed.accounts.length,
        tickets: parsed.tickets.length,
        replies: parsed.replies.length,
        ssl: parsed.ssl.length,
        settings: {
          hasMofh: !!parsed.settings.mofh,
          hasSmtp: !!parsed.settings.smtp,
          domainsCount: parsed.settings.domains.length,
          domains: parsed.settings.domains,
        },
      },
      sampleUsers: parsed.users.slice(0, 10).map((u) => ({
        email: u.email,
        name: u.name,
      })),
      sampleAccounts: parsed.accounts.slice(0, 10).map((a) => ({
        username: a.username,
        domain: a.domain,
        status: a.status,
      })),
    });
  } catch (error: any) {
    if (req.file) try { fs.unlinkSync(req.file.path); } catch (e) {}
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/import/execute - Execute the import
router.post('/execute', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { sessionId, passwordMode, uniformPassword, importSettings, sendEmails } = req.body;
    // passwordMode: 'uniform' | 'random'
    // uniformPassword: string (if mode is 'uniform')
    // importSettings: boolean (import MOFH/SMTP/Domain settings)
    // sendEmails: boolean (send credential emails to users)

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    const sessionPath = path.join(UPLOAD_DIR, `${sessionId}.sql`);
    if (!fs.existsSync(sessionPath)) {
      return res.status(400).json({ error: 'Session expired. Please upload the SQL file again.' });
    }

    const sqlContent = fs.readFileSync(sessionPath, 'utf-8');
    const parsed = parseSQLDump(sqlContent);

    // Get current admin to check conflicts
    const currentAdmin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });

    // Get site settings for email
    const siteNameSetting = await prisma.setting.findUnique({ where: { key: 'general_settings' } });
    const siteName = siteNameSetting ? JSON.parse(siteNameSetting.value).siteName || 'ZNode' : 'ZNode';
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    const results = {
      usersImported: 0,
      usersSkipped: 0,
      adminsImported: 0,
      adminsSkipped: 0,
      accountsImported: 0,
      accountsSkipped: 0,
      ticketsImported: 0,
      repliesImported: 0,
      sslImported: 0,
      settingsImported: [] as string[],
      emailsSent: 0,
      emailsFailed: 0,
      errors: [] as string[],
    };

    // Map old user_key -> new user ID
    const userKeyMap: Record<string, string> = {};
    const userPasswordMap: Record<string, string> = {}; // email -> plain password
    const adminKeys = new Set(parsed.admins.map((a) => a.key));

    // ─── Import admins (as USER role, skip if email conflicts) ───
    for (const admin of parsed.admins) {
      if (currentAdmin && admin.email.toLowerCase() === currentAdmin.email.toLowerCase()) {
        // Conflicting admin — map old key to current admin, skip creation
        userKeyMap[admin.key] = currentAdmin.id;
        results.adminsSkipped++;
        continue;
      }

      // Check if user with this email already exists
      const existing = await prisma.user.findUnique({ where: { email: admin.email.toLowerCase() } });
      if (existing) {
        userKeyMap[admin.key] = existing.id;
        results.adminsSkipped++;
        continue;
      }

      const plainPassword = passwordMode === 'uniform' ? uniformPassword : generatePassword();
      const hashedPassword = await bcrypt.hash(plainPassword, 12);

      const newUser = await prisma.user.create({
        data: {
          email: admin.email.toLowerCase(),
          password: hashedPassword,
          name: admin.name || 'User',
          role: 'USER', // old admins become USER in new system
          emailVerified: new Date(),
          createdAt: new Date(admin.date * 1000),
        },
      });

      userKeyMap[admin.key] = newUser.id;
      userPasswordMap[admin.email.toLowerCase()] = plainPassword;
      results.adminsImported++;
    }

    // ─── Import users ───
    for (const user of parsed.users) {
      const existing = await prisma.user.findUnique({ where: { email: user.email.toLowerCase() } });
      if (existing) {
        userKeyMap[user.key] = existing.id;
        results.usersSkipped++;
        continue;
      }

      const plainPassword = passwordMode === 'uniform' ? uniformPassword : generatePassword();
      const hashedPassword = await bcrypt.hash(plainPassword, 12);

      const newUser = await prisma.user.create({
        data: {
          email: user.email.toLowerCase(),
          password: hashedPassword,
          name: user.name || 'User',
          role: 'USER',
          emailVerified: user.status === 'active' ? new Date() : null,
          createdAt: new Date(user.date * 1000),
        },
      });

      userKeyMap[user.key] = newUser.id;
      userPasswordMap[user.email.toLowerCase()] = plainPassword;
      results.usersImported++;
    }

    // ─── Import hosting accounts ───
    for (const account of parsed.accounts) {
      const userId = userKeyMap[account.forKey];
      if (!userId) {
        results.errors.push(`Hosting ${account.username}: owner not found (key: ${account.forKey})`);
        results.accountsSkipped++;
        continue;
      }

      // Check if vpUsername already exists
      const existing = await prisma.hosting.findUnique({ where: { vpUsername: account.username } });
      if (existing) {
        results.accountsSkipped++;
        continue;
      }

      const status = mapHostingStatus(account.status);

      await prisma.hosting.create({
        data: {
          userId,
          vpUsername: account.username,
          username: account.username,
          domain: account.domain,
          package: 'free', // default package
          status,
          sqlCluster: account.sql || null,
          label: account.label || null,
          password: account.password || null,
          cpanelApproved: status === 'ACTIVE',
          cpanelApprovedAt: status === 'ACTIVE' ? new Date() : null,
          isCustomDomain: false,
          createdAt: new Date(account.time * 1000),
          activatedAt: status === 'ACTIVE' ? new Date(account.time * 1000) : null,
          suspendedAt: status === 'SUSPENDED' ? new Date() : null,
        },
      });
      results.accountsImported++;
    }

    // ─── Import tickets & replies ───
    const ticketKeyMap: Record<string, string> = {}; // old ticket_key -> new ticket ID

    for (const ticket of parsed.tickets) {
      const userId = userKeyMap[ticket.forKey];
      if (!userId) continue;

      const newTicket = await prisma.ticket.create({
        data: {
          userId,
          subject: ticket.subject,
          message: ticket.content,
          status: mapTicketStatus(ticket.status),
          createdAt: new Date(ticket.time * 1000),
        },
      });

      ticketKeyMap[ticket.key] = newTicket.id;
      results.ticketsImported++;
    }

    for (const reply of parsed.replies) {
      const ticketId = ticketKeyMap[reply.forKey];
      if (!ticketId) continue;

      const isAdmin = adminKeys.has(reply.byKey);
      const userId = userKeyMap[reply.byKey];

      await prisma.ticketReply.create({
        data: {
          ticketId,
          message: reply.content,
          isSupport: isAdmin,
          supportUserId: isAdmin && userId ? userId : null,
          createdAt: new Date(reply.time * 1000),
        },
      });
      results.repliesImported++;
    }

    // ─── Import SSL certificates ───
    for (const ssl of parsed.ssl) {
      const userId = userKeyMap[ssl.forKey];
      if (!userId) continue;

      // Find a hosting for this user to link SSL to
      const hosting = await prisma.hosting.findFirst({
        where: { userId, domain: { contains: ssl.domain.split('.')[0] } },
      });
      if (!hosting) continue;

      const existing = await prisma.sSLCertificate.findFirst({
        where: { hostingId: hosting.id, domain: ssl.domain },
      });
      if (existing) continue;

      await prisma.sSLCertificate.create({
        data: {
          hostingId: hosting.id,
          domain: ssl.domain,
          domainType: 'SUBDOMAIN',
          provider: 'LETS_ENCRYPT',
          status: ssl.status === 'active' ? 'ISSUED' : 'FAILED',
          privateKey: ssl.privateKey || null,
          createdAt: new Date(),
        },
      });
      results.sslImported++;
    }

    // ─── Import settings (except builder and base) ───
    if (importSettings) {
      // MOFH settings
      if (parsed.settings.mofh) {
        const m = parsed.settings.mofh;
        const settingsToImport = [
          { key: 'mofh_api_username', value: m.username },
          { key: 'mofh_api_password', value: m.password },
          { key: 'mofh_package', value: m.package },
          { key: 'mofh_cpanel_url', value: m.cpanel },
        ];
        for (const s of settingsToImport) {
          if (s.value) {
            await prisma.setting.upsert({
              where: { key: s.key },
              update: { value: s.value },
              create: { key: s.key, value: s.value },
            });
          }
        }
        results.settingsImported.push('MOFH API');
      }

      // SMTP settings
      if (parsed.settings.smtp) {
        const s = parsed.settings.smtp;
        const smtpSettings = [
          { key: 'smtp_host', value: s.hostname },
          { key: 'smtp_port', value: String(s.port) },
          { key: 'smtp_secure', value: s.encryption === 'ssl' ? 'true' : 'false' },
          { key: 'smtp_user', value: s.username },
          { key: 'smtp_pass', value: s.password },
          { key: 'smtp_from', value: s.from },
          { key: 'smtp_from_name', value: s.name },
        ];
        for (const setting of smtpSettings) {
          if (setting.value) {
            await prisma.setting.upsert({
              where: { key: setting.key },
              update: { value: setting.value },
              create: { key: setting.key, value: setting.value },
            });
          }
        }
        results.settingsImported.push('SMTP');
      }

      // Domains
      if (parsed.settings.domains.length > 0) {
        const domainsValue = JSON.stringify(parsed.settings.domains.map((d) => ({ domain: d, active: true })));
        await prisma.setting.upsert({
          where: { key: 'allowed_domains' },
          update: { value: domainsValue },
          create: { key: 'allowed_domains', value: domainsValue },
        });
        results.settingsImported.push(`Domains (${parsed.settings.domains.length})`);
      }
    }

    // ─── Send credential emails ───
    if (sendEmails) {
      for (const [email, password] of Object.entries(userPasswordMap)) {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) continue;

        try {
          await sendTemplateEmail('DATA_IMPORT_CREDENTIALS', email, {
            name: user.name || 'User',
            email,
            password,
            siteName,
            loginUrl: `${frontendUrl}/login`,
          }, user.id);
          results.emailsSent++;
        } catch {
          results.emailsFailed++;
        }
      }
    }

    // Mark import as completed
    await prisma.setting.upsert({
      where: { key: 'data_import_completed' },
      update: { value: 'true' },
      create: { key: 'data_import_completed', value: 'true' },
    });

    // Cleanup
    try { fs.unlinkSync(sessionPath); } catch (e) {}

    res.json({ success: true, results });
  } catch (error: any) {
    console.error('[Import] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
