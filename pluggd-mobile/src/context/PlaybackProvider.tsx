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
import { Alert, Platform } from 'react-native';
import { transformedUri } from '../components/PluggdImage';
import { isConstrainedAndroidRuntime } from '../components/lowMemoryImagePolicy';

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
        : {
            // Preserve the submitted iOS and modern-Android behavior.
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
  const lastPlaybackError = useRef('');

  const playbackState = usePlaybackState();
  const progress = useProgress(250); // update every 250ms
  const activeTrack = useActiveTrack();

  const isPlaying = playbackState.state === State.Playing;
  const isBuffering =
    playbackState.state === State.Buffering ||
    playbackState.state === State.Loading;

  useTrackPlayerEvents([Event.PlaybackError], (event) => {
    const fingerprint = `${event.code}:${event.message}`;
    if (lastPlaybackError.current === fingerprint) return;
    lastPlaybackError.current = fingerprint;
    console.warn('[PlaybackProvider] playback unavailable:', event.code);
    void TrackPlayer.reset().finally(() => {
      setQueue([]);
      originalQueue.current = [];
    });
    Alert.alert('Audio unavailable', 'This upload cannot be reached right now. Please try another track.');
  });

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
      if (!isPlayableTrack(track)) {
        Alert.alert('Audio unavailable', 'This item does not include a playable audio upload.');
        return null;
      }
      lastPlaybackError.current = '';
      await TrackPlayer.reset();
      const nativeTrack = trackForNativePlayback(track);
      await TrackPlayer.add(nativeTrack as any);
      originalQueue.current = [nativeTrack];
      await TrackPlayer.play();
      await syncQueue();
      return ((await TrackPlayer.getActiveTrack()) as PluggdTrack | undefined) ?? null;
    },
    [isReady, syncQueue],
  );

  const playQueue = useCallback(
    async (tracks: PluggdTrack[], startIndex = 0) => {
      if (!isReady || tracks.length === 0) return null;
      const requestedTrack = tracks[Math.min(Math.max(startIndex, 0), tracks.length - 1)] ?? null;
      const playableTracks = tracks.filter(isPlayableTrack).map((track) => trackForNativePlayback(track));
      if (playableTracks.length === 0) {
        Alert.alert('Audio unavailable', 'These items do not include playable audio uploads.');
        return null;
      }
      lastPlaybackError.current = '';
      const requestedIndex = requestedTrack
        ? playableTracks.findIndex((track) => track.id === requestedTrack.id)
        : -1;
      const safeStartIndex = requestedIndex >= 0
        ? requestedIndex
        : Math.min(Math.max(startIndex, 0), playableTracks.length - 1);
      originalQueue.current = playableTracks;
      await TrackPlayer.reset();
      await TrackPlayer.add(playableTracks as any);
      if (safeStartIndex > 0) {
        await TrackPlayer.skip(safeStartIndex);
      }
      await TrackPlayer.play();
      await syncQueue();
      const active = ((await TrackPlayer.getActiveTrack()) as PluggdTrack | undefined) ?? null;
      return active;
    },
    [isReady, syncQueue],
  );

  const play = useCallback(async () => {
    await TrackPlayer.play();
  }, []);

  const pause = useCallback(async () => {
    await TrackPlayer.pause();
  }, []);

  const togglePlayPause = useCallback(async () => {
    if (isPlaying) {
      await TrackPlayer.pause();
    } else {
      await TrackPlayer.play();
    }
  }, [isPlaying]);

  const skipToNext = useCallback(async () => {
    try {
      await TrackPlayer.skipToNext();
    } catch {
      // Already at last track
    }
  }, []);

  const skipToPrevious = useCallback(async () => {
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
  }, [progress.position]);

  const skipToQueueIndex = useCallback(async (index: number) => {
    if (!Number.isInteger(index) || index < 0) return;
    try {
      await TrackPlayer.skip(index);
      await TrackPlayer.play();
    } catch {
      // Queue can change between render and selection; retain the current item.
    }
  }, []);

  const seekTo = useCallback(async (position: number) => {
    await TrackPlayer.seekTo(position);
  }, []);

  const addToQueue = useCallback(
    async (track: PluggdTrack) => {
      if (!isReady) return;
      if (!isPlayableTrack(track)) return;
      await TrackPlayer.add(trackForNativePlayback(track) as any);
      syncQueue();
    },
    [isReady, syncQueue],
  );

  const clearQueue = useCallback(async () => {
    await TrackPlayer.reset();
    setQueue([]);
    originalQueue.current = [];
  }, []);

  const closePlayer = useCallback(async () => {
    await TrackPlayer.reset();
    setQueue([]);
    originalQueue.current = [];
    lastPlaybackError.current = '';
  }, []);

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
  }, [isReady, queue, shuffleMode, syncQueue]);

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
