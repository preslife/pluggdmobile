import React from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  ChevronUp,
  Heart,
  MoreHorizontal
} from 'lucide-react';
import { useGlobalPlayer } from './GlobalPlayerProvider';
import { cn } from '@/lib/utils';

interface MicroPlayerProps {
  className?: string;
}

export const MicroPlayer: React.FC<MicroPlayerProps> = ({ className }) => {
  const { state, actions } = useGlobalPlayer();
  
  if (!state.currentTrack) {
    return null;
  }

  const progress = state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0;
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * state.duration;
    actions.seek(newTime);
  };

  return (
    <div 
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        "border-t border-border shadow-lg",
        "transition-transform duration-300 ease-in-out",
        className
      )}
      style={{ 
        height: 'var(--micro-player-height, 72px)',
        transform: state.isExpanded ? 'translateY(100%)' : 'translateY(0)'
      }}
    >
      {/* Progress bar at top */}
      <div 
        className="absolute top-0 left-0 right-0 h-1 bg-muted cursor-pointer group"
        onClick={handleProgressClick}
      >
        <div 
          className="h-full bg-primary transition-all duration-150 ease-out"
          style={{ width: `${progress}%` }}
        />
        <div 
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-150"
          style={{ left: `calc(${progress}% - 6px)` }}
        />
      </div>

      <div className="flex items-center h-full px-4 gap-3">
        {/* Track info */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {state.currentTrack.artwork && (
            <img
              src={state.currentTrack.artwork}
              alt={state.currentTrack.title}
              className="w-12 h-12 rounded object-cover flex-shrink-0"
            />
          )}
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-medium truncate">
              {state.currentTrack.title}
            </h4>
            <p className="text-xs text-muted-foreground truncate">
              {state.currentTrack.artist}
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={actions.previous}
            className="h-8 w-8 p-0 hover:bg-muted/50"
          >
            <SkipBack className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={state.isPlaying ? actions.pause : actions.resume}
            className="h-10 w-10 p-0 hover:bg-muted/50"
          >
            {state.isPlaying ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5 ml-0.5" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={actions.next}
            className="h-8 w-8 p-0 hover:bg-muted/50"
          >
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-muted/50 hidden sm:flex"
          >
            <Heart className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-muted/50 hidden sm:flex"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={actions.toggleExpanded}
            className="h-8 w-8 p-0 hover:bg-muted/50"
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
        </div>

        {/* Time display - hidden on mobile */}
        <div className="text-xs text-muted-foreground hidden md:block whitespace-nowrap">
          {formatTime(state.currentTime)} / {formatTime(state.duration)}
        </div>
      </div>
    </div>
  );
};