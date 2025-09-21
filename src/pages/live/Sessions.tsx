import { useEffect } from "react";
import { setMeta } from "@/lib/seo";
import { Button } from "@/components/ui/button";
import { Link, useNavigate, useLocation } from "react-router-dom";
import LiveCTA from "@/components/LiveCTA";
import { useSessionRooms } from "@/hooks/useSessionRooms";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Clock } from "lucide-react";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { CreateRoomModal } from "@/components/CreateRoomModal";
import { formatDistanceToNow } from "date-fns";

const LiveSessions = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const { rooms, loading, joinRoom } = useSessionRooms();
  const redirectParam = encodeURIComponent(location.pathname + location.search);

  useEffect(() => {
    setMeta(
      "Pluggd Live Sessions — Join the Session",
      "Real-time creator sessions with drop-in feedback and collabs.",
      "/live/sessions"
    );
  }, []);

  const handleJoinRoom = async (roomId: string) => {
    if (!user) {
      navigate(`/auth?redirect=${redirectParam}`);
      return;
    }
    
    const success = await joinRoom(roomId);
    if (success) {
      navigate(`/live/sessions/${roomId}`);
    }
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <main className="pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl md:text-4xl font-extrabold">Join the Session</h1>
        <p className="mt-2 text-muted-foreground max-w-2xl">
          Cameras on. Mics live. Share your screen, drop files, and get timestamped feedback.
        </p>

        <div className="mt-6 flex gap-3">
          <CreateRoomModal />
          <Link to={`/auth?redirect=${redirectParam}`}><Button variant="outline">Sign in</Button></Link>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {rooms.length === 0 ? (
            <Card className="md:col-span-2">
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No live rooms yet</h3>
                <p className="text-muted-foreground mb-4">Be the first to start one.</p>
                <CreateRoomModal>
                  <Button>Create First Session</Button>
                </CreateRoomModal>
              </CardContent>
            </Card>
          ) : (
            rooms.map((room) => (
              <Card key={room.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl">{room.title}</CardTitle>
                    <Badge variant={room.status === 'live' ? 'default' : 'secondary'}>
                      {room.status === 'live' ? 'Live' : 'Idle'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center">
                      <Users className="h-4 w-4 mr-1" />
                      {room.participant_count} participants
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      {formatDistanceToNow(new Date(room.created_at), { addSuffix: true })}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Hosted by {room.host_name}
                  </p>
                  <div className="flex gap-2">
                    <Button onClick={() => handleJoinRoom(room.id)}>
                      Join Session
                    </Button>
                    <Button variant="outline" asChild>
                      <Link to={`/live/sessions/${room.id}`}>View</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <div className="mt-8">
          <Link to={`/auth?redirect=${redirectParam}`}><Button variant="hero">Get Plugged In</Button></Link>
        </div>
      </div>
      <LiveCTA />
    </main>
  );
};

export default LiveSessions;