import { useEffect, useMemo, useState, type ComponentType } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import {
  Radio,
  Video,
  Users,
  Clock,
  Sparkles,
  Plus,
  Loader2
} from 'lucide-react';

interface VisitorStatus {
  isOwner: boolean;
  isFollowing: boolean;
  isSubscribed: boolean;
}

interface LiveSessionRecord {
  id: string;
  creator_id: string;
  title: string;
  description?: string | null;
  scheduled_for: string;
  duration_minutes: number;
  session_type: string;
  max_participants?: number | null;
  is_free: boolean;
  price_cents?: number | null;
  status: string;
  thumbnail_url?: string | null;
  stream_url?: string | null;
  recording_url?: string | null;
  created_at: string;
  updated_at: string;
}

interface LiveTabProps {
  profile: {
    user_id: string;
  };
  stats: any;
  visitorStatus: VisitorStatus | null;
  count?: number;
}

const statusBadges: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline'; icon: ComponentType<any> }> = {
  live: { label: 'Live now', variant: 'default', icon: Sparkles },
  scheduled: { label: 'Scheduled', variant: 'secondary', icon: Clock },
  ended: { label: 'Ended', variant: 'outline', icon: Video },
  cancelled: { label: 'Cancelled', variant: 'outline', icon: Users }
};

const formatSessionTime = (isoDate: string) => {
  try {
    const date = new Date(isoDate);
    return {
      dateLabel: format(date, 'EEE, MMM d'),
      timeLabel: format(date, 'h:mm a')
    };
  } catch {
    return {
      dateLabel: 'TBD',
      timeLabel: ''
    };
  }
};

export const LiveTab = ({ profile, visitorStatus, count }: LiveTabProps) => {
  const [sessions, setSessions] = useState<LiveSessionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const isOwner = Boolean(visitorStatus?.isOwner);

  useEffect(() => {
    loadLiveSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.user_id, isOwner]);

  const loadLiveSessions = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('live_sessions')
        .select('*')
        .eq('creator_id', profile.user_id)
        .order('scheduled_for', { ascending: true });

      if (!isOwner) {
        query = query.in('status', ['scheduled', 'live']).gte('scheduled_for', new Date().toISOString());
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      setSessions(data || []);
    } catch (error) {
      console.error('Error loading live sessions:', error);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  const sessionsByStatus = useMemo(() => {
    const upcoming: LiveSessionRecord[] = [];
    const past: LiveSessionRecord[] = [];

    sessions.forEach((session) => {
      if (['live', 'scheduled'].includes(session.status)) {
        upcoming.push(session);
      } else {
        past.push(session);
      }
    });

    return { upcoming, past };
  }, [sessions]);

  if (loading) {
    return (
      <div className="grid gap-6 sm:grid-cols-2">
        {[1, 2].map((i) => (
          <Card key={i} className="border-dashed">
            <CardHeader className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading upcoming sessions…
              </div>
              <div className="h-4 bg-muted rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-28 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="border rounded-lg bg-muted/30 p-8 text-center space-y-4">
        <Radio className="w-12 h-12 mx-auto text-muted-foreground" />
        <div className="space-y-2">
          <h3 className="text-xl font-semibold">{isOwner ? 'Plan your first live session' : 'No live sessions yet'}</h3>
          <p className="text-sm text-muted-foreground">
            {isOwner
              ? 'Kick off a livestream to connect with your fans in real time. Add a title, schedule, and share it.'
              : 'This creator hasn’t scheduled a live session yet. Follow to get notified when they go live.'}
          </p>
        </div>
        {isOwner && (
          <Button asChild size="sm">
            <Link to="/live">
              <Plus className="w-4 h-4 mr-2" />
              Schedule Session
            </Link>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Radio className="h-4 w-4" />
            <span>
              {count ?? sessions.length} {sessions.length === 1 ? 'session' : 'sessions'} scheduled
            </span>
          </div>
          <h2 className="text-2xl font-bold">Live Sessions</h2>
        </div>
        {isOwner && (
          <Button asChild size="sm">
            <Link to="/live">
              <Plus className="w-4 h-4 mr-2" />
              Schedule Session
            </Link>
          </Button>
        )}
      </div>

      {sessionsByStatus.upcoming.length > 0 && (
        <section className="space-y-4">
          <header className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Upcoming</h3>
            <span className="text-sm text-muted-foreground">
              Don’t miss the next livestream
            </span>
          </header>

          <div className="grid gap-6 sm:grid-cols-2">
            {sessionsByStatus.upcoming.map((session) => {
              const badgeConfig = statusBadges[session.status] || statusBadges.scheduled;
              const { dateLabel, timeLabel } = formatSessionTime(session.scheduled_for);
              const PriceBadgeIcon = session.status === 'live' ? Sparkles : Radio;

              return (
                <Card key={session.id} className="flex flex-col">
                  <div className="relative h-32 bg-muted rounded-t-lg overflow-hidden">
                    {session.thumbnail_url ? (
                      <img
                        src={session.thumbnail_url}
                        alt={session.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                        <Video className="h-10 w-10" />
                      </div>
                    )}

                    <Badge
                      variant={badgeConfig.variant}
                      className="absolute top-2 left-2 flex items-center gap-1 capitalize"
                    >
                      <badgeConfig.icon className="h-3 w-3" />
                      {badgeConfig.label}
                    </Badge>

                    {session.is_free ? (
                      <Badge variant="secondary" className="absolute top-2 right-2">Free</Badge>
                    ) : (
                      <Badge className="absolute top-2 right-2">Paid</Badge>
                    )}
                  </div>

                  <CardHeader className="space-y-2">
                    <CardTitle className="text-lg leading-tight line-clamp-2">
                      {session.title}
                    </CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{dateLabel}</span>
                      {timeLabel && <span>• {timeLabel}</span>}
                      <span>• {session.duration_minutes} min</span>
                    </div>
                  </CardHeader>

                  <CardContent className="flex flex-col gap-4">
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {session.description || 'Join the livestream for exclusive content and community vibes.'}
                    </p>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <Badge variant="outline" className="capitalize">
                        {session.session_type.replace(/_/g, ' ')}
                      </Badge>
                      {typeof session.max_participants === 'number' && (
                        <span>
                          Capacity: {session.max_participants}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2"></div>
                    <div className="flex items-center justify-between gap-2">
                      {session.status === 'live' && session.stream_url ? (
                        <Button asChild size="sm" className="flex-1">
                          <a href={session.stream_url} target="_blank" rel="noopener noreferrer">
                            <PriceBadgeIcon className="h-4 w-4 mr-2" />
                            Join Stream
                          </a>
                        </Button>
                      ) : (
                        <Button asChild size="sm" variant="outline" className="flex-1">
                          <a href={`/live/${session.id}`}>
                            <Radio className="h-4 w-4 mr-2" />
                            View details
                          </a>
                        </Button>
                      )}

                      {session.recording_url && (
                        <Button asChild size="icon" variant="ghost" className="shrink-0">
                          <a href={session.recording_url} target="_blank" rel="noopener noreferrer">
                            <Video className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {sessionsByStatus.past.length > 0 && (
        <section className="space-y-4">
          <header className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Past Sessions</h3>
            <span className="text-sm text-muted-foreground">
              Catch replays and highlights
            </span>
          </header>

          <div className="grid gap-6 sm:grid-cols-2">
            {sessionsByStatus.past.map((session) => {
              const { dateLabel } = formatSessionTime(session.scheduled_for);
              const badgeConfig = statusBadges[session.status] || statusBadges.ended;

              return (
                <Card key={session.id} className="flex flex-col">
                  <CardHeader className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-lg line-clamp-1">
                        {session.title}
                      </CardTitle>
                      <Badge variant={badgeConfig.variant} className="capitalize">
                        {badgeConfig.label}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">{dateLabel}</div>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3">
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {session.description || 'Rewatch the session replay and catch the highlights.'}
                    </p>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="capitalize">
                        {session.session_type.replace(/_/g, ' ')}
                      </Badge>
                      {session.recording_url ? (
                        <span>Replay available</span>
                      ) : (
                        <span>No recording provided</span>
                      )}
                    </div>

                    {session.recording_url && (
                      <Button asChild size="sm" variant="outline" className="self-start">
                        <a href={session.recording_url} target="_blank" rel="noopener noreferrer">
                          <Video className="h-4 w-4 mr-2" />
                          Watch replay
                        </a>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};

export default LiveTab;
