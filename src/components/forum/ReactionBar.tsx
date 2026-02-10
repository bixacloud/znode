import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SmilePlus } from 'lucide-react';
import { cn } from '@/lib/utils';

const QUICK_EMOJIS = ['👍', '❤️', '🎉', '🤔', '👀', '🚀', '💯', '😄'];

interface ReactionBarProps {
  reactions: { emoji: string; count: number }[];
  userReactions: string[];
  onToggle: (emoji: string) => Promise<any>;
  queryKey: string[];
  size?: 'sm' | 'default';
}

export default function ReactionBar({ reactions, userReactions, onToggle, queryKey, size = 'default' }: ReactionBarProps) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = async (emoji: string) => {
    try {
      await onToggle(emoji);
      queryClient.invalidateQueries({ queryKey });
    } catch (e) {
      // ignore
    }
    setIsOpen(false);
  };

  const btnSize = size === 'sm' ? 'h-6 text-xs px-1.5' : 'h-7 text-sm px-2';

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {reactions.filter(r => r.count > 0).map((r) => (
        <button
          key={r.emoji}
          onClick={() => handleToggle(r.emoji)}
          className={cn(
            'inline-flex items-center gap-1 rounded-full border transition-colors',
            btnSize,
            userReactions.includes(r.emoji)
              ? 'bg-primary/10 border-primary/30 text-primary'
              : 'bg-muted/50 border-transparent hover:border-muted-foreground/20'
          )}
        >
          <span>{r.emoji}</span>
          <span className="font-medium">{r.count}</span>
        </button>
      ))}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className={cn('p-0 opacity-60 hover:opacity-100', size === 'sm' ? 'h-6 w-6' : 'h-7 w-7')}>
            <SmilePlus className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start">
          <div className="flex gap-1">
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleToggle(emoji)}
                className={cn(
                  'text-lg p-1 rounded hover:bg-muted transition-colors',
                  userReactions.includes(emoji) && 'bg-primary/10'
                )}
              >
                {emoji}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
