import { MaterialIcons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  PermissionsAndroid,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  ChannelProfileType,
  ClientRoleType,
  IRtcEngine,
  RtcSurfaceView,
  createAgoraRtcEngine,
} from '../lib/agora';
import { useAuth } from '../context/AuthProvider';
import { impactHaptic, selectionHaptic } from '../design/haptics';
import { reportLiveRoom } from '../features/culture/mobileServices';
import { useWallet } from '../hooks/useWallet';
import { fetchLiveToken } from '../lib/live';
import { supabase } from '../lib/supabase';
import { PluggdGlassSurface } from '../../components/PluggdPrimitives';

const PLUGGD_ORANGE = '#FF5A00';
const REACTION_TTL_MS = 2400;

type StreamRole = 'host' | 'collaborator' | 'audience';
type JoinStatus = 'loading' | 'waiting' | 'connecting' | 'joined' | 'error' | 'ended';

type Profile = {
  user_id?: string | null;
  full_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
  profile_type?: string | null;
  user_type?: string | null;
  is_creator?: boolean | null;
};

type SessionRoom = {
  id: string;
  title: string;
  description: string | null;
  host_id: string;
  status: string;
  is_public: boolean | null;
  created_at: string;
  scheduled_for?: string | null;
  participant_count?: number | null;
  live_mode?: string | null;
  allow_stage_requests?: boolean | null;
  max_stage_participants?: number | null;
  recording_status?: string | null;
  restream_status?: string | null;
  restream_enabled?: boolean | null;
  restream_targets?: unknown | null;
  captions_enabled?: boolean | null;
  recording_enabled?: boolean | null;
  profiles?: Profile | null;
};

type ChatMessage = {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
};

type LiveGiftCatalogItem = {
  id: string;
  slug: string;
  label: string;
  credit_cost: number;
  description?: string | null;
};

type LiveGiftEvent = {
  id: string;
  room_id: string;
  sender_id: string;
  quantity: number;
  total_credits: number;
  message?: string | null;
  created_at: string;
  gift?: LiveGiftCatalogItem | null;
};

type StageRequest = {
  id: string;
  requester_id: string;
  status: string;
  request_message: string | null;
  created_at: string;
};

type StageParticipant = {
  user_id: string;
  role: string;
  joined_at: string | null;
};

type LiveReaction = {
  id: string;
  kind: 'heart' | 'fire' | 'boost';
  lane: number;
};

function initials(name: string) {
  const parsed = name
    .split(' ')
    .map((part) => part.trim()[0])
    .filter(Boolean)
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return parsed || 'PG';
}

function profileName(profile?: Profile | null) {
  return profile?.full_name?.trim() || profile?.username?.trim() || 'PLUGGD host';
}

function modeLabel(mode?: string | null) {
  if (mode === 'collab_live') return 'Collab Live';
  if (mode === 'class_live') return 'Class Live';
  if (mode === 'audio_room') return 'Audio Room';
  return 'Creator Live';
}

function roleLabel(profile?: Profile | null) {
  const raw = profile?.profile_type ?? profile?.user_type ?? null;
  if (raw === 'dj') return 'DJ';
  if (raw === 'producer') return 'Producer';
  if (raw === 'artist') return 'Artist';
  if (raw === 'promoter') return 'Promoter';
  if (raw === 'venue') return 'Venue';
  if (raw === 'curator') return 'Curator';
  if (raw === 'service_provider') return 'Service';
  if (raw === 'manager') return 'Manager';
  if (profile?.is_creator) return 'Creator';
  return 'Host';
}

function formatCount(value: number) {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return String(value);
}

function normalizeGiftEvent(row: any, fallback?: LiveGiftCatalogItem | null): LiveGiftEvent {
  return {
    id: row.id,
    room_id: row.room_id,
    sender_id: row.sender_id,
    quantity: row.quantity ?? 1,
    total_credits: row.total_credits ?? 0,
    message: row.message ?? null,
    created_at: row.created_at,
    gift: row.live_gift_catalog ?? row.gift ?? fallback ?? null,
  };
}

export default function LiveSessionScreen() {
  const router = useRouter();
  const { roomId, role } = useLocalSearchParams<{ roomId?: string; role?: string }>();
  const { user } = useAuth();
  const wallet = useWallet();

  const currentRoomId = useMemo(
    () => (typeof roomId === 'string' && roomId.length > 0 ? roomId : null),
    [roomId],
  );
  const routeRole = useMemo<StreamRole>(
    () => (role === 'host' || role === 'collaborator' ? role : 'audience'),
    [role],
  );
  const isHostRoute = routeRole === 'host';

  const [session, setSession] = useState<SessionRoom | null>(null);
  const [status, setStatus] = useState<JoinStatus>('loading');
  const [streamRole, setStreamRole] = useState<StreamRole>(routeRole);
  const [remoteUsers, setRemoteUsers] = useState<number[]>([]);
  const [tokenInfo, setTokenInfo] = useState<{ channelName: string; token: string; uid: number; appId: string } | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [profilesById, setProfilesById] = useState<Record<string, Profile>>({});
  const [reactions, setReactions] = useState<LiveReaction[]>([]);
  const [giftCatalog, setGiftCatalog] = useState<LiveGiftCatalogItem[]>([]);
  const [giftEvents, setGiftEvents] = useState<LiveGiftEvent[]>([]);
  const [sendingGift, setSendingGift] = useState(false);
  const [muted, setMuted] = useState(false);
  const [stageRequest, setStageRequest] = useState<StageRequest | null>(null);
  const [stageRequestNote, setStageRequestNote] = useState('');
  const [requestingStage, setRequestingStage] = useState(false);
  const [pendingStageCount, setPendingStageCount] = useState(0);
  const [pendingStageRequests, setPendingStageRequests] = useState<StageRequest[]>([]);
  const [stageParticipants, setStageParticipants] = useState<StageParticipant[]>([]);
  const [runtimeActionLoading, setRuntimeActionLoading] = useState<string | null>(null);
  const [runtimeSaving, setRuntimeSaving] = useState(false);
  const [withdrawingStage, setWithdrawingStage] = useState(false);
  const [removingStageUserId, setRemovingStageUserId] = useState<string | null>(null);

  const engineRef = useRef<IRtcEngine | null>(null);
  const chatChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const reactionChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const giftChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const sessionRef = useRef<SessionRoom | null>(null);

  const host = profileName(session?.profiles);
  const isAudioRoom = session?.live_mode === 'audio_room';
  const isPublisher = streamRole === 'host' || streamRole === 'collaborator';
  const stageSupported =
    Boolean(session?.allow_stage_requests) ||
    ['collab_live', 'class_live', 'audio_room'].includes(session?.live_mode ?? '');
  const viewerCount = Math.max(
    Number(session?.participant_count ?? 0),
    remoteUsers.length + 1,
  );
  const latestGift = giftEvents[0];
  const energyScore = Math.max(
    12,
    Math.min(100, viewerCount * 3 + reactions.length * 9 + giftEvents.length * 4),
  );

  const appendMessage = useCallback((message: ChatMessage) => {
    setMessages((current) => {
      if (current.some((item) => item.id === message.id)) return current;
      return [...current, message].slice(-80);
    });
  }, []);

  const appendGiftEvent = useCallback((event: LiveGiftEvent) => {
    setGiftEvents((current) => {
      if (current.some((item) => item.id === event.id)) return current;
      return [event, ...current].slice(0, 50);
    });
  }, []);

  const pushReaction = useCallback((reaction: LiveReaction) => {
    setReactions((current) => [...current, reaction].slice(-18));
    setTimeout(() => {
      setReactions((current) => current.filter((item) => item.id !== reaction.id));
    }, REACTION_TTL_MS);
  }, []);

  const loadRoom = useCallback(async () => {
    if (!currentRoomId) return null;

    const { data, error } = await (supabase as any)
      .from('session_rooms')
      .select(`
        id,
        title,
        description,
        host_id,
        status,
        is_public,
        created_at,
        scheduled_for,
        participant_count,
        live_mode,
        allow_stage_requests,
        max_stage_participants,
        recording_status,
        restream_status,
        restream_enabled,
        restream_targets,
        captions_enabled,
        recording_enabled,
        profiles!session_rooms_host_id_fkey(user_id, full_name, username, avatar_url, profile_type, user_type, is_creator)
      `)
      .eq('id', currentRoomId)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('Session room not found');

    const room = data as SessionRoom;
    setSession(room);
    sessionRef.current = room;
    return room;
  }, [currentRoomId]);

  const loadStageState = useCallback(
    async (room: SessionRoom) => {
      if (!currentRoomId || !user?.id) return { myRequest: null as StageRequest | null };

      const stageEnabled =
        Boolean(room.allow_stage_requests) ||
        ['collab_live', 'class_live', 'audio_room'].includes(room.live_mode ?? '');
      let myRequest: StageRequest | null = null;

      if (stageEnabled && room.host_id !== user.id) {
        const { data } = await (supabase as any)
          .from('live_stage_requests')
          .select('id, requester_id, status, request_message, created_at')
          .eq('room_id', currentRoomId)
          .eq('requester_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);

        myRequest = (data?.[0] as StageRequest | undefined) ?? null;
        setStageRequest(myRequest);
      }

      if (room.host_id === user.id && stageEnabled) {
        const pending = await (supabase as any)
          .from('live_stage_requests')
          .select('id, requester_id, status, request_message, created_at')
          .eq('room_id', currentRoomId)
          .eq('status', 'pending')
          .order('created_at', { ascending: true })
          .limit(8);

        const rows = (pending.data ?? []) as StageRequest[];
        setPendingStageRequests(rows);
        setPendingStageCount(rows.length);
      }

      const participants = await (supabase as any)
        .from('session_participants')
        .select('user_id, role, joined_at')
        .eq('room_id', currentRoomId)
        .eq('role', 'collaborator')
        .is('left_at', null);

      if (!participants.error) {
        setStageParticipants((participants.data ?? []) as StageParticipant[]);
      }

      return { myRequest };
    },
    [currentRoomId, user?.id],
  );

  const loadChat = useCallback(async () => {
    if (!currentRoomId) return;

    const { data, error } = await (supabase as any)
      .from('session_messages')
      .select('id, content, user_id, created_at')
      .eq('session_id', currentRoomId)
      .order('created_at', { ascending: true })
      .limit(80);

    if (!error && data) {
      setMessages(data as ChatMessage[]);
    }

    const channel = supabase
      .channel(`session-chat-${currentRoomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'session_messages',
          filter: `session_id=eq.${currentRoomId}`,
        },
        (payload) => appendMessage(payload.new as ChatMessage),
      )
      .subscribe();

    chatChannelRef.current = channel;
  }, [appendMessage, currentRoomId]);

  const loadGifts = useCallback(async () => {
    if (!currentRoomId) return;

    const catalogResult = await (supabase as any)
      .from('live_gift_catalog')
      .select('id, slug, label, description, credit_cost')
      .eq('is_active', true)
      .order('credit_cost', { ascending: true });

    if (!catalogResult.error) {
      setGiftCatalog((catalogResult.data ?? []) as LiveGiftCatalogItem[]);
    }

    let eventsResult = await (supabase as any)
      .from('live_gift_events')
      .select(`
        id,
        room_id,
        sender_id,
        quantity,
        total_credits,
        message,
        created_at,
        live_gift_catalog(id, slug, label, credit_cost, description)
      `)
      .eq('room_id', currentRoomId)
      .order('created_at', { ascending: false })
      .limit(30);

    if (eventsResult.error && /relationship|embed|live_gift_catalog/i.test(eventsResult.error.message ?? '')) {
      eventsResult = await (supabase as any)
        .from('live_gift_events')
        .select('id, room_id, sender_id, quantity, total_credits, message, created_at')
        .eq('room_id', currentRoomId)
        .order('created_at', { ascending: false })
        .limit(30);
    }

    if (!eventsResult.error) {
      setGiftEvents((eventsResult.data ?? []).map((row: any) => normalizeGiftEvent(row)));
    }

    const channel = supabase
      .channel(`live-gift-events-${currentRoomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_gift_events',
          filter: `room_id=eq.${currentRoomId}`,
        },
        (payload) => appendGiftEvent(normalizeGiftEvent(payload.new)),
      )
      .subscribe();

    giftChannelRef.current = channel;
  }, [appendGiftEvent, currentRoomId]);

  const setupReactions = useCallback(() => {
    if (!currentRoomId) return;

    const channel = supabase.channel(`live-reactions:${currentRoomId}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on('broadcast', { event: 'reaction' }, ({ payload }) => {
        const kind =
          payload?.kind === 'fire' || payload?.kind === 'boost' || payload?.kind === 'heart'
            ? payload.kind
            : 'heart';
        pushReaction({
          id: typeof payload?.id === 'string' ? payload.id : `${Date.now()}-${Math.random()}`,
          kind,
          lane: typeof payload?.lane === 'number' ? payload.lane : Math.floor(Math.random() * 4),
        });
      })
      .subscribe();

    reactionChannelRef.current = channel;
  }, [currentRoomId, pushReaction]);

  const ensurePermissions = async (nextRole: StreamRole, nextMode?: string | null) => {
    if (Platform.OS !== 'android' || nextRole === 'audience') return;

    const permissions = [PermissionsAndroid.PERMISSIONS.RECORD_AUDIO];
    if (nextMode !== 'audio_room') {
      permissions.push(PermissionsAndroid.PERMISSIONS.CAMERA);
    }

    await PermissionsAndroid.requestMultiple(permissions);
  };

  const initAgora = useCallback(
    (token: { appId: string; channelName: string; token: string; uid: number }, nextRole: StreamRole, liveMode?: string | null) => {
      const engine = createAgoraRtcEngine();
      engineRef.current = engine;

      engine.registerEventHandler({
        onJoinChannelSuccess: () => setStatus('joined'),
        onUserJoined: (_connection, uid) => {
          setRemoteUsers((current) => [...new Set([...current, uid])]);
        },
        onUserOffline: (_connection, uid) => {
          setRemoteUsers((current) => current.filter((item) => item !== uid));
        },
        onError: (err, msg) => {
          console.warn('agora error', err, msg);
          setStatus('error');
        },
      });

      engine.initialize({
        appId: token.appId,
        channelProfile: ChannelProfileType.ChannelProfileLiveBroadcasting,
      });

      if (liveMode === 'audio_room') {
        (engine as any).disableVideo?.();
      } else {
        engine.enableVideo();
        if (nextRole !== 'audience') {
          engine.startPreview();
        }
      }

      engine.joinChannel(token.token, token.channelName, token.uid, {
        clientRoleType:
          nextRole === 'audience'
            ? ClientRoleType.ClientRoleAudience
            : ClientRoleType.ClientRoleBroadcaster,
        channelProfile: ChannelProfileType.ChannelProfileLiveBroadcasting,
      });
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;

    const start = async () => {
      try {
        if (!currentRoomId) {
          setStatus('error');
          Alert.alert('Room unavailable', 'Choose a live room before joining.', [
            { text: 'Back to Live', onPress: () => router.replace('/live') },
          ]);
          return;
        }

        if (!user) {
          setStatus('error');
          Alert.alert('Sign in required', 'Please log in to join live sessions.', [
            { text: 'Go to Login', onPress: () => router.push('/auth/login') },
            { text: 'Cancel', style: 'cancel' },
          ]);
          return;
        }

        setStatus('loading');
        const room = await loadRoom();
        if (!room || cancelled) return;

        await Promise.all([loadChat(), loadGifts()]);
        setupReactions();
        const stageState = await loadStageState(room);

        if (cancelled) return;

        if (room.status === 'ended') {
          setStatus('ended');
          return;
        }

        const nextRole: StreamRole =
          isHostRoute || room.host_id === user.id
            ? 'host'
            : stageState.myRequest?.status === 'approved'
              ? 'collaborator'
              : 'audience';
        const shouldConnect = nextRole !== 'audience' || room.status === 'live';

        if (!shouldConnect) {
          setStreamRole(nextRole);
          setStatus('waiting');
          return;
        }

        setStreamRole(nextRole);
        setStatus('connecting');
        await ensurePermissions(nextRole, room.live_mode);
        const token = await fetchLiveToken({ roomId: currentRoomId, role: nextRole });
        if (cancelled) return;

        setTokenInfo(token);
        setStreamRole(token.role);
        initAgora(token, token.role, room.live_mode);
      } catch (error: any) {
        console.warn('Live session init failed', error);
        setStatus('error');
      }
    };

    start();

    return () => {
      cancelled = true;
      engineRef.current?.leaveChannel();
      engineRef.current?.release();
      engineRef.current = null;

      if (chatChannelRef.current) {
        supabase.removeChannel(chatChannelRef.current);
        chatChannelRef.current = null;
      }
      if (reactionChannelRef.current) {
        supabase.removeChannel(reactionChannelRef.current);
        reactionChannelRef.current = null;
      }
      if (giftChannelRef.current) {
        supabase.removeChannel(giftChannelRef.current);
        giftChannelRef.current = null;
      }
    };
  }, [
    currentRoomId,
    initAgora,
    isHostRoute,
    loadChat,
    loadGifts,
    loadRoom,
    loadStageState,
    router,
    setupReactions,
    user,
  ]);

  useEffect(() => {
    const unknownIds = Array.from(new Set(messages.map((message) => message.user_id))).filter(
      (id) => id && !profilesById[id],
    );
    if (unknownIds.length === 0) return;

    let mounted = true;
    const loadProfiles = async () => {
      const { data, error } = await (supabase as any)
        .from('profiles')
        .select('user_id, full_name, username, avatar_url')
        .in('user_id', unknownIds);

      if (error || !mounted || !data) return;

      setProfilesById((current) => {
        const next = { ...current };
        for (const profile of data as Profile[]) {
          if (profile.user_id) next[profile.user_id] = profile;
        }
        return next;
      });
    };

    loadProfiles();
    return () => {
      mounted = false;
    };
  }, [messages, profilesById]);

  const sendMessage = async () => {
    const text = messageInput.trim();
    if (!text || !user || !currentRoomId || session?.status === 'ended') return;

    setMessageInput('');
    const { data, error } = await (supabase as any)
      .from('session_messages')
      .insert({
        content: text,
        session_id: currentRoomId,
        user_id: user.id,
      })
      .select('id, content, user_id, created_at')
      .single();

    if (error) {
      Alert.alert('Message failed', error.message ?? 'Please try again.');
      setMessageInput(text);
      return;
    }

    if (data) appendMessage(data as ChatMessage);
  };

  const sendReaction = async (kind: LiveReaction['kind']) => {
    impactHaptic();
    const reaction: LiveReaction = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      kind,
      lane: Math.floor(Math.random() * 4),
    };

    pushReaction(reaction);
    await reactionChannelRef.current?.send({
      type: 'broadcast',
      event: 'reaction',
      payload: reaction,
    });
  };

  const sendGift = async () => {
    impactHaptic();
    if (!currentRoomId || sendingGift) return;
    if (session?.status !== 'live') {
      Alert.alert('Gift unavailable', 'Gifts can be sent once the room is live.');
      return;
    }

    const gift = giftCatalog[0];
    if (!gift) {
      Alert.alert('Gift unavailable', 'No live gifts are configured yet.');
      return;
    }

    setSendingGift(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-live-gift', {
        body: {
          room_id: currentRoomId,
          gift_id: gift.id,
          quantity: 1,
          message: null,
          animation_variant: null,
        },
      });

      if (error) throw error;

      if ((data as any)?.event) {
        appendGiftEvent(normalizeGiftEvent((data as any).event, gift));
      }
      await wallet.refreshBalance();
    } catch (error: any) {
      Alert.alert('Gift not sent', error?.message ?? 'Please check your credits and try again.');
    } finally {
      setSendingGift(false);
    }
  };

  const requestStageAccess = async () => {
    if (!currentRoomId || requestingStage) return;

    setRequestingStage(true);
    try {
      const { data, error } = await (supabase as any).rpc('request_live_stage_join', {
        p_room_id: currentRoomId,
        p_message: stageRequestNote.trim() || null,
      });

      if (error) throw error;
      setStageRequest(data as StageRequest);
      setStageRequestNote('');
      Alert.alert('Request sent', 'The host can approve your request to join the stage.');
    } catch (error: any) {
      Alert.alert('Request failed', error?.message ?? 'Please try again.');
    } finally {
      setRequestingStage(false);
    }
  };

  const reviewStageRequest = async (requestId: string, approve: boolean) => {
    try {
      const { error } = await (supabase as any).rpc('review_live_stage_request', {
        p_request_id: requestId,
        p_approve: approve,
        p_note: approve ? 'approved_from_mobile' : 'declined_from_mobile',
      });

      if (error) throw error;
      setPendingStageRequests((current) => current.filter((request) => request.id !== requestId));
      setPendingStageCount((current) => Math.max(0, current - 1));
      if (sessionRef.current) {
        await loadStageState(sessionRef.current);
      }
    } catch (error: any) {
      Alert.alert('Request update failed', error?.message ?? 'Please try again.');
    }
  };

  const withdrawStageRequest = async () => {
    if (!stageRequest?.id || withdrawingStage) return;
    setWithdrawingStage(true);
    try {
      const { error } = await (supabase as any).rpc('withdraw_live_stage_request', {
        p_request_id: stageRequest.id,
      });
      if (error) throw error;
      setStageRequest(null);
      Alert.alert('Stage request withdrawn', 'You can submit a new request when you are ready.');
    } catch (error: any) {
      Alert.alert('Withdraw failed', error?.message ?? 'Please try again.');
    } finally {
      setWithdrawingStage(false);
    }
  };

  const removeStageParticipant = async (participantUserId: string) => {
    if (!currentRoomId || removingStageUserId) return;
    setRemovingStageUserId(participantUserId);
    try {
      const { error } = await (supabase as any).rpc('remove_live_stage_participant', {
        p_room_id: currentRoomId,
        p_user_id: participantUserId,
        p_note: 'removed_from_mobile',
      });
      if (error) throw error;
      setStageParticipants((current) => current.filter((participant) => participant.user_id !== participantUserId));
    } catch (error: any) {
      Alert.alert('Remove failed', error?.message ?? 'Please try again.');
    } finally {
      setRemovingStageUserId(null);
    }
  };

  const saveRuntimePreferences = async (patch: { recordingEnabled?: boolean; captionsEnabled?: boolean; restreamEnabled?: boolean }) => {
    if (!currentRoomId || !session || runtimeSaving) return;
    setRuntimeSaving(true);
    try {
      const recordingEnabled = patch.recordingEnabled ?? Boolean(session.recording_enabled);
      const captionsEnabled = patch.captionsEnabled ?? Boolean(session.captions_enabled);
      const restreamEnabled = patch.restreamEnabled ?? Boolean(session.restream_enabled);
      const { error } = await (supabase as any).rpc('update_live_runtime_preferences', {
        p_room_id: currentRoomId,
        p_recording_enabled: recordingEnabled,
        p_captions_enabled: captionsEnabled,
        p_restream_enabled: restreamEnabled,
        p_restream_targets: session.restream_targets ?? [],
      });
      if (error) throw error;
      setSession((current) =>
        current
          ? {
              ...current,
              recording_enabled: recordingEnabled,
              captions_enabled: captionsEnabled,
              restream_enabled: restreamEnabled,
            }
          : current,
      );
      sessionRef.current = sessionRef.current
        ? {
            ...sessionRef.current,
            recording_enabled: recordingEnabled,
            captions_enabled: captionsEnabled,
            restream_enabled: restreamEnabled,
          }
        : sessionRef.current;
    } catch (error: any) {
      Alert.alert('Runtime preferences failed', error?.message ?? 'Please try again.');
    } finally {
      setRuntimeSaving(false);
    }
  };

  const runRuntimeAction = async (action: 'start_recording' | 'stop_recording' | 'start_restream' | 'stop_restream') => {
    if (!currentRoomId || runtimeActionLoading) return;
    setRuntimeActionLoading(action);
    try {
      const { data, error } = await supabase.functions.invoke('live-runtime-ops', {
        body: {
          action,
          payload: { room_id: currentRoomId },
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      await loadRoom();
    } catch (error: any) {
      Alert.alert('Runtime action failed', error?.message ?? 'Please try again in a moment.');
    } finally {
      setRuntimeActionLoading(null);
    }
  };

  const toggleMute = () => {
    selectionHaptic();
    const next = !muted;
    setMuted(next);

    const engine = engineRef.current as any;
    if (streamRole === 'audience') {
      engine?.muteAllRemoteAudioStreams?.(next);
    } else {
      engine?.muteLocalAudioStream?.(next);
    }
  };

  const shareRoom = async () => {
    selectionHaptic();
    await Share.share({
      message: `Join ${session?.title ?? 'this live room'} on PLUGGD.`,
    });
  };

  const reportRoom = () => {
    selectionHaptic();
    if (!currentRoomId || !session?.host_id) {
      Alert.alert('Report unavailable', 'This room cannot be reported from mobile right now.');
      return;
    }

    Alert.alert('Report live room?', 'This sends a moderation report for the host profile with the current live room attached for review.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Report',
        style: 'destructive',
        onPress: async () => {
          const result = await reportLiveRoom(currentRoomId, session.host_id);
          Alert.alert(result.success ? 'Report submitted' : 'Report failed', result.success ? 'Thanks. The PLUGGD moderation queue will review it.' : result.error || 'Please try again.');
        },
      },
    ]);
  };

  const endLive = async () => {
    if (!currentRoomId) return;

    try {
      await (supabase as any)
        .from('session_rooms')
        .update({
          status: 'ended',
          ended_at: new Date().toISOString(),
          agora_live_ended_at: new Date().toISOString(),
          agora_last_activity_at: new Date().toISOString(),
        })
        .eq('id', currentRoomId);
      router.replace('/live');
    } catch (error: any) {
      Alert.alert('Could not end live', error?.message ?? 'Please try again.');
    }
  };

  const leave = () => {
    selectionHaptic();
    if (streamRole === 'host' && sessionRef.current?.status === 'live') {
      Alert.alert('Leave live room?', 'You can end the live now or leave it running.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Leave running', onPress: () => router.back() },
        { text: 'End live', style: 'destructive', onPress: endLive },
      ]);
      return;
    }

    router.back();
  };

  const messageName = (message: ChatMessage) => {
    if (message.user_id === user?.id) return 'You';
    const profile = profilesById[message.user_id];
    return profile?.username || profile?.full_name || `User ${message.user_id.slice(0, 6)}`;
  };

  const renderMedia = () => {
    if (isAudioRoom) {
      return <AudioRoomStage title={session?.title ?? 'Live Room'} host={host} status={status} />;
    }

    const mainRemoteUid = remoteUsers[0];
    if (status === 'joined' && tokenInfo && (isPublisher || mainRemoteUid)) {
      return (
        <>
          <RtcSurfaceView
            canvas={{ uid: isPublisher ? 0 : mainRemoteUid }}
            style={styles.videoSurface}
          />
          {isPublisher && mainRemoteUid ? (
            <View style={styles.pictureInPicture}>
              <RtcSurfaceView canvas={{ uid: mainRemoteUid }} style={styles.videoSurface} />
            </View>
          ) : null}
        </>
      );
    }

    return (
      <View style={styles.mediaPlaceholder}>
        {status === 'loading' || status === 'connecting' ? (
          <ActivityIndicator color={PLUGGD_ORANGE} />
        ) : (
          <MaterialIcons
            name={status === 'ended' ? 'stop-circle' : 'settings-input-antenna'}
            size={44}
            color="#FFFFFF66"
          />
        )}
        <Text style={styles.placeholderTitle}>
          {status === 'waiting'
            ? 'Waiting for host'
            : status === 'ended'
              ? 'This live has ended'
              : status === 'error'
                ? 'Could not join live'
                : status === 'joined'
                  ? 'Waiting for video'
                  : 'Connecting live'}
        </Text>
        <Text style={styles.placeholderBody} numberOfLines={2}>
          {session?.description || session?.title || 'The room will appear here once media is available.'}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="light" translucent backgroundColor="transparent" />
      <Stack.Screen options={{ headerShown: false }} />

      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.stage}>
          <View style={styles.mediaLayer}>{renderMedia()}</View>
          <View style={styles.topGradient} />
          <View style={styles.bottomGradient} />

          <View style={styles.topOverlay}>
            <View style={styles.hostBlock}>
              <View style={styles.hostAvatar}>
                <Text style={styles.hostAvatarText}>{initials(host)}</Text>
              </View>

              <View style={styles.hostTextWrap}>
                <View style={styles.hostNameRow}>
                  <Text style={styles.hostName} numberOfLines={1}>
                    {host}
                  </Text>
                  <MaterialIcons name="verified" size={17} color={PLUGGD_ORANGE} />
                </View>

                <View style={styles.liveMetaRow}>
                  <View style={[styles.statusBadge, session?.status !== 'live' && styles.statusBadgeIdle]}>
                    <Text style={styles.statusBadgeText}>
                      {session?.status === 'live' ? 'LIVE' : status === 'ended' ? 'ENDED' : 'READY'}
                    </Text>
                  </View>
                  <View style={styles.viewerBadge}>
                    <MaterialIcons name="visibility" size={14} color="#D8D8D8" />
                    <Text style={styles.viewerText}>{formatCount(viewerCount)}</Text>
                  </View>
                  <View style={styles.modeBadge}>
                    <Text style={styles.modeBadgeText}>{modeLabel(session?.live_mode)}</Text>
                  </View>
                </View>
              </View>
            </View>

            <Pressable onPress={leave} accessibilityRole="button" accessibilityLabel="Leave live room">
              <PluggdGlassSurface interactive glassEffectStyle="clear" style={styles.closeButton}>
                <MaterialIcons name="keyboard-arrow-down" size={30} color="#FFFFFF" />
              </PluggdGlassSurface>
            </Pressable>
          </View>

          <View style={styles.rightRail}>
            <RailButton icon="favorite" label="React" onPress={() => sendReaction('heart')} />
            <RailButton icon="local-fire-department" label="Boost" onPress={() => sendReaction('fire')} />
            <RailButton icon="card-giftcard" label="Gift" loading={sendingGift} onPress={sendGift} />
            <RailButton icon="ios-share" label="Share" onPress={shareRoom} />
            <RailButton icon="flag" label="Report" onPress={reportRoom} />
            <RailButton icon={muted ? 'mic-off' : 'mic'} label={muted ? 'Muted' : 'Mute'} onPress={toggleMute} />
          </View>

          <View style={styles.reactionLayer} pointerEvents="none">
            {reactions.map((reaction) => (
              <View
                key={reaction.id}
                style={[
                  styles.reactionBubble,
                  {
                    right: 18 + reaction.lane * 12,
                    bottom: 210 + reaction.lane * 54,
                  },
                ]}
              >
                <MaterialIcons
                  name={reaction.kind === 'fire' ? 'local-fire-department' : 'favorite'}
                  size={22}
                  color={PLUGGD_ORANGE}
                />
              </View>
            ))}
          </View>

          <View style={styles.bottomOverlay}>
            <View style={styles.sessionSummary}>
              <Text style={styles.sessionTitle} numberOfLines={1}>
                {session?.title ?? 'Live Room'}
              </Text>
              <Text style={styles.sessionSubtitle} numberOfLines={2}>
                {session?.description || `${roleLabel(session?.profiles)} room with real-time chat, gifts, and stage requests.`}
              </Text>

              <View style={styles.signalRow}>
                <SignalPill icon="graphic-eq" label={`${energyScore}% pulse`} />
                <SignalPill icon="groups" label={`${stageParticipants.length + (streamRole === 'host' ? 1 : 0)} on stage`} />
                {latestGift ? (
                  <SignalPill
                    icon="card-giftcard"
                    label={`${latestGift.gift?.label ?? 'Gift'} ${latestGift.total_credits} cr`}
                  />
                ) : null}
              </View>
            </View>

            <View style={styles.primaryActions}>
              {streamRole === 'host' ? (
                <Pressable style={styles.primaryActionButton} onPress={endLive}>
                  <MaterialIcons name="stop-circle" size={18} color="#FFFFFF" />
                  <Text style={styles.primaryActionText}>End live</Text>
                </Pressable>
              ) : (
                <Pressable style={styles.primaryActionButton} onPress={() => sendReaction('heart')}>
                  <MaterialIcons name="favorite" size={18} color="#FFFFFF" />
                  <Text style={styles.primaryActionText}>Support</Text>
                </Pressable>
              )}

              <Pressable style={styles.secondaryActionButton} onPress={sendGift}>
                <MaterialIcons name="card-giftcard" size={18} color={PLUGGD_ORANGE} />
                <Text style={styles.secondaryActionText}>
                  {giftCatalog[0] ? `Gift ${giftCatalog[0].credit_cost} cr` : 'Send gift'}
                </Text>
              </Pressable>
            </View>

            {!isHostRoute && stageSupported && session?.status === 'live' ? (
              <View style={styles.stageRequestBox}>
                <Text style={styles.stageRequestTitle}>
                  {stageRequest?.status === 'pending'
                    ? 'Stage request pending'
                    : stageRequest?.status === 'approved'
                      ? 'Stage access approved'
                      : 'Request stage access'}
                </Text>
                {stageRequest?.status ? (
                  <>
                    <Text style={styles.stageRequestBody}>
                      {stageRequest.status === 'approved'
                        ? 'Leave and rejoin to publish audio/video as a collaborator.'
                        : 'The host will review your request.'}
                    </Text>
                    {stageRequest.status === 'pending' ? (
                      <Pressable style={styles.stageRequestButton} onPress={withdrawStageRequest} disabled={withdrawingStage}>
                        {withdrawingStage ? (
                          <ActivityIndicator color="#FFFFFF" />
                        ) : (
                          <Text style={styles.stageRequestButtonText}>Withdraw</Text>
                        )}
                      </Pressable>
                    ) : null}
                  </>
                ) : (
                  <>
                    <TextInput
                      value={stageRequestNote}
                      onChangeText={(value) => setStageRequestNote(value.slice(0, 180))}
                      placeholder="Optional note to host"
                      placeholderTextColor="#8A8A8A"
                      style={styles.stageRequestInput}
                    />
                    <Pressable style={styles.stageRequestButton} onPress={requestStageAccess} disabled={requestingStage}>
                      {requestingStage ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <Text style={styles.stageRequestButtonText}>Request</Text>
                      )}
                    </Pressable>
                  </>
                )}
              </View>
            ) : null}

            {streamRole === 'host' && stageSupported ? (
              <View style={styles.hostOpsRow}>
                <SignalPill icon="person-add-alt-1" label={`${pendingStageCount} requests`} />
                <SignalPill icon="radio" label={session?.recording_status ?? 'recording idle'} />
                <SignalPill icon="closed-caption" label={session?.captions_enabled ? 'captions on' : 'captions off'} />
              </View>
            ) : null}

            {streamRole === 'host' ? (
              <View style={styles.runtimePanel}>
                <View style={styles.runtimeHeader}>
                  <Text style={styles.stageRequestTitle}>Host controls</Text>
                  {runtimeSaving || runtimeActionLoading ? <ActivityIndicator color={PLUGGD_ORANGE} size="small" /> : null}
                </View>
                <View style={styles.runtimeGrid}>
                  <RuntimeButton
                    icon={session?.recording_enabled ? 'fiber-manual-record' : 'radio-button-unchecked'}
                    label={session?.recording_enabled ? 'Recording On' : 'Enable Rec'}
                    active={Boolean(session?.recording_enabled)}
                    disabled={runtimeSaving}
                    onPress={() => saveRuntimePreferences({ recordingEnabled: !session?.recording_enabled })}
                  />
                  <RuntimeButton
                    icon={session?.captions_enabled ? 'closed-caption' : 'closed-caption-disabled'}
                    label={session?.captions_enabled ? 'Captions On' : 'Captions Off'}
                    active={Boolean(session?.captions_enabled)}
                    disabled={runtimeSaving}
                    onPress={() => saveRuntimePreferences({ captionsEnabled: !session?.captions_enabled })}
                  />
                  <RuntimeButton
                    icon="radio"
                    label={session?.recording_status === 'recording' ? 'Stop Rec' : 'Start Rec'}
                    active={session?.recording_status === 'recording'}
                    disabled={Boolean(runtimeActionLoading)}
                    onPress={() => runRuntimeAction(session?.recording_status === 'recording' ? 'stop_recording' : 'start_recording')}
                  />
                  <RuntimeButton
                    icon="cell-tower"
                    label={session?.restream_status === 'live' ? 'Stop Restream' : 'Restream'}
                    active={session?.restream_status === 'live'}
                    disabled={Boolean(runtimeActionLoading)}
                    onPress={() => runRuntimeAction(session?.restream_status === 'live' ? 'stop_restream' : 'start_restream')}
                  />
                </View>
              </View>
            ) : null}

            {streamRole === 'host' && stageSupported && pendingStageRequests.length > 0 ? (
              <View style={styles.stageRequestBox}>
                <Text style={styles.stageRequestTitle}>Stage requests</Text>
                {pendingStageRequests.slice(0, 3).map((request) => (
                  <View key={request.id} style={styles.hostRequestRow}>
                    <View style={styles.hostRequestText}>
                      <Text style={styles.hostRequestName}>
                        User {request.requester_id.slice(0, 6)}
                      </Text>
                      <Text style={styles.hostRequestNote} numberOfLines={1}>
                        {request.request_message || 'Wants to join the stage'}
                      </Text>
                    </View>
                    <Pressable
                      style={styles.approveButton}
                      onPress={() => reviewStageRequest(request.id, true)}
                    >
                      <MaterialIcons name="check" size={16} color="#080808" />
                    </Pressable>
                    <Pressable
                      style={styles.declineButton}
                      onPress={() => reviewStageRequest(request.id, false)}
                    >
                      <MaterialIcons name="close" size={16} color="#FFFFFF" />
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : null}

            {streamRole === 'host' && stageSupported && stageParticipants.length > 0 ? (
              <View style={styles.stageRequestBox}>
                <Text style={styles.stageRequestTitle}>On stage</Text>
                {stageParticipants.slice(0, 4).map((participant) => (
                  <View key={participant.user_id} style={styles.hostRequestRow}>
                    <View style={styles.hostRequestText}>
                      <Text style={styles.hostRequestName}>User {participant.user_id.slice(0, 6)}</Text>
                      <Text style={styles.hostRequestNote} numberOfLines={1}>{participant.role || 'Collaborator'}</Text>
                    </View>
                    <Pressable
                      style={styles.declineButton}
                      disabled={removingStageUserId === participant.user_id}
                      onPress={() => removeStageParticipant(participant.user_id)}
                    >
                      {removingStageUserId === participant.user_id ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <MaterialIcons name="person-remove" size={16} color="#FFFFFF" />
                      )}
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : null}

            <PluggdGlassSurface
              glassEffectStyle="regular"
              blurIntensity={62}
              fallbackColor="rgba(10,10,10,0.9)"
              borderColor="rgba(255,255,255,0.13)"
              style={styles.chatPanel}
            >
              <View style={styles.chatHeader}>
                <Text style={styles.chatTitle}>Live chat</Text>
                <Text style={styles.chatFilter}>Top</Text>
              </View>

              <ScrollView
                style={styles.messageList}
                contentContainerStyle={styles.messageListContent}
                showsVerticalScrollIndicator={false}
              >
                {messages.length === 0 ? (
                  <Text style={styles.emptyChat}>No messages yet. Say hi.</Text>
                ) : (
                  messages.slice(-18).map((message) => (
                    <View key={message.id} style={styles.messageRow}>
                      <View style={styles.messageAvatar}>
                        <Text style={styles.messageAvatarText}>{initials(messageName(message))}</Text>
                      </View>
                      <View style={styles.messageContent}>
                        <Text style={styles.messageMeta} numberOfLines={1}>
                          {messageName(message)} - {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                        <Text style={styles.messageText}>{message.content}</Text>
                      </View>
                    </View>
                  ))
                )}
              </ScrollView>

              <View style={styles.composerRow}>
                <PluggdGlassSurface
                  glassEffectStyle="clear"
                  fallbackColor="#151515"
                  borderColor="#303030"
                  style={styles.inputWrap}
                >
                  <TextInput
                    value={messageInput}
                    onChangeText={setMessageInput}
                    onSubmitEditing={sendMessage}
                    placeholder={session?.status === 'ended' ? 'Session ended' : 'Message...'}
                    placeholderTextColor="#8A8A8A"
                    editable={session?.status !== 'ended'}
                    style={styles.input}
                  />
                  <Pressable style={styles.emojiButton} onPress={() => sendReaction('boost')}>
                    <MaterialIcons name="bolt" size={22} color="#BDBDBD" />
                  </Pressable>
                </PluggdGlassSurface>

                <Pressable style={styles.sendButton} onPress={sendMessage}>
                  <MaterialIcons name="send" size={20} color="#FFFFFF" />
                </Pressable>
              </View>
            </PluggdGlassSurface>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function RailButton({
  icon,
  label,
  loading,
  onPress,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  loading?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} disabled={loading} accessibilityRole="button" accessibilityLabel={label}>
      <PluggdGlassSurface
        interactive
        disabled={loading}
        glassEffectStyle="clear"
        fallbackColor="rgba(0,0,0,0.38)"
        borderColor="rgba(255,255,255,0.14)"
        style={styles.railButton}
      >
      {loading ? (
        <ActivityIndicator color={PLUGGD_ORANGE} size="small" />
      ) : (
        <MaterialIcons name={icon} size={24} color="#FFFFFF" />
      )}
      <Text style={styles.railLabel}>{label}</Text>
      </PluggdGlassSurface>
    </Pressable>
  );
}

function SignalPill({ icon, label }: { icon: keyof typeof MaterialIcons.glyphMap; label: string }) {
  return (
    <PluggdGlassSurface
      glassEffectStyle="clear"
      fallbackColor="rgba(0,0,0,0.42)"
      borderColor="rgba(255,255,255,0.13)"
      style={styles.signalPill}
    >
      <MaterialIcons name={icon} size={14} color={PLUGGD_ORANGE} />
      <Text style={styles.signalText} numberOfLines={1}>
        {label}
      </Text>
    </PluggdGlassSurface>
  );
}

function RuntimeButton({
  icon,
  label,
  active,
  disabled,
  onPress,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: Boolean(active), disabled: Boolean(disabled) }}
      disabled={disabled}
      style={[styles.runtimeButton, active && styles.runtimeButtonActive, disabled && styles.runtimeButtonDisabled]}
      onPress={() => {
        impactHaptic();
        onPress();
      }}
    >
      <MaterialIcons name={icon} size={17} color={active ? '#080808' : '#FFFFFF'} />
      <Text style={[styles.runtimeButtonText, active && styles.runtimeButtonTextActive]} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

function AudioRoomStage({ title, host, status }: { title: string; host: string; status: JoinStatus }) {
  return (
    <View style={styles.audioStage}>
      <View style={styles.audioHalo}>
        <MaterialIcons name="podcasts" size={54} color="#FFFFFF" />
      </View>
      <Text style={styles.audioTitle} numberOfLines={1}>
        {title}
      </Text>
      <Text style={styles.audioSubtitle} numberOfLines={1}>
        Hosted by {host}
      </Text>
      <View style={styles.waveform}>
        {Array.from({ length: 28 }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.waveBar,
              {
                height: 10 + ((index * 9) % 38),
                opacity: status === 'joined' ? 1 : 0.38,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#050505',
  },
  stage: {
    flex: 1,
    backgroundColor: '#080808',
    overflow: 'hidden',
  },
  mediaLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#100A07',
  },
  videoSurface: {
    flex: 1,
  },
  pictureInPicture: {
    position: 'absolute',
    right: 16,
    top: 116,
    width: 104,
    height: 148,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    backgroundColor: '#111111',
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 190,
    backgroundColor: 'rgba(0,0,0,0.48)',
  },
  bottomGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '58%',
    backgroundColor: 'rgba(0,0,0,0.68)',
  },
  topOverlay: {
    position: 'absolute',
    top: 10,
    left: 14,
    right: 14,
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  hostBlock: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  hostAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#27120A',
    borderWidth: 1.5,
    borderColor: PLUGGD_ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  hostAvatarText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  hostTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  hostNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  hostName: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '700',
    maxWidth: 170,
  },
  liveMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 6,
  },
  statusBadge: {
    minHeight: 25,
    borderRadius: 7,
    backgroundColor: PLUGGD_ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 9,
  },
  statusBadgeIdle: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  statusBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  viewerBadge: {
    minHeight: 25,
    borderRadius: 7,
    backgroundColor: 'rgba(0,0,0,0.48)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 4,
  },
  viewerText: {
    color: '#D8D8D8',
    fontSize: 12,
    fontWeight: '700',
  },
  modeBadge: {
    minHeight: 25,
    borderRadius: 7,
    backgroundColor: 'rgba(255,82,0,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,82,0,0.32)',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  modeBadgeText: {
    color: PLUGGD_ORANGE,
    fontSize: 11,
    fontWeight: '700',
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  mediaPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 42,
  },
  placeholderTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    marginTop: 14,
    textAlign: 'center',
  },
  placeholderBody: {
    color: '#B8B8B8',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    textAlign: 'center',
  },
  rightRail: {
    position: 'absolute',
    right: 12,
    top: 122,
    alignItems: 'center',
    gap: 12,
  },
  railButton: {
    width: 58,
    minHeight: 58,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
  },
  railLabel: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 3,
  },
  reactionLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  reactionBubble: {
    position: 'absolute',
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(0,0,0,0.46)',
    borderWidth: 1,
    borderColor: 'rgba(255,82,0,0.34)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomOverlay: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
  },
  sessionSummary: {
    paddingRight: 72,
    marginBottom: 10,
  },
  sessionTitle: {
    color: '#FFFFFF',
    fontSize: 25,
    fontWeight: '700',
  },
  sessionSubtitle: {
    color: '#D1D1D1',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 3,
    fontWeight: '700',
  },
  signalRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 10,
  },
  signalPill: {
    height: 30,
    maxWidth: 172,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    gap: 5,
  },
  signalText: {
    color: '#EDEDED',
    fontSize: 12,
    fontWeight: '700',
  },
  primaryActions: {
    height: 52,
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  primaryActionButton: {
    flex: 1,
    borderRadius: 8,
    backgroundColor: PLUGGD_ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryActionButton: {
    flex: 1,
    borderRadius: 8,
    backgroundColor: 'rgba(21,21,21,0.92)',
    borderWidth: 1,
    borderColor: '#303030',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
  },
  secondaryActionText: {
    color: PLUGGD_ORANGE,
    fontSize: 16,
    fontWeight: '700',
  },
  stageRequestBox: {
    borderRadius: 8,
    backgroundColor: 'rgba(10,10,10,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.13)',
    padding: 10,
    marginBottom: 10,
  },
  stageRequestTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  stageRequestBody: {
    color: '#B8B8B8',
    fontSize: 12,
    marginTop: 5,
    fontWeight: '700',
  },
  stageRequestInput: {
    minHeight: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#303030',
    backgroundColor: '#151515',
    color: '#FFFFFF',
    paddingHorizontal: 10,
    marginTop: 8,
    fontSize: 13,
    fontWeight: '700',
  },
  stageRequestButton: {
    height: 38,
    borderRadius: 8,
    backgroundColor: PLUGGD_ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  stageRequestButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  hostOpsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginBottom: 10,
  },
  runtimePanel: {
    borderRadius: 10,
    backgroundColor: 'rgba(10,10,10,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.13)',
    padding: 10,
    marginBottom: 10,
    gap: 9,
  },
  runtimeHeader: {
    minHeight: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  runtimeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  runtimeButton: {
    minHeight: 34,
    minWidth: '47%',
    flex: 1,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  runtimeButtonActive: {
    backgroundColor: PLUGGD_ORANGE,
    borderColor: PLUGGD_ORANGE,
  },
  runtimeButtonDisabled: {
    opacity: 0.55,
  },
  runtimeButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  runtimeButtonTextActive: {
    color: '#080808',
  },
  hostRequestRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 9,
  },
  hostRequestText: {
    flex: 1,
    minWidth: 0,
  },
  hostRequestName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  hostRequestNote: {
    color: '#AFAFAF',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  approveButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: PLUGGD_ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#202020',
    borderWidth: 1,
    borderColor: '#3A3A3A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatPanel: {
    maxHeight: 278,
    minHeight: 208,
    borderRadius: 16,
    padding: 10,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  chatTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  chatFilter: {
    color: '#BDBDBD',
    fontSize: 13,
    fontWeight: '700',
  },
  messageList: {
    maxHeight: 156,
  },
  messageListContent: {
    gap: 8,
    paddingBottom: 4,
  },
  emptyChat: {
    color: '#888888',
    fontSize: 13,
    fontWeight: '700',
    paddingVertical: 12,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1D1D1D',
    borderWidth: 1,
    borderColor: PLUGGD_ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  messageAvatarText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  messageContent: {
    flex: 1,
    minWidth: 0,
  },
  messageMeta: {
    color: '#A8A8A8',
    fontSize: 12,
    fontWeight: '700',
  },
  messageText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '700',
    marginTop: 1,
  },
  composerRow: {
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  inputWrap: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    paddingVertical: 0,
  },
  emojiButton: {
    width: 42,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButton: {
    width: 46,
    height: 46,
    borderRadius: 8,
    backgroundColor: PLUGGD_ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioStage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#100A07',
  },
  audioHalo: {
    width: 146,
    height: 146,
    borderRadius: 73,
    borderWidth: 1,
    borderColor: 'rgba(255,82,0,0.52)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  audioTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
  },
  audioSubtitle: {
    color: '#C9C9C9',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 5,
  },
  waveform: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 24,
  },
  waveBar: {
    width: 5,
    borderRadius: 4,
    backgroundColor: PLUGGD_ORANGE,
  },
});
