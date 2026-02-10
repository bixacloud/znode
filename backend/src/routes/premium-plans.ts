import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, adminMiddleware, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// ============= PUBLIC ROUTES =============

// Get all active plans (public)
router.get('/public', async (req, res: Response) => {
  try {
    const plans = await prisma.premiumPlan.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
    });
    res.json(plans);
  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
});

// ============= ADMIN ROUTES =============

// Get all plans (admin)
router.get('/admin', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const plans = await prisma.premiumPlan.findMany({
      orderBy: { order: 'asc' },
    });
    res.json(plans);
  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
});

// Create plan (admin)
router.post('/admin', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      name,
      slug,
      description,
      price,
      currency,
      billingCycle,
      features,
      specs,
      affiliateUrl,
      isPopular,
      isActive,
      order,
      translations,
    } = req.body;

    // Validate required fields
    if (!name || !slug || price === undefined) {
      return res.status(400).json({ error: 'Name, slug and price are required' });
    }

    // Check if slug exists
    const existing = await prisma.premiumPlan.findUnique({ where: { slug } });
    if (existing) {
      return res.status(400).json({ error: 'Slug already exists' });
    }

    const plan = await prisma.premiumPlan.create({
      data: {
        name,
        slug,
        description,
        price: parseFloat(price),
        currency: currency || 'USD',
        billingCycle: billingCycle || 'monthly',
        features,
        specs,
        affiliateUrl,
        isPopular: isPopular || false,
        isActive: isActive !== false,
        order: order || 0,
        translations,
      },
    });

    res.status(201).json(plan);
  } catch (error) {
    console.error('Error creating plan:', error);
    res.status(500).json({ error: 'Failed to create plan' });
  }
});

// Update plan (admin)
router.put('/admin/:id', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const {
      name,
      slug,
      description,
      price,
      currency,
      billingCycle,
      features,
      specs,
      affiliateUrl,
      isPopular,
      isActive,
      order,
      translations,
    } = req.body;

    // Check if plan exists
    const existing = await prisma.premiumPlan.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    // Check if slug is taken by another plan
    if (slug && slug !== existing.slug) {
      const slugExists = await prisma.premiumPlan.findUnique({ where: { slug } });
      if (slugExists) {
        return res.status(400).json({ error: 'Slug already exists' });
      }
    }

    const plan = await prisma.premiumPlan.update({
      where: { id },
      data: {
        name,
        slug,
        description,
        price: price !== undefined ? parseFloat(price) : undefined,
        currency,
        billingCycle,
        features,
        specs,
        affiliateUrl,
        isPopular,
        isActive,
        order,
        translations,
      },
    });

    res.json(plan);
  } catch (error) {
    console.error('Error updating plan:', error);
    res.status(500).json({ error: 'Failed to update plan' });
  }
});

// Delete plan (admin)
router.delete('/admin/:id', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    await prisma.premiumPlan.delete({ where: { id } });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting plan:', error);
    res.status(500).json({ error: 'Failed to delete plan' });
  }
});

// Reorder plans (admin)
router.post('/admin/reorder', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orders } = req.body; // Array of { id, order }

    if (!Array.isArray(orders)) {
      return res.status(400).json({ error: 'Invalid orders array' });
    }

    await prisma.$transaction(
      orders.map((item: { id: string; order: number }) =>
        prisma.premiumPlan.update({
          where: { id: item.id },
          data: { order: item.order },
        })
      )
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error reordering plans:', error);
    res.status(500).json({ error: 'Failed to reorder plans' });
  }
});

export default router;
