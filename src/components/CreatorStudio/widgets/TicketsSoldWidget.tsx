import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Ticket, TrendingUp, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface TicketStats {
  totalSold: number;
  upcomingEvents: number;
  todaySales: number;
  nextEventDate?: string;
  nextEventTitle?: string;
}

/**
 * TicketsSoldWidget - Implements spec requirement for "tickets sold counter"
 * Shows live event ticket sales and upcoming events
 */
export const TicketsSoldWidget: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<TicketStats>({
    totalSold: 0,
    upcomingEvents: 0,
    todaySales: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchTicketStats();
    }
  }, [user?.id]);

  const fetchTicketStats = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      
      // Fetch ticket sales from live_tickets table
      const { data: tickets, error: ticketsError } = await supabase
        .from('live_tickets')
        .select('id, session_id, created_at')
        .eq('host_id', user.id);

      if (ticketsError) throw ticketsError;

      // Calculate today's sales
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todaySales = tickets?.filter(t => 
        new Date(t.created_at) >= today
      ).length || 0;

      // Fetch upcoming events
      const { data: sessions, error: sessionsError } = await supabase
        .from('live_sessions')
        .select('id, title, scheduled_for')
        .eq('host_id', user.id)
        .gte('scheduled_for', new Date().toISOString())
        .order('scheduled_for', { ascending: true })
        .limit(5);

      if (sessionsError) throw sessionsError;

      const nextEvent = sessions?.[0];

      setStats({
        totalSold: tickets?.length || 0,
        upcomingEvents: sessions?.length || 0,
        todaySales,
        nextEventDate: nextEvent?.scheduled_for,
        nextEventTitle: nextEvent?.title
      });
      
    } catch (error) {
      console.error('Error fetching ticket stats:', error);
      setStats({
        totalSold: 0,
        upcomingEvents: 0,
        todaySales: 0,
        nextEventTitle: undefined,
        nextEventDate: undefined,
      });
    } finally {
      setLoading(false);
    }
  };

  const formatEventDate = (dateStr?: string) => {
    if (!dateStr) return 'No upcoming events';
    const date = new Date(dateStr);
    const days = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    if (days <= 7) return `In ${days} days`;
    return date.toLocaleDateString();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Live Events</CardTitle>
        <Ticket className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Main ticket count */}
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{stats.totalSold}</span>
              <span className="text-sm text-muted-foreground">tickets sold</span>
            </div>
            {stats.todaySales > 0 && (
              <div className="flex items-center gap-1 text-xs text-green-500 mt-1">
                <TrendingUp className="h-3 w-3" />
                <span>+{stats.todaySales} today</span>
              </div>
            )}
          </div>

          {/* Upcoming events */}
          {stats.upcomingEvents > 0 && (
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Upcoming</span>
                <Badge variant="secondary" className="text-xs">
                  {stats.upcomingEvents} events
                </Badge>
              </div>
              
              {stats.nextEventTitle && (
                <div className="mt-2 p-2 bg-secondary/50 rounded-md">
                  <p className="text-xs font-medium truncate">{stats.nextEventTitle}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    <Calendar className="h-3 w-3" />
                    <span>{formatEventDate(stats.nextEventDate)}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {stats.upcomingEvents === 0 && (
            <div className="text-center py-2">
              <Users className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">
                No upcoming events scheduled
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TicketsSoldWidget;
