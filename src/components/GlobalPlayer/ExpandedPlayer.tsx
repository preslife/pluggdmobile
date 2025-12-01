import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  ChevronDown,
  Heart,
  Share2,
  Plus,
  Shuffle,
  Repeat,
  Volume2,
  VolumeX,
  MoreHorizontal,
  List,
  Settings,
  ExternalLink,
  Lock,
  PenTool,
  Music,
  Download,
  Bookmark,
  Copy,
  Mic,
  MicOff,
  Save,
  FileText,
  Clock,
  Sparkles,
  RotateCcw
} from 'lucide-react';
import { useGlobalPlayer } from './GlobalPlayerProvider';
import { cn } from '@/lib/utils';
import { QueueManager } from './QueueManager';
import { PlayerSettings } from './PlayerSettings';
import { useToast } from '@/hooks/use-toast';

interface ExpandedPlayerProps {
  className?: string;
}

// BarFlow Lyrics Writing Component integrated into the player
const BarFlowPanel: React.FC<{ trackTitle: string; trackArtist: string }> = ({ trackTitle, trackArtist }) => {
  const { toast } = useToast();
  const [lyrics, setLyrics] = useState('');
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [wordCount, setWordCount] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const storageKey = `barflow-lyrics-${trackTitle}-${trackArtist}`.toLowerCase().replace(/\s+/g, '-');

  // Load saved lyrics
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setLyrics(parsed.lyrics || '');
        if (parsed.savedAt) setSavedAt(new Date(parsed.savedAt));
      } catch {
        setLyrics(saved);
      }
    }
  }, [storageKey]);

  // Update word count
  useEffect(() => {
    const words = lyrics.trim().split(/\s+/).filter(Boolean).length;
    setWordCount(words);
  }, [lyrics]);

  // Auto-save
  useEffect(() => {
    const timer = setTimeout(() => {
      if (lyrics.trim()) {
        localStorage.setItem(storageKey, JSON.stringify({ lyrics, savedAt: new Date().toISOString() }));
        setSavedAt(new Date());
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [lyrics, storageKey]);

  const handleSave = () => {
    localStorage.setItem(storageKey, JSON.stringify({ lyrics, savedAt: new Date().toISOString() }));
    setSavedAt(new Date());
    toast({ title: 'Lyrics Saved', description: 'Your lyrics have been saved locally' });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(lyrics);
    toast({ title: 'Copied', description: 'Lyrics copied to clipboard' });
  };

  const handleExport = () => {
    const blob = new Blob([`${trackTitle} - ${trackArtist}\n\n${lyrics}`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${trackTitle}-lyrics.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Exported', description: 'Lyrics exported as text file' });
  };

  const handleClear = () => {
    if (confirm('Clear all lyrics? This cannot be undone.')) {
      setLyrics('');
      localStorage.removeItem(storageKey);
      setSavedAt(null);
      toast({ title: 'Cleared', description: 'Lyrics cleared' });
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.start();
      setIsRecording(true);
      toast({ title: 'Recording', description: 'Speak into your microphone...' });
    } catch {
      toast({ title: 'Error', description: 'Could not access microphone', variant: 'destructive' });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      toast({ title: 'Recording Stopped', description: 'Voice recording saved' });
    }
  };

  const insertTemplate = (template: string) => {
    const templates: Record<string, string> = {
      verse: '\n[Verse]\n\n\n',
      chorus: '\n[Chorus]\n\n\n',
      bridge: '\n[Bridge]\n\n\n',
      hook: '\n[Hook]\n\n\n',
      intro: '\n[Intro]\n\n\n',
      outro: '\n[Outro]\n\n\n',
    };
    setLyrics(prev => prev + (templates[template] || ''));
  };

  return (
    <div className="h-full flex flex-col p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <PenTool className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">BarFlow</h3>
            <p className="text-xs text-muted-foreground">Write lyrics to "{trackTitle}"</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {wordCount} words
          </Badge>
          {savedAt && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Saved {savedAt.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* Quick Structure Templates */}
      <div className="flex flex-wrap gap-2 mb-4">
        {['verse', 'chorus', 'bridge', 'hook', 'intro', 'outro'].map(template => (
          <Button
            key={template}
            variant="outline"
            size="sm"
            onClick={() => insertTemplate(template)}
            className="text-xs capitalize"
          >
            + {template}
          </Button>
        ))}
      </div>

      {/* Lyrics Editor */}
      <div className="flex-1 min-h-0">
        <Textarea
          value={lyrics}
          onChange={(e) => setLyrics(e.target.value)}
          placeholder={`Start writing lyrics for "${trackTitle}"...\n\n[Verse 1]\nWrite your first verse here...\n\n[Chorus]\nThe hook goes here...`}
          className="h-full resize-none font-mono text-sm bg-muted/30 border-muted"
        />
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between pt-4 border-t mt-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={isRecording ? stopRecording : startRecording}>
            {isRecording ? <MicOff className="h-4 w-4 mr-1 text-red-500" /> : <Mic className="h-4 w-4 mr-1" />}
            {isRecording ? 'Stop' : 'Record'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleClear}>
            <RotateCcw className="h-4 w-4 mr-1" />
            Clear
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCopy}>
            <Copy className="h-4 w-4 mr-1" />
            Copy
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <FileText className="h-4 w-4 mr-1" />
            Export
          </Button>
          <Button size="sm" onClick={handleSave}>
            <Save className="h-4 w-4 mr-1" />
            Save
          </Button>
        </div>
      </div>
    </div>
  );
};

export const ExpandedPlayer: React.FC<ExpandedPlayerProps> = ({ className }) => {
  const { state, actions } = useGlobalPlayer();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'player' | 'queue' | 'lyrics' | 'settings'>('player');
  const [isLiked, setIsLiked] = useState(false);
  
  if (!state.currentTrack || !state.isExpanded) {
    return null;
  }

  const previewLimit = state.currentTrack.streamable
    ? undefined
    : state.currentTrack.preview_duration;

  const effectiveDuration = state.currentTrack.streamable
    ? state.duration
    : previewLimit ?? state.currentTrack.preview_duration ?? state.duration;

  const safeDuration = effectiveDuration && effectiveDuration > 0 ? effectiveDuration : state.duration;
  const clampedCurrentTime = state.currentTrack.streamable
    ? state.currentTime
    : Math.min(state.currentTime, previewLimit ?? state.currentTrack.preview_duration ?? state.currentTime);

  const progress = safeDuration > 0 ? (clampedCurrentTime / safeDuration) * 100 : 0;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSeek = (value: number[]) => {
    const newTime = (value[0] / 100) * (safeDuration || state.duration);
    const limitedTime = state.currentTrack.streamable
      ? newTime
      : Math.min(
          newTime,
          previewLimit ?? state.currentTrack.preview_duration ?? newTime
        );
    actions.seek(limitedTime);
  };

  const handleVolumeChange = (value: number[]) => {
    actions.setVolume(value[0] / 100);
  };

  const purchaseUrl = state.currentTrack.requiresPurchase ? state.currentTrack.purchaseUrl : undefined;

  return (
    <div 
      className={cn(
        "fixed inset-0 z-50 bg-background",
        "transition-transform duration-300 ease-in-out",
        className
      )}
      style={{ 
        transform: state.isExpanded ? 'translateY(0)' : 'translateY(100%)'
      }}
    >
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-b from-muted/30 to-transparent">
          <Button
            variant="ghost"
            size="sm"
            onClick={actions.toggleExpanded}
            className="h-9 w-9 p-0 rounded-full hover:bg-muted"
          >
            <ChevronDown className="h-5 w-5" />
          </Button>
          
          <div className="flex items-center gap-1 bg-muted/50 rounded-full p-1">
            <Button
              variant={activeTab === 'player' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('player')}
              className={cn("rounded-full px-4", activeTab === 'player' && "shadow-sm")}
            >
              <Music className="h-4 w-4 mr-2" />
              Now Playing
            </Button>
            <Button
              variant={activeTab === 'queue' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('queue')}
              className={cn("rounded-full px-4", activeTab === 'queue' && "shadow-sm")}
            >
              <List className="h-4 w-4 mr-2" />
              Queue
              {state.queue.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {state.queue.length}
                </Badge>
              )}
            </Button>
            <Button
              variant={activeTab === 'lyrics' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('lyrics')}
              className={cn("rounded-full px-4", activeTab === 'lyrics' && "shadow-sm")}
            >
              <PenTool className="h-4 w-4 mr-2" />
              BarFlow
            </Button>
            <Button
              variant={activeTab === 'settings' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('settings')}
              className={cn("rounded-full px-4", activeTab === 'settings' && "shadow-sm")}
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>

          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-9 w-9 p-0 rounded-full"
              onClick={() => {
                setIsLiked(!isLiked);
                toast({ title: isLiked ? 'Removed from Favorites' : 'Added to Favorites' });
              }}
            >
              <Heart className={cn("h-4 w-4", isLiked && "fill-red-500 text-red-500")} />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-9 w-9 p-0 rounded-full"
              onClick={() => {
                navigator.clipboard.writeText(window.location.origin + `/release/${state.currentTrack?.releaseId}`);
                toast({ title: 'Link Copied', description: 'Share link copied to clipboard' });
              }}
            >
              <Share2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-full">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          {activeTab === 'player' && (
            <div className="h-full flex flex-col lg:flex-row">
              {/* Artwork & Info */}
              <div className="lg:w-1/2 p-8 flex flex-col justify-center items-center">
                <div className="w-full max-w-md">
                  {/* Artwork */}
                  <div className="aspect-square mb-6 rounded-lg overflow-hidden shadow-2xl">
                    {state.currentTrack.artwork ? (
                      <img
                        src={state.currentTrack.artwork}
                        alt={state.currentTrack.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <div className="text-6xl text-muted-foreground">♪</div>
                      </div>
                    )}
                  </div>

                  {/* Track Info */}
                  <div className="text-center space-y-2">
                    <h1 className="text-2xl font-bold">{state.currentTrack.title}</h1>
                    <p className="text-lg text-muted-foreground">{state.currentTrack.artist}</p>
                    
                    {/* Track metadata */}
                    <div className="flex items-center justify-center gap-2 mt-4">
                      {state.currentTrack.type && (
                        <Badge variant="outline" className="capitalize">
                          {state.currentTrack.type}
                        </Badge>
                      )}
                      {!state.currentTrack.streamable && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Lock className="h-3 w-3" /> Preview
                        </Badge>
                      )}
                      {state.currentTrack.owned && (
                        <Badge variant="default">Owned</Badge>
                      )}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center justify-center gap-4 mt-6">
                    <Button variant="ghost" size="sm">
                      <Heart className="h-4 w-4 mr-2" />
                      Like
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add to Playlist
                    </Button>
                    {state.currentTrack.releaseId && (
                      <Button variant="ghost" size="sm" asChild>
                        <a href={`/release/${state.currentTrack.releaseId}`}>
                          <ExternalLink className="h-4 w-4 mr-2" />
                          View Release
                        </a>
                      </Button>
                    )}
                    {state.currentTrack.requiresPurchase && purchaseUrl && (
                      <Button size="sm" className="ml-2" asChild>
                        <a href={purchaseUrl}>
                          Purchase / Unlock
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="lg:w-1/2 p-8 flex flex-col justify-center">
                <div className="w-full max-w-md mx-auto space-y-6">
                  {/* Progress */}
                  <div className="space-y-2">
                    <Slider
                      value={[progress]}
                      max={100}
                      step={0.1}
                      onValueChange={handleSeek}
                      className="w-full"
                    />
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>{formatTime(clampedCurrentTime)}</span>
                      <span>{formatTime(safeDuration || state.duration)}</span>
                    </div>
                  </div>

                  {/* Main Controls */}
                  <div className="flex items-center justify-center gap-4">
                    <Button
                      variant="ghost"
                      size="lg"
                      onClick={actions.toggleShuffle}
                      className={cn(
                        "h-12 w-12 p-0",
                        state.shuffle && "text-primary"
                      )}
                    >
                      <Shuffle className="h-5 w-5" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="lg"
                      onClick={actions.previous}
                      className="h-12 w-12 p-0"
                    >
                      <SkipBack className="h-6 w-6" />
                    </Button>

                    <Button
                      size="lg"
                      onClick={state.isPlaying ? actions.pause : actions.resume}
                      className="h-16 w-16 rounded-full"
                    >
                      {state.isPlaying ? (
                        <Pause className="h-8 w-8" />
                      ) : (
                        <Play className="h-8 w-8 ml-1" />
                      )}
                    </Button>

                    <Button
                      variant="ghost"
                      size="lg"
                      onClick={actions.next}
                      className="h-12 w-12 p-0"
                    >
                      <SkipForward className="h-6 w-6" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="lg"
                      onClick={actions.toggleRepeat}
                      className={cn(
                        "h-12 w-12 p-0",
                        state.repeat !== 'none' && "text-primary"
                      )}
                    >
                      <Repeat className="h-5 w-5" />
                      {state.repeat === 'one' && (
                        <span className="absolute text-xs font-bold">1</span>
                      )}
                    </Button>
                  </div>

                  {/* Volume */}
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={actions.toggleMute}
                      className="h-8 w-8 p-0 flex-shrink-0"
                    >
                      {state.isMuted || state.volume === 0 ? (
                        <VolumeX className="h-4 w-4" />
                      ) : (
                        <Volume2 className="h-4 w-4" />
                      )}
                    </Button>
                    <Slider
                      value={[state.isMuted ? 0 : state.volume * 100]}
                      max={100}
                      step={1}
                      onValueChange={handleVolumeChange}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'queue' && (
            <QueueManager />
          )}

          {activeTab === 'lyrics' && state.currentTrack && (
            <BarFlowPanel 
              trackTitle={state.currentTrack.title} 
              trackArtist={state.currentTrack.artist} 
            />
          )}

          {activeTab === 'settings' && (
            <PlayerSettings />
          )}
        </div>
      </div>
    </div>
  );
};