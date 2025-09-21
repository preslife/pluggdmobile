import { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, SkipBack, SkipForward, Volume2, Download, Heart, Share, MoreVertical } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type Release = {
  id: string;
  title: string;
  artist: string;
  cover_art_url?: string;
  preview_url?: string;
  genre: string;
  duration?: number;
  price?: number;
};

type MobileReleasePlayerProps = {
  release: Release;
  playlist?: Release[];
  isOfflineAvailable?: boolean;
  onNext?: () => void;
  onPrevious?: () => void;
  onDownload?: () => void;
  onFavorite?: () => void;
  onShare?: () => void;
};

const MobileReleasePlayer = ({ 
  release, 
  playlist = [], 
  isOfflineAvailable = false,
  onNext,
  onPrevious,
  onDownload,
  onFavorite,
  onShare
}: MobileReleasePlayerProps) => {
  const { toast } = useToast();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleDurationChange = () => setDuration(audio.duration);
    const handleEnded = () => {
      setIsPlaying(false);
      if (onNext) onNext();
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [onNext]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    setIsLoading(true);
    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        await audio.play();
        setIsPlaying(true);
      }
    } catch (error) {
      toast({
        title: "Playback Error",
        description: "Unable to play this track",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
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
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleFavorite = () => {
    setIsFavorited(!isFavorited);
    if (onFavorite) onFavorite();
    toast({
      title: isFavorited ? "Removed from favorites" : "Added to favorites",
      description: `${release.title} by ${release.artist}`
    });
  };

  const handleDownload = () => {
    if (onDownload) onDownload();
    toast({
      title: "Download Started",
      description: "Your track is being prepared for download"
    });
  };

  const handleShare = () => {
    if (onShare) onShare();
    if (navigator.share) {
      navigator.share({
        title: `${release.title} by ${release.artist}`,
        text: `Check out this track: ${release.title}`,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link Copied",
        description: "Share link copied to clipboard"
      });
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t border-border z-50">
      {/* Audio Element */}
      <audio ref={audioRef} src={release.preview_url} preload="metadata" />
      
      {/* Main Player */}
      <div className="p-4 space-y-4">
        {/* Track Info & Cover */}
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-lg overflow-hidden bg-muted flex-shrink-0">
            {release.cover_art_url ? (
              <img 
                src={release.cover_art_url} 
                alt={release.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Play className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-medium truncate">{release.title}</h3>
            <p className="text-sm text-muted-foreground truncate">{release.artist}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs">{release.genre}</Badge>
              {isOfflineAvailable && (
                <Badge variant="secondary" className="text-xs">Offline</Badge>
              )}
            </div>
          </div>

          <Button variant="ghost" size="sm" onClick={handleShare}>
            <MoreVertical className="w-4 h-4" />
          </Button>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <Slider
            value={[duration ? (currentTime / duration) * 100 : 0]}
            onValueChange={handleSeek}
            max={100}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          {/* Left Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleFavorite}
              className={isFavorited ? 'text-red-500' : ''}
            >
              <Heart className={`w-4 h-4 ${isFavorited ? 'fill-current' : ''}`} />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDownload}>
              <Download className="w-4 h-4" />
            </Button>
          </div>

          {/* Center Controls */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onPrevious}
              disabled={!onPrevious}
            >
              <SkipBack className="w-5 h-5" />
            </Button>
            
            <Button
              variant="default"
              size="lg"
              onClick={togglePlay}
              disabled={isLoading}
              className="w-12 h-12 rounded-full"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5 ml-0.5" />
              )}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onNext}
              disabled={!onNext}
            >
              <SkipForward className="w-5 h-5" />
            </Button>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 w-20">
              <Volume2 className="w-4 h-4 text-muted-foreground" />
              <Slider
                value={[volume * 100]}
                onValueChange={handleVolumeChange}
                max={100}
                step={1}
                className="flex-1"
              />
            </div>
          </div>
        </div>

        {/* Purchase Info */}
        {release.price && release.price > 0 && (
          <div className="flex items-center justify-between p-2 bg-muted rounded-lg">
            <span className="text-sm">Full track available for £{(release.price / 100).toFixed(2)}</span>
            <Button size="sm" variant="secondary">
              Purchase
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileReleasePlayer;