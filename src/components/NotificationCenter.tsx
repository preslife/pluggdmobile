import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, BellRing, Check, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { NotificationPreferences } from '@/components/NotificationPreferences';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data: any;
  read: boolean;
  created_at: string;
}

export const NotificationCenter = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchNotifications();
      
      // Subscribe to real-time notifications
      const channel = supabase
        .channel('notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            const newNotification = payload.new as Notification;
            setNotifications(prev => [newNotification, ...prev]);
            setUnreadCount(prev => prev + 1);
            
            // Show toast for new notification
            toast({
              title: newNotification.title,
              description: newNotification.message,
            });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, toast]);

  const fetchNotifications = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      
      const notificationList = data || [];
      setNotifications(notificationList);
      setUnreadCount(notificationList.filter(n => !n.read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)
        .eq('user_id', user!.id);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => ({ ...n, read: true }))
      );
      setUnreadCount(0);
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

  if (!user) {
    return null;
  }

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
                !notification.read ? 'border-primary/50 bg-primary/5' : ''
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
                      {!notification.read && (
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

