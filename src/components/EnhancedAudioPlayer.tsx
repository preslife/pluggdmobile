import React, { useState, useRef, useEffect, createContext, useContext } from 'react';
import { Link } from 'react-router-dom';
import { getCreatorIdFromArtistName } from '@/utils/artistCreatorMapping';
import { Button } from '@/components/ui/button';
import { Play, Pause, SkipBack, SkipForward, Repeat, Shuffle, List, Heart, PenTool, ShoppingBag } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { WaveformProgress } from './audio/WaveformProgress';
import { VolumePopup } from './audio/VolumePopup';
import { PlayerOptionsMenu } from './audio/PlayerOptionsMenu';
import { useFavorites } from '@/hooks/useFavorites';
import Barflow from './Barflow';
import BeatLicensingModal from './BeatLicensingModal';
import { ScrollArea } from '@/components/ui/scroll-area';

type Track = {
  id: string;
  title: string;
  artist: string;
  src: string;
  artwork?: string | null;
  duration?: number;
  releaseId?: string;
  userId?: string;
  type?: 'beat' | 'release';
  price?: number;
  currency?: string;
};

type AudioPlayerContextType = {
  currentTrack: Track | null;
  isPlaying: boolean;
  queue: Track[];
  currentIndex: number;
  play: (track: Track) => void;
  pause: () => void;
  resume: () => void;
  next: () => void;
  previous: () => void;
  addToQueue: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  setQueue: (tracks: Track[], startIndex?: number) => void;
  clearQueue: () => void;
  shuffle: boolean;
  repeat: 'none' | 'one' | 'all';
  toggleShuffle: () => void;
  toggleRepeat: () => void;
};

const AudioPlayerContext = createContext<AudioPlayerContextType | undefined>(undefined);

export const useAudioPlayer = () => {
  const context = useContext(AudioPlayerContext);
  if (!context) {
    throw new Error('useAudioPlayer must be used within AudioPlayerProvider');
  }
  return context;
};

export const AudioPlayerProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [queue, setQueueState] = useState<Track[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<'none' | 'one' | 'all'>('none');
  const [originalQueue, setOriginalQueue] = useState<Track[]>([]);

  const play = (track: Track) => {
    setCurrentTrack(track);
    setIsPlaying(true);
    
    // Add to queue if not already there
    if (!queue.find(t => t.id === track.id)) {
      setQueueState(prev => [...prev, track]);
    }
    
    const index = queue.findIndex(t => t.id === track.id);
    if (index !== -1) {
      setCurrentIndex(index);
    }
  };

  const pause = () => setIsPlaying(false);
  const resume = () => setIsPlaying(true);

  const next = () => {
    if (queue.length === 0) return;
    
    let nextIndex;
    if (shuffle) {
      nextIndex = Math.floor(Math.random() * queue.length);
    } else {
      nextIndex = currentIndex + 1;
      if (nextIndex >= queue.length) {
        nextIndex = repeat === 'all' ? 0 : currentIndex;
      }
    }
    
    if (nextIndex !== currentIndex || repeat === 'one') {
      setCurrentIndex(nextIndex);
      setCurrentTrack(queue[nextIndex]);
      setIsPlaying(true);
    }
  };

  const previous = () => {
    if (queue.length === 0) return;
    
    let prevIndex;
    if (shuffle) {
      prevIndex = Math.floor(Math.random() * queue.length);
    } else {
      prevIndex = currentIndex - 1;
      if (prevIndex < 0) {
        prevIndex = repeat === 'all' ? queue.length - 1 : 0;
      }
    }
    
    setCurrentIndex(prevIndex);
    setCurrentTrack(queue[prevIndex]);
    setIsPlaying(true);
  };

  const addToQueue = (track: Track) => {
    if (!queue.find(t => t.id === track.id)) {
      setQueueState(prev => [...prev, track]);
    }
  };

  const removeFromQueue = (index: number) => {
    const newQueue = [...queue];
    newQueue.splice(index, 1);
    setQueueState(newQueue);
    
    if (index === currentIndex && newQueue.length > 0) {
      const newIndex = Math.min(currentIndex, newQueue.length - 1);
      setCurrentIndex(newIndex);
      setCurrentTrack(newQueue[newIndex]);
    } else if (index < currentIndex) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const setQueue = (tracks: Track[], startIndex: number = 0) => {
    setQueueState(tracks);
    setOriginalQueue(tracks);
    const validIndex = Math.max(0, Math.min(startIndex, tracks.length - 1));
    setCurrentIndex(validIndex);
    if (tracks.length > 0) {
      setCurrentTrack(tracks[validIndex]);
    }
  };

  const clearQueue = () => {
    setQueueState([]);
    setCurrentTrack(null);
    setCurrentIndex(0);
    setIsPlaying(false);
  };

  const toggleShuffle = () => {
    setShuffle(prev => {
      if (!prev) {
        // Enable shuffle: randomize queue
        const shuffled = [...queue].sort(() => Math.random() - 0.5);
        setQueueState(shuffled);
        const newIndex = shuffled.findIndex(t => t.id === currentTrack?.id);
        setCurrentIndex(newIndex !== -1 ? newIndex : 0);
      } else {
        // Disable shuffle: restore original order
        setQueueState(originalQueue);
        const newIndex = originalQueue.findIndex(t => t.id === currentTrack?.id);
        setCurrentIndex(newIndex !== -1 ? newIndex : 0);
      }
      return !prev;
    });
  };

  const toggleRepeat = () => {
    setRepeat(prev => {
      switch (prev) {
        case 'none': return 'all';
        case 'all': return 'one';
        case 'one': return 'none';
        default: return 'none';
      }
    });
  };

  return (
    <AudioPlayerContext.Provider value={{
      currentTrack,
      isPlaying,
      queue,
      currentIndex,
      play,
      pause,
      resume,
      next,
      previous,
      addToQueue,
      removeFromQueue,
      setQueue,
      clearQueue,
      shuffle,
      repeat,
      toggleShuffle,
      toggleRepeat
    }}>
      {children}
      <EnhancedAudioPlayer />
    </AudioPlayerContext.Provider>
  );
};

const EnhancedAudioPlayer = () => {
  const {
    currentTrack,
    isPlaying,
    queue,
    currentIndex,
    pause,
    resume,
    next,
    previous,
    removeFromQueue,
    shuffle,
    repeat,
    toggleShuffle,
    toggleRepeat
  } = useAudioPlayer();

  const { isFavorited, toggleFavorite } = useFavorites();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  const [showBarflow, setShowBarflow] = useState(false);
  const [showLicensing, setShowLicensing] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => {
      if (repeat === 'one') {
        audio.currentTime = 0;
        audio.play();
      } else {
        next();
      }
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [next, repeat]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    if (isPlaying) {
      audio.play().catch(console.error);
    } else {
      audio.pause();
    }
  }, [isPlaying, currentTrack]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    audio.volume = isMuted ? 0 : volume / 100;
  }, [volume, isMuted]);

  const handleSeek = (value: number[]) => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const newTime = (value[0] / 100) * duration;
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleWaveformSeek = (time: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    
    audio.currentTime = time;
    setCurrentTime(time);
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0]);
    setIsMuted(false);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!currentTrack) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border z-50">
      <div className="max-w-7xl mx-auto px-4 py-3">
        {/* Waveform Progress Bar */}
        <div className="mb-3">
          <WaveformProgress
            currentTime={currentTime}
            duration={duration}
            onSeek={handleWaveformSeek}
            className="w-full"
          />
        </div>

        <div className="flex items-center gap-4">
          {/* Track Info */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-lg overflow-hidden flex-shrink-0">
              {currentTrack.artwork ? (
                <img 
                  src={currentTrack.artwork} 
                  alt={currentTrack.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-lg">🎵</div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              {currentTrack.type === 'beat' ? (
                <Link to={`/beat/${currentTrack.id}`} className="font-semibold truncate hover:text-primary transition-colors">
                  {currentTrack.title}
                </Link>
              ) : currentTrack.type === 'release' && currentTrack.releaseId ? (
                <Link to={`/release/${currentTrack.releaseId}`} className="font-semibold truncate hover:text-primary transition-colors">
                  {currentTrack.title}
                </Link>
              ) : (
                <p className="font-semibold truncate">{currentTrack.title}</p>
              )}
              
              {currentTrack.userId ? (
                <Link to={`/profile/${currentTrack.userId}`} className="text-sm text-muted-foreground truncate hover:text-primary transition-colors">
                  {currentTrack.artist}
                </Link>
              ) : (
                (() => {
                  const creatorId = getCreatorIdFromArtistName(currentTrack.artist);
                  return creatorId ? (
                    <Link to={`/profile/${creatorId}`} className="text-sm text-muted-foreground truncate hover:text-primary transition-colors">
                      {currentTrack.artist}
                    </Link>
                  ) : (
                    <p className="text-sm text-muted-foreground truncate">{currentTrack.artist}</p>
                  );
                })()
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Like Button */}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => toggleFavorite(currentTrack.id)}
              className={`w-8 h-8 ${isFavorited(currentTrack.id) ? 'text-red-500' : 'text-muted-foreground'}`}
            >
              <Heart className={`w-4 h-4 ${isFavorited(currentTrack.id) ? 'fill-current' : ''}`} />
            </Button>

            {/* Barflow Button */}
            <Dialog open={showBarflow} onOpenChange={setShowBarflow}>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-8 h-8"
                >
                  <PenTool className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-6xl h-[90vh] p-0">
                <Barflow />
              </DialogContent>
            </Dialog>
          </div>

          {/* Playback Controls */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={toggleShuffle}
              className={`w-8 h-8 ${shuffle ? 'text-primary' : 'text-muted-foreground'}`}
            >
              <Shuffle className="w-4 h-4" />
            </Button>
            
            <Button
              size="sm"
              variant="ghost"
              onClick={previous}
              className="w-8 h-8"
            >
              <SkipBack className="w-4 h-4" />
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={isPlaying ? pause : resume}
              className="w-10 h-10 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={next}
              className="w-8 h-8"
            >
              <SkipForward className="w-4 h-4" />
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={toggleRepeat}
              className={`w-8 h-8 ${repeat !== 'none' ? 'text-primary' : 'text-muted-foreground'}`}
            >
              <Repeat className="w-4 h-4" />
              {repeat === 'one' && (
                <span className="absolute text-xs font-bold">1</span>
              )}
            </Button>
          </div>

          {/* Time Display */}
          <div className="flex items-center gap-2 min-w-[100px]">
            <span className="text-xs text-muted-foreground">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {/* Volume Popup */}
            <VolumePopup
              volume={volume}
              isMuted={isMuted}
              onVolumeChange={handleVolumeChange}
              onToggleMute={toggleMute}
            />

            {/* Options Menu */}
            <PlayerOptionsMenu 
              track={currentTrack}
              
            />

            {/* Queue */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="relative">
                  <List className="w-4 h-4" />
                  {queue.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                      {queue.length}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Queue ({queue.length} tracks)</SheetTitle>
                </SheetHeader>
                <ScrollArea className="h-[calc(100vh-120px)] mt-4">
                  <div className="space-y-2">
                    {queue.map((track, index) => (
                      <Card key={track.id} className={`cursor-pointer ${index === currentIndex ? 'bg-muted' : ''}`}>
                        <CardContent className="p-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-secondary/20 rounded overflow-hidden flex-shrink-0">
                              {track.artwork ? (
                                <img src={track.artwork} alt={track.title} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-sm">🎵</div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{track.title}</p>
                              <p className="text-sm text-muted-foreground truncate">{track.artist}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFromQueue(index)}
                              className="w-8 h-8"
                            >
                              ×
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </SheetContent>
            </Sheet>

            {/* Buy Button */}
            {currentTrack.type === 'beat' && (
              <>
                <BeatLicensingModal
                  isOpen={showLicensing}
                  onClose={() => setShowLicensing(false)}
                  beat={{
                    id: currentTrack.id,
                    title: currentTrack.title,
                    user_id: currentTrack.userId || 'unknown',
                    price: currentTrack.price || 25
                  }}
                />
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => setShowLicensing(true)}
                  className="gap-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                >
                  <ShoppingBag className="w-3 h-3" />
                  £{currentTrack.price || 25}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Hidden Audio Element */}
      {currentTrack && (
        <audio
          ref={audioRef}
          src={currentTrack.src}
          preload="metadata"
        />
      )}
    </div>
  );
};