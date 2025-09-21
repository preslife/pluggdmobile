import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Play, Square, Users, Settings } from "lucide-react";

interface HostControlsProps {
  sessionStatus: 'idle' | 'live' | 'ended';
  participantCount: number;
  onStartSession: () => void;
  onEndSession: () => void;
  disabled?: boolean;
}

export const HostControls = ({
  sessionStatus,
  participantCount,
  onStartSession,
  onEndSession,
  disabled
}: HostControlsProps) => {
  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={`h-3 w-3 rounded-full ${
                sessionStatus === 'live' ? 'bg-red-500 animate-pulse' : 
                sessionStatus === 'idle' ? 'bg-yellow-500' : 'bg-gray-500'
              }`} />
              <span className="font-medium capitalize">{sessionStatus}</span>
            </div>
            
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{participantCount} participants</span>
            </div>
          </div>

          <div className="flex gap-2">
            {sessionStatus === 'idle' && (
              <Button 
                onClick={onStartSession}
                disabled={disabled}
                className="gap-2"
              >
                <Play className="h-4 w-4" />
                Start Session
              </Button>
            )}
            
            {sessionStatus === 'live' && (
              <Button 
                onClick={onEndSession}
                disabled={disabled}
                variant="destructive"
                className="gap-2"
              >
                <Square className="h-4 w-4" />
                End Session
              </Button>
            )}
            
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};