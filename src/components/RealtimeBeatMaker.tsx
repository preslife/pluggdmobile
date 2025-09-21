import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { 
  Users, 
  Play, 
  Pause, 
  Square, 
  Volume2, 
  Save, 
  Share2,
  Circle,
  Mic,
  MessageCircle,
  Send,
  Upload,
  Plus,
  Trash2,
  Download,
  Music
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

// Audio context and buffer storage
let audioContext: AudioContext | null = null;
const audioBuffers = new Map<string, AudioBuffer>();

interface CollaborativeUser {
  user_id: string;
  username: string;
  avatar_url?: string;
  cursor_position?: number;
  is_recording?: boolean;
  last_seen: string;
}

interface BeatPattern {
  id: string;
  track: string;
  steps: boolean[];
  user_id: string;
  timestamp: number;
}

interface ChatMessage {
  id: string;
  user_id: string;
  username: string;
  message: string;
  timestamp: number;
}

interface Track {
  id: string;
  name: string;
  label: string;
  color: string;
  volume: number;
  muted: boolean;
  solo: boolean;
  audioBuffer?: AudioBuffer;
  audioUrl?: string;
  pattern: boolean[];
}

// Initialize audio context
const initAudioContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
};

// Load audio file and convert to buffer
const loadAudioFile = async (file: File): Promise<AudioBuffer> => {
  const arrayBuffer = await file.arrayBuffer();
  const context = initAudioContext();
  return await context.decodeAudioData(arrayBuffer);
};

// Create synthetic drum sounds instead of loading files
const createSyntheticDrumSounds = () => {
  const context = initAudioContext();
  
  // Create kick drum sound
  const createKick = () => {
    const sampleRate = context.sampleRate;
    const length = sampleRate * 0.2; // 200ms
    const buffer = context.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const decay = Math.exp(-t * 10);
      const freq = 60 * Math.exp(-t * 30);
      data[i] = Math.sin(2 * Math.PI * freq * t) * decay * 0.5;
    }
    return buffer;
  };
  
  // Create snare drum sound
  const createSnare = () => {
    const sampleRate = context.sampleRate;
    const length = sampleRate * 0.15; // 150ms
    const buffer = context.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const decay = Math.exp(-t * 15);
      const noise = (Math.random() * 2 - 1) * 0.3;
      const tone = Math.sin(2 * Math.PI * 200 * t) * 0.7;
      data[i] = (noise + tone) * decay * 0.4;
    }
    return buffer;
  };
  
  // Create hi-hat sound
  const createHiHat = () => {
    const sampleRate = context.sampleRate;
    const length = sampleRate * 0.1; // 100ms
    const buffer = context.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const decay = Math.exp(-t * 20);
      const noise = (Math.random() * 2 - 1);
      data[i] = noise * decay * 0.2;
    }
    return buffer;
  };
  
  // Create open hi-hat sound
  const createOpenHat = () => {
    const sampleRate = context.sampleRate;
    const length = sampleRate * 0.3; // 300ms
    const buffer = context.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const decay = Math.exp(-t * 8);
      const noise = (Math.random() * 2 - 1);
      data[i] = noise * decay * 0.25;
    }
    return buffer;
  };
  
  audioBuffers.set('kick', createKick());
  audioBuffers.set('snare', createSnare());
  audioBuffers.set('hihat', createHiHat());
  audioBuffers.set('openhat', createOpenHat());
};

// Debounce map to prevent double-triggering
const lastPlayTime = new Map<string, number>();

// Play audio buffer with debouncing
const playSound = (buffer: AudioBuffer, volume: number = 1, context?: AudioContext, trackName?: string) => {
  if (!buffer || !context) return;
  
  // Debounce to prevent double-triggering within 50ms
  const now = Date.now();
  const lastTime = lastPlayTime.get(trackName || 'default') || 0;
  if (now - lastTime < 50) return;
  lastPlayTime.set(trackName || 'default', now);
  
  try {
    const source = context.createBufferSource();
    const gainNode = context.createGain();
    
    source.buffer = buffer;
    gainNode.gain.value = Math.max(0, Math.min(1, volume));
    
    source.connect(gainNode);
    gainNode.connect(context.destination);
    
    source.start();
    
    // Clean up after playback
    source.onended = () => {
      source.disconnect();
      gainNode.disconnect();
    };
  } catch (error) {
    console.warn('Error playing sound:', error);
  }
};

export const RealtimeBeatMaker = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [roomId] = useState(() => `beat-room-${Date.now()}`);
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [currentStep, setCurrentStep] = useState(0);
  const [masterVolume, setMasterVolume] = useState([80]);
  const [connectedUsers, setConnectedUsers] = useState<CollaborativeUser[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [tracks, setTracks] = useState<Track[]>([
    {
      id: 'kick',
      name: 'kick',
      label: 'Kick',
      color: 'bg-red-500',
      volume: 80,
      muted: false,
      solo: false,
      pattern: new Array(16).fill(false)
    },
    {
      id: 'snare',
      name: 'snare',
      label: 'Snare',
      color: 'bg-blue-500',
      volume: 80,
      muted: false,
      solo: false,
      pattern: new Array(16).fill(false)
    },
    {
      id: 'hihat',
      name: 'hihat',
      label: 'Hi-Hat',
      color: 'bg-yellow-500',
      volume: 70,
      muted: false,
      solo: false,
      pattern: new Array(16).fill(false)
    },
    {
      id: 'openhat',
      name: 'openhat',
      label: 'Open Hat',
      color: 'bg-green-500',
      volume: 60,
      muted: false,
      solo: false,
      pattern: new Array(16).fill(false)
    }
  ]);
  
  const channelRef = useRef<any>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const stepTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize audio and load synthetic samples
  useEffect(() => {
    initAudioContext();
    createSyntheticDrumSounds();
  }, []);

  // Initialize realtime connection
  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel(roomId, {
      config: {
        presence: { key: user.id }
      }
    });

    // Track user presence
    channel
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        const users: CollaborativeUser[] = [];
        
        Object.keys(presenceState).forEach(userId => {
          const presences = presenceState[userId];
          if (presences.length > 0) {
            const presence = presences[0] as any;
            if (presence.user_id && presence.username) {
              users.push(presence as CollaborativeUser);
            }
          }
        });
        
        setConnectedUsers(users);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        const newUser = newPresences[0] as any;
        toast({
          title: "User joined",
          description: `${newUser?.username || 'Someone'} joined the session`
        });
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        const leftUser = leftPresences[0] as any;
        toast({
          title: "User left",
          description: `${leftUser?.username || 'Someone'} left the session`
        });
      })
      // Listen for pattern updates
      .on('broadcast', { event: 'pattern_update' }, ({ payload }: { payload: BeatPattern }) => {
        if (payload.user_id !== user.id) {
          setTracks(prev => prev.map(track => 
            track.id === payload.track 
              ? { ...track, pattern: payload.steps }
              : track
          ));
        }
      })
      // Listen for transport controls
      .on('broadcast', { event: 'transport_control' }, ({ payload }) => {
        if (payload.user_id !== user.id) {
          if (payload.action === 'play') {
            setIsPlaying(true);
            setCurrentStep(0);
          } else if (payload.action === 'pause') {
            setIsPlaying(false);
          } else if (payload.action === 'stop') {
            setIsPlaying(false);
            setCurrentStep(0);
          }
        }
      })
      // Listen for chat messages
      .on('broadcast', { event: 'chat_message' }, ({ payload }: { payload: ChatMessage }) => {
        setChatMessages(prev => [...prev, payload]);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track user presence
          await channel.track({
            user_id: user.id,
            username: user.email?.split('@')[0] || 'Anonymous',
            avatar_url: null,
            is_recording: false,
            last_seen: new Date().toISOString()
          });
        }
      });

    channelRef.current = channel;

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (stepTimeoutRef.current) {
        clearTimeout(stepTimeoutRef.current);
      }
      channel.unsubscribe();
    };
  }, [user, roomId]);

  // Beat sequencer logic with audio playback
  const playStep = useCallback((step: number) => {
    if (!audioContext) return;

    const anyTrackSolo = tracks.some(track => track.solo);
    
    tracks.forEach(track => {
      if (track.pattern[step] && !track.muted && (!anyTrackSolo || track.solo)) {
        const buffer = audioBuffers.get(track.name) || track.audioBuffer;
        if (buffer) {
          const volume = (track.volume / 100) * (masterVolume[0] / 100);
          playSound(buffer, volume, audioContext, track.name);
        }
      }
    });
  }, [tracks, masterVolume]);

  useEffect(() => {
    if (isPlaying) {
      const stepDuration = (60 / bpm / 4) * 1000; // 16th notes
      
      const scheduleNextStep = () => {
        playStep(currentStep);
        
        stepTimeoutRef.current = setTimeout(() => {
          setCurrentStep(prev => {
            const next = (prev + 1) % 16;
            scheduleNextStep();
            return next;
          });
        }, stepDuration);
      };

      scheduleNextStep();
    } else {
      if (stepTimeoutRef.current) {
        clearTimeout(stepTimeoutRef.current);
        stepTimeoutRef.current = null;
      }
    }

    return () => {
      if (stepTimeoutRef.current) {
        clearTimeout(stepTimeoutRef.current);
      }
    };
  }, [isPlaying, bpm, currentStep, playStep]);

  const updatePattern = (trackId: string, stepIndex: number) => {
    setTracks(prev => prev.map(track => {
      if (track.id === trackId) {
        const newPattern = [...track.pattern];
        newPattern[stepIndex] = !newPattern[stepIndex];
        
        // Broadcast pattern update
        if (channelRef.current && user) {
          channelRef.current.send({
            type: 'broadcast',
            event: 'pattern_update',
            payload: {
              id: `${trackId}-${Date.now()}`,
              track: trackId,
              steps: newPattern,
              user_id: user.id,
              timestamp: Date.now()
            }
          });
        }
        
        return { ...track, pattern: newPattern };
      }
      return track;
    }));
  };

  const handleTransportControl = (action: 'play' | 'pause' | 'stop') => {
    if (action === 'play') {
      if (audioContext?.state === 'suspended') {
        audioContext.resume();
      }
      setIsPlaying(true);
      if (!isPlaying) {
        setCurrentStep(0);
      }
    } else if (action === 'pause') {
      setIsPlaying(false);
    } else if (action === 'stop') {
      setIsPlaying(false);
      setCurrentStep(0);
    }

    // Broadcast transport control
    if (channelRef.current && user) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'transport_control',
        payload: {
          action,
          user_id: user.id,
          timestamp: Date.now()
        }
      });
    }
  };

  const handleFileUpload = async (trackId: string, file: File) => {
    try {
      const audioBuffer = await loadAudioFile(file);
      setTracks(prev => prev.map(track => 
        track.id === trackId 
          ? { ...track, audioBuffer, audioUrl: URL.createObjectURL(file) }
          : track
      ));
      toast({
        title: "Audio loaded",
        description: `${file.name} loaded successfully`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load audio file",
        variant: "destructive"
      });
    }
  };

  const addNewTrack = () => {
    const trackNumber = tracks.length + 1;
    const colors = ['bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-cyan-500', 'bg-orange-500'];
    const newTrack: Track = {
      id: `track-${trackNumber}`,
      name: `track-${trackNumber}`,
      label: `Track ${trackNumber}`,
      color: colors[(trackNumber - 1) % colors.length],
      volume: 80,
      muted: false,
      solo: false,
      pattern: new Array(16).fill(false)
    };
    setTracks(prev => [...prev, newTrack]);
  };

  const removeTrack = (trackId: string) => {
    if (tracks.length <= 1) return;
    setTracks(prev => prev.filter(track => track.id !== trackId));
  };

  const updateTrackVolume = (trackId: string, volume: number) => {
    setTracks(prev => prev.map(track => 
      track.id === trackId ? { ...track, volume } : track
    ));
  };

  const toggleTrackMute = (trackId: string) => {
    setTracks(prev => prev.map(track => 
      track.id === trackId ? { ...track, muted: !track.muted } : track
    ));
  };

  const toggleTrackSolo = (trackId: string) => {
    setTracks(prev => prev.map(track => 
      track.id === trackId ? { ...track, solo: !track.solo } : track
    ));
  };

  const sendChatMessage = () => {
    if (!chatInput.trim() || !user || !channelRef.current) return;

    const message: ChatMessage = {
      id: `msg-${Date.now()}`,
      user_id: user.id,
      username: user.email?.split('@')[0] || 'Anonymous',
      message: chatInput.trim(),
      timestamp: Date.now()
    };

    setChatMessages(prev => [...prev, message]);
    setChatInput('');

    channelRef.current.send({
      type: 'broadcast',
      event: 'chat_message',
      payload: message
    });
  };

  return (
    <div className="space-y-6">
      {/* Header with connected users */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Circle className="w-2 h-2 fill-green-500 text-green-500" />
              Live Beat Session
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span className="text-sm">{connectedUsers.length} online</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 flex-wrap">
            {connectedUsers.map(user => (
              <div key={user.user_id} className="flex items-center gap-2">
                <Avatar className="w-6 h-6">
                  <AvatarImage src={user.avatar_url} />
                  <AvatarFallback>
                    {user.username?.[0]?.toUpperCase() || 'A'}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm">{user.username}</span>
                {user.is_recording && (
                  <Mic className="w-3 h-3 text-red-500" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Beat Sequencer */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Collaborative Beat Maker</CardTitle>
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <Button
                    variant={isPlaying ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleTransportControl(isPlaying ? 'pause' : 'play')}
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTransportControl('stop')}
                  >
                    <Square className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm">BPM:</label>
                  <Input
                    type="number"
                    value={bpm}
                    onChange={(e) => setBpm(Math.max(60, Math.min(200, Number(e.target.value))))}
                    className="w-20"
                    min="60"
                    max="200"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4" />
                  <Slider
                    value={masterVolume}
                    onValueChange={setMasterVolume}
                    max={100}
                    step={1}
                    className="w-20"
                  />
                  <span className="text-sm text-muted-foreground w-8">{masterVolume[0]}</span>
                </div>
                <Button variant="outline" size="sm" onClick={addNewTrack}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Track
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Step indicators */}
                <div className="flex gap-1 ml-32">
                  {Array.from({ length: 16 }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-6 h-6 rounded flex items-center justify-center text-xs ${
                        currentStep === i 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {i + 1}
                    </div>
                  ))}
                </div>

                {/* Track patterns */}
                {tracks.map(track => (
                  <div key={track.id} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-32 flex items-center gap-2">
                        <div className={`w-3 h-3 rounded ${track.color}`} />
                        <span className="text-sm font-medium flex-1">{track.label}</span>
                        <div className="flex gap-1">
                          <Button
                            variant={track.muted ? "default" : "outline"}
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => toggleTrackMute(track.id)}
                          >
                            M
                          </Button>
                          <Button
                            variant={track.solo ? "default" : "outline"}
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => toggleTrackSolo(track.id)}
                          >
                            S
                          </Button>
                          {tracks.length > 1 && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => removeTrack(track.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {track.pattern.map((active, stepIndex) => (
                          <button
                            key={stepIndex}
                            onClick={() => updatePattern(track.id, stepIndex)}
                            className={`w-6 h-6 rounded border-2 transition-colors ${
                              active 
                                ? `${track.color} border-current opacity-100` 
                                : 'bg-muted border-border hover:border-muted-foreground'
                            } ${
                              currentStep === stepIndex ? 'ring-2 ring-primary' : ''
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-32">
                      <Volume2 className="w-3 h-3" />
                      <Slider
                        value={[track.volume]}
                        onValueChange={(value) => updateTrackVolume(track.id, value[0])}
                        max={100}
                        step={1}
                        className="w-20"
                      />
                      <span className="text-xs text-muted-foreground w-8">{track.volume}</span>
                      <input
                        type="file"
                        accept="audio/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(track.id, file);
                        }}
                        className="hidden"
                        id={`upload-${track.id}`}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 px-2"
                        onClick={() => document.getElementById(`upload-${track.id}`)?.click()}
                      >
                        <Upload className="w-3 h-3 mr-1" />
                        Load
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button variant="outline" size="sm">
                  <Save className="w-4 h-4 mr-2" />
                  Save Pattern
                </Button>
                <Button variant="outline" size="sm">
                  <Share2 className="w-4 h-4 mr-2" />
                  Share Session
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Export WAV
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chat */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Live Chat
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ScrollArea className="h-64 w-full">
              <div className="space-y-2">
                {chatMessages.map(msg => (
                  <div key={msg.id} className="text-sm">
                    <span className="font-medium text-primary">
                      {msg.username}:
                    </span>{' '}
                    <span className="text-muted-foreground">{msg.message}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <Separator />
            <div className="flex gap-2">
              <Input
                placeholder="Type a message..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
              />
              <Button size="sm" onClick={sendChatMessage}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RealtimeBeatMaker;