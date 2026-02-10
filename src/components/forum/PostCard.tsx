import { Link } from 'react-router-dom';
import { MessageSquare, ArrowBigUp, Pin, Lock, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { ForumPost } from '@/services/forum';
import { useLanguage } from '@/contexts/LanguageContext';

interface PostCardProps {
  post: ForumPost;
  showChannel?: boolean;
  compact?: boolean;
}

function timeAgo(dateStr: string, lang: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diff < 60) return lang === 'vi' ? 'vừa xong' : lang === 'zh' ? '刚刚' : lang === 'fil' ? 'kamakailan' : 'just now';
  if (diff < 3600) {
    const m = Math.floor(diff / 60);
    return lang === 'vi' ? `${m} phút trước` : lang === 'zh' ? `${m}分钟前` : lang === 'fil' ? `${m} minuto ang nakalipas` : `${m}m ago`;
  }
  if (diff < 86400) {
    const h = Math.floor(diff / 3600);
    return lang === 'vi' ? `${h} giờ trước` : lang === 'zh' ? `${h}小时前` : lang === 'fil' ? `${h} oras ang nakalipas` : `${h}h ago`;
  }
  if (diff < 2592000) {
    const d = Math.floor(diff / 86400);
    return lang === 'vi' ? `${d} ngày trước` : lang === 'zh' ? `${d}天前` : lang === 'fil' ? `${d} araw ang nakalipas` : `${d}d ago`;
  }
  return date.toLocaleDateString(lang);
}

function stripHtml(html: string): string {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

export default function PostCard({ post, showChannel = true, compact = false }: PostCardProps) {
  const { language, t } = useLanguage();
  const forumT = {
    views: t.forum?.views || 'views',
    comments: t.forum?.commentsSection || 'comments',
    pinned: t.forum?.pinned || 'Pinned',
    locked: t.forum?.locked || 'Locked',
    answered: t.forum?.answered || 'Answered',
    repliedBy: t.forum?.repliedBy || 'replied',
    postedBy: t.forum?.postedBy || 'posted',
  };

  const getChannelName = () => {
    if (post.channel?.translations && typeof post.channel.translations === 'object') {
      const trans = post.channel.translations as Record<string, any>;
      if (trans[language]?.name) return trans[language].name;
    }
    return post.channel?.name || '';
  };

  const initials = post.author?.name?.slice(0, 2).toUpperCase() || '??';
  const commentCount = post._count?.comments || post.commentCount || 0;
  const upvoteCount = post._count?.upvotes || 0;
  const excerpt = stripHtml(post.content).slice(0, 200);
  const hasExcerpt = excerpt.length > 0 && !compact;

  // Last activity info
  const lastComment = (post as any).lastComment;
  const hasLastActivity = lastComment?.author;

  return (
    <Link
      to={`/user/forum/post/${post.id}`}
      className="block group"
    >
      <article className={cn(
        'relative transition-colors hover:bg-muted/40',
        'border-b border-border/50 last:border-b-0',
        post.isPinned && 'bg-primary/[0.02]'
      )}>
        <div className={cn('flex gap-3.5', compact ? 'px-4 py-3' : 'px-4 py-3.5 sm:px-5')}>
          {/* Left: Avatar with tooltip */}
          <div className="shrink-0 pt-0.5">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Avatar className={cn(compact ? 'h-8 w-8' : 'h-10 w-10', 'ring-2 ring-background shadow-sm')}>
                    {post.author?.avatar && <AvatarImage src={post.author.avatar} />}
                    <AvatarFallback className={cn(compact ? 'text-xs' : 'text-sm', 'font-medium')}>{initials}</AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent side="left" className="text-xs">
                  {post.author?.name || 'Anonymous'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Center: Content */}
          <div className="flex-1 min-w-0">
            {/* Title row */}
            <div className="flex items-start gap-2">
              <h3 className={cn(
                'font-semibold text-foreground group-hover:text-primary transition-colors leading-snug flex-1 min-w-0',
                compact ? 'text-sm' : 'text-[15px]'
              )}>
                {post.isPinned && (
                  <Pin className="h-3.5 w-3.5 inline-block mr-1.5 text-primary shrink-0 -mt-0.5" />
                )}
                <span className="line-clamp-1">{post.title}</span>
              </h3>
              {post.isAnswered && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/40 px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap">
                  <CheckCircle2 className="h-3 w-3" />
                  {forumT.answered}
                </span>
              )}
            </div>

            {/* Info row */}
            <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground flex-wrap">
              {showChannel && post.channel && (
                <Badge
                  variant="secondary"
                  className="text-[11px] font-normal h-[18px] px-1.5 gap-0.5"
                  style={post.channel.color ? { backgroundColor: post.channel.color + '12', color: post.channel.color, borderColor: post.channel.color + '25' } : undefined}
                >
                  {post.channel.icon && <span>{post.channel.icon}</span>}
                  {getChannelName()}
                </Badge>
              )}
              {post.tags?.map(({ tag }) => (
                <Badge
                  key={tag.id}
                  variant="outline"
                  className="text-[11px] font-normal h-[18px] px-1.5"
                  style={tag.color ? { borderColor: tag.color + '50', color: tag.color } : undefined}
                >
                  {tag.name}
                </Badge>
              ))}
              {post.isLocked && (
                <span className="inline-flex items-center gap-0.5 text-orange-500">
                  <Lock className="h-3 w-3" />
                </span>
              )}
              <span className="text-muted-foreground/40">·</span>
              <span className={cn(
                'font-medium',
                post.author?.role === 'ADMIN' ? 'text-primary' : post.author?.role === 'SUPPORT' ? 'text-blue-600 dark:text-blue-400' : 'text-foreground/60'
              )}>{post.author?.name || 'Anonymous'}</span>
              <span className="text-muted-foreground/40">·</span>
              <span>{timeAgo(post.createdAt, language)}</span>
            </div>

            {/* Excerpt */}
            {hasExcerpt && (
              <p className="text-[13px] text-muted-foreground/70 line-clamp-2 leading-relaxed mt-1.5">
                {excerpt}{excerpt.length >= 200 ? '…' : ''}
              </p>
            )}

            {/* Bottom: activity + stats */}
            <div className="flex items-center justify-between gap-3 mt-2">
              {/* Activity line */}
              <div className="text-xs text-muted-foreground truncate">
                {hasLastActivity ? (
                  <span>
                    <span className={cn(
                      'font-medium',
                      lastComment.author.role === 'ADMIN' ? 'text-primary' : lastComment.author.role === 'SUPPORT' ? 'text-blue-600 dark:text-blue-400' : 'text-foreground/60'
                    )}>{lastComment.author.name}</span>
                    {' '}{forumT.repliedBy}{' '}
                    <span>{timeAgo(lastComment.createdAt, language)}</span>
                  </span>
                ) : (
                  <span>
                    <span className={cn(
                      'font-medium',
                      post.author?.role === 'ADMIN' ? 'text-primary' : post.author?.role === 'SUPPORT' ? 'text-blue-600 dark:text-blue-400' : 'text-foreground/60'
                    )}>{post.author?.name}</span>
                    {' '}{forumT.postedBy}{' '}
                    <span>{timeAgo(post.createdAt, language)}</span>
                  </span>
                )}
              </div>

              {/* Stats */}
              <div className="flex items-center gap-2.5 shrink-0">
                {post.reactionSummary?.filter(r => r.count > 0).slice(0, 3).map((r) => (
                  <span key={r.emoji} className="inline-flex items-center gap-0.5 text-xs">
                    <span className="text-[13px]">{r.emoji}</span>
                    <span className="text-muted-foreground/60">{r.count}</span>
                  </span>
                ))}
                {upvoteCount > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
                    <ArrowBigUp className="h-3.5 w-3.5" />
                    <span>{upvoteCount}</span>
                  </span>
                )}
                <span className={cn(
                  'inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full',
                  commentCount > 0
                    ? 'bg-muted font-medium text-muted-foreground'
                    : 'text-muted-foreground/40'
                )}>
                  <MessageSquare className="h-3.5 w-3.5" />
                  {commentCount}
                </span>
              </div>
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}
