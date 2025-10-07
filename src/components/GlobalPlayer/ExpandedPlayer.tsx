import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  ChevronDown,
  Heart,
  Share2,
  Plus,
  Shuffle,
  Repeat,
  Volume2,
  VolumeX,
  MoreHorizontal,
  List,
  Settings,
  ExternalLink,
  Lock
} from 'lucide-react';
import { useGlobalPlayer } from './GlobalPlayerProvider';
import { cn } from '@/lib/utils';
import { QueueManager } from './QueueManager';
import { PlayerSettings } from './PlayerSettings';

interface ExpandedPlayerProps {
  className?: string;
}

export const ExpandedPlayer: React.FC<ExpandedPlayerProps> = ({ className }) => {
  const { state, actions } = useGlobalPlayer();
  const [activeTab, setActiveTab] = useState<'player' | 'queue' | 'settings'>('player');
  
  if (!state.currentTrack || !state.isExpanded) {
    return null;
  }

  const previewLimit = state.currentTrack.streamable
    ? undefined
    : state.currentTrack.preview_duration;

  const effectiveDuration = state.currentTrack.streamable
    ? state.duration
    : previewLimit ?? state.currentTrack.preview_duration ?? state.duration;

  const safeDuration = effectiveDuration && effectiveDuration > 0 ? effectiveDuration : state.duration;
  const clampedCurrentTime = state.currentTrack.streamable
    ? state.currentTime
    : Math.min(state.currentTime, previewLimit ?? state.currentTrack.preview_duration ?? state.currentTime);

  const progress = safeDuration > 0 ? (clampedCurrentTime / safeDuration) * 100 : 0;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSeek = (value: number[]) => {
    const newTime = (value[0] / 100) * (safeDuration || state.duration);
    const limitedTime = state.currentTrack.streamable
      ? newTime
      : Math.min(
          newTime,
          previewLimit ?? state.currentTrack.preview_duration ?? newTime
        );
    actions.seek(limitedTime);
  };

  const handleVolumeChange = (value: number[]) => {
    actions.setVolume(value[0] / 100);
  };

  const purchaseUrl = state.currentTrack.requiresPurchase ? state.currentTrack.purchaseUrl : undefined;

  return (
    <div 
      className={cn(
        "fixed inset-0 z-50 bg-background",
        "transition-transform duration-300 ease-in-out",
        className
      )}
      style={{ 
        transform: state.isExpanded ? 'translateY(0)' : 'translateY(100%)'
      }}
    >
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <Button
            variant="ghost"
            size="sm"
            onClick={actions.toggleExpanded}
            className="h-8 w-8 p-0"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center gap-2">
            <Button
              variant={activeTab === 'player' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('player')}
            >
              Now Playing
            </Button>
            <Button
              variant={activeTab === 'queue' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('queue')}
            >
              <List className="h-4 w-4 mr-2" />
              Queue ({state.queue.length})
            </Button>
            <Button
              variant={activeTab === 'settings' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('settings')}
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm">
              <Share2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          {activeTab === 'player' && (
            <div className="h-full flex flex-col lg:flex-row">
              {/* Artwork & Info */}
              <div className="lg:w-1/2 p-8 flex flex-col justify-center items-center">
                <div className="w-full max-w-md">
                  {/* Artwork */}
                  <div className="aspect-square mb-6 rounded-lg overflow-hidden shadow-2xl">
                    {state.currentTrack.artwork ? (
                      <img
                        src={state.currentTrack.artwork}
                        alt={state.currentTrack.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <div className="text-6xl text-muted-foreground">♪</div>
                      </div>
                    )}
                  </div>

                  {/* Track Info */}
                  <div className="text-center space-y-2">
                    <h1 className="text-2xl font-bold">{state.currentTrack.title}</h1>
                    <p className="text-lg text-muted-foreground">{state.currentTrack.artist}</p>
                    
                    {/* Track metadata */}
                    <div className="flex items-center justify-center gap-2 mt-4">
                      {state.currentTrack.type && (
                        <Badge variant="outline" className="capitalize">
                          {state.currentTrack.type}
                        </Badge>
                      )}
                      {!state.currentTrack.streamable && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Lock className="h-3 w-3" /> Preview
                        </Badge>
                      )}
                      {state.currentTrack.owned && (
                        <Badge variant="default">Owned</Badge>
                      )}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center justify-center gap-4 mt-6">
                    <Button variant="ghost" size="sm">
                      <Heart className="h-4 w-4 mr-2" />
                      Like
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add to Playlist
                    </Button>
                    {state.currentTrack.releaseId && (
                      <Button variant="ghost" size="sm" asChild>
                        <a href={`/release/${state.currentTrack.releaseId}`}>
                          <ExternalLink className="h-4 w-4 mr-2" />
                          View Release
                        </a>
                      </Button>
                    )}
                    {state.currentTrack.requiresPurchase && purchaseUrl && (
                      <Button size="sm" className="ml-2" asChild>
                        <a href={purchaseUrl}>
                          Purchase / Unlock
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="lg:w-1/2 p-8 flex flex-col justify-center">
                <div className="w-full max-w-md mx-auto space-y-6">
                  {/* Progress */}
                  <div className="space-y-2">
                    <Slider
                      value={[progress]}
                      max={100}
                      step={0.1}
                      onValueChange={handleSeek}
                      className="w-full"
                    />
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>{formatTime(clampedCurrentTime)}</span>
                      <span>{formatTime(safeDuration || state.duration)}</span>
                    </div>
                  </div>

                  {/* Main Controls */}
                  <div className="flex items-center justify-center gap-4">
                    <Button
                      variant="ghost"
                      size="lg"
                      onClick={actions.toggleShuffle}
                      className={cn(
                        "h-12 w-12 p-0",
                        state.shuffle && "text-primary"
                      )}
                    >
                      <Shuffle className="h-5 w-5" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="lg"
                      onClick={actions.previous}
                      className="h-12 w-12 p-0"
                    >
                      <SkipBack className="h-6 w-6" />
                    </Button>

                    <Button
                      size="lg"
                      onClick={state.isPlaying ? actions.pause : actions.resume}
                      className="h-16 w-16 rounded-full"
                    >
                      {state.isPlaying ? (
                        <Pause className="h-8 w-8" />
                      ) : (
                        <Play className="h-8 w-8 ml-1" />
                      )}
                    </Button>

                    <Button
                      variant="ghost"
                      size="lg"
                      onClick={actions.next}
                      className="h-12 w-12 p-0"
                    >
                      <SkipForward className="h-6 w-6" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="lg"
                      onClick={actions.toggleRepeat}
                      className={cn(
                        "h-12 w-12 p-0",
                        state.repeat !== 'none' && "text-primary"
                      )}
                    >
                      <Repeat className="h-5 w-5" />
                      {state.repeat === 'one' && (
                        <span className="absolute text-xs font-bold">1</span>
                      )}
                    </Button>
                  </div>

                  {/* Volume */}
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={actions.toggleMute}
                      className="h-8 w-8 p-0 flex-shrink-0"
                    >
                      {state.isMuted || state.volume === 0 ? (
                        <VolumeX className="h-4 w-4" />
                      ) : (
                        <Volume2 className="h-4 w-4" />
                      )}
                    </Button>
                    <Slider
                      value={[state.isMuted ? 0 : state.volume * 100]}
                      max={100}
                      step={1}
                      onValueChange={handleVolumeChange}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'queue' && (
            <QueueManager />
          )}

          {activeTab === 'settings' && (
            <PlayerSettings />
          )}
        </div>
      </div>
    </div>
  );
};