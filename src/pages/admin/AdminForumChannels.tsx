import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Edit, Trash2, Search, Loader2, Hash, GripVertical, Tag, MoreVertical,
  ChevronDown, ChevronUp, Eye, EyeOff, MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import AdminLayout from '@/components/admin/AdminLayout';
import { forumApi, type ForumChannel, type ForumTag } from '@/services/forum';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';

export default function AdminForumChannels() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [channelDialog, setChannelDialog] = useState(false);
  const [tagDialog, setTagDialog] = useState(false);
  const [editingChannel, setEditingChannel] = useState<ForumChannel | null>(null);
  const [editingTag, setEditingTag] = useState<ForumTag | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'channel' | 'tag'; id: string } | null>(null);
  const [expandedChannel, setExpandedChannel] = useState<string | null>(null);

  // Channel form
  const [chName, setChName] = useState('');
  const [chSlug, setChSlug] = useState('');
  const [chDescription, setChDescription] = useState('');
  const [chIcon, setChIcon] = useState('');
  const [chColor, setChColor] = useState('');
  const [chActive, setChActive] = useState(true);
  const [chAllowPosts, setChAllowPosts] = useState(true);

  // Tag form
  const [tagName, setTagName] = useState('');
  const [tagColor, setTagColor] = useState('');
  const [tagChannelId, setTagChannelId] = useState('');

  const adminT = {
    title: t.forum?.adminChannels || 'Forum Channels',
    subtitle: t.forum?.adminChannelsDesc || 'Manage forum channels and tags',
    addChannel: t.forum?.addChannel || 'Add Channel',
    editChannel: t.forum?.editChannel || 'Edit Channel',
    name: t.forum?.name || 'Name',
    slug: t.forum?.slug || 'Slug',
    description: t.forum?.description || 'Description',
    icon: t.forum?.icon || 'Icon (emoji)',
    color: t.forum?.color || 'Color',
    active: t.forum?.active || 'Active',
    allowPosts: t.forum?.allowPosts || 'Allow Posts',
    save: t.common?.save || 'Save',
    cancel: t.common?.cancel || 'Cancel',
    delete: t.forum?.delete || 'Delete',
    posts: t.forum?.posts || 'Posts',
    tags: t.forum?.tags || 'Tags',
    addTag: t.forum?.addTag || 'Add Tag',
    editTag: t.forum?.editTag || 'Edit Tag',
    deleteConfirm: t.forum?.deleteConfirm || 'Are you sure?',
    deleteChannelDesc: t.forum?.deleteChannelDesc || 'This will delete the channel and all its posts.',
    deleteTagDesc: t.forum?.deleteTagDesc || 'This will remove the tag from all posts.',
    noChannels: t.forum?.noChannels || 'No channels yet',
    order: t.forum?.order || 'Order',
  };

  const { data: channels = [], isLoading } = useQuery({
    queryKey: ['admin-forum-channels'],
    queryFn: forumApi.admin.getChannels,
  });

  const channelMutation = useMutation({
    mutationFn: () => {
      const data = {
        name: chName, slug: chSlug || undefined, description: chDescription,
        icon: chIcon || null, color: chColor || null,
        isActive: chActive, allowPosts: chAllowPosts,
      };
      return editingChannel
        ? forumApi.admin.updateChannel(editingChannel.id, data)
        : forumApi.admin.createChannel(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-forum-channels'] });
      setChannelDialog(false);
      resetChannelForm();
      toast({ title: editingChannel ? 'Channel updated' : 'Channel created' });
    },
    onError: (err: any) => {
      toast({ title: err?.error || 'Failed', variant: 'destructive' });
    },
  });

  const tagMutation = useMutation({
    mutationFn: () => {
      const data = { name: tagName, color: tagColor || undefined, channelId: tagChannelId };
      return editingTag
        ? forumApi.admin.updateTag(editingTag.id, { name: tagName, color: tagColor || undefined })
        : forumApi.admin.createTag(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-forum-channels'] });
      setTagDialog(false);
      resetTagForm();
      toast({ title: editingTag ? 'Tag updated' : 'Tag created' });
    },
    onError: (err: any) => {
      toast({ title: err?.error || 'Failed', variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => {
      if (!deleteTarget) throw new Error('No target');
      return deleteTarget.type === 'channel'
        ? forumApi.admin.deleteChannel(deleteTarget.id)
        : forumApi.admin.deleteTag(deleteTarget.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-forum-channels'] });
      setDeleteTarget(null);
      toast({ title: 'Deleted successfully' });
    },
  });

  const resetChannelForm = () => {
    setEditingChannel(null);
    setChName(''); setChSlug(''); setChDescription('');
    setChIcon(''); setChColor(''); setChActive(true); setChAllowPosts(true);
  };

  const resetTagForm = () => {
    setEditingTag(null);
    setTagName(''); setTagColor(''); setTagChannelId('');
  };

  const openEditChannel = (ch: ForumChannel) => {
    setEditingChannel(ch);
    setChName(ch.name); setChSlug(ch.slug); setChDescription(ch.description);
    setChIcon(ch.icon || ''); setChColor(ch.color || '');
    setChActive(ch.isActive); setChAllowPosts(ch.allowPosts);
    setChannelDialog(true);
  };

  const openAddTag = (channelId: string) => {
    resetTagForm();
    setTagChannelId(channelId);
    setTagDialog(true);
  };

  const openEditTag = (tag: ForumTag) => {
    setEditingTag(tag);
    setTagName(tag.name); setTagColor(tag.color || '');
    setTagChannelId(tag.channelId);
    setTagDialog(true);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{adminT.title}</h1>
            <p className="text-muted-foreground text-sm">{adminT.subtitle}</p>
          </div>
          <Button onClick={() => { resetChannelForm(); setChannelDialog(true); }}>
            <Plus className="h-4 w-4 mr-2" /> {adminT.addChannel}
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : channels.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Hash className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>{adminT.noChannels}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {channels.map((ch) => (
              <Card key={ch.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => setExpandedChannel(expandedChannel === ch.id ? null : ch.id)}>
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      {ch.icon ? (
                        <span className="text-xl">{ch.icon}</span>
                      ) : (
                        <Hash className="h-5 w-5" style={ch.color ? { color: ch.color } : undefined} />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base">{ch.name}</CardTitle>
                          {!ch.isActive && <Badge variant="secondary">Hidden</Badge>}
                          {!ch.allowPosts && <Badge variant="outline">Read-only</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">{ch.slug} · {ch._count?.posts || 0} {adminT.posts} · {ch._count?.tags || 0} {adminT.tags}</p>
                      </div>
                      {expandedChannel === ch.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm"><MoreVertical className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditChannel(ch)}>
                          <Edit className="h-4 w-4 mr-2" /> {adminT.editChannel}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openAddTag(ch.id)}>
                          <Tag className="h-4 w-4 mr-2" /> {adminT.addTag}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget({ type: 'channel', id: ch.id })}>
                          <Trash2 className="h-4 w-4 mr-2" /> {adminT.delete}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                {expandedChannel === ch.id && ch.tags && ch.tags.length > 0 && (
                  <CardContent>
                    <div className="space-y-1">
                      <h4 className="text-sm font-medium mb-2">{adminT.tags}</h4>
                      <div className="flex flex-wrap gap-2">
                        {ch.tags.map(tag => (
                          <div key={tag.id} className="flex items-center gap-1">
                            <Badge
                              variant="outline"
                              className="cursor-pointer"
                              style={tag.color ? { borderColor: tag.color, color: tag.color } : undefined}
                              onClick={() => openEditTag(tag)}
                            >
                              {tag.name}
                              <Edit className="h-2.5 w-2.5 ml-1 opacity-50" />
                            </Badge>
                            <button
                              onClick={() => setDeleteTarget({ type: 'tag', id: tag.id })}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Channel Dialog */}
      <Dialog open={channelDialog} onOpenChange={(open) => { if (!open) resetChannelForm(); setChannelDialog(open); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingChannel ? adminT.editChannel : adminT.addChannel}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{adminT.name} *</Label>
                <Input value={chName} onChange={(e) => setChName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{adminT.slug}</Label>
                <Input value={chSlug} onChange={(e) => setChSlug(e.target.value)} placeholder="auto-generated" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{adminT.description}</Label>
              <Textarea value={chDescription} onChange={(e) => setChDescription(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{adminT.icon}</Label>
                <Input value={chIcon} onChange={(e) => setChIcon(e.target.value)} placeholder="💬" />
              </div>
              <div className="space-y-2">
                <Label>{adminT.color}</Label>
                <Input type="color" value={chColor || '#6366f1'} onChange={(e) => setChColor(e.target.value)} />
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={chActive} onCheckedChange={setChActive} />
                <Label>{adminT.active}</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={chAllowPosts} onCheckedChange={setChAllowPosts} />
                <Label>{adminT.allowPosts}</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetChannelForm(); setChannelDialog(false); }}>{adminT.cancel}</Button>
            <Button onClick={() => channelMutation.mutate()} disabled={!chName.trim() || channelMutation.isPending}>
              {channelMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {adminT.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tag Dialog */}
      <Dialog open={tagDialog} onOpenChange={(open) => { if (!open) resetTagForm(); setTagDialog(open); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingTag ? adminT.editTag : adminT.addTag}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{adminT.name} *</Label>
              <Input value={tagName} onChange={(e) => setTagName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{adminT.color}</Label>
              <Input type="color" value={tagColor || '#6366f1'} onChange={(e) => setTagColor(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetTagForm(); setTagDialog(false); }}>{adminT.cancel}</Button>
            <Button onClick={() => tagMutation.mutate()} disabled={!tagName.trim() || tagMutation.isPending}>
              {tagMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {adminT.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{adminT.deleteConfirm}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.type === 'channel' ? adminT.deleteChannelDesc : adminT.deleteTagDesc}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{adminT.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate()} className="bg-destructive text-destructive-foreground">
              {adminT.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
