import { Router, Response } from 'express';
import prisma from '../lib/prisma.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get notifications for current user
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const unreadOnly = req.query.unread === 'true';

    const where: any = { userId };
    if (unreadOnly) {
      where.isRead = false;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    // Parse metadata JSON
    const parsedNotifications = notifications.map(n => ({
      ...n,
      metadata: n.metadata ? JSON.parse(n.metadata) : null,
    }));

    res.json({
      notifications: parsedNotifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      unreadCount,
    });
  } catch (error: any) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to get notifications' });
  }
});

// Get unread count only (for badge)
router.get('/unread-count', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const count = await prisma.notification.count({
      where: { userId, isRead: false },
    });
    res.json({ count });
  } catch (error: any) {
    console.error('Get unread count error:', error);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
});

// Get recent notifications (for popup)
router.get('/recent', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const limit = parseInt(req.query.limit as string) || 5;

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    const parsedNotifications = notifications.map(n => ({
      ...n,
      metadata: n.metadata ? JSON.parse(n.metadata) : null,
    }));

    res.json({
      notifications: parsedNotifications,
      unreadCount,
    });
  } catch (error: any) {
    console.error('Get recent notifications error:', error);
    res.status(500).json({ error: 'Failed to get recent notifications' });
  }
});

// Mark notification as read
router.put('/:id/read', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const id = req.params.id as string;

    const notification = await prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// Mark all as read
router.put('/read-all', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
});

// Delete notification
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const id = req.params.id as string;

    const notification = await prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    await prisma.notification.delete({
      where: { id },
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Delete notification error:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

// Delete all read notifications
router.delete('/clear-read', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const result = await prisma.notification.deleteMany({
      where: { userId, isRead: true },
    });

    res.json({ success: true, count: result.count });
  } catch (error: any) {
    console.error('Clear read notifications error:', error);
    res.status(500).json({ error: 'Failed to clear read notifications' });
  }
});

export default router;
