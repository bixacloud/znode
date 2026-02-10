import { Link, useLocation } from 'react-router-dom';
import { Hash, MessageSquare, Layers } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { ForumChannel } from '@/services/forum';
import { useLanguage } from '@/contexts/LanguageContext';

interface ChannelSidebarProps {
  channels: ForumChannel[];
  activeSlug?: string;
}

export default function ChannelSidebar({ channels, activeSlug }: ChannelSidebarProps) {
  const { language, t } = useLanguage();
  const location = useLocation();
  const forumT = {
    allChannels: t.forum?.allChannels || 'All Channels',
    channels: t.forum?.channels || 'Channels',
  };

  const isAllActive = location.pathname === '/user/forum' && !activeSlug;

  const getChannelName = (ch: ForumChannel) => {
    if (ch.translations && typeof ch.translations === 'object') {
      const trans = ch.translations as Record<string, any>;
      if (trans[language]?.name) return trans[language].name;
    }
    return ch.name;
  };

  const getChannelDesc = (ch: ForumChannel) => {
    if (ch.translations && typeof ch.translations === 'object') {
      const trans = ch.translations as Record<string, any>;
      if (trans[language]?.description) return trans[language].description;
    }
    return ch.description || '';
  };

  const totalPosts = channels.reduce((sum, ch) => sum + (ch._count?.posts || 0), 0);

  return (
    <div className="space-y-1">
      <h3 className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
        <Layers className="h-3.5 w-3.5" />
        {forumT.channels}
      </h3>
      <Link
        to="/user/forum"
        className={cn(
          'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
          isAllActive
            ? 'bg-primary/10 text-primary font-medium'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
        )}
      >
        <MessageSquare className="h-4 w-4 shrink-0" />
        <span className="flex-1 truncate">{forumT.allChannels}</span>
        {totalPosts > 0 && (
          <span className="text-[11px] tabular-nums text-muted-foreground/70">{totalPosts}</span>
        )}
      </Link>
      {channels.map((ch) => {
        const desc = getChannelDesc(ch);
        const channelLink = (
          <Link
            key={ch.id}
            to={`/user/forum?channel=${ch.slug}`}
            className={cn(
              'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
              activeSlug === ch.slug
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
          >
            {ch.icon ? (
              <span className="text-base shrink-0">{ch.icon}</span>
            ) : (
              <Hash className="h-4 w-4 shrink-0" style={ch.color ? { color: ch.color } : undefined} />
            )}
            <span className="truncate flex-1">{getChannelName(ch)}</span>
            {ch._count?.posts !== undefined && ch._count.posts > 0 && (
              <span className="text-[11px] tabular-nums text-muted-foreground/70">{ch._count.posts}</span>
            )}
          </Link>
        );

        if (desc) {
          return (
            <TooltipProvider key={ch.id}>
              <Tooltip>
                <TooltipTrigger asChild>{channelLink}</TooltipTrigger>
                <TooltipContent side="right" className="text-xs max-w-48">{desc}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        }
        return channelLink;
      })}
    </div>
  );
}
