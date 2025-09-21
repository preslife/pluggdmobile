import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useSessionMembership } from "@/hooks/useSessionMembership";
import { useSessionPresence } from "@/hooks/useSessionPresence";
import { supabase } from "@/integrations/supabase/client";

// Lightweight P2P WebRTC media for sessions using Supabase Realtime for signaling
// Mesh topology (each peer connects to others). Intended as a beta/preview.

// NOTE: This is intentionally minimal and avoids device selection and advanced controls.
// It focuses on a reliable baseline with clear cleanup and error handling.

type Props = {
  sessionId: string | undefined;
  session?: any;
};

type RemoteStream = {
  userId: string;
  stream: MediaStream;
};

const rtcConfig: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:global.stun.twilio.com:3478?transport=udp" },
  ],
};

const SessionMedia: React.FC<Props> = ({ sessionId, session }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { canModerate, canWrite } = useSessionMembership(sessionId);
  const { users: presenceUsers } = useSessionPresence(sessionId);

  const [joined, setJoined] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [screenOn, setScreenOn] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);

  // Signaling channel + peer maps
  const channelRef = useRef<any>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const remoteStreamsRef = useRef<Map<string, MediaStream>>(new Map());
  const [remoteStreams, setRemoteStreams] = useState<RemoteStream[]>([]);

  const me = user?.id || null;
  const otherUserIds = useMemo(() => (presenceUsers || [])
    .map(u => u.user_id)
    .filter(uid => uid && uid !== me), [presenceUsers, me]);

  const resetRemoteStreamsState = useCallback(() => {
    const list: RemoteStream[] = [];
    remoteStreamsRef.current.forEach((stream, uid) => list.push({ userId: uid, stream }));
    setRemoteStreams(list);
  }, []);

  const attachLocalStream = useCallback((stream: MediaStream) => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
      localVideoRef.current.muted = true; // avoid echo
      localVideoRef.current.play().catch(() => {});
    }
  }, []);

  const stopMediaStream = (stream: MediaStream | null) => {
    stream?.getTracks().forEach((t) => t.stop());
  };

  const cleanupPeers = () => {
    peersRef.current.forEach((pc) => pc.close());
    peersRef.current.clear();
    remoteStreamsRef.current.clear();
    resetRemoteStreamsState();
  };

  const leaveMedia = useCallback(() => {
    setJoined(false);
    setScreenOn(false);
    stopMediaStream(screenStreamRef.current);
    screenStreamRef.current = null;

    stopMediaStream(localStreamRef.current);
    localStreamRef.current = null;

    cleanupPeers();

    if (channelRef.current) {
      try { supabase.removeChannel(channelRef.current); } catch {}
      channelRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      leaveMedia();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ensurePeer = useCallback(async (peerId: string) => {
    if (!me || !sessionId) return null;
    if (peerId === me) return null;
    if (peersRef.current.has(peerId)) return peersRef.current.get(peerId)!;

    const pc = new RTCPeerConnection(rtcConfig);

    pc.onicecandidate = (event) => {
      if (event.candidate && channelRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "signal",
          payload: {
            type: "candidate",
            from: me,
            to: peerId,
            candidate: event.candidate,
          },
        });
      }
    };

    pc.ontrack = (event) => {
      const [stream] = event.streams;
      if (!stream) return;
      remoteStreamsRef.current.set(peerId, stream);
      resetRemoteStreamsState();
    };

    // Add local tracks
    const local = localStreamRef.current;
    if (local) {
      local.getTracks().forEach((t) => pc.addTrack(t, local));
    }

    peersRef.current.set(peerId, pc);
    return pc;
  }, [me, sessionId, resetRemoteStreamsState]);

  const callPeerIfInitiator = useCallback(async (peerId: string) => {
    if (!me || !channelRef.current) return;
    // Simple deterministic initiator: lexicographically smaller id creates offer
    if (me < peerId) {
      const pc = await ensurePeer(peerId);
      if (!pc) return;
      try {
        const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
        await pc.setLocalDescription(offer);
        channelRef.current.send({
          type: "broadcast",
          event: "signal",
          payload: { type: "offer", from: me, to: peerId, sdp: offer.sdp },
        });
      } catch (e) {
        console.error("createOffer error", e);
      }
    }
  }, [me, ensurePeer]);

  // React to presence changes: try to connect to any new peers
  useEffect(() => {
    if (!joined || !me) return;
    otherUserIds.forEach((uid) => {
      callPeerIfInitiator(uid);
    });
  }, [joined, me, otherUserIds, callPeerIfInitiator]);

  const handleSignal = useCallback(async (payload: any) => {
    if (!me) return;
    const { type, from, to } = payload || {};
    if (!type || !from) return;
    if (to && to !== me) return; // not for me

    const pc = await ensurePeer(from);
    if (!pc) return;

    try {
      if (type === "offer") {
        await pc.setRemoteDescription({ type: "offer", sdp: payload.sdp });
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        channelRef.current?.send({
          type: "broadcast",
          event: "signal",
          payload: { type: "answer", from: me, to: from, sdp: answer.sdp },
        });
      } else if (type === "answer") {
        if (!pc.currentRemoteDescription) {
          await pc.setRemoteDescription({ type: "answer", sdp: payload.sdp });
        }
      } else if (type === "candidate" && payload.candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
      }
    } catch (e) {
      console.error("Signal handling error", e);
    }
  }, [ensurePeer, me]);

  const joinMedia = useCallback(async () => {
    if (!sessionId) return;
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to join media.", variant: "destructive" });
      return;
    }
    if (!canWrite || session?.status === "ended") {
      toast({ title: "Not allowed", description: "Media is disabled for this session.", variant: "destructive" });
      return;
    }

    try {
      // Prepare local media
      const local = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      localStreamRef.current = local;
      attachLocalStream(local);
      setJoined(true);

      // Setup signaling channel
      const ch = supabase
        .channel(`session-media:${sessionId}`)
        .on("broadcast", { event: "signal" }, ({ payload }) => {
          handleSignal(payload);
        })
        .subscribe();

      channelRef.current = ch;
      toast({ title: "Media ready", description: "You're connected. Say hi!" });
    } catch (e: any) {
      console.error(e);
      toast({ title: "Media error", description: e?.message || "Unable to access camera/mic.", variant: "destructive" });
    }
  }, [attachLocalStream, canWrite, handleSignal, session?.status, sessionId, toast, user]);

  const toggleMic = () => {
    const local = localStreamRef.current;
    if (!local) return;
    const next = !micOn;
    local.getAudioTracks().forEach((t) => (t.enabled = next));
    setMicOn(next);
  };

  const toggleCam = () => {
    const local = localStreamRef.current;
    if (!local) return;
    const next = !camOn;
    local.getVideoTracks().forEach((t) => (t.enabled = next));
    setCamOn(next);
  };

  const toggleScreen = async () => {
    if (!joined) return;
    if (!screenOn) {
      try {
        // Start sharing screen
        const screen = await (navigator.mediaDevices as any).getDisplayMedia({ video: true, audio: false });
        screenStreamRef.current = screen;
        setScreenOn(true);

        // Replace video track in all peer connections
        const screenTrack = screen.getVideoTracks()[0];
        peersRef.current.forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track && s.track.kind === "video");
          if (sender) sender.replaceTrack(screenTrack);
        });

        // Update local preview to screen (optional UX)
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screen;
          localVideoRef.current.play().catch(() => {});
        }

        // When screen ends, revert
        screenTrack.onended = () => {
          revertFromScreen();
        };
      } catch (e) {
        console.error("Screen share error", e);
      }
    } else {
      revertFromScreen();
    }
  };

  const revertFromScreen = () => {
    const screen = screenStreamRef.current;
    if (!screen) return;
    stopMediaStream(screen);
    screenStreamRef.current = null;
    setScreenOn(false);

    const local = localStreamRef.current;
    if (!local) return;
    const camTrack = local.getVideoTracks()[0];
    if (camTrack) {
      peersRef.current.forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track && s.track.kind === "video");
        if (sender) sender.replaceTrack(camTrack);
      });
    }
    attachLocalStream(local);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 flex-wrap">
        {!joined ? (
          <Button onClick={joinMedia} disabled={!canWrite || session?.status === 'ended'}>
            Join A/V
          </Button>
        ) : (
          <>
            <Button variant="secondary" onClick={toggleMic}>{micOn ? "Mute" : "Unmute"}</Button>
            <Button variant="secondary" onClick={toggleCam}>{camOn ? "Hide Cam" : "Show Cam"}</Button>
            <Button variant="secondary" onClick={toggleScreen}>{screenOn ? "Stop Share" : "Share Screen"}</Button>
            <Button variant="outline" onClick={leaveMedia}>Leave A/V</Button>
          </>
        )}
        {!canWrite && (
          <span className="text-sm text-muted-foreground">
            Join the session to enable media.
          </span>
        )}
        {session?.status === 'ended' && (
          <span className="text-sm text-muted-foreground">Session ended</span>
        )}
      </div>

      {/* Videos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-md overflow-hidden bg-muted aspect-video">
          <video ref={localVideoRef} className="w-full h-full object-cover" playsInline />
        </div>
        {remoteStreams.map(({ userId, stream }) => (
          <RemoteVideo key={userId} userId={userId} stream={stream} />
        ))}
      </div>

      {(joined && otherUserIds.length === 0) && (
        <p className="text-sm text-muted-foreground">Waiting for others to join…</p>
      )}
    </div>
  );
};

const RemoteVideo: React.FC<{ userId: string; stream: MediaStream }> = ({ userId, stream }) => {
  const ref = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.srcObject = stream;
      ref.current.play().catch(() => {});
    }
  }, [stream]);
  return (
    <div className="rounded-md overflow-hidden bg-muted aspect-video">
      <video ref={ref} className="w-full h-full object-cover" playsInline />
      <div className="p-2 text-xs text-muted-foreground">{userId.slice(0, 8)}</div>
    </div>
  );
};

export default SessionMedia;
