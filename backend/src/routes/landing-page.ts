import express, { Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, adminMiddleware, AuthenticatedRequest } from '../middleware/auth.js';

const router = express.Router();

// Get landing page for a locale (public)
router.get('/public/:locale', async (req, res: Response) => {
  try {
    const locale = req.params.locale as string;
    
    const page = await prisma.landingPage.findUnique({
      where: { locale },
      select: {
        isActive: true,
        projectData: true,
      },
    });
    
    if (!page || !page.isActive) {
      return res.json({ isActive: false });
    }
    
    res.json({
      isActive: true,
      projectData: page.projectData,
    });
  } catch (error) {
    console.error('Get public landing page error:', error);
    res.status(500).json({ error: 'Failed to get landing page' });
  }
});

// Get landing page for editing (admin)
router.get('/:locale', authMiddleware, adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const locale = req.params.locale as string;
    
    let page = await prisma.landingPage.findUnique({
      where: { locale },
    });
    
    // Return default if not exists
    if (!page) {
      return res.json({
        locale,
        projectData: getDefaultProjectData(),
        html: '',
        css: '',
        isActive: false,
      });
    }
    
    res.json(page);
  } catch (error) {
    console.error('Get landing page error:', error);
    res.status(500).json({ error: 'Failed to get landing page' });
  }
});

// Save landing page (admin)
router.put('/:locale', authMiddleware, adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const locale = req.params.locale as string;
    const { projectData, html, css, isActive } = req.body;
    
    const page = await prisma.landingPage.upsert({
      where: { locale },
      update: {
        projectData,
        html,
        css,
        isActive: isActive ?? false,
      },
      create: {
        locale,
        projectData: projectData || getDefaultProjectData(),
        html: html || '',
        css: css || '',
        isActive: isActive ?? false,
      },
    });
    
    res.json({
      success: true,
      message: 'Landing page saved successfully',
      page,
    });
  } catch (error) {
    console.error('Save landing page error:', error);
    res.status(500).json({ error: 'Failed to save landing page' });
  }
});

// Toggle landing page active status (admin)
router.patch('/:locale/toggle', authMiddleware, adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const locale = req.params.locale as string;
    
    const page = await prisma.landingPage.findUnique({
      where: { locale },
    });
    
    if (!page) {
      return res.status(404).json({ error: 'Landing page not found' });
    }
    
    const updated = await prisma.landingPage.update({
      where: { locale },
      data: { isActive: !page.isActive },
    });
    
    res.json({
      success: true,
      message: updated.isActive ? 'Custom landing page activated' : 'Default landing page activated',
      isActive: updated.isActive,
    });
  } catch (error) {
    console.error('Toggle landing page error:', error);
    res.status(500).json({ error: 'Failed to toggle landing page' });
  }
});

// Get default GrapesJS project data with landing page structure
function getDefaultProjectData() {
  return {
    assets: [],
    styles: [],
    pages: [
      {
        id: 'landing',
        component: `
          <div class="landing-page">
            <!-- Hero Section -->
            <section class="hero-section py-20 text-center bg-gradient-to-b from-violet-50 to-white dark:from-slate-900 dark:to-slate-800">
              <div class="container mx-auto px-4">
                <h1 class="text-5xl md:text-6xl font-bold mb-6 text-slate-900 dark:text-white">
                  Free Web Hosting
                  <span class="block text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-cyan-500">
                    Made Simple
                  </span>
                </h1>
                <p class="text-xl text-slate-600 dark:text-slate-300 mb-8 max-w-2xl mx-auto">
                  Get started with free hosting today. No credit card required.
                </p>
                <div class="flex justify-center gap-4">
                  <a href="/register" class="px-8 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl font-medium hover:opacity-90 transition">
                    Get Started Free
                  </a>
                  <a href="/login" class="px-8 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition">
                    Sign In
                  </a>
                </div>
              </div>
            </section>

            <!-- Features Section -->
            <section class="features-section py-20 bg-white dark:bg-slate-900">
              <div class="container mx-auto px-4">
                <h2 class="text-3xl md:text-4xl font-bold text-center mb-12 text-slate-900 dark:text-white">
                  Why Choose Us?
                </h2>
                <div class="grid md:grid-cols-3 gap-8">
                  <div class="feature-card p-6 rounded-2xl bg-slate-50 dark:bg-slate-800 text-center">
                    <div class="w-16 h-16 mx-auto mb-4 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                      <span class="text-2xl">🚀</span>
                    </div>
                    <h3 class="text-xl font-semibold mb-2 text-slate-900 dark:text-white">Fast & Reliable</h3>
                    <p class="text-slate-600 dark:text-slate-300">99.9% uptime guarantee with SSD storage for blazing fast performance.</p>
                  </div>
                  <div class="feature-card p-6 rounded-2xl bg-slate-50 dark:bg-slate-800 text-center">
                    <div class="w-16 h-16 mx-auto mb-4 rounded-xl bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center">
                      <span class="text-2xl">🔒</span>
                    </div>
                    <h3 class="text-xl font-semibold mb-2 text-slate-900 dark:text-white">Free SSL</h3>
                    <p class="text-slate-600 dark:text-slate-300">Secure your website with free Let's Encrypt SSL certificates.</p>
                  </div>
                  <div class="feature-card p-6 rounded-2xl bg-slate-50 dark:bg-slate-800 text-center">
                    <div class="w-16 h-16 mx-auto mb-4 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                      <span class="text-2xl">💰</span>
                    </div>
                    <h3 class="text-xl font-semibold mb-2 text-slate-900 dark:text-white">100% Free</h3>
                    <p class="text-slate-600 dark:text-slate-300">No hidden fees. Get 5GB storage and unlimited bandwidth for free.</p>
                  </div>
                </div>
              </div>
            </section>

            <!-- CTA Section -->
            <section class="cta-section py-20 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-center">
              <div class="container mx-auto px-4">
                <h2 class="text-3xl md:text-4xl font-bold mb-6">Ready to Get Started?</h2>
                <p class="text-xl opacity-90 mb-8 max-w-xl mx-auto">
                  Join thousands of users who trust our platform for their hosting needs.
                </p>
                <a href="/register" class="inline-block px-8 py-4 bg-white text-violet-600 rounded-xl font-medium hover:bg-slate-100 transition">
                  Create Free Account
                </a>
              </div>
            </section>
          </div>
        `,
      },
    ],
  };
}

export default router;
