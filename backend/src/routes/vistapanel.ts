import { Router, Response } from 'express';
import prisma from '../lib/prisma.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { VistapanelApi } from '../lib/vistapanel.js';

const router = Router();

// Check if hosting is fully operational (active AND cpanel approved)
interface HostingOperationalCheck {
  operational: boolean;
  error?: string;
  errorCode?: 'NOT_ACTIVE' | 'CPANEL_NOT_APPROVED' | 'PENDING' | 'SUSPENDED' | 'SUSPENDING' | 'REACTIVATING';
}

function isHostingOperational(hosting: { status: string; cpanelApproved: boolean }): HostingOperationalCheck {
  if (hosting.status === 'PENDING') {
    return { operational: false, error: 'Hosting account is pending activation', errorCode: 'PENDING' };
  }
  if (hosting.status === 'SUSPENDING') {
    return { operational: false, error: 'Hosting account is being suspended', errorCode: 'SUSPENDING' };
  }
  if (hosting.status === 'SUSPENDED') {
    return { operational: false, error: 'Hosting account is suspended', errorCode: 'SUSPENDED' };
  }
  if (hosting.status === 'REACTIVATING') {
    return { operational: false, error: 'Hosting account is being reactivated', errorCode: 'REACTIVATING' };
  }
  if (hosting.status !== 'ACTIVE') {
    return { operational: false, error: 'Hosting account is not active', errorCode: 'NOT_ACTIVE' };
  }
  if (!hosting.cpanelApproved) {
    return { operational: false, error: 'You must login to cPanel first before using this feature', errorCode: 'CPANEL_NOT_APPROVED' };
  }
  return { operational: true };
}

// Get MOFH config
async function getMOFHConfig() {
  const setting = await prisma.setting.findUnique({
    where: { key: 'mofh_config' },
  });
  
  if (!setting) return null;
  return JSON.parse(setting.value);
}

// Helper to get logged in VistapanelApi instance
async function getVistapanelInstance(vpUsername: string, password: string): Promise<VistapanelApi> {
  const mofhConfig = await getMOFHConfig();
  const cpanelUrl = mofhConfig?.cpanelUrl || 'https://cpanel.byethost.com';
  
  const vp = new VistapanelApi();
  vp.setCpanelUrl(cpanelUrl);
  await vp.login(vpUsername, password);
  
  return vp;
}

// ==================== DATABASE ROUTES ====================

// List databases (from local DB, with option to sync from VistaPanel)
router.get('/:username/databases', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const vpUsername = req.params.username as string;
    const sync = req.query.sync === 'true';
    
    const hosting = await prisma.hosting.findFirst({
      where: { vpUsername, userId },
      include: { databases: true },
    });
    
    if (!hosting) {
      return res.status(404).json({ error: 'Hosting account not found' });
    }
    
    // Check if hosting is operational
    const opCheck = isHostingOperational(hosting);
    if (!opCheck.operational) {
      return res.status(400).json({ error: opCheck.error, errorCode: opCheck.errorCode });
    }
    
    // If sync requested, fetch from VistaPanel and update local DB
    if (sync && hosting.password) {
      try {
        const vp = await getVistapanelInstance(hosting.vpUsername, hosting.password);
        const vpDatabases = await vp.listDatabases();
        await vp.logout();
        
        // Sync databases: add missing ones, remove deleted ones
        const existingNames = hosting.databases.map(db => db.name);
        const vpNames = vpDatabases;
        
        // Add new databases
        for (const dbName of vpNames) {
          if (!existingNames.includes(dbName)) {
            await prisma.database.create({
              data: {
                hostingId: hosting.id,
                name: dbName,
                fullName: `${hosting.vpUsername}_${dbName}`,
              },
            });
          }
        }
        
        // Remove deleted databases
        for (const db of hosting.databases) {
          if (!vpNames.includes(db.name)) {
            await prisma.database.delete({
              where: { id: db.id },
            });
          }
        }
        
        // Fetch updated list
        const updatedHosting = await prisma.hosting.findFirst({
          where: { id: hosting.id },
          include: { databases: true },
        });
        
        return res.json({ 
          databases: updatedHosting?.databases.map(db => db.name) || [],
          synced: true,
        });
      } catch (syncError: any) {
        console.error('Sync databases error:', syncError);
        // Return local databases if sync fails
        return res.json({ 
          databases: hosting.databases.map(db => db.name),
          synced: false,
          syncError: syncError.message,
        });
      }
    }
    
    // Return local databases
    res.json({ 
      databases: hosting.databases.map(db => db.name),
      synced: false,
    });
  } catch (error: any) {
    console.error('List databases error:', error);
    res.status(500).json({ error: error.message || 'Failed to list databases' });
  }
});

// Create database
router.post('/:username/databases', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const vpUsername = req.params.username as string;
    const { dbname } = req.body;
    
    if (!dbname) {
      return res.status(400).json({ error: 'Database name is required' });
    }
    
    const hosting = await prisma.hosting.findFirst({
      where: { vpUsername, userId },
    });
    
    if (!hosting) {
      return res.status(404).json({ error: 'Hosting account not found' });
    }
    
    // Check if hosting is operational
    const opCheck = isHostingOperational(hosting);
    if (!opCheck.operational) {
      return res.status(400).json({ error: opCheck.error, errorCode: opCheck.errorCode });
    }
    
    // Check if database already exists locally
    const existingDb = await prisma.database.findFirst({
      where: { hostingId: hosting.id, name: dbname },
    });
    
    if (existingDb) {
      return res.status(400).json({ error: 'Database already exists' });
    }
    
    // Create on VistaPanel
    const vp = await getVistapanelInstance(hosting.vpUsername, hosting.password);
    await vp.createDatabase(dbname);
    await vp.logout();
    
    // Save to local DB
    const database = await prisma.database.create({
      data: {
        hostingId: hosting.id,
        name: dbname,
        fullName: `${hosting.vpUsername}_${dbname}`,
      },
    });
    
    res.json({ 
      success: true, 
      message: 'Database created successfully',
      database: {
        name: database.name,
        fullName: database.fullName,
      },
    });
  } catch (error: any) {
    console.error('Create database error:', error);
    res.status(500).json({ error: error.message || 'Failed to create database' });
  }
});

// Delete database
router.delete('/:username/databases/:dbname', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const vpUsername = req.params.username as string;
    const dbname = req.params.dbname as string;
    
    const hosting = await prisma.hosting.findFirst({
      where: { vpUsername, userId },
    });
    
    if (!hosting) {
      return res.status(404).json({ error: 'Hosting account not found' });
    }
    
    // Check if hosting is operational
    const opCheck = isHostingOperational(hosting);
    if (!opCheck.operational) {
      return res.status(400).json({ error: opCheck.error, errorCode: opCheck.errorCode });
    }
    
    // Delete from VistaPanel
    const vp = await getVistapanelInstance(hosting.vpUsername, hosting.password);
    await vp.deleteDatabase(dbname);
    await vp.logout();
    
    // Delete from local DB
    await prisma.database.deleteMany({
      where: { hostingId: hosting.id, name: dbname },
    });
    
    res.json({ success: true, message: 'Database deleted successfully' });
  } catch (error: any) {
    console.error('Delete database error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete database' });
  }
});

// Get phpMyAdmin link
router.get('/:username/databases/:dbname/phpmyadmin', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const vpUsername = req.params.username as string;
    const dbname = req.params.dbname as string;
    
    const hosting = await prisma.hosting.findFirst({
      where: { vpUsername, userId },
    });
    
    if (!hosting) {
      return res.status(404).json({ error: 'Hosting account not found' });
    }
    
    // Check if hosting is operational
    const opCheck = isHostingOperational(hosting);
    if (!opCheck.operational) {
      return res.status(400).json({ error: opCheck.error, errorCode: opCheck.errorCode });
    }
    
    const vp = await getVistapanelInstance(hosting.vpUsername, hosting.password);
    const link = await vp.getPhpmyadminLink(dbname);
    await vp.logout();
    
    if (!link) {
      return res.status(404).json({ error: 'phpMyAdmin link not found' });
    }
    
    res.json({ link });
  } catch (error: any) {
    console.error('Get phpMyAdmin link error:', error);
    res.status(500).json({ error: error.message || 'Failed to get phpMyAdmin link' });
  }
});

// ==================== SOFTACULOUS ROUTES ====================

// Get Softaculous auto-login link
router.get('/:username/softaculous', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const vpUsername = req.params.username as string;
    
    const hosting = await prisma.hosting.findFirst({
      where: { vpUsername, userId },
    });
    
    if (!hosting) {
      return res.status(404).json({ error: 'Hosting account not found' });
    }
    
    // Check if hosting is operational
    const opCheck = isHostingOperational(hosting);
    if (!opCheck.operational) {
      return res.status(400).json({ error: opCheck.error, errorCode: opCheck.errorCode });
    }
    
    const vp = await getVistapanelInstance(hosting.vpUsername, hosting.password);
    const link = await vp.getSoftaculousLink();
    await vp.logout();
    
    if (!link) {
      return res.status(404).json({ error: 'Softaculous link not found' });
    }
    
    res.json({ link });
  } catch (error: any) {
    console.error('Get Softaculous link error:', error);
    res.status(500).json({ error: error.message || 'Failed to get Softaculous link' });
  }
});

// ==================== DOMAINS ROUTES ====================

// List domains
router.get('/:username/domains', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const vpUsername = req.params.username as string;
    const type = (req.query.type as string) || 'all';
    
    const hosting = await prisma.hosting.findFirst({
      where: { vpUsername, userId },
    });
    
    if (!hosting) {
      return res.status(404).json({ error: 'Hosting account not found' });
    }
    
    // Check if hosting is operational
    const opCheck = isHostingOperational(hosting);
    if (!opCheck.operational) {
      return res.status(400).json({ error: opCheck.error, errorCode: opCheck.errorCode });
    }
    
    const vp = await getVistapanelInstance(hosting.vpUsername, hosting.password);
    const domains = await vp.listDomains(type);
    await vp.logout();
    
    res.json({ domains });
  } catch (error: any) {
    console.error('List domains error:', error);
    res.status(500).json({ error: error.message || 'Failed to list domains' });
  }
});

// ==================== CNAME RECORDS ROUTES ====================

// Get CNAME records
router.get('/:username/cname', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const vpUsername = req.params.username as string;
    
    const hosting = await prisma.hosting.findFirst({
      where: { vpUsername, userId },
    });
    
    if (!hosting) {
      return res.status(404).json({ error: 'Hosting account not found' });
    }
    
    // Check if hosting is operational
    const opCheck = isHostingOperational(hosting);
    if (!opCheck.operational) {
      return res.status(400).json({ error: opCheck.error, errorCode: opCheck.errorCode });
    }
    
    const vp = await getVistapanelInstance(hosting.vpUsername, hosting.password);
    const records = await vp.getCNAMErecords();
    await vp.logout();
    
    res.json({ records });
  } catch (error: any) {
    console.error('Get CNAME records error:', error);
    res.status(500).json({ error: error.message || 'Failed to get CNAME records' });
  }
});

// Create CNAME record
router.post('/:username/cname', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const vpUsername = req.params.username as string;
    const { source, domain, destination } = req.body;
    
    if (!source || !domain || !destination) {
      return res.status(400).json({ error: 'Source, domain and destination are required' });
    }
    
    const hosting = await prisma.hosting.findFirst({
      where: { vpUsername, userId },
    });
    
    if (!hosting) {
      return res.status(404).json({ error: 'Hosting account not found' });
    }
    
    // Check if hosting is operational
    const opCheck = isHostingOperational(hosting);
    if (!opCheck.operational) {
      return res.status(400).json({ error: opCheck.error, errorCode: opCheck.errorCode });
    }
    
    const vp = await getVistapanelInstance(hosting.vpUsername, hosting.password);
    await vp.createCNAMErecord(source, domain, destination);
    await vp.logout();
    
    res.json({ success: true, message: 'CNAME record created successfully' });
  } catch (error: any) {
    console.error('Create CNAME record error:', error);
    res.status(500).json({ error: error.message || 'Failed to create CNAME record' });
  }
});

// Delete CNAME record
router.delete('/:username/cname/:source', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const vpUsername = req.params.username as string;
    const source = req.params.source as string;
    
    const hosting = await prisma.hosting.findFirst({
      where: { vpUsername, userId },
    });
    
    if (!hosting) {
      return res.status(404).json({ error: 'Hosting account not found' });
    }
    
    // Check if hosting is operational
    const opCheck = isHostingOperational(hosting);
    if (!opCheck.operational) {
      return res.status(400).json({ error: opCheck.error, errorCode: opCheck.errorCode });
    }
    
    const vp = await getVistapanelInstance(hosting.vpUsername, hosting.password);
    await vp.deleteCNAMErecord(source);
    await vp.logout();
    
    res.json({ success: true, message: 'CNAME record deleted successfully' });
  } catch (error: any) {
    console.error('Delete CNAME record error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete CNAME record' });
  }
});

// ==================== MX RECORDS ROUTES ====================

// Get MX records
router.get('/:username/mx', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const vpUsername = req.params.username as string;
    
    const hosting = await prisma.hosting.findFirst({
      where: { vpUsername, userId },
    });
    
    if (!hosting) {
      return res.status(404).json({ error: 'Hosting account not found' });
    }
    
    // Check if hosting is operational
    const opCheck = isHostingOperational(hosting);
    if (!opCheck.operational) {
      return res.status(400).json({ error: opCheck.error, errorCode: opCheck.errorCode });
    }
    
    const vp = await getVistapanelInstance(hosting.vpUsername, hosting.password);
    const records = await vp.getMXrecords();
    await vp.logout();
    
    res.json({ records });
  } catch (error: any) {
    console.error('Get MX records error:', error);
    res.status(500).json({ error: error.message || 'Failed to get MX records' });
  }
});

// Create MX record
router.post('/:username/mx', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const vpUsername = req.params.username as string;
    const { domain, server, priority } = req.body;
    
    if (!domain || !server || !priority) {
      return res.status(400).json({ error: 'Domain, server and priority are required' });
    }
    
    const hosting = await prisma.hosting.findFirst({
      where: { vpUsername, userId },
    });
    
    if (!hosting) {
      return res.status(404).json({ error: 'Hosting account not found' });
    }
    
    // Check if hosting is operational
    const opCheck = isHostingOperational(hosting);
    if (!opCheck.operational) {
      return res.status(400).json({ error: opCheck.error, errorCode: opCheck.errorCode });
    }
    
    const vp = await getVistapanelInstance(hosting.vpUsername, hosting.password);
    await vp.createMXrecord(domain, server, priority);
    await vp.logout();
    
    res.json({ success: true, message: 'MX record created successfully' });
  } catch (error: any) {
    console.error('Create MX record error:', error);
    res.status(500).json({ error: error.message || 'Failed to create MX record' });
  }
});

// Delete MX record
router.delete('/:username/mx', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const vpUsername = req.params.username as string;
    const { domain, server, priority } = req.body;
    
    if (!domain || !server || !priority) {
      return res.status(400).json({ error: 'Domain, server and priority are required' });
    }
    
    const hosting = await prisma.hosting.findFirst({
      where: { vpUsername, userId },
    });
    
    if (!hosting) {
      return res.status(404).json({ error: 'Hosting account not found' });
    }
    
    // Check if hosting is operational
    const opCheck = isHostingOperational(hosting);
    if (!opCheck.operational) {
      return res.status(400).json({ error: opCheck.error, errorCode: opCheck.errorCode });
    }
    
    const vp = await getVistapanelInstance(hosting.vpUsername, hosting.password);
    await vp.deleteMXrecord(domain, server, priority);
    await vp.logout();
    
    res.json({ success: true, message: 'MX record deleted successfully' });
  } catch (error: any) {
    console.error('Delete MX record error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete MX record' });
  }
});

// ==================== SPF RECORDS ROUTES ====================

// Get SPF records
router.get('/:username/spf', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const vpUsername = req.params.username as string;
    
    const hosting = await prisma.hosting.findFirst({
      where: { vpUsername, userId },
    });
    
    if (!hosting) {
      return res.status(404).json({ error: 'Hosting account not found' });
    }
    
    // Check if hosting is operational
    const opCheck = isHostingOperational(hosting);
    if (!opCheck.operational) {
      return res.status(400).json({ error: opCheck.error, errorCode: opCheck.errorCode });
    }
    
    const vp = await getVistapanelInstance(hosting.vpUsername, hosting.password);
    const records = await vp.getSPFrecords();
    await vp.logout();
    
    res.json({ records });
  } catch (error: any) {
    console.error('Get SPF records error:', error);
    res.status(500).json({ error: error.message || 'Failed to get SPF records' });
  }
});

// Create SPF record
router.post('/:username/spf', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const vpUsername = req.params.username as string;
    const { domain, data } = req.body;
    
    if (!domain || !data) {
      return res.status(400).json({ error: 'Domain and data are required' });
    }
    
    const hosting = await prisma.hosting.findFirst({
      where: { vpUsername, userId },
    });
    
    if (!hosting) {
      return res.status(404).json({ error: 'Hosting account not found' });
    }
    
    // Check if hosting is operational
    const opCheck = isHostingOperational(hosting);
    if (!opCheck.operational) {
      return res.status(400).json({ error: opCheck.error, errorCode: opCheck.errorCode });
    }
    
    const vp = await getVistapanelInstance(hosting.vpUsername, hosting.password);
    await vp.createSPFrecord(domain, data);
    await vp.logout();
    
    res.json({ success: true, message: 'SPF record created successfully' });
  } catch (error: any) {
    console.error('Create SPF record error:', error);
    res.status(500).json({ error: error.message || 'Failed to create SPF record' });
  }
});

// Delete SPF record
router.delete('/:username/spf', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const vpUsername = req.params.username as string;
    const { domain, data } = req.body;
    
    if (!domain || !data) {
      return res.status(400).json({ error: 'Domain and data are required' });
    }
    
    const hosting = await prisma.hosting.findFirst({
      where: { vpUsername, userId },
    });
    
    if (!hosting) {
      return res.status(404).json({ error: 'Hosting account not found' });
    }
    
    // Check if hosting is operational
    const opCheck = isHostingOperational(hosting);
    if (!opCheck.operational) {
      return res.status(400).json({ error: opCheck.error, errorCode: opCheck.errorCode });
    }
    
    const vp = await getVistapanelInstance(hosting.vpUsername, hosting.password);
    await vp.deleteSPFrecord(domain, data);
    await vp.logout();
    
    res.json({ success: true, message: 'SPF record deleted successfully' });
  } catch (error: any) {
    console.error('Delete SPF record error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete SPF record' });
  }
});

// ==================== SSL ROUTES ====================

// Get SSL certificate
router.get('/:username/ssl/:domain', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const vpUsername = req.params.username as string;
    const domain = req.params.domain as string;
    
    const hosting = await prisma.hosting.findFirst({
      where: { vpUsername, userId },
    });
    
    if (!hosting) {
      return res.status(404).json({ error: 'Hosting account not found' });
    }
    
    // Check if hosting is operational
    const opCheck = isHostingOperational(hosting);
    if (!opCheck.operational) {
      return res.status(400).json({ error: opCheck.error, errorCode: opCheck.errorCode });
    }
    
    const vp = await getVistapanelInstance(hosting.vpUsername, hosting.password);
    const privateKey = await vp.getPrivateKey(domain);
    const certificate = await vp.getCertificate(domain);
    await vp.logout();
    
    res.json({ privateKey, certificate });
  } catch (error: any) {
    console.error('Get SSL error:', error);
    res.status(500).json({ error: error.message || 'Failed to get SSL' });
  }
});

// Upload SSL
router.post('/:username/ssl/:domain', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const vpUsername = req.params.username as string;
    const domain = req.params.domain as string;
    const { privateKey, certificate, csr } = req.body;
    
    const hosting = await prisma.hosting.findFirst({
      where: { vpUsername, userId },
    });
    
    if (!hosting) {
      return res.status(404).json({ error: 'Hosting account not found' });
    }
    
    // Check if hosting is operational
    const opCheck = isHostingOperational(hosting);
    if (!opCheck.operational) {
      return res.status(400).json({ error: opCheck.error, errorCode: opCheck.errorCode });
    }
    
    const vp = await getVistapanelInstance(hosting.vpUsername, hosting.password);
    
    if (privateKey) {
      await vp.uploadPrivateKey(domain, privateKey, csr || '');
    }
    if (certificate) {
      await vp.uploadCertificate(domain, certificate);
    }
    
    await vp.logout();
    
    res.json({ success: true, message: 'SSL uploaded successfully' });
  } catch (error: any) {
    console.error('Upload SSL error:', error);
    res.status(500).json({ error: error.message || 'Failed to upload SSL' });
  }
});

// Delete SSL
router.delete('/:username/ssl/:domain', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const vpUsername = req.params.username as string;
    const domain = req.params.domain as string;
    
    const hosting = await prisma.hosting.findFirst({
      where: { vpUsername, userId },
    });
    
    if (!hosting) {
      return res.status(404).json({ error: 'Hosting account not found' });
    }
    
    // Check if hosting is operational
    const opCheck = isHostingOperational(hosting);
    if (!opCheck.operational) {
      return res.status(400).json({ error: opCheck.error, errorCode: opCheck.errorCode });
    }
    
    const vp = await getVistapanelInstance(hosting.vpUsername, hosting.password);
    await vp.deleteCertificate(domain);
    await vp.logout();
    
    res.json({ success: true, message: 'SSL deleted successfully' });
  } catch (error: any) {
    console.error('Delete SSL error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete SSL' });
  }
});

// ==================== STATS ROUTES ====================

// Get user stats
router.get('/:username/stats', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const vpUsername = req.params.username as string;
    
    console.log(`[STATS] Fetching stats for ${vpUsername}`);
    
    const hosting = await prisma.hosting.findFirst({
      where: { vpUsername, userId },
    });
    
    if (!hosting) {
      return res.status(404).json({ error: 'Hosting account not found' });
    }
    
    // Check if hosting is operational
    const opCheck = isHostingOperational(hosting);
    if (!opCheck.operational) {
      return res.status(400).json({ error: opCheck.error, errorCode: opCheck.errorCode });
    }
    
    const vp = await getVistapanelInstance(hosting.vpUsername, hosting.password);
    const stats = await vp.getUserStats();
    console.log(`[STATS] Raw stats for ${vpUsername}:`, JSON.stringify(stats, null, 2));
    await vp.logout();
    
    res.json({ stats });
  } catch (error: any) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: error.message || 'Failed to get stats' });
  }
});

export default router;
