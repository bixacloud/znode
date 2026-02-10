import { Router, Response } from 'express';
import crypto from 'crypto';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, adminMiddleware, supportMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { sendTemplateEmail } from '../lib/email.js';
import { notifyTicketCreated, notifyTicketReplied, notifyTicketClosed } from '../lib/notification.js';
import { verifyTurnstileForService } from '../lib/turnstile.js';

const router = Router();

// ==================== USER ROUTES ====================

// Get all tickets for current user
router.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string | undefined;
    
    const where: any = { userId };
    if (status && ['OPEN', 'REPLIED', 'CLOSED'].includes(status)) {
      where.status = status;
    }
    
    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        include: {
          hosting: {
            select: {
              domain: true,
              vpUsername: true,
              status: true,
              suspendReason: true,
            },
          },
          _count: {
            select: { replies: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.ticket.count({ where }),
    ]);
    
    res.json({
      tickets,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get tickets error:', error);
    res.status(500).json({ error: 'Failed to get tickets' });
  }
});

// ==================== ADMIN ROUTES (must be before /:id to avoid conflict) ====================

// Admin get support ratings statistics
router.get('/admin/ratings', supportMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('[Admin Ratings] Fetching ratings...');
    const supportUserId = req.query.supportUserId as string | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    
    // Get all support/admin users
    const supportUsers = await prisma.user.findMany({
      where: {
        role: { in: ['SUPPORT', 'ADMIN'] },
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        role: true,
      },
    });
    console.log('[Admin Ratings] Found support users:', supportUsers.length);
    
    // Get rating statistics for each support user
    const statsPromises = supportUsers.map(async (user) => {
      const ratings = await prisma.ticketReply.findMany({
        where: {
          supportUserId: user.id,
          rating: { not: null },
        },
        select: {
          rating: true,
        },
      });
      
      const totalRatings = ratings.length;
      const avgRating = totalRatings > 0 
        ? ratings.reduce((sum, r) => sum + (r.rating || 0), 0) / totalRatings 
        : 0;
      
      // Count by rating
      const ratingCounts = [1, 2, 3, 4, 5].map(r => ({
        rating: r,
        count: ratings.filter(rating => rating.rating === r).length,
      }));
      
      return {
        user,
        totalRatings,
        avgRating: Math.round(avgRating * 10) / 10,
        ratingCounts,
      };
    });
    
    const stats = await Promise.all(statsPromises);
    
    // Get recent ratings (with pagination)
    const where: any = {
      rating: { not: null },
    };
    if (supportUserId) {
      where.supportUserId = supportUserId;
    }
    
    const [recentRatings, totalRecentRatings] = await Promise.all([
      prisma.ticketReply.findMany({
        where,
        select: {
          id: true,
          message: true,
          rating: true,
          ratingComment: true,
          ratedAt: true,
          supportUser: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          ticket: {
            select: {
              id: true,
              subject: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: { ratedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.ticketReply.count({ where }),
    ]);
    
    // Overall statistics
    const allRatings = await prisma.ticketReply.findMany({
      where: { rating: { not: null } },
      select: { rating: true },
    });
    
    console.log('[Admin Ratings] Stats:', stats.length, 'Recent:', recentRatings.length, 'All:', allRatings.length);
    
    const overallStats = {
      totalRatings: allRatings.length,
      avgRating: allRatings.length > 0 
        ? Math.round((allRatings.reduce((sum, r) => sum + (r.rating || 0), 0) / allRatings.length) * 10) / 10
        : 0,
    };
    
    res.json({
      stats,
      overallStats,
      recentRatings: recentRatings.map(r => ({
        id: r.id,
        rating: r.rating,
        ratingComment: r.ratingComment,
        ratedAt: r.ratedAt,
        message: r.message.substring(0, 100) + (r.message.length > 100 ? '...' : ''),
        supportUser: r.supportUser,
        ticket: r.ticket,
      })),
      pagination: {
        page,
        limit,
        total: totalRecentRatings,
        totalPages: Math.ceil(totalRecentRatings / limit),
      },
    });
  } catch (error) {
    console.error('Get ratings error:', error);
    res.status(500).json({ error: 'Failed to get ratings' });
  }
});

// Get single ticket with replies
router.get('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const ticketId = req.params.id as string;
    
    const ticket = await prisma.ticket.findFirst({
      where: {
        id: ticketId,
        userId,
      },
      include: {
        hosting: {
          select: {
            domain: true,
            vpUsername: true,
            status: true,
            suspendReason: true,
          },
        },
        replies: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            message: true,
            isSupport: true,
            createdAt: true,
            rating: true,
            ratingComment: true,
            ratedAt: true,
            supportUser: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                adminSignature: true,
              },
            },
          },
        },
      },
    });
    
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    res.json({ ticket });
  } catch (error) {
    console.error('Get ticket error:', error);
    res.status(500).json({ error: 'Failed to get ticket' });
  }
});

// Helper: verify tempToken for 2FA support routes (used only for initial ticket creation)
async function verify2FATempToken(tempToken: string): Promise<{ userId: string; email: string } | null> {
  try {
    const decoded = Buffer.from(tempToken, 'base64').toString();
    const [userId, timestamp] = decoded.split(':');
    
    const tokenTime = parseInt(timestamp);
    if (Date.now() - tokenTime > 30 * 60 * 1000) {
      return null;
    }
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, twoFactorEnabled: true }
    });
    
    if (!user || !user.twoFactorEnabled) {
      return null;
    }
    
    return { userId: user.id, email: user.email };
  } catch {
    return null;
  }
}

// Helper: verify supportToken for persistent 2FA ticket access
async function verifySupportToken(supportToken: string): Promise<{ userId: string; email: string; ticketId: string } | null> {
  try {
    const ticket = await prisma.ticket.findUnique({
      where: { supportToken },
      select: { 
        id: true, 
        userId: true, 
        status: true,
        user: { select: { email: true } }
      }
    });
    
    if (!ticket) return null;
    
    return { userId: ticket.userId, email: ticket.user.email, ticketId: ticket.id };
  } catch {
    return null;
  }
}

// Helper: verify either tempToken or supportToken for 2FA routes
async function verify2FAAccess(body: any): Promise<{ userId: string; email: string; ticketId?: string } | null> {
  const { tempToken, supportToken } = body;
  
  // Try supportToken first (persistent)
  if (supportToken) {
    const result = await verifySupportToken(supportToken);
    if (result) return result;
  }
  
  // Fall back to tempToken (time-limited, for initial creation)
  if (tempToken) {
    return await verify2FATempToken(tempToken);
  }
  
  return null;
}

// Create support ticket for 2FA locked users (uses tempToken instead of full auth)
router.post('/2fa-support', async (req: any, res: Response) => {
  try {
    const { subject, message, tempToken } = req.body;

    if (!tempToken) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!subject || subject.trim().length === 0) {
      return res.status(400).json({ error: 'Subject is required' });
    }

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (subject.length > 200) {
      return res.status(400).json({ error: 'Subject must be less than 200 characters' });
    }

    const verified = await verify2FATempToken(tempToken);
    if (!verified) {
      return res.status(401).json({ error: 'Session expired. Please login again.' });
    }

    // Rate limit: max 3 tickets per hour from 2FA support
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentTickets = await prisma.ticket.count({
      where: {
        userId: verified.userId,
        createdAt: { gte: oneHourAgo }
      }
    });

    if (recentTickets >= 3) {
      return res.status(429).json({ error: 'Too many tickets. Please try again later.' });
    }

    const generatedSupportToken = crypto.randomBytes(32).toString('hex');

    const ticket = await prisma.ticket.create({
      data: {
        userId: verified.userId,
        subject: `[2FA Support] ${subject.trim()}`,
        message: message.trim(),
        status: 'OPEN',
        supportToken: generatedSupportToken,
      },
      include: {
        replies: {
          include: {
            supportUser: {
              select: { id: true, name: true, email: true }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    // Create notification
    notifyTicketCreated(verified.userId, ticket.id, subject.trim()).catch(console.error);

    res.status(201).json({ 
      success: true,
      ticket,
      supportToken: generatedSupportToken,
    });
  } catch (error) {
    console.error('2FA support ticket error:', error);
    res.status(500).json({ error: 'Failed to create support ticket' });
  }
});

// Check for existing open 2FA support ticket (uses tempToken or supportToken)
router.post('/2fa-support/check', async (req: any, res: Response) => {
  try {
    const verified = await verify2FAAccess(req.body);
    if (!verified) {
      return res.status(401).json({ error: 'Session expired. Please login again.' });
    }

    // Find latest non-closed 2FA support ticket
    const ticket = await prisma.ticket.findFirst({
      where: {
        userId: verified.userId,
        subject: { startsWith: '[2FA Support]' },
        status: { in: ['OPEN', 'REPLIED'] }
      },
      orderBy: { createdAt: 'desc' },
      include: {
        replies: {
          include: {
            supportUser: {
              select: { id: true, name: true, email: true }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    // If ticket exists but has no supportToken yet, generate one
    if (ticket && !ticket.supportToken) {
      const newToken = crypto.randomBytes(32).toString('hex');
      await prisma.ticket.update({
        where: { id: ticket.id },
        data: { supportToken: newToken }
      });
      res.json({ ticket, supportToken: newToken });
    } else {
      res.json({ 
        ticket: ticket || null,
        supportToken: ticket?.supportToken || null
      });
    }
  } catch (error) {
    console.error('2FA support check error:', error);
    res.status(500).json({ error: 'Failed to check existing ticket' });
  }
});

// View 2FA support ticket (uses tempToken or supportToken)
router.post('/2fa-support/view', async (req: any, res: Response) => {
  try {
    const { ticketId } = req.body;

    if (!ticketId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const verified = await verify2FAAccess(req.body);
    if (!verified) {
      return res.status(401).json({ error: 'Session expired. Please login again.' });
    }

    const ticket = await prisma.ticket.findFirst({
      where: {
        id: ticketId,
        userId: verified.userId
      },
      include: {
        replies: {
          include: {
            supportUser: {
              select: { id: true, name: true, email: true }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    res.json({ ticket });
  } catch (error) {
    console.error('2FA support view error:', error);
    res.status(500).json({ error: 'Failed to load ticket' });
  }
});

// Reply to 2FA support ticket (uses tempToken or supportToken)
router.post('/2fa-support/reply', async (req: any, res: Response) => {
  try {
    const { ticketId, message } = req.body;

    if (!ticketId || !message?.trim()) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const verified = await verify2FAAccess(req.body);
    if (!verified) {
      return res.status(401).json({ error: 'Session expired. Please login again.' });
    }

    // Verify ticket belongs to user
    const ticket = await prisma.ticket.findFirst({
      where: {
        id: ticketId,
        userId: verified.userId
      }
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    if (ticket.status === 'CLOSED') {
      return res.status(400).json({ error: 'Cannot reply to a closed ticket' });
    }

    // Create reply
    const reply = await prisma.ticketReply.create({
      data: {
        ticketId,
        message: message.trim(),
        isSupport: false,
      },
      include: {
        supportUser: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    // Update ticket status to OPEN
    await prisma.ticket.update({
      where: { id: ticketId },
      data: { status: 'OPEN', updatedAt: new Date() }
    });

    res.json({ reply });
  } catch (error) {
    console.error('2FA support reply error:', error);
    res.status(500).json({ error: 'Failed to send reply' });
  }
});

// Create new ticket
router.post('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { subject, message, hostingId, turnstileToken } = req.body;
    
    // Verify Turnstile if required
    const turnstileResult = await verifyTurnstileForService('createTicket', turnstileToken);
    if (!turnstileResult.valid) {
      return res.status(400).json({ error: turnstileResult.error });
    }
    
    // Validate required fields
    if (!subject || subject.trim().length === 0) {
      return res.status(400).json({ error: 'Subject is required' });
    }
    
    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    // Validate subject length
    if (subject.length > 200) {
      return res.status(400).json({ error: 'Subject must be less than 200 characters' });
    }
    
    // If hostingId provided, verify it belongs to user
    if (hostingId) {
      const hosting = await prisma.hosting.findFirst({
        where: {
          id: hostingId,
          userId,
        },
      });
      
      if (!hosting) {
        return res.status(400).json({ error: 'Invalid hosting account selected' });
      }
    }
    
    const ticket = await prisma.ticket.create({
      data: {
        userId,
        hostingId: hostingId || null,
        subject: subject.trim(),
        message: message.trim(),
        status: 'OPEN',
      },
      include: {
        hosting: {
          select: {
            domain: true,
            vpUsername: true,
            status: true,
            suspendReason: true,
          },
        },
      },
    });
    
    // Create notification for ticket created
    notifyTicketCreated(userId, ticket.id, subject.trim()).catch(console.error);
    
    res.status(201).json({ ticket });
  } catch (error) {
    console.error('Create ticket error:', error);
    res.status(500).json({ error: 'Failed to create ticket' });
  }
});

// Add reply to ticket (user)
router.post('/:id/reply', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const ticketId = req.params.id as string;
    const { message, turnstileToken } = req.body;
    
    // Verify Turnstile if required
    const turnstileResult = await verifyTurnstileForService('replyTicket', turnstileToken);
    if (!turnstileResult.valid) {
      return res.status(400).json({ error: turnstileResult.error });
    }
    
    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    // Find ticket and verify ownership
    const ticket = await prisma.ticket.findFirst({
      where: {
        id: ticketId,
        userId,
      },
    });
    
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    if (ticket.status === 'CLOSED') {
      return res.status(400).json({ error: 'Cannot reply to a closed ticket' });
    }
    
    // Create reply and update ticket status
    const [reply] = await Promise.all([
      prisma.ticketReply.create({
        data: {
          ticketId,
          message: message.trim(),
          isSupport: false,
        },
      }),
      prisma.ticket.update({
        where: { id: ticketId },
        data: { 
          status: 'OPEN',
          updatedAt: new Date(),
        },
      }),
    ]);
    
    res.status(201).json({ reply });
  } catch (error) {
    console.error('Add reply error:', error);
    res.status(500).json({ error: 'Failed to add reply' });
  }
});

// Close ticket (user can close their own ticket)
router.post('/:id/close', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const ticketId = req.params.id as string;
    
    const ticket = await prisma.ticket.findFirst({
      where: {
        id: ticketId,
        userId,
      },
    });
    
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    if (ticket.status === 'CLOSED') {
      return res.status(400).json({ error: 'Ticket is already closed' });
    }
    
    await prisma.ticket.update({
      where: { id: ticketId },
      data: { status: 'CLOSED', supportToken: null },
    });
    
    // Create notification for ticket closed (by user)
    notifyTicketClosed(userId, ticketId, ticket.subject).catch(console.error);
    
    res.json({ success: true, message: 'Ticket closed successfully' });
  } catch (error) {
    console.error('Close ticket error:', error);
    res.status(500).json({ error: 'Failed to close ticket' });
  }
});

// Reopen ticket (user can reopen their own closed ticket)
router.post('/:id/reopen', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const ticketId = req.params.id as string;
    
    const ticket = await prisma.ticket.findFirst({
      where: {
        id: ticketId,
        userId,
      },
    });
    
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    if (ticket.status !== 'CLOSED') {
      return res.status(400).json({ error: 'Only closed tickets can be reopened' });
    }
    
    await prisma.ticket.update({
      where: { id: ticketId },
      data: { status: 'OPEN' },
    });
    
    res.json({ success: true, message: 'Ticket reopened successfully' });
  } catch (error) {
    console.error('Reopen ticket error:', error);
    res.status(500).json({ error: 'Failed to reopen ticket' });
  }
});

// ==================== ADMIN ROUTES ====================

// Get all tickets (admin)
router.get('/admin/all', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;
    
    const where: any = {};
    
    if (status && ['OPEN', 'REPLIED', 'CLOSED'].includes(status)) {
      where.status = status;
    }
    
    if (search) {
      where.OR = [
        { subject: { contains: search } },
        { user: { email: { contains: search } } },
        { user: { name: { contains: search } } },
      ];
    }
    
    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
          hosting: {
            select: {
              domain: true,
              vpUsername: true,
            },
          },
          _count: {
            select: { replies: true },
          },
        },
        orderBy: [
          { status: 'asc' }, // OPEN first, then REPLIED, then CLOSED
          { updatedAt: 'desc' },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.ticket.count({ where }),
    ]);
    
    res.json({
      tickets,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Admin get tickets error:', error);
    res.status(500).json({ error: 'Failed to get tickets' });
  }
});

// Get ticket stats (admin)
router.get('/admin/stats', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const [open, replied, closed, total] = await Promise.all([
      prisma.ticket.count({ where: { status: 'OPEN' } }),
      prisma.ticket.count({ where: { status: 'REPLIED' } }),
      prisma.ticket.count({ where: { status: 'CLOSED' } }),
      prisma.ticket.count(),
    ]);
    
    res.json({
      open,
      replied,
      closed,
      total,
    });
  } catch (error) {
    console.error('Admin get ticket stats error:', error);
    res.status(500).json({ error: 'Failed to get ticket stats' });
  }
});

// Get single ticket (admin)
router.get('/admin/:id', supportMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const ticketId = req.params.id as string;
    
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            avatar: true,
          },
        },
        hosting: {
          select: {
            id: true,
            domain: true,
            vpUsername: true,
            username: true,
            password: true,
            status: true,
            suspendReason: true,
            label: true,
            package: true,
            createdAt: true,
            activatedAt: true,
          },
        },
        replies: {
          orderBy: { createdAt: 'asc' },
          include: {
            supportUser: {
              select: {
                id: true,
                name: true,
                email: true,
                adminSignature: true,
              },
            },
          },
        },
      },
    });
    
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    // Get cPanel URL from MOFH config
    let cpanelUrl = 'https://cpanel.byethost.com';
    let ftpServer = 'ftpupload.net';
    
    const mofhConfig = await prisma.setting.findUnique({
      where: { key: 'MOFH_CONFIG' }
    });
    
    if (mofhConfig?.value) {
      try {
        const config = JSON.parse(mofhConfig.value);
        if (config.cpanelUrl) cpanelUrl = config.cpanelUrl;
        if (config.ftpServer) ftpServer = config.ftpServer;
      } catch (e) {
        // Use default values
      }
    }
    
    res.json({ 
      ticket,
      cpanelUrl,
      ftpServer
    });
  } catch (error) {
    console.error('Admin get ticket error:', error);
    res.status(500).json({ error: 'Failed to get ticket' });
  }
});

// Admin/Support reply to ticket
router.post('/admin/:id/reply', supportMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const ticketId = req.params.id as string;
    const { message } = req.body;
    const supportUserId = req.user!.id;
    
    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
    });
    
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    // Create reply and update ticket status to REPLIED
    const [reply] = await Promise.all([
      prisma.ticketReply.create({
        data: {
          ticketId,
          message: message.trim(),
          isSupport: true,
          supportUserId,
        },
        include: {
          supportUser: {
            select: {
              id: true,
              name: true,
              email: true,
              adminSignature: true,
            },
          },
        },
      }),
      prisma.ticket.update({
        where: { id: ticketId },
        data: { 
          status: 'REPLIED',
          updatedAt: new Date(),
        },
      }),
    ]);
    
    // Send email notification to user
    try {
      const ticketUser = await prisma.user.findUnique({ where: { id: ticket.userId } });
      if (ticketUser?.email) {
        await sendTemplateEmail('TICKET_REPLY', ticketUser.email, {
          name: ticketUser.name || ticketUser.email.split('@')[0],
          subject: ticket.subject,
          ticketId: ticket.id.slice(-8).toUpperCase(),
        }, ticketUser.id);
      }
    } catch (e) { console.error('[Ticket] Failed to send reply notification email:', e); }
    
    // Create notification for ticket replied (from support)
    notifyTicketReplied(ticket.userId, ticket.id, ticket.subject, true).catch(console.error);
    
    res.status(201).json({ reply });
  } catch (error) {
    console.error('Admin add reply error:', error);
    res.status(500).json({ error: 'Failed to add reply' });
  }
});

// Admin/Support close ticket
router.post('/admin/:id/close', supportMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const ticketId = req.params.id as string;
    
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
    });
    
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    if (ticket.status === 'CLOSED') {
      return res.status(400).json({ error: 'Ticket is already closed' });
    }
    
    await prisma.ticket.update({
      where: { id: ticketId },
      data: { status: 'CLOSED', supportToken: null },
    });
    
    // Create notification for ticket closed
    notifyTicketClosed(ticket.userId, ticket.id, ticket.subject).catch(console.error);
    
    res.json({ success: true, message: 'Ticket closed successfully' });
  } catch (error) {
    console.error('Admin close ticket error:', error);
    res.status(500).json({ error: 'Failed to close ticket' });
  }
});

// Admin/Support reopen ticket
router.post('/admin/:id/reopen', supportMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const ticketId = req.params.id as string;
    
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
    });
    
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    if (ticket.status !== 'CLOSED') {
      return res.status(400).json({ error: 'Only closed tickets can be reopened' });
    }
    
    await prisma.ticket.update({
      where: { id: ticketId },
      data: { status: 'OPEN' },
    });
    
    res.json({ success: true, message: 'Ticket reopened successfully' });
  } catch (error) {
    console.error('Admin reopen ticket error:', error);
    res.status(500).json({ error: 'Failed to reopen ticket' });
  }
});

// ==================== RATING ROUTES ====================

// User rate a support reply
router.post('/reply/:replyId/rate', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const replyId = req.params.replyId as string;
    const { rating, comment } = req.body;
    
    // Validate rating
    if (!rating || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      return res.status(400).json({ error: 'Rating must be an integer between 1 and 5' });
    }
    
    // Find the reply and verify it belongs to user's ticket
    const reply = await prisma.ticketReply.findFirst({
      where: {
        id: replyId,
        isSupport: true, // Only support replies can be rated
        ticket: {
          userId, // Must be user's ticket
        },
      },
      include: {
        ticket: true,
      },
    });
    
    if (!reply) {
      return res.status(404).json({ error: 'Reply not found or cannot be rated' });
    }
    
    if (reply.rating !== null) {
      return res.status(400).json({ error: 'This reply has already been rated' });
    }
    
    // Update the reply with rating
    const updatedReply = await prisma.ticketReply.update({
      where: { id: replyId },
      data: {
        rating,
        ratingComment: comment?.trim() || null,
        ratedAt: new Date(),
      },
    });
    
    res.json({ success: true, message: 'Rating submitted successfully', reply: updatedReply });
  } catch (error) {
    console.error('Rate reply error:', error);
    res.status(500).json({ error: 'Failed to submit rating' });
  }
});

export default router;
