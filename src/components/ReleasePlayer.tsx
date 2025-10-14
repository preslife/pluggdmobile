import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, SkipBack, SkipForward, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";

interface Track {
  id: string;
  title: string;
  duration: number;
  audio_url: string;
  track_number: number;
}

interface ReleasePlayerProps {
  releaseId: string;
  tracks: Track[];
  hasAccess: boolean;
  onPlayStart?: () => void;
}

export const ReleasePlayer = ({ releaseId, tracks, hasAccess, onPlayStart }: ReleasePlayerProps) => {
  const PLAY_THRESHOLD_SECONDS = 30;
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const playRecordedRef = useRef(false);

  const currentTrackData = tracks[currentTrack];

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => {
      setCurrentTime(audio.currentTime);
      void maybeTrackPlay();
    };
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => {
      void maybeTrackPlay(true);

      if (currentTrack < tracks.length - 1) {
        setCurrentTrack(prev => prev + 1);
      } else {
        setIsPlaying(false);
        setCurrentTime(0);
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
  }, [currentTrack, tracks.length, maybeTrackPlay]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const trackPlay = useCallback(async (trackId: string, playDuration: number) => {
    if (!releaseId) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      await supabase.functions.invoke('track-release-play', {
        body: {
          releaseId,
          trackId,
          playDuration,
          deviceType: 'web'
        },
        headers
      });
    } catch (error) {
      console.error('Error tracking play:', error);
    }
  }, [releaseId]);

  const maybeTrackPlay = useCallback(async (force = false) => {
    if (playRecordedRef.current) return;
    if (!currentTrackData) return;

    const audio = audioRef.current;
    if (!audio) return;

    const currentSeconds = force ? (audio.duration || audio.currentTime || 0) : audio.currentTime;
    const trackDuration = audio.duration || currentTrackData.duration || 0;
    const threshold = trackDuration > 0 ? Math.min(PLAY_THRESHOLD_SECONDS, trackDuration * 0.7) : PLAY_THRESHOLD_SECONDS;

    const qualifies = force || currentSeconds >= threshold || (trackDuration > 0 && currentSeconds >= trackDuration - 2);
    if (!qualifies) return;

    playRecordedRef.current = true;
    try {
      await trackPlay(currentTrackData.id, Math.round(currentSeconds || trackDuration || PLAY_THRESHOLD_SECONDS));
    } catch (error) {
      playRecordedRef.current = false;
      console.error('Failed to record release play:', error);
    }
  }, [currentTrackData, trackPlay]);

  useEffect(() => {
    playRecordedRef.current = false;
    setCurrentTime(0);
    setDuration(0);
  }, [currentTrack]);

  const togglePlay = async () => {
    if (!hasAccess || !currentTrackData?.audio_url) return;

    const audio = audioRef.current;
    if (!audio) return;

    setIsLoading(true);

    try {
      if (isPlaying) {
        audio.pause();
        await maybeTrackPlay();
      } else {
        await audio.play();
        onPlayStart?.();
      }
      setIsPlaying(!isPlaying);
    } catch (error) {
      console.error('Playback error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectTrack = (index: number) => {
    if (!hasAccess) return;

    void maybeTrackPlay();
    
    setCurrentTrack(index);
    setCurrentTime(0);
    playRecordedRef.current = false;
    if (isPlaying) {
      // Audio will auto-play when src changes due to useEffect
      setTimeout(() => {
        audioRef.current?.play();
      }, 100);
    }
  };

  const previousTrack = () => {
    if (currentTrack > 0) {
      selectTrack(currentTrack - 1);
    }
  };

  const nextTrack = () => {
    if (currentTrack < tracks.length - 1) {
      void maybeTrackPlay();
      selectTrack(currentTrack + 1);
    }
  };

  const seek = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!hasAccess) {
    return (
      <div className="bg-card/50 backdrop-blur-sm p-6 rounded-lg border">
        <p className="text-muted-foreground text-center">
          Purchase this release to listen to full tracks
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card/50 backdrop-blur-sm p-6 rounded-lg border space-y-4">
      <audio
        ref={audioRef}
        src={currentTrackData?.audio_url}
        preload="metadata"
      />

      {/* Track List */}
      <div className="space-y-2 max-h-40 overflow-y-auto">
        {tracks.map((track, index) => (
          <div
            key={track.id}
            className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
              index === currentTrack
                ? 'bg-primary/10 text-primary'
                : 'hover:bg-muted/50'
            }`}
            onClick={() => selectTrack(index)}
          >
            <div className="flex items-center space-x-3">
              <span className="text-sm font-medium w-6">{track.track_number}</span>
              <span className="font-medium">{track.title}</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {formatTime(track.duration || 0)}
            </span>
          </div>
        ))}
      </div>

      {/* Current Track Info */}
      <div className="text-center">
        <h3 className="font-semibold">{currentTrackData?.title}</h3>
        <p className="text-sm text-muted-foreground">
          Track {currentTrack + 1} of {tracks.length}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <Slider
          value={[currentTime]}
          max={duration || 100}
          step={1}
          onValueChange={seek}
          className="w-full"
        />
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center space-x-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={previousTrack}
          disabled={currentTrack === 0}
        >
          <SkipBack className="h-4 w-4" />
        </Button>

        <Button
          variant="default"
          size="lg"
          onClick={togglePlay}
          disabled={isLoading || !currentTrackData?.audio_url}
          className="h-12 w-12 rounded-full"
        >
          {isLoading ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : isPlaying ? (
            <Pause className="h-5 w-5" />
          ) : (
            <Play className="h-5 w-5" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={nextTrack}
          disabled={currentTrack === tracks.length - 1}
        >
          <SkipForward className="h-4 w-4" />
        </Button>
      </div>

      {/* Volume Control */}
      <div className="flex items-center space-x-2">
        <Volume2 className="h-4 w-4" />
        <Slider
          value={[volume]}
          max={1}
          step={0.1}
          onValueChange={(value) => setVolume(value[0])}
          className="w-24"
        />
      </div>
    </div>
  );
};
