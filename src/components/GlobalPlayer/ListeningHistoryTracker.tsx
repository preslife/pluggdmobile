import { useEffect, useRef } from 'react';
import { useGlobalPlayer } from './GlobalPlayerProvider';
import { useListeningHistory } from '@/hooks/useListeningHistory';

/**
 * This component tracks listening progress and saves it to localStorage.
 * It should be rendered inside GlobalPlayerProvider.
 */
export const ListeningHistoryTracker = () => {
  const { state } = useGlobalPlayer();
  const { updateProgress, markCompleted } = useListeningHistory();
  const lastUpdateRef = useRef<number>(0);
  const UPDATE_INTERVAL = 5000; // Update every 5 seconds

  useEffect(() => {
    const { currentTrack, currentTime, duration, isPlaying } = state;
    
    // Only track when playing and we have valid data
    if (!currentTrack || !isPlaying || duration <= 0) return;

    const now = Date.now();
    
    // Throttle updates to every 5 seconds
    if (now - lastUpdateRef.current < UPDATE_INTERVAL) return;
    lastUpdateRef.current = now;

    const progress = currentTime / duration;
    
    // Mark as completed if > 95% done
    if (progress > 0.95) {
      markCompleted(currentTrack.id);
      return;
    }
    
    // Only save if between 5% and 95%
    if (progress > 0.05 && progress < 0.95) {
      updateProgress(currentTrack.id, {
        title: currentTrack.title,
        artist: currentTrack.artist,
        artwork: currentTrack.artwork,
        duration: duration,
        currentTime: currentTime,
        type: currentTrack.type,
        releaseId: currentTrack.releaseId,
        src: currentTrack.src,
      });
    }
  }, [state.currentTime, state.isPlaying, state.currentTrack, state.duration, updateProgress, markCompleted]);

  // Also save on pause
  useEffect(() => {
    const { currentTrack, currentTime, duration, isPaused } = state;
    
    if (!currentTrack || !isPaused || duration <= 0) return;
    
    const progress = currentTime / duration;
    
    // Save on pause if between 5% and 95%
    if (progress > 0.05 && progress < 0.95) {
      updateProgress(currentTrack.id, {
        title: currentTrack.title,
        artist: currentTrack.artist,
        artwork: currentTrack.artwork,
        duration: duration,
        currentTime: currentTime,
        type: currentTrack.type,
        releaseId: currentTrack.releaseId,
        src: currentTrack.src,
      });
    }
  }, [state.isPaused, state.currentTrack, state.currentTime, state.duration, updateProgress]);

  // This component doesn't render anything
  return null;
};

export default ListeningHistoryTracker;

