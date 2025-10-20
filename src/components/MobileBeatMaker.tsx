import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
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
  const [isExporting, setIsExporting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  useEffect(() => {
    // Initialize audio context
    if (!audioContextRef.current && typeof window !== 'undefined') {
      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioContextRef.current = new AudioContextClass();
      }
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

  const encodeWav = (channels: Float32Array[], sampleRate: number) => {
    const numChannels = channels.length;
    const numFrames = channels[0]?.length ?? 0;
    const buffer = new ArrayBuffer(44 + numFrames * numChannels * 2);
    const view = new DataView(buffer);

    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + numFrames * numChannels * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * 2, true);
    view.setUint16(32, numChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, numFrames * numChannels * 2, true);

    let offset = 44;
    for (let i = 0; i < numFrames; i++) {
      for (let channel = 0; channel < numChannels; channel++) {
        const sample = channels[channel][i] ?? 0;
        const s = Math.max(-1, Math.min(1, sample));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
        offset += 2;
      }
    }

    return buffer;
  };

  const generateBeatBlob = () => {
    const steps = 16;
    const sampleRate = 44100;
    const stepDurationSeconds = 60 / bpm / 4;
    const totalDurationSeconds = steps * stepDurationSeconds;
    const totalSamples = Math.ceil(totalDurationSeconds * sampleRate);

    const channels = [new Float32Array(totalSamples), new Float32Array(totalSamples)];

    patterns.forEach((pattern, patternIndex) => {
      const frequency = 180 + patternIndex * 90;
      const amplitude = pattern.volume / 100;
      pattern.steps.forEach((active, stepIndex) => {
        if (!active) return;
        const startSample = Math.floor(stepIndex * stepDurationSeconds * sampleRate);
        const samplesPerStep = Math.floor(stepDurationSeconds * sampleRate);
        for (let i = 0; i < samplesPerStep; i++) {
          const globalIndex = startSample + i;
          if (globalIndex >= totalSamples) break;
          const env = Math.exp(-3 * (i / samplesPerStep));
          const value = Math.sin((2 * Math.PI * frequency * (i / sampleRate))) * amplitude * env;
          channels[0][globalIndex] += value;
          channels[1][globalIndex] += value;
        }
      });
    });

    const wavBuffer = encodeWav(channels, sampleRate);
    return new Blob([wavBuffer], { type: 'audio/wav' });
  };

  const uploadBeatBlob = async (blob: Blob, prefix: string) => {
    const uniqueId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
    const filePath = `${prefix}/${uniqueId}.wav`;

    const { error: uploadError } = await supabase.storage
      .from('beat-exports')
      .upload(filePath, blob, { contentType: 'audio/wav' });

    if (uploadError) {
      throw uploadError;
    }

    const { data: publicData } = supabase.storage
      .from('beat-exports')
      .getPublicUrl(filePath);

    return {
      filePath,
      publicUrl: publicData?.publicUrl ?? '',
    };
  };

  const exportBeat = async () => {
    if (isExporting || isSharing) return;
    setIsExporting(true);
    const exportToast = toast({
      title: 'Exporting beat...',
      description: 'Rendering audio and uploading to Supabase storage.',
    });

    try {
      const blob = generateBeatBlob();
      const { publicUrl } = await uploadBeatBlob(blob, 'exports');

      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = 'mobile-beat.wav';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);

      exportToast.update({
        id: exportToast.id,
        title: 'Beat exported',
        description: publicUrl
          ? 'Your beat is ready. A download has started and a public link is available.'
          : 'Your beat is ready and downloading.',
      });
    } catch (error: any) {
      console.error('Failed to export beat', error);
      exportToast.update({
        id: exportToast.id,
        title: 'Export failed',
        description: error?.message ?? 'There was an issue exporting your beat.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const shareBeat = async () => {
    if (isSharing || isExporting) return;
    setIsSharing(true);
    const shareToast = toast({
      title: 'Preparing share link...',
      description: 'Rendering audio and creating a public link.',
    });

    try {
      const blob = generateBeatBlob();
      const { publicUrl } = await uploadBeatBlob(blob, 'shares');

      if (!publicUrl) {
        throw new Error('Unable to generate a public share link.');
      }

      if (navigator.share) {
        await navigator.share({
          title: 'Check out my beat',
          text: 'I just created this beat on PLUGGd.',
          url: publicUrl,
        });
        shareToast.update({
          id: shareToast.id,
          title: 'Beat shared',
          description: 'Your beat was shared using your device share menu.',
        });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(publicUrl);
        shareToast.update({
          id: shareToast.id,
          title: 'Link copied',
          description: 'Share link copied to clipboard. Send it to your collaborators!',
        });
      } else {
        shareToast.update({
          id: shareToast.id,
          title: 'Share link ready',
          description: publicUrl,
        });
      }
    } catch (error: any) {
      console.error('Failed to share beat', error);
      shareToast.update({
        id: shareToast.id,
        title: 'Share failed',
        description: error?.message ?? 'Unable to share your beat right now.',
        variant: 'destructive',
      });
    } finally {
      setIsSharing(false);
    }
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
            <Button
              variant="outline"
              size="sm"
              onClick={exportBeat}
              disabled={isExporting || isSharing}
            >
              <Download className="w-4 h-4 mr-1" />
              {isExporting ? 'Exporting...' : 'Export'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={shareBeat}
              disabled={isExporting || isSharing}
            >
              <Share2 className="w-4 h-4 mr-1" />
              {isSharing ? 'Sharing...' : 'Share'}
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