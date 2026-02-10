import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest, authMiddleware, adminMiddleware, optionalAuthMiddleware } from '../middleware/auth.js';

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

// Helper to get unique slug
const getUniqueSlug = async (base: string): Promise<string> => {
  let slug = generateSlug(base);
  let count = 0;
  while (await prisma.forumPost.findUnique({ where: { slug } })) {
    count++;
    slug = `${generateSlug(base)}-${count}`;
  }
  return slug;
};

// ==================== PUBLIC / USER ROUTES ====================

// Get all channels with post counts
router.get('/channels', async (req, res: Response) => {
  try {
    const channels = await prisma.forumChannel.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
      include: {
        _count: { select: { posts: true } },
        tags: { orderBy: { order: 'asc' } },
      },
    });
    res.json(channels);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch channels' });
  }
});

// Get single channel by slug
router.get('/channels/:slug', async (req, res: Response) => {
  try {
    const slug = req.params.slug as string;
    const channel = await prisma.forumChannel.findUnique({
      where: { slug },
      include: {
        _count: { select: { posts: true } },
        tags: { orderBy: { order: 'asc' } },
      },
    });
    if (!channel) return res.status(404).json({ error: 'Channel not found' });
    res.json(channel);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch channel' });
  }
});

// Get posts feed (all channels or filtered)
router.get('/posts', optionalAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const channel = req.query.channel as string | undefined;
    const tag = req.query.tag as string | undefined;
    const sort = (req.query.sort as string) || 'latest';
    const search = req.query.search as string | undefined;
    const page = parseInt((req.query.page as string) || '1');
    const limit = parseInt((req.query.limit as string) || '20');
    const skip = (page - 1) * Math.min(limit, 50);
    const take = Math.min(limit, 50);

    const where: any = {};
    if (channel) {
      const ch = await prisma.forumChannel.findUnique({ where: { slug: channel } });
      if (ch) where.channelId = ch.id;
    }
    if (tag) {
      where.tags = { some: { tag: { slug: tag } } };
    }
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { content: { contains: search } },
      ];
    }

    let orderBy: any;
    switch (sort) {
      case 'newest':
        orderBy = { createdAt: 'desc' };
        break;
      case 'top':
        orderBy = { views: 'desc' };
        break;
      case 'trending':
        orderBy = { commentCount: 'desc' };
        break;
      default:
        orderBy = { lastActivityAt: 'desc' };
    }

    const [posts, total] = await Promise.all([
      prisma.forumPost.findMany({
        where,
        orderBy: [{ isPinned: 'desc' }, orderBy],
        skip,
        take,
        include: {
          author: { select: { id: true, name: true, avatar: true, role: true, adminSignature: true } },
          channel: { select: { id: true, name: true, slug: true, icon: true, color: true, translations: true } },
          tags: { include: { tag: true } },
          _count: { select: { comments: true, reactions: true, upvotes: true } },
          comments: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              id: true,
              createdAt: true,
              author: { select: { id: true, name: true, avatar: true } },
            },
          },
        },
      }),
      prisma.forumPost.count({ where }),
    ]);

    // Get user-specific data separately if logged in
    let userReactionsMap: Record<string, string[]> = {};
    let userUpvotesSet: Set<string> = new Set();
    if (req.user) {
      const postIds = posts.map(p => p.id);
      const [reactions, upvotes] = await Promise.all([
        prisma.forumReaction.findMany({
          where: { postId: { in: postIds }, userId: req.user.id },
          select: { postId: true, emoji: true },
        }),
        prisma.forumUpvote.findMany({
          where: { postId: { in: postIds }, userId: req.user.id },
          select: { postId: true },
        }),
      ]);
      reactions.forEach(r => {
        if (!userReactionsMap[r.postId!]) userReactionsMap[r.postId!] = [];
        userReactionsMap[r.postId!].push(r.emoji);
      });
      upvotes.forEach(u => userUpvotesSet.add(u.postId!));
    }

    const formattedPosts = posts.map(post => ({
      ...post,
      lastComment: post.comments?.[0] || null,
      comments: undefined,
      userReactions: userReactionsMap[post.id] || [],
      hasUpvoted: userUpvotesSet.has(post.id),
    }));

    res.json({
      posts: formattedPosts,
      total,
      page,
      totalPages: Math.ceil(total / take),
    });
  } catch (error: any) {
    console.error('Failed to fetch posts:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// Get single post by ID
router.get('/posts/:id', optionalAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const post = await prisma.forumPost.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, name: true, avatar: true, role: true, createdAt: true, adminSignature: true } },
        channel: { select: { id: true, name: true, slug: true, icon: true, color: true, translations: true } },
        tags: { include: { tag: true } },
        _count: { select: { comments: true, reactions: true, upvotes: true } },
      },
    });
    if (!post) return res.status(404).json({ error: 'Post not found' });

    // Increment views
    await prisma.forumPost.update({
      where: { id: post.id },
      data: { views: { increment: 1 } },
    });

    // Get user-specific data
    let userReactions: string[] = [];
    let hasUpvoted = false;
    let isSubscribed = false;
    if (req.user) {
      const reactions = await prisma.forumReaction.findMany({
        where: { postId: post.id, userId: req.user.id },
        select: { emoji: true },
      });
      userReactions = reactions.map(r => r.emoji);
      const upvote = await prisma.forumUpvote.findUnique({
        where: { userId_postId: { userId: req.user.id, postId: post.id } },
      });
      hasUpvoted = !!upvote;
      const sub = await prisma.forumSubscription.findUnique({
        where: { userId_postId: { userId: req.user.id, postId: post.id } },
      });
      isSubscribed = !!sub;
    }

    // Get reaction summary
    const reactionCounts = await prisma.forumReaction.groupBy({
      by: ['emoji'],
      where: { postId: post.id },
      _count: { emoji: true },
    });

    res.json({
      ...post,
      views: post.views + 1,
      userReactions,
      hasUpvoted,
      isSubscribed,
      reactionSummary: reactionCounts.map(r => ({ emoji: r.emoji, count: r._count.emoji })),
    });
  } catch (error: any) {
    console.error('Failed to fetch post:', error);
    res.status(500).json({ error: 'Failed to fetch post' });
  }
});

// Create post (authenticated)
router.post('/posts', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, content, channelId, tagIds } = req.body;
    if (!title || !content || !channelId) {
      return res.status(400).json({ error: 'Title, content and channel are required' });
    }

    const channel = await prisma.forumChannel.findUnique({ where: { id: channelId } });
    if (!channel || !channel.isActive || !channel.allowPosts) {
      return res.status(400).json({ error: 'Cannot post to this channel' });
    }

    const slug = await getUniqueSlug(title);
    const post = await prisma.forumPost.create({
      data: {
        title,
        slug,
        content,
        authorId: req.user!.id,
        channelId,
        tags: tagIds?.length ? {
          create: tagIds.map((tagId: string) => ({ tagId })),
        } : undefined,
      },
      include: {
        author: { select: { id: true, name: true, avatar: true, role: true, adminSignature: true } },
        channel: { select: { id: true, name: true, slug: true, icon: true, color: true } },
        tags: { include: { tag: true } },
      },
    });

    // Auto-subscribe author
    await prisma.forumSubscription.create({
      data: { userId: req.user!.id, postId: post.id },
    });

    res.status(201).json(post);
  } catch (error: any) {
    console.error('Failed to create post:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
  }
);

// Update post (author or admin)
router.put('/posts/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const post = await prisma.forumPost.findUnique({ where: { id } });
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.authorId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const { title, content, tagIds } = req.body;
    const updateData: any = {};
    if (title) updateData.title = title;
    if (content) updateData.content = content;

    const updated = await prisma.forumPost.update({
      where: { id },
      data: updateData,
      include: {
        author: { select: { id: true, name: true, avatar: true, role: true, adminSignature: true } },
        channel: { select: { id: true, name: true, slug: true, icon: true, color: true } },
        tags: { include: { tag: true } },
      },
    });

    // Update tags if provided
    if (tagIds !== undefined) {
      await prisma.forumPostTag.deleteMany({ where: { postId: post.id } });
      if (tagIds.length > 0) {
        await prisma.forumPostTag.createMany({
          data: tagIds.map((tagId: string) => ({ postId: post.id, tagId })),
        });
      }
    }

    res.json(updated);
  } catch (error: any) {
    console.error('Failed to update post:', error);
    res.status(500).json({ error: 'Failed to update post' });
  }
});

// Delete post (author or admin)
router.delete('/posts/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const post = await prisma.forumPost.findUnique({ where: { id } });
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.authorId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    await prisma.forumPost.delete({ where: { id } });
    res.json({ message: 'Post deleted' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

// ==================== COMMENTS ====================

// Get comments for a post
router.get('/posts/:id/comments', optionalAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const postId = req.params.id as string;
    const sort = (req.query.sort as string) || 'oldest';
    const orderBy = sort === 'newest' ? { createdAt: 'desc' as const } : { createdAt: 'asc' as const };

    const comments = await prisma.forumComment.findMany({
      where: { postId, parentId: null },
      orderBy,
      include: {
        author: { select: { id: true, name: true, avatar: true, role: true, adminSignature: true } },
        replies: {
          orderBy: { createdAt: 'asc' },
          include: {
            author: { select: { id: true, name: true, avatar: true, role: true, adminSignature: true } },
            reactions: true,
          },
        },
        reactions: true,
      },
    });

    // Build reaction summaries
    const enriched = (comments as any[]).map((comment: any) => {
      const reactionMap: Record<string, number> = {};
      (comment.reactions || []).forEach((r: any) => { reactionMap[r.emoji] = (reactionMap[r.emoji] || 0) + 1; });
      const userReactions = req.user
        ? (comment.reactions || []).filter((r: any) => r.userId === req.user!.id).map((r: any) => r.emoji)
        : [];

      return {
        ...comment,
        reactionSummary: Object.entries(reactionMap).map(([emoji, count]) => ({ emoji, count })),
        userReactions,
        reactions: undefined,
        replies: (comment.replies || []).map((reply: any) => {
          const rMap: Record<string, number> = {};
          (reply.reactions || []).forEach((r: any) => { rMap[r.emoji] = (rMap[r.emoji] || 0) + 1; });
          const uReactions = req.user
            ? (reply.reactions || []).filter((r: any) => r.userId === req.user!.id).map((r: any) => r.emoji)
            : [];
          return {
            ...reply,
            reactionSummary: Object.entries(rMap).map(([emoji, count]) => ({ emoji, count })),
            userReactions: uReactions,
            reactions: undefined,
          };
        }),
      };
    });

    res.json(enriched);
  } catch (error: any) {
    console.error('Failed to fetch comments:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// Create comment
router.post('/posts/:id/comments', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const postId = req.params.id as string;
    const { content, parentId } = req.body;
    if (!content) return res.status(400).json({ error: 'Content is required' });

    const post = await prisma.forumPost.findUnique({ where: { id: postId } });
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.isLocked && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'This post is locked' });
    }

    // Validate parentId (only 1 level nesting)
    if (parentId) {
      const parent = await prisma.forumComment.findUnique({ where: { id: parentId } });
      if (!parent || parent.postId !== post.id) {
        return res.status(400).json({ error: 'Invalid parent comment' });
      }
      if (parent.parentId) {
        return res.status(400).json({ error: 'Cannot nest replies deeper than 1 level' });
      }
    }

    const comment = await prisma.forumComment.create({
      data: {
        content,
        authorId: req.user!.id,
        postId: post.id,
        parentId: parentId || null,
      },
      include: {
        author: { select: { id: true, name: true, avatar: true, role: true, adminSignature: true } },
      },
    });

    // Update post comment count and last activity
    await prisma.forumPost.update({
      where: { id: post.id },
      data: {
        commentCount: { increment: 1 },
        lastActivityAt: new Date(),
      },
    });

    // Auto-subscribe commenter
    await prisma.forumSubscription.upsert({
      where: { userId_postId: { userId: req.user!.id, postId: post.id } },
      create: { userId: req.user!.id, postId: post.id },
      update: {},
    });

    // Notify post subscribers
    const subscribers = await prisma.forumSubscription.findMany({
      where: { postId: post.id, NOT: { userId: req.user!.id } },
    });
    for (const sub of subscribers) {
      await prisma.notification.create({
        data: {
          userId: sub.userId,
          type: 'FORUM_REPLY',
          title: `New reply on "${post.title}"`,
          message: `${req.user!.name || 'Someone'} replied to a forum post you're following.`,
          metadata: JSON.stringify({ postId: post.id, commentId: comment.id }),
        },
      });
    }

    res.status(201).json({ ...comment, reactionSummary: [], userReactions: [], replies: [] });
  } catch (error: any) {
    console.error('Failed to create comment:', error);
    res.status(500).json({ error: 'Failed to create comment' });
  }
});

// Edit comment
router.put('/comments/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const comment = await prisma.forumComment.findUnique({ where: { id } });
    if (!comment) return res.status(404).json({ error: 'Comment not found' });
    if (comment.authorId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const updated = await prisma.forumComment.update({
      where: { id },
      data: { content: req.body.content },
      include: {
        author: { select: { id: true, name: true, avatar: true, role: true, adminSignature: true } },
      },
    });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update comment' });
  }
});

// Delete comment
router.delete('/comments/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const comment = await prisma.forumComment.findUnique({
      where: { id },
    });
    if (!comment) return res.status(404).json({ error: 'Comment not found' });
    if (comment.authorId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Count replies that will be deleted
    const replyCount = await prisma.forumComment.count({ where: { parentId: comment.id } });

    await prisma.forumComment.delete({ where: { id } });

    // Update post comment count
    await prisma.forumPost.update({
      where: { id: comment.postId },
      data: { commentCount: { decrement: 1 + replyCount } },
    });

    res.json({ message: 'Comment deleted' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

// ==================== REACTIONS ====================

// Toggle reaction on post
router.post('/posts/:id/react', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const postId = req.params.id as string;
    const { emoji } = req.body;
    if (!emoji) return res.status(400).json({ error: 'Emoji is required' });

    const existing = await prisma.forumReaction.findUnique({
      where: { userId_postId_emoji: { userId: req.user!.id, postId, emoji } },
    });

    if (existing) {
      await prisma.forumReaction.delete({ where: { id: existing.id } });
      res.json({ action: 'removed', emoji });
    } else {
      await prisma.forumReaction.create({
        data: { emoji, userId: req.user!.id, postId },
      });
      res.json({ action: 'added', emoji });
    }
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to toggle reaction' });
  }
});

// Toggle reaction on comment
router.post('/comments/:id/react', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const commentId = req.params.id as string;
    const { emoji } = req.body;
    if (!emoji) return res.status(400).json({ error: 'Emoji is required' });

    const existing = await prisma.forumReaction.findUnique({
      where: { userId_commentId_emoji: { userId: req.user!.id, commentId, emoji } },
    });

    if (existing) {
      await prisma.forumReaction.delete({ where: { id: existing.id } });
      res.json({ action: 'removed', emoji });
    } else {
      await prisma.forumReaction.create({
        data: { emoji, userId: req.user!.id, commentId },
      });
      res.json({ action: 'added', emoji });
    }
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to toggle reaction' });
  }
});

// ==================== UPVOTES ====================

router.post('/posts/:id/upvote', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const postId = req.params.id as string;
    const existing = await prisma.forumUpvote.findUnique({
      where: { userId_postId: { userId: req.user!.id, postId } },
    });

    if (existing) {
      await prisma.forumUpvote.delete({ where: { id: existing.id } });
      res.json({ action: 'removed' });
    } else {
      await prisma.forumUpvote.create({
        data: { userId: req.user!.id, postId },
      });
      res.json({ action: 'added' });
    }
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to toggle upvote' });
  }
});

// ==================== SUBSCRIPTIONS ====================

router.post('/posts/:id/subscribe', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const postId = req.params.id as string;
    const existing = await prisma.forumSubscription.findUnique({
      where: { userId_postId: { userId: req.user!.id, postId } },
    });

    if (existing) {
      await prisma.forumSubscription.delete({ where: { id: existing.id } });
      res.json({ action: 'unsubscribed' });
    } else {
      await prisma.forumSubscription.create({
        data: { userId: req.user!.id, postId },
      });
      res.json({ action: 'subscribed' });
    }
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to toggle subscription' });
  }
});

// ==================== ADMIN ROUTES ====================

// Admin: Get forum stats
router.get('/admin/stats', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const [channels, posts, comments, activeUsers] = await Promise.all([
      prisma.forumChannel.count(),
      prisma.forumPost.count(),
      prisma.forumComment.count(),
      prisma.forumPost.findMany({
        where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
        select: { authorId: true },
        distinct: ['authorId'],
      }),
    ]);

    // Posts per day (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentPosts = await prisma.forumPost.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const postsPerDay: Record<string, number> = {};
    recentPosts.forEach(p => {
      const day = p.createdAt.toISOString().split('T')[0];
      postsPerDay[day] = (postsPerDay[day] || 0) + 1;
    });

    res.json({
      totalChannels: channels,
      totalPosts: posts,
      totalComments: comments,
      activeUsersThisWeek: activeUsers.length,
      postsPerDay,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Admin: CRUD Channels
router.get('/admin/channels', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const channels = await prisma.forumChannel.findMany({
      orderBy: { order: 'asc' },
      include: {
        _count: { select: { posts: true, tags: true } },
        tags: { orderBy: { order: 'asc' } },
      },
    });
    res.json(channels);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch channels' });
  }
});

router.get('/admin/channels/:id', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const channel = await prisma.forumChannel.findUnique({
      where: { id },
      include: { tags: { orderBy: { order: 'asc' } } },
    });
    if (!channel) return res.status(404).json({ error: 'Channel not found' });
    res.json(channel);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch channel' });
  }
});

router.post('/admin/channels', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, slug, description, icon, color, order, isActive, allowPosts, translations } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const finalSlug = slug || generateSlug(name);
    const channel = await prisma.forumChannel.create({
      data: {
        name,
        slug: finalSlug,
        description: description || '',
        icon: icon || null,
        color: color || null,
        order: order ?? 0,
        isActive: isActive ?? true,
        allowPosts: allowPosts ?? true,
        translations: translations || {},
      },
    });
    res.status(201).json(channel);
  } catch (error: any) {
    if (error.code === 'P2002') return res.status(400).json({ error: 'Slug already exists' });
    res.status(500).json({ error: 'Failed to create channel' });
  }
});

router.put('/admin/channels/:id', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { name, slug, description, icon, color, order, isActive, allowPosts, translations } = req.body;
    const channel = await prisma.forumChannel.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(slug !== undefined && { slug }),
        ...(description !== undefined && { description }),
        ...(icon !== undefined && { icon }),
        ...(color !== undefined && { color }),
        ...(order !== undefined && { order }),
        ...(isActive !== undefined && { isActive }),
        ...(allowPosts !== undefined && { allowPosts }),
        ...(translations !== undefined && { translations }),
      },
    });
    res.json(channel);
  } catch (error: any) {
    if (error.code === 'P2002') return res.status(400).json({ error: 'Slug already exists' });
    res.status(500).json({ error: 'Failed to update channel' });
  }
});

router.delete('/admin/channels/:id', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    await prisma.forumChannel.delete({ where: { id } });
    res.json({ message: 'Channel deleted' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete channel' });
  }
});

// Admin: Reorder channels
router.put('/admin/channels-order', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orders } = req.body;
    for (const item of orders) {
      await prisma.forumChannel.update({
        where: { id: item.id },
        data: { order: item.order },
      });
    }
    res.json({ message: 'Order updated' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to reorder channels' });
  }
});

// Admin: Tags CRUD
router.post('/admin/tags', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, channelId, color, order, translations } = req.body;
    if (!name || !channelId) return res.status(400).json({ error: 'Name and channelId are required' });
    const tag = await prisma.forumTag.create({
      data: {
        name,
        slug: generateSlug(name),
        channelId,
        color: color || null,
        order: order ?? 0,
        translations: translations || {},
      },
    });
    res.status(201).json(tag);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create tag' });
  }
});

router.put('/admin/tags/:id', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { name, color, order, translations } = req.body;
    const updateData: any = {};
    if (name !== undefined) { updateData.name = name; updateData.slug = generateSlug(name); }
    if (color !== undefined) updateData.color = color;
    if (order !== undefined) updateData.order = order;
    if (translations !== undefined) updateData.translations = translations;

    const tag = await prisma.forumTag.update({
      where: { id },
      data: updateData,
    });
    res.json(tag);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update tag' });
  }
});

router.delete('/admin/tags/:id', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    await prisma.forumTag.delete({ where: { id } });
    res.json({ message: 'Tag deleted' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete tag' });
  }
});

// Admin: Post moderation
router.get('/admin/posts', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const search = req.query.search as string | undefined;
    const channel = req.query.channel as string | undefined;
    const page = parseInt((req.query.page as string) || '1');
    const limit = parseInt((req.query.limit as string) || '20');
    const skip = (page - 1) * limit;
    const take = limit;

    const where: any = {};
    if (search) {
      where.OR = [{ title: { contains: search } }, { content: { contains: search } }];
    }
    if (channel) {
      where.channelId = channel;
    }

    const [posts, total] = await Promise.all([
      prisma.forumPost.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: {
          author: { select: { id: true, name: true, email: true, avatar: true, role: true } },
          channel: { select: { id: true, name: true, slug: true, icon: true, color: true } },
          _count: { select: { comments: true, reactions: true, upvotes: true } },
        },
      }),
      prisma.forumPost.count({ where }),
    ]);

    res.json({ posts, total, page, totalPages: Math.ceil(total / take) });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// Admin: Pin/Unpin post
router.put('/admin/posts/:id/pin', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const post = await prisma.forumPost.findUnique({ where: { id } });
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const updated = await prisma.forumPost.update({
      where: { id },
      data: { isPinned: !post.isPinned },
    });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to toggle pin' });
  }
});

// Admin: Lock/Unlock post
router.put('/admin/posts/:id/lock', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const post = await prisma.forumPost.findUnique({ where: { id } });
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const updated = await prisma.forumPost.update({
      where: { id },
      data: { isLocked: !post.isLocked },
    });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to toggle lock' });
  }
});

// Admin: Mark comment as answer
router.put('/admin/comments/:id/answer', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const comment = await prisma.forumComment.findUnique({
      where: { id },
      include: { post: true },
    });
    if (!comment) return res.status(404).json({ error: 'Comment not found' });

    // Toggle answer status
    const newIsAnswer = !comment.isAnswer;

    // If marking as answer, unmark any other answers for this post
    if (newIsAnswer) {
      await prisma.forumComment.updateMany({
        where: { postId: comment.postId, isAnswer: true },
        data: { isAnswer: false },
      });
    }

    await prisma.forumComment.update({
      where: { id },
      data: { isAnswer: newIsAnswer },
    });

    // Update post answered status
    await prisma.forumPost.update({
      where: { id: comment.postId },
      data: { isAnswered: newIsAnswer },
    });

    res.json({ isAnswer: newIsAnswer });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to toggle answer' });
  }
});

// Admin: Delete post
router.delete('/admin/posts/:id', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    await prisma.forumPost.delete({ where: { id } });
    res.json({ message: 'Post deleted' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

// Admin: Comment moderation
router.get('/admin/comments', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const search = req.query.search as string | undefined;
    const page = parseInt((req.query.page as string) || '1');
    const limit = parseInt((req.query.limit as string) || '20');
    const skip = (page - 1) * limit;
    const take = limit;

    const where: any = {};
    if (search) {
      where.content = { contains: search };
    }

    const [comments, total] = await Promise.all([
      prisma.forumComment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: {
          author: { select: { id: true, name: true, email: true, avatar: true } },
          post: { select: { id: true, title: true, slug: true } },
        },
      }),
      prisma.forumComment.count({ where }),
    ]);

    res.json({ comments, total, page, totalPages: Math.ceil(total / take) });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// Admin: Delete comment
router.delete('/admin/comments/:id', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const comment = await prisma.forumComment.findUnique({
      where: { id },
    });
    if (!comment) return res.status(404).json({ error: 'Comment not found' });

    const replyCount = await prisma.forumComment.count({ where: { parentId: comment.id } });
    await prisma.forumComment.delete({ where: { id } });

    // Update post comment count
    await prisma.forumPost.update({
      where: { id: comment.postId },
      data: { commentCount: { decrement: 1 + replyCount } },
    });

    res.json({ message: 'Comment deleted' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

export default router;
