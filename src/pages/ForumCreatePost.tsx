import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import TipTapEditor from '@/components/TipTapEditor';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { forumApi } from '@/services/forum';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';

export default function ForumCreatePost() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { toast } = useToast();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [channelId, setChannelId] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const forumT = {
    createPost: t.forum?.createPost || 'Create Post',
    editPost: t.forum?.editPost || 'Edit Post',
    titleLabel: t.forum?.titleLabel || 'Title',
    titlePlaceholder: t.forum?.titlePlaceholder || 'What do you want to discuss?',
    contentLabel: t.forum?.contentLabel || 'Content',
    contentPlaceholder: t.forum?.contentPlaceholder || 'Share your thoughts, questions, or ideas...',
    channelLabel: t.forum?.channelLabel || 'Channel',
    channelPlaceholder: t.forum?.channelPlaceholder || 'Select a channel',
    tagsLabel: t.forum?.tagsLabel || 'Tags',
    submit: t.forum?.submit || 'Publish',
    update: t.forum?.update || 'Update',
    back: t.forum?.backToForum || 'Back to Forum',
    required: t.forum?.required || 'This field is required',
  };

  const { data: channels = [] } = useQuery({
    queryKey: ['forum-channels'],
    queryFn: forumApi.getChannels,
  });

  // Load post data for editing
  const { data: editPost } = useQuery({
    queryKey: ['forum-post', id],
    queryFn: () => forumApi.getPost(id!),
    enabled: isEdit,
  });

  useEffect(() => {
    if (editPost) {
      setTitle(editPost.title);
      setContent(editPost.content);
      setChannelId(editPost.channelId);
      setSelectedTags(editPost.tags?.map(t => t.tag.id) || []);
    }
  }, [editPost]);

  const selectedChannel = channels.find(c => c.id === channelId);
  const availableTags = selectedChannel?.tags || [];

  const getChannelName = (ch: any) => {
    if (ch.translations && typeof ch.translations === 'object') {
      const trans = ch.translations as Record<string, any>;
      if (trans[language]?.name) return trans[language].name;
    }
    return ch.name;
  };

  const createMutation = useMutation({
    mutationFn: () => isEdit
      ? forumApi.updatePost(id!, { title, content, tagIds: selectedTags })
      : forumApi.createPost({ title, content, channelId, tagIds: selectedTags }),
    onSuccess: (post) => {
      toast({ title: isEdit ? 'Post updated' : 'Post created' });
      navigate(`/user/forum/post/${post.id}`);
    },
    onError: (err: any) => {
      toast({ title: err?.error || 'Failed to save post', variant: 'destructive' });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || (!isEdit && !channelId)) return;
    createMutation.mutate();
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <Link to="/user/forum" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 mr-1" />
          {forumT.back}
        </Link>

        <Card>
          <CardHeader>
            <CardTitle>{isEdit ? forumT.editPost : forumT.createPost}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Channel selection */}
              {!isEdit && (
                <div className="space-y-2">
                  <Label>{forumT.channelLabel} *</Label>
                  <Select value={channelId} onValueChange={(v) => { setChannelId(v); setSelectedTags([]); }}>
                    <SelectTrigger>
                      <SelectValue placeholder={forumT.channelPlaceholder} />
                    </SelectTrigger>
                    <SelectContent>
                      {channels.filter(c => c.allowPosts).map(ch => (
                        <SelectItem key={ch.id} value={ch.id}>
                          {ch.icon && <span className="mr-2">{ch.icon}</span>}
                          {getChannelName(ch)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Title */}
              <div className="space-y-2">
                <Label>{forumT.titleLabel} *</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={forumT.titlePlaceholder}
                  maxLength={200}
                />
              </div>

              {/* Content */}
              <div className="space-y-2">
                <Label>{forumT.contentLabel} *</Label>
                <TipTapEditor
                  value={content}
                  onChange={setContent}
                  placeholder={forumT.contentPlaceholder}
                  minHeight={250}
                  showHtmlToggle
                />
              </div>

              {/* Tags */}
              {availableTags.length > 0 && (
                <div className="space-y-2">
                  <Label>{forumT.tagsLabel}</Label>
                  <div className="flex flex-wrap gap-2">
                    {availableTags.map(tag => (
                      <Badge
                        key={tag.id}
                        variant={selectedTags.includes(tag.id) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        style={tag.color ? { borderColor: tag.color, ...(selectedTags.includes(tag.id) ? { backgroundColor: tag.color } : { color: tag.color }) } : undefined}
                        onClick={() => toggleTag(tag.id)}
                      >
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Submit */}
              <div className="flex justify-end gap-2">
                <Link to="/user/forum">
                  <Button type="button" variant="outline">{forumT.back}</Button>
                </Link>
                <Button
                  type="submit"
                  disabled={!title.trim() || !content.trim() || (!isEdit && !channelId) || createMutation.isPending}
                >
                  {createMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  {isEdit ? forumT.update : forumT.submit}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
