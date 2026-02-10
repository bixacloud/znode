import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest, authMiddleware, adminMiddleware } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// Helper to generate slug
const generateSlug = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
};

// ==================== PUBLIC ROUTES ====================

// Helper to check if content exists for a specific language
const hasContentForLang = (item: any, lang: string, type: 'category' | 'article') => {
  // 'en' is the default language - always check main fields
  if (lang === 'en') {
    if (type === 'category') {
      return !!item.name;
    } else {
      return !!item.title && !!item.content;
    }
  }
  
  // For other languages, check translations
  const translations = item.translations as Record<string, any> | null;
  const t = translations?.[lang];
  if (type === 'category') {
    // Category has content if translation exists OR main field exists (fallback to EN)
    return !!(t?.name || item.name);
  } else {
    // Article has content if translation exists OR main fields exist (fallback to EN)
    return !!((t?.title && t?.content) || (item.title && item.content));
  }
};

// Helper to get localized content from JSON translations
const getLocalizedCategory = (cat: any, lang: string) => {
  const translations = cat.translations as Record<string, any> | null;
  const t = translations?.[lang];
  return {
    ...cat,
    name: t?.name || cat.name,
    description: t?.description || cat.description,
    // Remove translations from response to reduce payload
    translations: undefined,
  };
};

const getLocalizedArticle = (article: any, lang: string) => {
  const translations = article.translations as Record<string, any> | null;
  const t = translations?.[lang];
  return {
    ...article,
    title: t?.title || article.title,
    content: t?.content || article.content,
    excerpt: t?.excerpt || article.excerpt,
    category: article.category ? getLocalizedCategory(article.category, lang) : undefined,
    // Remove translations from response to reduce payload
    translations: undefined,
  };
};

// Get all active categories with article count
router.get('/categories', async (req, res: Response) => {
  try {
    const lang = (req.query.lang as string) || 'en';
    const includeArticles = req.query.includeArticles === 'true';
    
    const categories = await prisma.kBCategory.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
      include: {
        _count: {
          select: { articles: { where: { isActive: true } } }
        },
        articles: {
          where: { isActive: true },
          orderBy: { order: 'asc' },
          select: {
            id: true,
            title: true,
            slug: true,
            content: true,
            excerpt: true,
            views: true,
            translations: true,
            createdAt: true,
            updatedAt: true,
          }
        }
      }
    });

    // Filter categories and articles that have content for the requested language
    const filteredCategories = categories
      .filter(cat => hasContentForLang(cat, lang, 'category'))
      .map(cat => {
        const localizedCat = getLocalizedCategory(cat, lang);
        
        // Filter articles that have content for this language
        const articlesWithLang = cat.articles.filter(art => hasContentForLang(art, lang, 'article'));
        
        const result: any = {
          ...localizedCat,
          articleCount: articlesWithLang.length
        };
        
        // Include localized articles if requested
        if (includeArticles) {
          result.articles = articlesWithLang.map((art: any) => {
            const translations = art.translations as Record<string, any> | null;
            const t = translations?.[lang];
            return {
              id: art.id,
              title: t?.title || art.title,
              slug: art.slug,
              excerpt: t?.excerpt || art.excerpt,
              views: art.views,
              createdAt: art.createdAt,
              updatedAt: art.updatedAt,
            };
          });
        }
        
        return result;
      })
      // Only include categories that have at least one article (optional - remove if you want empty categories)
      .filter(cat => cat.articleCount > 0 || !includeArticles);

    res.json(filteredCategories);
  } catch (error) {
    console.error('Get KB categories error:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Get articles by category slug
router.get('/categories/:slug/articles', async (req, res: Response) => {
  try {
    const { slug } = req.params;
    const lang = (req.query.lang as string) || 'en';
    
    const category = await prisma.kBCategory.findUnique({
      where: { slug, isActive: true },
      include: {
        articles: {
          where: { isActive: true },
          orderBy: { order: 'asc' },
        }
      }
    });

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Localize response
    const localizedCategory = getLocalizedCategory(category, lang);
    const localizedArticles = category.articles.map((art: any) => ({
      id: art.id,
      title: (lang === 'vi' && art.titleVi) ? art.titleVi : art.title,
      slug: art.slug,
      excerpt: (lang === 'vi' && art.excerptVi) ? art.excerptVi : art.excerpt,
      views: art.views,
      createdAt: art.createdAt,
      updatedAt: art.updatedAt,
    }));

    res.json({
      ...localizedCategory,
      articles: localizedArticles,
    });
  } catch (error) {
    console.error('Get KB articles by category error:', error);
    res.status(500).json({ error: 'Failed to fetch articles' });
  }
});

// Get single article by slug
router.get('/articles/:slug', async (req, res: Response) => {
  try {
    const { slug } = req.params;
    const lang = (req.query.lang as string) || 'en';
    
    const article = await prisma.kBArticle.findUnique({
      where: { slug, isActive: true },
      include: {
        category: true
      }
    });

    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    // Increment view count
    await prisma.kBArticle.update({
      where: { id: article.id },
      data: { views: { increment: 1 } }
    });

    res.json(getLocalizedArticle({ ...article, views: article.views + 1 }, lang));
  } catch (error) {
    console.error('Get KB article error:', error);
    res.status(500).json({ error: 'Failed to fetch article' });
  }
});

// Search articles
router.get('/search', async (req, res: Response) => {
  try {
    const { q, lang } = req.query;
    const language = (lang as string) || 'en';
    
    if (!q || typeof q !== 'string' || q.length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    // Search in default fields and translations JSON
    const articles = await prisma.kBArticle.findMany({
      where: {
        isActive: true,
        OR: [
          { title: { contains: q } },
          { content: { contains: q } },
          { excerpt: { contains: q } },
          // Search in translations JSON (MySQL JSON search)
          { translations: { path: '$', string_contains: q } }
        ]
      },
      include: {
        category: true
      },
      orderBy: { views: 'desc' },
      take: 50
    });

    // Filter articles that have content for the requested language
    const filteredArticles = articles
      .filter(art => hasContentForLang(art, language, 'article'))
      .slice(0, 20);

    res.json(filteredArticles.map(art => getLocalizedArticle(art, language)));
  } catch (error) {
    console.error('Search KB articles error:', error);
    res.status(500).json({ error: 'Failed to search articles' });
  }
});

// Rate article helpful/not helpful
router.post('/articles/:id/rate', async (req, res: Response) => {
  try {
    const { id } = req.params;
    const { helpful } = req.body;

    if (typeof helpful !== 'boolean') {
      return res.status(400).json({ error: 'helpful must be a boolean' });
    }

    const article = await prisma.kBArticle.update({
      where: { id },
      data: helpful 
        ? { helpful: { increment: 1 } }
        : { notHelpful: { increment: 1 } }
    });

    res.json({ helpful: article.helpful, notHelpful: article.notHelpful });
  } catch (error) {
    console.error('Rate KB article error:', error);
    res.status(500).json({ error: 'Failed to rate article' });
  }
});

// ==================== ADMIN ROUTES ====================

// Get all categories (including inactive)
router.get('/admin/categories', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const categories = await prisma.kBCategory.findMany({
      orderBy: { order: 'asc' },
      include: {
        _count: {
          select: { articles: true }
        }
      }
    });

    res.json(categories.map(cat => ({
      ...cat,
      articleCount: cat._count.articles
    })));
  } catch (error) {
    console.error('Admin get KB categories error:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Get single category
router.get('/admin/categories/:id', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    
    const category = await prisma.kBCategory.findUnique({
      where: { id },
      include: {
        _count: {
          select: { articles: true }
        }
      }
    });
    
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    res.json({
      ...category,
      articleCount: category._count.articles
    });
  } catch (error) {
    console.error('Admin get KB category error:', error);
    res.status(500).json({ error: 'Failed to fetch category' });
  }
});

// Create category
router.post('/admin/categories', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    let { name, description, icon, order, isActive, translations } = req.body;

    // Fallback: if name is empty, try to get from translations (vi, en, etc.)
    if (!name || typeof name !== 'string' || !name.trim()) {
      const trans = translations as Record<string, any> | null;
      if (trans) {
        // Try to get name from any available translation
        for (const lang of ['vi', 'en', 'ja', 'ko', 'zh']) {
          if (trans[lang]?.name) {
            name = trans[lang].name;
            break;
          }
        }
      }
    }

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    let slug = generateSlug(name);
    
    // Check if slug exists
    const existing = await prisma.kBCategory.findUnique({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Date.now()}`;
    }

    const category = await prisma.kBCategory.create({
      data: {
        name: name.trim(),
        slug,
        description: description?.trim() || null,
        icon: icon || null,
        order: order ?? 0,
        isActive: isActive ?? true,
        translations: translations || null,
      }
    });

    res.status(201).json(category);
  } catch (error) {
    console.error('Create KB category error:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// Update category
router.put('/admin/categories/:id', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    let { name, description, icon, order, isActive, translations } = req.body;

    // Fallback: if name is empty, try to get from translations
    if (!name || typeof name !== 'string' || !name.trim()) {
      const trans = translations as Record<string, any> | null;
      if (trans) {
        for (const lang of ['vi', 'en', 'ja', 'ko', 'zh']) {
          if (trans[lang]?.name) {
            name = trans[lang].name;
            break;
          }
        }
      }
    }

    const existing = await prisma.kBCategory.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Category not found' });
    }

    let slug = existing.slug;
    if (name && name !== existing.name) {
      slug = generateSlug(name);
      const slugExists = await prisma.kBCategory.findFirst({
        where: { slug, id: { not: id } }
      });
      if (slugExists) {
        slug = `${slug}-${Date.now()}`;
      }
    }

    const category = await prisma.kBCategory.update({
      where: { id },
      data: {
        name: name?.trim() ?? existing.name,
        slug,
        description: description !== undefined ? (description?.trim() || null) : existing.description,
        icon: icon !== undefined ? (icon || null) : existing.icon,
        order: order ?? existing.order,
        isActive: isActive ?? existing.isActive,
        translations: translations !== undefined ? translations : existing.translations,
      }
    });

    res.json(category);
  } catch (error) {
    console.error('Update KB category error:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// Delete category
router.delete('/admin/categories/:id', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    const category = await prisma.kBCategory.findUnique({
      where: { id },
      include: { _count: { select: { articles: true } } }
    });

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Delete category and all its articles (cascade)
    await prisma.kBCategory.delete({ where: { id } });

    res.json({ success: true, deletedArticles: category._count.articles });
  } catch (error) {
    console.error('Delete KB category error:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

// Get all articles (admin)
router.get('/admin/articles', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const categoryId = req.query.categoryId as string;
    const search = req.query.search as string;

    const where: any = {};
    if (categoryId) where.categoryId = categoryId;
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { content: { contains: search } }
      ];
    }

    const [articles, total] = await Promise.all([
      prisma.kBArticle.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, slug: true } }
        },
        orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.kBArticle.count({ where })
    ]);

    res.json({
      articles,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Admin get KB articles error:', error);
    res.status(500).json({ error: 'Failed to fetch articles' });
  }
});

// Get single article (admin)
router.get('/admin/articles/:id', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    
    const article = await prisma.kBArticle.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true, slug: true } }
      }
    });

    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    res.json(article);
  } catch (error) {
    console.error('Admin get KB article error:', error);
    res.status(500).json({ error: 'Failed to fetch article' });
  }
});

// Create article
router.post('/admin/articles', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    let { categoryId, title, content, excerpt, order, isActive, translations } = req.body;

    // Fallback: if title/content is empty, try to get from translations
    const trans = translations as Record<string, any> | null;
    if (trans) {
      for (const lang of ['vi', 'en', 'ja', 'ko', 'zh']) {
        if (!title && trans[lang]?.title) {
          title = trans[lang].title;
        }
        if (!content && trans[lang]?.content) {
          content = trans[lang].content;
        }
        if (!excerpt && trans[lang]?.excerpt) {
          excerpt = trans[lang].excerpt;
        }
        if (title && content) break;
      }
    }

    if (!categoryId || !title || !content) {
      return res.status(400).json({ error: 'categoryId, title, and content are required' });
    }

    // Verify category exists
    const category = await prisma.kBCategory.findUnique({ where: { id: categoryId } });
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    let slug = generateSlug(title);
    const existing = await prisma.kBArticle.findUnique({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Date.now()}`;
    }

    const article = await prisma.kBArticle.create({
      data: {
        categoryId,
        title: title.trim(),
        slug,
        content: content.trim(),
        excerpt: excerpt?.trim() || null,
        order: order ?? 0,
        isActive: isActive ?? true,
        translations: translations || null,
      },
      include: {
        category: { select: { id: true, name: true, slug: true } }
      }
    });

    res.status(201).json(article);
  } catch (error) {
    console.error('Create KB article error:', error);
    res.status(500).json({ error: 'Failed to create article' });
  }
});

// Update article
router.put('/admin/articles/:id', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    let { categoryId, title, content, excerpt, order, isActive, translations } = req.body;

    // Fallback: if title/content is empty, try to get from translations
    const trans = translations as Record<string, any> | null;
    if (trans) {
      for (const lang of ['vi', 'en', 'ja', 'ko', 'zh']) {
        if (!title && trans[lang]?.title) {
          title = trans[lang].title;
        }
        if (!content && trans[lang]?.content) {
          content = trans[lang].content;
        }
        if (!excerpt && trans[lang]?.excerpt) {
          excerpt = trans[lang].excerpt;
        }
        if (title && content) break;
      }
    }

    const existing = await prisma.kBArticle.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Article not found' });
    }

    // If categoryId changed, verify it exists
    if (categoryId && categoryId !== existing.categoryId) {
      const category = await prisma.kBCategory.findUnique({ where: { id: categoryId } });
      if (!category) {
        return res.status(404).json({ error: 'Category not found' });
      }
    }

    let slug = existing.slug;
    if (title && title !== existing.title) {
      slug = generateSlug(title);
      const slugExists = await prisma.kBArticle.findFirst({
        where: { slug, id: { not: id } }
      });
      if (slugExists) {
        slug = `${slug}-${Date.now()}`;
      }
    }

    const article = await prisma.kBArticle.update({
      where: { id },
      data: {
        categoryId: categoryId ?? existing.categoryId,
        title: title?.trim() ?? existing.title,
        slug,
        content: content?.trim() ?? existing.content,
        excerpt: excerpt !== undefined ? (excerpt?.trim() || null) : existing.excerpt,
        order: order ?? existing.order,
        isActive: isActive ?? existing.isActive,
        translations: translations !== undefined ? translations : existing.translations,
      },
      include: {
        category: { select: { id: true, name: true, slug: true } }
      }
    });

    res.json(article);
  } catch (error) {
    console.error('Update KB article error:', error);
    res.status(500).json({ error: 'Failed to update article' });
  }
});

// Delete article
router.delete('/admin/articles/:id', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    const article = await prisma.kBArticle.findUnique({ where: { id } });
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    await prisma.kBArticle.delete({ where: { id } });

    res.json({ success: true });
  } catch (error) {
    console.error('Delete KB article error:', error);
    res.status(500).json({ error: 'Failed to delete article' });
  }
});

// Bulk import articles
router.post('/admin/import', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { categories } = req.body;

    if (!Array.isArray(categories)) {
      return res.status(400).json({ error: 'categories must be an array' });
    }

    let totalCategories = 0;
    let totalArticles = 0;

    for (const cat of categories) {
      if (!cat.name || !Array.isArray(cat.articles)) continue;

      let slug = generateSlug(cat.name);
      const existingCat = await prisma.kBCategory.findUnique({ where: { slug } });
      
      let category;
      if (existingCat) {
        category = existingCat;
      } else {
        category = await prisma.kBCategory.create({
          data: {
            name: cat.name,
            slug,
            description: cat.description || null,
            icon: cat.icon || null,
            order: totalCategories,
          }
        });
        totalCategories++;
      }

      for (const article of cat.articles) {
        if (!article.title || !article.content) continue;

        let articleSlug = generateSlug(article.title);
        const existingArticle = await prisma.kBArticle.findUnique({ where: { slug: articleSlug } });
        
        if (!existingArticle) {
          await prisma.kBArticle.create({
            data: {
              categoryId: category.id,
              title: article.title,
              slug: articleSlug,
              content: article.content,
              excerpt: article.excerpt || null,
              order: totalArticles,
            }
          });
          totalArticles++;
        }
      }
    }

    res.json({ 
      success: true, 
      imported: { categories: totalCategories, articles: totalArticles } 
    });
  } catch (error) {
    console.error('Import KB articles error:', error);
    res.status(500).json({ error: 'Failed to import articles' });
  }
});

// Reorder categories
router.post('/admin/categories/reorder', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orders } = req.body; // Array of { id, order }

    if (!Array.isArray(orders)) {
      return res.status(400).json({ error: 'orders must be an array' });
    }

    await Promise.all(
      orders.map(({ id, order }) =>
        prisma.kBCategory.update({ where: { id }, data: { order } })
      )
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Reorder KB categories error:', error);
    res.status(500).json({ error: 'Failed to reorder categories' });
  }
});

// Reorder articles
router.post('/admin/articles/reorder', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orders } = req.body; // Array of { id, order }

    if (!Array.isArray(orders)) {
      return res.status(400).json({ error: 'orders must be an array' });
    }

    await Promise.all(
      orders.map(({ id, order }) =>
        prisma.kBArticle.update({ where: { id }, data: { order } })
      )
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Reorder KB articles error:', error);
    res.status(500).json({ error: 'Failed to reorder articles' });
  }
});

export default router;
