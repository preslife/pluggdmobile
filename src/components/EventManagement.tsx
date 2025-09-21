import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, DollarSign, Users, Plus, Edit, Trash2, Image } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { MediaUploader } from "@/components/MediaUploader";

interface Event {
  id: string;
  title: string;
  description?: string;
  starts_at: string;
  ends_at: string;
  price_cents: number;
  created_by: string;
  created_at: string;
  ticket_count?: number;
  cover_image_url?: string;
}

interface EventFormData {
  title: string;
  description: string;
  starts_at: string;
  ends_at: string;
  price_cents: number;
  cover_image_url: string;
}

export function EventManagement() {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [formData, setFormData] = useState<EventFormData>({
    title: "",
    description: "",
    starts_at: "",
    ends_at: "",
    price_cents: 0,
    cover_image_url: "",
  });

  useEffect(() => {
    if (user) {
      fetchEvents();
    }
  }, [user]);

  const fetchEvents = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          ticket_count:event_tickets(count)
        `)
        .eq('created_by', user.id)
        .order('starts_at', { ascending: false });

      if (error) throw error;

      // Transform data to include ticket count
      const eventsWithTickets = (data || []).map(event => ({
        ...event,
        ticket_count: event.ticket_count?.[0]?.count || 0
      }));

      setEvents(eventsWithTickets);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      starts_at: "",
      ends_at: "",
      price_cents: 0,
      cover_image_url: "",
    });
    setEditingEvent(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const eventData = {
        ...formData,
        created_by: user.id,
      };

      if (editingEvent) {
        const { error } = await supabase
          .from('events')
          .update(eventData)
          .eq('id', editingEvent.id);

        if (error) throw error;
        toast.success('Event updated successfully');
      } else {
        const { error } = await supabase
          .from('events')
          .insert(eventData);

        if (error) throw error;
        toast.success('Event created successfully');
      }

      resetForm();
      fetchEvents();
    } catch (error) {
      console.error('Error saving event:', error);
      toast.error('Failed to save event');
    }
  };

  const handleEdit = (event: Event) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      description: event.description || "",
      starts_at: new Date(event.starts_at).toISOString().slice(0, 16),
      ends_at: new Date(event.ends_at).toISOString().slice(0, 16),
      price_cents: event.price_cents,
      cover_image_url: event.cover_image_url || "",
    });
    setShowForm(true);
  };

  const handleDelete = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;

    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;

      toast.success('Event deleted successfully');
      fetchEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Failed to delete event');
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

  if (!user) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium">Sign in to manage events</h3>
        <p className="text-muted-foreground">
          You need to be signed in to create and manage events.
        </p>
      </div>
    );
  }

  if (loading) {
    return <div className="text-center py-8">Loading events...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Event Management</h2>
          <p className="text-muted-foreground">
            Create and manage your ticketed events
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Event
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingEvent ? 'Edit Event' : 'Create New Event'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Event Title *</label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Enter event title"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Ticket Price</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.price_cents / 100}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        price_cents: Math.round(parseFloat(e.target.value || '0') * 100)
                      })}
                      placeholder="0.00"
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Event description"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Cover Image</label>
                <MediaUploader
                  onFilesUploaded={(files) => {
                    if (files.length > 0) {
                      setFormData(prev => ({ ...prev, cover_image_url: files[0].url }));
                      toast.success('Image uploaded successfully');
                    }
                  }}
                  allowedTypes={["image"]}
                  maxFiles={1}
                  bucketName="events"
                />
                {formData.cover_image_url && (
                  <div className="mt-2">
                    <img
                      src={formData.cover_image_url}
                      alt="Event cover"
                      className="w-32 h-20 object-cover rounded-md border"
                    />
                  </div>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Start Date & Time *</label>
                  <Input
                    type="datetime-local"
                    value={formData.starts_at}
                    onChange={(e) => setFormData({ ...formData, starts_at: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">End Date & Time *</label>
                  <Input
                    type="datetime-local"
                    value={formData.ends_at}
                    onChange={(e) => setFormData({ ...formData, ends_at: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="flex space-x-2">
                <Button type="submit">
                  {editingEvent ? 'Update Event' : 'Create Event'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6">
        {events.map((event) => {
          const status = getEventStatus(event);
          
          return (
            <Card key={event.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    {event.cover_image_url && (
                      <img
                        src={event.cover_image_url}
                        alt={event.title}
                        className="w-20 h-20 object-cover rounded-lg border"
                      />
                    )}
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        {event.title}
                        <Badge className={`${status.color} text-white`}>
                          {status.label}
                        </Badge>
                      </CardTitle>
                      {event.description && (
                        <p className="text-muted-foreground mt-1">
                          {event.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(event)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(event.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div className="text-sm">
                      <p className="font-medium">
                        {new Date(event.starts_at).toLocaleDateString()}
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
                      <p className="font-medium">
                        {event.price_cents === 0 
                          ? 'Free' 
                          : `$${(event.price_cents / 100).toFixed(2)}`
                        }
                      </p>
                      <p className="text-muted-foreground">Per ticket</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <div className="text-sm">
                      <p className="font-medium">{event.ticket_count || 0}</p>
                      <p className="text-muted-foreground">Tickets sold</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs text-muted-foreground">
                    Created {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                  </p>
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
            <h3 className="text-lg font-medium">No Events Created</h3>
            <p className="text-muted-foreground">
              Create your first ticketed event to start engaging with your audience.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}