import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Monitor, MonitorOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ScreenShareButtonProps {
  onStreamChange: (stream: MediaStream | null) => void;
  disabled?: boolean;
}

export const ScreenShareButton = ({ onStreamChange, disabled }: ScreenShareButtonProps) => {
  const [isSharing, setIsSharing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const { toast } = useToast();

  const startScreenShare = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });

      screenStream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };

      setStream(screenStream);
      setIsSharing(true);
      onStreamChange(screenStream);
      
      toast({
        title: "Screen sharing started",
        description: "Your screen is now being shared"
      });
    } catch (error) {
      console.error('Error starting screen share:', error);
      toast({
        title: "Error",
        description: "Failed to start screen sharing",
        variant: "destructive"
      });
    }
  };

  const stopScreenShare = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsSharing(false);
    onStreamChange(null);
    
    toast({
      title: "Screen sharing stopped",
      description: "You are no longer sharing your screen"
    });
  };

  const toggleScreenShare = () => {
    if (isSharing) {
      stopScreenShare();
    } else {
      startScreenShare();
    }
  };

  return (
    <Button 
      onClick={toggleScreenShare}
      disabled={disabled}
      variant={isSharing ? "destructive" : "outline"}
      size="sm"
    >
      {isSharing ? (
        <>
          <MonitorOff className="h-4 w-4 mr-2" />
          Stop Sharing
        </>
      ) : (
        <>
          <Monitor className="h-4 w-4 mr-2" />
          Share Screen
        </>
      )}
    </Button>
  );
};