import React, { createContext, useContext, useReducer, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { playerAnalytics } from '@/services/analytics/player-analytics';
import { trackAccessControl } from '@/services/audio/track-access-control';
import { resolvePlayableUrl } from '@/services/audio/url-resolver';

const PLAYER_STORAGE_KEY = 'globalPlayer';
const PLAYER_STORAGE_VERSION = 2;

export interface Track {
  id: string;
  title: string;
  artist: string;
  src: string;
  artwork?: string | null;
  duration?: number;
  releaseId?: string;
  userId?: string;
  type?: 'beat' | 'release' | 'pack';
  price?: number;
  currency?: string;
  streamable?: boolean;
  owned?: boolean;
  previewUrl?: string;
  previewStart?: number;
  previewEnd?: number;
  preview_duration?: number;
  purchaseUrl?: string;
  isLocked?: boolean;
  requiresPurchase?: boolean;
}

type CrossfadeStage = 'fadingOut' | 'waitingForNewTrack' | 'fadingIn';

interface CrossfadeState {
  stage: CrossfadeStage;
  targetVolume: number;
}

interface PlaybackState {
  currentTrack: Track | null;
  queue: Track[];
  currentIndex: number;
  isPlaying: boolean;
  isPaused: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  shuffle: boolean;
  repeat: 'none' | 'one' | 'all';
  isExpanded: boolean;
  crossfadeEnabled: boolean;
  gaplessEnabled: boolean;
  quality: 'auto' | 'high' | 'medium' | 'low';
  shuffleOrder: number[];
  history: number[];
}

type PlayerAction = 
  | { type: 'PLAY_TRACK'; payload: { track: Track; queue?: Track[]; index?: number } }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'STOP' }
  | { type: 'NEXT' }
  | { type: 'PREVIOUS' }
  | { type: 'SEEK'; payload: number }
  | { type: 'SET_VOLUME'; payload: number }
  | { type: 'TOGGLE_MUTE' }
  | { type: 'TOGGLE_SHUFFLE' }
  | { type: 'TOGGLE_REPEAT' }
  | { type: 'SET_SHUFFLE'; payload: boolean }
  | { type: 'SET_REPEAT'; payload: 'none' | 'one' | 'all' }
  | { type: 'TOGGLE_EXPANDED' }
  | { type: 'ADD_TO_QUEUE'; payload: Track }
  | { type: 'PLAY_NEXT'; payload: Track }
  | { type: 'REMOVE_FROM_QUEUE'; payload: number }
  | { type: 'SET_QUEUE'; payload: { tracks: Track[]; index?: number } }
  | { type: 'CLEAR_QUEUE' }
  | { type: 'UPDATE_TIME'; payload: { currentTime: number; duration: number } }
  | { type: 'SET_CROSSFADE'; payload: boolean }
  | { type: 'SET_GAPLESS'; payload: boolean }
  | { type: 'SET_QUALITY'; payload: 'auto' | 'high' | 'medium' | 'low' }
  | { type: 'SET_SHUFFLE_ORDER'; payload: number[] }
  | { type: 'SET_HISTORY'; payload: number[] };

const initialState: PlaybackState = {
  currentTrack: null,
  queue: [],
  currentIndex: -1,
  isPlaying: false,
  isPaused: false,
  currentTime: 0,
  duration: 0,
  volume: 1,
  isMuted: false,
  shuffle: false,
  repeat: 'none',
  isExpanded: false,
  crossfadeEnabled: false,
  gaplessEnabled: true,
  quality: 'auto',
  shuffleOrder: [],
  history: []
};

interface PersistedPreferences {
  volume: number;
  shuffle: boolean;
  repeat: 'none' | 'one' | 'all';
  crossfadeEnabled: boolean;
  gaplessEnabled: boolean;
  quality: 'auto' | 'high' | 'medium' | 'low';
}

interface PersistedPlayerState {
  version: number;
  queue: Track[];
  currentTrack: Track | null;
  currentIndex: number;
  currentTime: number;
  preferences: PersistedPreferences;
  shuffleOrder?: number[];
  history?: number[];
}

const defaultPreferences: PersistedPreferences = {
  volume: 1,
  shuffle: false,
  repeat: 'none',
  crossfadeEnabled: false,
  gaplessEnabled: true,
  quality: 'auto'
};

const isValidTrack = (track: any): track is Track =>
  Boolean(
    track &&
      typeof track === 'object' &&
      typeof track.id === 'string' &&
      typeof track.src === 'string'
  );

const SHUFFLE_HISTORY_LIMIT = 200;
const PREFETCH_TTL = 60 * 1000;
const CROSSFADE_DURATION_SECONDS = 3;
const CROSSFADE_DURATION_MS = CROSSFADE_DURATION_SECONDS * 1000;

const buildShuffleOrder = (queueLength: number, excludeIndex: number): number[] => {
  const indices: number[] = [];
  for (let i = 0; i < queueLength; i += 1) {
    if (i !== excludeIndex) {
      indices.push(i);
    }
  }

  for (let i = indices.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  return indices;
};

const removeIndexFromOrder = (order: number[], index: number): number[] =>
  order.filter((value) => value !== index);

const clampHistory = (history: number[]): number[] =>
  history.slice(Math.max(0, history.length - SHUFFLE_HISTORY_LIMIT));

const cancelAnimation = (ref: React.MutableRefObject<number | null>) => {
  if (ref.current !== null) {
    cancelAnimationFrame(ref.current);
    ref.current = null;
  }
};

const fadeAudioVolume = (
  audio: HTMLAudioElement,
  from: number,
  to: number,
  durationMs: number,
  rafRef: React.MutableRefObject<number | null>,
  onComplete?: () => void
) => {
  cancelAnimation(rafRef);
  const start = performance.now();
  const startVolume = Math.max(0, Math.min(1, from));
  const delta = Math.max(-1, Math.min(1, to)) - startVolume;

  const step = (now: number) => {
    const elapsed = now - start;
    const progress = durationMs <= 0 ? 1 : Math.min(1, elapsed / durationMs);
    const nextVolume = startVolume + delta * progress;
    audio.volume = Math.max(0, Math.min(1, nextVolume));

    if (progress >= 1) {
      rafRef.current = null;
      onComplete?.();
      return;
    }

    rafRef.current = requestAnimationFrame(step);
  };

  rafRef.current = requestAnimationFrame(step);
};

const clearPersistedPlayerState = () => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(PLAYER_STORAGE_KEY);
};

const loadPersistedPlayerState = (): PersistedPlayerState | null => {
  if (typeof window === 'undefined') return null;

  const rawState = window.localStorage.getItem(PLAYER_STORAGE_KEY);
  if (!rawState) return null;

  try {
    const parsed = JSON.parse(rawState);

    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Persisted player state is not an object');
    }

    if (parsed.version !== PLAYER_STORAGE_VERSION) {
      throw new Error('Persisted player state version mismatch');
    }

    const queue = Array.isArray(parsed.queue) ? parsed.queue.filter(isValidTrack) : [];
    const currentTrack = parsed.currentTrack && isValidTrack(parsed.currentTrack)
      ? parsed.currentTrack
      : null;
    const currentIndex = typeof parsed.currentIndex === 'number' ? parsed.currentIndex : -1;
    const currentTime =
      typeof parsed.currentTime === 'number' && Number.isFinite(parsed.currentTime)
        ? parsed.currentTime
        : 0;

    const rawPreferences =
      parsed.preferences && typeof parsed.preferences === 'object' ? parsed.preferences : {};

    const preferences: PersistedPreferences = {
      volume:
        typeof rawPreferences.volume === 'number' && Number.isFinite(rawPreferences.volume)
          ? Math.max(0, Math.min(1, rawPreferences.volume))
          : defaultPreferences.volume,
      shuffle:
        typeof rawPreferences.shuffle === 'boolean'
          ? rawPreferences.shuffle
          : defaultPreferences.shuffle,
      repeat:
        rawPreferences.repeat === 'all' || rawPreferences.repeat === 'one'
          ? rawPreferences.repeat
          : defaultPreferences.repeat,
      crossfadeEnabled:
        typeof rawPreferences.crossfadeEnabled === 'boolean'
          ? rawPreferences.crossfadeEnabled
          : defaultPreferences.crossfadeEnabled,
      gaplessEnabled:
        typeof rawPreferences.gaplessEnabled === 'boolean'
          ? rawPreferences.gaplessEnabled
          : defaultPreferences.gaplessEnabled,
      quality:
        rawPreferences.quality === 'high' ||
        rawPreferences.quality === 'medium' ||
        rawPreferences.quality === 'low'
          ? rawPreferences.quality
          : defaultPreferences.quality
    };

    return {
      version: PLAYER_STORAGE_VERSION,
      queue: queue.map(track => ({ ...track })),
      currentTrack: currentTrack ? { ...currentTrack } : null,
      currentIndex,
      currentTime,
      preferences,
      shuffleOrder: Array.isArray(parsed.shuffleOrder)
        ? parsed.shuffleOrder.filter((value: unknown) => typeof value === 'number').map((value: number) => Math.max(0, Math.floor(value)))
        : [],
      history: Array.isArray(parsed.history)
        ? parsed.history
            .filter((value: unknown) => typeof value === 'number')
            .map((value: number) => Math.max(0, Math.floor(value)))
        : []
    };
  } catch (error) {
    console.warn('Clearing persisted player state due to parse error:', error);
    clearPersistedPlayerState();
    return null;
  }
};

const persistPlayerState = (state: PlaybackState) => {
  if (typeof window === 'undefined') return;

  const payload: PersistedPlayerState = {
    version: PLAYER_STORAGE_VERSION,
    queue: state.queue.filter(isValidTrack).map(track => ({ ...track })),
    currentTrack: state.currentTrack ? { ...state.currentTrack } : null,
    currentIndex: state.currentIndex,
    currentTime: Number.isFinite(state.currentTime) ? state.currentTime : 0,
    preferences: {
      volume: state.volume,
      shuffle: state.shuffle,
      repeat: state.repeat,
      crossfadeEnabled: state.crossfadeEnabled,
      gaplessEnabled: state.gaplessEnabled,
      quality: state.quality
    },
    shuffleOrder: state.shuffleOrder.slice(0, 200),
    history: state.history.slice(-200)
  };

  try {
    window.localStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn('Failed to persist player state:', error);
  }
};

function playerReducer(state: PlaybackState, action: PlayerAction): PlaybackState {
  switch (action.type) {
    case 'PLAY_TRACK':
      const { track, queue = [], index } = action.payload;
      const newQueue = queue.length > 0 ? queue : [track];
      const resolvedIndex =
        index !== undefined && index >= 0
          ? index
          : newQueue.findIndex(t => t.id === track.id);
      const nextIndex = resolvedIndex >= 0 ? resolvedIndex : 0;

      const nextHistory =
        state.currentIndex >= 0 && state.currentIndex < state.queue.length && state.currentTrack
          ? clampHistory([...state.history, state.currentIndex])
          : clampHistory(state.history);

      const shouldResetShuffle = queue.length > 0 || newQueue.length !== state.queue.length;
      const nextShuffleOrder = state.shuffle
        ? shouldResetShuffle
          ? buildShuffleOrder(newQueue.length, nextIndex)
          : removeIndexFromOrder(state.shuffleOrder, nextIndex)
        : [];

      return {
        ...state,
        currentTrack: track,
        queue: newQueue,
        currentIndex: Math.max(0, nextIndex),
        isPlaying: true,
        isPaused: false,
        currentTime: 0,
        duration: 0,
        history: state.shuffle ? nextHistory : clampHistory(state.history),
        shuffleOrder: state.shuffle ? nextShuffleOrder : []
      };

    case 'PAUSE':
      return {
        ...state,
        isPlaying: false,
        isPaused: true
      };

    case 'RESUME':
      return {
        ...state,
        isPlaying: true,
        isPaused: false
      };

    case 'STOP':
      return {
        ...state,
        isPlaying: false,
        isPaused: false,
        currentTime: 0
      };

    case 'NEXT': {
      if (state.queue.length === 0) return state;

      if (state.shuffle) {
        let shuffleOrder = state.shuffleOrder.slice();

        if (shuffleOrder.length === 0) {
          shuffleOrder = buildShuffleOrder(state.queue.length, state.currentIndex);
        }

        if (shuffleOrder.length === 0) {
          if (state.repeat === 'all') {
            shuffleOrder = buildShuffleOrder(state.queue.length, state.currentIndex);
          } else {
            return { ...state, isPlaying: false, isPaused: false };
          }
        }

        const nextIndex = shuffleOrder.shift();
        if (nextIndex === undefined) {
          return state;
        }

        const nextHistory = clampHistory([...state.history, state.currentIndex]);

        return {
          ...state,
          currentTrack: state.queue[nextIndex],
          currentIndex: nextIndex,
          currentTime: 0,
          duration: 0,
          isPlaying: true,
          isPaused: false,
          shuffleOrder,
          history: nextHistory
        };
      }

      let nextIndex = state.currentIndex + 1;
      if (nextIndex >= state.queue.length) {
        if (state.repeat === 'all') {
          nextIndex = 0;
        } else {
          return { ...state, isPlaying: false, isPaused: false };
        }
      }

      return {
        ...state,
        currentTrack: state.queue[nextIndex],
        currentIndex: nextIndex,
        currentTime: 0,
        duration: 0,
        isPlaying: true,
        isPaused: false,
        history: state.shuffle ? clampHistory([...state.history, state.currentIndex]) : state.history,
        shuffleOrder: state.shuffle ? state.shuffleOrder : []
      };
    }

    case 'PREVIOUS':
      if (state.queue.length === 0) return state;
      
      // If more than 3 seconds into track, restart current track
      if (state.currentTime > 3) {
        return {
          ...state,
          currentTime: 0
        };
      }

      if (state.shuffle) {
        if (state.history.length === 0) {
          if (state.repeat === 'all' && state.queue.length > 1) {
            const regeneratedOrder = buildShuffleOrder(state.queue.length, state.currentIndex);
            const lastIndex = regeneratedOrder.shift();
            if (lastIndex === undefined) {
              return {
                ...state,
                currentTime: 0
              };
            }

            return {
              ...state,
              currentTrack: state.queue[lastIndex],
              currentIndex: lastIndex,
              currentTime: 0,
              duration: 0,
              isPlaying: true,
              isPaused: false,
              shuffleOrder: regeneratedOrder,
              history: clampHistory([...state.history, state.currentIndex])
            };
          }

          return {
            ...state,
            currentTime: 0
          };
        }

        const history = state.history.slice();
        const previousIndex = history.pop();

        if (previousIndex === undefined || !state.queue[previousIndex]) {
          return {
            ...state,
            currentTime: 0,
            history
          };
        }

        const shuffleOrder = [state.currentIndex, ...state.shuffleOrder];

        return {
          ...state,
          currentTrack: state.queue[previousIndex],
          currentIndex: previousIndex,
          currentTime: 0,
          duration: 0,
          isPlaying: true,
          isPaused: false,
          shuffleOrder,
          history: clampHistory(history)
        };
      }
      
      let prevIndex = state.currentIndex - 1;
      if (prevIndex < 0) {
        if (state.repeat === 'all') {
          prevIndex = state.queue.length - 1;
        } else {
          return state;
        }
      }
      
      return {
        ...state,
        currentTrack: state.queue[prevIndex],
        currentIndex: prevIndex,
        currentTime: 0,
        duration: 0,
        isPlaying: true,
        isPaused: false,
        history: state.shuffle ? state.history : [],
        shuffleOrder: state.shuffle ? state.shuffleOrder : []
      };

    case 'SEEK':
      return {
        ...state,
        currentTime: action.payload
      };

    case 'SET_VOLUME':
      return {
        ...state,
        volume: Math.max(0, Math.min(1, action.payload)),
        isMuted: action.payload === 0
      };

    case 'TOGGLE_MUTE':
      return {
        ...state,
        isMuted: !state.isMuted
      };

    case 'TOGGLE_SHUFFLE': {
      const nextShuffle = !state.shuffle;
      return {
        ...state,
        shuffle: nextShuffle,
        shuffleOrder: nextShuffle
          ? buildShuffleOrder(state.queue.length, state.currentIndex >= 0 ? state.currentIndex : -1)
          : [],
        history: nextShuffle ? [] : []
      };
    }

    case 'SET_SHUFFLE': {
      const enabled = action.payload;
      return {
        ...state,
        shuffle: enabled,
        shuffleOrder: enabled
          ? buildShuffleOrder(state.queue.length, state.currentIndex >= 0 ? state.currentIndex : -1)
          : [],
        history: enabled ? [] : []
      };
    }

    case 'TOGGLE_REPEAT':
      const nextRepeat = state.repeat === 'none' ? 'all' : state.repeat === 'all' ? 'one' : 'none';
      return {
        ...state,
        repeat: nextRepeat
      };

    case 'SET_REPEAT':
      return {
        ...state,
        repeat: action.payload
      };

    case 'TOGGLE_EXPANDED':
      return {
        ...state,
        isExpanded: !state.isExpanded
      };

    case 'ADD_TO_QUEUE':
      const appendedQueue = [...state.queue, action.payload];
      return {
        ...state,
        queue: appendedQueue,
        shuffleOrder: state.shuffle
          ? [...state.shuffleOrder, appendedQueue.length - 1]
          : state.shuffleOrder
      };

    case 'PLAY_NEXT':
      const insertIndex = state.currentIndex + 1;
      const newQueueWithNext = [...state.queue];
      newQueueWithNext.splice(insertIndex, 0, action.payload);
      
      return {
        ...state,
        queue: newQueueWithNext,
        shuffleOrder: state.shuffle
          ? [
              insertIndex,
              ...removeIndexFromOrder(
                state.shuffleOrder.map(index => (index >= insertIndex ? index + 1 : index)),
                insertIndex
              )
            ]
          : state.shuffleOrder
      };

    case 'REMOVE_FROM_QUEUE':
      const filteredQueue = state.queue.filter((_, index) => index !== action.payload);
      const adjustedIndex = action.payload <= state.currentIndex && state.currentIndex > 0 
        ? state.currentIndex - 1 
        : state.currentIndex;

      const removedIndex = action.payload;
      const adjustedShuffleOrder = state.shuffle
        ? state.shuffleOrder
            .filter(index => index !== removedIndex)
            .map(index => (index > removedIndex ? index - 1 : index))
        : state.shuffleOrder;

      const adjustedHistory = state.shuffle
        ? state.history
            .filter(index => index !== removedIndex)
            .map(index => (index > removedIndex ? index - 1 : index))
        : state.history;
      
      return {
        ...state,
        queue: filteredQueue,
        currentIndex: Math.min(adjustedIndex, filteredQueue.length - 1),
        currentTrack: filteredQueue[adjustedIndex] || null,
        shuffleOrder: state.shuffle ? adjustedShuffleOrder : [],
        history: state.shuffle ? clampHistory(adjustedHistory) : []
      };

    case 'SET_QUEUE':
      const { tracks, index: startIndex = 0 } = action.payload;
      return {
        ...state,
        queue: tracks,
        currentIndex: startIndex,
        currentTrack: tracks[startIndex] || null,
        shuffleOrder: state.shuffle ? buildShuffleOrder(tracks.length, startIndex) : [],
        history: state.shuffle ? [] : state.history
      };

    case 'CLEAR_QUEUE':
      return {
        ...state,
        queue: [],
        currentIndex: -1,
        currentTrack: null,
        isPlaying: false,
        isPaused: false,
        currentTime: 0,
        duration: 0,
        shuffleOrder: [],
        history: []
      };

    case 'UPDATE_TIME':
      return {
        ...state,
        currentTime: action.payload.currentTime,
        duration: action.payload.duration
      };

    case 'SET_CROSSFADE':
      return {
        ...state,
        crossfadeEnabled: action.payload
      };

    case 'SET_GAPLESS':
      return {
        ...state,
        gaplessEnabled: action.payload
      };

    case 'SET_QUALITY':
      return {
        ...state,
        quality: action.payload
      };

    case 'SET_SHUFFLE_ORDER':
      return {
        ...state,
        shuffleOrder: action.payload.slice(0, SHUFFLE_HISTORY_LIMIT)
      };

    case 'SET_HISTORY':
      return {
        ...state,
        history: clampHistory(action.payload)
      };

    default:
      return state;
  }
}

interface PlayerContextType {
  state: PlaybackState;
  actions: {
    play: (track: Track, queue?: Track[], index?: number) => void;
    pause: () => void;
    resume: () => void;
    stop: () => void;
    next: () => void;
    previous: () => void;
    seek: (time: number) => void;
    setVolume: (volume: number) => void;
    toggleMute: () => void;
    toggleShuffle: () => void;
    toggleRepeat: () => void;
    toggleExpanded: () => void;
    addToQueue: (track: Track) => void;
    playNext: (track: Track) => void;
    removeFromQueue: (index: number) => void;
    setQueue: (tracks: Track[], index?: number) => void;
    clearQueue: () => void;
    setCrossfade: (enabled: boolean) => void;
    setGapless: (enabled: boolean) => void;
    setQuality: (quality: 'auto' | 'high' | 'medium' | 'low') => void;
  };
  audioRef: React.RefObject<HTMLAudioElement>;
}

const PlayerContext = createContext<PlayerContextType | null>(null);

export const useGlobalPlayer = () => {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error('useGlobalPlayer must be used within GlobalPlayerProvider');
  }
  return context;
};

interface GlobalPlayerProviderProps {
  children: React.ReactNode;
}

export const GlobalPlayerProvider: React.FC<GlobalPlayerProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(playerReducer, initialState);
  const audioRef = useRef<HTMLAudioElement>(null);
  const pendingSeekRef = useRef<number | null>(null);
  const prefetchedNextRef = useRef<{ trackId: string; src: string; updatedAt: number } | null>(null);
  const crossfadeStateRef = useRef<CrossfadeState | null>(null);
  const fadeOutRafRef = useRef<number | null>(null);
  const fadeInRafRef = useRef<number | null>(null);

  const determineUpcomingIndex = () => {
    if (state.queue.length === 0) return null;

    if (state.repeat === 'one') {
      return null;
    }

    if (state.shuffle) {
      if (state.shuffleOrder.length > 0) {
        return state.shuffleOrder[0];
      }

      const generated = buildShuffleOrder(state.queue.length, state.currentIndex >= 0 ? state.currentIndex : -1);
      if (generated.length > 0) {
        return generated[0];
      }

      if (state.repeat === 'all' && state.queue.length > 1) {
        return buildShuffleOrder(state.queue.length, state.currentIndex >= 0 ? state.currentIndex : -1)[0] ?? null;
      }

      return null;
    }

    let nextIndex = state.currentIndex + 1;
    if (nextIndex >= state.queue.length) {
      if (state.repeat === 'all' && state.queue.length > 0) {
        nextIndex = 0;
      } else {
        return null;
      }
    }

    return nextIndex;
  };

  // Initialize analytics session
  useEffect(() => {
    playerAnalytics.startSession();
    
    return () => {
      playerAnalytics.cleanup();
    };
  }, []);

  useEffect(() => {
    if (!state.crossfadeEnabled) {
      crossfadeStateRef.current = null;
      cancelAnimation(fadeOutRafRef);
      cancelAnimation(fadeInRafRef);
      const audio = audioRef.current;
      if (audio) {
        audio.volume = state.isMuted ? 0 : state.volume;
      }
    }
  }, [state.crossfadeEnabled, state.isMuted, state.volume]);

  const actions = {
    play: async (track: Track, queue?: Track[], index?: number) => {
      // Enhance track with access control
      const enhancedTrack = await trackAccessControl.enhanceTrackWithAccess(track);
      // Resolve playable URL (refresh signed URLs for private audio-files)
      let resolvedSrc: string;
      const cached = prefetchedNextRef.current;
      if (
        cached &&
        cached.trackId === enhancedTrack.id &&
        Date.now() - cached.updatedAt < PREFETCH_TTL
      ) {
        resolvedSrc = cached.src;
      } else {
        resolvedSrc = await resolvePlayableUrl(enhancedTrack.src, { quality: state.quality });
      }
      const finalTrack = { ...enhancedTrack, src: resolvedSrc };
      
      crossfadeStateRef.current = null;
      cancelAnimation(fadeOutRafRef);
      cancelAnimation(fadeInRafRef);
      prefetchedNextRef.current = null;

      dispatch({ 
        type: 'PLAY_TRACK', 
        payload: { track: finalTrack, queue, index } 
      });

      prefetchedNextRef.current = null;
      
      // Track play event for analytics
      await playerAnalytics.trackPlayEvent({
        track_id: finalTrack.id,
        track_type: finalTrack.type || 'release',
        play_type: enhancedTrack.streamable ? 'full' : 'preview',
        source: window.location.pathname
      });
    },

    pause: () => dispatch({ type: 'PAUSE' }),
    resume: () => dispatch({ type: 'RESUME' }),
    stop: () => {
      crossfadeStateRef.current = null;
      cancelAnimation(fadeOutRafRef);
      cancelAnimation(fadeInRafRef);
      prefetchedNextRef.current = null;
      dispatch({ type: 'STOP' });
    },
    next: () => {
      crossfadeStateRef.current = null;
      cancelAnimation(fadeOutRafRef);
      cancelAnimation(fadeInRafRef);
      prefetchedNextRef.current = null;
      dispatch({ type: 'NEXT' });
    },
    previous: () => {
      crossfadeStateRef.current = null;
      cancelAnimation(fadeOutRafRef);
      cancelAnimation(fadeInRafRef);
      prefetchedNextRef.current = null;
      dispatch({ type: 'PREVIOUS' });
    },
    seek: (time: number) => dispatch({ type: 'SEEK', payload: time }),
    setVolume: (volume: number) => dispatch({ type: 'SET_VOLUME', payload: volume }),
    toggleMute: () => dispatch({ type: 'TOGGLE_MUTE' }),
    toggleShuffle: () => dispatch({ type: 'TOGGLE_SHUFFLE' }),
    toggleRepeat: () => dispatch({ type: 'TOGGLE_REPEAT' }),
    toggleExpanded: () => dispatch({ type: 'TOGGLE_EXPANDED' }),
    addToQueue: (track: Track) => dispatch({ type: 'ADD_TO_QUEUE', payload: track }),
    playNext: (track: Track) => dispatch({ type: 'PLAY_NEXT', payload: track }),
    removeFromQueue: (index: number) => dispatch({ type: 'REMOVE_FROM_QUEUE', payload: index }),
    setQueue: (tracks: Track[], index?: number) => dispatch({ type: 'SET_QUEUE', payload: { tracks, index } }),
    clearQueue: () => {
      crossfadeStateRef.current = null;
      cancelAnimation(fadeOutRafRef);
      cancelAnimation(fadeInRafRef);
      prefetchedNextRef.current = null;
      dispatch({ type: 'CLEAR_QUEUE' });
    },
    setCrossfade: (enabled: boolean) => dispatch({ type: 'SET_CROSSFADE', payload: enabled }),
    setGapless: (enabled: boolean) => dispatch({ type: 'SET_GAPLESS', payload: enabled }),
    setQuality: (quality: 'auto' | 'high' | 'medium' | 'low') => dispatch({ type: 'SET_QUALITY', payload: quality })
  };

  const startCrossfade = (audio: HTMLAudioElement) => {
    if (!state.crossfadeEnabled || crossfadeStateRef.current) {
      return;
    }

    const upcomingIndex = determineUpcomingIndex();
    if (upcomingIndex === null) {
      return;
    }

    const targetVolume = state.isMuted ? 0 : state.volume;
    if (targetVolume <= 0) {
      return;
    }

    crossfadeStateRef.current = {
      stage: 'fadingOut',
      targetVolume
    };

    fadeAudioVolume(
      audio,
      audio.volume,
      0,
      CROSSFADE_DURATION_MS,
      fadeOutRafRef,
      () => {
        if (!state.crossfadeEnabled) {
          crossfadeStateRef.current = null;
          return;
        }

        crossfadeStateRef.current = {
          stage: 'waitingForNewTrack',
          targetVolume: state.isMuted ? 0 : state.volume
        };

        dispatch({ type: 'NEXT' });
      }
    );
  };

  useEffect(() => {
    if (!state.gaplessEnabled && !state.crossfadeEnabled) {
      prefetchedNextRef.current = null;
      return;
    }

    const controller = new AbortController();

    const prefetch = async () => {
      const upcomingIndex = determineUpcomingIndex();
      if (upcomingIndex === null) {
        prefetchedNextRef.current = null;
        return;
      }

      const upcomingTrack = state.queue[upcomingIndex];
      if (!upcomingTrack) {
        prefetchedNextRef.current = null;
        return;
      }

      const cached = prefetchedNextRef.current;
      if (
        cached &&
        cached.trackId === upcomingTrack.id &&
        Date.now() - cached.updatedAt < PREFETCH_TTL
      ) {
        return;
      }

      try {
        const resolvedSrc = await resolvePlayableUrl(upcomingTrack.src, { quality: state.quality });
        if (!controller.signal.aborted) {
          prefetchedNextRef.current = {
            trackId: upcomingTrack.id,
            src: resolvedSrc,
            updatedAt: Date.now()
          };
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.warn('Failed to prefetch upcoming track:', error);
        }
      }
    };

    void prefetch();

    return () => {
      controller.abort();
    };
  }, [
    state.queue,
    state.currentIndex,
    state.shuffle,
    state.shuffleOrder,
    state.crossfadeEnabled,
    state.gaplessEnabled,
    state.repeat,
    state.quality
  ]);

  // Audio element event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      const currentTime = audio.currentTime;
      const duration = audio.duration || 0;
      
      dispatch({ 
        type: 'UPDATE_TIME', 
        payload: { currentTime, duration } 
      });

      // Check if we need to limit preview playback
      if (state.currentTrack && !state.currentTrack.streamable) {
        const maxTime = trackAccessControl.getMaxPlaybackTime(state.currentTrack);
        if (maxTime && currentTime >= maxTime) {
          audio.pause();
          dispatch({ type: 'PAUSE' });
        }
      }

      if (
        state.crossfadeEnabled &&
        !state.isMuted &&
        state.isPlaying &&
        !crossfadeStateRef.current
      ) {
        if (Number.isFinite(duration) && duration > CROSSFADE_DURATION_SECONDS) {
          const timeRemaining = duration - currentTime;
          if (timeRemaining > 0 && timeRemaining <= CROSSFADE_DURATION_SECONDS) {
            startCrossfade(audio);
          }
        }
      }

      // Track progress analytics (every 15 seconds)
      if (state.currentTrack && Math.floor(currentTime) % 15 === 0) {
        playerAnalytics.trackPlayProgress(
          state.currentTrack.id,
          state.currentTrack.type || 'release',
          currentTime,
          duration,
          state.currentTrack.streamable ? 'full' : 'preview'
        );
      }
    };

    const handleEnded = () => {
      if (state.repeat === 'one') {
        audio.currentTime = 0;
        audio.play();
      } else {
        actions.next();
      }
    };

    const handlePlay = () => {
      dispatch({ type: 'RESUME' });
    };

    const handlePause = () => {
      dispatch({ type: 'PAUSE' });
    };

    const handleLoadedMetadata = () => {
      if (pendingSeekRef.current !== null) {
        const targetTime = pendingSeekRef.current;
        pendingSeekRef.current = null;
        if (!Number.isNaN(targetTime)) {
          const clampedTime = Math.max(
            0,
            Math.min(targetTime, Number.isFinite(audio.duration) ? audio.duration : targetTime)
          );
          audio.currentTime = clampedTime;
        }
      }

      const pendingCrossfade = crossfadeStateRef.current;
      if (pendingCrossfade?.stage === 'waitingForNewTrack') {
        cancelAnimation(fadeInRafRef);
        const targetVolume = state.isMuted ? 0 : pendingCrossfade.targetVolume;
        audio.volume = 0;
        crossfadeStateRef.current = { stage: 'fadingIn', targetVolume };
        fadeAudioVolume(
          audio,
          0,
          targetVolume,
          CROSSFADE_DURATION_MS,
          fadeInRafRef,
          () => {
            crossfadeStateRef.current = null;
            if (state.isMuted) {
              audio.volume = 0;
            } else {
              audio.volume = state.volume;
            }
          }
        );
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [state.repeat, state.currentTrack]);

  // Sync audio element with state
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !state.currentTrack) return;

    if (audio.src !== state.currentTrack.src) {
      audio.src = state.currentTrack.src;
      audio.load();
    }

    if (state.isPlaying && audio.paused) {
      audio.play().catch(console.error);
    } else if (!state.isPlaying && !audio.paused) {
      audio.pause();
    }

    audio.volume = state.isMuted ? 0 : state.volume;
  }, [state.currentTrack, state.isPlaying, state.volume, state.isMuted]);

  // Seek handling
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (Math.abs(audio.currentTime - state.currentTime) > 1) {
      audio.currentTime = state.currentTime;
    }
  }, [state.currentTime]);

  // Persist player state to localStorage
  useEffect(() => {
    persistPlayerState(state);
  }, [
    state.queue,
    state.currentTrack,
    state.currentIndex,
    state.currentTime,
    state.volume,
    state.shuffle,
    state.repeat,
    state.crossfadeEnabled,
    state.gaplessEnabled,
    state.quality,
    state.shuffleOrder,
    state.history
  ]);

  // Restore player state from localStorage
  useEffect(() => {
    let isMounted = true;

    const hydratePlayerState = async () => {
      const savedState = loadPersistedPlayerState();
      if (!savedState) return;

      try {
        const enhancedQueuePromises = savedState.queue.map(async storedTrack => {
          try {
            const enhancedTrack = await trackAccessControl.enhanceTrackWithAccess(storedTrack);
            const resolvedSrc = await resolvePlayableUrl(enhancedTrack.src);
            return { ...enhancedTrack, src: resolvedSrc } as Track;
          } catch (error) {
            console.warn('Failed to hydrate track from persisted state:', storedTrack?.id, error);
            return null;
          }
        });

        const enhancedQueue = (await Promise.all(enhancedQueuePromises)).filter(
          (track): track is Track => Boolean(track)
        );

        if (!isMounted) return;

        if (enhancedQueue.length === 0) {
          clearPersistedPlayerState();
          return;
        }

        const savedIndex = typeof savedState.currentIndex === 'number' ? savedState.currentIndex : -1;
        const normalizedIndex = savedIndex >= 0 && savedIndex < enhancedQueue.length
          ? savedIndex
          : savedState.currentTrack
            ? Math.max(
                0,
                enhancedQueue.findIndex(track => track.id === savedState.currentTrack?.id)
              )
            : 0;

        const currentIndex = Math.min(
          Math.max(0, normalizedIndex),
          enhancedQueue.length - 1
        );

        dispatch({ type: 'SET_QUEUE', payload: { tracks: enhancedQueue, index: currentIndex } });

        const seekTime = Math.max(0, savedState.currentTime || 0);
        if (seekTime > 0) {
          pendingSeekRef.current = seekTime;
          dispatch({ type: 'SEEK', payload: seekTime });
        }

        const { preferences } = savedState;
        if (typeof preferences.volume === 'number') {
          dispatch({ type: 'SET_VOLUME', payload: preferences.volume });
        }

        if (typeof preferences.shuffle === 'boolean') {
          dispatch({ type: 'SET_SHUFFLE', payload: preferences.shuffle });
        }

        if (preferences.repeat) {
          dispatch({ type: 'SET_REPEAT', payload: preferences.repeat });
        }

        if (typeof preferences.crossfadeEnabled === 'boolean') {
          dispatch({ type: 'SET_CROSSFADE', payload: preferences.crossfadeEnabled });
        }

        if (typeof preferences.gaplessEnabled === 'boolean') {
          dispatch({ type: 'SET_GAPLESS', payload: preferences.gaplessEnabled });
        }

        if (preferences.quality) {
          dispatch({ type: 'SET_QUALITY', payload: preferences.quality });
        }

        if (savedState.shuffleOrder && savedState.shuffleOrder.length > 0) {
          dispatch({ type: 'SET_SHUFFLE_ORDER', payload: savedState.shuffleOrder });
        }

        if (savedState.history && savedState.history.length > 0) {
          dispatch({ type: 'SET_HISTORY', payload: savedState.history });
        }
      } catch (error) {
        console.error('Error hydrating player state:', error);
        clearPersistedPlayerState();
      }
    };

    hydratePlayerState();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <PlayerContext.Provider value={{ state, actions, audioRef }}>
      {children}
      <audio
        ref={audioRef}
        crossOrigin="anonymous"
        preload="metadata"
        style={{ display: 'none' }}
      />
    </PlayerContext.Provider>
  );
};
