import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Helmet } from "react-helmet-async";
import { Calendar, Clock, DollarSign, Users, ExternalLink, ArrowLeft, MapPin } from "lucide-react";
import { toast } from "sonner";

interface Event {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string;
  price_cents: number;
  cover_image_url: string | null;
  stream_url: string | null;
  location: string | null;
  created_by: string;
  rsvp_count: number;
  timezone: string;
}

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRSVP, setUserRSVP] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetchEvent();
    if (user) {
      fetchUserRSVP();
    }
  }, [id, user]);

  const fetchEvent = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setEvent(data);
    } catch (error) {
      console.error('Error fetching event:', error);
      toast.error('Failed to load event');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserRSVP = async () => {
    if (!user || !id) return;

    try {
      const { data, error } = await supabase
        .from('event_rsvps')
        .select('status')
        .eq('event_id', id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (!error && data) {
        setUserRSVP(data.status);
      }
    } catch (error) {
      console.error('Error fetching RSVP:', error);
    }
  };

  const handleRSVP = async (status: string) => {
    if (!user || !event) {
      toast.error('Please sign in to RSVP');
      return;
    }

    try {
      const { error } = await supabase
        .from('event_rsvps')
        .upsert({
          event_id: event.id,
          user_id: user.id,
          status
        });

      if (error) throw error;

      setUserRSVP(status);
      toast.success(`RSVP updated to ${status}`);
      
      // Refresh event to get updated RSVP count
      fetchEvent();
    } catch (error) {
      console.error('Error updating RSVP:', error);
      toast.error('Failed to update RSVP');
    }
  };

  const getEventStatus = (event: Event) => {
    const now = new Date();
    const startTime = new Date(event.starts_at);
    const endTime = new Date(event.ends_at);

    if (now < startTime) return { label: 'Upcoming', color: 'bg-blue-500' };
    if (now >= startTime && now <= endTime) return { label: 'Live', color: 'bg-green-500' };
    return { label: 'Ended', color: 'bg-gray-500' };
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-8">Loading event...</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="text-center py-8">
            <h2 className="text-xl font-semibold mb-2">Event Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The event you're looking for doesn't exist or has been removed.
            </p>
            <Button onClick={() => navigate('/events')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Events
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const status = getEventStatus(event);

  return (
    <>
      <Helmet>
        <title>{event.title} - Event Details</title>
        <meta name="description" content={event.description || `Join ${event.title} - community event`} />
      </Helmet>

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate('/events')} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Events
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-2xl flex items-center gap-2 mb-2">
                      {event.title}
                      <Badge className={`${status.color} text-white`}>
                        {status.label}
                      </Badge>
                    </CardTitle>
                    {event.description && (
                      <p className="text-muted-foreground">
                        {event.description}
                      </p>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              {event.cover_image_url && (
                <div className="px-6">
                  <img
                    src={event.cover_image_url}
                    alt={event.title}
                    className="w-full h-64 object-cover rounded-lg border"
                  />
                </div>
              )}

              <CardContent className="space-y-6 pt-6">
                {/* Event Details */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">Starts</div>
                      <div className="text-muted-foreground">
                        {formatDateTime(event.starts_at)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">Ends</div>
                      <div className="text-muted-foreground">
                        {formatDateTime(event.ends_at)}
                      </div>
                    </div>
                  </div>

                  {event.location && (
                    <div className="flex items-center gap-3 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">Location</div>
                        <div className="text-muted-foreground">{event.location}</div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3 text-sm">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">Price</div>
                      <div className="text-muted-foreground">
                        {event.price_cents > 0 ? `$${(event.price_cents / 100).toFixed(2)}` : 'Free'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stream Link */}
                {event.stream_url && status.label !== 'Ended' && (
                  <div className="border-t pt-6">
                    <h3 className="font-semibold mb-3">Join Event</h3>
                    <Button asChild className="w-full">
                      <a href={event.stream_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        {status.label === 'Live' ? 'Join Live Event' : 'Get Stream Link'}
                      </a>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* RSVP Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  RSVP
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{event.rsvp_count}</div>
                  <div className="text-sm text-muted-foreground">people going</div>
                </div>

                {user && status.label !== 'Ended' && (
                  <div className="space-y-2">
                    <Button
                      variant={userRSVP === 'going' ? 'default' : 'outline'}
                      className="w-full"
                      onClick={() => handleRSVP('going')}
                    >
                      {userRSVP === 'going' ? 'Going ✓' : 'Mark as Going'}
                    </Button>
                    <Button
                      variant={userRSVP === 'interested' ? 'default' : 'outline'}
                      className="w-full"
                      onClick={() => handleRSVP('interested')}
                    >
                      {userRSVP === 'interested' ? 'Interested ✓' : 'Mark as Interested'}
                    </Button>
                    {userRSVP && (
                      <Button
                        variant="ghost"
                        className="w-full"
                        onClick={() => handleRSVP('not_going')}
                      >
                        Remove RSVP
                      </Button>
                    )}
                  </div>
                )}

                {!user && (
                  <p className="text-sm text-muted-foreground text-center">
                    Sign in to RSVP to this event
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}