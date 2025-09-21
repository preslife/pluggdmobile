import { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGlobalPlayer } from '@/components/GlobalPlayer/GlobalPlayer';

interface ReleasePreviewPlayerProps {
  previewUrl: string | null;
  title: string;
  artist: string;
  onPlay?: () => void;
  isPlaying?: boolean;
  onPause?: () => void;
  standalone?: boolean; // New prop to control standalone vs overlay mode
  useGlobalPlayer?: boolean; // New prop to control global vs local player integration
}

export const ReleasePreviewPlayer = ({ 
  previewUrl, 
  title, 
  artist, 
  onPlay, 
  isPlaying: externalIsPlaying = false,
  onPause,
  standalone = false,
  useGlobalPlayer = true
}: ReleasePreviewPlayerProps) => {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  // Conditionally use the audio player based on useGlobalPlayer prop
  let audioPlayer = null;
  
  if (useGlobalPlayer) {
    try {
      audioPlayer = useGlobalPlayer();
    } catch (error) {
      console.warn('GlobalPlayer context not available:', error);
    }
  }
  
  const { 
    state: { currentTrack, isPlaying: globalIsPlaying }, 
    actions: { play, pause } 
  } = audioPlayer || {
    state: { currentTrack: null, isPlaying: false },
    actions: { play: () => {}, pause: () => {} }
  };
  
  // Create track object from release data
  const track = previewUrl ? {
    id: `preview-${previewUrl}`,
    title: `${title} (Preview)`,
    artist,
    src: previewUrl,
    artwork: null
  } : null;
  
  // Determine playing state based on mode
  const isPlaying = useGlobalPlayer 
    ? globalIsPlaying && currentTrack?.id === track?.id
    : externalIsPlaying;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(Math.min(audio.duration, 30)); // Max 30 seconds

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleAudioEnd);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleAudioEnd);
    };
  }, []);


  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !previewUrl) return;

    if (isPlaying) {
      audio.play().catch(console.error);
    } else {
      audio.pause();
    }
  }, [isPlaying, previewUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Stop after 30 seconds
    if (currentTime >= 30) {
      handleAudioEnd();
    }
  }, [currentTime]);

  const handlePlay = (e?: React.MouseEvent) => {
    e?.stopPropagation(); // Prevent click-through to release page
    if (useGlobalPlayer && track) {
      play(track);
    }
    onPlay?.();
  };

  const handlePause = (e?: React.MouseEvent) => {
    e?.stopPropagation(); // Prevent click-through to release page
    if (useGlobalPlayer) {
      pause();
    }
    onPause?.();
  };

  const handleAudioEnd = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      setCurrentTime(0);
    }
    pause();
    onPause?.();
  };

  const handleStop = (e?: React.MouseEvent) => {
    e?.stopPropagation(); // Prevent click-through to release page
    handleAudioEnd();
  };

  if (!previewUrl) {
    return null;
  }

  const progress = duration > 0 ? (currentTime / Math.min(duration, 30)) * 100 : 0;

  if (standalone) {
    return (
      <div className="bg-muted/50 rounded-lg p-4 border">
        <audio
          ref={audioRef}
          src={previewUrl}
          preload="metadata"
        />
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => isPlaying ? handlePause(e) : handlePlay(e)}
            className="flex-shrink-0"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
          </Button>
          
          <div className="flex-1">
            <div className="bg-muted rounded-full h-2 mb-1">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-100"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="text-xs text-muted-foreground">
              {Math.floor(currentTime)}s / {Math.min(Math.floor(duration), 30)}s preview
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-center items-center text-white p-3">
      <audio
        ref={audioRef}
        src={previewUrl}
        preload="metadata"
      />
      
      <Button
        variant="ghost"
        size="icon"
        onClick={(e) => isPlaying ? handlePause(e) : handlePlay(e)}
        className="mb-2 hover:bg-white/20 bg-white/10"
      >
        {isPlaying ? (
          <Pause className="w-6 h-6" />
        ) : (
          <Play className="w-6 h-6" />
        )}
      </Button>
      
      <div className="w-full">
        <div className="bg-white/20 rounded-full h-1 mb-1">
          <div 
            className="bg-gold h-1 rounded-full transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="text-xs text-center opacity-75">
          {Math.floor(currentTime)}s / {Math.min(Math.floor(duration), 30)}s
        </div>
      </div>
    </div>
  );
};