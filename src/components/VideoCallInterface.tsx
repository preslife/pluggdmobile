import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import AgoraRTC, {
  IAgoraRTCClient,
  IAgoraRTCRemoteUser,
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
  IRemoteVideoTrack,
  IRemoteAudioTrack,
} from 'agora-rtc-sdk-ng';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Monitor,
  MonitorOff,
  PhoneOff,
  Users,
  Sparkles,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useSessionPresence } from '@/hooks/useSessionPresence';
import { supabase } from '@/integrations/supabase/client';
import type { Session } from '@/hooks/useSessions';
import type { LiveGiftEventItem } from '@/hooks/useLiveGifts';

interface VideoCallInterfaceProps {
  sessionId: string | undefined;
  session: Session | null;
  latestGift?: LiveGiftEventItem;
  onParticipantCountChange?: (count: number) => void;
}

type ConnectionState = 'disconnected' | 'connecting' | 'connected';

type AgoraRole = 'host' | 'collaborator' | 'audience';

interface VideoParticipantProps {
  uid: string | number;
  isLocal: boolean;
  videoTrack?: ICameraVideoTrack | IRemoteVideoTrack | null;
  audioTrack?: IMicrophoneAudioTrack | IRemoteAudioTrack | null;
  muted?: boolean;
  videoOff?: boolean;
  label?: string;
}

const connectionLabel: Record<ConnectionState, string> = {
  connected: 'Connected',
  connecting: 'Connecting…',
  disconnected: 'Disconnected',
};

export const VideoCallInterface: React.FC<VideoCallInterfaceProps> = ({
  sessionId,
  session,
  latestGift,
  onParticipantCountChange,
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { users: presenceUsers } = useSessionPresence(sessionId);

  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const localAudioTrackRef = useRef<IMicrophoneAudioTrack | null>(null);
  const localVideoTrackRef = useRef<ICameraVideoTrack | null>(null);
  const activeGiftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastGiftIdRef = useRef<string | null>(null);

  const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([]);
  const [isInCall, setIsInCall] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionState>('disconnected');
  const [joinPending, setJoinPending] = useState(false);
  const [localMuted, setLocalMuted] = useState(false);
  const [localVideoOff, setLocalVideoOff] = useState(false);
  const [localAudioTrack, setLocalAudioTrack] = useState<IMicrophoneAudioTrack | null>(null);
  const [localVideoTrack, setLocalVideoTrack] = useState<ICameraVideoTrack | null>(null);
  const [agoraRole, setAgoraRole] = useState<AgoraRole>('audience');
  const [activeGift, setActiveGift] = useState<LiveGiftEventItem | null>(null);

  const isHost = !!user && !!session && session.host_id === user.id;
  const canPublish = agoraRole === 'host' || agoraRole === 'collaborator';

  const cleanup = useCallback(async () => {
    const client = clientRef.current;

    const tracks: Array<ICameraVideoTrack | IMicrophoneAudioTrack> = [];
    if (localVideoTrackRef.current) tracks.push(localVideoTrackRef.current);
    if (localAudioTrackRef.current) tracks.push(localAudioTrackRef.current);

    tracks.forEach((track) => {
      try {
        track.stop();
        track.close();
      } catch (error) {
        console.warn('Failed to stop Agora track', error);
      }
    });

    localVideoTrackRef.current = null;
    localAudioTrackRef.current = null;
    setLocalVideoTrack(null);
    setLocalAudioTrack(null);
    setLocalMuted(false);
    setLocalVideoOff(false);

    if (client) {
      try {
        client.removeAllListeners();
        await client.unpublish(tracks as any);
      } catch (error) {
        // ignore cleanup errors
      }

      try {
        await client.leave();
      } catch (error) {
        console.warn('Failed to leave Agora channel', error);
      }
    }

    clientRef.current = null;
    setRemoteUsers([]);
    setIsInCall(false);
    setConnectionStatus('disconnected');
    setAgoraRole('audience');
  }, []);

  useEffect(() => {
    return () => {
      cleanup();
      if (activeGiftTimerRef.current) {
        clearTimeout(activeGiftTimerRef.current);
      }
    };
  }, [cleanup]);

  const addOrUpdateRemoteUser = useCallback((user: IAgoraRTCRemoteUser) => {
    setRemoteUsers((prev) => {
      const existing = prev.find((remote) => remote.uid === user.uid);
      if (existing) {
        return prev.map((remote) => (remote.uid === user.uid ? user : remote));
      }
      return [...prev, user];
    });
  }, []);

  const removeRemoteUser = useCallback((uid: string | number) => {
    setRemoteUsers((prev) => prev.filter((remote) => remote.uid !== uid));
  }, []);

  const handleUserPublished = useCallback(
    async (agoraUser: IAgoraRTCRemoteUser, mediaType: 'audio' | 'video') => {
      const client = clientRef.current;
      if (!client) return;

      try {
        await client.subscribe(agoraUser, mediaType);
        if (mediaType === 'audio') {
          agoraUser.audioTrack?.play();
        }
        addOrUpdateRemoteUser(agoraUser);
      } catch (error) {
        console.error('Failed to subscribe to remote user', error);
      }
    },
    [addOrUpdateRemoteUser]
  );

  const handleUserUnpublished = useCallback(
    (agoraUser: IAgoraRTCRemoteUser, mediaType: 'audio' | 'video') => {
      if (mediaType === 'audio') {
        agoraUser.audioTrack?.stop();
      }
      if (mediaType === 'video') {
        agoraUser.videoTrack?.stop();
      }
      // remove user entirely; they will be added back when they publish again
      removeRemoteUser(agoraUser.uid);
    },
    [removeRemoteUser]
  );

  const handleUserLeft = useCallback(
    (agoraUser: IAgoraRTCRemoteUser) => {
      removeRemoteUser(agoraUser.uid);
    },
    [removeRemoteUser]
  );

  const joinCall = useCallback(async () => {
    if (!sessionId) {
      toast({
        title: 'Session unavailable',
        description: 'The live room could not be found.',
        variant: 'destructive',
      });
      return;
    }

    if (!user) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to join the live call.',
        variant: 'destructive',
      });
      return;
    }

    if (joinPending) return;

    setJoinPending(true);
    setConnectionStatus('connecting');

    try {
      const { data, error } = await supabase.functions.invoke('create-live-session-token', {
        body: {
          room_id: sessionId,
          role: isHost ? 'host' : 'audience',
        },
      });

      if (error) {
        throw new Error(error.message || 'Unable to join live session');
      }

      const joinInfo = data as {
        appId: string;
        channelName: string;
        token: string;
        uid: number;
        role: AgoraRole;
      };

      const client = AgoraRTC.createClient({ mode: 'live', codec: 'vp8' });
      clientRef.current = client;

      const roleForClient = joinInfo.role === 'audience' ? 'audience' : 'host';
      await client.setClientRole(roleForClient);
      setAgoraRole(joinInfo.role);

      client.on('user-published', handleUserPublished);
      client.on('user-unpublished', handleUserUnpublished);
      client.on('user-left', handleUserLeft);
      client.on('connection-state-change', (current) => {
        if (current === 'CONNECTED') {
          setConnectionStatus('connected');
        } else if (current === 'CONNECTING') {
          setConnectionStatus('connecting');
        } else if (current === 'DISCONNECTED') {
          setConnectionStatus('disconnected');
        }
      });

      await client.join(joinInfo.appId, joinInfo.channelName, joinInfo.token, joinInfo.uid);

      if (joinInfo.role !== 'audience') {
        const [microphoneTrack, cameraTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
        localAudioTrackRef.current = microphoneTrack;
        localVideoTrackRef.current = cameraTrack;
        setLocalAudioTrack(microphoneTrack);
        setLocalVideoTrack(cameraTrack);
        setLocalMuted(false);
        setLocalVideoOff(false);
        await client.publish([microphoneTrack, cameraTrack]);
      }

      setIsInCall(true);
      setConnectionStatus('connected');

      toast({
        title: 'Live call joined',
        description: 'You are now connected to the live session.',
      });
    } catch (error: any) {
      console.error('Failed to join Agora channel', error);
      toast({
        title: 'Unable to join',
        description: error?.message || 'Could not connect to the live session.',
        variant: 'destructive',
      });
      setConnectionStatus('disconnected');
      await cleanup();
    } finally {
      setJoinPending(false);
    }
  }, [cleanup, handleUserLeft, handleUserPublished, handleUserUnpublished, isHost, joinPending, sessionId, toast, user]);

  const leaveCall = useCallback(async () => {
    if (!isInCall) return;

    await cleanup();

    if (user && sessionId) {
      try {
        await supabase
          .from('session_participants')
          .update({ left_at: new Date().toISOString() })
          .eq('room_id', sessionId)
          .eq('user_id', user.id);
      } catch (error) {
        console.warn('Failed to mark participant as left', error);
      }
    }

    toast({
      title: 'Left live call',
      description: 'You have exited the live session.',
    });
  }, [cleanup, isInCall, sessionId, toast, user]);

  const toggleMute = useCallback(async () => {
    const track = localAudioTrackRef.current;
    if (!track) return;

    const nextMuted = !localMuted;
    try {
      await track.setEnabled(!nextMuted);
      setLocalMuted(nextMuted);
    } catch (error) {
      console.warn('Failed to toggle microphone', error);
    }
  }, [localMuted]);

  const toggleVideo = useCallback(async () => {
    const track = localVideoTrackRef.current;
    if (!track) return;

    const nextOff = !localVideoOff;
    try {
      await track.setEnabled(!nextOff);
      setLocalVideoOff(nextOff);
    } catch (error) {
      console.warn('Failed to toggle camera', error);
    }
  }, [localVideoOff]);

  const shareScreen = useCallback(() => {
    toast({
      title: 'Screen share coming soon',
      description: 'Screen sharing with Agora will be available in an upcoming update.',
    });
  }, [toast]);

  useEffect(() => {
    const count = (isInCall ? 1 : 0) + remoteUsers.length;
    onParticipantCountChange?.(count);
  }, [isInCall, onParticipantCountChange, remoteUsers.length]);

  useEffect(() => {
    if (!latestGift || latestGift.id === lastGiftIdRef.current) {
      return;
    }

    lastGiftIdRef.current = latestGift.id;
    setActiveGift(latestGift);

    if (activeGiftTimerRef.current) {
      clearTimeout(activeGiftTimerRef.current);
    }

    activeGiftTimerRef.current = setTimeout(() => {
      setActiveGift(null);
    }, 5000);
  }, [latestGift]);

  const participants = useMemo(() => {
    const list: VideoParticipantProps[] = [];
    if (isInCall) {
      list.push({
        uid: user?.id || 'local',
        isLocal: true,
        videoTrack: localVideoTrack,
        audioTrack: localAudioTrack,
        muted: localMuted,
        videoOff: localVideoOff,
        label: 'You',
      });
    }

    remoteUsers.forEach((remote) => {
      list.push({
        uid: remote.uid,
        isLocal: false,
        videoTrack: remote.videoTrack ?? null,
        audioTrack: remote.audioTrack ?? null,
        label: typeof remote.uid === 'number' ? `Viewer ${remote.uid}` : remote.uid.toString(),
      });
    });

    return list;
  }, [isInCall, localAudioTrack, localMuted, localVideoOff, localVideoTrack, remoteUsers, user?.id]);

  return (
    <Card className="relative overflow-hidden border-border">
      {activeGift && (
        <div className="absolute inset-x-4 top-4 z-20 flex justify-center">
          <div className="w-full max-w-md rounded-2xl border border-primary/40 bg-background/90 px-4 py-3 shadow-lg backdrop-blur">
            <div className="flex items-center gap-3">
              {activeGift.gift?.thumbnail_url ? (
                <img
                  src={activeGift.gift.thumbnail_url}
                  alt={activeGift.gift.label}
                  className="h-12 w-12 rounded-xl object-cover shadow"
                />
              ) : (
                <Sparkles className="h-10 w-10 text-primary" />
              )}
              <div className="min-w-0">
                <div className="text-sm font-semibold text-primary">
                  {activeGift.gift?.label || 'Gift unlocked'} × {activeGift.quantity}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {(activeGift.sender_id === user?.id ? 'You' : activeGift.sender_id.slice(0, 8))}{' '}
                  sent {activeGift.total_credits} credits
                </div>
                {activeGift.message && (
                  <div className="text-xs italic text-muted-foreground mt-1 truncate">
                    “{activeGift.message}”
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Video className="w-5 h-5" />
            Live Call
            <Badge variant="outline" className="ml-2 flex items-center gap-1">
              <Users className="w-3 h-3" />
              {presenceUsers.length}
            </Badge>
          </h3>
          <Badge variant={connectionStatus === 'connected' ? 'default' : 'secondary'}>
            {connectionLabel[connectionStatus]}
          </Badge>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {!isInCall ? (
            <Button onClick={joinCall} disabled={joinPending} className="flex items-center gap-2">
              <Video className="w-4 h-4" />
              {joinPending ? 'Joining…' : 'Join Call'}
            </Button>
          ) : (
            <>
              <Button
                variant={localMuted ? 'destructive' : 'outline'}
                size="sm"
                onClick={toggleMute}
                disabled={!canPublish || !localAudioTrack}
              >
                {localMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </Button>

              <Button
                variant={localVideoOff ? 'destructive' : 'outline'}
                size="sm"
                onClick={toggleVideo}
                disabled={!canPublish || !localVideoTrack}
              >
                {localVideoOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={shareScreen}
                disabled
              >
                <Monitor className="w-4 h-4" />
              </Button>

              <Button variant="destructive" size="sm" onClick={leaveCall}>
                <PhoneOff className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>

        {isInCall && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {participants.map((participant) => (
              <VideoParticipant key={participant.uid} {...participant} />
            ))}
          </div>
        )}

        {isInCall && participants.length === 1 && (
          <p className="text-sm text-muted-foreground text-center py-6">
            Waiting for others to join the call…
          </p>
        )}

        {!isInCall && (
          <p className="text-sm text-muted-foreground">
            Go live to start streaming with your collaborators. Audience members can join once you are live.
          </p>
        )}
      </div>
    </Card>
  );
};

const VideoParticipant: React.FC<VideoParticipantProps> = ({
  uid,
  isLocal,
  videoTrack,
  audioTrack,
  muted,
  videoOff,
  label,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const track = videoTrack;
    const container = containerRef.current;

    if (track && container) {
      track.play(container);
      setIsPlaying(true);
      return () => {
        try {
          track.stop();
        } catch (error) {
          console.warn('Failed to stop video track', error);
        }
        setIsPlaying(false);
      };
    }
  }, [videoTrack]);

  useEffect(() => {
    if (!isLocal && audioTrack) {
      try {
        audioTrack.play();
      } catch (error) {
        console.warn('Failed to play remote audio track', error);
      }
    }
  }, [audioTrack, isLocal]);

  return (
    <div className="relative aspect-video rounded-lg border border-border bg-muted overflow-hidden">
      <div ref={containerRef} className="h-full w-full bg-black" />
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
          <VideoOff className="h-10 w-10" />
        </div>
      )}
      <div className="absolute bottom-2 left-2 flex items-center gap-2">
        <Badge variant="secondary" className="text-xs">
          {label || (isLocal ? 'You' : typeof uid === 'string' ? uid.slice(0, 8) : `User ${uid}`)}
        </Badge>
        {muted && <MicOff className="w-3 h-3 text-muted-foreground" />}
        {(videoOff || !isPlaying) && <VideoOff className="w-3 h-3 text-muted-foreground" />}
      </div>
    </div>
  );
};
