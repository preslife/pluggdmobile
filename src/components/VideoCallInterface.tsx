import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Monitor, 
  MonitorOff,
  PhoneOff,
  Settings,
  Users
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useSessionPresence } from "@/hooks/useSessionPresence";
import { supabase } from "@/integrations/supabase/client";

interface VideoCallInterfaceProps {
  sessionId: string;
  onParticipantCountChange?: (count: number) => void;
}

interface Participant {
  userId: string;
  stream: MediaStream;
  isLocal: boolean;
  isMuted: boolean;
  isVideoOff: boolean;
}

const rtcConfig: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:global.stun.twilio.com:3478?transport=udp" },
  ],
};

export const VideoCallInterface: React.FC<VideoCallInterfaceProps> = ({
  sessionId,
  onParticipantCountChange
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { users: presenceUsers } = useSessionPresence(sessionId);

  const [isInCall, setIsInCall] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [localMuted, setLocalMuted] = useState(false);
  const [localVideoOff, setLocalVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "disconnected">("disconnected");

  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const channelRef = useRef<any>(null);

  const cleanup = useCallback(() => {
    // Stop all tracks
    localStreamRef.current?.getTracks().forEach(track => track.stop());
    screenStreamRef.current?.getTracks().forEach(track => track.stop());
    
    // Close peer connections
    peersRef.current.forEach(pc => pc.close());
    peersRef.current.clear();
    
    // Remove signaling channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    setParticipants([]);
    setIsInCall(false);
    setConnectionStatus("disconnected");
    onParticipantCountChange?.(0);
  }, [onParticipantCountChange]);

  const createPeerConnection = useCallback((peerId: string) => {
    const pc = new RTCPeerConnection(rtcConfig);
    
    pc.onicecandidate = (event) => {
      if (event.candidate && channelRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "ice-candidate",
          payload: {
            candidate: event.candidate,
            from: user?.id,
            to: peerId
          }
        });
      }
    };

    pc.ontrack = (event) => {
      const [stream] = event.streams;
      setParticipants(prev => {
        const existing = prev.find(p => p.userId === peerId);
        if (existing) {
          return prev.map(p => 
            p.userId === peerId 
              ? { ...p, stream } 
              : p
          );
        }
        return [...prev, {
          userId: peerId,
          stream,
          isLocal: false,
          isMuted: false,
          isVideoOff: false
        }];
      });
    };

    pc.onconnectionstatechange = () => {
      console.log(`Peer ${peerId} connection state:`, pc.connectionState);
      if (pc.connectionState === "connected") {
        setConnectionStatus("connected");
      } else if (pc.connectionState === "failed" || pc.connectionState === "closed") {
        setConnectionStatus("disconnected");
      }
    };

    // Add local stream tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    peersRef.current.set(peerId, pc);
    return pc;
  }, [user?.id]);

  const handleSignaling = useCallback(async (payload: any) => {
    const { type, from, to, offer, answer, candidate } = payload;
    
    if (to !== user?.id) return; // Not for us

    let pc = peersRef.current.get(from);
    if (!pc) {
      pc = createPeerConnection(from);
    }

    try {
      switch (type) {
        case "offer":
          await pc.setRemoteDescription(new RTCSessionDescription(offer));
          const answer_sdp = await pc.createAnswer();
          await pc.setLocalDescription(answer_sdp);
          
          channelRef.current?.send({
            type: "broadcast",
            event: "answer",
            payload: {
              answer: answer_sdp,
              from: user?.id,
              to: from
            }
          });
          break;

        case "answer":
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
          break;

        case "ice-candidate":
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
          break;
      }
    } catch (error) {
      console.error("Signaling error:", error);
    }
  }, [user?.id, createPeerConnection]);

  const initiateCall = useCallback(async (peerId: string) => {
    const pc = createPeerConnection(peerId);
    
    try {
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      await pc.setLocalDescription(offer);
      
      channelRef.current?.send({
        type: "broadcast",
        event: "offer",
        payload: {
          offer,
          from: user?.id,
          to: peerId
        }
      });
    } catch (error) {
      console.error("Failed to initiate call:", error);
    }
  }, [createPeerConnection, user?.id]);

  const joinCall = useCallback(async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to join the video call",
        variant: "destructive"
      });
      return;
    }

    try {
      setConnectionStatus("connecting");
      
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: true
      });
      
      localStreamRef.current = stream;
      
      // Add local participant
      setParticipants([{
        userId: user.id,
        stream,
        isLocal: true,
        isMuted: localMuted,
        isVideoOff: localVideoOff
      }]);

      // Setup signaling
      const channel = supabase
        .channel(`video-call:${sessionId}`)
        .on("broadcast", { event: "offer" }, ({ payload }) => handleSignaling({ type: "offer", ...payload }))
        .on("broadcast", { event: "answer" }, ({ payload }) => handleSignaling({ type: "answer", ...payload }))
        .on("broadcast", { event: "ice-candidate" }, ({ payload }) => handleSignaling({ type: "ice-candidate", ...payload }))
        .subscribe();

      channelRef.current = channel;
      setIsInCall(true);
      setConnectionStatus("connected");

      // Initiate calls to existing participants
      presenceUsers?.forEach(({ user_id }) => {
        if (user_id && user_id !== user.id) {
          initiateCall(user_id);
        }
      });

      toast({
        title: "Joined Call",
        description: "You've joined the video call",
      });

    } catch (error) {
      console.error("Failed to join call:", error);
      toast({
        title: "Call Failed",
        description: "Could not access camera/microphone",
        variant: "destructive"
      });
      setConnectionStatus("disconnected");
    }
  }, [user, localMuted, localVideoOff, sessionId, handleSignaling, presenceUsers, initiateCall, toast]);

  const leaveCall = useCallback(() => {
    cleanup();
    toast({
      title: "Left Call",
      description: "You've left the video call",
    });
  }, [cleanup, toast]);

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = localMuted;
      });
      setLocalMuted(!localMuted);
    }
  }, [localMuted]);

  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = localVideoOff;
      });
      setLocalVideoOff(!localVideoOff);
    }
  }, [localVideoOff]);

  const shareScreen = useCallback(async () => {
    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false
        });
        
        screenStreamRef.current = screenStream;
        setIsScreenSharing(true);

        // Replace video track in all peer connections
        const videoTrack = screenStream.getVideoTracks()[0];
        peersRef.current.forEach(pc => {
          const sender = pc.getSenders().find(s => s.track?.kind === "video");
          if (sender) {
            sender.replaceTrack(videoTrack);
          }
        });

        // Handle screen share end
        videoTrack.onended = () => {
          setIsScreenSharing(false);
          screenStreamRef.current = null;
          
          // Restore camera
          if (localStreamRef.current) {
            const cameraTrack = localStreamRef.current.getVideoTracks()[0];
            peersRef.current.forEach(pc => {
              const sender = pc.getSenders().find(s => s.track?.kind === "video");
              if (sender && cameraTrack) {
                sender.replaceTrack(cameraTrack);
              }
            });
          }
        };

      } catch (error) {
        console.error("Screen share failed:", error);
        toast({
          title: "Screen Share Failed",
          description: "Could not start screen sharing",
          variant: "destructive"
        });
      }
    } else {
      // Stop screen sharing
      screenStreamRef.current?.getTracks().forEach(track => track.stop());
      setIsScreenSharing(false);
    }
  }, [isScreenSharing, toast]);

  useEffect(() => {
    onParticipantCountChange?.(participants.length);
  }, [participants.length, onParticipantCountChange]);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Video className="w-5 h-5" />
          Video Call
          <Badge variant="outline" className="ml-2">
            <Users className="w-3 h-3 mr-1" />
            {participants.length}
          </Badge>
        </h3>
        <Badge variant={connectionStatus === "connected" ? "default" : "secondary"}>
          {connectionStatus}
        </Badge>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 flex-wrap">
        {!isInCall ? (
          <Button onClick={joinCall} className="flex items-center gap-2">
            <Video className="w-4 h-4" />
            Join Call
          </Button>
        ) : (
          <>
            <Button
              variant={localMuted ? "destructive" : "outline"}
              size="sm"
              onClick={toggleMute}
            >
              {localMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </Button>
            
            <Button
              variant={localVideoOff ? "destructive" : "outline"}
              size="sm"
              onClick={toggleVideo}
            >
              {localVideoOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
            </Button>
            
            <Button
              variant={isScreenSharing ? "default" : "outline"}
              size="sm"
              onClick={shareScreen}
            >
              {isScreenSharing ? <MonitorOff className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
            </Button>
            
            <Button
              variant="destructive"
              size="sm"
              onClick={leaveCall}
            >
              <PhoneOff className="w-4 h-4" />
            </Button>
          </>
        )}
      </div>

      {/* Video Grid */}
      {isInCall && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {participants.map((participant) => (
            <VideoParticipant
              key={participant.userId}
              participant={participant}
            />
          ))}
        </div>
      )}

      {isInCall && participants.length === 1 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Waiting for others to join the call...
        </p>
      )}
    </Card>
  );
};

interface VideoParticipantProps {
  participant: Participant;
}

const VideoParticipant: React.FC<VideoParticipantProps> = ({ participant }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && participant.stream) {
      videoRef.current.srcObject = participant.stream;
    }
  }, [participant.stream]);

  return (
    <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={participant.isLocal}
        className="w-full h-full object-cover"
      />
      
      <div className="absolute bottom-2 left-2 flex items-center gap-1">
        <Badge variant="secondary" className="text-xs">
          {participant.isLocal ? "You" : participant.userId.slice(0, 8)}
        </Badge>
        {participant.isMuted && (
          <MicOff className="w-3 h-3 text-muted-foreground" />
        )}
        {participant.isVideoOff && (
          <VideoOff className="w-3 h-3 text-muted-foreground" />
        )}
      </div>
    </div>
  );
};