import { useState, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowBigUp, ArrowLeft, Bell, BellOff, Eye, MessageSquare,
  Edit, Trash2, MoreVertical, Pin, Lock, Loader2, Send, CheckCircle2,
  ArrowDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import TipTapEditor from '@/components/TipTapEditor';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import CommentItem from '@/components/forum/CommentItem';
import ReactionBar from '@/components/forum/ReactionBar';
import { forumApi } from '@/services/forum';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

export default function ForumPostPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [commentContent, setCommentContent] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [commentSort, setCommentSort] = useState('oldest');
  const [composerOpen, setComposerOpen] = useState(false);
  const composerRef = useRef<HTMLDivElement>(null);

  const forumT = {
    back: t.forum?.backToForum || 'Back to Forum',
    views: t.forum?.views || 'views',
    replies: t.forum?.replies || 'replies',
    pinned: t.forum?.pinned || 'Pinned',
    locked: t.forum?.locked || 'Locked',
    answered: t.forum?.answered || 'Answered',
    answeredBy: t.forum?.answeredBy || 'Answered by',
    viewAnswer: t.forum?.viewAnswer || 'View Answer',
    edit: t.forum?.edit || 'Edit',
    delete: t.forum?.delete || 'Delete',
    subscribe: t.forum?.subscribe || 'Subscribe',
    unsubscribe: t.forum?.unsubscribe || 'Unsubscribe',
    upvote: t.forum?.upvote || 'Upvote',
    writeComment: t.forum?.writeComment || 'Write a comment...',
    replyTo: t.forum?.replyingTo || 'Replying to comment',
    cancelReply: t.common?.cancel || 'Cancel',
    submitComment: t.forum?.submitComment || 'Comment',
    loginToComment: t.forum?.loginToComment || 'Log in to comment',
    noComments: t.forum?.noComments || 'No comments yet',
    noCommentsDesc: t.forum?.noCommentsDesc || 'Be the first to share your thoughts!',
    deletePostConfirm: t.forum?.deletePostConfirm || 'Delete this post?',
    deletePostDesc: t.forum?.deletePostDesc || 'This will permanently delete the post and all its comments.',
    oldest: t.forum?.oldest || 'Oldest',
    newest: t.forum?.newest || 'Newest',
    commentsSection: t.forum?.commentsSection || 'Comments',
    postLocked: t.forum?.postLocked || 'This post is locked. No new comments allowed.',
    notFound: t.forum?.postNotFound || 'Post not found',
    writeReply: t.forum?.writeReply || 'Write a reply...',
    controls: t.forum?.controls || 'Controls',
    jumpToComments: t.forum?.jumpToComments || 'Jump to comments',
    sharePost: t.forum?.sharePost || 'Share',
  };

  const { data: post, isLoading: postLoading } = useQuery({
    queryKey: ['forum-post', id],
    queryFn: () => forumApi.getPost(id!),
    enabled: !!id,
  });

  const { data: comments = [], isLoading: commentsLoading } = useQuery({
    queryKey: ['forum-comments', id, commentSort],
    queryFn: () => forumApi.getComments(id!, commentSort),
    enabled: !!id,
  });

  // Find the answer comment
  const answerComment = useMemo(() => {
    if (!post?.isAnswered || !comments.length) return null;
    for (const c of comments) {
      if (c.isAnswer) return c;
      if (c.replies) {
        const reply = c.replies.find(r => r.isAnswer);
        if (reply) return reply;
      }
    }
    return null;
  }, [post?.isAnswered, comments]);

  const commentMutation = useMutation({
    mutationFn: () => forumApi.createComment(id!, {
      content: commentContent,
      parentId: replyTo || undefined,
    }),
    onSuccess: () => {
      setCommentContent('');
      setReplyTo(null);
      queryClient.invalidateQueries({ queryKey: ['forum-comments', id] });
      queryClient.invalidateQueries({ queryKey: ['forum-post', id] });
    },
  });

  const upvoteMutation = useMutation({
    mutationFn: () => forumApi.toggleUpvote(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forum-post', id] });
    },
  });

  const subscribeMutation = useMutation({
    mutationFn: () => forumApi.toggleSubscription(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forum-post', id] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => forumApi.deletePost(id!),
    onSuccess: () => {
      navigate('/user/forum');
    },
  });

  if (postLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!post) {
    return (
      <DashboardLayout>
        <div className="text-center py-16">
          <h2 className="text-xl font-bold">{forumT.notFound}</h2>
          <Link to="/user/forum">
            <Button variant="link" className="mt-2">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {forumT.back}
            </Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const isOwner = user?.id === post.authorId;
  const isAdmin = user?.role === 'ADMIN';
  const canEdit = isOwner || isAdmin;
  const initials = post.author?.name?.slice(0, 2).toUpperCase() || '??';
  const commentCount = post._count?.comments || 0;

  const getChannelName = () => {
    if (post.channel?.translations && typeof post.channel.translations === 'object') {
      const trans = post.channel.translations as Record<string, any>;
      if (trans[language]?.name) return trans[language].name;
    }
    return post.channel?.name || '';
  };

  const stripHtml = (html: string) => {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  return (
    <DashboardLayout>
      {/* Schema.org structured data */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'DiscussionForumPosting',
        headline: post.title,
        datePublished: post.createdAt,
        author: { '@type': 'Person', name: post.author?.name || 'Anonymous' },
        url: window.location.href,
        commentCount: commentCount,
        interactionStatistic: { '@type': 'InteractionCounter', interactionType: 'https://schema.org/LikeAction', userInteractionCount: post._count?.upvotes || 0 },
      }) }} />

      <div className="max-w-5xl mx-auto">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-5">
          <Link to="/user/forum" className="hover:text-foreground transition-colors">
            {t.forum?.title || 'Forum'}
          </Link>
          {post.channel && (
            <>
              <span className="text-muted-foreground/40">/</span>
              <Link to={`/user/forum?channel=${post.channel.slug}`} className="hover:text-foreground transition-colors flex items-center gap-1">
                {post.channel.icon && <span>{post.channel.icon}</span>}
                {getChannelName()}
              </Link>
            </>
          )}
        </nav>

        {/* 2-column layout */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* ============ POST CARD ============ */}
            <article className="bg-card rounded-xl border shadow-sm overflow-hidden">
              {/* Post header */}
              <div className="p-5 sm:p-6 pb-0">
                {/* Badges row */}
                <div className="flex items-center gap-2 flex-wrap mb-3">
                  {post.isPinned && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                      <Pin className="h-3 w-3" /> {forumT.pinned}
                    </span>
                  )}
                  {post.isLocked && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30 px-2 py-0.5 rounded-full">
                      <Lock className="h-3 w-3" /> {forumT.locked}
                    </span>
                  )}
                  {post.isAnswered && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="h-3 w-3" /> {forumT.answered}
                    </span>
                  )}
                  {post.tags?.map(({ tag }) => (
                    <Badge
                      key={tag.id}
                      variant="outline"
                      className="text-xs font-normal h-5 px-2"
                      style={tag.color ? { borderColor: tag.color + '60', color: tag.color } : undefined}
                    >
                      {tag.name}
                    </Badge>
                  ))}
                </div>

                {/* Title */}
                <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight mb-4">
                  {post.title}
                </h1>

                {/* Author info */}
                <div className="flex items-center gap-3 mb-4">
                  <Avatar className="h-10 w-10 ring-2 ring-background shadow-sm">
                    {post.author?.avatar && <AvatarImage src={post.author.avatar} />}
                    <AvatarFallback className="font-medium">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        'font-semibold text-sm',
                        post.author?.role === 'ADMIN' ? 'text-primary' : post.author?.role === 'SUPPORT' ? 'text-blue-600 dark:text-blue-400' : 'text-foreground'
                      )}>{post.author?.name || 'Anonymous'}</span>
                      {post.author?.role === 'ADMIN' && (
                        <Badge className="text-[10px] py-0 h-4 px-1.5 bg-primary/10 text-primary border-primary/20 font-medium" variant="outline">
                          Admin
                        </Badge>
                      )}
                      {post.author?.role === 'SUPPORT' && (
                        <Badge className="text-[10px] py-0 h-4 px-1.5 bg-blue-50 text-blue-600 border-blue-200 font-medium" variant="outline">
                          Support
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      <time title={new Date(post.createdAt).toLocaleString()}>
                        {new Date(post.createdAt).toLocaleDateString(language, { year: 'numeric', month: 'long', day: 'numeric' })}
                      </time>
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" /> {post.views}
                      </span>
                    </div>
                  </div>

                  {canEdit && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/user/forum/edit/${post.id}`)}>
                          <Edit className="h-4 w-4 mr-2" /> {forumT.edit}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => setShowDeleteAlert(true)}>
                          <Trash2 className="h-4 w-4 mr-2" /> {forumT.delete}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>

              {/* Post content */}
              <div className="px-5 sm:px-6 pb-4">
                <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-semibold prose-a:text-primary prose-img:rounded-lg [&>*:first-child]:mt-0">
                  <div dangerouslySetInnerHTML={{ __html: post.content }} />
                </div>

                {/* Admin/Support signature */}
                {post.author?.adminSignature && (post.author?.role === 'ADMIN' || post.author?.role === 'SUPPORT') && (
                  <div className="mt-4 pt-4 border-t border-border/40">
                    <div className="text-sm text-muted-foreground/80 prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0" dangerouslySetInnerHTML={{ __html: post.author.adminSignature }} />
                  </div>
                )}
              </div>

              {/* Action bar */}
              <div className="flex items-center gap-2 flex-wrap px-5 sm:px-6 py-3 border-t bg-muted/20">
                {user && (
                  <Button
                    variant={post.hasUpvoted ? 'default' : 'outline'}
                    size="sm"
                    className="h-8 gap-1.5"
                    onClick={() => upvoteMutation.mutate()}
                    disabled={upvoteMutation.isPending}
                  >
                    <ArrowBigUp className={cn('h-4 w-4', post.hasUpvoted && 'fill-current')} />
                    <span className="font-semibold">{post._count?.upvotes || 0}</span>
                  </Button>
                )}

                <ReactionBar
                  reactions={post.reactionSummary || []}
                  userReactions={post.userReactions || []}
                  onToggle={(emoji) => forumApi.togglePostReaction(id!, emoji)}
                  queryKey={['forum-post', id!]}
                />

                <div className="flex-1" />

                {user && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1.5 text-muted-foreground"
                    onClick={() => subscribeMutation.mutate()}
                    disabled={subscribeMutation.isPending}
                  >
                    {post.isSubscribed ? (
                      <><BellOff className="h-3.5 w-3.5" /> {forumT.unsubscribe}</>
                    ) : (
                      <><Bell className="h-3.5 w-3.5" /> {forumT.subscribe}</>
                    )}
                  </Button>
                )}
              </div>
            </article>

            {/* ============ ANSWER SUMMARY BOX ============ */}
            {post.isAnswered && answerComment && (
              <div className="mt-4 rounded-xl border border-green-200 dark:border-green-800 bg-green-50/80 dark:bg-green-950/20 overflow-hidden">
                <div className="px-5 py-3 flex items-center gap-3 border-b border-green-200/60 dark:border-green-800/60">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-sm font-semibold text-green-700 dark:text-green-300">
                      {forumT.answeredBy}
                    </span>
                    <Avatar className="h-5 w-5">
                      {answerComment.author?.avatar && <AvatarImage src={answerComment.author.avatar} />}
                      <AvatarFallback className="text-[9px]">{answerComment.author?.name?.slice(0, 2).toUpperCase() || '??'}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-green-700 dark:text-green-300">
                      {answerComment.author?.name || 'Anonymous'}
                    </span>
                  </div>
                  <a
                    href={`#comment_${answerComment.id}`}
                    className="inline-flex items-center gap-1 text-sm font-medium text-green-600 dark:text-green-400 hover:underline shrink-0"
                  >
                    {forumT.viewAnswer}
                    <ArrowDown className="h-3.5 w-3.5" />
                  </a>
                </div>
                {/* Full answer HTML content */}
                <div className="px-5 py-3">
                  <div className="prose prose-sm dark:prose-invert max-w-none prose-p:text-green-800/80 dark:prose-p:text-green-200/80 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 line-clamp-4" dangerouslySetInnerHTML={{ __html: answerComment.content }} />
                </div>
              </div>
            )}

            {/* ============ COMMENTS SECTION ============ */}
            <div className="mt-6" id="comments">
              {/* Comments header */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-muted-foreground" />
                  {commentCount} {forumT.commentsSection}
                </h2>
                <div className="flex gap-1 bg-muted rounded-lg p-0.5">
                  <button
                    className={cn(
                      'px-3 py-1 text-xs font-medium rounded-md transition-colors',
                      commentSort === 'oldest' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                    )}
                    onClick={() => setCommentSort('oldest')}
                  >
                    {forumT.oldest}
                  </button>
                  <button
                    className={cn(
                      'px-3 py-1 text-xs font-medium rounded-md transition-colors',
                      commentSort === 'newest' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                    )}
                    onClick={() => setCommentSort('newest')}
                  >
                    {forumT.newest}
                  </button>
                </div>
              </div>

              {/* Locked notice */}
              {post.isLocked && (
                <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3 text-sm text-orange-700 dark:text-orange-300 flex items-center gap-2 mb-4">
                  <Lock className="h-4 w-4 shrink-0" />
                  {forumT.postLocked}
                </div>
              )}

              {/* Comments list */}
              {commentsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : comments.length > 0 ? (
                <div className="space-y-1 bg-card rounded-xl border overflow-hidden divide-y divide-border/50">
                  {comments.map((comment) => (
                    <div key={comment.id} className="group">
                      <CommentItem
                        comment={comment}
                        postId={id!}
                        currentUserId={user?.id}
                        currentUserRole={user?.role}
                        onReply={(parentId) => {
                          setReplyTo(parentId);
                          setComposerOpen(true);
                          setTimeout(() => composerRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
                        }}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 bg-card rounded-xl border">
                  <MessageSquare className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="font-medium text-muted-foreground">{forumT.noComments}</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">{forumT.noCommentsDesc}</p>
                </div>
              )}

              {/* Composer - Waterhole style with placeholder */}
              {user && !post.isLocked && (
                <div ref={composerRef} id="comment-form" className="mt-4">
                  {!composerOpen ? (
                    /* Collapsed placeholder */
                    <button
                      onClick={() => setComposerOpen(true)}
                      className="w-full flex items-center gap-3 bg-card rounded-xl border p-4 text-left hover:border-primary/30 transition-colors group"
                    >
                      <Avatar className="h-8 w-8 shrink-0">
                        {user.avatar && <AvatarImage src={user.avatar} />}
                        <AvatarFallback className="text-xs font-medium">{user.name?.slice(0, 2).toUpperCase() || '??'}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors flex-1">
                        {forumT.writeReply}
                      </span>
                      <Send className="h-4 w-4 text-muted-foreground/40" />
                    </button>
                  ) : (
                    /* Expanded editor */
                    <div className="bg-card rounded-xl border overflow-hidden shadow-sm">
                      <div className="p-4 sm:p-5">
                        {replyTo && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3 bg-muted/50 rounded-lg px-3 py-2">
                            <span className="font-medium">{forumT.replyTo}</span>
                            <Button variant="ghost" size="sm" className="h-5 text-xs ml-auto" onClick={() => setReplyTo(null)}>
                              ✕ {forumT.cancelReply}
                            </Button>
                          </div>
                        )}
                        <TipTapEditor
                          value={commentContent}
                          onChange={setCommentContent}
                          placeholder={forumT.writeReply}
                          minHeight={120}
                          simple
                        />
                      </div>
                      <div className="flex items-center justify-between gap-2 px-4 sm:px-5 py-3 border-t bg-muted/20">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setComposerOpen(false); setReplyTo(null); }}
                        >
                          {forumT.cancelReply}
                        </Button>
                        <Button
                          onClick={() => commentMutation.mutate()}
                          disabled={!commentContent.trim() || commentMutation.isPending}
                          size="sm"
                          className="gap-1.5"
                        >
                          {commentMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                          {forumT.submitComment}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!user && (
                <div className="mt-4 text-center py-6 bg-card rounded-xl border">
                  <p className="text-sm text-muted-foreground">
                    <Link to="/login" className="text-primary font-medium hover:underline">{forumT.loginToComment}</Link>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ============ SIDEBAR ============ */}
          <div className="w-full lg:w-64 shrink-0">
            <div className="lg:sticky lg:top-4 space-y-3">
              {/* Comment CTA button */}
              {user && !post.isLocked && (
                <Button
                  className="w-full gap-2"
                  onClick={() => {
                    setComposerOpen(true);
                    setTimeout(() => composerRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
                  }}
                >
                  <MessageSquare className="h-4 w-4" />
                  {forumT.submitComment}
                </Button>
              )}

              {/* Controls card */}
              {canEdit && (
                <div className="bg-card rounded-xl border p-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{forumT.controls}</h3>
                  <div className="space-y-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start gap-2 h-8"
                      onClick={() => navigate(`/user/forum/edit/${post.id}`)}
                    >
                      <Edit className="h-3.5 w-3.5" /> {forumT.edit}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start gap-2 h-8 text-destructive hover:text-destructive"
                      onClick={() => setShowDeleteAlert(true)}
                    >
                      <Trash2 className="h-3.5 w-3.5" /> {forumT.delete}
                    </Button>
                  </div>
                </div>
              )}

              {/* Follow & actions */}
              {user && (
                <div className="bg-card rounded-xl border p-4 space-y-2">
                  <Button
                    variant={post.isSubscribed ? 'secondary' : 'outline'}
                    size="sm"
                    className="w-full gap-2"
                    onClick={() => subscribeMutation.mutate()}
                    disabled={subscribeMutation.isPending}
                  >
                    {post.isSubscribed ? (
                      <><BellOff className="h-3.5 w-3.5" /> {forumT.unsubscribe}</>
                    ) : (
                      <><Bell className="h-3.5 w-3.5" /> {forumT.subscribe}</>
                    )}
                  </Button>
                </div>
              )}

              {/* Jump to comments */}
              {commentCount > 0 && (
                <a
                  href="#comments"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors px-1"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>{commentCount} {forumT.commentsSection}</span>
                </a>
              )}

              {/* Post stats */}
              <div className="bg-card rounded-xl border p-4 text-xs text-muted-foreground space-y-2">
                <div className="flex justify-between">
                  <span className="flex items-center gap-1.5"><Eye className="h-3.5 w-3.5" /> {forumT.views}</span>
                  <span className="font-medium text-foreground">{post.views}</span>
                </div>
                <div className="flex justify-between">
                  <span className="flex items-center gap-1.5"><ArrowBigUp className="h-3.5 w-3.5" /> {forumT.upvote}</span>
                  <span className="font-medium text-foreground">{post._count?.upvotes || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="flex items-center gap-1.5"><MessageSquare className="h-3.5 w-3.5" /> {forumT.replies}</span>
                  <span className="font-medium text-foreground">{commentCount}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Delete dialog */}
        <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{forumT.deletePostConfirm}</AlertDialogTitle>
              <AlertDialogDescription>{forumT.deletePostDesc}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{forumT.cancelReply}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteMutation.mutate()}
                className="bg-destructive text-destructive-foreground"
              >
                {forumT.delete}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
