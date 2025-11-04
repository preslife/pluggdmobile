import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, BellRing, Check, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  payload: any;
  read_at: string | null;
  created_at: string;
  related_id?: string | null;
  related_type?: string | null;
}

export const NotificationBell = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const refreshUnreadCount = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    try {
      const { data, error } = await supabase.rpc('notifications_unread_count');
      if (error) throw error;
      setUnreadCount(data ?? 0);
    } catch (error) {
      console.error('Error fetching unread notifications:', error);
    }
  }, [user]);

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('notifications_list_recent', { p_limit: 20 });
      if (error) throw error;

      const notificationList = ((data as Notification[]) || []).map((notification) => ({
        ...notification,
        payload: notification.payload ?? {},
        read_at: notification.read_at ?? null,
      }));
      setNotifications(notificationList);
      await refreshUnreadCount();
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [user, refreshUnreadCount]);

  useEffect(() => {
    const handler = () => {
      setIsOpen(true);
      fetchNotifications();
    };
    window.addEventListener('open-notifications', handler);
    return () => window.removeEventListener('open-notifications', handler);
  }, [fetchNotifications]);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    fetchNotifications();

    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        async (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications(prev => {
            const filtered = prev.filter(notification => notification.id !== newNotification.id);
            return [
              {
                ...newNotification,
                payload: (newNotification as Notification).payload ?? {},
              },
              ...filtered
            ];
          });

          toast({
            title: newNotification.title,
            description: newNotification.message,
          });

          await refreshUnreadCount();
          await fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, toast, fetchNotifications, refreshUnreadCount]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      setIsOpen(nextOpen);
      if (nextOpen) {
        fetchNotifications();
      } else {
        refreshUnreadCount();
      }
    },
    [fetchNotifications, refreshUnreadCount]
  );

  const markAsRead = async (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    try {
      await supabase.rpc('notifications_mark_read', { p_notification_id: notificationId });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    } finally {
      await refreshUnreadCount();
      await fetchNotifications();
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    setNotifications([]);
    try {
      await supabase.rpc('notifications_mark_all_read');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    } finally {
      await refreshUnreadCount();
      await fetchNotifications();
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'follow':
        return '👥';
      case 'support':
        return '💖';
      case 'purchase':
        return '💰';
      case 'session_feedback':
        return '🎵';
      default:
        return '🔔';
    }
  };

  if (!user) {
    return null;
  }

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          {unreadCount > 0 ? (
            <BellRing className="h-5 w-5" />
          ) : (
            <Bell className="h-5 w-5" />
          )}
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={markAllAsRead}
                className="h-7 text-xs"
              >
                <Check className="h-3 w-3 mr-1" />
                Mark all read
              </Button>
            )}
          </div>
        </div>
        
        <ScrollArea className="h-96">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8 px-4">
              <Bell className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                No notifications yet
              </p>
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {notifications.map((notification) => (
                <Card 
                  key={notification.id} 
                  className={`cursor-pointer transition-all hover:bg-muted/50 ${
                    !notification.read_at ? 'border-primary/50 bg-primary/5' : 'bg-card/50'
                  }`}
                  onClick={async () => {
                    // Navigate to related entity if provided
                    try {
                      if (notification.related_type === 'release' && notification.related_id) {
                        navigate(`/release/${notification.related_id}`);
                      }
                      await markAsRead(notification.id);
                      setIsOpen(false);
                    } catch {}
                  }}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start gap-2">
                      <div className="text-lg">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-medium text-sm truncate">
                            {notification.title}
                          </h4>
                          {!notification.read_at && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(notification.id);
                              }}
                              className="h-5 w-5 p-0 ml-2"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mb-1">
                          {notification.message}
                        </p>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};