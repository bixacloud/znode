import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import archiver from 'archiver';
import { prisma } from '../prisma.js';
import { BackupStorageType, BackupStatus } from '@prisma/client';

const execAsync = promisify(exec);
const fsPromises = fs.promises;

const BACKUP_TEMP_DIR = process.env.BACKUP_TEMP_DIR || '/tmp/znode-backups';
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(process.cwd(), '..', 'public', 'uploads');

export interface BackupOptions {
  configId?: string;
  includeDatabase?: boolean;
  includeUploads?: boolean;
  isManual?: boolean;
}

export interface BackupResult {
  success: boolean;
  backupId?: string;
  filename?: string;
  fileSize?: number;
  error?: string;
}

// Ensure temp directory exists
async function ensureTempDir(): Promise<void> {
  try {
    await fsPromises.mkdir(BACKUP_TEMP_DIR, { recursive: true });
  } catch (error) {
    // Directory might already exist
  }
}

// Get database credentials from DATABASE_URL
function parseDatabaseUrl(): { host: string; port: string; user: string; password: string; database: string } {
  const url = process.env.DATABASE_URL || '';
  const match = url.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
  if (!match) {
    throw new Error('Invalid DATABASE_URL format');
  }
  return {
    user: match[1],
    password: match[2],
    host: match[3],
    port: match[4],
    database: match[5].split('?')[0],
  };
}

// Create database dump
async function createDatabaseDump(outputPath: string): Promise<void> {
  const db = parseDatabaseUrl();
  const command = `mysqldump -h ${db.host} -P ${db.port} -u ${db.user} -p'${db.password}' ${db.database} > ${outputPath}`;
  
  try {
    await execAsync(command);
  } catch (error: any) {
    throw new Error(`Database dump failed: ${error.message}`);
  }
}

// Create backup archive
async function createBackupArchive(
  outputPath: string,
  includeDatabaseDump: string | null,
  includeUploads: boolean
): Promise<number> {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => resolve(archive.pointer()));
    archive.on('error', reject);

    archive.pipe(output);

    // Add database dump
    if (includeDatabaseDump && fs.existsSync(includeDatabaseDump)) {
      archive.file(includeDatabaseDump, { name: 'database.sql' });
    }

    // Add uploads directory
    if (includeUploads && fs.existsSync(UPLOADS_DIR)) {
      archive.directory(UPLOADS_DIR, 'uploads');
    }

    // Add backup metadata
    const metadata = {
      createdAt: new Date().toISOString(),
      version: '1.0',
      includesDatabase: !!includeDatabaseDump,
      includesUploads: includeUploads,
    };
    archive.append(JSON.stringify(metadata, null, 2), { name: 'backup-metadata.json' });

    archive.finalize();
  });
}

// Main backup function
export async function createBackup(options: BackupOptions = {}): Promise<BackupResult> {
  const {
    configId,
    includeDatabase = true,
    includeUploads = true,
    isManual = false,
  } = options;

  await ensureTempDir();

  // Create backup history record
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `backup-${timestamp}.zip`;
  const tempArchivePath = path.join(BACKUP_TEMP_DIR, filename);

  // Get config if provided
  let config = null;
  let storageType: BackupStorageType = 'LOCAL';
  
  if (configId) {
    config = await prisma.backupConfig.findUnique({ where: { id: configId } });
    if (config) {
      storageType = config.storageType;
    }
  }

  // Create backup history entry
  const backupHistory = await prisma.backupHistory.create({
    data: {
      configId,
      filename,
      storageType,
      storagePath: '',
      status: 'IN_PROGRESS',
      isManual,
    },
  });

  try {
    let databaseDumpPath: string | null = null;

    // Create database dump if needed
    if (includeDatabase) {
      databaseDumpPath = path.join(BACKUP_TEMP_DIR, `database-${timestamp}.sql`);
      console.log('[Backup] Creating database dump at:', databaseDumpPath);
      await createDatabaseDump(databaseDumpPath);
      console.log('[Backup] Database dump created successfully');
    }

    // Create archive
    console.log('[Backup] Creating archive at:', tempArchivePath);
    const fileSize = await createBackupArchive(tempArchivePath, databaseDumpPath, includeUploads);
    console.log('[Backup] Archive created, size:', fileSize);

    // Clean up database dump
    if (databaseDumpPath && fs.existsSync(databaseDumpPath)) {
      await fsPromises.unlink(databaseDumpPath);
    }

    // Upload to storage destination
    console.log('[Backup] Uploading to storage, type:', storageType);
    console.log('[Backup] Config:', config ? {
      id: config.id,
      name: config.name,
      storageType: config.storageType,
      hasRefreshToken: !!config.googleDriveRefreshToken,
    } : 'null - using default LOCAL');
    
    const { StorageAdapterFactory } = await import('./storage-adapters.js');
    const adapter = StorageAdapterFactory.create(config || { storageType: 'LOCAL', localPath: BACKUP_TEMP_DIR });
    const storagePath = await adapter.upload(tempArchivePath, filename);
    console.log('[Backup] Upload complete, storage path:', storagePath);

    // Clean up temp file if not local storage
    if (storageType !== 'LOCAL' && fs.existsSync(tempArchivePath)) {
      await fsPromises.unlink(tempArchivePath);
    }

    // Update backup history
    await prisma.backupHistory.update({
      where: { id: backupHistory.id },
      data: {
        fileSize: BigInt(fileSize),
        storagePath,
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    // Update config last backup time
    if (configId) {
      await prisma.backupConfig.update({
        where: { id: configId },
        data: { lastBackupAt: new Date() },
      });
    }

    return {
      success: true,
      backupId: backupHistory.id,
      filename,
      fileSize,
    };
  } catch (error: any) {
    // Update backup history with error
    await prisma.backupHistory.update({
      where: { id: backupHistory.id },
      data: {
        status: 'FAILED',
        errorMessage: error.message,
        completedAt: new Date(),
      },
    });

    // Clean up temp files
    if (fs.existsSync(tempArchivePath)) {
      await fsPromises.unlink(tempArchivePath).catch(() => {});
    }

    return {
      success: false,
      error: error.message,
    };
  }
}

// Restore from backup
export async function restoreBackup(backupId: string): Promise<{ success: boolean; error?: string }> {
  const backup = await prisma.backupHistory.findUnique({
    where: { id: backupId },
    include: { config: true },
  });

  if (!backup) {
    return { success: false, error: 'Backup not found' };
  }

  if (backup.status !== 'COMPLETED') {
    return { success: false, error: 'Backup is not completed' };
  }

  await ensureTempDir();

  try {
    // Download backup file
    const { StorageAdapterFactory } = await import('./storage-adapters.js');
    const adapter = StorageAdapterFactory.create(backup.config || { storageType: backup.storageType, localPath: BACKUP_TEMP_DIR });
    const localPath = await adapter.download(backup.storagePath, backup.filename);

    // Extract archive
    const extractDir = path.join(BACKUP_TEMP_DIR, `restore-${Date.now()}`);
    await fsPromises.mkdir(extractDir, { recursive: true });

    const unzipper = await import('unzipper');
    await new Promise<void>((resolve, reject) => {
      fs.createReadStream(localPath)
        .pipe(unzipper.Extract({ path: extractDir }))
        .on('close', resolve)
        .on('error', reject);
    });

    // Restore database
    const databaseDumpPath = path.join(extractDir, 'database.sql');
    if (fs.existsSync(databaseDumpPath)) {
      const db = parseDatabaseUrl();
      const command = `mysql -h ${db.host} -P ${db.port} -u ${db.user} -p'${db.password}' ${db.database} < ${databaseDumpPath}`;
      await execAsync(command);
    }

    // Restore uploads
    const uploadsPath = path.join(extractDir, 'uploads');
    if (fs.existsSync(uploadsPath)) {
      // Copy uploads back
      await execAsync(`cp -r ${uploadsPath}/* ${UPLOADS_DIR}/`);
    }

    // Clean up
    await fsPromises.rm(extractDir, { recursive: true, force: true });
    if (backup.storageType !== 'LOCAL') {
      await fsPromises.unlink(localPath).catch(() => {});
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Delete backup
export async function deleteBackup(backupId: string): Promise<{ success: boolean; error?: string }> {
  const backup = await prisma.backupHistory.findUnique({
    where: { id: backupId },
    include: { config: true },
  });

  if (!backup) {
    return { success: false, error: 'Backup not found' };
  }

  try {
    // Delete from storage
    const { StorageAdapterFactory } = await import('./storage-adapters.js');
    const adapter = StorageAdapterFactory.create(backup.config || { storageType: backup.storageType, localPath: BACKUP_TEMP_DIR });
    await adapter.delete(backup.storagePath);

    // Delete from database
    await prisma.backupHistory.delete({ where: { id: backupId } });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Clean old backups based on retention policy
export async function cleanOldBackups(configId: string): Promise<number> {
  const config = await prisma.backupConfig.findUnique({ where: { id: configId } });
  if (!config) return 0;

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - config.retentionDays);

  const oldBackups = await prisma.backupHistory.findMany({
    where: {
      configId,
      status: 'COMPLETED',
      createdAt: { lt: cutoffDate },
    },
  });

  let deletedCount = 0;
  for (const backup of oldBackups) {
    const result = await deleteBackup(backup.id);
    if (result.success) deletedCount++;
  }

  return deletedCount;
}
