import { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, Volume2, Download, SkipBack, SkipForward, Music } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface StreamingAudioPlayerProps {
  audioFileId?: string;
  streamUrl?: string;
  title?: string;
  artist?: string;
  coverArt?: string;
  duration?: number;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  allowDownload?: boolean;
  showWaveform?: boolean;
  className?: string;
}

export const StreamingAudioPlayer = ({
  audioFileId,
  streamUrl,
  title = 'Untitled',
  artist = 'Unknown Artist',
  coverArt,
  duration,
  onPlay,
  onPause,
  onEnded,
  allowDownload = false,
  showWaveform = false,
  className = ''
}: StreamingAudioPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration || 0);
  const [volume, setVolume] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [buffered, setBuffered] = useState(0);
  const [hasPlayed, setHasPlayed] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleDurationChange = () => {
      setTotalDuration(audio.duration);
    };

    const handleProgress = () => {
      if (audio.buffered.length > 0) {
        const bufferedEnd = audio.buffered.end(audio.buffered.length - 1);
        const duration = audio.duration;
        if (duration > 0) {
          setBuffered((bufferedEnd / duration) * 100);
        }
      }
    };

    const handleLoadStart = () => setIsLoading(true);
    const handleCanPlay = () => setIsLoading(false);
    const handleWaiting = () => setIsLoading(true);
    const handlePlaying = () => setIsLoading(false);

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      onEnded?.();
    };

    const handleError = (e: Event) => {
      console.error('Audio playback error:', e);
      setIsLoading(false);
      toast({
        title: "Playback Error",
        description: "Failed to load audio file",
        variant: "destructive",
      });
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('progress', handleProgress);
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('progress', handleProgress);
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('playing', handlePlaying);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [onEnded, toast]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const togglePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
        onPause?.();
      } else {
        // Track play if this is the first play
        if (!hasPlayed && audioFileId && user) {
          await trackPlay();
          setHasPlayed(true);
        }
        
        await audio.play();
        setIsPlaying(true);
        onPlay?.();
      }
    } catch (error) {
      console.error('Playback error:', error);
      toast({
        title: "Playback Error",
        description: "Failed to play audio",
        variant: "destructive",
      });
    }
  };

  const trackPlay = async () => {
    if (!audioFileId || !user) return;

    try {
      await supabase.functions.invoke('track-release-play', {
        body: {
          audioFileId,
          userId: user.id,
          playDuration: Math.floor(currentTime),
          deviceType: 'web'
        }
      });
    } catch (error) {
      console.error('Error tracking play:', error);
    }
  };

  const handleSeek = (value: number[]) => {
    const audio = audioRef.current;
    if (audio && totalDuration > 0) {
      const newTime = (value[0] / 100) * totalDuration;
      audio.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0] / 100);
  };

  const skipBackward = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = Math.max(0, audio.currentTime - 10);
    }
  };

  const skipForward = () => {
    const audio = audioRef.current;
    if (audio && totalDuration > 0) {
      audio.currentTime = Math.min(totalDuration, audio.currentTime + 10);
    }
  };

  const handleDownload = async () => {
    if (!streamUrl) return;

    try {
      const response = await fetch(streamUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${title} - ${artist}.mp3`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Download Started",
        description: "Your audio file is being downloaded",
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download audio file",
        variant: "destructive",
      });
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progressPercentage = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  return (
    <Card className={`bg-gradient-card border-border ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Cover Art */}
          <div className="relative">
            <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
              {coverArt ? (
                <img 
                  src={coverArt} 
                  alt={`${title} cover`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Music className="w-8 h-8 text-muted-foreground" />
              )}
            </div>
            {isLoading && (
              <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
              </div>
            )}
          </div>

          {/* Player Content */}
          <div className="flex-1 min-w-0">
            {/* Track Info */}
            <div className="mb-2">
              <h4 className="font-semibold text-sm truncate">{title}</h4>
              <p className="text-xs text-muted-foreground truncate">{artist}</p>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="relative">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  {/* Buffer indicator */}
                  <div 
                    className="h-full bg-muted-foreground/30 transition-all duration-300"
                    style={{ width: `${buffered}%` }}
                  />
                  {/* Progress indicator */}
                  <div 
                    className="h-full bg-primary transition-all duration-100 absolute top-0"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
                <Slider
                  value={[progressPercentage]}
                  onValueChange={handleSeek}
                  max={100}
                  step={0.1}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
              
              {/* Time display */}
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(totalDuration)}</span>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={skipBackward}
              className="h-8 w-8 p-0"
            >
              <SkipBack className="h-4 w-4" />
            </Button>
            
            <Button
              size="sm"
              onClick={togglePlayPause}
              disabled={isLoading}
              className="h-10 w-10 rounded-full"
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4 ml-0.5" />
              )}
            </Button>
            
            <Button
              size="sm"
              variant="ghost"
              onClick={skipForward}
              className="h-8 w-8 p-0"
            >
              <SkipForward className="h-4 w-4" />
            </Button>

            {/* Volume Control */}
            <div className="flex items-center gap-2 min-w-0">
              <Volume2 className="h-4 w-4 text-muted-foreground" />
              <Slider
                value={[volume * 100]}
                onValueChange={handleVolumeChange}
                max={100}
                step={1}
                className="w-16"
              />
            </div>

            {/* Download Button */}
            {allowDownload && streamUrl && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDownload}
                className="h-8 w-8 p-0"
              >
                <Download className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Hidden Audio Element */}
        <audio
          ref={audioRef}
          src={streamUrl}
          preload="metadata"
          className="hidden"
        />
      </CardContent>
    </Card>
  );
};