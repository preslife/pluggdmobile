import { useAuth } from "@/hooks/useAuth";
import { EventsListing } from "@/components/EventsListing";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Plus } from "lucide-react";
import { usePageMetadata } from "@/hooks/usePageMetadata";

export default function Events() {
  const { user } = useAuth();

  usePageMetadata({
    title: "Community Events — Pluggd",
    description: "Discover upcoming workshops, live sessions, and community events hosted by creators on Pluggd.",
    path: "/events",
  });

  return (
    <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Calendar className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Community Events</h1>
              <p className="text-muted-foreground">
                Discover upcoming events, workshops, and live sessions
              </p>
            </div>
          </div>
          {user && (
            <Button asChild>
              <a href="/events/new">
                <Plus className="h-4 w-4 mr-2" />
                Create Event
              </a>
            </Button>
          )}
        </div>

        {/* Events Listing */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Events</CardTitle>
          </CardHeader>
          <CardContent>
            <EventsListing />
          </CardContent>
        </Card>
      </div>
  );
}