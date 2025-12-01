import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  ChevronUp,
  Heart,
  MoreHorizontal,
  Lock,
  Volume2,
  VolumeX,
  PenTool,
  List,
  Shuffle,
  Repeat
} from 'lucide-react';
import { useGlobalPlayer } from './GlobalPlayerProvider';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface MicroPlayerProps {
  className?: string;
}

export const MicroPlayer: React.FC<MicroPlayerProps> = ({ className }) => {
  const { state, actions } = useGlobalPlayer();
  const { toast } = useToast();
  const [isLiked, setIsLiked] = useState(false);
  const [showVolume, setShowVolume] = useState(false);

  if (!state.currentTrack) {
    return null;
  }

  const previewLimit = state.currentTrack.streamable
    ? undefined
    : state.currentTrack.preview_duration;

  const effectiveDuration = state.currentTrack.streamable
    ? state.duration
    : previewLimit ?? state.currentTrack.preview_duration ?? state.duration;

  const clampedDuration = effectiveDuration > 0 ? effectiveDuration : state.duration;
  const clampedCurrentTime = state.currentTrack.streamable
    ? state.currentTime
    : Math.min(state.currentTime, previewLimit ?? state.currentTrack.preview_duration ?? state.currentTime);

  const progress = clampedDuration > 0 ? (clampedCurrentTime / clampedDuration) * 100 : 0;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * (clampedDuration || state.duration);
    const limitedTime = state.currentTrack.streamable
      ? newTime
      : Math.min(
          newTime,
          previewLimit ?? state.currentTrack.preview_duration ?? newTime
        );
    actions.seek(limitedTime);
  };

  const purchaseUrl = state.currentTrack.requiresPurchase ? state.currentTrack.purchaseUrl : undefined;

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
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-medium truncate">
                {state.currentTrack.title}
              </h4>
              {state.currentTrack.isLocked && (
                <Lock className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              )}
            </div>
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

        {/* Extended controls - hidden on mobile */}
        <div className="hidden md:flex items-center gap-1">
          {/* Shuffle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={actions.toggleShuffle}
            className={cn("h-8 w-8 p-0 hover:bg-muted/50", state.shuffle && "text-primary")}
          >
            <Shuffle className="h-3.5 w-3.5" />
          </Button>

          {/* Repeat */}
          <Button
            variant="ghost"
            size="sm"
            onClick={actions.toggleRepeat}
            className={cn("h-8 w-8 p-0 hover:bg-muted/50 relative", state.repeat !== 'none' && "text-primary")}
          >
            <Repeat className="h-3.5 w-3.5" />
            {state.repeat === 'one' && (
              <span className="absolute -top-0.5 -right-0.5 text-[8px] font-bold text-primary">1</span>
            )}
          </Button>

          {/* Volume Control */}
          <div className="relative flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowVolume(!showVolume)}
              onMouseEnter={() => setShowVolume(true)}
              className="h-8 w-8 p-0 hover:bg-muted/50"
            >
              {state.isMuted || state.volume === 0 ? (
                <VolumeX className="h-3.5 w-3.5" />
              ) : (
                <Volume2 className="h-3.5 w-3.5" />
              )}
            </Button>
            {showVolume && (
              <div 
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 bg-popover border rounded-lg shadow-lg w-8"
                onMouseLeave={() => setShowVolume(false)}
              >
                <Slider
                  orientation="vertical"
                  value={[state.isMuted ? 0 : state.volume * 100]}
                  max={100}
                  step={1}
                  onValueChange={(value) => actions.setVolume(value[0] / 100)}
                  className="h-20"
                />
              </div>
            )}
          </div>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-1">
          {/* Like */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setIsLiked(!isLiked);
              toast({ title: isLiked ? 'Removed from Favorites' : 'Added to Favorites' });
            }}
            className="h-8 w-8 p-0 hover:bg-muted/50 hidden sm:flex"
          >
            <Heart className={cn("h-4 w-4", isLiked && "fill-red-500 text-red-500")} />
          </Button>

          {/* Queue */}
          <Button
            variant="ghost"
            size="sm"
            onClick={actions.toggleExpanded}
            className="h-8 w-8 p-0 hover:bg-muted/50 hidden sm:flex"
          >
            <List className="h-4 w-4" />
          </Button>

          {/* BarFlow - Write Lyrics */}
          <Button
            variant="ghost"
            size="sm"
            onClick={actions.toggleExpanded}
            className="h-8 w-8 p-0 hover:bg-muted/50 hidden lg:flex"
            title="Write lyrics (BarFlow)"
          >
            <PenTool className="h-4 w-4" />
          </Button>

          {/* Expand */}
          <Button
            variant="ghost"
            size="sm"
            onClick={actions.toggleExpanded}
            className="h-8 w-8 p-0 hover:bg-muted/50"
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
        </div>

        {state.currentTrack.requiresPurchase && purchaseUrl && (
          <Button
            size="sm"
            className="ml-2"
            asChild
          >
            <a href={purchaseUrl}>
              Purchase / Unlock
            </a>
          </Button>
        )}

        {/* Time display - hidden on mobile */}
        <div className="text-xs text-muted-foreground hidden md:block whitespace-nowrap ml-2">
          {formatTime(clampedCurrentTime)} / {formatTime(clampedDuration || state.duration)}
        </div>
      </div>
    </div>
  );
};