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
  State,
  Track,
  RepeatMode,
  usePlaybackState,
  useProgress,
  useActiveTrack,
  AppKilledPlaybackBehavior,
} from 'react-native-track-player';

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
  playTrack: (track: PluggdTrack) => Promise<void>;
  playQueue: (tracks: PluggdTrack[], startIndex?: number) => Promise<void>;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  togglePlayPause: () => Promise<void>;
  skipToNext: () => Promise<void>;
  skipToPrevious: () => Promise<void>;
  seekTo: (position: number) => Promise<void>;
  addToQueue: (track: PluggdTrack) => Promise<void>;
  clearQueue: () => Promise<void>;
  toggleRepeat: () => Promise<void>;
  toggleShuffle: () => void;
}

const PlaybackContext = createContext<PlaybackContextType | undefined>(undefined);

// ─── Setup ────────────────────────────────────────────────────────────
let isPlayerSetup = false;

async function setupPlayer(): Promise<boolean> {
  if (isPlayerSetup) return true;
  try {
    await TrackPlayer.setupPlayer({
      // 15s forward/backward jump for controls
      backBuffer: 30,
    });
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

  const playbackState = usePlaybackState();
  const progress = useProgress(250); // update every 250ms
  const activeTrack = useActiveTrack();

  const isPlaying = playbackState.state === State.Playing;
  const isBuffering =
    playbackState.state === State.Buffering ||
    playbackState.state === State.Loading;

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
      if (!isReady) return;
      await TrackPlayer.reset();
      await TrackPlayer.add(track as any);
      originalQueue.current = [track];
      await TrackPlayer.play();
      syncQueue();
    },
    [isReady, syncQueue],
  );

  const playQueue = useCallback(
    async (tracks: PluggdTrack[], startIndex = 0) => {
      if (!isReady || tracks.length === 0) return;
      originalQueue.current = tracks;
      await TrackPlayer.reset();
      await TrackPlayer.add(tracks as any);
      if (startIndex > 0) {
        await TrackPlayer.skip(startIndex);
      }
      await TrackPlayer.play();
      syncQueue();
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

  const seekTo = useCallback(async (position: number) => {
    await TrackPlayer.seekTo(position);
  }, []);

  const addToQueue = useCallback(
    async (track: PluggdTrack) => {
      if (!isReady) return;
      await TrackPlayer.add(track as any);
      syncQueue();
    },
    [isReady, syncQueue],
  );

  const clearQueue = useCallback(async () => {
    await TrackPlayer.reset();
    setQueue([]);
    originalQueue.current = [];
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

  return (
    <PlaybackContext.Provider
      value={{
        isPlaying,
        isBuffering,
        isReady,
        currentTrack,
        progress: {
          position: progress.position,
          duration: progress.duration,
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
        seekTo,
        addToQueue,
        clearQueue,
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
