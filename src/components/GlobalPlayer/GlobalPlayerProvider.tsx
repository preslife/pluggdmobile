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
  | { type: 'SET_QUALITY'; payload: 'auto' | 'high' | 'medium' | 'low' };

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
  quality: 'auto'
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
      preferences
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
    }
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
      const trackIndex = index !== undefined ? index : newQueue.findIndex(t => t.id === track.id);
      
      return {
        ...state,
        currentTrack: track,
        queue: newQueue,
        currentIndex: Math.max(0, trackIndex),
        isPlaying: true,
        isPaused: false,
        currentTime: 0,
        duration: 0
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

    case 'NEXT':
      if (state.queue.length === 0) return state;
      
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
        isPaused: false
      };

    case 'PREVIOUS':
      if (state.queue.length === 0) return state;
      
      // If more than 3 seconds into track, restart current track
      if (state.currentTime > 3) {
        return {
          ...state,
          currentTime: 0
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
        isPaused: false
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

    case 'TOGGLE_SHUFFLE':
      return {
        ...state,
        shuffle: !state.shuffle
      };

    case 'SET_SHUFFLE':
      return {
        ...state,
        shuffle: action.payload
      };

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
      return {
        ...state,
        queue: [...state.queue, action.payload]
      };

    case 'PLAY_NEXT':
      const insertIndex = state.currentIndex + 1;
      const newQueueWithNext = [...state.queue];
      newQueueWithNext.splice(insertIndex, 0, action.payload);
      
      return {
        ...state,
        queue: newQueueWithNext
      };

    case 'REMOVE_FROM_QUEUE':
      const filteredQueue = state.queue.filter((_, index) => index !== action.payload);
      const adjustedIndex = action.payload <= state.currentIndex && state.currentIndex > 0 
        ? state.currentIndex - 1 
        : state.currentIndex;
      
      return {
        ...state,
        queue: filteredQueue,
        currentIndex: Math.min(adjustedIndex, filteredQueue.length - 1),
        currentTrack: filteredQueue[adjustedIndex] || null
      };

    case 'SET_QUEUE':
      const { tracks, index: startIndex = 0 } = action.payload;
      return {
        ...state,
        queue: tracks,
        currentIndex: startIndex,
        currentTrack: tracks[startIndex] || null
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
        duration: 0
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

  // Initialize analytics session
  useEffect(() => {
    playerAnalytics.startSession();
    
    return () => {
      playerAnalytics.cleanup();
    };
  }, []);

  const actions = {
    play: async (track: Track, queue?: Track[], index?: number) => {
      // Enhance track with access control
      const enhancedTrack = await trackAccessControl.enhanceTrackWithAccess(track);
      // Resolve playable URL (refresh signed URLs for private audio-files)
      const resolvedSrc = await resolvePlayableUrl(enhancedTrack.src);
      const finalTrack = { ...enhancedTrack, src: resolvedSrc };
      
      dispatch({ 
        type: 'PLAY_TRACK', 
        payload: { track: finalTrack, queue, index } 
      });
      
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
    stop: () => dispatch({ type: 'STOP' }),
    next: () => dispatch({ type: 'NEXT' }),
    previous: () => dispatch({ type: 'PREVIOUS' }),
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
    clearQueue: () => dispatch({ type: 'CLEAR_QUEUE' }),
    setCrossfade: (enabled: boolean) => dispatch({ type: 'SET_CROSSFADE', payload: enabled }),
    setGapless: (enabled: boolean) => dispatch({ type: 'SET_GAPLESS', payload: enabled }),
    setQuality: (quality: 'auto' | 'high' | 'medium' | 'low') => dispatch({ type: 'SET_QUALITY', payload: quality })
  };

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
    state.quality
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