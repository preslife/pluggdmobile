import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Play, Pause, Download, Music, Volume2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SampleFile {
  filename: string;
  url: string;
  bpm?: number;
  key?: string;
}

interface SamplePackPreviewProps {
  title: string;
  description: string;
  price: number;
  samples: SampleFile[];
  coverUrl?: string;
  genre?: string;
  bpm?: string;
  onPurchase: () => void;
}

export const SamplePackPreview = ({
  title,
  description,
  price,
  samples,
  coverUrl,
  genre,
  bpm,
  onPurchase
}: SamplePackPreviewProps) => {
  const { toast } = useToast();
  const [currentSample, setCurrentSample] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const playSample = (url: string) => {
    const audio = audioRef.current;
    if (!audio) return;

    if (currentSample === url && isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      if (currentSample !== url) {
        audio.src = url;
        setCurrentSample(url);
      }
      audio.play();
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (audio) {
      setCurrentTime(audio.currentTime);
      setDuration(audio.duration || 0);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-start gap-4">
          {coverUrl && (
            <img
              src={coverUrl}
              alt={title}
              className="w-24 h-24 rounded-lg object-cover"
            />
          )}
          <div className="flex-1">
            <CardTitle className="text-xl">{title}</CardTitle>
            <p className="text-muted-foreground mt-1">{description}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              {genre && <Badge variant="outline">{genre}</Badge>}
              {bpm && <Badge variant="outline">{bpm} BPM</Badge>}
              <Badge variant="outline">{samples.length} samples</Badge>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">${price}</div>
            <Button onClick={onPurchase} className="mt-2">
              <Download className="w-4 h-4 mr-2" />
              Purchase
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div>
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Music className="w-4 h-4" />
            Sample Preview
          </h3>
          
          <div className="space-y-2">
            {samples.map((sample, index) => (
              <div
                key={index}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                  currentSample === sample.url
                    ? 'bg-primary/10 border-primary/30'
                    : 'bg-muted/50 border-border hover:bg-muted'
                }`}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => playSample(sample.url)}
                  className="p-2"
                >
                  {currentSample === sample.url && isPlaying ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </Button>
                
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{sample.filename}</span>
                    <div className="flex gap-2">
                      {sample.bpm && (
                        <Badge variant="outline" className="text-xs">
                          {sample.bpm} BPM
                        </Badge>
                      )}
                      {sample.key && (
                        <Badge variant="outline" className="text-xs">
                          {sample.key}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  {currentSample === sample.url && duration > 0 && (
                    <div className="mt-2 space-y-1">
                      <Progress value={(currentTime / duration) * 100} className="h-1" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                      </div>
                    </div>
                  )}
                </div>
                
                <Volume2 className="w-4 h-4 text-muted-foreground" />
              </div>
            ))}
          </div>
        </div>
        
        <audio
          ref={audioRef}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
          onLoadedMetadata={handleTimeUpdate}
          preload="metadata"
        />
      </CardContent>
    </Card>
  );
};