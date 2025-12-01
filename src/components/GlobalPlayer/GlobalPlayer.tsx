import React, { useEffect } from 'react';
import { GlobalPlayerProvider } from './GlobalPlayerProvider';
import { MicroPlayer } from './MicroPlayer';
import { ExpandedPlayer } from './ExpandedPlayer';
import { ListeningHistoryTracker } from './ListeningHistoryTracker';

interface GlobalPlayerProps {
  children: React.ReactNode;
}

export const GlobalPlayer: React.FC<GlobalPlayerProps> = ({ children }) => {
  // Set CSS custom property for micro player height
  useEffect(() => {
    document.documentElement.style.setProperty('--micro-player-height', '72px');
    
    return () => {
      document.documentElement.style.removeProperty('--micro-player-height');
    };
  }, []);

  return (
    <GlobalPlayerProvider>
      {children}
      <ListeningHistoryTracker />
      <MicroPlayer />
      <ExpandedPlayer />
    </GlobalPlayerProvider>
  );
};

// Export hooks and types for use in other components
export { useGlobalPlayer, type Track } from './GlobalPlayerProvider';