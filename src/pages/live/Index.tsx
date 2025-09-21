import { setMeta } from "@/lib/seo";
import { useEffect } from "react";
import LiveCTA from "@/components/LiveCTA";
import { useSessionRooms } from "@/hooks/useSessionRooms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Calendar, Trophy, Plug } from "lucide-react";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { Link } from "react-router-dom";

export default function LiveIndex() {
  const { rooms, loading } = useSessionRooms();

  useEffect(() => {
    setMeta("Live Sessions & Events", "Join live music sessions, battles, and events with fellow creators");
  }, []);

  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="min-h-screen bg-background">
      
      <main>
        <header className="relative pt-24 pb-12 md:pb-20 bg-gradient-hero">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3 text-primary mb-4">
              <Plug className="w-5 h-5" />
              <span className="uppercase tracking-widest text-xs">Get Plugged In</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold leading-tight">
              Live Battles, Showcases, and Creator Streams
            </h1>
            <p className="mt-4 text-muted-foreground max-w-2xl">
              The energy of the culture in real-time. Submit, perform, and get feedback from the community.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/live/sessions"><Button>Join a Session</Button></Link>
              <Link to="/live/battles"><Button variant="outline">View Battles</Button></Link>
              <Link to="/auth"><Button variant="hero">Join the Community</Button></Link>
            </div>
          </div>
        </header>

        {/* Live Rooms Section */}
        <section className="py-12 md:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold">Live Rooms</h2>
              <Button asChild>
                <Link to="/live/sessions">View All Sessions</Link>
              </Button>
            </div>
            
            {rooms.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {rooms.slice(0, 6).map((room) => (
                  <Card key={room.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg truncate">{room.title}</CardTitle>
                        <Badge variant={room.status === 'live' ? 'default' : 'secondary'}>
                          {room.status === 'live' ? 'Live' : 'Idle'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">by {room.host_name}</p>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Users className="h-4 w-4 mr-1" />
                          {room.participant_count} participants
                        </div>
                        <Button size="sm" asChild>
                          <Link to={`/live/sessions/${room.id}`}>Join</Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No live rooms</h3>
                  <p className="text-muted-foreground mb-4">Be the first to start a live session!</p>
                  <Button asChild>
                    <Link to="/live/sessions">Create Session</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </section>

        <section className="py-12 md:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-2 gap-6">
            <article className="p-6 rounded-lg border border-border bg-card">
              <h2 className="text-2xl font-bold">Upcoming Battles</h2>
              <p className="mt-2 text-muted-foreground">Monthly showdowns with community voting and prizes.</p>
              <Link to="/live/battles" className="mt-4 inline-block"><Button variant="secondary">Explore Battles</Button></Link>
            </article>
            <article className="p-6 rounded-lg border border-border bg-card">
              <h2 className="text-2xl font-bold">Open Sessions</h2>
              <p className="mt-2 text-muted-foreground">Drop your track, get timestamped feedback, and collab.</p>
              <Link to="/live/sessions" className="mt-4 inline-block"><Button variant="secondary">Find a Session</Button></Link>
            </article>
          </div>
        </section>

        <LiveCTA />
      </main>
    </div>
  );
}