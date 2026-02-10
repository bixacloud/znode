import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search, Loader2, Pin, Lock, Trash2, MoreVertical, ExternalLink,
  MessageSquare, Eye, ArrowBigUp, ChevronLeft, ChevronRight, CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import AdminLayout from '@/components/admin/AdminLayout';
import { forumApi, type ForumPost } from '@/services/forum';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';

export default function AdminForumPosts() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const adminT = {
    title: t.forum?.adminPosts || 'Forum Posts',
    subtitle: t.forum?.adminPostsDesc || 'Moderate and manage forum posts',
    searchPlaceholder: t.forum?.searchPlaceholder || 'Search posts...',
    allChannels: t.forum?.allChannels || 'All Channels',
    post: t.forum?.post || 'Post',
    author: t.forum?.author || 'Author',
    channel: t.forum?.channel || 'Channel',
    stats: t.forum?.stats || 'Stats',
    actions: t.forum?.actions || 'Actions',
    pin: t.forum?.pin || 'Pin',
    unpin: t.forum?.unpin || 'Unpin',
    lock: t.forum?.lock || 'Lock',
    unlock: t.forum?.unlock || 'Unlock',
    delete: t.forum?.delete || 'Delete',
    view: t.forum?.view || 'View',
    deleteConfirm: t.forum?.deletePostConfirm || 'Delete this post?',
    deleteDesc: t.forum?.deletePostDesc || 'This will permanently delete the post and all its comments.',
    cancel: t.common?.cancel || 'Cancel',
    noPosts: t.forum?.noPosts || 'No posts found',
    previous: t.common?.previous || 'Previous',
    next: t.common?.next || 'Next',
  };

  const { data: channels = [] } = useQuery({
    queryKey: ['admin-forum-channels'],
    queryFn: forumApi.admin.getChannels,
  });

  const { data: postsData, isLoading } = useQuery({
    queryKey: ['admin-forum-posts', { search, channel: channelFilter, page }],
    queryFn: () => forumApi.admin.getPosts({
      search: search || undefined,
      channel: channelFilter !== 'all' ? channelFilter : undefined,
      page,
    }),
  });

  const pinMutation = useMutation({
    mutationFn: (id: string) => forumApi.admin.pinPost(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-forum-posts'] });
      toast({ title: 'Post pin toggled' });
    },
  });

  const lockMutation = useMutation({
    mutationFn: (id: string) => forumApi.admin.lockPost(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-forum-posts'] });
      toast({ title: 'Post lock toggled' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => forumApi.admin.deletePost(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-forum-posts'] });
      setDeleteId(null);
      toast({ title: 'Post deleted' });
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{adminT.title}</h1>
          <p className="text-muted-foreground text-sm">{adminT.subtitle}</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={adminT.searchPlaceholder}
                className="pl-9"
              />
            </div>
          </form>
          <Select value={channelFilter} onValueChange={(v) => { setChannelFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{adminT.allChannels}</SelectItem>
              {channels.map(ch => (
                <SelectItem key={ch.id} value={ch.id}>{ch.icon} {ch.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : !postsData?.posts?.length ? (
              <div className="py-12 text-center text-muted-foreground">
                <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>{adminT.noPosts}</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40%]">{adminT.post}</TableHead>
                    <TableHead>{adminT.author}</TableHead>
                    <TableHead>{adminT.channel}</TableHead>
                    <TableHead>{adminT.stats}</TableHead>
                    <TableHead className="w-[60px]">{adminT.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {postsData.posts.map((post) => (
                    <TableRow key={post.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/user/forum/post/${post.id}`)}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {post.isPinned && <Pin className="h-3.5 w-3.5 text-primary shrink-0" />}
                            {post.isLocked && <Lock className="h-3.5 w-3.5 text-orange-500 shrink-0" />}
                            {post.isAnswered && <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />}
                            <span className="font-medium line-clamp-1">{post.title}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(post.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{post.author?.name || 'Unknown'}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {post.channel?.icon} {post.channel?.name}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" /> {post._count?.comments || 0}</span>
                          <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {post.views}</span>
                          <span className="flex items-center gap-1"><ArrowBigUp className="h-3 w-3" /> {post._count?.upvotes || 0}</span>
                        </div>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm"><MoreVertical className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link to={`/user/forum/post/${post.id}`} target="_blank">
                                <ExternalLink className="h-4 w-4 mr-2" /> {adminT.view}
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => pinMutation.mutate(post.id)}>
                              <Pin className="h-4 w-4 mr-2" /> {post.isPinned ? adminT.unpin : adminT.pin}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => lockMutation.mutate(post.id)}>
                              <Lock className="h-4 w-4 mr-2" /> {post.isLocked ? adminT.unlock : adminT.lock}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(post.id)}>
                              <Trash2 className="h-4 w-4 mr-2" /> {adminT.delete}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {postsData && postsData.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4 mr-1" /> {adminT.previous}
            </Button>
            <span className="text-sm text-muted-foreground">
              {page} / {postsData.totalPages}
            </span>
            <Button variant="outline" size="sm" disabled={page >= postsData.totalPages} onClick={() => setPage(p => p + 1)}>
              {adminT.next} <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </div>

      {/* Delete dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{adminT.deleteConfirm}</AlertDialogTitle>
            <AlertDialogDescription>{adminT.deleteDesc}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{adminT.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)} className="bg-destructive text-destructive-foreground">
              {adminT.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
