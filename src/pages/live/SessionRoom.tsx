import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { setMeta } from "@/lib/seo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useSessions } from "@/hooks/useSessions";
import { useSessionRooms } from "@/hooks/useSessionRooms";
import { useToast } from "@/hooks/use-toast";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import SessionChat from "@/components/live/SessionChat";
import SessionNotes from "@/components/live/SessionNotes";
import SessionFiles from "@/components/live/SessionFiles";
import SessionFeedback from "@/components/live/SessionFeedback";
import SessionMedia from "@/components/live/SessionMedia";
import { VideoCallInterface } from "@/components/VideoCallInterface";
import { LiveGiftPanel } from "@/components/live/LiveGiftPanel";
import { WaveformFeedback } from "@/components/WaveformFeedback";
import PostEventRedirect from "@/components/PostEventRedirect";
import LiveCTA from "@/components/LiveCTA";
import { ArrowLeft, Copy, Users, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useLiveGifts } from "@/hooks/useLiveGifts";

const SessionRoom = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { session, loading, error } = useSessions(id);
  const { joinRoom } = useSessionRooms();
  const [activeTab, setActiveTab] = useState("files");
  const liveGiftState = useLiveGifts(id);
  const latestGift = liveGiftState.events[0];

  useEffect(() => {
    if (session) {
      setMeta(
        `${session.title} — Live Session`,
        session.description || "Join this live collaboration session",
        `/live/sessions/${id}`
      );
    }
  }, [session, id]);

  const onJoin = async () => {
    if (!user) {
      navigate(`/auth?redirect=${encodeURIComponent(location.pathname + location.search)}`);
      return;
    }
    
    if (id) {
      const success = await joinRoom(id);
      if (success) {
        toast({
          title: "Joined session",
          description: "You're now part of this session"
        });
      }
    }
  };

  const onLeave = () => {
    navigate('/live/sessions');
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({
      title: "Link copied",
      description: "Session link copied to clipboard"
    });
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error || !session) {
    return (
      <main className="pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card>
            <CardContent className="py-12 text-center">
              <h1 className="text-2xl font-bold mb-4">Session not found</h1>
              <p className="text-muted-foreground mb-6">This session may have ended or doesn't exist.</p>
              <Button asChild>
                <Link to="/live/sessions">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Sessions
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Session Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <Button variant="outline" onClick={onLeave}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Sessions
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={copyLink}>
                <Copy className="h-4 w-4 mr-2" />
                Copy Link
              </Button>
              <Button onClick={onJoin}>Join Session</Button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">{session.title}</h1>
              <p className="text-muted-foreground mt-1">{session.description}</p>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant={session.status === 'live' ? 'default' : 'secondary'}>
                {session.status === 'live' ? 'Live' : 'Idle'}
              </Badge>
              <div className="flex items-center text-sm text-muted-foreground">
                <Users className="h-4 w-4 mr-1" />
                {session.participant_count || 0} participants
              </div>
              <div className="flex items-center text-sm text-muted-foreground">
                <Clock className="h-4 w-4 mr-1" />
                {formatDistanceToNow(new Date(session.created_at), { addSuffix: true })}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Media & Video */}
          <div className="lg:col-span-2 space-y-6">
            <SessionMedia sessionId={id} session={session} />
            <VideoCallInterface
              sessionId={id}
              session={session}
              latestGift={latestGift}
            />
          </div>

          {/* Right Column - Chat */}
          <div className="space-y-6">
            <SessionChat sessionId={id} session={session} />
            {id && (
              <LiveGiftPanel
                roomId={id}
                hostId={session.host_id}
                {...liveGiftState}
              />
            )}
          </div>
        </div>

        {/* Bottom Tabs */}
        <div className="mt-8">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="files">Files</TabsTrigger>
              <TabsTrigger value="feedback">Feedback</TabsTrigger>
              <TabsTrigger value="audio">Audio Analysis</TabsTrigger>
            </TabsList>
            
            <TabsContent value="files" className="mt-6">
              <div className="grid md:grid-cols-2 gap-6">
                <SessionFiles sessionId={id} session={session} />
                <SessionNotes sessionId={id} session={session} />
              </div>
            </TabsContent>
            
            <TabsContent value="feedback" className="mt-6">
              <SessionFeedback sessionId={id} session={session} />
            </TabsContent>
            
            <TabsContent value="audio" className="mt-6">
              <WaveformFeedback 
                audioUrl=""
                sessionId={id || ""}
                onAddFeedback={async () => {}}
                feedbackItems={[]}
              />
            </TabsContent>
          </Tabs>
        </div>

        <PostEventRedirect 
          eventType="session" 
          eventId={id || ""} 
          eventStatus={session.status} 
        />
      </div>
      <LiveCTA />
    </main>
  );
};

export default SessionRoom;
