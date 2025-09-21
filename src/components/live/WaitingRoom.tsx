import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Users } from "lucide-react";

interface WaitingRoomProps {
  sessionTitle: string;
  participantCount: number;
  isHost: boolean;
  onStartSession?: () => void;
}

export const WaitingRoom = ({ 
  sessionTitle, 
  participantCount, 
  isHost, 
  onStartSession 
}: WaitingRoomProps) => {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center space-y-6">
          <div className="space-y-2">
            <Clock className="h-12 w-12 mx-auto text-muted-foreground" />
            <h2 className="text-2xl font-bold">{sessionTitle}</h2>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{participantCount} participants waiting</span>
            </div>
            
            {isHost ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Ready to start your session?
                </p>
                <Button onClick={onStartSession} className="w-full">
                  Start Session
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Waiting for host to start the session...
                </p>
                <div className="flex justify-center">
                  <div className="animate-pulse flex space-x-1">
                    <div className="rounded-full bg-primary h-2 w-2"></div>
                    <div className="rounded-full bg-primary h-2 w-2 animation-delay-200"></div>
                    <div className="rounded-full bg-primary h-2 w-2 animation-delay-400"></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};