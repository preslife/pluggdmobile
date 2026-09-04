import { MaterialIcons } from '@expo/vector-icons';
import * as Crypto from 'expo-crypto';
import { pluggdFonts } from '../design/typography';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  ImageBackground,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Modal,
  PermissionsAndroid,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChannelProfileType,
  ClientRoleType,
  IRtcEngine,
  RtcSurfaceView,
  createAgoraRtcEngine,
} from '../lib/agora';
import { useAuth } from '../context/AuthProvider';
import { impactHaptic, selectionHaptic } from '../design/haptics';
import { blockUser, loadBlockedUserIds } from '../features/safety/accountSafety';
import { showReportActions } from '../features/safety/reportActions';
import { useWallet } from '../hooks/useWallet';
import { fetchLiveToken } from '../lib/live';
import { supabase } from '../lib/supabase';
import { PluggdGlassSurface } from '../../components/PluggdPrimitives';
import { resolveCommercePolicy } from '../commerce/policy';
import { useReducedMotion } from '../design/useReducedMotion';
import { usePluggdTheme } from '../design/usePluggdTheme';
import { LiveGiftArtwork, LiveGiftOverlay } from '../features/live/LiveGiftOverlay';
import { PluggdImage } from '../components/PluggdImage';
import { toggleProfileFollow } from '../features/culture/mobileServices';
import {
  LiveGiftCatalogItem,
  LiveGiftEvent,
  isGiftCatalogRpcUnavailable,
  liveGiftCatalogLookup,
  liveGiftSenderName,
  normalizeLiveGiftCatalogItem,
  normalizeLiveGiftEvent,
} from '../features/live/liveGiftPresentation';
import { useLiveGiftQueue } from '../features/live/useLiveGiftQueue';

const PLUGGD_ORANGE = '#ff6600';
const REACTION_TTL_MS = 2400;
const LIVE_PREVIEW_IMAGE = require('../../assets/web-parity/live/pluggd-live-hero.jpg');

type StreamRole = 'host' | 'collaborator' | 'audience';
type JoinStatus = 'loading' | 'waiting' | 'connecting' | 'joined' | 'error' | 'ended';

type Profile = {
  user_id?: string | null;
  full_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  cover_image_url?: string | null;
  slug?: string | null;
  profile_type?: string | null;
  user_type?: string | null;
  is_creator?: boolean | null;
  is_verified?: boolean | null;
  verification_status?: string | null;
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

type AndroidLivePermissionResult = {
  granted: boolean;
  permanentlyDenied: boolean;
};

async function requestAndroidLivePermissions(
  nextRole: StreamRole,
  nextMode?: string | null,
): Promise<AndroidLivePermissionResult> {
  if (Platform.OS !== 'android' || nextRole === 'audience') {
    return { granted: true, permanentlyDenied: false };
  }

  const permissions: Array<(typeof PermissionsAndroid.PERMISSIONS)[keyof typeof PermissionsAndroid.PERMISSIONS]> = [
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
  ];
  if (nextMode !== 'audio_room') {
    permissions.push(PermissionsAndroid.PERMISSIONS.CAMERA);
  }

  const results = await PermissionsAndroid.requestMultiple(permissions);
  const deniedPermissions = permissions.filter(
    (permission) => results[permission] !== PermissionsAndroid.RESULTS.GRANTED,
  );

  return {
    granted: deniedPermissions.length === 0,
    permanentlyDenied: deniedPermissions.some(
      (permission) => results[permission] === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN,
    ),
  };
}

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

function formatCount(value: number) {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return String(value);
}

export default function LiveSessionScreen() {
  const router = useRouter();
  const theme = usePluggdTheme();
  const styles = useLiveSessionStyles();
  const insets = useSafeAreaInsets();
  const { roomId, preview, previewSheet, previewReaction, initialCamera, initialMic, initialFacing, audioRoute } = useLocalSearchParams<{
    roomId?: string;
    preview?: string;
    previewSheet?: string;
    previewReaction?: string;
    initialCamera?: string;
    initialMic?: string;
    initialFacing?: string;
    audioRoute?: string;
  }>();
  const { user } = useAuth();
  const wallet = useWallet();
  const reducedMotion = useReducedMotion();

  const previewRole = __DEV__ && preview === 'creator'
    ? 'creator'
    : __DEV__ && typeof preview === 'string' && preview.startsWith('audience')
      ? 'audience'
      : null;
  const currentRoomId = useMemo(
    () => (previewRole ? 'live-visual-preview' : typeof roomId === 'string' && roomId.length > 0 ? roomId : null),
    [previewRole, roomId],
  );
  const [session, setSession] = useState<SessionRoom | null>(null);
  const [status, setStatus] = useState<JoinStatus>('loading');
  const [streamRole, setStreamRole] = useState<StreamRole>('audience');
  const [remoteUsers, setRemoteUsers] = useState<number[]>([]);
  const [tokenInfo, setTokenInfo] = useState<{ channelName: string; token: string; uid: number; appId: string } | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [commentComposerOpen, setCommentComposerOpen] = useState(false);
  const [controlSheet, setControlSheet] = useState<'stage' | 'host' | null>(null);
  const [profilesById, setProfilesById] = useState<Record<string, Profile>>({});
  const [reactions, setReactions] = useState<LiveReaction[]>([]);
  const [giftCatalog, setGiftCatalog] = useState<LiveGiftCatalogItem[]>([]);
  const [giftEvents, setGiftEvents] = useState<LiveGiftEvent[]>([]);
  const [sendingGift, setSendingGift] = useState(false);
  const [giftTrayOpen, setGiftTrayOpen] = useState(false);
  const [creatorSheetOpen, setCreatorSheetOpen] = useState(false);
  const [followingHost, setFollowingHost] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [hostFollowerCount, setHostFollowerCount] = useState<number | null>(null);
  const [selectedGiftId, setSelectedGiftId] = useState<string | null>(null);
  const [giftQuantity, setGiftQuantity] = useState(1);
  const [muted, setMuted] = useState(initialMic === 'off');
  const [videoMuted, setVideoMuted] = useState(initialCamera === 'off');
  const [frontCamera, setFrontCamera] = useState(initialFacing !== 'back');
  const [speakerOn, setSpeakerOn] = useState(audioRoute !== 'receiver');
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
  const [permissionAttempt, setPermissionAttempt] = useState(0);
  const {
    active: activeGift,
    pendingCount: pendingGiftCount,
    enqueue: enqueueGift,
    seedSeen: seedSeenGifts,
    complete: completeGift,
  } = useLiveGiftQueue({
    resetKey: `${currentRoomId ?? 'no-room'}:${status === 'ended' ? 'ended' : 'active'}`,
    reducedMotion,
  });

  const engineRef = useRef<IRtcEngine | null>(null);
  const commentInputRef = useRef<TextInput>(null);
  const chatChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const roomChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const reactionChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const giftChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const sessionRef = useRef<SessionRoom | null>(null);
  const blockedUserIdsRef = useRef<Set<string>>(new Set());
  const giftCatalogByIdRef = useRef<Map<string, LiveGiftCatalogItem>>(new Map());
  const giftLoadGenerationRef = useRef(0);
  const initialMediaRef = useRef({
    microphoneEnabled: initialMic !== 'off',
    cameraEnabled: initialCamera !== 'off',
    frontCamera: initialFacing !== 'back',
    speakerOn: audioRoute !== 'receiver',
  });

  const host = profileName(session?.profiles);
  const hostIsVerified = session?.profiles?.is_verified === true;
  const isAudioRoom = session?.live_mode === 'audio_room';
  const isPublisher = streamRole === 'host' || streamRole === 'collaborator';
  const isHost = streamRole === 'host' || Boolean(session?.host_id && session.host_id === user?.id);
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
    if (blockedUserIdsRef.current.has(message.user_id)) return;
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

  const hydrateGiftEvent = useCallback(async (
    row: unknown,
    fallbackGift?: LiveGiftCatalogItem | null,
  ): Promise<LiveGiftEvent | null> => {
    let event = normalizeLiveGiftEvent(row, giftCatalogByIdRef.current, fallbackGift);
    if (!event || event.gift || !event.gift_id) return event;

    const { data, error } = await (supabase as any)
      .from('live_gift_catalog')
      .select('id, slug, label, description, credit_cost, thumbnail_url, animation_url')
      .eq('id', event.gift_id)
      .maybeSingle();
    if (error || !data) return event;

    const gift = normalizeLiveGiftCatalogItem(data);
    if (!gift) return event;
    giftCatalogByIdRef.current.set(gift.id, gift);
    event = { ...event, gift };
    return event;
  }, []);

  const receiveGiftEvent = useCallback(async (
    row: unknown,
    fallbackGift?: LiveGiftCatalogItem | null,
  ) => {
    if (!currentRoomId || sessionRef.current?.status === 'ended') return;
    const event = await hydrateGiftEvent(row, fallbackGift);
    if (!event || event.room_id !== currentRoomId || sessionRef.current?.status === 'ended') return;
    appendGiftEvent(event);
    enqueueGift(event);
  }, [appendGiftEvent, currentRoomId, enqueueGift, hydrateGiftEvent]);

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
        profiles!session_rooms_host_id_fkey(user_id, full_name, username, avatar_url, bio, cover_image_url, slug, profile_type, user_type, is_creator, is_verified, verification_status)
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
    const blockedUserIds = await loadBlockedUserIds().catch(() => new Set<string>());
    blockedUserIdsRef.current = blockedUserIds;

    const { data, error } = await (supabase as any)
      .from('session_messages')
      .select('id, content, user_id, created_at')
      .eq('session_id', currentRoomId)
      .order('created_at', { ascending: true })
      .limit(80);

    if (!error && data) {
      setMessages((data as ChatMessage[]).filter((message) => !blockedUserIds.has(message.user_id)));
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
    const loadGeneration = ++giftLoadGenerationRef.current;

    const scopedCatalogResult = await (supabase as any).rpc('get_live_room_gift_catalog', {
      p_room_id: currentRoomId,
    });
    if (loadGeneration !== giftLoadGenerationRef.current) return;
    let catalogRows: unknown[] = [];
    if (!scopedCatalogResult.error && Array.isArray(scopedCatalogResult.data)) {
      // A valid empty result is authoritative. The backend function already applies
      // its documented global-default semantics when no creator selection exists.
      catalogRows = scopedCatalogResult.data;
    } else if (isGiftCatalogRpcUnavailable(scopedCatalogResult.error)) {
      const globalCatalogResult = await (supabase as any)
        .from('live_gift_catalog')
        .select('id, slug, label, description, credit_cost, thumbnail_url, animation_url')
        .eq('is_active', true)
        .order('credit_cost', { ascending: true });
      if (loadGeneration !== giftLoadGenerationRef.current) return;
      if (!globalCatalogResult.error && Array.isArray(globalCatalogResult.data)) {
        catalogRows = globalCatalogResult.data;
      } else if (globalCatalogResult.error) {
        console.warn('Live gift catalogue fallback failed', globalCatalogResult.error);
      }
    } else {
      console.warn('Room gift catalogue unavailable', scopedCatalogResult.error ?? 'Invalid response');
    }

    const catalog = catalogRows
      .map(normalizeLiveGiftCatalogItem)
      .filter((gift): gift is LiveGiftCatalogItem => Boolean(gift));
    giftCatalogByIdRef.current = liveGiftCatalogLookup(catalog);
    setGiftCatalog(catalog);
    setSelectedGiftId((current) => (
      current && catalog.some((gift) => gift.id === current) ? current : catalog[0]?.id ?? null
    ));

    let eventsResult = await (supabase as any)
      .from('live_gift_events')
      .select(`
        id,
        room_id,
        gift_id,
        sender_id,
        quantity,
        total_credits,
        message,
        animation_variant,
        created_at,
        live_gift_catalog(id, slug, label, credit_cost, description, thumbnail_url, animation_url)
      `)
      .eq('room_id', currentRoomId)
      .order('created_at', { ascending: false })
      .limit(30);
    if (loadGeneration !== giftLoadGenerationRef.current) return;

    if (eventsResult.error && /relationship|embed|live_gift_catalog/i.test(eventsResult.error.message ?? '')) {
      eventsResult = await (supabase as any)
        .from('live_gift_events')
        .select('id, room_id, gift_id, sender_id, quantity, total_credits, message, animation_variant, created_at')
        .eq('room_id', currentRoomId)
        .order('created_at', { ascending: false })
        .limit(30);
      if (loadGeneration !== giftLoadGenerationRef.current) return;
    }

    if (!eventsResult.error) {
      const hydrated = await Promise.all(
        (eventsResult.data ?? []).map((row: unknown) => hydrateGiftEvent(row)),
      );
      if (loadGeneration !== giftLoadGenerationRef.current) return;
      const initialEvents = hydrated.filter((event): event is LiveGiftEvent => Boolean(event));
      setGiftEvents(initialEvents);
      seedSeenGifts(initialEvents.map((event) => event.id));
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
        (payload) => {
          void receiveGiftEvent(payload.new);
        },
      )
      .subscribe();

    if (loadGeneration !== giftLoadGenerationRef.current) {
      supabase.removeChannel(channel);
      return;
    }
    giftChannelRef.current = channel;
  }, [currentRoomId, hydrateGiftEvent, receiveGiftEvent, seedSeenGifts]);

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

  const applyRoomUpdate = useCallback((update: Partial<SessionRoom>) => {
    setSession((current) => {
      if (!current) return current;
      const next = { ...current, ...update };
      sessionRef.current = next;
      return next;
    });
    if (update.status === 'ended') {
      Keyboard.dismiss();
      setCommentComposerOpen(false);
      setGiftTrayOpen(false);
      setControlSheet(null);
      setStatus('ended');
      engineRef.current?.leaveChannel();
      engineRef.current?.release();
      engineRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!currentRoomId) return;
    let active = true;
    const pollRoomStatus = async () => {
      const { data, error } = await (supabase as any)
        .from('session_rooms')
        .select('status, ended_at, agora_live_ended_at, agora_last_activity_at')
        .eq('id', currentRoomId)
        .maybeSingle();
      if (!active || error || !data) return;
      applyRoomUpdate(data as Partial<SessionRoom>);
    };
    const timer = setInterval(() => void pollRoomStatus(), 2500);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [applyRoomUpdate, currentRoomId]);

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
          if (!initialMediaRef.current.frontCamera) {
            (engine as any).switchCamera?.();
          }
          (engine as any).enableLocalVideo?.(initialMediaRef.current.cameraEnabled);
          (engine as any).muteLocalVideoStream?.(!initialMediaRef.current.cameraEnabled);
          if (initialMediaRef.current.cameraEnabled) engine.startPreview();
        }
      }

      if (nextRole !== 'audience') {
        (engine as any).muteLocalAudioStream?.(!initialMediaRef.current.microphoneEnabled);
      }
      (engine as any).setEnableSpeakerphone?.(initialMediaRef.current.speakerOn);

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
        if (previewRole) {
          const previewSession: SessionRoom = {
            id: 'live-visual-preview',
            title: 'Late Night Studio Session',
            description: 'New music, live ideas and conversation from the room.',
            host_id: 'preview-host',
            status: 'live',
            is_public: true,
            created_at: new Date().toISOString(),
            participant_count: 128,
            live_mode: 'creator_live',
            allow_stage_requests: true,
            max_stage_participants: 4,
            profiles: {
              user_id: 'preview-host',
              full_name: 'Ari Vale',
              username: 'arivale',
              bio: 'Producer and selector sharing new music straight from the studio.',
              profile_type: 'Artist · Producer',
              is_creator: true,
              is_verified: true,
            },
          };
          setSession(previewSession);
          sessionRef.current = previewSession;
          setStreamRole(previewRole === 'creator' ? 'host' : 'audience');
          setStatus('joined');
          setMessages([
            { id: 'preview-comment-1', content: 'That switch was cold', user_id: 'preview-fan-1', created_at: new Date().toISOString() },
            { id: 'preview-comment-2', content: 'Run that one back!', user_id: 'preview-fan-2', created_at: new Date().toISOString() },
            { id: 'preview-comment-3', content: 'Big love from South London', user_id: 'preview-fan-3', created_at: new Date().toISOString() },
          ]);
          setProfilesById({
            'preview-fan-1': { full_name: 'Nia' },
            'preview-fan-2': { username: 'jayloops' },
            'preview-fan-3': { full_name: 'Mika' },
          });
          setHostFollowerCount(9035);
          if (preview === 'audience-sheet' || previewSheet === 'creator') setCreatorSheetOpen(true);
          if (preview === 'audience-reaction' || previewReaction === 'heart') {
            setReactions([
              { id: 'preview-heart-1', kind: 'heart', lane: 0 },
              { id: 'preview-heart-2', kind: 'heart', lane: 2 },
            ]);
          }
          return;
        }

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
        const roomChannel = supabase
          .channel(`session-room-status-${currentRoomId}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'session_rooms',
              filter: `id=eq.${currentRoomId}`,
            },
            (payload) => applyRoomUpdate(payload.new as Partial<SessionRoom>),
          )
          .subscribe();
        roomChannelRef.current = roomChannel;
        const stageState = await loadStageState(room);

        if (cancelled) return;

        if (room.status === 'ended') {
          setStatus('ended');
          return;
        }

        const nextRole: StreamRole =
          room.host_id === user.id
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
        const permissions = await requestAndroidLivePermissions(nextRole, room.live_mode);
        if (cancelled) return;
        if (!permissions.granted) {
          setStatus('error');
          if (permissions.permanentlyDenied) {
            Alert.alert(
              'Camera or microphone blocked',
              'Enable PLUGGD camera and microphone access in Android Settings to host or join the stage.',
              [
                { text: 'Not now', style: 'cancel' },
                { text: 'Open Settings', onPress: () => void Linking.openSettings() },
              ],
            );
          } else {
            Alert.alert(
              'Camera or microphone needed',
              'PLUGGD needs the requested media access before connecting you as a host or collaborator.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Try again', onPress: () => setPermissionAttempt((attempt) => attempt + 1) },
              ],
            );
          }
          return;
        }
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
      giftLoadGenerationRef.current += 1;
      engineRef.current?.leaveChannel();
      engineRef.current?.release();
      engineRef.current = null;

      if (chatChannelRef.current) {
        supabase.removeChannel(chatChannelRef.current);
        chatChannelRef.current = null;
      }
      if (roomChannelRef.current) {
        supabase.removeChannel(roomChannelRef.current);
        roomChannelRef.current = null;
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
    applyRoomUpdate,
    initAgora,
    loadChat,
    loadGifts,
    loadRoom,
    loadStageState,
    permissionAttempt,
    previewRole,
    preview,
    previewReaction,
    previewSheet,
    router,
    setupReactions,
    user,
  ]);

  useEffect(() => {
    const unknownIds = Array.from(new Set([
      ...messages.map((message) => message.user_id),
      ...giftEvents.map((event) => event.sender_id),
    ])).filter(
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
  }, [giftEvents, messages, profilesById]);

  useEffect(() => {
    if (!session?.host_id || previewRole) return;
    let mounted = true;

    const loadHostFollowState = async () => {
      const followerResult = await (supabase as any)
        .from('user_follows')
        .select('id', { count: 'exact', head: true })
        .eq('following_id', session.host_id);
      if (mounted && !followerResult.error) setHostFollowerCount(Number(followerResult.count ?? 0));

      if (!user?.id || user.id === session.host_id) return;
      const followingResult = await (supabase as any)
        .from('user_follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', session.host_id)
        .maybeSingle();
      if (mounted && !followingResult.error) setFollowingHost(Boolean(followingResult.data?.id));
    };

    void loadHostFollowState();
    return () => {
      mounted = false;
    };
  }, [previewRole, session?.host_id, user?.id]);

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

  const openGiftTray = () => {
    impactHaptic();
    if (session?.status !== 'live') {
      Alert.alert('Gift unavailable', 'Gifts can be sent once the room is live.');
      return;
    }
    if (isHost) {
      Alert.alert('Host view', 'Hosts cannot send gifts to their own live room.');
      return;
    }
    Keyboard.dismiss();
    setCommentComposerOpen(false);
    setControlSheet(null);
    setGiftTrayOpen(true);
  };

  const openControlSheet = (sheet: 'stage' | 'host') => {
    selectionHaptic();
    Keyboard.dismiss();
    setCommentComposerOpen(false);
    setGiftTrayOpen(false);
    setControlSheet(sheet);
  };

  const closeControlSheet = () => {
    selectionHaptic();
    Keyboard.dismiss();
    setControlSheet(null);
  };

  const sendGift = async (gift: LiveGiftCatalogItem, quantity: number) => {
    impactHaptic();
    if (!currentRoomId || sendingGift) return;
    if (session?.status !== 'live') {
      Alert.alert('Gift unavailable', 'Gifts can be sent once the room is live.');
      return;
    }

    const total = gift.credit_cost * quantity;
    if (wallet.balance.available_credits < total) {
      setGiftTrayOpen(false);
      Alert.alert(
        'More credits needed',
        `This gift costs ${total.toLocaleString()} credits. Your room will still be here when you return.`,
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'Open Wallet', onPress: () => router.push('/wallet' as any) },
        ],
      );
      return;
    }

    setSendingGift(true);
    try {
      const policy = await resolveCommercePolicy({
        kind: 'live_gift',
        itemId: gift.id,
        classification: 'digital',
      });
      if (policy.permittedRail !== 'credits') {
        throw new Error(policy.reason);
      }

      const idempotencyKey = [
        Platform.OS,
        'live_gift',
        user?.id ?? 'unknown',
        currentRoomId,
        gift.id,
        Crypto.randomUUID(),
      ].join(':');
      const { data, error } = await supabase.functions.invoke('send-live-gift', {
        body: {
          room_id: currentRoomId,
          gift_id: gift.id,
          quantity,
          message: null,
          idempotency_key: idempotencyKey,
          ...(Platform.OS === 'android' ? { commerce_platform: 'android' } : {}),
        },
      });

      if (error) throw error;

      if ((data as any)?.event) {
        await receiveGiftEvent((data as any).event, gift);
      }
      await wallet.refreshBalance();
      setGiftTrayOpen(false);
      setGiftQuantity(1);
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
      Alert.alert('Live settings not saved', 'Check your connection and try again.');
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
      Alert.alert('Live control unavailable', 'Please try again in a moment.');
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

  const toggleVideo = () => {
    if (streamRole === 'audience' || isAudioRoom) return;
    selectionHaptic();
    const nextMuted = !videoMuted;
    setVideoMuted(nextMuted);
    const engine = engineRef.current as any;
    if (nextMuted) {
      engine?.muteLocalVideoStream?.(true);
      engine?.stopPreview?.();
      engine?.enableLocalVideo?.(false);
    } else {
      engine?.enableLocalVideo?.(true);
      engine?.startPreview?.();
      engine?.muteLocalVideoStream?.(false);
    }
  };

  const flipCamera = () => {
    if (streamRole === 'audience' || isAudioRoom || videoMuted) return;
    selectionHaptic();
    (engineRef.current as any)?.switchCamera?.();
    setFrontCamera((current) => !current);
  };

  const toggleAudioRoute = () => {
    selectionHaptic();
    const nextSpeakerOn = !speakerOn;
    (engineRef.current as any)?.setEnableSpeakerphone?.(nextSpeakerOn);
    setSpeakerOn(nextSpeakerOn);
  };

  const shareRoom = async () => {
    selectionHaptic();
    await Share.share({
      message: `Join ${session?.title ?? 'this live room'} on PLUGGD.`,
    });
  };

  const toggleHostFollow = async () => {
    if (!session?.host_id || isHost || followBusy) return;
    if (previewRole) {
      setFollowingHost((current) => !current);
      setHostFollowerCount((current) => Math.max(0, Number(current ?? 0) + (followingHost ? -1 : 1)));
      return;
    }

    setFollowBusy(true);
    const result = await toggleProfileFollow(session.host_id);
    setFollowBusy(false);
    if (!result.success) {
      Alert.alert('Follow failed', result.error || 'Could not update this follow right now.');
      return;
    }
    setFollowingHost(Boolean(result.saved));
    setHostFollowerCount((current) => Math.max(0, Number(current ?? 0) + (result.saved ? 1 : -1)));
  };

  const openHostProfile = () => {
    const handle = session?.profiles?.username?.trim() || session?.profiles?.slug?.trim();
    setCreatorSheetOpen(false);
    if (handle) router.push(`/creator/${handle}` as any);
    else router.push('/search' as any);
  };

  const openRoomSafety = () => {
    selectionHaptic();
    if (isHost) return;
    if (!currentRoomId || !session?.host_id) {
      Alert.alert('Safety options unavailable', 'The host details for this room are unavailable. For urgent concerns, contact support@pluggd.fm.');
      return;
    }

    const actions: any[] = [
      {
        text: 'Report live room',
        style: 'destructive',
        onPress: () => showReportActions({
          targetType: 'profile',
          targetId: session.host_id,
          label: 'live room',
          details: `Reported from live room ${currentRoomId}: ${session.title}.`,
        }),
      },
    ];
    if (user?.id !== session.host_id) {
      actions.push({
        text: 'Block host',
        style: 'destructive',
        onPress: () => Alert.alert(
          `Block ${host}?`,
          'This host and their posts, comments, recommendations and live activity will no longer appear to you.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Block',
              style: 'destructive',
              onPress: async () => {
                try {
                  await blockUser(session.host_id, `Blocked from live room ${currentRoomId}`);
                  router.back();
                  Alert.alert('Host blocked', `${host} has been removed from your PLUGGD experience.`);
                } catch (error: any) {
                  Alert.alert('Could not block host', error?.message ?? 'Please try again.');
                }
              },
            },
          ],
        ),
      });
    }
    actions.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert(session.title, 'Live-room safety', actions);
  };

  const endLive = async () => {
    if (!currentRoomId) return;

    try {
      const { error } = await (supabase as any)
        .from('session_rooms')
        .update({
          status: 'ended',
          ended_at: new Date().toISOString(),
          agora_live_ended_at: new Date().toISOString(),
          agora_last_activity_at: new Date().toISOString(),
        })
        .eq('id', currentRoomId);
      if (error) throw error;
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
    if (previewRole) {
      return (
        <ImageBackground source={LIVE_PREVIEW_IMAGE} style={styles.previewMedia} resizeMode="cover">
          <View style={styles.previewMediaWash} />
          <View style={styles.previewDisclosure}>
            <Text style={styles.previewDisclosureText}>PREVIEW ONLY</Text>
          </View>
        </ImageBackground>
      );
    }

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
          <ActivityIndicator color={theme.colors.accentText} />
        ) : (
          <MaterialIcons
            name={status === 'ended' ? 'stop-circle' : 'settings-input-antenna'}
            size={44}
            color={theme.colors.textMuted}
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
    <View style={styles.screen}>
      <StatusBar
        style={isAudioRoom ? (theme.scheme === 'dark' ? 'light' : 'dark') : 'light'}
        translucent={!isAudioRoom}
        backgroundColor={isAudioRoom ? theme.colors.background : 'transparent'}
      />
      <Stack.Screen options={{ headerShown: false }} />

      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.stage}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isHost ? 'Live video' : 'Live video. Tap to send a heart'}
            accessibilityHint={isHost ? undefined : 'Sends a heart reaction without opening another panel'}
            onPress={() => {
              if (!isHost) void sendReaction('heart');
            }}
            style={styles.mediaLayer}
          >
            {renderMedia()}
          </Pressable>
          <View pointerEvents="none" style={styles.topGradient} />
          <View pointerEvents="none" style={styles.bottomGradient} />

          <LiveGiftOverlay
            event={activeGift}
            hostName={host}
            onComplete={completeGift}
            pendingCount={pendingGiftCount}
            reducedMotion={reducedMotion}
            senderName={activeGift ? liveGiftSenderName(activeGift, user?.id, profilesById) : 'A supporter'}
          />

          <View style={[styles.topOverlay, { top: Math.max(insets.top + 8, 10) }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Open ${host} live creator card`}
              onPress={() => {
                selectionHaptic();
                setCreatorSheetOpen(true);
              }}
              style={styles.hostBlock}
            >
              <View style={styles.hostAvatar}>
                {session?.profiles?.avatar_url ? (
                  <PluggdImage uri={session.profiles.avatar_url} style={styles.hostAvatarImage} />
                ) : (
                  <Text style={styles.hostAvatarText}>{initials(host)}</Text>
                )}
              </View>

              <View style={styles.hostTextWrap}>
                <View style={styles.hostNameRow}>
                  <Text style={styles.hostName} numberOfLines={1}>
                    {host}
                  </Text>
                  {hostIsVerified ? <MaterialIcons name="verified" size={17} color={PLUGGD_ORANGE} /> : null}
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
                </View>
              </View>
            </Pressable>

            {!isHost ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${followingHost ? 'Unfollow' : 'Follow'} ${host}`}
                accessibilityState={{ selected: followingHost, busy: followBusy }}
                disabled={followBusy}
                onPress={() => void toggleHostFollow()}
                style={[styles.topFollowButton, followingHost && styles.topFollowButtonActive]}
              >
                {followBusy ? (
                  <ActivityIndicator size="small" color={followingHost ? '#FFFFFF' : '#0A0806'} />
                ) : (
                  <Text style={[styles.topFollowText, followingHost && styles.topFollowTextActive]}>
                    {followingHost ? 'Following' : 'Follow'}
                  </Text>
                )}
              </Pressable>
            ) : null}

            <View style={styles.topActions}>
              <Pressable onPress={leave} accessibilityRole="button" accessibilityLabel="Leave live room" style={styles.closeButton}>
                <MaterialIcons name="close" size={30} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>

          <View style={styles.reactionLayer} pointerEvents="none">
            {reactions.map((reaction) => (
              <FloatingReaction
                key={reaction.id}
                reaction={reaction}
                reducedMotion={reducedMotion || preview === 'audience-reaction'}
              />
            ))}
          </View>

          <View style={[styles.bottomOverlay, { bottom: Math.max(insets.bottom + 6, 10) }]}>
            <View style={[styles.sessionSummary, !isHost && styles.sessionSummaryAudience]}>
              <Text style={styles.sessionTitle} numberOfLines={1}>
                {session?.title ?? 'Live Room'}
              </Text>
            </View>

            <View pointerEvents="none" style={styles.liveChatFeed}>
              {messages.length === 0 ? (
                <Text style={styles.emptyChat}>Tap Comment to join the conversation.</Text>
              ) : (
                messages.slice(-4).map((message) => (
                  <View key={message.id} style={styles.messageRow}>
                    <View style={styles.messageAvatar}>
                      <Text style={styles.messageAvatarText}>{initials(messageName(message))}</Text>
                    </View>
                    <Text style={styles.messageText} numberOfLines={2}>
                      <Text style={styles.messageMeta}>{messageName(message)}  </Text>
                      {message.content}
                    </Text>
                  </View>
                ))
              )}
            </View>

            {commentComposerOpen ? (
              <View style={styles.activeComposerRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close comment composer"
                  onPress={() => {
                    Keyboard.dismiss();
                    setCommentComposerOpen(false);
                  }}
                  style={styles.composerCloseButton}
                >
                  <MaterialIcons name="keyboard-arrow-down" size={25} color="#FFFFFF" />
                </Pressable>
                <View style={styles.activeInputWrap}>
                  <TextInput
                    ref={commentInputRef}
                    autoFocus
                    value={messageInput}
                    onChangeText={setMessageInput}
                    onSubmitEditing={sendMessage}
                    placeholder={session?.status === 'ended' ? 'Session ended' : 'Add a comment...'}
                    placeholderTextColor="rgba(255,255,255,0.55)"
                    editable={session?.status !== 'ended'}
                    returnKeyType="send"
                    style={styles.input}
                  />
                  <Pressable accessibilityRole="button" accessibilityLabel="Send boost reaction" style={styles.emojiButton} onPress={() => sendReaction('boost')}>
                    <MaterialIcons name="bolt" size={22} color={PLUGGD_ORANGE} />
                  </Pressable>
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel="Send chat message" style={styles.sendButton} onPress={sendMessage}>
                  <MaterialIcons name="send" size={20} color="#0A0806" />
                </Pressable>
              </View>
            ) : (
              <View style={styles.liveDock}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Open comment composer"
                  disabled={session?.status === 'ended'}
                  onPress={() => {
                    setControlSheet(null);
                    setGiftTrayOpen(false);
                    setCommentComposerOpen(true);
                  }}
                  style={styles.commentPill}
                >
                  <MaterialIcons name="chat-bubble-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.commentPillText}>{session?.status === 'ended' ? 'Session ended' : 'Comment...'}</Text>
                </Pressable>
                {isHost ? (
                  <>
                    <DockIconButton icon="tune" label="Manage live" onPress={() => openControlSheet('host')} />
                    <DockIconButton icon={muted ? 'mic-off' : 'mic'} label={muted ? 'Unmute' : 'Mute'} onPress={toggleMute} />
                    {!isAudioRoom ? <DockIconButton icon={videoMuted ? 'videocam-off' : 'videocam'} label={videoMuted ? 'Turn camera on' : 'Turn camera off'} onPress={toggleVideo} /> : null}
                  </>
                ) : (
                  <>
                    <DockIconButton icon="card-giftcard" label="Send gift" onPress={openGiftTray} />
                    {stageSupported && session?.status === 'live' ? (
                      <DockIconButton icon="groups" label="Request stage" onPress={() => openControlSheet('stage')} />
                    ) : null}
                    <DockIconButton icon="ios-share" label="Share live" onPress={() => void shareRoom()} />
                    <DockIconButton icon="more-horiz" label="Live safety" onPress={openRoomSafety} />
                  </>
                )}
              </View>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>

      <Modal
        transparent
        visible={controlSheet !== null}
        animationType="slide"
        onRequestClose={closeControlSheet}
      >
        <View style={styles.controlModalRoot}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close live controls"
            onPress={closeControlSheet}
            style={styles.controlModalBackdrop}
          />
          <KeyboardAvoidingView
            pointerEvents="box-none"
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.controlSheetKeyboard}
          >
            <View style={styles.controlSheet}>
              <View style={styles.controlSheetHandle} />
              <View style={styles.controlSheetHeader}>
                <View style={styles.controlSheetHeading}>
                  <Text style={styles.controlSheetEyebrow}>
                    {controlSheet === 'host' ? 'LIVE CONTROL' : 'JOIN THE STAGE'}
                  </Text>
                  <Text style={styles.controlSheetTitle}>
                    {controlSheet === 'host' ? 'Manage this room' : 'Request stage access'}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close live controls"
                  onPress={closeControlSheet}
                  style={styles.controlSheetClose}
                >
                  <MaterialIcons name="close" size={23} color={theme.colors.text} />
                </Pressable>
              </View>

              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[styles.controlSheetContent, { paddingBottom: Math.max(insets.bottom + 24, 28) }]}
              >
                {controlSheet === 'stage' ? (
                  <View style={styles.sheetSection}>
                    <Text style={styles.stageRequestTitle}>
                      {stageRequest?.status === 'pending'
                        ? 'Stage request pending'
                        : stageRequest?.status === 'approved'
                          ? 'Stage access approved'
                          : 'Ask the host to join'}
                    </Text>
                    {stageRequest?.status ? (
                      <>
                        <Text style={styles.stageRequestBody}>
                          {stageRequest.status === 'approved'
                            ? 'Leave and rejoin to publish audio or video as a collaborator.'
                            : 'The host will review your request.'}
                        </Text>
                        {stageRequest.status === 'pending' ? (
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Withdraw stage request"
                            style={styles.stageRequestButton}
                            onPress={withdrawStageRequest}
                            disabled={withdrawingStage}
                          >
                            {withdrawingStage ? <ActivityIndicator color={theme.colors.onAccent} /> : <Text style={styles.stageRequestButtonText}>Withdraw request</Text>}
                          </Pressable>
                        ) : null}
                      </>
                    ) : (
                      <>
                        <Text style={styles.stageRequestBody}>Add an optional note so the host knows what you want to contribute.</Text>
                        <TextInput
                          value={stageRequestNote}
                          onChangeText={(value) => setStageRequestNote(value.slice(0, 180))}
                          placeholder="Optional note to host"
                          placeholderTextColor={theme.colors.textSubtle}
                          style={styles.stageRequestInput}
                        />
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Request stage access"
                          style={styles.stageRequestButton}
                          onPress={requestStageAccess}
                          disabled={requestingStage}
                        >
                          {requestingStage ? <ActivityIndicator color={theme.colors.onAccent} /> : <Text style={styles.stageRequestButtonText}>Send request</Text>}
                        </Pressable>
                      </>
                    )}
                  </View>
                ) : null}

                {controlSheet === 'host' ? (
                  <>
                    <View style={styles.sheetSignalRow}>
                      <SignalPill icon="graphic-eq" label={`${energyScore}% energy`} />
                      <SignalPill icon="groups" label={`${stageParticipants.length + (streamRole === 'host' ? 1 : 0)} on stage`} />
                      <SignalPill icon="person-add-alt-1" label={`${pendingStageCount} requests`} />
                      {latestGift ? <SignalPill icon="card-giftcard" label={`${latestGift.gift?.label ?? 'Gift'} ${latestGift.total_credits} cr`} /> : null}
                    </View>

                    <View style={styles.sheetSection}>
                      <View style={styles.runtimeHeader}>
                        <Text style={styles.stageRequestTitle}>Broadcast controls</Text>
                        {runtimeSaving || runtimeActionLoading ? <ActivityIndicator color={theme.colors.accentText} size="small" /> : null}
                      </View>
                      <View style={styles.runtimeGrid}>
                        <RuntimeButton
                          icon={muted ? 'mic-off' : 'mic'}
                          label={muted ? 'Mic Off' : 'Mic On'}
                          active={!muted}
                          onPress={toggleMute}
                        />
                        {!isAudioRoom ? <RuntimeButton
                          icon={videoMuted ? 'videocam-off' : 'videocam'}
                          label={videoMuted ? 'Camera Off' : 'Camera On'}
                          active={!videoMuted}
                          onPress={toggleVideo}
                        /> : null}
                        {!isAudioRoom ? <RuntimeButton
                          icon="flip-camera-ios"
                          label={frontCamera ? 'Front Camera' : 'Back Camera'}
                          disabled={videoMuted}
                          onPress={flipCamera}
                        /> : null}
                        <RuntimeButton
                          icon={speakerOn ? 'volume-up' : 'phone-in-talk'}
                          label={speakerOn ? 'Speaker' : 'Receiver'}
                          active={speakerOn}
                          onPress={toggleAudioRoute}
                        />
                        <RuntimeButton
                          icon="ios-share"
                          label="Share Room"
                          onPress={() => void shareRoom()}
                        />
                        <RuntimeButton
                          icon={session?.recording_enabled ? 'fiber-manual-record' : 'radio-button-unchecked'}
                          label={session?.recording_enabled ? 'Auto-record On' : 'Auto-record Off'}
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
                          label={session?.recording_status === 'recording' ? 'Stop Recording' : 'Start Recording'}
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

                    {stageSupported ? (
                      <View style={styles.sheetSection}>
                        <Text style={styles.stageRequestTitle}>Stage requests</Text>
                        {pendingStageRequests.length ? pendingStageRequests.slice(0, 8).map((request) => (
                          <View key={request.id} style={styles.hostRequestRow}>
                            <View style={styles.hostRequestText}>
                              <Text style={styles.hostRequestName}>User {request.requester_id.slice(0, 6)}</Text>
                              <Text style={styles.hostRequestNote} numberOfLines={2}>{request.request_message || 'Wants to join the stage'}</Text>
                            </View>
                            <Pressable accessibilityRole="button" accessibilityLabel={`Approve stage request from user ${request.requester_id.slice(0, 6)}`} style={styles.approveButton} onPress={() => reviewStageRequest(request.id, true)}>
                              <MaterialIcons name="check" size={16} color={theme.colors.onAccent} />
                            </Pressable>
                            <Pressable accessibilityRole="button" accessibilityLabel={`Decline stage request from user ${request.requester_id.slice(0, 6)}`} style={styles.declineButton} onPress={() => reviewStageRequest(request.id, false)}>
                              <MaterialIcons name="close" size={16} color={theme.colors.mediaText} />
                            </Pressable>
                          </View>
                        )) : <Text style={styles.sheetEmptyText}>No pending requests.</Text>}
                      </View>
                    ) : null}

                    {stageSupported ? (
                      <View style={styles.sheetSection}>
                        <Text style={styles.stageRequestTitle}>On stage</Text>
                        {stageParticipants.length ? stageParticipants.slice(0, 12).map((participant) => (
                          <View key={participant.user_id} style={styles.hostRequestRow}>
                            <View style={styles.hostRequestText}>
                              <Text style={styles.hostRequestName}>User {participant.user_id.slice(0, 6)}</Text>
                              <Text style={styles.hostRequestNote} numberOfLines={1}>{participant.role || 'Collaborator'}</Text>
                            </View>
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={`Remove user ${participant.user_id.slice(0, 6)} from stage`}
                              accessibilityState={{ disabled: removingStageUserId === participant.user_id }}
                              style={styles.declineButton}
                              disabled={removingStageUserId === participant.user_id}
                              onPress={() => removeStageParticipant(participant.user_id)}
                            >
                              {removingStageUserId === participant.user_id ? <ActivityIndicator color={theme.colors.mediaText} size="small" /> : <MaterialIcons name="person-remove" size={16} color={theme.colors.mediaText} />}
                            </Pressable>
                          </View>
                        )) : <Text style={styles.sheetEmptyText}>Only the host is on stage.</Text>}
                      </View>
                    ) : null}

                    <Pressable accessibilityRole="button" accessibilityLabel="End live session" style={styles.endLiveButton} onPress={endLive}>
                      <MaterialIcons name="stop-circle" size={19} color={theme.colors.mediaText} />
                      <Text style={styles.endLiveText}>End live</Text>
                    </Pressable>
                  </>
                ) : null}
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal
        transparent
        visible={creatorSheetOpen}
        animationType="slide"
        onRequestClose={() => setCreatorSheetOpen(false)}
      >
        <View style={styles.creatorModalRoot}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close creator card"
            onPress={() => setCreatorSheetOpen(false)}
            style={styles.creatorModalBackdrop}
          />
          <View style={[styles.creatorSheet, { paddingBottom: Math.max(insets.bottom + 18, 30) }]}>
            <View style={styles.creatorSheetHandle} />
            <View style={styles.creatorSheetIdentity}>
              <View style={styles.creatorSheetAvatar}>
                {session?.profiles?.avatar_url ? (
                  <PluggdImage uri={session.profiles.avatar_url} style={styles.creatorSheetAvatarImage} />
                ) : (
                  <Text style={styles.creatorSheetAvatarText}>{initials(host)}</Text>
                )}
              </View>
              <View style={styles.creatorSheetNameWrap}>
                <View style={styles.creatorSheetNameRow}>
                  <Text style={styles.creatorSheetName} numberOfLines={1}>{host}</Text>
                  {hostIsVerified ? <MaterialIcons name="verified" size={20} color={theme.colors.accentText} /> : null}
                </View>
                {session?.profiles?.username ? <Text style={styles.creatorSheetHandleText}>@{session.profiles.username}</Text> : null}
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close creator card"
                onPress={() => setCreatorSheetOpen(false)}
                style={styles.creatorSheetClose}
              >
                <MaterialIcons name="close" size={23} color={theme.colors.text} />
              </Pressable>
            </View>

            <View style={styles.creatorSheetMetaRow}>
              {hostFollowerCount !== null ? <Text style={styles.creatorSheetFollowers}>{hostFollowerCount.toLocaleString()} followers</Text> : null}
              <Text style={styles.creatorSheetType}>{session?.profiles?.profile_type || modeLabel(session?.live_mode)}</Text>
            </View>
            {session?.profiles?.bio ? <Text style={styles.creatorSheetBio}>{session.profiles.bio}</Text> : null}

            <View style={styles.creatorSheetActions}>
              {!isHost ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${followingHost ? 'Unfollow' : 'Follow'} ${host}`}
                  accessibilityState={{ selected: followingHost, busy: followBusy }}
                  disabled={followBusy}
                  onPress={() => void toggleHostFollow()}
                  style={[styles.creatorSheetFollow, followingHost && styles.creatorSheetFollowing]}
                >
                  {followBusy ? <ActivityIndicator color={theme.colors.onAccent} /> : (
                    <Text style={[styles.creatorSheetFollowText, followingHost && styles.creatorSheetFollowingText]}>{followingHost ? 'Following' : 'Follow'}</Text>
                  )}
                </Pressable>
              ) : null}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Open ${host} full profile`}
                onPress={openHostProfile}
                style={styles.creatorSheetProfile}
              >
                <Text style={styles.creatorSheetProfileText}>{isHost ? 'View my public page' : 'View full profile'}</Text>
                <MaterialIcons name="arrow-forward" size={19} color={theme.colors.text} />
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <LiveGiftTray
        visible={giftTrayOpen}
        gifts={giftCatalog}
        selectedGiftId={selectedGiftId}
        quantity={giftQuantity}
        balance={wallet.balance.available_credits}
        host={host}
        sending={sendingGift}
        onClose={() => setGiftTrayOpen(false)}
        onSelect={setSelectedGiftId}
        onQuantity={setGiftQuantity}
        onConfirm={() => {
          const gift = giftCatalog.find((item) => item.id === selectedGiftId);
          if (gift) void sendGift(gift, giftQuantity);
        }}
      />
    </View>
  );
}

function LiveGiftTray({
  visible,
  gifts,
  selectedGiftId,
  quantity,
  balance,
  host,
  sending,
  onClose,
  onSelect,
  onQuantity,
  onConfirm,
}: {
  visible: boolean;
  gifts: LiveGiftCatalogItem[];
  selectedGiftId: string | null;
  quantity: number;
  balance: number;
  host: string;
  sending: boolean;
  onClose: () => void;
  onSelect: (id: string) => void;
  onQuantity: (quantity: number) => void;
  onConfirm: () => void;
}) {
  const insets = useSafeAreaInsets();
  const theme = usePluggdTheme();
  const styles = useLiveSessionStyles();
  const selected = gifts.find((gift) => gift.id === selectedGiftId) ?? gifts[0];
  const total = (selected?.credit_cost ?? 0) * quantity;
  const enough = balance >= total;
  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.giftModalRoot}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close live gift tray" onPress={onClose} style={styles.giftModalBackdrop} />
        <View style={[styles.giftTray, { paddingBottom: Math.max(insets.bottom + 14, 28) }]}>
          <View style={styles.giftTrayHandle} />
          <View style={styles.giftTrayHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.giftTrayEyebrow}>SUPPORT {host.toUpperCase()}</Text>
              <Text style={styles.giftTrayTitle}>Send a live gift</Text>
            </View>
            <View style={styles.giftBalance}>
              <MaterialIcons name="account-balance-wallet" size={16} color={theme.colors.accentText} />
              <Text style={styles.giftBalanceText}>{balance.toLocaleString()} cr</Text>
            </View>
          </View>
          <Text style={styles.giftTrayCopy}>Every gift has a fixed credit price. There are no randomized rewards.</Text>

          {gifts.length ? (
            <ScrollView style={styles.giftCatalogViewport} showsVerticalScrollIndicator={false} contentContainerStyle={styles.giftCatalogGrid}>
              {gifts.map((gift) => {
                const active = gift.id === selected?.id;
                return (
                  <Pressable
                    key={gift.id}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={`${gift.label}, ${gift.credit_cost} credits`}
                    onPress={() => { selectionHaptic(); onSelect(gift.id); }}
                    style={[styles.giftCard, active && styles.giftCardActive]}
                  >
                    <LiveGiftArtwork gift={gift} size={92} style={styles.giftArt} />
                    {active ? <Text style={styles.giftSelectedBadge}>SELECTED</Text> : null}
                    <Text style={styles.giftLabel} numberOfLines={1}>{gift.label}</Text>
                    <View style={styles.giftCostRow}>
                      <MaterialIcons name="toll" size={14} color={theme.colors.accentText} />
                      <Text style={styles.giftCost}>{gift.credit_cost.toLocaleString()} credits</Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : (
            <View style={styles.giftEmpty}><Text style={styles.giftEmptyTitle}>Gifts are not available in this room yet.</Text><Text style={styles.giftEmptyCopy}>You can still react, chat, follow and share.</Text></View>
          )}

          {selected ? (
            <>
              <View style={styles.giftQuantityRow}>
                <Text style={styles.giftFieldLabel}>Quantity</Text>
                {[1, 2, 5].map((value) => (
                  <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: value === quantity }} accessibilityLabel={`${value} gifts`} onPress={() => onQuantity(value)} style={[styles.giftQuantity, value === quantity && styles.giftQuantityActive]}>
                    <Text style={[styles.giftQuantityText, value === quantity && styles.giftQuantityTextActive]}>×{value}</Text>
                  </Pressable>
                ))}
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={enough ? `Confirm ${selected.label} gift for ${total} credits` : `Open Wallet for ${selected.label} gift`}
                accessibilityState={{ disabled: sending }}
                disabled={sending}
                onPress={onConfirm}
                style={[styles.giftConfirm, !enough && styles.giftConfirmShort]}
              >
                {sending ? <ActivityIndicator color={theme.colors.onAccent} /> : <>
                  <Text style={styles.giftConfirmText}>{enough ? `Send ${selected.label}` : 'Add credits in Wallet'}</Text>
                  <Text style={styles.giftConfirmPrice}>{total.toLocaleString()} cr</Text>
                </>}
              </Pressable>
            </>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

function DockIconButton({
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
  const styles = useLiveSessionStyles();
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.dockIconButton, pressed && styles.dockIconButtonPressed]}
    >
      {loading ? (
        <ActivityIndicator color={PLUGGD_ORANGE} size="small" />
      ) : (
        <MaterialIcons name={icon} size={25} color="#FFFFFF" />
      )}
    </Pressable>
  );
}

function FloatingReaction({ reaction, reducedMotion }: { reaction: LiveReaction; reducedMotion: boolean }) {
  const styles = useLiveSessionStyles();
  const progress = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;

  useEffect(() => {
    if (reducedMotion) return;
    Animated.timing(progress, {
      toValue: 1,
      duration: REACTION_TTL_MS - 120,
      useNativeDriver: true,
    }).start();
  }, [progress, reducedMotion]);

  const color = reaction.kind === 'heart' ? '#FF4757' : reaction.kind === 'fire' ? PLUGGD_ORANGE : '#F7C84B';
  return (
    <Animated.View
      style={[
        styles.reactionBubble,
        {
          right: 18 + reaction.lane * 12,
          bottom: 164 + reaction.lane * 24,
          opacity: reducedMotion ? 1 : progress.interpolate({ inputRange: [0, 0.12, 0.78, 1], outputRange: [0, 1, 1, 0] }),
          transform: reducedMotion ? [] : [
            { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [28, -148] }) },
            { translateX: progress.interpolate({ inputRange: [0, 0.45, 1], outputRange: [0, reaction.lane % 2 ? -12 : 12, 0] }) },
            { scale: progress.interpolate({ inputRange: [0, 0.18, 1], outputRange: [0.72, 1.16, 0.92] }) },
          ],
        },
      ]}
    >
      <MaterialIcons
        name={reaction.kind === 'fire' ? 'local-fire-department' : reaction.kind === 'boost' ? 'bolt' : 'favorite'}
        size={25}
        color={color}
      />
    </Animated.View>
  );
}

function SignalPill({ icon, label }: { icon: keyof typeof MaterialIcons.glyphMap; label: string }) {
  const theme = usePluggdTheme();
  const styles = useLiveSessionStyles();
  return (
    <PluggdGlassSurface
      glassEffectStyle="clear"
      fallbackColor={theme.colors.surface}
      borderColor={theme.colors.border}
      style={styles.signalPill}
    >
      <MaterialIcons name={icon} size={14} color={theme.colors.accentText} />
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
  const theme = usePluggdTheme();
  const styles = useLiveSessionStyles();
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
      <MaterialIcons name={icon} size={17} color={active ? theme.colors.onAccent : theme.colors.text} />
      <Text style={[styles.runtimeButtonText, active && styles.runtimeButtonTextActive]} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

function AudioRoomStage({ title, host, status }: { title: string; host: string; status: JoinStatus }) {
  const theme = usePluggdTheme();
  const styles = useLiveSessionStyles();
  return (
    <View style={styles.audioStage}>
      <View style={styles.audioHalo}>
        <MaterialIcons name="podcasts" size={54} color={theme.colors.text} />
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

function useLiveSessionStyles() {
  const theme = usePluggdTheme();
  return useMemo(() => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  stage: {
    flex: 1,
    backgroundColor: '#0a0806',
    overflow: 'hidden',
  },
  mediaLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.background,
  },
  videoSurface: {
    flex: 1,
  },
  previewMedia: {
    flex: 1,
  },
  previewMediaWash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(7,5,4,0.22)',
  },
  previewDisclosure: {
    position: 'absolute',
    top: '48%',
    alignSelf: 'center',
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.52)',
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  previewDisclosureText: {
    color: 'rgba(255,255,255,0.82)',
    fontFamily: pluggdFonts.satoshiBlack,
    fontSize: 9,
    letterSpacing: 1,
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
    overflow: 'hidden',
  },
  hostAvatarImage: { width: '100%', height: '100%' },
  hostAvatarText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: pluggdFonts.satoshiBold, fontWeight: '700',
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
    fontFamily: pluggdFonts.displayBold, fontWeight: '700',
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
    fontFamily: pluggdFonts.satoshiBold, fontWeight: '700',
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
    fontFamily: pluggdFonts.satoshiBold, fontWeight: '700',
  },
  modeBadge: {
    minHeight: 25,
    borderRadius: 7,
    backgroundColor: 'rgba(255,102,0,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,102,0,0.32)',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  modeBadgeText: {
    color: PLUGGD_ORANGE,
    fontSize: 11,
    fontFamily: pluggdFonts.satoshiBold, fontWeight: '700',
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 8,
  },
  topFollowButton: {
    minWidth: 68,
    height: 34,
    borderRadius: 17,
    backgroundColor: PLUGGD_ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 11,
    marginLeft: 7,
  },
  topFollowButtonActive: {
    backgroundColor: 'rgba(0,0,0,0.34)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.56)',
  },
  topFollowText: {
    color: '#0A0806',
    fontFamily: pluggdFonts.satoshiBlack,
    fontSize: 11.5,
  },
  topFollowTextActive: { color: '#FFFFFF' },
  topActionButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 42,
  },
  placeholderTitle: {
    color: theme.colors.text,
    fontSize: 24,
    fontFamily: pluggdFonts.displayBold, fontWeight: '700',
    marginTop: 14,
    textAlign: 'center',
  },
  placeholderBody: {
    color: theme.colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    textAlign: 'center',
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
    borderColor: 'rgba(255,102,0,0.34)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomOverlay: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 6,
  },
  sessionSummary: {
    paddingRight: 72,
    marginBottom: 10,
  },
  sessionSummaryAudience: {
    marginBottom: 6,
  },
  sessionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 20,
    fontFamily: pluggdFonts.displayBold, fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.72)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
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
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontFamily: pluggdFonts.satoshiBold, fontWeight: '700',
  },
  stageRequestTitle: {
    color: theme.colors.text,
    fontSize: 14,
    fontFamily: pluggdFonts.satoshiBold, fontWeight: '700',
  },
  stageRequestBody: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 5,
    fontFamily: pluggdFonts.satoshiBold, fontWeight: '700',
  },
  stageRequestInput: {
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.controlBorder,
    backgroundColor: theme.colors.surface,
    color: theme.colors.text,
    paddingHorizontal: 10,
    marginTop: 8,
    fontSize: 13,
    fontFamily: pluggdFonts.satoshiBold, fontWeight: '700',
  },
  stageRequestButton: {
    minHeight: 44,
    borderRadius: 8,
    backgroundColor: theme.colors.accentFill,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  stageRequestButtonText: {
    color: theme.colors.onAccent,
    fontSize: 14,
    fontFamily: pluggdFonts.satoshiBold, fontWeight: '700',
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
    minHeight: 44,
    minWidth: '47%',
    flex: 1,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: theme.colors.controlBorder,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  runtimeButtonActive: {
    backgroundColor: theme.colors.accentFill,
    borderColor: theme.colors.controlBorder,
  },
  runtimeButtonDisabled: {
    opacity: 0.55,
  },
  runtimeButtonText: {
    color: theme.colors.text,
    fontSize: 12,
    fontFamily: pluggdFonts.satoshiBold, fontWeight: '800',
  },
  runtimeButtonTextActive: {
    color: theme.colors.onAccent,
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
    color: theme.colors.text,
    fontSize: 13,
    fontFamily: pluggdFonts.satoshiBold, fontWeight: '700',
  },
  hostRequestNote: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontFamily: pluggdFonts.satoshiBold, fontWeight: '700',
    marginTop: 2,
  },
  approveButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: theme.colors.accentFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: theme.colors.danger,
    borderWidth: 1,
    borderColor: theme.colors.controlBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatPanel: {
    maxHeight: 278,
    minHeight: 208,
    borderRadius: 16,
    padding: 10,
  },
  liveChatFeed: {
    width: '84%',
    minHeight: 44,
    maxHeight: 190,
    justifyContent: 'flex-end',
    gap: 8,
    marginBottom: 10,
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
    fontFamily: pluggdFonts.satoshiBold, fontWeight: '700',
  },
  chatFilter: {
    color: '#BDBDBD',
    fontSize: 13,
    fontFamily: pluggdFonts.satoshiBold, fontWeight: '700',
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
    fontFamily: pluggdFonts.satoshiBold, fontWeight: '700',
    paddingVertical: 12,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  messageAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(18,18,18,0.72)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.42)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  messageAvatarText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: pluggdFonts.satoshiBold, fontWeight: '700',
  },
  messageContent: {
    flex: 1,
    minWidth: 0,
  },
  messageMeta: {
    color: '#FFB17A',
    fontFamily: pluggdFonts.satoshiBlack,
  },
  messageText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.82)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  composerRow: {
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  activeComposerRow: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  composerCloseButton: {
    width: 44,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(0,0,0,0.56)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeInputWrap: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 15,
    backgroundColor: 'rgba(20,20,20,0.94)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  liveDock: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  commentPill: {
    flex: 1,
    minWidth: 118,
    height: 48,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 15,
    backgroundColor: 'rgba(18,18,18,0.72)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  commentPillText: {
    flex: 1,
    color: 'rgba(255,255,255,0.78)',
    fontSize: 14,
    fontFamily: pluggdFonts.satoshiBold,
    fontWeight: '700',
  },
  dockIconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dockIconButtonPressed: {
    opacity: 0.62,
    transform: [{ scale: 0.94 }],
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
    fontFamily: pluggdFonts.satoshiBold, fontWeight: '700',
    paddingVertical: 0,
  },
  emojiButton: {
    width: 44,
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
    backgroundColor: theme.colors.background,
  },
  audioHalo: {
    width: 146,
    height: 146,
    borderRadius: 73,
    borderWidth: 1,
    borderColor: theme.colors.borderAccent,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  audioTitle: {
    color: theme.colors.text,
    fontSize: 28,
    fontFamily: pluggdFonts.displayExtraBold, fontWeight: '800',
  },
  audioSubtitle: {
    color: theme.colors.textMuted,
    fontSize: 15,
    fontFamily: pluggdFonts.satoshiBold, fontWeight: '700',
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
    backgroundColor: theme.colors.accentFill,
  },
  controlModalRoot: { flex: 1, justifyContent: 'flex-end' },
  controlModalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.58)' },
  controlSheetKeyboard: { flex: 1, justifyContent: 'flex-end' },
  controlSheet: {
    maxHeight: '82%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: theme.colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  controlSheetHandle: { width: 46, height: 5, borderRadius: 3, backgroundColor: theme.colors.controlBorder, alignSelf: 'center', marginBottom: 14 },
  controlSheetHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 14 },
  controlSheetHeading: { flex: 1, minWidth: 0 },
  controlSheetEyebrow: { color: theme.colors.accentText, fontFamily: pluggdFonts.satoshiBlack, fontSize: 9, letterSpacing: 1.2 },
  controlSheetTitle: { color: theme.colors.text, fontFamily: pluggdFonts.displayExtraBold, fontSize: 25, lineHeight: 30, letterSpacing: -0.6, marginTop: 2 },
  controlSheetClose: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center' },
  controlSheetContent: { gap: 18 },
  sheetSignalRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  sheetSection: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border, paddingTop: 16, gap: 9 },
  sheetEmptyText: { color: theme.colors.textMuted, fontFamily: pluggdFonts.satoshiRegular, fontSize: 13, lineHeight: 18 },
  endLiveButton: { minHeight: 52, borderRadius: 16, backgroundColor: theme.colors.danger, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  endLiveText: { color: theme.colors.mediaText, fontFamily: pluggdFonts.satoshiBlack, fontSize: 14, textTransform: 'uppercase', letterSpacing: 0.4 },
  creatorModalRoot: { flex: 1, justifyContent: 'flex-end' },
  creatorModalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.48)' },
  creatorSheet: { borderTopLeftRadius: 30, borderTopRightRadius: 30, backgroundColor: theme.colors.background, borderTopWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border, paddingHorizontal: 20, paddingTop: 10 },
  creatorSheetHandle: { width: 46, height: 5, borderRadius: 3, backgroundColor: theme.colors.controlBorder, alignSelf: 'center', marginBottom: 18 },
  creatorSheetIdentity: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  creatorSheetAvatar: { width: 76, height: 76, borderRadius: 38, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surfaceAlt, borderWidth: 2, borderColor: theme.colors.borderAccent },
  creatorSheetAvatarImage: { width: '100%', height: '100%' },
  creatorSheetAvatarText: { color: theme.colors.text, fontFamily: pluggdFonts.displayExtraBold, fontSize: 24 },
  creatorSheetNameWrap: { flex: 1, minWidth: 0 },
  creatorSheetNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  creatorSheetName: { flexShrink: 1, color: theme.colors.text, fontFamily: pluggdFonts.displayExtraBold, fontSize: 27, lineHeight: 32 },
  creatorSheetHandleText: { color: theme.colors.textMuted, fontFamily: pluggdFonts.satoshiMedium, fontSize: 14, marginTop: 3 },
  creatorSheetClose: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center' },
  creatorSheetMetaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 9, marginTop: 18 },
  creatorSheetFollowers: { color: theme.colors.text, fontFamily: pluggdFonts.satoshiBlack, fontSize: 13 },
  creatorSheetType: { color: theme.colors.accentText, fontFamily: pluggdFonts.satoshiBold, fontSize: 12 },
  creatorSheetBio: { color: theme.colors.textSecondary, fontFamily: pluggdFonts.satoshiRegular, fontSize: 14, lineHeight: 20, marginTop: 10 },
  creatorSheetActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  creatorSheetFollow: { minHeight: 52, minWidth: 120, borderRadius: 17, backgroundColor: theme.colors.accentFill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  creatorSheetFollowing: { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.controlBorder },
  creatorSheetFollowText: { color: theme.colors.onAccent, fontFamily: pluggdFonts.satoshiBlack, fontSize: 14 },
  creatorSheetFollowingText: { color: theme.colors.text },
  creatorSheetProfile: { minHeight: 52, flex: 1, borderRadius: 17, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.controlBorder, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 14 },
  creatorSheetProfileText: { color: theme.colors.text, fontFamily: pluggdFonts.satoshiBlack, fontSize: 13 },
  giftModalRoot: { flex: 1, justifyContent: 'flex-end' },
  giftModalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.62)' },
  giftTray: { maxHeight: '86%', borderTopLeftRadius: 30, borderTopRightRadius: 30, backgroundColor: theme.colors.background, borderTopWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border, paddingHorizontal: 18, paddingTop: 10, paddingBottom: 28 },
  giftTrayHandle: { width: 46, height: 5, borderRadius: 3, backgroundColor: theme.colors.controlBorder, alignSelf: 'center', marginBottom: 14 },
  giftTrayHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  giftTrayEyebrow: { color: theme.colors.accentText, fontFamily: pluggdFonts.satoshiBlack, fontSize: 9, letterSpacing: 1.2 },
  giftTrayTitle: { color: theme.colors.text, fontFamily: pluggdFonts.displayExtraBold, fontSize: 26, lineHeight: 31, letterSpacing: -0.7 },
  giftBalance: { minHeight: 44, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, backgroundColor: theme.colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.controlBorder },
  giftBalanceText: { color: theme.colors.text, fontFamily: pluggdFonts.satoshiBold, fontSize: 12 },
  giftTrayCopy: { color: theme.colors.textMuted, fontFamily: pluggdFonts.satoshiRegular, fontSize: 11.5, lineHeight: 16, marginTop: 7 },
  giftCatalogViewport: { maxHeight: 346, marginTop: 12 },
  giftCatalogGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingBottom: 12 },
  giftCard: { width: '48%', minHeight: 174, borderRadius: 20, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, padding: 11, gap: 7 },
  giftCardActive: { borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.accentSoft },
  giftArt: { width: '100%', height: 92, borderRadius: 16, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  giftSelectedBadge: { position: 'absolute', top: 14, right: 14, color: theme.colors.onAccent, backgroundColor: theme.colors.accentFill, borderRadius: 8, overflow: 'hidden', paddingHorizontal: 6, paddingVertical: 3, fontFamily: pluggdFonts.satoshiBlack, fontSize: 8, letterSpacing: 0.5 },
  giftLabel: { color: theme.colors.text, fontFamily: pluggdFonts.satoshiBold, fontSize: 14 },
  giftCostRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  giftCost: { color: theme.colors.accentText, fontFamily: pluggdFonts.satoshiBlack, fontSize: 10.5 },
  giftEmpty: { minHeight: 128, marginVertical: 16, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center', gap: 6, padding: 18 },
  giftEmptyTitle: { color: theme.colors.text, fontFamily: pluggdFonts.displayBold, fontSize: 16, textAlign: 'center' },
  giftEmptyCopy: { color: theme.colors.textMuted, fontFamily: pluggdFonts.satoshiRegular, fontSize: 12, textAlign: 'center' },
  giftQuantityRow: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border },
  giftFieldLabel: { flex: 1, color: theme.colors.text, fontFamily: pluggdFonts.satoshiBold, fontSize: 13 },
  giftQuantity: { minWidth: 48, height: 44, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.controlBorder, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surface },
  giftQuantityActive: { backgroundColor: theme.colors.accentFill, borderColor: theme.colors.controlBorder },
  giftQuantityText: { color: theme.colors.text, fontFamily: pluggdFonts.satoshiBlack, fontSize: 13 },
  giftQuantityTextActive: { color: theme.colors.onAccent },
  giftConfirm: { minHeight: 56, marginTop: 12, borderRadius: 16, backgroundColor: theme.colors.accentFill, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  giftConfirmShort: { backgroundColor: theme.colors.accentFill },
  giftConfirmText: { color: theme.colors.onAccent, fontFamily: pluggdFonts.satoshiBlack, fontSize: 14, textTransform: 'uppercase', letterSpacing: 0.3 },
  giftConfirmPrice: { color: theme.colors.onAccent, fontFamily: pluggdFonts.displayExtraBold, fontSize: 16 },
}), [theme]);
}
