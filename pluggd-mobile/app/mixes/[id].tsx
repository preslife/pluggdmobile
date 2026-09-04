import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { pluggdFonts } from '../../src/design/typography';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Image,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { RecoveryState } from '../../components/ContentUI';
import { usePlayback } from '../../src/context/PlaybackProvider';
import { useListeningRoomOrientation } from '../../src/lib/orientation';
import { edFonts } from '../../src/design/editorial';
import { getCurrentUserId, toggleSavedContent } from '../../src/features/culture/mobileServices';
import { supabase } from '../../src/lib/supabase';
import { MixItem, MixTrackItem, formatCompact, formatDuration, toTrack } from '../../src/lib/mobileContent';
import { usePluggdTheme } from '../../src/design/usePluggdTheme';
import { PlaybackSeekBar } from '../../src/components/PlaybackSeekBar';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MIX_STARTING_FEEDBACK_MS = 350;

type MixCommentRow = {
  id: string;
  mix_id: string;
  user_id: string;
  body: string | null;
  timestamp_seconds: number | null;
  created_at: string;
};

type TrackIdRequestRow = {
  id: string;
  mix_id: string;
  user_id: string;
  timestamp_seconds: number;
  note: string | null;
  status: 'open' | 'resolved' | 'dismissed';
  matched_tracklist_item_id: string | null;
  created_at: string;
  updated_at: string;
};

export default function MixDetailScreen() {
  const theme = usePluggdTheme();
  const styles = useMixStyles();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { playTrack, seekTo, currentTrack, isPlaying, togglePlayPause, progress } = usePlayback();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  // Turning the phone sideways enters the wide listening-room layout.
  useListeningRoomOrientation();
  const [mix, setMix] = useState<MixItem | null>(null);
  const [tracklist, setTracklist] = useState<MixTrackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [startingPlayback, setStartingPlayback] = useState(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [comments, setComments] = useState<MixCommentRow[]>([]);
  const [trackIdRequests, setTrackIdRequests] = useState<TrackIdRequestRow[]>([]);
  const [profileNames, setProfileNames] = useState<Record<string, string>>({});
  const [commentValue, setCommentValue] = useState('');
  const [commentBusy, setCommentBusy] = useState(false);
  const [requestBusy, setRequestBusy] = useState(false);
  const [roomDataError, setRoomDataError] = useState<string | null>(null);
  const vinylRotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const lookup = String(id || '').trim();
      const mixQuery = (supabase as any)
        .from('mixes')
        .select('id,slug,title,description,cover_url,audio_url,duration_seconds,city,genre_tags,mood_tags,recording_type,event_name,bpm_min,bpm_max,like_count,repost_count,save_count,play_count,published_at,created_at');
      const mixRes = await (UUID_PATTERN.test(lookup) ? mixQuery.eq('id', lookup) : mixQuery.eq('slug', lookup)).maybeSingle();
      const nextMix = mixRes.error ? null : (mixRes.data as MixItem | null);
      const [trackRes, commentRes, requestRes] = nextMix
        ? await Promise.all([
            (supabase as any)
              .from('mix_tracklist_items')
              .select('id,mix_id,position,start_seconds,end_seconds,raw_title,raw_artist')
              .eq('mix_id', nextMix.id)
              .order('position', { ascending: true }),
            (supabase as any)
              .from('mix_comments')
              .select('id,mix_id,user_id,body,timestamp_seconds,created_at')
              .eq('mix_id', nextMix.id)
              .order('created_at', { ascending: false })
              .limit(60),
            (supabase as any)
              .from('mix_track_id_requests')
              .select('id,mix_id,user_id,timestamp_seconds,note,status,matched_tracklist_item_id,created_at,updated_at')
              .eq('mix_id', nextMix.id)
              .order('created_at', { ascending: false })
              .limit(40),
          ])
        : [{ data: [], error: null }, { data: [], error: null }, { data: [], error: null }];

      const commentRows = Array.isArray(commentRes.data) ? commentRes.data as MixCommentRow[] : [];
      const requestRows = Array.isArray(requestRes.data) ? requestRes.data as TrackIdRequestRow[] : [];
      const interactionUserIds = Array.from(new Set([
        ...commentRows.map((row) => row.user_id),
        ...requestRows.map((row) => row.user_id),
      ].filter(Boolean)));
      let nextProfileNames: Record<string, string> = {};
      if (interactionUserIds.length) {
        const profileRes = await (supabase as any)
          .from('profiles')
          .select('user_id,username,full_name')
          .in('user_id', interactionUserIds);
        if (Array.isArray(profileRes.data)) {
          nextProfileNames = Object.fromEntries(
            profileRes.data.map((profile: any) => [
              profile.user_id,
              profile.full_name?.trim() || profile.username?.trim() || 'PLUGGD listener',
            ]),
          );
        }
      }

      if (!mounted) return;
      setMix(nextMix);
      setTracklist(
        Array.isArray(trackRes.data) && nextMix
          ? (trackRes.data as MixTrackItem[])
          : [],
      );
      setComments(commentRows);
      setTrackIdRequests(requestRows);
      setProfileNames(nextProfileNames);
      setRoomDataError(
        commentRes.error || requestRes.error
          ? 'Some live room activity could not be loaded. Audio and tracklist controls remain available.'
          : null,
      );
      setLoading(false);
    };
    if (id) load();
    return () => {
      mounted = false;
    };
  }, [id]);

  const playMix = async (openFullPlayer = false) => {
    if (!mix || startingPlayback) return;
    const track = toTrack(mix, 'mix');
    if (!track) {
      const message = 'This mix does not include a playable recording. Try another mix.';
      setPlaybackError(message);
      Alert.alert('Mix unavailable', message);
      return;
    }
    const startedAt = Date.now();
    setPlaybackError(null);
    setStartingPlayback(true);
    try {
      const active = await playTrack(track);
      const activeIsRequestedMix = Boolean(
        active &&
        (active.sourceType === 'mix' || active.type === 'mix') &&
        (active.mixId === mix.id || active.id === mix.id),
      );
      if (!activeIsRequestedMix || !active) throw new Error('mix did not become the active track');
      const remainingFeedback = MIX_STARTING_FEEDBACK_MS - (Date.now() - startedAt);
      if (remainingFeedback > 0) await new Promise((resolve) => setTimeout(resolve, remainingFeedback));
      if (openFullPlayer) {
        router.push({
          pathname: '/player',
          params: {
            title: active.title,
            artist: active.artist,
            cover: active.artwork ?? '',
          },
        });
      }
    } catch {
      const remainingFeedback = MIX_STARTING_FEEDBACK_MS - (Date.now() - startedAt);
      if (remainingFeedback > 0) await new Promise((resolve) => setTimeout(resolve, remainingFeedback));
      const message = 'This mix could not start. Check your connection, then tap Play mix to try again.';
      setPlaybackError(message);
      Alert.alert('Mix unavailable', message);
    } finally {
      setStartingPlayback(false);
    }
  };

  const saveMix = async () => {
    if (!mix || saving) return;
    setSaving(true);
    const result = await toggleSavedContent('mix', mix.id);
    setSaving(false);
    Alert.alert(result.success ? (result.saved ? 'Saved' : 'Removed') : 'Save unavailable', result.success ? `${mix.title || 'Mix'} library state updated.` : result.error || 'Please try again.');
  };

  const shareMix = async () => {
    if (!mix) return;
    await Share.share({ message: `PLUGGD mix: ${mix.title || 'Untitled mix'}` });
  };

  const isThisMixPlaying = Boolean(mix && currentTrack?.mixId === mix.id);
  const playedRatio =
    isThisMixPlaying && progress.duration > 0 ? Math.min(1, progress.position / progress.duration) : 0;
  const roomSecond = isThisMixPlaying ? Math.max(0, Math.floor(progress.position || 0)) : 0;
  const roomDuration = Math.max(0, progress.duration || Number(mix?.duration_seconds ?? 0));
  const roomPlaying = Boolean(isThisMixPlaying && isPlaying);
  const tonearmEngaged = Boolean(
    isThisMixPlaying
    && (roomPlaying || (roomSecond > 0 && (roomDuration <= 0 || roomSecond < roomDuration - 1))),
  );

  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    if (roomPlaying) {
      loop = Animated.loop(
        Animated.timing(vinylRotation, {
          toValue: 1,
          duration: 7600,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      );
      loop.start();
    }
    return () => loop?.stop();
  }, [roomPlaying, vinylRotation]);

  const toggleRoomPlayback = () => {
    if (roomPlaying || isThisMixPlaying) {
      void togglePlayPause();
      return;
    }
    void playMix();
  };

  const stopRoomPlayback = () => {
    if (!isThisMixPlaying) return;
    void seekTo(0);
    if (isPlaying) void togglePlayPause();
  };

  const seekRoomToRatio = (ratio: number) => {
    if (!roomDuration) return;
    if (!isThisMixPlaying) {
      void playMix().then(() => seekTo(ratio * roomDuration));
      return;
    }
    void seekTo(ratio * roomDuration);
  };

  const requestTrackId = async () => {
    if (!mix || requestBusy) return;
    const userId = await getCurrentUserId();
    if (!userId) {
      Alert.alert('Sign in required', 'Track ID requests are saved to the listening room and require an account.');
      return;
    }
    setRequestBusy(true);
    const { data, error } = await (supabase as any)
      .from('mix_track_id_requests')
      .insert({ mix_id: mix.id, user_id: userId, timestamp_seconds: roomSecond, note: null })
      .select('id,mix_id,user_id,timestamp_seconds,note,status,matched_tracklist_item_id,created_at,updated_at')
      .single();
    setRequestBusy(false);
    if (error || !data) {
      Alert.alert('Track ID request failed', 'The request could not be saved. Please try again.');
      return;
    }
    setTrackIdRequests((current) => [data as TrackIdRequestRow, ...current]);
    Alert.alert('Track ID requested', `Saved at ${formatDuration(roomSecond)}.`);
  };

  const postRoomComment = async () => {
    if (!mix || commentBusy) return;
    const body = commentValue.trim();
    if (!body) return;
    const userId = await getCurrentUserId();
    if (!userId) {
      Alert.alert('Sign in required', 'Listening Room comments require an account.');
      return;
    }
    setCommentBusy(true);
    const { data, error } = await (supabase as any)
      .from('mix_comments')
      .insert({ mix_id: mix.id, user_id: userId, body, timestamp_seconds: roomSecond })
      .select('id,mix_id,user_id,body,timestamp_seconds,created_at')
      .single();
    setCommentBusy(false);
    if (error || !data) {
      Alert.alert('Comment failed', 'The room comment could not be posted. Please try again.');
      return;
    }
    setComments((current) => [data as MixCommentRow, ...current]);
    setProfileNames((current) => ({ ...current, [userId]: current[userId] || 'You' }));
    setCommentValue('');
  };

  if (isLandscape && mix) {
    return (
      <View style={styles.roomScreen}>
        <StatusBar style={theme.scheme === 'light' ? 'dark' : 'light'} hidden />
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.roomArtPane}>
          {mix.cover_url ? (
            <Image source={{ uri: mix.cover_url }} style={styles.roomArt} resizeMode="cover" />
          ) : (
            <MaterialIcons name="headphones" size={64} color={theme.colors.accentText} />
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={styles.roomBack}
          >
            <MaterialIcons name="chevron-left" size={26} color={theme.colors.mediaText} />
          </Pressable>
        </View>
        <View style={styles.roomPane}>
          <Text style={styles.roomEyebrow}>LISTENING ROOM</Text>
          <Text style={styles.roomTitle} numberOfLines={2}>{mix.title || 'Untitled mix'}</Text>
          <Text style={styles.roomMeta}>
            {[mix.city, formatDuration(mix.duration_seconds), `${formatCompact(mix.play_count)} plays`]
              .filter(Boolean)
              .join('  ·  ')
              .toUpperCase()}
          </Text>
          <View style={styles.roomWaveRow}>
            {Array.from({ length: 52 }).map((_, index) => {
              const wave = Math.abs(Math.sin((index + 4) * 1.35)) * 0.82 + 0.18;
              const played = index / 52 <= playedRatio;
              return (
                <View
                  key={index}
                  style={{
                    width: 3,
                    borderRadius: 1.5,
                    height: Math.max(5, wave * 44),
                    backgroundColor: played ? theme.colors.accentFill : theme.colors.borderStrong,
                  }}
                />
              );
            })}
          </View>
          <View style={styles.roomTimeRow}>
            <Text style={styles.roomTime}>{isThisMixPlaying ? formatDuration(progress.position) : '0:00'}</Text>
            <Text style={styles.roomTime}>{formatDuration(mix.duration_seconds)}</Text>
          </View>
          <View style={styles.roomControls}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={startingPlayback ? 'Starting mix' : isThisMixPlaying && isPlaying ? 'Pause mix' : 'Play mix'}
              accessibilityState={{ busy: startingPlayback, disabled: startingPlayback }}
              disabled={startingPlayback}
              onPress={() => {
                if (isThisMixPlaying) togglePlayPause();
                else void playMix();
              }}
              style={({ pressed }) => [styles.roomPlay, pressed && { opacity: 0.86, transform: [{ scale: 0.985 }] }]}
            >
              {startingPlayback
                ? <ActivityIndicator color={theme.colors.onAccent} />
                : <MaterialIcons name={isThisMixPlaying && isPlaying ? 'pause' : 'play-arrow'} size={38} color={theme.colors.onAccent} />}
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Save mix"
              onPress={saveMix}
              style={({ pressed }) => [styles.roomGhost, pressed && { opacity: 0.86 }]}
            >
              <MaterialIcons name="library-music" size={22} color={theme.colors.text} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Share mix"
              onPress={shareMix}
              style={({ pressed }) => [styles.roomGhost, pressed && { opacity: 0.86 }]}
            >
              <MaterialIcons name="ios-share" size={21} color={theme.colors.text} />
            </Pressable>
          </View>
          {tracklist.length ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.roomTracklist}
            >
              {tracklist.map((item) => (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Jump to ${item.raw_title || `track ${item.position}`}`}
                  onPress={() => {
                    void playMix();
                    if (item.start_seconds) setTimeout(() => seekTo(item.start_seconds || 0), 500);
                  }}
                  style={({ pressed }) => [styles.roomTrackChip, pressed && { opacity: 0.86 }]}
                >
                  <Text style={styles.roomTrackNumber}>{String(item.position).padStart(2, '0')}</Text>
                  <Text style={styles.roomTrackTitle} numberOfLines={1}>
                    {item.raw_title || `Track ${item.position}`}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar style={theme.scheme === 'light' ? 'dark' : 'light'} />
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={theme.colors.accentFill} />
          </View>
        ) : null}

        {mix ? (
          <PortraitListeningRoom
            mix={mix}
            tracklist={tracklist}
            comments={comments}
            trackIdRequests={trackIdRequests}
            profileNames={profileNames}
            roomDataError={roomDataError}
            roomPlaying={roomPlaying}
            startingPlayback={startingPlayback}
            playbackError={playbackError}
            playedRatio={playedRatio}
            roomSecond={roomSecond}
            roomDuration={roomDuration}
            vinylRotation={vinylRotation}
            tonearmEngaged={tonearmEngaged}
            saving={saving}
            requestBusy={requestBusy}
            commentBusy={commentBusy}
            commentValue={commentValue}
            onCommentValueChange={setCommentValue}
            onClose={() => (router.canGoBack() ? router.back() : router.replace('/mixes' as any))}
            onTogglePlayback={toggleRoomPlayback}
            onStopPlayback={stopRoomPlayback}
            onSeekRatio={seekRoomToRatio}
            onRewind={() => void seekTo(Math.max(0, roomSecond - 15))}
            onForward={() => void seekTo(Math.min(roomDuration, roomSecond + 15))}
            onSave={() => void saveMix()}
            onRequestTrackId={() => void requestTrackId()}
            onShare={() => void shareMix()}
            onPostToCommunity={() => router.push({ pathname: '/create-post', params: { attachmentType: 'mix', mixId: mix.id, type: 'post' } } as any)}
            onPostComment={() => void postRoomComment()}
            onTrackPress={(item) => void playMix().then(() => seekTo(item.start_seconds || 0))}
          />
        ) : !loading ? (
          <RecoveryState
            eyebrow="ROOM CLOSED"
            title="This mix is off the air"
            body="The session may have moved or returned to the archive. Step into another listening room without losing your place."
            icon="headphones"
            primaryLabel="Explore mixes"
            onPrimary={() => router.replace('/mixes' as any)}
            secondaryLabel="Go back"
            onSecondary={() => router.back()}
          />
        ) : null}
      </ScrollView>
    </View>
  );
}

function formatRoomTime(seconds?: number | null) {
  const total = Math.max(0, Math.floor(Number(seconds ?? 0)));
  const minutes = Math.floor(total / 60);
  const remainder = total % 60;
  return `${minutes}:${remainder.toString().padStart(2, '0')}`;
}

type PortraitListeningRoomProps = {
  mix: MixItem;
  tracklist: MixTrackItem[];
  comments: MixCommentRow[];
  trackIdRequests: TrackIdRequestRow[];
  profileNames: Record<string, string>;
  roomDataError: string | null;
  roomPlaying: boolean;
  startingPlayback: boolean;
  playbackError: string | null;
  playedRatio: number;
  roomSecond: number;
  roomDuration: number;
  vinylRotation: Animated.Value;
  tonearmEngaged: boolean;
  saving: boolean;
  requestBusy: boolean;
  commentBusy: boolean;
  commentValue: string;
  onCommentValueChange: (value: string) => void;
  onClose: () => void;
  onTogglePlayback: () => void;
  onStopPlayback: () => void;
  onSeekRatio: (ratio: number) => void;
  onRewind: () => void;
  onForward: () => void;
  onSave: () => void;
  onRequestTrackId: () => void;
  onShare: () => void;
  onPostToCommunity: () => void;
  onPostComment: () => void;
  onTrackPress: (item: MixTrackItem) => void;
};

function PortraitListeningRoom({
  mix,
  tracklist,
  comments,
  trackIdRequests,
  profileNames,
  roomDataError,
  roomPlaying,
  startingPlayback,
  playbackError,
  playedRatio,
  roomSecond,
  roomDuration,
  vinylRotation,
  tonearmEngaged,
  saving,
  requestBusy,
  commentBusy,
  commentValue,
  onCommentValueChange,
  onClose,
  onTogglePlayback,
  onStopPlayback,
  onSeekRatio,
  onRewind,
  onForward,
  onSave,
  onRequestTrackId,
  onShare,
  onPostToCommunity,
  onPostComment,
  onTrackPress,
}: PortraitListeningRoomProps) {
  const theme = usePluggdTheme();
  const styles = useMixStyles();
  const vinylSpin = vinylRotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const tonearmTurn = tonearmEngaged ? `${12 + playedRatio * 12}deg` : '-6deg';
  const leftVuPulse = useRef(new Animated.Value(0)).current;
  const rightVuPulse = useRef(new Animated.Value(0)).current;
  const selector = mix.city ? `${mix.city} selector` : 'PLUGGD selector';
  const bpm = Number((mix as MixItem & { bpm_min?: number | null }).bpm_min ?? 0);

  useEffect(() => {
    leftVuPulse.stopAnimation();
    rightVuPulse.stopAnimation();

    if (!roomPlaying) {
      leftVuPulse.setValue(0);
      rightVuPulse.setValue(0);
      return;
    }

    const leftLoop = Animated.loop(Animated.sequence([
      Animated.timing(leftVuPulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(leftVuPulse, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    const rightLoop = Animated.loop(Animated.sequence([
      Animated.timing(rightVuPulse, { toValue: 1, duration: 820, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(rightVuPulse, { toValue: 0, duration: 820, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));

    leftLoop.start();
    rightLoop.start();
    return () => {
      leftLoop.stop();
      rightLoop.stop();
    };
  }, [leftVuPulse, rightVuPulse, roomPlaying]);

  const renderDeckSignal = (side: 'L' | 'R') => {
    const pulse = side === 'L' ? leftVuPulse : rightVuPulse;
    const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.03] });
    const pulseOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] });
    return (
      <View
        accessible
        accessibilityLabel={`${side === 'L' ? 'Left' : 'Right'} playback activity ${roomPlaying ? 'active' : 'paused'}`}
        style={styles.vuMeter}
      >
        <View pointerEvents="none" style={styles.vuTrack}>
          <Animated.View
            style={[
              styles.vuFill,
              roomPlaying ? (side === 'L' ? styles.vuFillPlayingLeft : styles.vuFillPlayingRight) : styles.vuFillIdle,
              roomPlaying && { opacity: pulseOpacity, transform: [{ scaleX: pulseScale }] },
            ]}
          >
            <LinearGradient
              colors={['#4caf50', '#4caf50', '#e4ed2d', '#ff4437']}
              locations={[0, 0.54, 0.72, 1]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFillObject}
            />
          </Animated.View>
        </View>
        <Text style={styles.vuLabel}>{side}</Text>
      </View>
    );
  };

  return (
    <>
      <View style={styles.portraitRoomHeader}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.portraitRoomEyebrow}>● PLUGGD LISTENING ROOM · SPATIAL SESSION</Text>
          <Text style={styles.portraitRoomTitle}>{mix.title || 'Untitled mix'}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Close Listening Room" style={styles.closeRoomButton} onPress={onClose}>
          <MaterialIcons name="close" size={24} color={theme.colors.text} />
        </Pressable>
      </View>

      <View style={styles.deckCard}>
        <View style={styles.deckTopLine}>
          <Text style={styles.deckAcidLabel}>DIRECT DRIVE · PLG-01</Text>
          <Text style={styles.deckState}>{roomPlaying ? 'DECK PLAYING' : 'DECK PAUSED'}</Text>
        </View>
        <PlaybackSeekBar
          ratio={playedRatio}
          duration={roomDuration}
          position={roomSecond}
          onSeek={onSeekRatio}
          accessibilityLabel="Move tonearm through mix"
          style={styles.turntableStage}
          showDefaultTrack={false}
          showThumb={false}
        >
          {() => (
            <>
              <Animated.View style={[styles.vinyl, { transform: [{ rotate: vinylSpin }] }]}>
                <View style={styles.vinylGrooveOuter} />
                <View style={styles.vinylGrooveInner} />
                <View style={styles.vinylLabel}>
                  {mix.cover_url ? (
                    <Image source={{ uri: mix.cover_url }} style={styles.vinylLabelImage} />
                  ) : (
                    <MaterialIcons name="headphones" size={32} color="#f8eddc" />
                  )}
                </View>
                <View style={styles.vinylPin} />
              </Animated.View>
              <View pointerEvents="none" style={styles.tonearmRest}>
                <View style={styles.tonearmRestPost} />
                <View style={styles.tonearmRestCradle} />
              </View>
              <View pointerEvents="none" style={[styles.tonearm, { transform: [{ rotate: tonearmTurn }] }]}>
                <View style={styles.tonearmPivot} />
                <View style={styles.tonearmUpperBar} />
                <View style={styles.tonearmElbow}>
                  <View style={styles.tonearmElbowJoint} />
                  <View style={styles.tonearmLowerBar} />
                  <View style={styles.tonearmHead}>
                    <View style={styles.tonearmStylus} />
                  </View>
                </View>
              </View>
            </>
          )}
        </PlaybackSeekBar>
        <View style={styles.deckMetersRow}>
          {renderDeckSignal('L')}
          <Pressable accessibilityRole="button" accessibilityLabel="Stop mix and return to start" style={styles.deckStop} onPress={onStopPlayback}>
            <MaterialIcons name="stop" size={18} color={theme.colors.text} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={startingPlayback ? 'Starting mix' : roomPlaying ? 'Pause mix' : 'Play mix'}
            accessibilityState={{ busy: startingPlayback, disabled: !mix.audio_url || startingPlayback }}
            disabled={!mix.audio_url || startingPlayback}
            style={styles.deckPlay}
            onPress={onTogglePlayback}
          >
            {startingPlayback
              ? <ActivityIndicator color="#1b1005" size="small" />
              : <MaterialIcons name={roomPlaying ? 'pause' : 'play-arrow'} size={28} color="#1b1005" />}
          </Pressable>
          {renderDeckSignal('R')}
        </View>
      </View>

      <View style={styles.nowSpinningCard}>
        <View style={styles.nowSpinningHead}>
          <Text style={styles.deckAcidLabel}>NOW SPINNING</Text>
          <Text style={styles.deckState}>MIX 01 / 01</Text>
        </View>
        <Text style={styles.selectorLine}>{`${selector}${mix.city ? ` · ${mix.city}` : ''}`.toUpperCase()}</Text>
        <View style={styles.nowSpinningIdentity}>
          <View style={styles.nowSpinningThumb}>
            {mix.cover_url ? <Image source={{ uri: mix.cover_url }} style={styles.nowSpinningThumbImage} /> : <MaterialIcons name="headphones" size={30} color={theme.colors.accentText} />}
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.nowSpinningTitle}>{mix.title || 'Untitled mix'}</Text>
            <Text style={styles.nowSpinningMeta}>{[selector, mix.city, bpm > 0 ? `${bpm} BPM` : 'BPM TBC'].filter(Boolean).join(' · ')}</Text>
          </View>
        </View>

        <View style={styles.wavePanel}>
          <View style={styles.waveHead}>
            <Text style={styles.waveLabel}>ROOM WAVEFORM</Text>
            <Text style={styles.waveLabel}>TIMESTAMPED TRACK IDS · COMMUNITY SYNCED</Text>
          </View>
          <View style={styles.waveBars}>
            {Array.from({ length: 42 }).map((_, index) => {
              const level = 8 + Math.abs(Math.sin((index + 2) * 1.17)) * 34;
              return <View key={index} style={[styles.waveBar, { height: level, backgroundColor: index / 42 <= playedRatio ? '#ff761c' : 'rgba(248,237,220,0.2)' }]} />;
            })}
          </View>
          <PlaybackSeekBar
            ratio={playedRatio}
            duration={roomDuration}
            position={roomSecond}
            onSeek={onSeekRatio}
            accessibilityLabel="Seek mix"
            style={styles.progressSeek}
            trackStyle={styles.progressRail}
            fillStyle={styles.progressFill}
            thumbStyle={styles.progressThumb}
          />
          <View style={styles.roomTimeRow}>
            <Text style={styles.roomTime}>{formatRoomTime(roomSecond)}</Text>
            <Text style={styles.roomTime}>{formatRoomTime(roomDuration)}</Text>
          </View>
        </View>

        <View style={styles.transportRow}>
          <Pressable accessibilityRole="button" accessibilityLabel="Rewind 15 seconds" style={styles.transportSmall} onPress={onRewind}>
            <MaterialIcons name="replay-10" size={22} color={theme.colors.text} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={roomPlaying ? 'Pause mix' : 'Play mix'} accessibilityState={{ disabled: !mix.audio_url }} disabled={!mix.audio_url} style={styles.transportPlay} onPress={onTogglePlayback}>
            <MaterialIcons name={roomPlaying ? 'pause' : 'play-arrow'} size={28} color={theme.colors.onAccent} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Forward 15 seconds" style={styles.transportSmall} onPress={onForward}>
            <MaterialIcons name="forward-10" size={22} color={theme.colors.text} />
          </Pressable>
        </View>

        <View style={styles.roomActionRow}>
          <Pressable accessibilityRole="button" accessibilityLabel="Save mix" accessibilityState={{ busy: saving }} style={styles.roomAction} onPress={onSave} disabled={saving}>
            <MaterialIcons name="favorite-border" size={18} color={theme.colors.text} />
            <Text style={styles.roomActionText}>{saving ? 'Saving' : 'Save'}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Request Track ID" accessibilityState={{ busy: requestBusy }} style={styles.roomAction} onPress={onRequestTrackId} disabled={requestBusy}>
            <MaterialIcons name="music-note" size={18} color={theme.colors.text} />
            <Text style={styles.roomActionText}>{requestBusy ? 'Requesting' : 'Request ID'}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Share mix" style={styles.roomAction} onPress={onShare}>
            <MaterialIcons name="ios-share" size={18} color={theme.colors.text} />
            <Text style={styles.roomActionText}>Share</Text>
          </Pressable>
        </View>
        {playbackError ? <Text accessibilityRole="alert" style={styles.playbackError}>{playbackError}</Text> : null}
      </View>

      <View style={styles.roomPanel}>
        <View style={styles.panelHead}>
          <Text style={styles.panelEyebrow}>TONIGHT'S SELECTION</Text>
          <Text style={styles.panelMeta}>REAL PUBLIC TRACKLIST</Text>
        </View>
        {tracklist.length === 0 ? <Text style={styles.emptyText}>No public tracklist yet.</Text> : null}
        {tracklist.map((item) => (
          <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`Jump to ${item.raw_title || `track ${item.position}`}`} onPress={() => onTrackPress(item)} style={styles.tracklistRow}>
            <Text style={styles.tracklistPosition}>{String(item.position).padStart(2, '0')}</Text>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.tracklistTitle} numberOfLines={1}>{item.raw_title || `Track ${item.position}`}</Text>
              <Text style={styles.tracklistArtist} numberOfLines={1}>{item.raw_artist || 'Artist not supplied'}</Text>
            </View>
            <Text style={styles.tracklistTime}>{formatRoomTime(item.start_seconds)}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.roomPanel}>
        <View style={styles.panelHead}>
          <Text style={styles.panelEyebrow}>ROOM PULSE</Text>
          <Text style={styles.panelMeta}>LIVE COMMUNITY</Text>
        </View>
        <View style={styles.pulseGrid}>
          {[
            ['PLAYS', formatCompact(mix.play_count)],
            ['SAVES', formatCompact(mix.save_count)],
            ['TRACKS', String(tracklist.length)],
            ['IDS', String(trackIdRequests.length)],
          ].map(([label, value]) => (
            <View key={label} style={styles.pulseCell}><Text style={styles.pulseValue}>{value}</Text><Text style={styles.pulseLabel}>{label}</Text></View>
          ))}
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Post mix to community" style={styles.communityPostButton} onPress={onPostToCommunity}>
          <MaterialIcons name="post-add" size={18} color={theme.colors.text} />
          <Text style={styles.communityPostText}>Post this room to Community</Text>
        </Pressable>
      </View>

      <View style={styles.roomPanel}>
        <View style={styles.panelHead}>
          <Text style={styles.panelEyebrow}>LISTENING ROOM</Text>
          <Text style={styles.panelMeta}>TIMESTAMPED LIVE CONVERSATION</Text>
        </View>
        {roomDataError ? <Text accessibilityRole="alert" style={styles.roomDataError}>{roomDataError}</Text> : null}
        <View style={styles.pinnedNote}>
          <Text style={styles.pinnedLabel}>PINNED BY CREATOR</Text>
          <Text style={styles.pinnedBody}>Drop timestamped reactions or request an ID at {formatRoomTime(roomSecond)}.</Text>
        </View>
        {comments.length === 0 ? (
          <Text style={styles.emptyText}>Authenticated listeners can start the room thread from the current timestamp.</Text>
        ) : comments.slice(0, 20).map((comment) => (
          <View key={comment.id} style={styles.commentRow}>
            <View style={styles.commentAvatar}><Text style={styles.commentAvatarText}>{(profileNames[comment.user_id] || 'P').slice(0, 1).toUpperCase()}</Text></View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={styles.commentMetaRow}>
                <Text style={styles.commentName}>{profileNames[comment.user_id] || 'PLUGGD listener'}</Text>
                <Text style={styles.commentTime}>{formatRoomTime(comment.timestamp_seconds || 0)}</Text>
              </View>
              <Text style={styles.commentBody}>{comment.body || ''}</Text>
            </View>
          </View>
        ))}

        <View style={styles.trackIdBox}>
          <Text style={styles.trackIdBoxTitle}>TRACK ID REQUESTS</Text>
          {trackIdRequests.length === 0 ? <Text style={styles.emptyText}>No Track ID requests yet.</Text> : trackIdRequests.slice(0, 8).map((request) => (
            <View key={request.id} style={styles.trackIdRow}>
              <Text style={styles.trackIdTime}>{formatRoomTime(request.timestamp_seconds)}</Text>
              <Text style={styles.trackIdStatus}>{request.status.toUpperCase()}</Text>
            </View>
          ))}
        </View>

        <View style={styles.commentComposer}>
          <TextInput
            value={commentValue}
            onChangeText={onCommentValueChange}
            placeholder="Add a timestamped room comment"
            placeholderTextColor={theme.colors.textMuted}
            style={styles.commentInput}
            multiline
            maxLength={500}
          />
          <Pressable accessibilityRole="button" accessibilityLabel="Post comment" accessibilityState={{ busy: commentBusy }} style={styles.commentSend} onPress={onPostComment} disabled={commentBusy || !commentValue.trim()}>
            {commentBusy ? <ActivityIndicator color={theme.colors.onAccent} size="small" /> : <Text style={styles.commentSendText}>Send</Text>}
          </Pressable>
        </View>
      </View>
    </>
  );
}

function useMixStyles() {
  const theme = usePluggdTheme();
  return useMemo(() => StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  roomScreen: { flex: 1, flexDirection: 'row', backgroundColor: theme.colors.background },
  roomArtPane: { width: '42%', backgroundColor: theme.colors.artworkBase, alignItems: 'center', justifyContent: 'center' },
  roomArt: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  roomBack: {
    position: 'absolute',
    top: 14,
    left: 14,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.mediaScrim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomPane: { flex: 1, paddingHorizontal: 28, paddingVertical: 20, justifyContent: 'center', gap: 8 },
  roomEyebrow: { fontFamily: edFonts.mono, fontSize: 10, letterSpacing: 2.2, color: theme.colors.accentText },
  roomTitle: { fontFamily: edFonts.serif, fontSize: 32, lineHeight: 35, color: theme.colors.text, letterSpacing: -0.5 },
  roomMeta: { fontFamily: edFonts.mono, fontSize: 9.5, letterSpacing: 1.6, color: theme.colors.textMuted },
  roomWaveRow: { flexDirection: 'row', alignItems: 'center', gap: 3, height: 48, marginTop: 12, overflow: 'hidden' },
  roomTimeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  roomTime: { fontFamily: edFonts.mono, fontSize: 10, color: theme.colors.textMuted, fontVariant: ['tabular-nums'] },
  roomControls: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 10 },
  roomPlay: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: theme.colors.accentFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomGhost: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: theme.colors.controlBorder,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomTracklist: { gap: 8, paddingTop: 14, paddingRight: 20 },
  roomTrackChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 44,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.controlBorder,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 13,
    maxWidth: 230,
  },
  roomTrackNumber: { fontFamily: edFonts.mono, fontSize: 9.5, color: theme.colors.accentText },
  roomTrackTitle: { fontFamily: pluggdFonts.satoshiBold, fontSize: 12.5, color: theme.colors.text, flexShrink: 1 },

  /* Portrait Listening Room — current mobile-web record-deck translation */
  portraitRoomHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  portraitRoomEyebrow: { fontFamily: edFonts.mono, fontSize: 9.5, lineHeight: 14, letterSpacing: 1.6, color: theme.colors.textSecondary },
  portraitRoomTitle: { marginTop: 4, fontFamily: edFonts.serif, fontSize: 27, lineHeight: 29, letterSpacing: -0.7, color: theme.colors.text },
  closeRoomButton: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center' },
  deckCard: { borderRadius: 20, borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surfaceRaised, padding: 14, overflow: 'hidden' },
  deckTopLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  deckAcidLabel: { fontFamily: edFonts.mono, fontSize: 10, letterSpacing: 1.5, color: theme.colors.accentText },
  deckState: { fontFamily: edFonts.mono, fontSize: 9.5, letterSpacing: 1.2, color: theme.colors.textMuted },
  turntableStage: { height: 304, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  vinyl: { width: 270, height: 270, borderRadius: 135, backgroundColor: '#050505', borderWidth: 2, borderColor: '#151515', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.72, shadowRadius: 20, shadowOffset: { width: 0, height: 12 } },
  vinylGrooveOuter: { position: 'absolute', width: 238, height: 238, borderRadius: 119, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  vinylGrooveInner: { position: 'absolute', width: 202, height: 202, borderRadius: 101, borderWidth: 1, borderColor: 'rgba(255,118,28,0.28)' },
  vinylLabel: { width: 94, height: 94, borderRadius: 47, overflow: 'hidden', backgroundColor: '#24140d', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,118,28,0.52)' },
  vinylLabelImage: { width: '100%', height: '100%' },
  vinylPin: { position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: '#d7c5ab', borderWidth: 1, borderColor: '#4e402f' },
  tonearmRest: { position: 'absolute', right: 11, top: 128, width: 18, height: 31, alignItems: 'center', zIndex: 1 },
  tonearmRestPost: { position: 'absolute', top: 5, width: 4, height: 26, borderRadius: 2, backgroundColor: '#5f554c' },
  tonearmRestCradle: { width: 18, height: 9, borderLeftWidth: 3, borderRightWidth: 3, borderBottomWidth: 3, borderColor: '#81766b', borderBottomLeftRadius: 5, borderBottomRightRadius: 5 },
  tonearm: { position: 'absolute', right: 8, top: 30, width: 78, height: 226, transformOrigin: '53px 22px' as any, zIndex: 2 },
  tonearmPivot: { position: 'absolute', left: 33, top: 2, width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: '#756a5f', backgroundColor: '#171411', zIndex: 1 },
  tonearmUpperBar: { position: 'absolute', left: 50, top: 22, width: 7, height: 96, borderRadius: 4, backgroundColor: '#928476', zIndex: 2 },
  tonearmElbow: { position: 'absolute', left: 42, top: 112, width: 24, height: 106, alignItems: 'center', transform: [{ rotate: '8deg' }], transformOrigin: '12px 0px' as any, zIndex: 2 },
  tonearmElbowJoint: { position: 'absolute', top: -1, width: 9, height: 9, borderRadius: 4.5, backgroundColor: '#928476', zIndex: 2 },
  tonearmLowerBar: { width: 7, height: 90, borderRadius: 4, backgroundColor: '#928476' },
  tonearmHead: { width: 26, height: 18, borderRadius: 6, backgroundColor: '#a89b7d', borderWidth: 2, borderColor: '#28231e', marginTop: -5 },
  tonearmStylus: { position: 'absolute', left: 11, bottom: -8, width: 2, height: 9, borderRadius: 1, backgroundColor: '#d7c5ab', transform: [{ rotate: '-8deg' }] },
  deckMetersRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 2 },
  vuMeter: { flex: 1, maxWidth: 108, height: 30, borderRadius: 7, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 8, paddingTop: 7, paddingBottom: 2 },
  vuTrack: { height: 5, borderRadius: 999, backgroundColor: '#251c18', overflow: 'hidden' },
  vuFill: { height: '100%', borderRadius: 999, overflow: 'hidden', transformOrigin: 'left center' as any },
  vuFillIdle: { width: '18%' },
  vuFillPlayingLeft: { width: '82%' },
  vuFillPlayingRight: { width: '68%' },
  vuLabel: { marginTop: 4, textAlign: 'center', fontFamily: edFonts.mono, fontSize: 8, lineHeight: 9, color: '#776f67' },
  deckStop: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center' },
  deckPlay: { width: 58, height: 58, borderRadius: 29, backgroundColor: theme.colors.accentFill, alignItems: 'center', justifyContent: 'center', shadowColor: '#ff761c', shadowOpacity: 0.34, shadowRadius: 10 },
  nowSpinningCard: { borderRadius: 20, borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surfaceRaised, padding: 14, gap: 13 },
  nowSpinningHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  selectorLine: { fontFamily: edFonts.mono, fontSize: 9.5, letterSpacing: 1.4, color: theme.colors.textSecondary, textAlign: 'center' },
  nowSpinningIdentity: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  nowSpinningThumb: { width: 82, height: 82, borderRadius: 7, overflow: 'hidden', backgroundColor: theme.colors.artworkBase, alignItems: 'center', justifyContent: 'center' },
  nowSpinningThumbImage: { width: '100%', height: '100%' },
  nowSpinningTitle: { fontFamily: edFonts.serif, fontSize: 24, lineHeight: 26, color: theme.colors.text, letterSpacing: -0.55 },
  nowSpinningMeta: { marginTop: 5, fontFamily: edFonts.bodyMedium, fontSize: 12.5, lineHeight: 18, color: theme.colors.textSecondary },
  wavePanel: { borderRadius: 12, backgroundColor: '#0d0a08', padding: 11, gap: 8 },
  waveHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  waveLabel: { flex: 1, fontFamily: edFonts.mono, fontSize: 8.5, lineHeight: 12, letterSpacing: 1.15, color: theme.colors.textMuted },
  waveBars: { height: 48, flexDirection: 'row', alignItems: 'center', gap: 2, overflow: 'hidden' },
  waveBar: { flex: 1, minWidth: 2, borderRadius: 1 },
  progressSeek: { height: 28, justifyContent: 'center' },
  progressRail: { height: 4, borderRadius: 2, backgroundColor: 'rgba(248,237,220,0.13)' },
  progressFill: { height: 4, minWidth: 3, borderRadius: 2, backgroundColor: '#ff761c' },
  progressThumb: { width: 13, height: 13, borderRadius: 6.5, backgroundColor: '#f8eddc', borderWidth: 2, borderColor: '#ff761c' },
  transportRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 15 },
  transportSmall: { width: 46, height: 46, borderRadius: 23, borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center' },
  transportPlay: { width: 58, height: 58, borderRadius: 29, backgroundColor: theme.colors.accentFill, alignItems: 'center', justifyContent: 'center' },
  roomActionRow: { flexDirection: 'row', gap: 8 },
  roomAction: { flex: 1, minWidth: 0, minHeight: 46, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 5, paddingHorizontal: 7 },
  roomActionText: { flexShrink: 1, fontFamily: edFonts.bodyBold, fontSize: 11, color: theme.colors.text, textAlign: 'center' },
  roomPanel: { borderRadius: 16, borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surface, padding: 14, gap: 12 },
  panelHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  panelEyebrow: { fontFamily: edFonts.mono, fontSize: 10, letterSpacing: 1.5, color: theme.colors.accentText },
  panelMeta: { flexShrink: 1, textAlign: 'right', fontFamily: edFonts.mono, fontSize: 8.5, letterSpacing: 1.1, color: theme.colors.textMuted },
  tracklistRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, borderColor: theme.colors.divider, paddingVertical: 8 },
  tracklistPosition: { width: 26, fontFamily: edFonts.mono, fontSize: 10, color: theme.colors.accentText },
  tracklistTitle: { fontFamily: edFonts.bodyBold, fontSize: 13, color: theme.colors.text },
  tracklistArtist: { marginTop: 2, fontFamily: edFonts.bodyMedium, fontSize: 11.5, color: theme.colors.textSecondary },
  tracklistTime: { fontFamily: edFonts.mono, fontSize: 9.5, color: theme.colors.textMuted },
  pulseGrid: { flexDirection: 'row', gap: 7 },
  pulseCell: { flex: 1, minWidth: 0, minHeight: 62, borderRadius: 10, backgroundColor: theme.colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  pulseValue: { fontFamily: edFonts.serif, fontSize: 21, color: theme.colors.text },
  pulseLabel: { marginTop: 3, fontFamily: edFonts.mono, fontSize: 8, letterSpacing: 1.1, color: theme.colors.textMuted },
  communityPostButton: { minHeight: 46, borderRadius: 9, borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surfaceRaised, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  communityPostText: { fontFamily: edFonts.bodyBold, fontSize: 12.5, color: theme.colors.text },
  roomDataError: { fontFamily: edFonts.bodyMedium, fontSize: 12.5, lineHeight: 18, color: theme.colors.danger },
  pinnedNote: { borderRadius: 10, borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surfaceRaised, padding: 12, gap: 4 },
  pinnedLabel: { fontFamily: edFonts.mono, fontSize: 8.5, letterSpacing: 1.2, color: theme.colors.accentText },
  pinnedBody: { fontFamily: edFonts.bodyMedium, fontSize: 12.5, lineHeight: 18, color: theme.colors.textSecondary },
  commentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderTopWidth: 1, borderColor: theme.colors.divider, paddingTop: 12 },
  commentAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: theme.colors.accentFill, alignItems: 'center', justifyContent: 'center' },
  commentAvatarText: { fontFamily: edFonts.bodyBlack, fontSize: 12, color: theme.colors.onAccent },
  commentMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  commentName: { flex: 1, fontFamily: edFonts.bodyBold, fontSize: 12.5, color: theme.colors.text },
  commentTime: { fontFamily: edFonts.mono, fontSize: 9, color: theme.colors.accentText },
  commentBody: { marginTop: 3, fontFamily: edFonts.bodyMedium, fontSize: 12.5, lineHeight: 18, color: theme.colors.textSecondary },
  trackIdBox: { borderRadius: 10, backgroundColor: theme.colors.surfaceRaised, padding: 11, gap: 8 },
  trackIdBoxTitle: { fontFamily: edFonts.mono, fontSize: 9, letterSpacing: 1.3, color: theme.colors.text },
  trackIdRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 32, borderTopWidth: 1, borderColor: theme.colors.divider },
  trackIdTime: { fontFamily: edFonts.mono, fontSize: 10, color: theme.colors.accentText },
  trackIdStatus: { fontFamily: edFonts.mono, fontSize: 9, letterSpacing: 1, color: theme.colors.textMuted },
  commentComposer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  commentInput: { flex: 1, minHeight: 48, maxHeight: 120, borderRadius: 9, borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surfaceRaised, paddingHorizontal: 11, paddingVertical: 10, fontFamily: edFonts.bodyMedium, fontSize: 13, color: theme.colors.text },
  commentSend: { minWidth: 66, minHeight: 48, borderRadius: 9, backgroundColor: theme.colors.accentFill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  commentSendText: { fontFamily: edFonts.bodyBlack, fontSize: 12, color: theme.colors.onAccent },

  content: { padding: 12, paddingTop: 52, paddingBottom: 220, gap: 14 },
  backButton: { width: 44, height: 44, borderRadius: 8, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.controlBorder, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  loading: { minHeight: 260, alignItems: 'center', justifyContent: 'center' },
  empty: { minHeight: 260, alignItems: 'center', justifyContent: 'center' },
  hero: { height: 310, borderRadius: 6, backgroundColor: theme.colors.artworkBase, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  heroImage: { width: '100%', height: '100%' },
  eyebrow: { color: theme.colors.accentText, fontSize: 12, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700', textTransform: 'uppercase', marginTop: 18 },
  title: { color: theme.colors.text, fontSize: 34, lineHeight: 39, fontFamily: pluggdFonts.displayExtraBold, fontWeight: '800', marginTop: 5 },
  subtitle: { color: theme.colors.textSecondary, fontSize: 16, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700', marginTop: 5 },
  description: { color: theme.colors.textSecondary, fontSize: 15, lineHeight: 22, fontFamily: pluggdFonts.satoshiMedium, fontWeight: '600', marginTop: 18 },
  buttonRow: { flexDirection: 'row', gap: 9, marginTop: 20 },
  primaryButton: { flex: 1.25, height: 54, borderRadius: 5, backgroundColor: theme.colors.accentFill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  playbackError: { color: theme.colors.danger, fontFamily: pluggdFonts.satoshiBold, fontSize: 12.5, lineHeight: 18, marginTop: 10 },
  primaryButtonText: { color: theme.colors.onAccent, fontSize: 16, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700' },
  secondaryButton: { flex: 0.75, height: 54, borderRadius: 5, borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  secondaryButtonText: { color: theme.colors.accentText, fontSize: 16, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700' },
  quickActions: { flexDirection: 'row', marginTop: 14, borderTopWidth: 1, borderBottomWidth: 1, borderColor: theme.colors.divider },
  quickActionButton: { minHeight: 48, flex: 1, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  quickActionText: { color: theme.colors.accentText, fontSize: 12, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  sectionTitle: { color: theme.colors.text, fontSize: 22, fontFamily: pluggdFonts.displayBold, fontWeight: '700', marginTop: 24, marginBottom: 11 },
  emptyText: { color: theme.colors.textMuted, fontSize: 14, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700' },
  }), [theme]);
}
