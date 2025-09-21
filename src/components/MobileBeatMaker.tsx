import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Play, 
  Pause, 
  Square, 
  SkipBack, 
  SkipForward,
  Volume2,
  Settings,
  Download,
  Share2,
  Mic
} from 'lucide-react';

interface Pattern {
  id: string;
  name: string;
  steps: boolean[];
  volume: number;
  sample: string;
  color: string;
}

export const MobileBeatMaker = () => {
  const { toast } = useToast();
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [currentStep, setCurrentStep] = useState(0);
  const [volume, setVolume] = useState(75);
  const [patterns, setPatterns] = useState<Pattern[]>([
    { id: '1', name: 'Kick', steps: new Array(16).fill(false), volume: 80, sample: '/samples/kick.wav', color: 'bg-red-500' },
    { id: '2', name: 'Snare', steps: new Array(16).fill(false), volume: 70, sample: '/samples/snare.wav', color: 'bg-blue-500' },
    { id: '3', name: 'Hi-Hat', steps: new Array(16).fill(false), volume: 60, sample: '/samples/hihat.wav', color: 'bg-yellow-500' },
  ]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const samplesRef = useRef<Map<string, AudioBuffer>>(new Map());

  useEffect(() => {
    // Initialize audio context
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    // Load samples
    loadSamples();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const loadSamples = async () => {
    const context = audioContextRef.current;
    if (!context) return;

    for (const pattern of patterns) {
      try {
        const response = await fetch(pattern.sample);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await context.decodeAudioData(arrayBuffer);
        samplesRef.current.set(pattern.sample, audioBuffer);
      } catch (error) {
        console.error(`Failed to load sample: ${pattern.sample}`, error);
      }
    }
  };

  const playStep = (step: number) => {
    patterns.forEach(pattern => {
      if (pattern.steps[step]) {
        playSample(pattern.sample, pattern.volume / 100);
      }
    });
  };

  const playSample = (samplePath: string, volume: number) => {
    const context = audioContextRef.current;
    const buffer = samplesRef.current.get(samplePath);
    
    if (!context || !buffer) return;

    const source = context.createBufferSource();
    const gainNode = context.createGain();
    
    source.buffer = buffer;
    gainNode.gain.value = volume * (volume / 100);
    
    source.connect(gainNode);
    gainNode.connect(context.destination);
    
    source.start();
  };

  const togglePlay = () => {
    if (isPlaying) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setIsPlaying(false);
    } else {
      const stepDuration = (60 / bpm / 4) * 1000; // 16th notes
      
      intervalRef.current = setInterval(() => {
        setCurrentStep(prev => {
          const nextStep = (prev + 1) % 16;
          playStep(nextStep);
          return nextStep;
        });
      }, stepDuration);
      
      setIsPlaying(true);
    }
  };

  const toggleStep = (patternId: string, stepIndex: number) => {
    setPatterns(prev => prev.map(pattern => 
      pattern.id === patternId 
        ? { 
            ...pattern, 
            steps: pattern.steps.map((step, index) => 
              index === stepIndex ? !step : step
            ) 
          }
        : pattern
    ));

    // Haptic feedback on mobile
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  };

  const updatePatternVolume = (patternId: string, newVolume: number) => {
    setPatterns(prev => prev.map(pattern => 
      pattern.id === patternId ? { ...pattern, volume: newVolume } : pattern
    ));
  };

  const clearPattern = (patternId: string) => {
    setPatterns(prev => prev.map(pattern => 
      pattern.id === patternId 
        ? { ...pattern, steps: new Array(16).fill(false) }
        : pattern
    ));
  };

  const exportBeat = () => {
    toast({ title: 'Export feature', description: 'Beat export coming soon!' });
  };

  const shareBeat = () => {
    toast({ title: 'Share feature', description: 'Share beat coming soon!' });
  };

  return (
    <div className="w-full max-w-md mx-auto bg-background">
      {/* Header */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-center">Mobile Beat Maker</CardTitle>
          <div className="flex justify-center gap-2">
            <Badge variant="outline">{bpm} BPM</Badge>
            <Badge variant="outline">16 Steps</Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Transport Controls */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex justify-center gap-3 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentStep(0)}
            >
              <SkipBack className="w-4 h-4" />
            </Button>
            
            <Button
              onClick={togglePlay}
              className={`px-6 ${isPlaying ? 'bg-red-500 hover:bg-red-600' : 'bg-primary hover:bg-primary/90'}`}
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsPlaying(false);
                if (intervalRef.current) clearInterval(intervalRef.current);
                setCurrentStep(0);
              }}
            >
              <Square className="w-4 h-4" />
            </Button>
          </div>
          
          {/* BPM Control */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">BPM</span>
              <span className="text-sm">{bpm}</span>
            </div>
            <Slider
              value={[bpm]}
              onValueChange={(value) => setBpm(value[0])}
              min={60}
              max={200}
              step={1}
              className="w-full"
            />
          </div>
        </CardContent>
      </Card>

      {/* Step Sequencer */}
      <div className="space-y-3">
        {patterns.map(pattern => (
          <Card key={pattern.id}>
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${pattern.color}`}></div>
                  <span className="font-medium text-sm">{pattern.name}</span>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => playSample(pattern.sample, pattern.volume / 100)}
                    className="p-1"
                  >
                    <Play className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => clearPattern(pattern.id)}
                    className="p-1"
                  >
                    <Square className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              
              {/* Step Grid */}
              <div className="grid grid-cols-4 gap-1 mb-3">
                {pattern.steps.map((active, index) => (
                  <Button
                    key={index}
                    onClick={() => toggleStep(pattern.id, index)}
                    className={`
                      aspect-square p-0 text-xs relative transition-all
                      ${active 
                        ? `${pattern.color} text-white shadow-lg` 
                        : 'bg-muted hover:bg-muted/80'
                      }
                      ${currentStep === index ? 'ring-2 ring-primary' : ''}
                    `}
                    style={{ 
                      transform: currentStep === index ? 'scale(1.1)' : 'scale(1)',
                      boxShadow: active && currentStep === index ? '0 0 20px rgba(255, 165, 0, 0.5)' : ''
                    }}
                  >
                    {index + 1}
                    {active && (
                      <div className="absolute inset-0 bg-white/20 rounded"></div>
                    )}
                  </Button>
                ))}
              </div>
              
              {/* Volume Control */}
              <div className="flex items-center gap-2">
                <Volume2 className="w-3 h-3" />
                <Slider
                  value={[pattern.volume]}
                  onValueChange={(value) => updatePatternVolume(pattern.id, value[0])}
                  min={0}
                  max={100}
                  step={1}
                  className="flex-1 h-1"
                />
                <span className="text-xs w-8">{pattern.volume}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Action Buttons */}
      <Card className="mt-4">
        <CardContent className="p-4">
          <div className="grid grid-cols-3 gap-2">
            <Button variant="outline" size="sm" onClick={exportBeat}>
              <Download className="w-4 h-4 mr-1" />
              Export
            </Button>
            <Button variant="outline" size="sm" onClick={shareBeat}>
              <Share2 className="w-4 h-4 mr-1" />
              Share
            </Button>
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4 mr-1" />
              Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};