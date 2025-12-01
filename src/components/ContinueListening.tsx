import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { 
  Play, 
  X, 
  Clock, 
  Headphones,
  ChevronRight 
} from 'lucide-react';
import { useListeningHistory, ListeningHistoryItem } from '@/hooks/useListeningHistory';
import { useGlobalPlayer, Track } from '@/components/GlobalPlayer/GlobalPlayer';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface ContinueListeningProps {
  className?: string;
  maxItems?: number;
  showTitle?: boolean;
  compact?: boolean;
}

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const formatTimeLeft = (item: ListeningHistoryItem) => {
  const secondsLeft = item.duration * (1 - item.progress);
  if (secondsLeft < 60) return 'Less than 1 min left';
  const minsLeft = Math.ceil(secondsLeft / 60);
  return `${minsLeft} min left`;
};

export const ContinueListening = ({ 
  className, 
  maxItems = 6,
  showTitle = true,
  compact = false 
}: ContinueListeningProps) => {
  const { continueListening, removeFromHistory } = useListeningHistory();
  const { actions } = useGlobalPlayer();
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // Filter out dismissed items and limit
  const visibleItems = continueListening
    .filter(item => !dismissedIds.has(item.id))
    .slice(0, maxItems);

  if (visibleItems.length === 0) {
    return null;
  }

  const handlePlay = (item: ListeningHistoryItem) => {
    if (!item.src) return;
    
    const track: Track = {
      id: item.id,
      title: item.title,
      artist: item.artist,
      src: item.src,
      artwork: item.artwork,
      duration: item.duration,
      type: item.type,
      releaseId: item.releaseId,
    };

    // Play and seek to saved position
    actions.play(track);
    setTimeout(() => {
      actions.seek(item.progress * item.duration);
    }, 100);
  };

  const handleDismiss = (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation();
    setDismissedIds(prev => new Set([...prev, itemId]));
    removeFromHistory(itemId);
  };

  if (compact) {
    return (
      <div className={cn("space-y-2", className)}>
        {showTitle && (
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Continue Listening</span>
          </div>
        )}
        <div className="flex gap-2 overflow-x-auto pb-2">
          <AnimatePresence mode="popLayout">
            {visibleItems.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex-shrink-0"
              >
                <button
                  onClick={() => handlePlay(item)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
                >
                  <div className="relative w-8 h-8 rounded overflow-hidden bg-muted">
                    {item.artwork ? (
                      <img src={item.artwork} alt={item.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Headphones className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play className="h-4 w-4 text-white" />
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-medium truncate max-w-[100px]">{item.title}</p>
                    <p className="text-[10px] text-muted-foreground">{Math.round(item.progress * 100)}%</p>
                  </div>
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  return (
    <Card className={cn("border-primary/10 bg-gradient-to-br from-background to-primary/5", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-base">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Clock className="h-4 w-4 text-primary" />
            </div>
            Continue Listening
          </div>
          {continueListening.length > maxItems && (
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
              View All <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="w-full">
          <div className="flex gap-4 pb-2">
            <AnimatePresence mode="popLayout">
              {visibleItems.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex-shrink-0 w-[160px]"
                >
                  <div className="group relative">
                    {/* Artwork */}
                    <div 
                      className="relative aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer"
                      onClick={() => handlePlay(item)}
                    >
                      {item.artwork ? (
                        <img 
                          src={item.artwork} 
                          alt={item.title} 
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                          <Headphones className="h-12 w-12 text-primary/50" />
                        </div>
                      )}
                      
                      {/* Play overlay */}
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                        <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-lg">
                          <Play className="h-6 w-6 text-primary-foreground ml-0.5" />
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30">
                        <div 
                          className="h-full bg-primary transition-all"
                          style={{ width: `${item.progress * 100}%` }}
                        />
                      </div>

                      {/* Dismiss button */}
                      <button
                        onClick={(e) => handleDismiss(e, item.id)}
                        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                      >
                        <X className="h-3 w-3 text-white" />
                      </button>
                    </div>

                    {/* Track info */}
                    <div className="mt-2 space-y-0.5">
                      <h4 className="text-sm font-medium truncate">{item.title}</h4>
                      <p className="text-xs text-muted-foreground truncate">{item.artist}</p>
                      <p className="text-xs text-primary">{formatTimeLeft(item)}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default ContinueListening;

