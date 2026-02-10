import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Reply, Edit, Trash2, CheckCircle2, MoreVertical, Loader2, CornerDownRight } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import TipTapEditor from '@/components/TipTapEditor';
import { cn } from '@/lib/utils';
import { forumApi, type ForumComment } from '@/services/forum';
import { useLanguage } from '@/contexts/LanguageContext';
import ReactionBar from './ReactionBar';

interface CommentItemProps {
  comment: ForumComment;
  postId: string;
  currentUserId?: string;
  currentUserRole?: string;
  isReply?: boolean;
  onReply?: (parentId: string) => void;
  parentAuthorName?: string;
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function stripHtml(html: string): string {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

export default function CommentItem({ comment, postId, currentUserId, currentUserRole, isReply = false, onReply, parentAuthorName }: CommentItemProps) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);

  const forumT = {
    reply: t.forum?.reply || 'Reply',
    edit: t.forum?.edit || 'Edit',
    delete: t.forum?.delete || 'Delete',
    save: t.forum?.save || 'Save',
    cancel: t.common?.cancel || 'Cancel',
    answer: t.forum?.answer || 'Answer',
    deleteConfirm: t.forum?.deleteCommentConfirm || 'Are you sure you want to delete this comment?',
    deleteDesc: t.forum?.deleteCommentDesc || 'This action cannot be undone.',
    replyingToUser: t.forum?.replyingToUser || 'Replying to',
    replies: t.forum?.replies || 'replies',
  };

  const isOwner = currentUserId === comment.authorId;
  const isAdmin = currentUserRole === 'ADMIN';
  const canEdit = isOwner || isAdmin;
  const initials = comment.author?.name?.slice(0, 2).toUpperCase() || '??';

  const updateMutation = useMutation({
    mutationFn: () => forumApi.updateComment(comment.id, editContent),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forum-comments', postId] });
      setIsEditing(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => forumApi.deleteComment(comment.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forum-comments', postId] });
      queryClient.invalidateQueries({ queryKey: ['forum-post'] });
    },
  });

  return (
    <div className={cn(isReply && 'ml-10 relative before:absolute before:left-[-20px] before:top-0 before:bottom-0 before:w-px before:bg-border/60')}>
      <div
        id={`comment_${comment.id}`}
        className={cn(
          'relative rounded-lg transition-colors',
          comment.isAnswer
            ? 'bg-green-50/80 dark:bg-green-950/20 ring-1 ring-green-200 dark:ring-green-800'
            : 'hover:bg-muted/30'
        )}
      >
        {/* Comment header */}
        <div className="flex items-center gap-3 px-4 pt-4 pb-2">
          <Avatar className="h-8 w-8 shrink-0 ring-2 ring-background">
            {comment.author?.avatar && <AvatarImage src={comment.author.avatar} />}
            <AvatarFallback className="text-xs font-medium">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
            <span className={cn(
              'text-sm font-semibold',
              comment.author?.role === 'ADMIN' ? 'text-primary' : comment.author?.role === 'SUPPORT' ? 'text-blue-600 dark:text-blue-400' : 'text-foreground'
            )}>{comment.author?.name || 'Anonymous'}</span>
            {comment.author?.role === 'ADMIN' && (
              <Badge className="text-[10px] py-0 h-4 px-1.5 bg-primary/10 text-primary border-primary/20 font-medium" variant="outline">
                Admin
              </Badge>
            )}
            {comment.author?.role === 'SUPPORT' && (
              <Badge className="text-[10px] py-0 h-4 px-1.5 bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 font-medium" variant="outline">
                Support
              </Badge>
            )}
            {comment.isAnswer && (
              <Badge className="text-[10px] py-0 h-4 px-1.5 bg-green-600 text-white font-medium gap-0.5">
                <CheckCircle2 className="h-3 w-3" />
                {forumT.answer}
              </Badge>
            )}
            {/* Parent reply indicator */}
            {isReply && parentAuthorName && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <CornerDownRight className="h-3 w-3" />
                      <span className="font-medium">{parentAuthorName}</span>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    {forumT.replyingToUser} {parentAuthorName}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <span className="text-xs text-muted-foreground">·</span>
            <time className="text-xs text-muted-foreground" title={new Date(comment.createdAt).toLocaleString()}>
              {timeAgo(comment.createdAt)}
            </time>
          </div>
          {canEdit && !isEditing && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 hover:opacity-100 shrink-0">
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsEditing(true)}>
                  <Edit className="h-3.5 w-3.5 mr-2" />
                  {forumT.edit}
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive" onClick={() => setShowDeleteAlert(true)}>
                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                  {forumT.delete}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Comment content */}
        <div className="px-4 pb-3">
          {isEditing ? (
            <div className="space-y-3 ml-11">
              <TipTapEditor
                value={editContent}
                onChange={setEditContent}
                placeholder=""
                minHeight={100}
                simple
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
                  {updateMutation.isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                  {forumT.save}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setIsEditing(false); setEditContent(comment.content); }}>
                  {forumT.cancel}
                </Button>
              </div>
            </div>
          ) : (
            <div className="ml-11 prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0" dangerouslySetInnerHTML={{ __html: comment.content }} />
          )}

          {/* Admin/Support signature */}
          {!isEditing && comment.author?.adminSignature && (comment.author?.role === 'ADMIN' || comment.author?.role === 'SUPPORT') && (
            <div className="ml-11 mt-3 pt-3 border-t border-border/40">
              <div className="text-xs text-muted-foreground/80 prose prose-xs dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0" dangerouslySetInnerHTML={{ __html: comment.author.adminSignature }} />
            </div>
          )}
        </div>

        {/* Actions bar */}
        {!isEditing && (
          <div className="flex items-center gap-2 px-4 pb-3 ml-11">
            <ReactionBar
              reactions={comment.reactionSummary || []}
              userReactions={comment.userReactions || []}
              onToggle={(emoji) => forumApi.toggleCommentReaction(comment.id, emoji)}
              queryKey={['forum-comments', postId]}
              size="sm"
            />
            {!isReply && onReply && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1"
                onClick={() => onReply(comment.id)}
              >
                <Reply className="h-3 w-3" />
                {forumT.reply}
              </Button>
            )}
            {/* Reply count */}
            {!isReply && comment.replies && comment.replies.length > 0 && (
              <span className="text-xs text-muted-foreground ml-auto">
                {comment.replies.length} {forumT.replies}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Nested replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-1 space-y-1">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              postId={postId}
              currentUserId={currentUserId}
              currentUserRole={currentUserRole}
              isReply
              parentAuthorName={comment.author?.name || 'Anonymous'}
            />
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{forumT.deleteConfirm}</AlertDialogTitle>
            <AlertDialogDescription>{forumT.deleteDesc}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{forumT.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate()} className="bg-destructive text-destructive-foreground">
              {forumT.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
