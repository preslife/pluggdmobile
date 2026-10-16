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
  progress: { position: number; duration: number; buffered: number };
  queue: PluggdTrack[];
  repeatMode: RepeatMode;
  shuffleMode: ShuffleMode;

  // Actions
  playTrack: (track: PluggdTrack) => Promise<PluggdTrack | null>;
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
  const [queue, setQueue] = useState<PluggdTrack[]>([]);
  const [shuffleMode, setShuffleMode] = useState<ShuffleMode>('off');
  const [repeatMode, setRepeatModeState] = useState<RepeatMode>(RepeatMode.Off);
  const originalQueue = useRef<PluggdTrack[]>([]);
  const playbackRequestRef = useRef(0);
  const retainedPosition = useRef({ trackId: '', position: 0, seekTarget: null as number | null });
  const recoveryRef = useRef<ReturnType<typeof createPlaybackErrorRecovery> | null>(null);
  if (!recoveryRef.current) {
    recoveryRef.current = createPlaybackErrorRecovery({
      player: TrackPlayer,
      isForeground: () => AppState.currentState === 'active',
      refreshSource: (track) => resolvePlaybackTrack(track as PluggdTrack),
      needsSourceRefresh: (track) => playbackSourceNeedsRefresh(track as PluggdTrack),
      onSourceRefreshed: (previous, next, index) => {
        setQueue((current) => current.map((track, itemIndex) => itemIndex === index && track.id === previous.id && track.url === previous.url
          ? { ...track, url: next.url, playbackSource: next.playbackSource }
          : track));
        originalQueue.current = originalQueue.current.map((track) => track.id === previous.id && track.url === previous.url
          ? { ...track, url: next.url, playbackSource: next.playbackSource }
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
  const progress = useProgress(250); // update every 250ms
  const activeTrack = useActiveTrack();
  const positionSnapshot = retainedPosition.current;
  const activeId = String(activeTrack?.id ?? '');
  if (positionSnapshot.trackId !== activeId) {
    positionSnapshot.trackId = activeId;
    positionSnapshot.position = 0;
    positionSnapshot.seekTarget = null;
  }
  if (positionSnapshot.seekTarget !== null) {
    if (Math.abs(progress.position - positionSnapshot.seekTarget) < 0.5) {
      positionSnapshot.position = progress.position;
      positionSnapshot.seekTarget = null;
    }
  } else if (Number.isFinite(progress.position) && progress.position > 0) {
    positionSnapshot.position = progress.position;
  }

  const isPlaying = playbackState.state === State.Playing;
  const isBuffering =
    playbackState.state === State.Buffering ||
    playbackState.state === State.Loading;

  useTrackPlayerEvents([
    Event.PlaybackError, Event.PlaybackState, Event.PlaybackActiveTrackChanged,
    Event.RemotePlay, Event.RemotePause, Event.RemoteStop,
    Event.RemoteNext, Event.RemotePrevious, Event.RemoteSeek,
  ], (event) => {
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
    } else {
      playbackRequestRef.current++;
      recovery.cancel();
    }
  });

  useEffect(() => { recovery.watchSource(activeTrack, isPlaying); }, [activeTrack, isPlaying, recovery]);

  useEffect(() => {
    recovery.activate();
    const subscription = AppState.addEventListener('change', () => recovery.showPendingFailure());
    return () => {
      subscription.remove();
      recovery.dispose();
    };
  }, [recovery]);

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
      setQueue(q as PluggdTrack[]);
    } catch {
      // player not ready yet
    }
  }, []);

  // ─── Actions ──────────────────────────────────────────────────
  const playTrack = useCallback(
    async (track: PluggdTrack) => {
      if (!isReady) return null;
      recovery.cancel();
      const request = ++playbackRequestRef.current;
      retainedPosition.current.position = 0;
      retainedPosition.current.seekTarget = 0;
      const playable = await resolvePlaybackTrack(track);
      if (request !== playbackRequestRef.current) return null;
      if (!isPlayableTrack(playable)) {
        Alert.alert('Audio unavailable', track.url?.trim()
          ? 'This audio cannot be reached right now. Please try again.'
          : 'This item does not include a playable audio upload.');
        return null;
      }
      await TrackPlayer.reset();
      if (request !== playbackRequestRef.current) return null;
      const nativeTrack = trackForNativePlayback(playable);
      await TrackPlayer.add(nativeTrack as any);
      if (request !== playbackRequestRef.current) return null;
      originalQueue.current = [nativeTrack];
      await TrackPlayer.play();
      await syncQueue();
      return ((await TrackPlayer.getActiveTrack()) as PluggdTrack | undefined) ?? null;
    },
    [isReady, recovery, syncQueue],
  );

  const playQueue = useCallback(
    async (tracks: PluggdTrack[], startIndex = 0) => {
      if (!isReady || tracks.length === 0) return null;
      recovery.cancel();
      const request = ++playbackRequestRef.current;
      retainedPosition.current.position = 0;
      retainedPosition.current.seekTarget = 0;
      const requestedTrack = tracks[Math.min(Math.max(startIndex, 0), tracks.length - 1)] ?? null;
      const resolved = await Promise.all(tracks.map((track) => resolvePlaybackTrack(track)));
      if (request !== playbackRequestRef.current) return null;
      const playableTracks = resolved.filter(isPlayableTrack).map((track) => trackForNativePlayback(track));
      if (playableTracks.length === 0) {
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
      originalQueue.current = playableTracks;
      await TrackPlayer.reset();
      if (request !== playbackRequestRef.current) return null;
      await TrackPlayer.add(playableTracks as any);
      if (request !== playbackRequestRef.current) return null;
      if (safeStartIndex > 0) {
        await TrackPlayer.skip(safeStartIndex);
      }
      if (request !== playbackRequestRef.current) return null;
      await TrackPlayer.play();
      await syncQueue();
      const active = ((await TrackPlayer.getActiveTrack()) as PluggdTrack | undefined) ?? null;
      return active;
    },
    [isReady, recovery, syncQueue],
  );

  const play = useCallback(async () => {
    playbackRequestRef.current++;
    recovery.cancel();
    await TrackPlayer.play();
  }, [recovery]);

  const pause = useCallback(async () => {
    playbackRequestRef.current++;
    recovery.cancel(false);
    await TrackPlayer.pause();
  }, [recovery]);

  const togglePlayPause = useCallback(async () => {
    playbackRequestRef.current++;
    recovery.cancel(!isPlaying);
    if (isPlaying) {
      await TrackPlayer.pause();
    } else {
      await TrackPlayer.play();
    }
  }, [isPlaying, recovery]);

  const skipToNext = useCallback(async () => {
    playbackRequestRef.current++;
    retainedPosition.current.position = 0;
    retainedPosition.current.seekTarget = 0;
    recovery.cancel();
    try {
      await TrackPlayer.skipToNext();
    } catch {
      // Already at last track
    }
  }, [recovery]);

  const skipToPrevious = useCallback(async () => {
    playbackRequestRef.current++;
    retainedPosition.current.position = 0;
    retainedPosition.current.seekTarget = 0;
    recovery.cancel();
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
  }, [progress.position, recovery]);

  const skipToQueueIndex = useCallback(async (index: number) => {
    if (!Number.isInteger(index) || index < 0) return;
    playbackRequestRef.current++;
    retainedPosition.current.position = 0;
    retainedPosition.current.seekTarget = 0;
    recovery.cancel();
    try {
      await TrackPlayer.skip(index);
      await TrackPlayer.play();
    } catch {
      // Queue can change between render and selection; retain the current item.
    }
  }, [recovery]);

  const seekTo = useCallback(async (position: number) => {
    playbackRequestRef.current++;
    recovery.cancel();
    retainedPosition.current.position = position;
    retainedPosition.current.seekTarget = position;
    await TrackPlayer.seekTo(position);
  }, [recovery]);

  const addToQueue = useCallback(
    async (track: PluggdTrack) => {
      if (!isReady) return;
      const playable = await resolvePlaybackTrack(track);
      if (!isPlayableTrack(playable)) return;
      await TrackPlayer.add(trackForNativePlayback(playable) as any);
      syncQueue();
    },
    [isReady, syncQueue],
  );

  const clearQueue = useCallback(async () => {
    recovery.cancel(false);
    playbackRequestRef.current += 1;
    await TrackPlayer.reset();
    setQueue([]);
    originalQueue.current = [];
  }, [recovery]);

  const closePlayer = useCallback(async () => {
    recovery.cancel(false);
    playbackRequestRef.current += 1;
    await TrackPlayer.reset();
    setQueue([]);
    originalQueue.current = [];
  }, [recovery]);

  const toggleRepeat = useCallback(async () => {
    const current = await TrackPlayer.getRepeatMode();
    const next =
      current === RepeatMode.Off
        ? RepeatMode.Queue
        : current === RepeatMode.Queue
          ? RepeatMode.Track
          : RepeatMode.Off;
    await TrackPlayer.setRepeatMode(next);
    setRepeatModeState(next);
  }, []);

  const toggleShuffle = useCallback(async () => {
    if (!isReady) return;
    recovery.cancel();
    const nextMode = shuffleMode === 'off' ? 'on' : 'off';
    setShuffleMode(nextMode);

    const active = (await TrackPlayer.getActiveTrack()) as PluggdTrack | undefined;
    const source = nextMode === 'on' ? [...queue] : [...originalQueue.current];
    if (!active || source.length <= 1) return;

    const currentIndex = source.findIndex((track) => track.id === active.id);
    const withoutActive = source.filter((track) => track.id !== active.id);
    const nextQueue =
      nextMode === 'on'
        ? [
            active,
            ...withoutActive
              .map((track) => ({ track, sort: Math.random() }))
              .sort((a, b) => a.sort - b.sort)
              .map(({ track }) => track),
          ]
        : source;

    await TrackPlayer.reset();
    await TrackPlayer.add(nextQueue as any);
    await TrackPlayer.skip(nextMode === 'on' ? 0 : Math.max(currentIndex, 0));
    await TrackPlayer.play();
    await syncQueue();
  }, [isReady, queue, recovery, shuffleMode, syncQueue]);

  const currentTrack = (activeTrack as PluggdTrack) ?? null;
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
        progress: {
          position: progress.position,
          duration: progressDuration,
          buffered: progress.buffered,
        },
        queue,
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
      {children}
    </PlaybackContext.Provider>
  );
}

export function usePlayback() {
  const ctx = useContext(PlaybackContext);
  if (!ctx) throw new Error('usePlayback must be used within PlaybackProvider');
  return ctx;
}
