import React from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Play,
  X,
  GripVertical,
  MoreHorizontal,
  Music,
  Clock
} from 'lucide-react';
import { useGlobalPlayer, Track } from './GlobalPlayerProvider';
import { cn } from '@/lib/utils';

interface QueueManagerProps {
  className?: string;
}

export const QueueManager: React.FC<QueueManagerProps> = ({ className }) => {
  const { state, actions } = useGlobalPlayer();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTotalDuration = () => {
    return state.queue.reduce((total, track) => total + (track.duration || 0), 0);
  };

  const handleTrackClick = (index: number) => {
    const track = state.queue[index];
    if (track) {
      actions.play(track, state.queue, index);
    }
  };

  const handleRemoveFromQueue = (index: number) => {
    actions.removeFromQueue(index);
  };

  if (state.queue.length === 0) {
    return (
      <div className={cn("h-full flex flex-col items-center justify-center p-8 text-center", className)}>
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
          <Music className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No tracks in queue</h3>
        <p className="text-muted-foreground mb-4">
          Add some music to your queue to see it here
        </p>
      </div>
    );
  }

  return (
    <div className={cn("h-full flex flex-col", className)}>
      {/* Queue header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Queue ({state.queue.length} tracks)</h3>
            <p className="text-sm text-muted-foreground">
              <Clock className="inline h-3 w-3 mr-1" />
              {formatTime(getTotalDuration())} total
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={actions.clearQueue}
            >
              Clear Queue
            </Button>
          </div>
        </div>
      </div>

      {/* Current track indicator */}
      {state.currentTrack && (
        <div className="p-4 bg-muted/50">
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Now Playing</h4>
          <div className="flex items-center gap-3">
            {state.currentTrack.artwork && (
              <img
                src={state.currentTrack.artwork}
                alt={state.currentTrack.title}
                className="w-10 h-10 rounded object-cover"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{state.currentTrack.title}</p>
              <p className="text-sm text-muted-foreground truncate">{state.currentTrack.artist}</p>
            </div>
            <div className="text-sm text-muted-foreground">
              {state.currentTrack.duration && formatTime(state.currentTrack.duration)}
            </div>
          </div>
        </div>
      )}

      {/* Queue list */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground mb-3">
            Up Next ({state.queue.length - (state.currentIndex + 1)} tracks)
          </h4>
          
          {state.queue.map((track, index) => {
            const isCurrentTrack = index === state.currentIndex;
            const isUpcoming = index > state.currentIndex;
            
            // Don't show current track in the upcoming list
            if (isCurrentTrack) return null;
            
            return (
              <div
                key={`${track.id}-${index}`}
                className={cn(
                  "group flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer",
                  !isUpcoming && "opacity-50"
                )}
                onClick={() => handleTrackClick(index)}
              >
                {/* Drag handle */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 cursor-grab"
                >
                  <GripVertical className="h-3 w-3" />
                </Button>

                {/* Track number / play button */}
                <div className="w-6 h-6 flex items-center justify-center text-sm text-muted-foreground">
                  <span className="group-hover:hidden">{index + 1}</span>
                  <Play className="h-3 w-3 hidden group-hover:block" />
                </div>

                {/* Artwork */}
                {track.artwork ? (
                  <img
                    src={track.artwork}
                    alt={track.title}
                    className="w-10 h-10 rounded object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                    <Music className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}

                {/* Track info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{track.title}</p>
                  <p className="text-sm text-muted-foreground truncate">{track.artist}</p>
                </div>

                {/* Duration */}
                <div className="text-sm text-muted-foreground">
                  {track.duration && formatTime(track.duration)}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                  >
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFromQueue(index);
                    }}
                    className="h-6 w-6 p-0 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })}
          
          {state.queue.length === 1 && (
            <div className="text-center py-8 text-muted-foreground">
              <Music className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Add more tracks to build your queue</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};