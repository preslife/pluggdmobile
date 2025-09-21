import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, Clock, DollarSign, Users, ExternalLink, Ticket } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface Event {
  id: string;
  title: string;
  description?: string;
  starts_at: string;
  ends_at: string;
  price_cents: number;
  created_by: string;
  cover_image_url?: string;
  creator?: {
    id: string;
    full_name?: string;
    username?: string;
    avatar_url?: string;
  };
  user_has_ticket?: boolean;
}

export function EventsListing() {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasingTicket, setPurchasingTicket] = useState<string | null>(null);

  useEffect(() => {
    fetchEvents();
  }, [user]);

  const fetchEvents = async () => {
    try {
      const { data: eventsData, error } = await supabase
        .from("events")
        .select("*")
        .gte("ends_at", new Date().toISOString())
        .order("starts_at", { ascending: true });

      if (error) throw error;

      // Get creator data
      const creatorIds = [...new Set(eventsData?.map(event => event.created_by) || [])];
      const { data: creators } = await supabase
        .from("profiles")
        .select("user_id, full_name, username, avatar_url")
        .in("user_id", creatorIds);

      const creatorsMap = new Map(creators?.map(c => [c.user_id, c]) || []);

      // Check if user has tickets for any events
      let eventsWithTickets = eventsData || [];
      if (user) {
        const eventIds = eventsWithTickets.map((event) => event.id);
        const { data: tickets } = await supabase
          .from("event_tickets")
          .select("event_id")
          .eq("user_id", user.id)
          .in("event_id", eventIds);

        const ticketEventIds = new Set(tickets?.map((t) => t.event_id) || []);

        eventsWithTickets = eventsWithTickets.map((event) => {
          const creator = creatorsMap.get(event.created_by) || {
            id: event.created_by,
            full_name: "Unknown Creator",
            username: "unknown",
            avatar_url: null
          };

          return {
            ...event,
            creator,
            user_has_ticket: ticketEventIds.has(event.id),
          };
        });
      } else {
        eventsWithTickets = eventsWithTickets.map((event) => {
          const creator = creatorsMap.get(event.created_by) || {
            id: event.created_by,
            full_name: "Unknown Creator",
            username: "unknown",
            avatar_url: null
          };

          return {
            ...event,
            creator,
            user_has_ticket: false,
          };
        });
      }

      setEvents(eventsWithTickets);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const handleBuyTicket = async (eventId: string) => {
    if (!user) {
      toast.error('Please sign in to purchase tickets');
      return;
    }

    setPurchasingTicket(eventId);
    try {
      const { data, error } = await supabase.functions.invoke('create-event-checkout', {
        body: { eventId }
      });

      if (error) throw error;

      if (data.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast.error('Failed to create checkout session');
    } finally {
      setPurchasingTicket(null);
    }
  };

  const getEventStatus = (event: Event) => {
    const now = new Date();
    const startTime = new Date(event.starts_at);
    const endTime = new Date(event.ends_at);

    if (now < startTime) return { label: 'Upcoming', color: 'bg-blue-500' };
    if (now >= startTime && now <= endTime) return { label: 'Live Now', color: 'bg-red-500' };
    return { label: 'Ended', color: 'bg-gray-500' };
  };

  if (loading) {
    return <div className="text-center py-8">Loading events...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Live Events</h1>
        <p className="text-muted-foreground">
          Join exclusive ticketed events from your favorite creators
        </p>
      </div>

      <div className="grid gap-6">
        {events.map((event) => {
          const status = getEventStatus(event);
          const isLive = status.label === 'Live Now';
          
          return (
            <Card key={event.id} className={isLive ? 'ring-2 ring-red-500' : ''}>
              {event.cover_image_url && (
                <div className="aspect-video w-full overflow-hidden rounded-t-lg">
                  <img
                    src={event.cover_image_url}
                    alt={event.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <Avatar>
                      <AvatarImage src={event.creator?.avatar_url} />
                      <AvatarFallback>
                        {event.creator?.full_name?.[0] || 
                         event.creator?.username?.[0] || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {event.title}
                        <Badge className={`${status.color} text-white`}>
                          {status.label}
                        </Badge>
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        by {event.creator?.full_name || 
                            event.creator?.username || 'Unknown Creator'}
                      </p>
                      {event.description && (
                        <p className="text-sm text-muted-foreground mt-2">
                          {event.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div className="text-sm">
                      <p className="font-medium">
                        {new Date(event.starts_at).toLocaleDateString(undefined, {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                      <p className="text-muted-foreground">
                        {new Date(event.starts_at).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })} - {new Date(event.ends_at).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <div className="text-sm">
                      <p className="font-medium text-lg">
                        {event.price_cents === 0 
                          ? 'Free' 
                          : `$${(event.price_cents / 100).toFixed(2)}`
                        }
                      </p>
                      <p className="text-muted-foreground">
                        {event.price_cents === 0 ? 'No cost' : 'Per ticket'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div className="text-sm">
                      <p className="font-medium">
                        {formatDistanceToNow(new Date(event.starts_at), { addSuffix: true })}
                      </p>
                      <p className="text-muted-foreground">
                        Duration: {Math.round((new Date(event.ends_at).getTime() - new Date(event.starts_at).getTime()) / (1000 * 60))} minutes
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    {isLive && (
                      <Badge variant="destructive" className="animate-pulse">
                        🔴 Live Now
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex space-x-2">
                    {event.user_has_ticket ? (
                      <div className="flex items-center space-x-2">
                        <Badge className="bg-green-500">
                          <Ticket className="h-3 w-3 mr-1" />
                          You have a ticket
                        </Badge>
                        {isLive && (
                          <Button>
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Join Event
                          </Button>
                        )}
                      </div>
                    ) : (
                      <Button
                        onClick={() => handleBuyTicket(event.id)}
                        disabled={purchasingTicket === event.id}
                        className={event.price_cents === 0 ? 'bg-green-600 hover:bg-green-700' : ''}
                      >
                        <Ticket className="h-4 w-4 mr-2" />
                        {purchasingTicket === event.id 
                          ? 'Processing...' 
                          : event.price_cents === 0 
                            ? 'Get Free Ticket' 
                            : `Buy Ticket ($${(event.price_cents / 100).toFixed(2)})`
                        }
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {events.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">No Upcoming Events</h3>
            <p className="text-muted-foreground">
              Check back soon for new events from your favorite creators!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}