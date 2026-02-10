import { authService } from './auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';

// ==================== TYPES ====================

export interface ForumChannel {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string | null;
  color: string | null;
  order: number;
  isActive: boolean;
  allowPosts: boolean;
  translations: any;
  createdAt: string;
  _count?: { posts: number; tags?: number };
  tags?: ForumTag[];
}

export interface ForumTag {
  id: string;
  name: string;
  slug: string;
  channelId: string;
  color: string | null;
  order: number;
  translations: any;
}

export interface ForumAuthor {
  id: string;
  name: string | null;
  avatar: string | null;
  role: string;
  createdAt?: string;
  adminSignature?: string | null;
}

export interface ForumPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  authorId: string;
  channelId: string;
  isPinned: boolean;
  isLocked: boolean;
  isAnswered: boolean;
  views: number;
  commentCount: number;
  lastActivityAt: string;
  createdAt: string;
  updatedAt: string;
  author: ForumAuthor;
  channel: { id: string; name: string; slug: string; icon: string | null; color: string | null; translations?: any };
  tags: { tag: ForumTag }[];
  _count: { comments: number; reactions: number; upvotes: number };
  userReactions?: string[];
  hasUpvoted?: boolean;
  isSubscribed?: boolean;
  reactionSummary?: { emoji: string; count: number }[];
}

export interface ForumComment {
  id: string;
  content: string;
  authorId: string;
  postId: string;
  parentId: string | null;
  isAnswer: boolean;
  createdAt: string;
  updatedAt: string;
  author: ForumAuthor;
  replies?: ForumComment[];
  reactionSummary?: { emoji: string; count: number }[];
  userReactions?: string[];
  post?: { id: string; title: string; slug: string };
}

export interface PostsResponse {
  posts: ForumPost[];
  total: number;
  page: number;
  totalPages: number;
}

export interface CommentsResponse {
  comments: ForumComment[];
  total: number;
  page: number;
  totalPages: number;
}

export interface ForumStats {
  totalChannels: number;
  totalPosts: number;
  totalComments: number;
  activeUsersThisWeek: number;
  postsPerDay: Record<string, number>;
}

// ==================== PUBLIC API ====================

export const forumApi = {
  // Channels
  getChannels: async (): Promise<ForumChannel[]> => {
    const res = await fetch(`${API_URL}/api/forum/channels`);
    if (!res.ok) throw new Error('Failed to fetch channels');
    return res.json();
  },

  getChannel: async (slug: string): Promise<ForumChannel> => {
    const res = await fetch(`${API_URL}/api/forum/channels/${slug}`);
    if (!res.ok) throw new Error('Failed to fetch channel');
    return res.json();
  },

  // Posts
  getPosts: async (params: {
    channel?: string;
    tag?: string;
    sort?: string;
    search?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<PostsResponse> => {
    const qs = new URLSearchParams();
    if (params.channel) qs.set('channel', params.channel);
    if (params.tag) qs.set('tag', params.tag);
    if (params.sort) qs.set('sort', params.sort);
    if (params.search) qs.set('search', params.search);
    if (params.page) qs.set('page', String(params.page));
    if (params.limit) qs.set('limit', String(params.limit));
    return authService.request<PostsResponse>(`/api/forum/posts?${qs.toString()}`);
  },

  getPost: async (id: string): Promise<ForumPost> => {
    return authService.request<ForumPost>(`/api/forum/posts/${id}`);
  },

  createPost: async (data: { title: string; content: string; channelId: string; tagIds?: string[] }): Promise<ForumPost> => {
    return authService.request<ForumPost>('/api/forum/posts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updatePost: async (id: string, data: { title?: string; content?: string; tagIds?: string[] }): Promise<ForumPost> => {
    return authService.request<ForumPost>(`/api/forum/posts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deletePost: async (id: string): Promise<{ message: string }> => {
    return authService.request(`/api/forum/posts/${id}`, { method: 'DELETE' });
  },

  // Comments
  getComments: async (postId: string, sort?: string): Promise<ForumComment[]> => {
    const qs = sort ? `?sort=${sort}` : '';
    return authService.request<ForumComment[]>(`/api/forum/posts/${postId}/comments${qs}`);
  },

  createComment: async (postId: string, data: { content: string; parentId?: string }): Promise<ForumComment> => {
    return authService.request<ForumComment>(`/api/forum/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateComment: async (id: string, content: string): Promise<ForumComment> => {
    return authService.request<ForumComment>(`/api/forum/comments/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    });
  },

  deleteComment: async (id: string): Promise<{ message: string }> => {
    return authService.request(`/api/forum/comments/${id}`, { method: 'DELETE' });
  },

  // Reactions
  togglePostReaction: async (postId: string, emoji: string): Promise<{ action: string; emoji: string }> => {
    return authService.request(`/api/forum/posts/${postId}/react`, {
      method: 'POST',
      body: JSON.stringify({ emoji }),
    });
  },

  toggleCommentReaction: async (commentId: string, emoji: string): Promise<{ action: string; emoji: string }> => {
    return authService.request(`/api/forum/comments/${commentId}/react`, {
      method: 'POST',
      body: JSON.stringify({ emoji }),
    });
  },

  // Upvotes
  toggleUpvote: async (postId: string): Promise<{ action: string }> => {
    return authService.request(`/api/forum/posts/${postId}/upvote`, { method: 'POST' });
  },

  // Subscriptions
  toggleSubscription: async (postId: string): Promise<{ action: string }> => {
    return authService.request(`/api/forum/posts/${postId}/subscribe`, { method: 'POST' });
  },

  // ==================== ADMIN API ====================

  admin: {
    getStats: async (): Promise<ForumStats> => {
      return authService.request<ForumStats>('/api/forum/admin/stats');
    },

    getChannels: async (): Promise<ForumChannel[]> => {
      return authService.request<ForumChannel[]>('/api/forum/admin/channels');
    },

    getChannel: async (id: string): Promise<ForumChannel> => {
      return authService.request<ForumChannel>(`/api/forum/admin/channels/${id}`);
    },

    createChannel: async (data: Partial<ForumChannel>): Promise<ForumChannel> => {
      return authService.request<ForumChannel>('/api/forum/admin/channels', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    updateChannel: async (id: string, data: Partial<ForumChannel>): Promise<ForumChannel> => {
      return authService.request<ForumChannel>(`/api/forum/admin/channels/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },

    deleteChannel: async (id: string): Promise<{ message: string }> => {
      return authService.request(`/api/forum/admin/channels/${id}`, { method: 'DELETE' });
    },

    reorderChannels: async (orders: { id: string; order: number }[]): Promise<{ message: string }> => {
      return authService.request('/api/forum/admin/channels-order', {
        method: 'PUT',
        body: JSON.stringify({ orders }),
      });
    },

    createTag: async (data: { name: string; channelId: string; color?: string; order?: number; translations?: any }): Promise<ForumTag> => {
      return authService.request<ForumTag>('/api/forum/admin/tags', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    updateTag: async (id: string, data: Partial<ForumTag>): Promise<ForumTag> => {
      return authService.request<ForumTag>(`/api/forum/admin/tags/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },

    deleteTag: async (id: string): Promise<{ message: string }> => {
      return authService.request(`/api/forum/admin/tags/${id}`, { method: 'DELETE' });
    },

    getPosts: async (params: { search?: string; channel?: string; page?: number; limit?: number } = {}): Promise<PostsResponse> => {
      const qs = new URLSearchParams();
      if (params.search) qs.set('search', params.search);
      if (params.channel) qs.set('channel', params.channel);
      if (params.page) qs.set('page', String(params.page));
      if (params.limit) qs.set('limit', String(params.limit));
      return authService.request<PostsResponse>(`/api/forum/admin/posts?${qs.toString()}`);
    },

    pinPost: async (id: string): Promise<ForumPost> => {
      return authService.request<ForumPost>(`/api/forum/admin/posts/${id}/pin`, { method: 'PUT' });
    },

    lockPost: async (id: string): Promise<ForumPost> => {
      return authService.request<ForumPost>(`/api/forum/admin/posts/${id}/lock`, { method: 'PUT' });
    },

    markAnswer: async (commentId: string): Promise<{ isAnswer: boolean }> => {
      return authService.request(`/api/forum/admin/comments/${commentId}/answer`, { method: 'PUT' });
    },

    deletePost: async (id: string): Promise<{ message: string }> => {
      return authService.request(`/api/forum/admin/posts/${id}`, { method: 'DELETE' });
    },

    getComments: async (params: { search?: string; page?: number; limit?: number } = {}): Promise<CommentsResponse> => {
      const qs = new URLSearchParams();
      if (params.search) qs.set('search', params.search);
      if (params.page) qs.set('page', String(params.page));
      if (params.limit) qs.set('limit', String(params.limit));
      return authService.request<CommentsResponse>(`/api/forum/admin/comments?${qs.toString()}`);
    },

    deleteComment: async (id: string): Promise<{ message: string }> => {
      return authService.request(`/api/forum/admin/comments/${id}`, { method: 'DELETE' });
    },
  },
};
