import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { sendTemplateEmail } from '../lib/email.js';
import { notifyHostingActivated, notifyHostingSuspended, notifyHostingReactivated, notifyHostingDeleted, notifyTicketReplied } from '../lib/notification.js';

const router = Router();

// Multer setup for parsing multipart/form-data (MOFH sends callbacks as multipart)
const upload = multer();

// Callback log file path
const CALLBACK_LOG_PATH = path.join(process.cwd(), 'logs', 'mofh_callback.json');

// Ensure logs directory exists
function ensureLogsDir() {
  const logsDir = path.dirname(CALLBACK_LOG_PATH);
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
}

// Save callback to log file
function saveCallbackLog(data: { username: string; status: string; comments: string }) {
  ensureLogsDir();
  
  let callbacks: any[] = [];
  
  if (fs.existsSync(CALLBACK_LOG_PATH)) {
    try {
      const content = fs.readFileSync(CALLBACK_LOG_PATH, 'utf-8');
      callbacks = JSON.parse(content) || [];
    } catch (e) {
      callbacks = [];
    }
  }
  
  callbacks.push({
    username: data.username,
    status: data.status,
    comments: data.comments,
    time: new Date().toISOString(),
  });
  
  fs.writeFileSync(CALLBACK_LOG_PATH, JSON.stringify(callbacks, null, 2));
  console.log(`[MOFH] Saved callback to log: ${data.username} - ${data.status}`);
}

// Get SQL server from callback history for a username
function getSqlServerFromHistory(username: string): string | null {
  if (!fs.existsSync(CALLBACK_LOG_PATH)) {
    return null;
  }
  
  try {
    const content = fs.readFileSync(CALLBACK_LOG_PATH, 'utf-8');
    const callbacks = JSON.parse(content) || [];
    
    // Find the latest SQL callback for this username
    let sqlServer: string | null = null;
    for (const callback of callbacks) {
      if (callback.username === username && 
          callback.status && 
          callback.status.substring(0, 3) === 'sql') {
        sqlServer = callback.status;
      }
    }
    
    return sqlServer;
  } catch (e) {
    return null;
  }
}

// MOFH Callback Types
type MOFHCallbackStatus = 
  | 'ACTIVATED'
  | 'SUSPENDED'
  | 'REACTIVATE'
  | 'DELETE'
  | 'CLIENTPARKADD'
  | 'CLIENTSUBADD'
  | 'CLIENTDOMADD'
  | 'CLIENTPARKREM'
  | 'CLIENTSUBDEL'
  | 'CLIENTDOMREM'
  | string; // For SQL_SERVER (sql_cluster_id) and other cases

interface MOFHHostingCallback {
  username: string;
  status: MOFHCallbackStatus;
  comments: string;
}

interface MOFHTicketCallback {
  callback_type: 'ticket';
  ticket_id: string;
  support_reply: string;
  ticket_status: 'S' | 'C'; // S = Support Reply, C = Closed
}

// Callback endpoint - receives POST from MOFH
// MOFH sends data as multipart/form-data, so we use multer to parse it
router.post('/callback', upload.none(), async (req: Request, res: Response) => {
  try {
    // Log all possible data sources
    console.log('[MOFH Callback] Content-Type:', req.headers['content-type']);
    console.log('[MOFH Callback] Body:', JSON.stringify(req.body, null, 2));
    console.log('[MOFH Callback] Query:', JSON.stringify(req.query, null, 2));
    
    // Try to get data from body first, then query params
    let data = req.body && Object.keys(req.body).length > 0 ? req.body : req.query;
    
    // If body is a string (raw body), try to parse it
    if (typeof req.body === 'string' && req.body.length > 0) {
      try {
        const parsed = new URLSearchParams(req.body);
        data = Object.fromEntries(parsed.entries());
        console.log('[MOFH Callback] Parsed from raw string:', JSON.stringify(data, null, 2));
      } catch (e) {
        console.log('[MOFH Callback] Failed to parse raw body');
      }
    }
    
    console.log('[MOFH Callback] Using data:', JSON.stringify(data, null, 2));
    
    // Skip if no data
    if (!data || !data.username) {
      console.log('[MOFH Callback] No username in callback data, skipping');
      return res.status(200).json({ success: false, message: 'No username provided' });
    }

    // Check if it's a ticket callback
    if (data.callback_type === 'ticket') {
      const ticketCallback = data as MOFHTicketCallback;
      await handleTicketCallback(ticketCallback);
    } else {
      // It's a hosting account callback
      const hostingCallback = data as MOFHHostingCallback;
      await handleHostingCallback(hostingCallback);
    }

    // Always return 200 to acknowledge receipt
    res.status(200).json({ success: true, message: 'Callback received' });
  } catch (error) {
    console.error('[MOFH Callback] Error:', error);
    // Still return 200 to prevent MOFH from retrying
    res.status(200).json({ success: false, message: 'Error processing callback' });
  }
});

// Handle hosting account callbacks
async function handleHostingCallback(callback: MOFHHostingCallback) {
  const { username, status, comments } = callback;
  
  console.log(`[MOFH] Hosting callback - Username: ${username}, Status: ${status}, Comments: ${comments}`);

  // Save callback to log file first
  saveCallbackLog({ username, status: status || '', comments: comments || '' });

  // Find hosting account by vpanel username
  const hosting = await prisma.hosting.findFirst({
    where: { vpUsername: username },
  });

  if (!hosting) {
    console.log(`[MOFH] Hosting not found for username: ${username}`);
    return;
  }

  // Get SQL server from callback history
  const sqlServerFromHistory = getSqlServerFromHistory(username);
  
  // Update SQL server if found in history and not already set
  if (sqlServerFromHistory && hosting.sqlCluster !== sqlServerFromHistory) {
    await prisma.hosting.update({
      where: { id: hosting.id },
      data: { sqlCluster: sqlServerFromHistory },
    });
    console.log(`[MOFH] Updated SQL server from history: ${sqlServerFromHistory} for ${username}`);
  }

  // Check if current status is SQL server (starts with 'sql')
  if (status && status.substring(0, 3) === 'sql') {
    await prisma.hosting.update({
      where: { id: hosting.id },
      data: { 
        sqlCluster: status, // status contains the sql_server like 'sql310'
      },
    });
    console.log(`[MOFH] SQL Server ${status} added to ${username}`);
    return;
  }

  switch (status) {
    case 'ACTIVATED':
      // Account activated - also update SQL server from history if available
      const sqlServer = getSqlServerFromHistory(username);
      await prisma.hosting.update({
        where: { id: hosting.id },
        data: { 
          status: 'ACTIVE',
          activatedAt: new Date(),
          ...(sqlServer && { sqlCluster: sqlServer }),
        },
      });
      console.log(`[MOFH] Account ${username} activated${sqlServer ? ` with SQL server ${sqlServer}` : ''}`);
      
      // Send activation email
      try {
        const userForEmail = await prisma.user.findUnique({ where: { id: hosting.userId } });
        if (userForEmail?.email) {
          await sendTemplateEmail('HOSTING_ACTIVATED', userForEmail.email, {
            name: userForEmail.name || userForEmail.email.split('@')[0],
            domain: hosting.domain,
            username: hosting.vpUsername,
          }, userForEmail.id);
        }
      } catch (e) { console.error('[MOFH] Failed to send activation email:', e); }
      
      // Create notification for hosting activated
      notifyHostingActivated(hosting.userId, hosting.domain, hosting.vpUsername).catch(console.error);
      break;

    case 'SUSPENDED':
      // Account suspended
      // Check if it was already suspended by admin - keep the admin prefix
      const existingHostingForSuspend = await prisma.hosting.findUnique({
        where: { id: hosting.id },
        select: { suspendReason: true },
      });
      const wasAdminSuspended = existingHostingForSuspend?.suspendReason?.startsWith('[BY ADMIN]');
      const newSuspendReason = wasAdminSuspended 
        ? existingHostingForSuspend?.suspendReason  // Keep admin reason
        : (comments || 'Unknown'); // Use callback reason
      
      await prisma.hosting.update({
        where: { id: hosting.id },
        data: { 
          status: 'SUSPENDED',
          suspendReason: newSuspendReason,
          suspendedAt: new Date(),
        },
      });
      console.log(`[MOFH] Account ${username} suspended: ${newSuspendReason}`);
      
      // Send suspension email (only if not suspended by admin - admin handles their own notification)
      if (!wasAdminSuspended) {
        try {
          const userForSuspend = await prisma.user.findUnique({ where: { id: hosting.userId } });
          if (userForSuspend?.email) {
            await sendTemplateEmail('HOSTING_SUSPENDED', userForSuspend.email, {
              name: userForSuspend.name || userForSuspend.email.split('@')[0],
              domain: hosting.domain,
              reason: newSuspendReason || 'Terms of Service violation',
            }, userForSuspend.id);
          }
        } catch (e) { console.error('[MOFH] Failed to send suspension email:', e); }
        
        // Create notification for hosting suspended
        notifyHostingSuspended(hosting.userId, hosting.domain, hosting.vpUsername, newSuspendReason || 'Unknown').catch(console.error);
      }
      break;

    case 'REACTIVATE':
      // Account reactivated
      await prisma.hosting.update({
        where: { id: hosting.id },
        data: { 
          status: 'ACTIVE',
          suspendReason: null,
          suspendedAt: null,
        },
      });
      console.log(`[MOFH] Account ${username} reactivated`);
      
      // Send reactivation email
      try {
        const userForReactivate = await prisma.user.findUnique({ where: { id: hosting.userId } });
        if (userForReactivate?.email) {
          await sendTemplateEmail('HOSTING_REACTIVATED', userForReactivate.email, {
            name: userForReactivate.name || userForReactivate.email.split('@')[0],
            domain: hosting.domain,
          }, userForReactivate.id);
        }
      } catch (e) { console.error('[MOFH] Failed to send reactivation email:', e); }
      
      // Create notification for hosting reactivated
      notifyHostingReactivated(hosting.userId, hosting.domain, hosting.vpUsername).catch(console.error);
      break;

    case 'DELETE':
      // Account deleted
      await prisma.hosting.update({
        where: { id: hosting.id },
        data: { 
          status: 'DELETED',
          deletedAt: new Date(),
        },
      });
      console.log(`[MOFH] Account ${username} deleted`);
      
      // Create notification for hosting deleted
      notifyHostingDeleted(hosting.userId, hosting.domain, hosting.vpUsername).catch(console.error);
      break;

    default:
      // Check for domain callbacks
      if (['CLIENTPARKADD', 'CLIENTSUBADD', 'CLIENTDOMADD', 
           'CLIENTPARKREM', 'CLIENTSUBDEL', 'CLIENTDOMREM'].includes(status)) {
        console.log(`[MOFH] Domain event ${status} for ${username}: ${comments}`);
        // You can add domain tracking logic here if needed
      } else {
        console.log(`[MOFH] Unknown status ${status} for ${username}: ${comments}`);
      }
      break;
  }
}

// Handle ticket callbacks
async function handleTicketCallback(callback: MOFHTicketCallback) {
  const { ticket_id, support_reply, ticket_status } = callback;
  
  console.log(`[MOFH] Ticket callback - ID: ${ticket_id}, Status: ${ticket_status}`);

  // Find ticket by MOFH ticket ID
  const ticket = await prisma.ticket.findFirst({
    where: { mofhTicketId: ticket_id },
  });

  if (!ticket) {
    console.log(`[MOFH] Ticket not found for ID: ${ticket_id}`);
    return;
  }

  // Add support reply to ticket
  await prisma.ticketReply.create({
    data: {
      ticketId: ticket.id,
      message: support_reply,
      isSupport: true,
    },
  });

  // Update ticket status
  if (ticket_status === 'C') {
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: { status: 'CLOSED' },
    });
    console.log(`[MOFH] Ticket ${ticket_id} closed`);
  } else {
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: { status: 'REPLIED' },
    });
    console.log(`[MOFH] Ticket ${ticket_id} replied`);
  }
}

// Get callback logs (for debugging)
router.get('/callback-logs', async (req: Request, res: Response) => {
  try {
    const { username } = req.query;
    
    if (!fs.existsSync(CALLBACK_LOG_PATH)) {
      return res.json({ logs: [] });
    }
    
    const content = fs.readFileSync(CALLBACK_LOG_PATH, 'utf-8');
    let logs = JSON.parse(content) || [];
    
    // Filter by username if provided
    if (username) {
      logs = logs.filter((log: any) => log.username === username);
    }
    
    // Return last 100 logs
    res.json({ logs: logs.slice(-100) });
  } catch (error) {
    console.error('[MOFH] Error getting callback logs:', error);
    res.status(500).json({ error: 'Failed to get callback logs' });
  }
});

// Manually sync SQL server from callback history
router.post('/sync-sql/:username', async (req: Request, res: Response) => {
  try {
    const username = req.params.username as string;
    
    const hosting = await prisma.hosting.findFirst({
      where: { vpUsername: username },
    });
    
    if (!hosting) {
      return res.status(404).json({ error: 'Hosting not found' });
    }
    
    const sqlServer = getSqlServerFromHistory(username);
    
    if (sqlServer) {
      await prisma.hosting.update({
        where: { id: hosting.id },
        data: { sqlCluster: sqlServer },
      });
      
      return res.json({ 
        success: true, 
        message: `SQL server updated to ${sqlServer}`,
        sqlServer,
      });
    }
    
    res.json({ 
      success: false, 
      message: 'No SQL server found in callback history',
    });
  } catch (error) {
    console.error('[MOFH] Error syncing SQL server:', error);
    res.status(500).json({ error: 'Failed to sync SQL server' });
  }
});

export default router;
