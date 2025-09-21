import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, Square, Download, RotateCcw, Volume2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BeatMaker = () => {
  const { toast } = useToast();
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState([120]);
  const [selectedKit, setSelectedKit] = useState("trap");
  const [volume, setVolume] = useState([70]);
  const [currentStep, setCurrentStep] = useState(0);
  const [pattern, setPattern] = useState({
    kick: Array(16).fill(false),
    snare: Array(16).fill(false),
    hihat: Array(16).fill(false),
    openhat: Array(16).fill(false),
    crash: Array(16).fill(false),
    ride: Array(16).fill(false)
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const drumKits = {
    trap: {
      name: "Trap Kit",
      sounds: {
        kick: { freq: 60, type: "sine" as OscillatorType },
        snare: { freq: 200, type: "sawtooth" as OscillatorType },
        hihat: { freq: 8000, type: "square" as OscillatorType },
        openhat: { freq: 6000, type: "square" as OscillatorType },
        crash: { freq: 4000, type: "sawtooth" as OscillatorType },
        ride: { freq: 3000, type: "triangle" as OscillatorType }
      }
    },
    house: {
      name: "House Kit",
      sounds: {
        kick: { freq: 80, type: "sine" as OscillatorType },
        snare: { freq: 250, type: "triangle" as OscillatorType },
        hihat: { freq: 10000, type: "square" as OscillatorType },
        openhat: { freq: 8000, type: "square" as OscillatorType },
        crash: { freq: 5000, type: "sawtooth" as OscillatorType },
        ride: { freq: 3500, type: "triangle" as OscillatorType }
      }
    },
    rock: {
      name: "Rock Kit",
      sounds: {
        kick: { freq: 70, type: "sine" as OscillatorType },
        snare: { freq: 220, type: "sawtooth" as OscillatorType },
        hihat: { freq: 9000, type: "square" as OscillatorType },
        openhat: { freq: 7000, type: "square" as OscillatorType },
        crash: { freq: 4500, type: "sawtooth" as OscillatorType },
        ride: { freq: 3200, type: "triangle" as OscillatorType }
      }
    }
  };

  const playSample = (instrument: keyof typeof pattern) => {
    if (!audioContextRef.current) return;

    const ctx = audioContextRef.current;
    const kit = drumKits[selectedKit as keyof typeof drumKits];
    const sound = kit.sounds[instrument];
    
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const filterNode = ctx.createBiquadFilter();
    
    oscillator.connect(filterNode);
    filterNode.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.frequency.value = sound.freq;
    oscillator.type = sound.type;
    
    // Different envelope shapes for different drums
    const duration = getDrumDuration(instrument);
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume[0] / 300, ctx.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    
    // Add filter effects
    if (instrument === 'hihat' || instrument === 'openhat') {
      filterNode.type = 'highpass';
      filterNode.frequency.value = 5000;
    } else if (instrument === 'kick') {
      filterNode.type = 'lowpass';
      filterNode.frequency.value = 200;
    }
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  };

  const getDrumDuration = (instrument: keyof typeof pattern) => {
    switch (instrument) {
      case 'kick': return 0.3;
      case 'snare': return 0.2;
      case 'hihat': return 0.1;
      case 'openhat': return 0.2;
      case 'crash': return 0.8;
      case 'ride': return 0.4;
      default: return 0.2;
    }
  };

  const startSequencer = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }

    const stepDuration = (60 / bpm[0] / 4) * 1000; // 16th notes
    
    intervalRef.current = setInterval(() => {
      Object.entries(pattern).forEach(([instrument, steps]) => {
        if (steps[currentStep]) {
          playSample(instrument as keyof typeof pattern);
        }
      });
      
      setCurrentStep(prev => (prev + 1) % 16);
    }, stepDuration);
    
    setIsPlaying(true);
  };

  const stopSequencer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPlaying(false);
    setCurrentStep(0);
  };

  const toggleStep = (instrument: keyof typeof pattern, step: number) => {
    setPattern(prev => ({
      ...prev,
      [instrument]: prev[instrument].map((active, index) => 
        index === step ? !active : active
      )
    }));
  };

  const clearPattern = () => {
    setPattern({
      kick: Array(16).fill(false),
      snare: Array(16).fill(false),
      hihat: Array(16).fill(false),
      openhat: Array(16).fill(false),
      crash: Array(16).fill(false),
      ride: Array(16).fill(false)
    });
  };

  const loadPreset = (presetName: string) => {
    const presets = {
      basic: {
        kick: [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false],
        snare: [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
        hihat: [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false],
        openhat: Array(16).fill(false),
        crash: [true, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
        ride: Array(16).fill(false)
      },
      trap: {
        kick: [true, false, false, true, false, false, true, false, false, true, false, false, true, false, false, false],
        snare: [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
        hihat: [true, true, false, true, true, true, false, true, true, true, false, true, true, true, false, true],
        openhat: [false, false, false, false, false, false, true, false, false, false, false, false, false, false, true, false],
        crash: Array(16).fill(false),
        ride: Array(16).fill(false)
      }
    };
    
    setPattern(presets[presetName as keyof typeof presets] || presets.basic);
    toast({
      title: "Preset Loaded",
      description: `${presetName} pattern applied`,
    });
  };

  const exportPattern = () => {
    const patternData = {
      pattern,
      bpm: bpm[0],
      kit: selectedKit,
      name: `beat-${Date.now()}`
    };
    
    const element = document.createElement("a");
    const file = new Blob([JSON.stringify(patternData, null, 2)], { type: 'application/json' });
    element.href = URL.createObjectURL(file);
    element.download = `${patternData.name}.json`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    
    toast({
      title: "Pattern Exported",
      description: "Beat pattern saved as JSON",
    });
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

  const instrumentLabels = {
    kick: "Kick",
    snare: "Snare",
    hihat: "Hi-Hat",
    openhat: "Open Hat",
    crash: "Crash",
    ride: "Ride"
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Beat Maker</span>
          <div className="flex gap-2">
            <Badge variant="secondary">{bpm[0]} BPM</Badge>
            <Badge variant="secondary">{drumKits[selectedKit as keyof typeof drumKits].name}</Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>BPM</Label>
            <Slider
              value={bpm}
              onValueChange={setBpm}
              min={80}
              max={180}
              step={1}
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <Label>Drum Kit</Label>
            <Select value={selectedKit} onValueChange={setSelectedKit}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(drumKits).map(([key, kit]) => (
                  <SelectItem key={key} value={key}>
                    {kit.name}
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

        {/* Transport Controls */}
        <div className="flex items-center justify-center gap-4">
          <Button
            onClick={isPlaying ? stopSequencer : startSequencer}
            size="lg"
            variant={isPlaying ? "destructive" : "default"}
          >
            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
          </Button>
          <Button onClick={stopSequencer} variant="outline" size="lg">
            <Square className="w-6 h-6" />
          </Button>
          <Button onClick={clearPattern} variant="outline">
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>

        {/* Step Sequencer */}
        <div className="space-y-3">
          <div className="grid grid-cols-17 gap-1 text-xs">
            <div></div>
            {Array.from({ length: 16 }, (_, i) => (
              <div key={i} className="text-center font-mono">
                {i + 1}
              </div>
            ))}
          </div>
          
          {Object.entries(pattern).map(([instrument, steps]) => (
            <div key={instrument} className="grid grid-cols-17 gap-1">
              <div className="flex items-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => playSample(instrument as keyof typeof pattern)}
                  className="text-xs h-8 w-full"
                >
                  {instrumentLabels[instrument as keyof typeof instrumentLabels]}
                </Button>
              </div>
              {steps.map((active, stepIndex) => (
                <Button
                  key={stepIndex}
                  variant={active ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleStep(instrument as keyof typeof pattern, stepIndex)}
                  className={`h-8 w-8 p-0 ${
                    isPlaying && currentStep === stepIndex ? 'ring-2 ring-primary' : ''
                  } ${stepIndex % 4 === 0 ? 'border-l-2 border-primary/50' : ''}`}
                >
                  {active && <div className="w-2 h-2 bg-current rounded-full" />}
                </Button>
              ))}
            </div>
          ))}
        </div>

        {/* Presets and Export */}
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => loadPreset("basic")} variant="outline" size="sm">
            Basic
          </Button>
          <Button onClick={() => loadPreset("trap")} variant="outline" size="sm">
            Trap
          </Button>
          <Button onClick={exportPattern} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default BeatMaker;