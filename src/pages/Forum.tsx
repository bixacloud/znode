import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, Loader2, MessageSquare, TrendingUp, Clock, ArrowUpDown, Flame, ChevronLeft, ChevronRight, Pin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import ChannelSidebar from '@/components/forum/ChannelSidebar';
import PostCard from '@/components/forum/PostCard';
import { forumApi } from '@/services/forum';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

export default function Forum() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');

  const channel = searchParams.get('channel') || undefined;
  const tag = searchParams.get('tag') || undefined;
  const sort = searchParams.get('sort') || 'latest';
  const search = searchParams.get('search') || undefined;
  const page = parseInt(searchParams.get('page') || '1');

  const forumT = {
    title: t.forum?.title || 'Community Forum',
    subtitle: t.forum?.subtitle || 'Ask questions, share knowledge, and connect with others',
    newPost: t.forum?.newPost || 'New Post',
    searchPlaceholder: t.forum?.searchPlaceholder || 'Search posts...',
    latest: t.forum?.latest || 'Latest',
    newest: t.forum?.newest || 'Newest',
    top: t.forum?.top || 'Top',
    trending: t.forum?.trending || 'Trending',
    noPosts: t.forum?.noPosts || 'No posts yet',
    noPostsDesc: t.forum?.noPostsDesc || 'Be the first to start a discussion!',
    previous: t.common?.previous || 'Previous',
    next: t.common?.next || 'Next',
    pageOf: t.forum?.pageOf || 'Page {page} of {total}',
  };

  const { data: channels = [] } = useQuery({
    queryKey: ['forum-channels'],
    queryFn: forumApi.getChannels,
  });

  const { data: postsData, isLoading } = useQuery({
    queryKey: ['forum-posts', { channel, tag, sort, search, page }],
    queryFn: () => forumApi.getPosts({ channel, tag, sort, search, page }),
  });

  const activeChannel = channels.find(c => c.slug === channel);

  const getChannelName = (ch: any) => {
    if (ch?.translations && typeof ch.translations === 'object') {
      const trans = ch.translations as Record<string, any>;
      if (trans[language]?.name) return trans[language].name;
    }
    return ch?.name || '';
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams);
    if (searchInput) {
      params.set('search', searchInput);
    } else {
      params.delete('search');
    }
    params.delete('page');
    setSearchParams(params);
  };

  const handleSortChange = (newSort: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('sort', newSort);
    params.delete('page');
    setSearchParams(params);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', String(newPage));
    setSearchParams(params);
  };

  const sortOptions = [
    { value: 'latest', label: forumT.latest, icon: Clock },
    { value: 'newest', label: forumT.newest, icon: ArrowUpDown },
    { value: 'trending', label: forumT.trending, icon: Flame },
    { value: 'top', label: forumT.top, icon: TrendingUp },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {activeChannel ? (
                <span className="flex items-center gap-2">
                  {activeChannel.icon && <span>{activeChannel.icon}</span>}
                  {getChannelName(activeChannel)}
                </span>
              ) : forumT.title}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {activeChannel?.description || forumT.subtitle}
            </p>
          </div>
          {user && (
            <Link to="/user/forum/new">
              <Button className="gap-2 shadow-sm">
                <Plus className="h-4 w-4" />
                {forumT.newPost}
              </Button>
            </Link>
          )}
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <div className="w-full lg:w-56 shrink-0">
            <div className="lg:sticky lg:top-4">
              <ChannelSidebar channels={channels} activeSlug={channel} />
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* Search + Sort */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
              <form onSubmit={handleSearch} className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder={forumT.searchPlaceholder}
                    className="pl-9 bg-card"
                  />
                </div>
              </form>
              <div className="flex bg-muted rounded-lg p-0.5 shrink-0">
                {sortOptions.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                      sort === value
                        ? 'bg-background shadow-sm text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                    onClick={() => handleSortChange(value)}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Posts list */}
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : postsData?.posts?.length ? (
              <>
                {/* Pinned posts section */}
                {page === 1 && postsData.posts.filter(p => p.isPinned).length > 0 && (
                  <div className="bg-card rounded-xl border overflow-hidden shadow-sm mb-3">
                    {postsData.posts.filter(p => p.isPinned).map((post) => (
                      <PostCard key={post.id} post={post} showChannel={!channel} compact />
                    ))}
                  </div>
                )}

                {/* Regular posts */}
                <div className="bg-card rounded-xl border overflow-hidden shadow-sm">
                  {postsData.posts.filter(p => page !== 1 || !p.isPinned).length > 0 ? (
                    postsData.posts.filter(p => page !== 1 || !p.isPinned).map((post) => (
                      <PostCard key={post.id} post={post} showChannel={!channel} />
                    ))
                  ) : (
                    postsData.posts.map((post) => (
                      <PostCard key={post.id} post={post} showChannel={!channel} />
                    ))
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-16 bg-card rounded-xl border">
                <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                <h3 className="font-semibold text-lg">{forumT.noPosts}</h3>
                <p className="text-muted-foreground text-sm mt-1">{forumT.noPostsDesc}</p>
                {user && (
                  <Link to="/user/forum/new">
                    <Button className="mt-4 gap-2">
                      <Plus className="h-4 w-4" />
                      {forumT.newPost}
                    </Button>
                  </Link>
                )}
              </div>
            )}

            {/* Pagination */}
            {postsData && postsData.totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => handlePageChange(page - 1)}
                  className="gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  {forumT.previous}
                </Button>
                <span className="text-sm text-muted-foreground">
                  {forumT.pageOf.replace('{page}', String(page)).replace('{total}', String(postsData.totalPages))}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= postsData.totalPages}
                  onClick={() => handlePageChange(page + 1)}
                  className="gap-1"
                >
                  {forumT.next}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
