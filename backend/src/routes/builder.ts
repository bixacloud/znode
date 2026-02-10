import { Router, Response, Request } from 'express';
import prisma from '../lib/prisma.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { adminMiddleware } from '../middleware/auth.js';
import { Client as FTPClient } from 'basic-ftp';
import { Readable, Writable } from 'stream';

const router = Router();

const FTP_SERVER = 'ftpupload.net';
const FTP_BASE_DIR = '/htdocs';

// ==================== HELPERS ====================

async function createFTPConnection(username: string, password: string): Promise<FTPClient> {
  const client = new FTPClient();
  client.ftp.verbose = false;
  await client.access({
    host: FTP_SERVER,
    user: username,
    password: password,
    secure: false,
  });
  return client;
}

async function getHostingCredentials(vpUsername: string, userId: string) {
  const hosting = await prisma.hosting.findFirst({
    where: { vpUsername, userId, status: 'ACTIVE' },
  });
  if (!hosting) return null;
  return {
    ftpUser: hosting.vpUsername,
    ftpPass: hosting.password,
    domain: hosting.domain,
  };
}

function sanitizePath(inputPath: string): string {
  let cleaned = inputPath.replace(/\0/g, '').replace(/\\/g, '/');
  cleaned = cleaned.split('?')[0].split('#')[0];
  cleaned = cleaned.split('/').filter(part => part !== '..').join('/');
  if (!cleaned.startsWith('/htdocs')) {
    cleaned = FTP_BASE_DIR + (cleaned.startsWith('/') ? '' : '/') + cleaned;
  }
  return cleaned;
}

// ==================== GRAPES PROJECT LOAD ====================
router.get('/:vpUsername/project', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  let client: FTPClient | null = null;
  try {
    const vpUsername = req.params.vpUsername as string;
    const userId = req.user!.id;

    const creds = await getHostingCredentials(vpUsername, userId);
    if (!creds) {
      return res.status(404).json({ error: 'Hosting account not found or not active' });
    }

    // Try to load saved GrapesJS project data from FTP
    const projectPath = '/htdocs/.grapes/project.json';
    let projectData = null;

    try {
      client = await createFTPConnection(creds.ftpUser, creds.ftpPass);
      const chunks: Buffer[] = [];
      const writableStream = new Writable({
        write(chunk, _encoding, callback) {
          chunks.push(Buffer.from(chunk));
          callback();
        }
      });
      await client.downloadTo(writableStream, projectPath);
      const raw = Buffer.concat(chunks).toString('utf8');
      projectData = JSON.parse(raw);
    } catch {
      // No saved project yet
      projectData = null;
    } finally {
      if (client) { client.close(); client = null; }
    }

    res.json({
      project: projectData,
      domain: creds.domain,
    });
  } catch (error: any) {
    console.error('Builder load project error:', error.message);
    res.status(500).json({ error: 'Failed to load project' });
  }
});

// ==================== GRAPES PROJECT SAVE ====================
router.post('/:vpUsername/project', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  let client: FTPClient | null = null;
  try {
    const vpUsername = req.params.vpUsername as string;
    const userId = req.user!.id;
    const { projectData, html, css } = req.body;

    if (!projectData) {
      return res.status(400).json({ error: 'Project data is required' });
    }

    const creds = await getHostingCredentials(vpUsername, userId);
    if (!creds) {
      return res.status(404).json({ error: 'Hosting account not found or not active' });
    }

    client = await createFTPConnection(creds.ftpUser, creds.ftpPass);

    // 1. Save GrapesJS project JSON to .grapes/project.json
    const projectJson = JSON.stringify(projectData);
    if (Buffer.byteLength(projectJson, 'utf8') > 5 * 1024 * 1024) {
      return res.status(400).json({ error: 'Project data too large (max 5MB)' });
    }

    await client.ensureDir('/htdocs/.grapes');
    await client.cd('/');
    const projectReadable = Readable.from(Buffer.from(projectJson, 'utf8'));
    await client.uploadFrom(projectReadable, '/htdocs/.grapes/project.json');

    // 2. Publish compiled HTML page to index.html
    if (html) {
      const fullHtml = buildFullHtml(html, css || '');
      const htmlReadable = Readable.from(Buffer.from(fullHtml, 'utf8'));
      await client.uploadFrom(htmlReadable, '/htdocs/index.html');
    }

    res.json({ success: true, message: 'Project saved' });
  } catch (error: any) {
    console.error('Builder save project error:', error.message);
    res.status(500).json({ error: 'Failed to save project' });
  } finally {
    if (client) client.close();
  }
});

function buildFullHtml(bodyHtml: string, css: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
  <style>${css}</style>
</head>
<body>
  ${bodyHtml}
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"><\/script>
</body>
</html>`;
}

// ==================== ASSET UPLOAD ====================
router.post('/:vpUsername/assets', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  let client: FTPClient | null = null;
  try {
    const vpUsername = req.params.vpUsername as string;
    const userId = req.user!.id;
    const { filename, content } = req.body;

    if (!filename || !content) {
      return res.status(400).json({ error: 'Filename and content are required' });
    }

    const creds = await getHostingCredentials(vpUsername, userId);
    if (!creds) {
      return res.status(404).json({ error: 'Hosting account not found or not active' });
    }

    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const uploadPath = `/htdocs/assets/${safeName}`;

    client = await createFTPConnection(creds.ftpUser, creds.ftpPass);
    await client.ensureDir('/htdocs/assets');
    await client.cd('/');

    const buffer = Buffer.from(content, 'base64');
    if (buffer.length > 5 * 1024 * 1024) {
      return res.status(400).json({ error: 'File too large (max 5MB)' });
    }

    const readable = Readable.from(buffer);
    await client.uploadFrom(readable, uploadPath);

    const assetUrl = `http://${creds.domain}/assets/${safeName}`;
    res.json({ success: true, data: [assetUrl] });
  } catch (error: any) {
    console.error('Builder asset upload error:', error.message);
    res.status(500).json({ error: 'Failed to upload asset' });
  } finally {
    if (client) client.close();
  }
});

// ==================== LIST ASSETS ====================
router.get('/:vpUsername/assets', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  let client: FTPClient | null = null;
  try {
    const vpUsername = req.params.vpUsername as string;
    const userId = req.user!.id;

    const creds = await getHostingCredentials(vpUsername, userId);
    if (!creds) {
      return res.status(404).json({ error: 'Hosting account not found or not active' });
    }

    client = await createFTPConnection(creds.ftpUser, creds.ftpPass);

    let assets: string[] = [];
    try {
      const list = await client.list('/htdocs/assets');
      assets = list
        .filter(item => !item.isDirectory && item.name !== '.' && item.name !== '..')
        .filter(item => /\.(jpg|jpeg|png|gif|svg|webp|ico)$/i.test(item.name))
        .map(item => `http://${creds.domain}/assets/${item.name}`);
    } catch {
      // No assets directory yet
    }

    res.json({ assets });
  } catch (error: any) {
    console.error('Builder list assets error:', error.message);
    res.status(500).json({ error: 'Failed to list assets' });
  } finally {
    if (client) client.close();
  }
});

// ==================== BUILDER SETTINGS (admin) ====================

router.get('/settings', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const setting = await prisma.setting.findUnique({
      where: { key: 'builder_settings' },
    });
    const defaults = { enabled: true };
    const settings = setting?.value ? JSON.parse(setting.value) : defaults;
    res.json(settings);
  } catch (error) {
    console.error('Get builder settings error:', error);
    res.status(500).json({ error: 'Failed to get builder settings' });
  }
});

router.get('/status', async (_req: Request, res: Response) => {
  try {
    const setting = await prisma.setting.findUnique({
      where: { key: 'builder_settings' },
    });
    const settings = setting?.value ? JSON.parse(setting.value) : { enabled: true };
    res.json({ enabled: settings.enabled });
  } catch {
    res.json({ enabled: false });
  }
});

router.put('/settings', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { enabled } = req.body;
    const settings = { enabled: Boolean(enabled) };
    await prisma.setting.upsert({
      where: { key: 'builder_settings' },
      create: { key: 'builder_settings', value: JSON.stringify(settings) },
      update: { value: JSON.stringify(settings) },
    });
    res.json({ success: true, settings });
  } catch (error) {
    console.error('Update builder settings error:', error);
    res.status(500).json({ error: 'Failed to update builder settings' });
  }
});

export default router;
