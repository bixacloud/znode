import { Router, Response, Request } from 'express';
import { prisma } from '../lib/prisma.js';
import { restoreBackup } from '../lib/backup/index.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import multer from 'multer';
import { execSync } from 'child_process';

const router = Router();

// Configure multer for file upload
const upload = multer({
  dest: path.join(os.tmpdir(), 'znode-restore'),
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB max
  },
  fileFilter: (req, file, cb) => {
    // Accept .zip, .sql.gz and .sql files
    if (file.originalname.endsWith('.zip') || file.originalname.endsWith('.sql.gz') || file.originalname.endsWith('.sql')) {
      cb(null, true);
    } else {
      cb(new Error('Only .zip, .sql.gz or .sql files are allowed'));
    }
  },
});

// Check if restore is allowed (no admin exists)
router.get('/can-restore', async (req: Request, res: Response) => {
  try {
    const adminCount = await prisma.user.count({
      where: { role: 'ADMIN' }
    });
    
    res.json({ 
      canRestore: adminCount === 0,
      message: adminCount === 0 
        ? 'No admin account found. Restore is allowed.' 
        : 'An admin account already exists.'
    });
  } catch (error: any) {
    console.error('[Setup] Error checking restore status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Upload and restore backup (no auth required - only when no admin exists)
router.post('/restore-upload', upload.single('backup'), async (req: Request, res: Response) => {
  try {
    // Double check that restore is allowed
    const adminCount = await prisma.user.count({
      where: { role: 'ADMIN' }
    });
    
    if (adminCount > 0) {
      // Clean up uploaded file if exists
      if (req.file) {
        try { fs.unlinkSync(req.file.path); } catch (e) {}
      }
      return res.status(403).json({ error: 'Restore not allowed - admin account exists' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No backup file uploaded' });
    }

    console.log('[Setup Restore] Received file:', req.file.originalname, 'size:', req.file.size);

    let fileToRestore: string;
    const originalName = req.file.originalname;

    if (originalName.endsWith('.zip')) {
      // Extract .zip file using system unzip command
      console.log('[Setup Restore] Extracting .zip file...');
      const extractDir = path.join(os.tmpdir(), 'znode-restore', `extract_${Date.now()}`);
      
      // Create extract directory
      if (!fs.existsSync(extractDir)) {
        fs.mkdirSync(extractDir, { recursive: true });
      }
      
      // Extract using unzip command
      try {
        execSync(`unzip -q "${req.file.path}" -d "${extractDir}"`);
      } catch (error: any) {
        throw new Error(`Failed to extract .zip file: ${error.message}`);
      }
      
      // Find database.sql file
      const sqlPath = path.join(extractDir, 'database.sql');
      if (!fs.existsSync(sqlPath)) {
        throw new Error('No database.sql found in backup .zip file');
      }
      
      fileToRestore = sqlPath;
      
      // Clean up original zip
      try { fs.unlinkSync(req.file.path); } catch (e) {}
    } else {
      // Rename file to have correct extension
      const newPath = req.file.path + (originalName.endsWith('.gz') ? '.sql.gz' : '.sql');
      fs.renameSync(req.file.path, newPath);
      fileToRestore = newPath;
    }

    console.log('[Setup Restore] Starting restore from uploaded file...');

    // Restore the backup
    await restoreBackup(fileToRestore);

    // Clean up temp file
    try {
      fs.unlinkSync(fileToRestore);
    } catch (e) {
      console.warn('[Setup Restore] Failed to clean up temp file:', e);
    }

    console.log('[Setup Restore] Restore completed successfully');

    res.json({ success: true });
  } catch (error: any) {
    console.error('[Setup Restore] Error:', error);
    
    // Clean up uploaded file on error
    if (req.file) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
    }
    
    res.status(500).json({ error: error.message });
  }
});

export default router;
