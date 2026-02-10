import { useState, useEffect, useRef } from 'react';
import { Bell, Check, ExternalLink, LogIn, LogOut, KeyRound, Shield, ShieldOff, User, Server, MessageSquare, Ban, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  metadata: Record<string, any> | null;
  isRead: boolean;
  createdAt: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'LOGIN':
      return <LogIn className="h-4 w-4 text-green-500" />;
    case 'LOGOUT':
      return <LogOut className="h-4 w-4 text-gray-500" />;
    case 'PASSWORD_CHANGE':
      return <KeyRound className="h-4 w-4 text-orange-500" />;
    case 'OTP_ENABLED':
      return <Shield className="h-4 w-4 text-blue-500" />;
    case 'OTP_DISABLED':
      return <ShieldOff className="h-4 w-4 text-red-500" />;
    case 'PROFILE_UPDATE':
      return <User className="h-4 w-4 text-purple-500" />;
    case 'HOSTING_CREATED':
    case 'HOSTING_ACTIVATED':
      return <Server className="h-4 w-4 text-green-500" />;
    case 'HOSTING_SUSPENDED':
      return <Server className="h-4 w-4 text-red-500" />;
    case 'HOSTING_REACTIVATED':
      return <Server className="h-4 w-4 text-blue-500" />;
    case 'HOSTING_DELETED':
      return <Server className="h-4 w-4 text-gray-500" />;
    case 'TICKET_CREATED':
    case 'TICKET_REPLIED':
      return <MessageSquare className="h-4 w-4 text-blue-500" />;
    case 'TICKET_CLOSED':
      return <MessageSquare className="h-4 w-4 text-gray-500" />;
    case 'ADMIN_BLOCKED':
      return <Ban className="h-4 w-4 text-red-500" />;
    case 'ADMIN_UNBLOCKED':
      return <UserCheck className="h-4 w-4 text-green-500" />;
    default:
      return <Bell className="h-4 w-4 text-gray-500" />;
  }
};

const formatTimeAgo = (dateString: string, t: any) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return t.notification?.justNow || 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

// Helper to interpolate template strings like "{{ip}}" with metadata values
const interpolate = (template: string, data: Record<string, any> | null): string => {
  if (!template || !data) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (key === 'changes' && Array.isArray(data[key])) {
      return data[key].join(', ');
    }
    // Format country with parentheses if exists
    if (key === 'country') {
      return data[key] ? ` (${data[key]})` : '';
    }
    return data[key] ?? '';
  });
};

// Get localized notification title and message based on type and metadata
const getLocalizedNotification = (notification: Notification, t: any) => {
  const typeData = t.notification?.types?.[notification.type];
  const metadata = notification.metadata || {};
  
  if (!typeData) {
    return { title: notification.title, message: notification.message };
  }
  
  let title = typeData.title;
  // Special case for TICKET_REPLIED - check if from admin
  if (notification.type === 'TICKET_REPLIED' && metadata.isFromAdmin && typeData.titleAdmin) {
    title = typeData.titleAdmin;
  }
  
  return {
    title: interpolate(title, metadata),
    message: interpolate(typeData.message, metadata),
  };
};

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const location = useLocation();
  const { t } = useLanguage();
  
  // Determine the correct link based on current path
  const notificationsLink = location.pathname.startsWith('/admin') 
    ? '/admin/notifications' 
    : '/user/notifications';

  const fetchUnreadCount = async () => {
    try {
      const response = await fetch(`${API_URL}/api/notifications/unread-count`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.count);
      }
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  };

  const fetchRecentNotifications = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_URL}/api/notifications/recent`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
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
      console.error('Failed to mark as read:', error);
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
      }
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    
    // Poll for new notifications every 30 seconds
    intervalRef.current = setInterval(fetchUnreadCount, 30000);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchRecentNotifications();
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="fixed bottom-6 right-6 z-50"
      >
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative h-14 w-14 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg hover:shadow-xl transition-shadow flex items-center justify-center"
            >
              <Bell className="h-6 w-6" />
              {unreadCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 h-6 w-6 flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold shadow-md"
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </motion.span>
              )}
            </motion.button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0 mr-2" align="end" side="top" sideOffset={12}>
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h4 className="font-semibold">{t.notification?.title || 'Notifications'}</h4>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={markAllAsRead}
                >
                  <Check className="h-3 w-3 mr-1" />
                  {t.notification?.markAllRead || 'Mark all read'}
                </Button>
              )}
            </div>
            <ScrollArea className="h-[300px]">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground text-sm">{t.notification?.loading || 'Loading...'}</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-8">
                  <Bell className="h-10 w-10 text-muted-foreground/50 mb-2" />
                  <p className="text-muted-foreground text-sm">{t.notification?.noNotifications || 'No notifications'}</p>
                </div>
              ) : (
                <div className="divide-y">
                  {notifications.map((notification) => {
                    const localized = getLocalizedNotification(notification, t);
                    return (
                      <div
                        key={notification.id}
                        className={cn(
                          "flex items-start gap-3 px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors",
                          !notification.isRead && "bg-blue-50 dark:bg-blue-950/20"
                        )}
                        onClick={() => !notification.isRead && markAsRead(notification.id)}
                      >
                        <div className="mt-0.5">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "text-sm line-clamp-1",
                            !notification.isRead && "font-medium"
                          )}>
                            {localized.title}
                          </p>
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                            {localized.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatTimeAgo(notification.createdAt, t)}
                          </p>
                        </div>
                        {!notification.isRead && (
                          <div className="w-2 h-2 rounded-full bg-blue-500 mt-2" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
            <div className="border-t px-4 py-2">
              <Link to={notificationsLink} onClick={() => setIsOpen(false)}>
                <Button variant="ghost" size="sm" className="w-full text-xs">
                  {t.notification?.viewAll || 'View all notifications'}
                  <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </div>
          </PopoverContent>
        </Popover>
      </motion.div>
    </AnimatePresence>
  );
}
