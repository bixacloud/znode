import cron, { ScheduledTask } from 'node-cron';
import { prisma } from '../prisma.js';
import { createBackup, cleanOldBackups } from './backup.service.js';

interface ScheduledJob {
  configId: string;
  task: ScheduledTask;
}

const scheduledJobs: Map<string, ScheduledJob> = new Map();

// Convert schedule config to cron expression
function getCronExpression(scheduleType: string, scheduleTime: string, scheduleDays?: string): string {
  const [hour, minute] = scheduleTime.split(':').map(Number);

  if (scheduleType === 'DAILY') {
    return `${minute} ${hour} * * *`;
  }

  if (scheduleType === 'WEEKLY' && scheduleDays) {
    // scheduleDays is comma-separated days (0-6, where 0 is Sunday)
    return `${minute} ${hour} * * ${scheduleDays}`;
  }

  return `${minute} ${hour} * * *`; // Default to daily
}

// Schedule a backup job
export function scheduleBackupJob(config: {
  id: string;
  scheduleType: string;
  scheduleTime: string;
  scheduleDays?: string | null;
  includeDatabase: boolean;
  includeUploads: boolean;
}): void {
  // Remove existing job if any
  unscheduleBackupJob(config.id);

  const cronExpression = getCronExpression(
    config.scheduleType,
    config.scheduleTime,
    config.scheduleDays || undefined
  );

  console.log(`[Backup Scheduler] Scheduling backup ${config.id} with cron: ${cronExpression}`);

  const task = cron.schedule(cronExpression, async () => {
    console.log(`[Backup Scheduler] Running scheduled backup for config ${config.id}`);
    
    try {
      const result = await createBackup({
        configId: config.id,
        includeDatabase: config.includeDatabase,
        includeUploads: config.includeUploads,
        isManual: false,
      });

      if (result.success) {
        console.log(`[Backup Scheduler] Backup ${config.id} completed: ${result.filename}`);
        
        // Clean old backups
        const deletedCount = await cleanOldBackups(config.id);
        if (deletedCount > 0) {
          console.log(`[Backup Scheduler] Cleaned ${deletedCount} old backups for config ${config.id}`);
        }
      } else {
        console.error(`[Backup Scheduler] Backup ${config.id} failed: ${result.error}`);
      }
    } catch (error) {
      console.error(`[Backup Scheduler] Error running backup ${config.id}:`, error);
    }
  });

  scheduledJobs.set(config.id, { configId: config.id, task });
}

// Unschedule a backup job
export function unscheduleBackupJob(configId: string): void {
  const job = scheduledJobs.get(configId);
  if (job) {
    job.task.stop();
    scheduledJobs.delete(configId);
    console.log(`[Backup Scheduler] Unscheduled backup ${configId}`);
  }
}

// Initialize all scheduled backup jobs from database
export async function initializeBackupScheduler(): Promise<void> {
  console.log('[Backup Scheduler] Initializing backup scheduler...');

  try {
    const configs = await prisma.backupConfig.findMany({
      where: {
        isActive: true,
        scheduleEnabled: true,
        scheduleType: { not: null },
        scheduleTime: { not: null },
      },
    });

    for (const config of configs) {
      if (config.scheduleType && config.scheduleTime) {
        scheduleBackupJob({
          id: config.id,
          scheduleType: config.scheduleType,
          scheduleTime: config.scheduleTime,
          scheduleDays: config.scheduleDays,
          includeDatabase: config.includeDatabase,
          includeUploads: config.includeUploads,
        });
      }
    }

    console.log(`[Backup Scheduler] Initialized ${configs.length} scheduled backup jobs`);
  } catch (error) {
    console.error('[Backup Scheduler] Failed to initialize:', error);
  }
}

// Get scheduled jobs status
export function getScheduledJobsStatus(): { configId: string; isRunning: boolean }[] {
  return Array.from(scheduledJobs.entries()).map(([configId, job]) => ({
    configId,
    isRunning: true,
  }));
}

// Stop all scheduled jobs
export function stopAllScheduledJobs(): void {
  for (const [configId, job] of scheduledJobs) {
    job.task.stop();
  }
  scheduledJobs.clear();
  console.log('[Backup Scheduler] All scheduled jobs stopped');
}
