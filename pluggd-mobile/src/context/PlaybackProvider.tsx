/**
 * PlaybackProvider — global audio context wrapping react-native-track-player.
 *
 * Provides:
 *  - play / pause / skip / seek / queue management
 *  - current track metadata + progress + state
 *  - repeat & shuffle modes
 *  - playTrack() / playQueue() helpers for the rest of the app
 */
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import TrackPlayer, {
  Capability,
  Event,
  State,
  Track,
  RepeatMode,
  usePlaybackState,
  useProgress,
  useActiveTrack,
  useTrackPlayerEvents,
  AppKilledPlaybackBehavior,
  IOSCategory,
} from 'react-native-track-player';
import { Alert, AppState, Platform } from 'react-native';
import { transformedUri } from '../components/PluggdImage';
import { isConstrainedAndroidRuntime } from '../components/lowMemoryImagePolicy';
import { playbackSourceNeedsRefresh, resolvePlaybackTrack, type PlaybackSourceMetadata } from '../features/playback/resolvePlaybackSource';
import { createPlaybackErrorRecovery } from '../features/playback/playbackErrorRecovery';
import type { MixPlaybackAccess, MixSessionChange } from '../features/playback/mixAccessSession';
import { mixAccessSession } from '../features/playback/mixAccessSession';
import { isProtectedMix } from '../features/playback/protectedMixPlayback';
import { observeMixActor } from '../features/playback/observeMixActor';
import { runNativeQueueMutation } from '../features/playback/nativeQueueMutation';
import { beginNativePlaybackIntent, currentNativePlaybackIntent, nativePlaybackIntent, purgeInvalidPrivateMixes, refreshActivePrivateMix, selectNativeQueueEntry, stepNativeQueue } from '../features/playback/nativePlaybackControl';
import { nativeMixAccess } from '../features/playback/nativeMixAccess';
import { createPausedMixPresentation } from '../features/playback/pausedMixPresentation';
import { releaseAccessAlertButtons } from '../features/playback/releaseAccessFeedback';
import { hasCurrentPlaybackAccess, requiresPlaybackAccess } from '../features/playback/playbackAccess';
import { releaseAgeAccess, isReleaseTrack, releaseAccessMessage, type ReleasePlaybackAccess } from '../features/playback/releaseAgeAccess';
import { playbackServiceAttached, subscribePlaybackService } from '../features/playback/playbackServiceOwnership';

// ─── Types ────────────────────────────────────────────────────────────
export type PluggdTrackKind =
  | 'release'
  | 'beat'
  | 'sample_pack'
  | 'sample'
  | 'mix'
  | 'soundboard'
  | 'preview';

export type PluggdTrack = Omit<Track, 'type'> & {
  id: string;
  url: string;
  title: string;
  artist: string;
  artwork?: string;
  duration?: number;
  playbackSource?: PlaybackSourceMetadata;
  /** Memory-only age/access decision, invalid after an account change. */
  releaseAccess?: ReleasePlaybackAccess;
  /** Opaque memory-session permission only. Never a bearer token or stored queue. */
  mixAccess?: MixPlaybackAccess;
  /** Read-start time for the scoped cover/metadata grant; never persisted. */
  mixMetadataReadAt?: number;
  // Pluggd-specific metadata
  releaseId?: string;
  /** Canonical release-track identity for per-track waveform and lyrics. */
  trackId?: string;
  /** Single-track compatibility only; never copy release lyrics across a multi-track queue. */
  legacyLyrics?: string;
  beatId?: string;
  mixId?: string;
  samplePackId?: string;
  sampleId?: string;
  soundboardId?: string;
  soundboardItemId?: string;
  type?: PluggdTrackKind;
  sourceType?: PluggdTrackKind;
  isLocked?: boolean;
  creditsPrice?: number;
  price?: number;
  currency?: 'GBP' | 'credits' | string;
  purchaseRoute?: string;
  previewStart?: number;
  previewEnd?: number;
  backstageId?: string;
  backstageRoute?: string;
  backstageActiveCount?: number;
};

export type ShuffleMode = 'off' | 'on';

interface PlaybackContextType {
  // State
  isPlaying: boolean;
  isBuffering: boolean;
  isReady: boolean;
  currentTrack: PluggdTrack | null;
  mixMetadataRefreshing: boolean;
  refreshMixPresentation: () => Promise<void>;
  mixRecovery: { mixId: string; accessKey?: string } | null;
  progress: { position: number; duration: number; buffered: number };
  queue: PluggdTrack[];
  repeatMode: RepeatMode;
  shuffleMode: ShuffleMode;

  // Actions
  playTrack: (track: PluggdTrack, startAt?: number) => Promise<PluggdTrack | null>;
  playQueue: (tracks: PluggdTrack[], startIndex?: number) => Promise<PluggdTrack | null>;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  togglePlayPause: () => Promise<void>;
  skipToNext: () => Promise<void>;
  skipToPrevious: () => Promise<void>;
  skipToQueueIndex: (index: number) => Promise<void>;
  seekTo: (position: number) => Promise<void>;
  addToQueue: (track: PluggdTrack) => Promise<void>;
  clearQueue: () => Promise<void>;
  closePlayer: () => Promise<void>;
  toggleRepeat: () => Promise<void>;
  toggleShuffle: () => void;
}

const PlaybackContext = createContext<PlaybackContextType | undefined>(undefined);
const PlaybackTrackPresenceContext = createContext<boolean | undefined>(undefined);

export function resolvePlaybackDuration(reportedDuration: unknown, trackDuration: unknown): number {
  const reported = Number(reportedDuration);
  if (Number.isFinite(reported) && reported > 0) return reported;
  const supplied = Number(trackDuration);
  return Number.isFinite(supplied) && supplied > 0 ? supplied : 0;
}

// ─── Setup ────────────────────────────────────────────────────────────
let isPlayerSetup = false;
const CONSTRAINED_ANDROID_RUNTIME = isConstrainedAndroidRuntime(Platform.OS, Platform.Version);
const CONSTRAINED_PLAYBACK_ARTWORK_WIDTH = 192;

/**
 * Android 7 can give a normal app only 48 MB. TrackPlayer's notification
 * metadata loader otherwise decodes full-size cover uploads, and its default
 * 50-second forward buffer competes with an artwork-heavy screen. Keep the
 * public queue semantics while bounding only the native resources on API 24/25.
 */
export function trackForNativePlayback(track: PluggdTrack, constrained = CONSTRAINED_ANDROID_RUNTIME): PluggdTrack {
  if (!constrained || !track.artwork) return track;
  const artwork = transformedUri(track.artwork, CONSTRAINED_PLAYBACK_ARTWORK_WIDTH);
  return { ...track, artwork: artwork || undefined };
}

export function isPlayableTrack(track?: Partial<PluggdTrack> | null): track is PluggdTrack {
  if (!track || typeof track.url !== 'string' || !track.url.trim()) return false;
  try {
    const protocol = new URL(track.url.trim()).protocol.toLowerCase();
    return protocol === 'https:' || protocol === 'http:' || protocol === 'file:' || protocol === 'content:';
  } catch {
    return false;
  }
}

async function setupPlayer(): Promise<boolean> {
  if (isPlayerSetup) return true;
  try {
    await TrackPlayer.setupPlayer(
      CONSTRAINED_ANDROID_RUNTIME
        ? {
            minBuffer: 5,
            maxBuffer: 10,
            playBuffer: 1,
            backBuffer: 0,
            maxCacheSize: 0,
          }
        : Platform.OS === 'ios'
          ? {
              // Large published WAVs need a bounded forward buffer. Verify the
              // actual start time on the replacement iPhone build.
              minBuffer: 8,
              iosCategory: IOSCategory.Playback,
              autoHandleInterruptions: true,
            }
        : {
            // Preserve the modern-Android behavior.
            backBuffer: 30,
            iosCategory: IOSCategory.Playback,
            autoHandleInterruptions: true,
          },
    );
    await TrackPlayer.updateOptions({
      android: {
        appKilledPlaybackBehavior: AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
      },
      capabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
        Capability.SeekTo,
        Capability.Stop,
      ],
      compactCapabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
      ],
      // Lock screen / notification metadata is automatic from track data
    });
    isPlayerSetup = true;
    return true;
  } catch (e: any) {
    // Player already initialised (hot reload)
    if (e?.message?.includes('already been initialized')) {
      isPlayerSetup = true;
      return true;
    }
    console.error('[PlaybackProvider] setup failed:', e);
    return false;
  }
}

// ─── Provider ─────────────────────────────────────────────────────────
export function PlaybackProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [progressInterval, setProgressInterval] = useState(() => AppState.currentState === 'active' ? 250 : 1000);
  const [queue, setQueue] = useState<PluggdTrack[]>([]);
  const [shuffleMode, setShuffleMode] = useState<ShuffleMode>('off');
  const [repeatMode, setRepeatModeState] = useState<RepeatMode>(RepeatMode.Off);
  const [privateControlPending, setPrivateControlPending] = useState(false);
  const [serviceAttached, setServiceAttached] = useState(playbackServiceAttached);
  const privateOperations = useRef(new Set<number>());
  const privateOperationId = useRef(0);
  const [mixMetadataRefreshing, setMixMetadataRefreshing] = useState(false);
  const [, notifyMixPresentation] = useState(0);
  const [mixRecovery, setMixRecovery] = useState<{ mixId: string; accessKey?: string; scope: MixPlaybackAccess['scope']; ticket: number } | null>(null);
  const pendingPrivateFailure = useRef(false);
  const reportPrivateFailure = useCallback(() => {
    if (AppState.currentState !== 'active') { pendingPrivateFailure.current = true; return; }
    pendingPrivateFailure.current = false;
    Alert.alert('Mix unavailable', 'Access to this mix could not be refreshed. Open the mix page to try again.');
  }, []);
  const beginControl = useCallback(() => {
    setMixRecovery(null);
    pendingPrivateFailure.current = false;
    privateOperations.current.clear();
    setPrivateControlPending(false);
    return beginNativePlaybackIntent();
  }, []);
  const withPrivateControl = useCallback(async (operation: () => Promise<boolean>) => {
    const id = ++privateOperationId.current;
    privateOperations.current.add(id);
    setPrivateControlPending(true);
    try { return await operation(); }
    finally { privateOperations.current.delete(id); setPrivateControlPending(privateOperations.current.size > 0); }
  }, []);
  const originalQueue = useRef<PluggdTrack[]>([]);
  const playbackRequestRef = useRef(0);
  const pendingPrivateRequest = useRef<number | null>(null);
  const activeTrackRef = useRef<PluggdTrack | null>(null);
  const retainedPosition = useRef({ trackId: '', position: 0, seekTarget: null as number | null, seekStartedAt: 0 });
  const pausedPresentation = useRef<ReturnType<typeof createPausedMixPresentation> | null>(null);
  const recoveryRef = useRef<ReturnType<typeof createPlaybackErrorRecovery> | null>(null);
  if (!recoveryRef.current) {
    recoveryRef.current = createPlaybackErrorRecovery({
      player: TrackPlayer,
      isForeground: () => AppState.currentState === 'active',
      refreshSource: (track) => resolvePlaybackTrack(track as PluggdTrack),
      needsSourceRefresh: (track) => playbackSourceNeedsRefresh(track as PluggdTrack),
      onSourceRefreshed: (previous, next, index) => {
        setQueue((current) => current.map((track, itemIndex) => itemIndex === index && track.id === previous.id && track.url === previous.url
          ? { ...track, ...(next as PluggdTrack) }
          : track));
        originalQueue.current = originalQueue.current.map((track) => track.id === previous.id && track.url === previous.url
          ? { ...track, ...(next as PluggdTrack) }
          : track);
      },
      reportFailure: () => Alert.alert(
        'Audio unavailable',
        'Playback could not recover. Your queue has been kept. Tap play to try again, or choose another track.',
      ),
    });
  }
  const recovery = recoveryRef.current;

  const playbackState = usePlaybackState();
  // Background snapshots retain recovery position without refreshing every mounted screen at 4 Hz.
  // Native playback and lock-screen progress do not depend on this UI polling interval.
  const progress = useProgress(progressInterval);
  const activeTrack = useActiveTrack();
  activeTrackRef.current = (activeTrack as PluggdTrack) ?? null;
  const positionSnapshot = retainedPosition.current;
  const activeId = String(activeTrack?.id ?? '');
  if (positionSnapshot.trackId !== activeId) {
    positionSnapshot.trackId = activeId;
    positionSnapshot.position = 0;
    positionSnapshot.seekTarget = null;
  }
  if (positionSnapshot.seekTarget !== null) {
    // A background sample can arrive after playback has moved beyond the target.
    // Allow elapsed playback time, while rejecting stale samples far ahead of a new seek.
    const elapsed = Math.max(0, performance.now() - positionSnapshot.seekStartedAt) / 1000;
    if (Number.isFinite(progress.position)
      && progress.position >= positionSnapshot.seekTarget - 0.5
      && progress.position <= positionSnapshot.seekTarget + elapsed + 0.5) {
      positionSnapshot.position = progress.position;
      positionSnapshot.seekTarget = null;
    }
  } else if (Number.isFinite(progress.position) && progress.position > 0) {
    positionSnapshot.position = progress.position;
  }

  const isPlaying = playbackState.state === State.Playing;
  const isBuffering =
    playbackState.state === State.Buffering ||
    playbackState.state === State.Loading || privateControlPending;

  useTrackPlayerEvents([
    Event.PlaybackError, Event.PlaybackState, Event.PlaybackActiveTrackChanged,
    Event.RemotePlay, Event.RemotePause, Event.RemoteStop,
    Event.RemoteNext, Event.RemotePrevious, Event.RemoteSeek,
  ], (event) => {
    if ([Event.RemotePlay, Event.RemotePause, Event.RemoteStop, Event.RemoteNext, Event.RemotePrevious, Event.RemoteSeek].includes(event.type as any)) {
      pendingPrivateFailure.current = false;
      privateOperations.current.clear();
      setPrivateControlPending(false);
    }
    if (event.type === Event.PlaybackError) {
      console.warn('[PlaybackProvider] playback unavailable:', event.code);
      recovery.onError(event, activeTrack, retainedPosition.current.position);
    } else if (event.type === Event.PlaybackState) {
      recovery.onState(event.state);
    } else if (event.type === Event.RemotePause || event.type === Event.RemoteStop) {
      playbackRequestRef.current++;
      recovery.cancel(false);
    } else if (event.type === Event.PlaybackActiveTrackChanged) {
      recovery.onTrackChanged(event);
      void syncQueue();
    } else {
      playbackRequestRef.current++;
      recovery.cancel();
    }
  });

  useEffect(() => subscribePlaybackService(() => setServiceAttached(playbackServiceAttached())), []);
  useEffect(() => {
    recovery.watchSource(serviceAttached && requiresPlaybackAccess(activeTrack as PluggdTrack) ? null : activeTrack, isPlaying);
  }, [activeTrack, isPlaying, recovery, serviceAttached]);
  useEffect(() => observeMixActor(), []);
  useEffect(() => {
    const stopObserving = releaseAgeAccess.observe();
    const unsubscribe = releaseAgeAccess.subscribe(reason => {
      const invalidActive = isReleaseTrack(activeTrackRef.current) && !hasCurrentPlaybackAccess(activeTrackRef.current);
      const invalidQueued = originalQueue.current.some(track => isReleaseTrack(track) && !hasCurrentPlaybackAccess(track));
      if (!invalidActive && !invalidQueued) return;
      if (invalidActive) {
        playbackRequestRef.current++;
        beginNativePlaybackIntent();
        recovery.cancel(false);
        if (reason === 'authorization' && AppState.currentState === 'active') {
          accessFailureRequest.current = playbackRequestRef.current;
          Alert.alert('Music unavailable', 'Access to this music could not be checked. Open the release page and try again.');
        }
      }
      setQueue(current => current.filter(hasCurrentPlaybackAccess));
      originalQueue.current = originalQueue.current.filter(hasCurrentPlaybackAccess);
      void purgeInvalidPrivateMixes(TrackPlayer).then(setQueue).catch(() => TrackPlayer.pause().catch(() => undefined));
    });
    return () => { unsubscribe(); stopObserving(); };
  }, [recovery]);

  useEffect(() => {
    if (!isReady) return;
    let mounted = true;
    const purgeInvalidMixes = (reason?: MixSessionChange) => {
      if (reason === 'identity') { pendingPrivateFailure.current = false; setMixRecovery(null); }
      privateOperations.current.clear();
      setPrivateControlPending(false);
      const pendingPrivate = pendingPrivateRequest.current === playbackRequestRef.current;
      if (pendingPrivate) playbackRequestRef.current++;
      const invalidActive = isProtectedMix(activeTrackRef.current) && !hasCurrentPlaybackAccess(activeTrackRef.current);
      if (invalidActive) {
        recovery.cancel(false);
      }
      if (reason === 'authorization' && (invalidActive || pendingPrivate)) reportPrivateFailure();
      // Hide stale metadata immediately, independently of native bridge latency.
      setQueue(current => current.filter(hasCurrentPlaybackAccess));
      originalQueue.current = originalQueue.current.filter(hasCurrentPlaybackAccess);
      void purgeInvalidPrivateMixes(TrackPlayer).then(tracks => {
        if (mounted) setQueue(tracks);
      }).catch(async () => {
        // If native removal fails, do not leave a private item able to advance
        // silently. Retain the public queue for recovery rather than reset it.
        await TrackPlayer.pause().catch(() => undefined);
        if (mounted) reportPrivateFailure();
      });
    };
    const unsubscribe = mixAccessSession.subscribe(purgeInvalidMixes);
    purgeInvalidMixes();
    return () => { mounted = false; unsubscribe(); };
  }, [isReady, recovery, reportPrivateFailure]);

  useEffect(() => {
    recovery.activate();
    const subscription = AppState.addEventListener('change', state => {
      setProgressInterval(state === 'active' ? 250 : 1000);
      pausedPresentation.current?.foregroundChanged();
      recovery.showPendingFailure();
      if (state === 'active' && pendingPrivateFailure.current) reportPrivateFailure();
    });
    return () => {
      subscription.remove();
      recovery.dispose();
    };
  }, [recovery, reportPrivateFailure]);

  useEffect(() => {
    const watcher = createPausedMixPresentation({
      player: TrackPlayer,
      isForeground: () => AppState.currentState === 'active',
      prepareTrack: trackForNativePlayback,
      onUpdated: () => notifyMixPresentation(value => value + 1),
      onPending: setMixMetadataRefreshing,
      onFailure: track => {
        if (!track.mixAccess || !hasCurrentPlaybackAccess(track)) return;
        setMixRecovery({ mixId: track.mixId || track.id, scope: track.mixAccess.scope,
          ...(track.mixAccess.accessKey ? { accessKey: track.mixAccess.accessKey } : {}), ticket: nativePlaybackIntent() });
      },
    });
    pausedPresentation.current = watcher;
    return () => { pausedPresentation.current = null; watcher.dispose(); };
  }, []);
  useEffect(() => { pausedPresentation.current?.watch((activeTrack as PluggdTrack) ?? null, isPlaying); }, [activeTrack, isPlaying]);
  const refreshMixPresentation = useCallback(() => pausedPresentation.current?.refresh() ?? Promise.resolve(), []);

  // Initialise player
  useEffect(() => {
    let mounted = true;
    setupPlayer().then((ok) => {
      if (mounted && ok) setIsReady(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Keep queue state in sync
  const syncQueue = useCallback(async () => {
    try {
      const q = await TrackPlayer.getQueue();
      setQueue((q as PluggdTrack[]).filter(hasCurrentPlaybackAccess));
    } catch {
      // player not ready yet
    }
  }, []);

  const accessFailureRequest = useRef<number | null>(null);
  const resolveTrackWithFeedback = async (track: PluggdTrack) => {
    const request = playbackRequestRef.current;
    try { return await resolvePlaybackTrack(track); }
    catch (error) {
      if (request === playbackRequestRef.current && accessFailureRequest.current !== request) {
        accessFailureRequest.current = playbackRequestRef.current;
        Alert.alert('Music unavailable', releaseAccessMessage(error), releaseAccessAlertButtons(error));
      }
      return null;
    }
  };

  // ─── Actions ──────────────────────────────────────────────────
  const playTrack = useCallback(
    async (track: PluggdTrack, startAt = 0) => {
      if (!isReady) return null;
      if (!Number.isFinite(startAt) || startAt < 0) return null;
      beginControl();
      recovery.cancel();
      const request = ++playbackRequestRef.current;
      pendingPrivateRequest.current = requiresPlaybackAccess(track) ? request : null;
      retainedPosition.current.position = startAt;
      retainedPosition.current.seekTarget = startAt;
      retainedPosition.current.seekStartedAt = performance.now();
      const playable = await resolveTrackWithFeedback(track);
      if (request !== playbackRequestRef.current) {
        if (pendingPrivateRequest.current === request) pendingPrivateRequest.current = null;
        return null;
      }
      if (!isPlayableTrack(playable)) {
        if (pendingPrivateRequest.current === request) pendingPrivateRequest.current = null;
        if (accessFailureRequest.current !== request) Alert.alert('Audio unavailable', track.url?.trim()
          ? 'This audio cannot be reached right now. Please try again.'
          : 'This item does not include a playable audio upload.');
        return null;
      }
      return runNativeQueueMutation(async () => {
        if (request !== playbackRequestRef.current || !hasCurrentPlaybackAccess(playable)) return null;
        await TrackPlayer.reset();
        if (request !== playbackRequestRef.current || !hasCurrentPlaybackAccess(playable)) return null;
        const nativeTrack = trackForNativePlayback(playable);
        await TrackPlayer.add(nativeTrack as any);
        if (request !== playbackRequestRef.current || !hasCurrentPlaybackAccess(nativeTrack)) return null;
        if (startAt > 0) await TrackPlayer.seekTo(startAt);
        if (request !== playbackRequestRef.current || !hasCurrentPlaybackAccess(nativeTrack)) return null;
        originalQueue.current = [nativeTrack];
        await TrackPlayer.play();
        await syncQueue();
        return ((await TrackPlayer.getActiveTrack()) as PluggdTrack | undefined) ?? null;
      }).finally(() => { if (pendingPrivateRequest.current === request) pendingPrivateRequest.current = null; });
    },
    [isReady, recovery, syncQueue, beginControl],
  );

  const playQueue = useCallback(
    async (tracks: PluggdTrack[], startIndex = 0) => {
      if (!isReady || tracks.length === 0) return null;
      beginControl();
      recovery.cancel();
      const request = ++playbackRequestRef.current;
      pendingPrivateRequest.current = tracks.some(requiresPlaybackAccess) ? request : null;
      retainedPosition.current.position = 0;
      retainedPosition.current.seekTarget = 0;
      retainedPosition.current.seekStartedAt = performance.now();
      const requestedTrack = tracks[Math.min(Math.max(startIndex, 0), tracks.length - 1)] ?? null;
      const resolved = await Promise.all(tracks.map((track) => resolveTrackWithFeedback(track)));
      if (request !== playbackRequestRef.current) {
        if (pendingPrivateRequest.current === request) pendingPrivateRequest.current = null;
        return null;
      }
      const playableTracks = resolved.filter(isPlayableTrack).filter(hasCurrentPlaybackAccess).map((track) => trackForNativePlayback(track));
      if (requestedTrack && !resolved[tracks.indexOf(requestedTrack)]) {
        if (accessFailureRequest.current !== request) Alert.alert('Audio unavailable', 'This track could not be started. Please try again.');
        if (pendingPrivateRequest.current === request) pendingPrivateRequest.current = null;
        return null;
      }
      if (playableTracks.length === 0) {
        if (pendingPrivateRequest.current === request) pendingPrivateRequest.current = null;
        Alert.alert('Audio unavailable', tracks.some((track) => track.url?.trim())
          ? 'These audio previews cannot be reached right now. Please try again.'
          : 'These items do not include playable audio uploads.');
        return null;
      }
      const requestedIndex = requestedTrack
        ? playableTracks.findIndex((track) => track.id === requestedTrack.id)
        : -1;
      const safeStartIndex = requestedIndex >= 0
        ? requestedIndex
        : Math.min(Math.max(startIndex, 0), playableTracks.length - 1);
      return runNativeQueueMutation(async () => {
        if (request !== playbackRequestRef.current || playableTracks.some(track => !hasCurrentPlaybackAccess(track))) return null;
        originalQueue.current = playableTracks;
        await TrackPlayer.reset();
        if (request !== playbackRequestRef.current || playableTracks.some(track => !hasCurrentPlaybackAccess(track))) return null;
        await TrackPlayer.add(playableTracks as any);
        if (request !== playbackRequestRef.current || playableTracks.some(track => !hasCurrentPlaybackAccess(track))) return null;
        if (safeStartIndex > 0) await TrackPlayer.skip(safeStartIndex);
        if (request !== playbackRequestRef.current) return null;
        await TrackPlayer.play();
        await syncQueue();
        return ((await TrackPlayer.getActiveTrack()) as PluggdTrack | undefined) ?? null;
      }).finally(() => { if (pendingPrivateRequest.current === request) pendingPrivateRequest.current = null; });
    },
    [isReady, recovery, syncQueue, beginControl],
  );

  const play = useCallback(async () => {
    const ticket = beginControl();
    playbackRequestRef.current++;
    recovery.cancel();
    const active = activeTrackRef.current;
    if (requiresPlaybackAccess(active) && active) {
      const allowed = await withPrivateControl(() => refreshActivePrivateMix(TrackPlayer, active, ticket, undefined, true));
      if (allowed && currentNativePlaybackIntent(ticket) && hasCurrentPlaybackAccess(active)) await TrackPlayer.play();
      await syncQueue();
      return;
    }
    await TrackPlayer.play();
  }, [recovery, beginControl, withPrivateControl, syncQueue]);

  const pause = useCallback(async () => {
    beginControl();
    playbackRequestRef.current++;
    recovery.cancel(false);
    await TrackPlayer.pause();
  }, [recovery, beginControl]);

  const togglePlayPause = useCallback(async () => {
    const ticket = beginControl();
    playbackRequestRef.current++;
    recovery.cancel(!isPlaying);
    if (isPlaying) {
      await TrackPlayer.pause();
    } else {
      const active = activeTrackRef.current;
      if (requiresPlaybackAccess(active) && active) {
        const allowed = await withPrivateControl(() => refreshActivePrivateMix(TrackPlayer, active, ticket, undefined, true));
        if (allowed && currentNativePlaybackIntent(ticket) && hasCurrentPlaybackAccess(active)) await TrackPlayer.play();
        await syncQueue();
        return;
      }
      await TrackPlayer.play();
    }
  }, [isPlaying, recovery, beginControl, withPrivateControl, syncQueue]);

  const skipToNext = useCallback(async () => {
    const ticket = beginControl();
    playbackRequestRef.current++;
    retainedPosition.current.position = 0;
    retainedPosition.current.seekTarget = 0;
    retainedPosition.current.seekStartedAt = performance.now();
    recovery.cancel();
    if (queue.some(requiresPlaybackAccess)) {
      await withPrivateControl(() => stepNativeQueue(TrackPlayer, 1, ticket));
      await syncQueue();
      return;
    }
    try {
      await TrackPlayer.skipToNext();
    } catch {
      // Already at last track
    }
  }, [recovery, queue, beginControl, withPrivateControl, syncQueue]);

  const skipToPrevious = useCallback(async () => {
    const ticket = beginControl();
    playbackRequestRef.current++;
    retainedPosition.current.position = 0;
    retainedPosition.current.seekTarget = 0;
    retainedPosition.current.seekStartedAt = performance.now();
    recovery.cancel();
    if (queue.some(requiresPlaybackAccess)) {
      await withPrivateControl(() => stepNativeQueue(TrackPlayer, -1, ticket));
      await syncQueue();
      return;
    }
    // If more than 3s in, restart current track instead
    if (progress.position > 3) {
      await TrackPlayer.seekTo(0);
    } else {
      try {
        await TrackPlayer.skipToPrevious();
      } catch {
        // Already at first track
        await TrackPlayer.seekTo(0);
      }
    }
  }, [progress.position, recovery, queue, beginControl, withPrivateControl, syncQueue]);

  const skipToQueueIndex = useCallback(async (index: number) => {
    if (!Number.isInteger(index) || index < 0) return;
    const expected = queue.filter(hasCurrentPlaybackAccess)[index];
    if (!expected) return;
    const ticket = beginControl();
    playbackRequestRef.current++;
    retainedPosition.current.position = 0;
    retainedPosition.current.seekTarget = 0;
    retainedPosition.current.seekStartedAt = performance.now();
    recovery.cancel();
    const select = () => selectNativeQueueEntry(TrackPlayer, index, ticket, true, expected);
    if (requiresPlaybackAccess(expected)) await withPrivateControl(select);
    else await select();
    await syncQueue();
  }, [recovery, queue, beginControl, withPrivateControl, syncQueue]);

  const seekTo = useCallback(async (position: number) => {
    if (!Number.isFinite(position) || position < 0) return;
    const ticket = beginControl();
    playbackRequestRef.current++;
    recovery.cancel();
    retainedPosition.current.position = position;
    retainedPosition.current.seekTarget = position;
    retainedPosition.current.seekStartedAt = performance.now();
    const active = activeTrackRef.current;
    if (requiresPlaybackAccess(active) && active) {
      await withPrivateControl(() => refreshActivePrivateMix(TrackPlayer, active, ticket, position, true));
      await syncQueue();
      return;
    }
    await TrackPlayer.seekTo(position);
  }, [recovery, beginControl, withPrivateControl, syncQueue]);

  const addToQueue = useCallback(
    async (track: PluggdTrack) => {
      if (!isReady) return;
      const playable = await resolveTrackWithFeedback(track);
      if (!isPlayableTrack(playable) || !hasCurrentPlaybackAccess(playable)) return;
      await runNativeQueueMutation(async () => {
        if (!hasCurrentPlaybackAccess(playable)) return;
        await TrackPlayer.add(trackForNativePlayback(playable) as any);
        await syncQueue();
      });
    },
    [isReady, syncQueue],
  );

  const clearQueue = useCallback(async () => {
    beginControl();
    recovery.cancel(false);
    playbackRequestRef.current += 1;
    await runNativeQueueMutation(async () => {
      await TrackPlayer.reset();
      setQueue([]);
      originalQueue.current = [];
    });
  }, [recovery, beginControl]);

  const closePlayer = useCallback(async () => {
    beginControl();
    recovery.cancel(false);
    playbackRequestRef.current += 1;
    await runNativeQueueMutation(async () => {
      await TrackPlayer.reset();
      setQueue([]);
      originalQueue.current = [];
    });
  }, [recovery, beginControl]);

  const toggleRepeat = useCallback(async () => {
    const ticket = nativePlaybackIntent();
    const active = activeTrackRef.current;
    if (requiresPlaybackAccess(active) && active) {
      recovery.cancel();
      if (!await withPrivateControl(() => refreshActivePrivateMix(TrackPlayer, active, ticket, undefined, true))) return;
      await syncQueue();
    }
    const current = await TrackPlayer.getRepeatMode();
    if (!currentNativePlaybackIntent(ticket) || (requiresPlaybackAccess(active) && !hasCurrentPlaybackAccess(active))) return;
    const next =
      current === RepeatMode.Off
        ? RepeatMode.Queue
        : current === RepeatMode.Queue
          ? RepeatMode.Track
          : RepeatMode.Off;
    await TrackPlayer.setRepeatMode(next);
    setRepeatModeState(next);
  }, [recovery, withPrivateControl, syncQueue]);

  const toggleShuffle = useCallback(async () => {
    if (!isReady) return;
    const ticket = beginControl();
    const request = ++playbackRequestRef.current;
    recovery.cancel();
    const nextMode = shuffleMode === 'off' ? 'on' : 'off';

    const active = (await TrackPlayer.getActiveTrack()) as PluggdTrack | undefined;
    if (request !== playbackRequestRef.current || !currentNativePlaybackIntent(ticket)) return;
    const source = nextMode === 'on' ? [...queue] : [...originalQueue.current];
    if (!active || source.length <= 1) { setShuffleMode(nextMode); return; }

    const currentIndex = source.findIndex((track) => track.id === active.id);
    const withoutActive = source.filter((track) => track.id !== active.id);
    let nextQueue =
      nextMode === 'on'
        ? [
            active,
            ...withoutActive
              .map((track) => ({ track, sort: Math.random() }))
              .sort((a, b) => a.sort - b.sort)
              .map(({ track }) => track),
          ]
        : source;

    if (nextQueue.some(requiresPlaybackAccess)) {
      pendingPrivateRequest.current = request;
      const allowed = await withPrivateControl(async () => {
        const resolved = await Promise.all(nextQueue.map(track => requiresPlaybackAccess(track) ? resolveTrackWithFeedback(track) : Promise.resolve(track)));
        if (resolved.some(track => !track || !hasCurrentPlaybackAccess(track))) return false;
        nextQueue = resolved as PluggdTrack[];
        return true;
      });
      if (!allowed) {
        if (pendingPrivateRequest.current === request) pendingPrivateRequest.current = null;
        return;
      }
    }
    await runNativeQueueMutation(async () => {
      if (request !== playbackRequestRef.current || !currentNativePlaybackIntent(ticket) || nextQueue.some(track => !hasCurrentPlaybackAccess(track))) return;
      const [position, wants] = await Promise.all([TrackPlayer.getProgress(), TrackPlayer.getPlayWhenReady()]);
      if (request !== playbackRequestRef.current || !currentNativePlaybackIntent(ticket) || nextQueue.some(track => !hasCurrentPlaybackAccess(track))) return;
      const preservedPosition = Number.isFinite(position.position) ? Math.max(0, position.position) : 0;
      retainedPosition.current.position = preservedPosition;
      retainedPosition.current.seekTarget = preservedPosition;
      await TrackPlayer.reset();
      if (request !== playbackRequestRef.current || !currentNativePlaybackIntent(ticket) || nextQueue.some(track => !hasCurrentPlaybackAccess(track))) return;
      await TrackPlayer.add(nextQueue as any);
      if (request !== playbackRequestRef.current || !currentNativePlaybackIntent(ticket) || nextQueue.some(track => !hasCurrentPlaybackAccess(track))) return;
      await TrackPlayer.skip(nextMode === 'on' ? 0 : Math.max(currentIndex, 0));
      if (request !== playbackRequestRef.current || !currentNativePlaybackIntent(ticket)) return;
      await TrackPlayer.seekTo(preservedPosition);
      if (request !== playbackRequestRef.current || !currentNativePlaybackIntent(ticket)) return;
      if (wants) await TrackPlayer.play();
      originalQueue.current = originalQueue.current.map(track => nextQueue.find(next => next.id === track.id && next.mixAccess?.authorizationId === track.mixAccess?.authorizationId) ?? track);
      setShuffleMode(nextMode);
      await syncQueue();
    }).finally(() => { if (pendingPrivateRequest.current === request) pendingPrivateRequest.current = null; });
  }, [isReady, queue, recovery, shuffleMode, syncQueue, beginControl, withPrivateControl]);

  const presentationFor = (track: PluggdTrack): PluggdTrack => {
    if (!track.mixAccess) return track;
    const cached = nativeMixAccess.presentation(track.mixId || track.id, track.mixAccess);
    const current = cached && cached.mixMetadataReadAt >= (track.mixMetadataReadAt ?? 0) ? { ...track, ...cached } : track;
    const at = current.mixMetadataReadAt;
    if (typeof at !== 'number' || !Number.isFinite(at) || at > Date.now() || Date.now() - at >= 300_000) {
      return { ...current, title: 'Private mix', artist: 'PLUGGD', artwork: undefined, duration: undefined };
    }
    return current;
  };
  const currentTrack = activeTrack && hasCurrentPlaybackAccess(activeTrack as PluggdTrack) ? presentationFor(activeTrack as PluggdTrack) : null;
  const recoveryMix = mixRecovery && mixAccessSession.current(mixRecovery.scope) && currentNativePlaybackIntent(mixRecovery.ticket)
    ? { mixId: mixRecovery.mixId, ...(mixRecovery.accessKey ? { accessKey: mixRecovery.accessKey } : {}) } : null;
  // Some long-form uploads do not expose their duration through AVPlayer until
  // after buffering. Keep progress tied to the real position while using the
  // catalogue duration as the truthful fallback instead of presenting a fake,
  // frozen percentage in the UI.
  const progressDuration = resolvePlaybackDuration(progress.duration, currentTrack?.duration);

  return (
    <PlaybackContext.Provider
      value={{
        isPlaying,
        isBuffering,
        isReady,
        currentTrack,
        mixMetadataRefreshing,
        refreshMixPresentation,
        mixRecovery: recoveryMix,
        progress: {
          position: progress.position,
          duration: progressDuration,
          buffered: progress.buffered,
        },
        queue: queue.some(isProtectedMix) ? queue.filter(hasCurrentPlaybackAccess).map(presentationFor) : queue,
        repeatMode,
        shuffleMode,
        playTrack,
        playQueue,
        play,
        pause,
        togglePlayPause,
        skipToNext,
        skipToPrevious,
        skipToQueueIndex,
        seekTo,
        addToQueue,
        clearQueue,
        closePlayer,
        toggleRepeat,
        toggleShuffle,
      }}
    >
      <PlaybackTrackPresenceContext.Provider value={Boolean(currentTrack)}>
        {children}
      </PlaybackTrackPresenceContext.Provider>
    </PlaybackContext.Provider>
  );
}

export function usePlayback() {
  const ctx = useContext(PlaybackContext);
  if (!ctx) throw new Error('usePlayback must be used within PlaybackProvider');
  return ctx;
}

// Layout only needs to know whether to reserve space for the player, not its clock.
export function useHasPlaybackTrack() {
  const present = useContext(PlaybackTrackPresenceContext);
  if (present === undefined) throw new Error('useHasPlaybackTrack must be used within PlaybackProvider');
  return present;
}
