import React, { createContext, useContext, useReducer, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { playerAnalytics } from '@/services/analytics/player-analytics';
import { trackAccessControl } from '@/services/audio/track-access-control';
import { resolvePlayableUrl } from '@/services/audio/url-resolver';

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

    case 'TOGGLE_REPEAT':
      const nextRepeat = state.repeat === 'none' ? 'all' : state.repeat === 'all' ? 'one' : 'none';
      return {
        ...state,
        repeat: nextRepeat
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

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
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
    const playerState = {
      volume: state.volume,
      shuffle: state.shuffle,
      repeat: state.repeat,
      crossfadeEnabled: state.crossfadeEnabled,
      gaplessEnabled: state.gaplessEnabled,
      quality: state.quality
    };

    localStorage.setItem('globalPlayer', JSON.stringify(playerState));
  }, [state.volume, state.shuffle, state.repeat, state.crossfadeEnabled, state.gaplessEnabled, state.quality]);

  // Restore player state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('globalPlayer');
    if (saved) {
      try {
        const savedState = JSON.parse(saved);
        dispatch({ type: 'SET_VOLUME', payload: savedState.volume || 1 });
        if (savedState.shuffle) dispatch({ type: 'TOGGLE_SHUFFLE' });
        if (savedState.repeat && savedState.repeat !== 'none') {
          dispatch({ type: 'TOGGLE_REPEAT' });
          if (savedState.repeat === 'one') dispatch({ type: 'TOGGLE_REPEAT' });
        }
        dispatch({ type: 'SET_CROSSFADE', payload: savedState.crossfadeEnabled || false });
        dispatch({ type: 'SET_GAPLESS', payload: savedState.gaplessEnabled !== false });
        dispatch({ type: 'SET_QUALITY', payload: savedState.quality || 'auto' });
      } catch (error) {
        console.error('Error restoring player state:', error);
      }
    }
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