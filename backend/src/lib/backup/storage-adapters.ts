import * as fs from 'fs';
import * as path from 'path';
import { Client as FTPClient } from 'basic-ftp';
import SFTPClient from 'ssh2-sftp-client';
import { google } from 'googleapis';
import { Readable } from 'stream';

const fsPromises = fs.promises;

export interface StorageConfig {
  storageType: string;
  localPath?: string | null;
  ftpHost?: string | null;
  ftpPort?: number | null;
  ftpUsername?: string | null;
  ftpPassword?: string | null;
  ftpPath?: string | null;
  ftpSecure?: boolean | null;
  // OAuth tokens for Google Drive
  googleDriveAccessToken?: string | null;
  googleDriveRefreshToken?: string | null;
  googleDriveTokenExpiry?: Date | null;
  googleDriveEmail?: string | null;
  googleDriveFolderId?: string | null;
  // Legacy service account (deprecated)
  googleDriveCredentials?: string | null;
}

export interface StorageAdapter {
  upload(localPath: string, filename: string): Promise<string>;
  download(remotePath: string, filename: string): Promise<string>;
  delete(remotePath: string): Promise<void>;
  list(): Promise<string[]>;
}

// Local Storage Adapter
export class LocalStorageAdapter implements StorageAdapter {
  private basePath: string;

  constructor(config: StorageConfig) {
    this.basePath = config.localPath || '/tmp/znode-backups';
  }

  async upload(localPath: string, filename: string): Promise<string> {
    const destPath = path.join(this.basePath, filename);
    
    // If source and destination are different, copy the file
    if (localPath !== destPath) {
      await fsPromises.mkdir(this.basePath, { recursive: true });
      await fsPromises.copyFile(localPath, destPath);
    }
    
    return destPath;
  }

  async download(remotePath: string, filename: string): Promise<string> {
    // For local storage, the file is already local
    return remotePath;
  }

  async delete(remotePath: string): Promise<void> {
    if (fs.existsSync(remotePath)) {
      await fsPromises.unlink(remotePath);
    }
  }

  async list(): Promise<string[]> {
    try {
      const files = await fsPromises.readdir(this.basePath);
      return files.filter(f => f.endsWith('.zip'));
    } catch {
      return [];
    }
  }
}

// FTP Storage Adapter
export class FTPStorageAdapter implements StorageAdapter {
  private config: StorageConfig;

  constructor(config: StorageConfig) {
    this.config = config;
  }

  private async getClient(): Promise<FTPClient> {
    const client = new FTPClient();
    await client.access({
      host: this.config.ftpHost || '',
      port: this.config.ftpPort || 21,
      user: this.config.ftpUsername || '',
      password: this.config.ftpPassword || '',
      secure: this.config.ftpSecure || false,
    });
    return client;
  }

  async upload(localPath: string, filename: string): Promise<string> {
    const client = await this.getClient();
    try {
      const remotePath = path.posix.join(this.config.ftpPath || '/', filename);
      await client.uploadFrom(localPath, remotePath);
      return remotePath;
    } finally {
      client.close();
    }
  }

  async download(remotePath: string, filename: string): Promise<string> {
    const client = await this.getClient();
    try {
      const localPath = path.join('/tmp/znode-backups', filename);
      await fsPromises.mkdir('/tmp/znode-backups', { recursive: true });
      await client.downloadTo(localPath, remotePath);
      return localPath;
    } finally {
      client.close();
    }
  }

  async delete(remotePath: string): Promise<void> {
    const client = await this.getClient();
    try {
      await client.remove(remotePath);
    } finally {
      client.close();
    }
  }

  async list(): Promise<string[]> {
    const client = await this.getClient();
    try {
      const files = await client.list(this.config.ftpPath || '/');
      return files.filter(f => f.name.endsWith('.zip')).map(f => f.name);
    } finally {
      client.close();
    }
  }
}

// SFTP Storage Adapter
export class SFTPStorageAdapter implements StorageAdapter {
  private config: StorageConfig;

  constructor(config: StorageConfig) {
    this.config = config;
  }

  private async getClient(): Promise<SFTPClient> {
    const client = new SFTPClient();
    await client.connect({
      host: this.config.ftpHost || '',
      port: this.config.ftpPort || 22,
      username: this.config.ftpUsername || '',
      password: this.config.ftpPassword || '',
    });
    return client;
  }

  async upload(localPath: string, filename: string): Promise<string> {
    const client = await this.getClient();
    try {
      const remotePath = path.posix.join(this.config.ftpPath || '/', filename);
      await client.put(localPath, remotePath);
      return remotePath;
    } finally {
      await client.end();
    }
  }

  async download(remotePath: string, filename: string): Promise<string> {
    const client = await this.getClient();
    try {
      const localPath = path.join('/tmp/znode-backups', filename);
      await fsPromises.mkdir('/tmp/znode-backups', { recursive: true });
      await client.get(remotePath, localPath);
      return localPath;
    } finally {
      await client.end();
    }
  }

  async delete(remotePath: string): Promise<void> {
    const client = await this.getClient();
    try {
      await client.delete(remotePath);
    } finally {
      await client.end();
    }
  }

  async list(): Promise<string[]> {
    const client = await this.getClient();
    try {
      const files = await client.list(this.config.ftpPath || '/');
      return files.filter(f => f.name.endsWith('.zip')).map(f => f.name);
    } finally {
      await client.end();
    }
  }
}

// Google Drive Storage Adapter (OAuth2 based)
export class GoogleDriveStorageAdapter implements StorageAdapter {
  private config: StorageConfig;
  private drive: any;
  private backupFolderId: string | null = null;
  private static readonly BACKUP_FOLDER_NAME = 'zbackup';

  constructor(config: StorageConfig) {
    this.config = config;
  }

  private async getDriveClient() {
    if (this.drive) return this.drive;

    // Use OAuth2 tokens
    if (!this.config.googleDriveRefreshToken) {
      throw new Error('Google Drive not connected. Please connect your Google account.');
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('Google OAuth credentials not configured in system settings');
    }

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
    oauth2Client.setCredentials({
      refresh_token: this.config.googleDriveRefreshToken,
      access_token: this.config.googleDriveAccessToken,
      expiry_date: this.config.googleDriveTokenExpiry?.getTime(),
    });

    this.drive = google.drive({ version: 'v3', auth: oauth2Client });
    return this.drive;
  }

  // Get or create the zbackup folder
  private async getOrCreateBackupFolder(): Promise<string> {
    if (this.backupFolderId) return this.backupFolderId;
    
    const drive = await this.getDriveClient();
    
    // Search for existing folder
    console.log('[Google Drive] Searching for zbackup folder...');
    const searchResponse = await drive.files.list({
      q: `name='${GoogleDriveStorageAdapter.BACKUP_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)',
      spaces: 'drive',
    });

    if (searchResponse.data.files && searchResponse.data.files.length > 0) {
      this.backupFolderId = searchResponse.data.files[0].id;
      console.log('[Google Drive] Found existing zbackup folder:', this.backupFolderId);
      return this.backupFolderId;
    }

    // Create new folder
    console.log('[Google Drive] Creating zbackup folder...');
    const createResponse = await drive.files.create({
      requestBody: {
        name: GoogleDriveStorageAdapter.BACKUP_FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder',
      },
      fields: 'id',
    });

    this.backupFolderId = createResponse.data.id;
    console.log('[Google Drive] Created zbackup folder:', this.backupFolderId);
    return this.backupFolderId;
  }

  async upload(localPath: string, filename: string): Promise<string> {
    console.log('[Google Drive] Starting upload...');
    console.log('[Google Drive] Local path:', localPath);
    console.log('[Google Drive] Filename:', filename);
    
    const drive = await this.getDriveClient();
    
    // Get or create the backup folder
    const folderId = await this.getOrCreateBackupFolder();

    const fileMetadata: any = {
      name: filename,
      parents: [folderId],
    };

    const media = {
      mimeType: 'application/zip',
      body: fs.createReadStream(localPath),
    };

    try {
      const response = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id',
      });
      console.log('[Google Drive] Upload successful, file ID:', response.data.id);
      return response.data.id;
    } catch (error: any) {
      console.error('[Google Drive] Upload failed:', error.message);
      console.error('[Google Drive] Error details:', error.response?.data || error);
      throw error;
    }
  }

  async download(remotePath: string, filename: string): Promise<string> {
    const drive = await this.getDriveClient();
    const localPath = path.join('/tmp/znode-backups', filename);
    await fsPromises.mkdir('/tmp/znode-backups', { recursive: true });

    const response = await drive.files.get(
      { fileId: remotePath, alt: 'media' },
      { responseType: 'stream' }
    );

    const dest = fs.createWriteStream(localPath);
    await new Promise<void>((resolve, reject) => {
      response.data
        .on('error', reject)
        .pipe(dest)
        .on('finish', resolve)
        .on('error', reject);
    });

    return localPath;
  }

  async delete(remotePath: string): Promise<void> {
    const drive = await this.getDriveClient();
    await drive.files.delete({ fileId: remotePath });
  }

  async list(): Promise<string[]> {
    const drive = await this.getDriveClient();
    
    // Get the backup folder ID
    const folderId = await this.getOrCreateBackupFolder();
    
    const query = `mimeType='application/zip' and trashed=false and '${folderId}' in parents`;

    const response = await drive.files.list({
      q: query,
      fields: 'files(id, name)',
      orderBy: 'createdTime desc',
    });

    return response.data.files?.map((f: any) => f.name) || [];
  }
}

// Factory to create storage adapters
export class StorageAdapterFactory {
  static create(config: StorageConfig): StorageAdapter {
    switch (config.storageType) {
      case 'LOCAL':
        return new LocalStorageAdapter(config);
      case 'FTP':
        return new FTPStorageAdapter(config);
      case 'SFTP':
        return new SFTPStorageAdapter(config);
      case 'GOOGLE_DRIVE':
        return new GoogleDriveStorageAdapter(config);
      default:
        return new LocalStorageAdapter(config);
    }
  }
}

// Test connection for storage adapter
export async function testStorageConnection(config: StorageConfig): Promise<{ success: boolean; error?: string }> {
  try {
    switch (config.storageType) {
      case 'LOCAL': {
        const localPath = config.localPath || '/tmp/znode-backups';
        await fsPromises.mkdir(localPath, { recursive: true });
        // Test write permission
        const testFile = path.join(localPath, '.test-write');
        await fsPromises.writeFile(testFile, 'test');
        await fsPromises.unlink(testFile);
        return { success: true };
      }
      case 'FTP': {
        const client = new FTPClient();
        await client.access({
          host: config.ftpHost || '',
          port: config.ftpPort || 21,
          user: config.ftpUsername || '',
          password: config.ftpPassword || '',
          secure: config.ftpSecure || false,
        });
        await client.list(config.ftpPath || '/');
        client.close();
        return { success: true };
      }
      case 'SFTP': {
        const client = new SFTPClient();
        await client.connect({
          host: config.ftpHost || '',
          port: config.ftpPort || 22,
          username: config.ftpUsername || '',
          password: config.ftpPassword || '',
        });
        await client.list(config.ftpPath || '/');
        await client.end();
        return { success: true };
      }
      case 'GOOGLE_DRIVE': {
        if (!config.googleDriveRefreshToken) {
          return { success: false, error: 'Google Drive not connected. Please connect your Google account.' };
        }
        
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
          return { success: false, error: 'Google OAuth not configured in system settings' };
        }

        const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
        oauth2Client.setCredentials({
          refresh_token: config.googleDriveRefreshToken,
        });
        
        const drive = google.drive({ version: 'v3', auth: oauth2Client });
        // Test by getting about info
        await drive.about.get({ fields: 'user' });
        return { success: true };
      }
      default:
        return { success: false, error: 'Unknown storage type' };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
