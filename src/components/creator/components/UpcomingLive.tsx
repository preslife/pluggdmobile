import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

import {
  Radio,
  Calendar,
  Clock,
  Users,
  Bell,
  Play,
  Music,
  Mic,
  Video,
  Plus,
  Settings,
  Timer,
  Zap
} from 'lucide-react';

interface LiveSession {
  id: string;
  title: string;
  description?: string;
  scheduled_for: string;
  duration_minutes?: number;
  session_type: 'performance' | 'qa' | 'production' | 'collaboration' | 'tutorial';
  max_participants?: number;
  current_participants: number;
  is_free: boolean;
  price_cents?: number;
  status: 'scheduled' | 'live' | 'ended';
  thumbnail_url?: string;
}

interface UpcomingLiveProps {
  creatorId: string;
  nextLiveDate?: string;
}

export const UpcomingLive = ({ creatorId, nextLiveDate }: UpcomingLiveProps) => {
  const [upcomingSessions, setUpcomingSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [reminderSet, setReminderSet] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchUpcomingSessions();
  }, [creatorId]);

  const fetchUpcomingSessions = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('live_sessions')
        .select('*')
        .eq('creator_id', creatorId)
        .in('status', ['scheduled', 'live'])
        .gte('scheduled_for', new Date().toISOString())
        .order('scheduled_for', { ascending: true })
        .limit(3);

      if (error) throw error;

      // Add current participants count (mock for now)
      const sessionsWithParticipants = (data || []).map(session => ({
        ...session,
        current_participants: Math.floor(Math.random() * (session.max_participants || 100))
      }));

      setUpcomingSessions(sessionsWithParticipants);
    } catch (error) {
      console.error('Error fetching live sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSessionTypeIcon = (type: string) => {
    switch (type) {
      case 'performance': return Music;
      case 'qa': return Mic;
      case 'production': return Play;
      case 'collaboration': return Users;
      case 'tutorial': return Video;
      default: return Radio;
    }
  };

  const getSessionTypeColor = (type: string) => {
    switch (type) {
      case 'performance': return 'bg-red-500';
      case 'qa': return 'bg-blue-500';
      case 'production': return 'bg-purple-500';
      case 'collaboration': return 'bg-green-500';
      case 'tutorial': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    
    // Check if it's today
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return {
        date: 'Today',
        time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
    }
    
    // Check if it's tomorrow
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = date.toDateString() === tomorrow.toDateString();
    
    if (isTomorrow) {
      return {
        date: 'Tomorrow',
        time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
    }
    
    return {
      date: date.toLocaleDateString([], { month: 'short', day: 'numeric' }),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  const getTimeUntilSession = (dateString: string) => {
    const sessionTime = new Date(dateString);
    const now = new Date();
    const diffMs = sessionTime.getTime() - now.getTime();
    
    if (diffMs <= 0) return 'Starting now!';
    
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) return `in ${diffDays}d`;
    if (diffHours > 0) return `in ${diffHours}h ${diffMinutes % 60}m`;
    return `in ${diffMinutes}m`;
  };

  const handleSetReminder = async (sessionId: string) => {
    try {
      // In a real app, this would set up push notifications or email reminders
      setReminderSet(prev => ({ ...prev, [sessionId]: true }));
      
      // Could integrate with calendar APIs or notification services here
      // For now, just show success
      setTimeout(() => {
        setReminderSet(prev => ({ ...prev, [sessionId]: false }));
      }, 3000);
      
    } catch (error) {
      console.error('Error setting reminder:', error);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-5 bg-muted rounded w-24"></div>
            <div className="h-4 bg-muted rounded w-full"></div>
            <div className="h-8 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (upcomingSessions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-muted-foreground" />
            Live Sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Radio className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-3">
              No upcoming live sessions scheduled
            </p>
            <Button variant="outline" size="sm">
              <Bell className="w-4 h-4 mr-2" />
              Get Notified
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Radio className="w-5 h-5 text-red-500" />
          Upcoming Live
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {upcomingSessions.map((session, index) => {
          const TypeIcon = getSessionTypeIcon(session.session_type);
          const datetime = formatDateTime(session.scheduled_for);
          const timeUntil = getTimeUntilSession(session.scheduled_for);
          const isLiveSoon = new Date(session.scheduled_for).getTime() - Date.now() <= 30 * 60 * 1000; // 30 minutes

          return (
            <div key={session.id}>
              <div className={`space-y-3 ${isLiveSoon ? 'p-3 bg-red-50 rounded-lg border border-red-200' : ''}`}>
                {/* Session Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${getSessionTypeColor(session.session_type)} text-white capitalize`}
                      >
                        <TypeIcon className="w-3 h-3 mr-1" />
                        {session.session_type}
                      </Badge>
                      {session.status === 'live' && (
                        <Badge variant="destructive" className="text-xs animate-pulse">
                          🔴 LIVE
                        </Badge>
                      )}
                      {isLiveSoon && session.status === 'scheduled' && (
                        <Badge variant="outline" className="text-xs border-red-500 text-red-600">
                          <Zap className="w-3 h-3 mr-1" />
                          Soon
                        </Badge>
                      )}
                    </div>
                    
                    <h4 className="font-medium text-sm line-clamp-1">{session.title}</h4>
                    
                    {session.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {session.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Session Details */}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{datetime.date}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{datetime.time}</span>
                    </div>
                    {session.duration_minutes && (
                      <div className="flex items-center gap-1">
                        <Timer className="w-3 h-3" />
                        <span>{session.duration_minutes}m</span>
                      </div>
                    )}
                  </div>
                  
                  <span className={`font-medium ${isLiveSoon ? 'text-red-600' : ''}`}>
                    {timeUntil}
                  </span>
                </div>

                {/* Participants & Price */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs">
                    {session.max_participants && (
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        <span>
                          {session.current_participants}/{session.max_participants} joined
                        </span>
                      </div>
                    )}
                    
                    <Badge variant={session.is_free ? 'secondary' : 'outline'} className="text-xs">
                      {session.is_free ? 'Free' : `$${(session.price_cents || 0) / 100}`}
                    </Badge>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  {session.status === 'live' ? (
                    <Button size="sm" className="flex-1 bg-red-500 hover:bg-red-600">
                      <Radio className="w-4 h-4 mr-2" />
                      Join Live
                    </Button>
                  ) : (
                    <>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleSetReminder(session.id)}
                        disabled={reminderSet[session.id]}
                      >
                        {reminderSet[session.id] ? (
                          <>
                            <Zap className="w-4 h-4 mr-2" />
                            Reminder Set!
                          </>
                        ) : (
                          <>
                            <Bell className="w-4 h-4 mr-2" />
                            Remind Me
                          </>
                        )}
                      </Button>
                      
                      <Button size="sm" variant={isLiveSoon ? 'default' : 'outline'}>
                        {session.is_free ? 'Join Free' : 'Reserve Spot'}
                      </Button>
                    </>
                  )}
                </div>
              </div>
              
              {index < upcomingSessions.length - 1 && (
                <Separator className="my-4" />
              )}
            </div>
          );
        })}

        {upcomingSessions.length > 0 && (
          <Button variant="ghost" size="sm" className="w-full">
            <Calendar className="w-4 h-4 mr-2" />
            View All Sessions
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default UpcomingLive;