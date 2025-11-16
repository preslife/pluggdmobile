import React, { createContext, useContext, useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { 
  Bell, 
  X, 
  Check, 
  AlertCircle, 
  Info, 
  CheckCircle2, 
  AlertTriangle,
  User,
  BookOpen,
  Trophy,
  MessageSquare,
  Calendar,
  Star,
  Heart,
  Share,
  Settings,
  Trash2,
  MoreHorizontal,
  Clock,
  Eye,
  EyeOff,
  Filter,
  Shield,
  Clock3,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner@2.0.3';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  action?: {
    label: string;
    onClick: () => void;
  };
  category?: 'system' | 'course' | 'social' | 'achievement' | 'security' | 'reminder';
  courseId?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  showToast: (notification: Omit<Notification, 'id' | 'timestamp' | 'isRead'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  clearAll: () => void;
  clearByCategory: (category: string) => void;
  getNotificationsByCategory: (category?: string) => Notification[];
  addContextualNotification: (type: 'course_progress' | 'streak_milestone' | 'course_reminder' | 'assignment_due' | 'system_update', metadata: Record<string, any>) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  // Clean state - no mock notifications
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationPreferences, setNotificationPreferences] = useState({
    system: true,
    course: true,
    social: true,
    achievement: true,
    security: true,
    reminder: true
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const showToast = (notification: Omit<Notification, 'id' | 'timestamp' | 'isRead'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      isRead: false
    };

    setNotifications(prev => [newNotification, ...prev]);

    // Show toast notification
    const toastConfig: any = {
      title: notification.title,
      description: notification.message,
      duration: notification.action ? 6000 : 4000
    };

    if (notification.action) {
      toastConfig.action = {
        label: notification.action.label,
        onClick: notification.action.onClick
      };
    }

    switch (notification.type) {
      case 'success':
        toast.success(notification.title, toastConfig);
        break;
      case 'error':
        toast.error(notification.title, toastConfig);
        break;
      case 'warning':
        toast.warning(notification.title, toastConfig);
        break;
      default:
        toast.info(notification.title, toastConfig);
    }
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id ? { ...notification, isRead: true } : notification
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, isRead: true }))
    );
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const clearByCategory = (category: string) => {
    setNotifications(prev => prev.filter(notification => notification.category !== category));
  };

  const getNotificationsByCategory = (category?: string) => {
    if (!category) return notifications;
    return notifications.filter(notification => notification.category === category);
  };

  const addContextualNotification = (type: 'course_progress' | 'streak_milestone' | 'course_reminder' | 'assignment_due' | 'system_update', metadata: Record<string, any>) => {
    const contextualNotifications = {
      course_progress: {
        type: 'success' as const,
        title: 'Learning Progress Update',
        message: `You've completed ${metadata.progress}% of "${metadata.courseName}"`,
        category: 'course' as const,
        priority: 'normal' as const,
        action: metadata.courseId ? {
          label: 'Continue Course',
          onClick: () => metadata.onNavigate?.('classroom', { id: metadata.courseId })
        } : undefined
      },
      streak_milestone: {
        type: 'success' as const,
        title: `${metadata.days} Day Learning Streak! 🔥`,
        message: `Amazing! You've been learning consistently for ${metadata.days} days`,
        category: 'achievement' as const,
        priority: 'normal' as const,
        action: {
          label: 'View Achievements',
          onClick: () => metadata.onNavigate?.('achievements')
        }
      },
      course_reminder: {
        type: 'info' as const,
        title: 'Course Reminder',
        message: `Don't forget to continue "${metadata.courseName}" - You're ${metadata.progress}% complete`,
        category: 'reminder' as const,
        priority: 'low' as const,
        action: {
          label: 'Resume Learning',
          onClick: () => metadata.onNavigate?.('classroom', { id: metadata.courseId })
        }
      },
      assignment_due: {
        type: 'warning' as const,
        title: 'Assignment Due Soon',
        message: `"${metadata.assignmentName}" is due in ${metadata.dueIn}`,
        category: 'course' as const,
        priority: 'high' as const,
        action: {
          label: 'View Assignment',
          onClick: () => metadata.onNavigate?.('assessments')
        }
      },
      system_update: {
        type: 'info' as const,
        title: 'System Update Available',
        message: metadata.message || 'New features and improvements are available',
        category: 'system' as const,
        priority: 'low' as const
      }
    };

    const notificationTemplate = contextualNotifications[type];
    if (notificationTemplate && notificationPreferences[notificationTemplate.category]) {
      showToast({
        ...notificationTemplate,
        courseId: metadata.courseId,
        userId: metadata.userId,
        metadata
      });
    }
  };

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      showToast,
      markAsRead,
      markAllAsRead,
      deleteNotification,
      clearAll,
      clearByCategory,
      getNotificationsByCategory,
      addContextualNotification
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

export function NotificationBell({ onOpenPanel }: { onOpenPanel: () => void }) {
  const { unreadCount } = useNotifications();

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="relative"
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={onOpenPanel}
        className="relative"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1"
          >
            <Badge 
              variant="destructive" 
              className="h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          </motion.div>
        )}
      </Button>
    </motion.div>
  );
}

export function NotificationPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, clearAll, clearByCategory, getNotificationsByCategory } = useNotifications();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const getNotificationIcon = (type: string, category?: string) => {
    if (category) {
      switch (category) {
        case 'course': return BookOpen;
        case 'achievement': return Trophy;
        case 'social': return MessageSquare;
        case 'system': return Settings;
        case 'security': return Shield;
        case 'reminder': return Clock3;
        default: return Info;
      }
    }

    switch (type) {
      case 'success': return CheckCircle2;
      case 'error': return X;
      case 'warning': return AlertTriangle;
      default: return Info;
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'urgent': return 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20';
      case 'high': return 'border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20';
      case 'normal': return 'border-blue-200 dark:border-blue-800';
      case 'low': return 'border-gray-200 dark:border-gray-700';
      default: return 'border-gray-200 dark:border-gray-700';
    }
  };

  const categories = [
    { id: 'all', label: 'All', icon: Bell },
    { id: 'course', label: 'Courses', icon: BookOpen },
    { id: 'achievement', label: 'Achievements', icon: Trophy },
    { id: 'social', label: 'Social', icon: MessageSquare },
    { id: 'system', label: 'System', icon: Settings },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'reminder', label: 'Reminders', icon: Clock3 }
  ];

  const filteredNotifications = selectedCategory === 'all' 
    ? notifications 
    : getNotificationsByCategory(selectedCategory);

  const categoryUnreadCounts = categories.reduce((acc, category) => {
    acc[category.id] = category.id === 'all' 
      ? unreadCount 
      : getNotificationsByCategory(category.id).filter(n => !n.isRead).length;
    return acc;
  }, {} as Record<string, number>);

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'success': return 'text-green-500';
      case 'error': return 'text-red-500';
      case 'warning': return 'text-yellow-500';
      default: return 'text-blue-500';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60);
      return `${diffInMinutes} min ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hour${Math.floor(diffInHours) !== 1 ? 's' : ''} ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ x: 400, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 400, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed right-0 top-0 h-full w-96 bg-white dark:bg-gray-900 shadow-xl border-l border-gray-200 dark:border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold">Notifications</h2>
              {categoryUnreadCounts[selectedCategory] > 0 && (
                <Badge variant="destructive" className="h-5 px-2 text-xs">
                  {categoryUnreadCounts[selectedCategory]}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {filteredNotifications.length > 0 && (
                <>
                  {categoryUnreadCounts[selectedCategory] > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => selectedCategory === 'all' ? markAllAsRead() : 
                        filteredNotifications.filter(n => !n.isRead).forEach(n => markAsRead(n.id))}
                      className="text-xs"
                    >
                      <Check className="h-3 w-3 mr-1" />
                      Mark read
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => selectedCategory === 'all' ? clearAll() : clearByCategory(selectedCategory)}
                    className="text-xs text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Clear
                  </Button>
                </>
              )}
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Category Filter */}
          <div className="border-b border-gray-200 dark:border-gray-700 px-4 py-3">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filter by category</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => {
                const Icon = category.icon;
                const isSelected = selectedCategory === category.id;
                const hasUnread = categoryUnreadCounts[category.id] > 0;
                
                return (
                  <motion.button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors ${
                      isSelected 
                        ? 'bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800' 
                        : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-muted-foreground'
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Icon className="h-3 w-3" />
                    <span>{category.label}</span>
                    {hasUnread && (
                      <Badge variant="destructive" className="h-4 w-4 p-0 flex items-center justify-center text-xs">
                        {categoryUnreadCounts[category.id]}
                      </Badge>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-hidden">
            {filteredNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <Bell className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="font-medium mb-2">
                  {selectedCategory === 'all' ? 'No notifications' : `No ${selectedCategory} notifications`}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {selectedCategory === 'all' 
                    ? "You're all caught up! New notifications will appear here."
                    : `No ${selectedCategory} notifications at the moment.`
                  }
                </p>
              </div>
            ) : (
              <ScrollArea className="h-full">
                <div className="p-4 space-y-3">
                  <AnimatePresence>
                    {filteredNotifications.map((notification) => {
                      const Icon = getNotificationIcon(notification.type, notification.category);
                      const priorityStyles = getPriorityColor(notification.priority);
                      return (
                        <motion.div
                          key={notification.id}
                          layout
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: 100 }}
                          className={`relative p-3 rounded-lg border transition-colors cursor-pointer ${
                            notification.isRead 
                              ? 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700' 
                              : notification.priority && ['high', 'urgent'].includes(notification.priority)
                                ? priorityStyles
                                : 'bg-white dark:bg-gray-800 border-blue-200 dark:border-blue-800 shadow-sm'
                          }`}
                          onClick={() => markAsRead(notification.id)}
                        >
                          <div className="flex gap-3">
                            <div className={`flex-shrink-0 ${getNotificationColor(notification.type)}`}>
                              <Icon className="h-5 w-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium text-sm">{notification.title}</h4>
                                {notification.priority && notification.priority !== 'normal' && (
                                  <Badge 
                                    variant={notification.priority === 'urgent' ? 'destructive' : 
                                            notification.priority === 'high' ? 'default' : 'secondary'}
                                    className="h-4 px-1.5 text-xs"
                                  >
                                    {notification.priority}
                                  </Badge>
                                )}
                                {notification.category && (
                                  <Badge variant="outline" className="h-4 px-1.5 text-xs">
                                    {notification.category}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">{notification.message}</p>
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatTimestamp(notification.timestamp)}
                                </span>
                                {notification.action && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      notification.action!.onClick();
                                    }}
                                    className="h-6 text-xs"
                                  >
                                    {notification.action.label}
                                  </Button>
                                )}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 flex-shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotification(notification.id);
                              }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                          {!notification.isRead && (
                            <div className="absolute top-3 right-3 w-2 h-2 bg-blue-500 rounded-full" />
                          )}
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}