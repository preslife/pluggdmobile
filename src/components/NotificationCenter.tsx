import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, BellRing, Check, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { NotificationPreferences } from '@/components/NotificationPreferences';
import { getNotificationDebugInfo } from '@/services/notifications/debug';

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

const PAGE_SIZE = 20;

export const NotificationCenter = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const { user } = useAuth();
  const { toast } = useToast();

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
      console.error('Error loading unread count', error);
    }
  }, [user]);

  const fetchNotifications = useCallback(
    async (nextLimit?: number) => {
      if (!user) {
        setNotifications([]);
        setLoading(false);
        return;
      }

      const targetLimit = nextLimit ?? limit;

      try {
        if (!nextLimit) {
          setLoading(true);
        }
        const { data, error } = await supabase.rpc('notifications_list_recent', { p_limit: targetLimit });
        if (error) throw error;

        const notificationList = ((data as Notification[]) || []).map((notification) => ({
          ...notification,
          payload: notification.payload ?? {},
          read_at: notification.read_at ?? null,
        }));
        setNotifications(notificationList);
        setLimit(targetLimit);
        await refreshUnreadCount();
      } catch (error) {
        console.error('Error fetching notifications:', error);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [user, limit, refreshUnreadCount],
  );

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    void fetchNotifications();

    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications((prev) => {
            const filtered = prev.filter((item) => item.id !== newNotification.id);
            return [
              {
                ...newNotification,
                payload: newNotification.payload ?? {},
                read_at: newNotification.read_at ?? null,
              },
              ...filtered,
            ].slice(0, limit);
          });

          toast({
            title: newNotification.title,
            description: newNotification.message,
          });

          void refreshUnreadCount();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, toast, fetchNotifications, refreshUnreadCount, limit]);

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase.rpc('notifications_mark_read', { p_notification_id: notificationId });
      if (error) throw error;

      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n)),
      );
      await refreshUnreadCount();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    try {
      const { error } = await supabase.rpc('notifications_mark_all_read');
      if (error) throw error;

      const nowIso = new Date().toISOString();
      setNotifications((prev) => prev.map((n) => ({ ...n, read_at: nowIso })));
      await refreshUnreadCount();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
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

  const handleLoadMore = async () => {
    if (loadingMore) return;
    const nextLimit = limit + PAGE_SIZE;
    setLoadingMore(true);
    await fetchNotifications(nextLimit);
  };

  const canLoadMore = notifications.length >= limit;

  if (!user) {
    return null;
  }

  const notificationDebugInfo = getNotificationDebugInfo(notifications);

  const notificationCard = loading ? (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notifications
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </CardContent>
    </Card>
  ) : (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {unreadCount > 0 ? (
              <BellRing className="h-5 w-5" />
            ) : (
              <Bell className="h-5 w-5" />
            )}
            Notifications
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </CardTitle>
          {unreadCount > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={markAllAsRead}
              className="flex items-center gap-1"
            >
              <Check className="h-3 w-3" />
              Mark all read
            </Button>
          )}
        </div>
        {notificationDebugInfo && (
          <p className="text-xs text-muted-foreground">
            Updated {formatDistanceToNow(notificationDebugInfo.latestCreatedAt, { addSuffix: true })}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {notifications.length === 0 ? (
          <div className="text-center py-8">
            <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              No notifications yet. We'll notify you when something happens!
            </p>
          </div>
        ) : (
          notifications.map((notification) => (
            <Card 
              key={notification.id} 
              className={`bg-card/50 transition-all ${
                !notification.read_at ? 'border-primary/50 bg-primary/5' : ''
              }`}
            >
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  <div className="text-xl">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-semibold text-sm">
                        {notification.title}
                      </h4>
                      {!notification.read_at && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => markAsRead(notification.id)}
                          className="h-6 w-6 p-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {notification.message}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
            ))
        )}
        {canLoadMore && (
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            onClick={handleLoadMore}
            disabled={loadingMore}
          >
            {loadingMore ? 'Loading…' : 'Load older notifications'}
          </Button>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <NotificationPreferences variant="compact" />
      {notificationCard}
    </div>
  );
};
