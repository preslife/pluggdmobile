import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Pause, Volume2, Clock } from "lucide-react";

interface MetronomeProps {
  onBpmChange?: (bpm: number) => void;
}

const Metronome = ({ onBpmChange }: MetronomeProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState([120]);
  const [timeSignature, setTimeSignature] = useState("4/4");
  const [volume, setVolume] = useState([70]);
  const [currentBeat, setCurrentBeat] = useState(1);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const timeSignatures = {
    "4/4": 4,
    "3/4": 3,
    "2/4": 2,
    "6/8": 6,
    "5/4": 5
  };

  const playClick = (isAccent = false) => {
    if (!audioContextRef.current) return;
    
    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.frequency.value = isAccent ? 800 : 600;
    oscillator.type = 'square';
    
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume[0] / 500, ctx.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.1);
  };

  const startMetronome = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    
    const interval = (60 / bpm[0]) * 1000;
    const beatsPerMeasure = timeSignatures[timeSignature as keyof typeof timeSignatures];
    
    intervalRef.current = setInterval(() => {
      const isAccent = currentBeat === 1;
      playClick(isAccent);
      setCurrentBeat(prev => (prev % beatsPerMeasure) + 1);
    }, interval);
    
    setIsPlaying(true);
  };

  const stopMetronome = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPlaying(false);
    setCurrentBeat(1);
  };

  const handleBpmChange = (value: number[]) => {
    setBpm(value);
    onBpmChange?.(value[0]);
    
    if (isPlaying) {
      stopMetronome();
      setTimeout(startMetronome, 100);
    }
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Metronome
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-center gap-4">
          <Button
            onClick={isPlaying ? stopMetronome : startMetronome}
            size="lg"
            variant={isPlaying ? "destructive" : "default"}
          >
            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
          </Button>
          <div className="text-center">
            <div className="text-2xl font-bold">{bpm[0]} BPM</div>
            <div className="text-sm text-muted-foreground">{timeSignature}</div>
          </div>
        </div>

        {isPlaying && (
          <div className="flex justify-center gap-2">
            {Array.from({ length: timeSignatures[timeSignature as keyof typeof timeSignatures] }).map((_, index) => (
              <div
                key={index}
                className={`w-4 h-4 rounded-full border-2 transition-colors ${
                  currentBeat === index + 1 
                    ? 'bg-primary border-primary' 
                    : 'border-muted-foreground'
                }`}
              />
            ))}
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Tempo (BPM)</Label>
            <Slider
              value={bpm}
              onValueChange={handleBpmChange}
              min={60}
              max={200}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>60</span>
              <span>200</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Time Signature</Label>
            <Select value={timeSignature} onValueChange={setTimeSignature}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(timeSignatures).map((sig) => (
                  <SelectItem key={sig} value={sig}>
                    {sig}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4" />
              <Label>Volume</Label>
            </div>
            <Slider
              value={volume}
              onValueChange={setVolume}
              max={100}
              step={1}
              className="w-full"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default Metronome;