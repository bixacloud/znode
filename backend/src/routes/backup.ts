import { Router, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { adminMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { google } from 'googleapis';
import { 
  createBackup, 
  restoreBackup, 
  deleteBackup,
  testStorageConnection,
  scheduleBackupJob,
  unscheduleBackupJob,
  getScheduledJobsStatus
} from '../lib/backup/index.js';

const router = Router();

// Google Drive OAuth2 configuration
const GOOGLE_DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/userinfo.email'
];

function getGoogleOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `${process.env.API_URL || 'http://localhost:3002'}/api/backup/google/callback`;
  
  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured');
  }
  
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

// Google Drive OAuth - Get auth URL
router.get('/google/auth', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { configId } = req.query;
    const oauth2Client = getGoogleOAuth2Client();
    
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: GOOGLE_DRIVE_SCOPES,
      prompt: 'consent', // Force consent to get refresh token
      state: configId as string || 'new', // Pass configId in state
    });
    
    res.json({ authUrl });
  } catch (error: any) {
    console.error('Google Drive auth error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Google Drive OAuth - Callback
router.get('/google/callback', async (req, res: Response) => {
  try {
    const { code, state } = req.query;
    const configId = state as string;
    
    console.log('[Google OAuth Callback] Received code:', code ? 'yes' : 'no');
    console.log('[Google OAuth Callback] Config ID:', configId);
    
    if (!code) {
      return res.redirect(`${process.env.FRONTEND_URL}/admin/settings/backup?error=no_code`);
    }
    
    const oauth2Client = getGoogleOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code as string);
    
    console.log('[Google OAuth Callback] Tokens received:', {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      expiryDate: tokens.expiry_date,
    });
    
    if (!tokens.access_token) {
      throw new Error('No access token received from Google');
    }
    
    // Set credentials BEFORE calling userinfo
    oauth2Client.setCredentials(tokens);
    
    // Get user email for display
    let email = 'unknown@gmail.com';
    try {
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
      const userInfo = await oauth2.userinfo.get();
      email = userInfo.data.email || email;
      console.log('[Google OAuth Callback] User email:', email);
    } catch (emailError: any) {
      console.error('[Google OAuth Callback] Failed to get user email:', emailError.message);
      // Continue without email - not critical
    }
    
    if (configId && configId !== 'new') {
      // Update existing config
      await prisma.backupConfig.update({
        where: { id: configId },
        data: {
          googleDriveAccessToken: tokens.access_token,
          googleDriveRefreshToken: tokens.refresh_token,
          googleDriveTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
          googleDriveEmail: email,
        },
      });
      res.redirect(`${process.env.FRONTEND_URL}/admin/settings/backup?google=connected&configId=${configId}`);
    } else {
      // Store tokens temporarily for new config creation
      // We'll pass them as query params (encoded)
      const tokenData = Buffer.from(JSON.stringify({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiryDate: tokens.expiry_date,
        email: email,
      })).toString('base64');
      
      res.redirect(`${process.env.FRONTEND_URL}/admin/settings/backup?google=connected&tokens=${tokenData}`);
    }
  } catch (error: any) {
    console.error('Google Drive callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/admin/settings/backup?error=${encodeURIComponent(error.message)}`);
  }
});

// Google Drive - Disconnect
router.post('/google/disconnect/:configId', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const configId = req.params.configId as string;
    
    await prisma.backupConfig.update({
      where: { id: configId },
      data: {
        googleDriveAccessToken: null,
        googleDriveRefreshToken: null,
        googleDriveTokenExpiry: null,
        googleDriveEmail: null,
      },
    });
    
    res.json({ success: true });
  } catch (error: any) {
    console.error('Google Drive disconnect error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Google Drive - List folders (for folder selection)
router.get('/google/folders', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { configId } = req.query;
    
    if (!configId) {
      return res.status(400).json({ error: 'Config ID required' });
    }
    
    const config = await prisma.backupConfig.findUnique({
      where: { id: configId as string },
    });
    
    if (!config?.googleDriveRefreshToken) {
      return res.status(400).json({ error: 'Google Drive not connected' });
    }
    
    const oauth2Client = getGoogleOAuth2Client();
    oauth2Client.setCredentials({
      refresh_token: config.googleDriveRefreshToken,
    });
    
    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    
    const response = await drive.files.list({
      q: "mimeType='application/vnd.google-apps.folder' and trashed=false",
      fields: 'files(id, name)',
      orderBy: 'name',
      pageSize: 100,
    });
    
    res.json({ folders: response.data.files || [] });
  } catch (error: any) {
    console.error('List Google Drive folders error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all backup configurations
router.get('/configs', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const configs = await prisma.backupConfig.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { backups: true }
        }
      }
    });

    // Mask sensitive data but add flags to indicate if configured
    const maskedConfigs = configs.map(config => ({
      ...config,
      hasConfiguredPassword: !!config.ftpPassword,
      hasGoogleDriveConnected: !!config.googleDriveRefreshToken,
      ftpPassword: config.ftpPassword ? '••••••••' : null,
      googleDriveCredentials: null,
      googleDriveAccessToken: null,
      googleDriveRefreshToken: null,
    }));

    res.json(maskedConfigs);
  } catch (error) {
    console.error('Get backup configs error:', error);
    res.status(500).json({ error: 'Failed to get backup configurations' });
  }
});

// Get single backup configuration
router.get('/configs/:id', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const config = await prisma.backupConfig.findUnique({
      where: { id },
      include: {
        backups: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        }
      }
    });

    if (!config) {
      return res.status(404).json({ error: 'Configuration not found' });
    }

    // Mask sensitive data but add flags to indicate if configured
    const maskedConfig = {
      ...config,
      hasConfiguredPassword: !!config.ftpPassword,
      hasGoogleDriveConnected: !!config.googleDriveRefreshToken,
      ftpPassword: config.ftpPassword ? '••••••••' : null,
      googleDriveCredentials: null,
      googleDriveAccessToken: null,
      googleDriveRefreshToken: null,
    };

    res.json(maskedConfig);
  } catch (error) {
    console.error('Get backup config error:', error);
    res.status(500).json({ error: 'Failed to get backup configuration' });
  }
});

// Create backup configuration
router.post('/configs', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      name,
      storageType,
      localPath,
      ftpHost,
      ftpPort,
      ftpUsername,
      ftpPassword,
      ftpPath,
      ftpSecure,
      googleDriveAccessToken,
      googleDriveRefreshToken,
      googleDriveTokenExpiry,
      googleDriveEmail,
      googleDriveFolderId,
      scheduleEnabled,
      scheduleType,
      scheduleTime,
      scheduleDays,
      retentionDays,
      includeDatabase,
      includeUploads,
    } = req.body;

    if (!name || !storageType) {
      return res.status(400).json({ error: 'Name and storage type are required' });
    }

    const config = await prisma.backupConfig.create({
      data: {
        name,
        storageType,
        localPath,
        ftpHost,
        ftpPort: ftpPort || 21,
        ftpUsername,
        ftpPassword,
        ftpPath,
        ftpSecure: ftpSecure || false,
        googleDriveAccessToken,
        googleDriveRefreshToken,
        googleDriveTokenExpiry: googleDriveTokenExpiry ? new Date(googleDriveTokenExpiry) : null,
        googleDriveEmail,
        googleDriveFolderId,
        scheduleEnabled: scheduleEnabled || false,
        scheduleType,
        scheduleTime,
        scheduleDays,
        retentionDays: retentionDays || 30,
        includeDatabase: includeDatabase !== false,
        includeUploads: includeUploads !== false,
      },
    });

    // Schedule job if enabled
    if (scheduleEnabled && scheduleType && scheduleTime) {
      scheduleBackupJob({
        id: config.id,
        scheduleType,
        scheduleTime,
        scheduleDays,
        includeDatabase: config.includeDatabase,
        includeUploads: config.includeUploads,
      });
    }

    res.status(201).json(config);
  } catch (error) {
    console.error('Create backup config error:', error);
    res.status(500).json({ error: 'Failed to create backup configuration' });
  }
});

// Update backup configuration
router.put('/configs/:id', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const updates = { ...req.body };

    // Get current config
    const currentConfig = await prisma.backupConfig.findUnique({
      where: { id },
    });

    if (!currentConfig) {
      return res.status(404).json({ error: 'Configuration not found' });
    }

    // Handle sensitive fields - keep old values if empty or masked
    if (!updates.ftpPassword || updates.ftpPassword === '' || updates.ftpPassword.startsWith('•') || updates.ftpPassword.startsWith('*')) {
      // Keep existing password if empty or masked
      delete updates.ftpPassword;
    }
    if (!updates.googleDriveCredentials || updates.googleDriveCredentials === '' || updates.googleDriveCredentials.startsWith('*')) {
      // Keep existing credentials if empty or masked
      delete updates.googleDriveCredentials;
    }

    const config = await prisma.backupConfig.update({
      where: { id },
      data: updates,
    });

    // Update scheduled job
    if (config.isActive && config.scheduleEnabled && config.scheduleType && config.scheduleTime) {
      scheduleBackupJob({
        id: config.id,
        scheduleType: config.scheduleType,
        scheduleTime: config.scheduleTime,
        scheduleDays: config.scheduleDays,
        includeDatabase: config.includeDatabase,
        includeUploads: config.includeUploads,
      });
    } else {
      unscheduleBackupJob(config.id);
    }

    res.json(config);
  } catch (error) {
    console.error('Update backup config error:', error);
    res.status(500).json({ error: 'Failed to update backup configuration' });
  }
});

// Delete backup configuration
router.delete('/configs/:id', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    // Unschedule job
    unscheduleBackupJob(id);

    // Delete config (backups will be set to null configId due to onDelete: SetNull)
    await prisma.backupConfig.delete({
      where: { id },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Delete backup config error:', error);
    res.status(500).json({ error: 'Failed to delete backup configuration' });
  }
});

// Test storage connection
router.post('/configs/test-connection', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    let config = { ...req.body };
    
    console.log('[Test Connection] Received configId:', config.configId);
    console.log('[Test Connection] Has credentials in request:', !!config.googleDriveCredentials);
    
    // If editing existing config, merge with stored credentials
    if (config.configId) {
      const existingConfig = await prisma.backupConfig.findUnique({
        where: { id: config.configId },
      });
      
      console.log('[Test Connection] Found existing config:', !!existingConfig);
      console.log('[Test Connection] Existing has credentials:', !!existingConfig?.googleDriveCredentials);
      
      if (existingConfig) {
        // Use stored credentials if not provided in request
        if (!config.ftpPassword || config.ftpPassword === '') {
          config.ftpPassword = existingConfig.ftpPassword;
        }
        if (!config.googleDriveCredentials || config.googleDriveCredentials === '') {
          config.googleDriveCredentials = existingConfig.googleDriveCredentials;
          console.log('[Test Connection] Using stored Google credentials');
        }
      }
    }
    
    console.log('[Test Connection] Final has credentials:', !!config.googleDriveCredentials);
    
    const result = await testStorageConnection(config);
    res.json(result);
  } catch (error: any) {
    console.error('[Test Connection] Error:', error);
    res.json({ success: false, error: error.message });
  }
});

// Get backup history
router.get('/history', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { configId, status, page = '1', limit = '20' } = req.query;

    const where: any = {};
    if (configId) where.configId = configId;
    if (status) where.status = status;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [backups, total] = await Promise.all([
      prisma.backupHistory.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit as string),
        include: {
          config: {
            select: { name: true, storageType: true }
          }
        }
      }),
      prisma.backupHistory.count({ where }),
    ]);

    // Convert BigInt to number for JSON serialization
    const serializedBackups = backups.map(b => ({
      ...b,
      fileSize: Number(b.fileSize),
    }));

    res.json({
      data: serializedBackups,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        totalPages: Math.ceil(total / parseInt(limit as string)),
      }
    });
  } catch (error) {
    console.error('Get backup history error:', error);
    res.status(500).json({ error: 'Failed to get backup history' });
  }
});

// Get single backup details
router.get('/history/:id', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const backup = await prisma.backupHistory.findUnique({
      where: { id },
      include: {
        config: {
          select: { name: true, storageType: true }
        }
      }
    });

    if (!backup) {
      return res.status(404).json({ error: 'Backup not found' });
    }

    res.json({
      ...backup,
      fileSize: Number(backup.fileSize),
    });
  } catch (error) {
    console.error('Get backup details error:', error);
    res.status(500).json({ error: 'Failed to get backup details' });
  }
});

// Create manual backup
router.post('/create', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('[Create Backup] Request body:', req.body);
    const { configId, includeDatabase = true, includeUploads = true } = req.body;

    console.log('[Create Backup] Starting backup with configId:', configId);
    const result = await createBackup({
      configId,
      includeDatabase,
      includeUploads,
      isManual: true,
    });

    console.log('[Create Backup] Result:', result);
    if (result.success) {
      res.json({
        success: true,
        backupId: result.backupId,
        filename: result.filename,
        fileSize: result.fileSize,
      });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error: any) {
    console.error('[Create Backup] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Restore from backup
router.post('/restore/:id', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    const result = await restoreBackup(id);

    if (result.success) {
      res.json({ success: true, message: 'Backup restored successfully' });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error: any) {
    console.error('Restore backup error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete backup
router.delete('/history/:id', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    const result = await deleteBackup(id);

    if (result.success) {
      res.json({ success: true });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error: any) {
    console.error('Delete backup error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get scheduled jobs status
router.get('/scheduler/status', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const status = getScheduledJobsStatus();
    res.json(status);
  } catch (error) {
    console.error('Get scheduler status error:', error);
    res.status(500).json({ error: 'Failed to get scheduler status' });
  }
});

// Download backup (for local backups)
router.get('/download/:id', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const backup = await prisma.backupHistory.findUnique({
      where: { id },
    });

    if (!backup) {
      return res.status(404).json({ error: 'Backup not found' });
    }

    if (backup.storageType !== 'LOCAL') {
      return res.status(400).json({ error: 'Direct download only available for local backups' });
    }

    const fs = await import('fs');
    if (!fs.existsSync(backup.storagePath)) {
      return res.status(404).json({ error: 'Backup file not found' });
    }

    res.download(backup.storagePath, backup.filename);
  } catch (error) {
    console.error('Download backup error:', error);
    res.status(500).json({ error: 'Failed to download backup' });
  }
});

export default router;
