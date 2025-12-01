import { useState, useEffect, useCallback } from 'react';

const LISTENING_HISTORY_KEY = 'pluggd-listening-history';
const MAX_HISTORY_ITEMS = 20;

export interface ListeningHistoryItem {
  id: string;
  title: string;
  artist: string;
  artwork?: string | null;
  progress: number; // 0-1 percentage
  duration: number; // seconds
  lastPlayedAt: number; // timestamp
  type?: 'beat' | 'release' | 'pack';
  releaseId?: string;
  src?: string;
}

interface ListeningHistoryState {
  items: ListeningHistoryItem[];
}

const loadHistory = (): ListeningHistoryItem[] => {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(LISTENING_HISTORY_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored) as ListeningHistoryState;
    return Array.isArray(parsed.items) ? parsed.items : [];
  } catch {
    return [];
  }
};

const saveHistory = (items: ListeningHistoryItem[]) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LISTENING_HISTORY_KEY, JSON.stringify({ items }));
  } catch (error) {
    console.warn('Failed to save listening history:', error);
  }
};

export const useListeningHistory = () => {
  const [history, setHistory] = useState<ListeningHistoryItem[]>([]);

  // Load history on mount
  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  // Update a track's progress in history
  const updateProgress = useCallback((
    trackId: string,
    trackData: {
      title: string;
      artist: string;
      artwork?: string | null;
      duration: number;
      currentTime: number;
      type?: 'beat' | 'release' | 'pack';
      releaseId?: string;
      src?: string;
    }
  ) => {
    if (!trackId || trackData.duration <= 0) return;

    const progress = trackData.currentTime / trackData.duration;
    
    // Don't save if track is complete (>95%) or barely started (<5%)
    if (progress > 0.95 || progress < 0.05) return;

    setHistory(prev => {
      // Remove existing entry for this track
      const filtered = prev.filter(item => item.id !== trackId);
      
      // Add updated entry at the front
      const newItem: ListeningHistoryItem = {
        id: trackId,
        title: trackData.title,
        artist: trackData.artist,
        artwork: trackData.artwork,
        progress,
        duration: trackData.duration,
        lastPlayedAt: Date.now(),
        type: trackData.type,
        releaseId: trackData.releaseId,
        src: trackData.src,
      };

      const updated = [newItem, ...filtered].slice(0, MAX_HISTORY_ITEMS);
      saveHistory(updated);
      return updated;
    });
  }, []);

  // Mark a track as completed (remove from continue listening)
  const markCompleted = useCallback((trackId: string) => {
    setHistory(prev => {
      const filtered = prev.filter(item => item.id !== trackId);
      saveHistory(filtered);
      return filtered;
    });
  }, []);

  // Remove a specific track from history
  const removeFromHistory = useCallback((trackId: string) => {
    setHistory(prev => {
      const filtered = prev.filter(item => item.id !== trackId);
      saveHistory(filtered);
      return filtered;
    });
  }, []);

  // Clear all history
  const clearHistory = useCallback(() => {
    setHistory([]);
    saveHistory([]);
  }, []);

  // Get tracks that are partially listened (between 5% and 95%)
  const continueListening = history.filter(
    item => item.progress > 0.05 && item.progress < 0.95
  );

  return {
    history,
    continueListening,
    updateProgress,
    markCompleted,
    removeFromHistory,
    clearHistory,
  };
};

export default useListeningHistory;

