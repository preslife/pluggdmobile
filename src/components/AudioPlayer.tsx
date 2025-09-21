import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  SkipBack, 
  SkipForward,
  Mic,
  Square
} from "lucide-react";

interface AudioPlayerProps {
  src?: string;
  title?: string;
  artist?: string; // For backward compatibility
  artwork?: string; // For backward compatibility  
  className?: string; // For backward compatibility
  onTextToSpeech?: (text: string) => void;
  textToSpeechText?: string;
  showTextToSpeech?: boolean;
}

export function AudioPlayer({ 
  src, 
  title, 
  onTextToSpeech, 
  textToSpeechText,
  showTextToSpeech = false 
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnd = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnd);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnd);
    };
  }, [src]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (value: number[]) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newTime = (value[0] / 100) * duration;
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (value: number[]) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newVolume = value[0] / 100;
    audio.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isMuted) {
      audio.volume = volume;
      setIsMuted(false);
    } else {
      audio.volume = 0;
      setIsMuted(true);
    }
  };

  const skip = (seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = Math.max(0, Math.min(duration, audio.currentTime + seconds));
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleTextToSpeech = async () => {
    if (!onTextToSpeech || !textToSpeechText) return;
    
    setIsLoading(true);
    try {
      await onTextToSpeech(textToSpeechText);
    } catch (error) {
      console.error('Text-to-speech error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-card/80 to-muted/30 backdrop-blur-sm border border-border/50 rounded-xl p-6 shadow-lg">
      {src && <audio ref={audioRef} src={src} preload="metadata" />}
      
      {/* Title */}
      {title && (
        <div className="mb-4">
          <h3 className="font-semibold text-lg bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {title}
          </h3>
        </div>
      )}

      {/* Progress Bar */}
      {src && duration > 0 && (
        <div className="mb-4">
          <Slider
            value={[duration > 0 ? (currentTime / duration) * 100 : 0]}
            onValueChange={handleSeek}
            max={100}
            step={0.1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {src && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => skip(-10)}
                disabled={!duration}
              >
                <SkipBack className="w-4 h-4" />
              </Button>

              <Button
                onClick={togglePlay}
                disabled={!src || !duration}
                className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4 ml-0.5" />
                )}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => skip(10)}
                disabled={!duration}
              >
                <SkipForward className="w-4 h-4" />
              </Button>
            </>
          )}

          {showTextToSpeech && textToSpeechText && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleTextToSpeech}
              disabled={isLoading}
              className="ml-2"
            >
              {isLoading ? (
                <Square className="w-4 h-4 animate-pulse" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
              {isLoading ? 'Generating...' : 'Listen'}
            </Button>
          )}
        </div>

        {/* Volume Control */}
        {src && (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleMute}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </Button>
            <Slider
              value={[isMuted ? 0 : volume * 100]}
              onValueChange={handleVolumeChange}
              max={100}
              step={1}
              className="w-20"
            />
          </div>
        )}
      </div>

      {/* Status Badges */}
      <div className="flex items-center gap-2 mt-3">
        {src && (
          <Badge variant="secondary">
            Audio Content
          </Badge>
        )}
        {showTextToSpeech && (
          <Badge variant="outline" className="border-primary/30 text-primary">
            Text-to-Speech Available
          </Badge>
        )}
      </div>
    </div>
  );
}