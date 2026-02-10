import { useState, useEffect } from 'react';
import { Bell, Check, Trash2, LogIn, LogOut, KeyRound, Shield, ShieldOff, User, Server, MessageSquare, Ban, UserCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  metadata: Record<string, any> | null;
  isRead: boolean;
  createdAt: string;
}

interface NotificationsResponse {
  notifications: Notification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  unreadCount: number;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'LOGIN':
      return <LogIn className="h-5 w-5 text-green-500" />;
    case 'LOGOUT':
      return <LogOut className="h-5 w-5 text-gray-500" />;
    case 'PASSWORD_CHANGE':
      return <KeyRound className="h-5 w-5 text-orange-500" />;
    case 'OTP_ENABLED':
      return <Shield className="h-5 w-5 text-blue-500" />;
    case 'OTP_DISABLED':
      return <ShieldOff className="h-5 w-5 text-red-500" />;
    case 'PROFILE_UPDATE':
      return <User className="h-5 w-5 text-purple-500" />;
    case 'HOSTING_CREATED':
    case 'HOSTING_ACTIVATED':
      return <Server className="h-5 w-5 text-green-500" />;
    case 'HOSTING_SUSPENDED':
      return <Server className="h-5 w-5 text-red-500" />;
    case 'HOSTING_REACTIVATED':
      return <Server className="h-5 w-5 text-blue-500" />;
    case 'HOSTING_DELETED':
      return <Server className="h-5 w-5 text-gray-500" />;
    case 'TICKET_CREATED':
    case 'TICKET_REPLIED':
      return <MessageSquare className="h-5 w-5 text-blue-500" />;
    case 'TICKET_CLOSED':
      return <MessageSquare className="h-5 w-5 text-gray-500" />;
    case 'ADMIN_BLOCKED':
      return <Ban className="h-5 w-5 text-red-500" />;
    case 'ADMIN_UNBLOCKED':
      return <UserCheck className="h-5 w-5 text-green-500" />;
    default:
      return <Bell className="h-5 w-5 text-gray-500" />;
  }
};

const getTypeBadgeVariant = (type: string): "default" | "secondary" | "destructive" | "outline" => {
  if (type.includes('BLOCKED') || type.includes('SUSPENDED') || type.includes('DELETED')) {
    return 'destructive';
  }
  if (type.includes('LOGIN') || type.includes('CREATED') || type.includes('ACTIVATED') || type.includes('ENABLED') || type.includes('UNBLOCKED')) {
    return 'default';
  }
  return 'secondary';
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function UserNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchNotifications = async (page: number = 1) => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `${API_URL}/api/notifications?page=${page}&limit=${pagination.limit}`,
        { credentials: 'include' }
      );
      if (response.ok) {
        const data: NotificationsResponse = await response.json();
        setNotifications(data.notifications);
        setPagination(data.pagination);
        setUnreadCount(data.unreadCount);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      toast({ title: 'Error', description: 'Failed to load notifications', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const response = await fetch(`${API_URL}/api/notifications/${id}/read`, {
        method: 'PUT',
        credentials: 'include',
      });
      if (response.ok) {
        setNotifications(prev =>
          prev.map(n => (n.id === id ? { ...n, isRead: true } : n))
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to mark as read', variant: 'destructive' });
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch(`${API_URL}/api/notifications/read-all`, {
        method: 'PUT',
        credentials: 'include',
      });
      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
        toast({ title: 'Success', description: 'All notifications marked as read' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to mark all as read', variant: 'destructive' });
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const response = await fetch(`${API_URL}/api/notifications/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (response.ok) {
        setNotifications(prev => prev.filter(n => n.id !== id));
        setPagination(prev => ({ ...prev, total: prev.total - 1 }));
        toast({ title: 'Success', description: 'Notification deleted' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete notification', variant: 'destructive' });
    }
  };

  const clearAllRead = async () => {
    try {
      const response = await fetch(`${API_URL}/api/notifications/clear-read`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setNotifications(prev => prev.filter(n => !n.isRead));
        toast({ title: 'Success', description: `Cleared ${data.count} read notifications` });
        fetchNotifications(pagination.page);
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to clear notifications', variant: 'destructive' });
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  return (
    <DashboardLayout>
    <div className="container max-w-4xl py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="h-6 w-6" />
            Notifications
          </h1>
          <p className="text-muted-foreground mt-1">
            View your activity and account notifications
          </p>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead}>
              <Check className="h-4 w-4 mr-1" />
              Mark all read
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={clearAllRead}>
            <Trash2 className="h-4 w-4 mr-1" />
            Clear read
          </Button>
        </div>
      </div>

      {unreadCount > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="secondary">{unreadCount}</Badge>
          unread notification{unreadCount !== 1 ? 's' : ''}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Activity</CardTitle>
          <CardDescription>
            Showing {notifications.length} of {pagination.total} notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Bell className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No notifications yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                We'll notify you about important activity
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "flex items-start gap-4 py-4 px-2 rounded-lg transition-colors",
                    !notification.isRead && "bg-blue-50 dark:bg-blue-950/20"
                  )}
                >
                  <div className="mt-0.5">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={cn(
                        "text-sm",
                        !notification.isRead && "font-medium"
                      )}>
                        {notification.title}
                      </p>
                      <Badge variant={getTypeBadgeVariant(notification.type)} className="text-xs">
                        {notification.type.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {notification.message}
                    </p>
                    {notification.metadata && (
                      <div className="mt-2 text-xs text-muted-foreground bg-muted/50 rounded p-2">
                        {notification.metadata.ip && (
                          <div>IP: {notification.metadata.ip}</div>
                        )}
                        {notification.metadata.userAgent && (
                          <div className="truncate max-w-md">
                            Device: {notification.metadata.userAgent}
                          </div>
                        )}
                        {notification.metadata.domain && (
                          <div>Domain: {notification.metadata.domain}</div>
                        )}
                        {notification.metadata.ticketId && (
                          <div>Ticket: #{notification.metadata.ticketId.slice(-8).toUpperCase()}</div>
                        )}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      {formatDate(notification.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {!notification.isRead && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => markAsRead(notification.id)}
                        title="Mark as read"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => deleteNotification(notification.id)}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t mt-4">
              <p className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => fetchNotifications(pagination.page - 1)}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => fetchNotifications(pagination.page + 1)}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </DashboardLayout>
  );
}
