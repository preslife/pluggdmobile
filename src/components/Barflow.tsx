import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Play, 
  Pause, 
  Square, 
  Mic, 
  MicOff, 
  Upload, 
  RotateCcw,
  Volume2,
  FileMusic,
  Plus,
  Save,
  Trash2,
  FolderOpen,
  Clock,
  Music,
  Headphones,
  Sparkles,
  PenTool,
  Wand2,
  Type,
  Hash,
  AlignLeft
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useGlobalPlayer } from "./GlobalPlayer/GlobalPlayer";
import ChordHelper from "./ChordHelper";
import RhymeFinder from "./RhymeFinder";
import AILyricGenerator from "./AILyricGenerator";
import NewSongModal, { SongCreationData } from "./NewSongModal";
import LyricsEditor from "./LyricsEditor";
import AIAssistantSidebar from "./AIAssistantSidebar";

const Barflow = () => {
  const { toast } = useToast();
  const { state: playerState, actions: playerActions } = useGlobalPlayer();
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState([70]);
  const [loopStart, setLoopStart] = useState([0]);
  const [loopEnd, setLoopEnd] = useState([100]);
  const [beatFile, setBeatFile] = useState<File | null>(null);
  const [lyrics, setLyrics] = useState("");
  const [transcription, setTranscription] = useState("");
  const [projectName, setProjectName] = useState("Untitled Song");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [bpm, setBpm] = useState(120);
  const [currentSong, setCurrentSong] = useState<SongCreationData | null>(null);
  const [showNewSongModal, setShowNewSongModal] = useState(false);
  const [savedProjects, setSavedProjects] = useState<string[]>([]);
  const [useGlobalPlayerBeat, setUseGlobalPlayerBeat] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate word and character count
  useEffect(() => {
    const words = lyrics.trim().split(/\s+/).filter(Boolean).length;
    setWordCount(words);
    setCharCount(lyrics.length);
  }, [lyrics]);

  // Load saved projects list
  useEffect(() => {
    const projects: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('barflow-project-')) {
        projects.push(key.replace('barflow-project-', ''));
      }
    }
    setSavedProjects(projects);
  }, [lastSaved]);

  const songTemplates = {
    "hip-hop": {
      name: "Hip-Hop",
      structure: ["Intro", "Verse 1", "Hook", "Verse 2", "Hook", "Bridge", "Hook", "Outro"]
    },
    "pop": {
      name: "Pop",
      structure: ["Intro", "Verse 1", "Pre-Chorus", "Chorus", "Verse 2", "Pre-Chorus", "Chorus", "Bridge", "Chorus", "Outro"]
    },
    "rnb": {
      name: "R&B",
      structure: ["Intro", "Verse 1", "Chorus", "Verse 2", "Chorus", "Bridge", "Chorus", "Outro"]
    },
    "trap": {
      name: "Trap",
      structure: ["Intro", "Verse 1", "Hook", "Verse 2", "Hook", "Verse 3", "Hook", "Outro"]
    },
    "rock": {
      name: "Rock",
      structure: ["Intro", "Verse 1", "Chorus", "Verse 2", "Chorus", "Solo", "Chorus", "Outro"]
    }
  };

  // Audio Player Functions
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setBeatFile(file);
      const url = URL.createObjectURL(file);
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.addEventListener('loadedmetadata', () => {
          if (audioRef.current) {
            setDuration(audioRef.current.duration);
            setLoopEnd([audioRef.current.duration]);
          }
        });
      }
      toast({
        title: "Beat Loaded",
        description: `${file.name} is ready to play`,
      });
    }
  };

  const togglePlayPause = () => {
    if (!audioRef.current || !beatFile) {
      toast({
        title: "No Beat Loaded",
        description: "Please upload a beat file first",
        variant: "destructive"
      });
      return;
    }

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.currentTime = loopStart[0];
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = loopStart[0];
      setIsPlaying(false);
      setCurrentTime(loopStart[0]);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value);
    if (audioRef.current) {
      audioRef.current.volume = value[0] / 100;
    }
  };

  // Loop handling
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      const current = audio.currentTime;
      setCurrentTime(current);
      
      // Loop back to start if we reach the end point
      if (current >= loopEnd[0]) {
        audio.currentTime = loopStart[0];
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    return () => audio.removeEventListener('timeupdate', handleTimeUpdate);
  }, [loopStart, loopEnd]);

  // Voice Recording Functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = []; // Reset chunks
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        // Use ref instead of state to ensure we have all chunks
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        transcribeAudio(audioBlob);
        audioChunksRef.current = [];
        setRecordingTime(0);
      };

      // Request data every 1 second to ensure we capture everything
      mediaRecorder.start(1000);
      setIsRecording(true);
      
      // Track recording time
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      toast({
        title: "Recording Started",
        description: "Speak into your microphone",
      });
    } catch (error) {
      toast({
        title: "Recording Error",
        description: "Could not access microphone. Please grant permission.",
        variant: "destructive"
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
      
      toast({
        title: "Recording Stopped",
        description: "Processing transcription...",
      });
    }
  };

  // Format recording time
  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    try {
      // Convert to base64 for edge function
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      
      const { data, error } = await supabase.functions.invoke('transcribe-audio', {
        body: { audio: base64 }
      });

      if (error) {
        throw new Error(error.message);
      }

      setTranscription(data.text);
      toast({
        title: "Transcription Complete",
        description: "Voice converted to text using AI",
      });
    } catch (error) {
      console.error('Transcription error:', error);
      toast({
        title: "Error",
        description: "Transcription service unavailable",
        variant: "destructive"
      });
    }
  };

  const insertTranscription = () => {
    if (transcription) {
      setLyrics(prev => prev + (prev ? "\n" : "") + transcription);
      setTranscription("");
      toast({
        title: "Text Inserted",
        description: "Transcription added to lyrics",
      });
    }
  };

  const handleCreateSong = (data: SongCreationData) => {
    setCurrentSong(data);
    setProjectName(data.name);
    
    // Load the template structure
    const template = songTemplates[data.template as keyof typeof songTemplates];
    const templateText = template.structure.map((section) => 
      `[${section}]\n\n\n`
    ).join("");
    setLyrics(templateText);
    
    // Handle beat file
    if (data.beat.file) {
      setBeatFile(data.beat.file);
      const url = URL.createObjectURL(data.beat.file);
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.addEventListener('loadedmetadata', () => {
          if (audioRef.current) {
            setDuration(audioRef.current.duration);
            setLoopEnd([audioRef.current.duration]);
          }
        });
      }
    }
    
    toast({
      title: "Song Created",
      description: `${data.name} is ready for writing`,
    });
  };

  const insertAIText = (text: string) => {
    setLyrics(prev => prev + (prev ? "\n" : "") + text);
  };

  const saveProject = () => {
    const projectData = {
      name: projectName,
      lyrics,
      currentSong,
      beatFile: beatFile?.name || null,
      loopStart: loopStart[0],
      loopEnd: loopEnd[0],
      volume: volume[0],
      bpm,
      savedAt: new Date().toISOString()
    };
    
    localStorage.setItem(`barflow-project-${projectName}`, JSON.stringify(projectData));
    setLastSaved(new Date());
    toast({
      title: "Project Saved",
      description: `"${projectName}" saved successfully`,
    });
  };

  const autoSave = () => {
    if (lyrics.trim() || beatFile || currentSong) {
      saveProject();
    }
  };

  // Auto-save every 2 minutes
  useEffect(() => {
    const interval = setInterval(autoSave, 120000);
    return () => clearInterval(interval);
  }, [lyrics, beatFile, projectName, currentSong]);

  // Load a saved project
  const loadProject = (name: string) => {
    const saved = localStorage.getItem(`barflow-project-${name}`);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setProjectName(data.name || name);
        setLyrics(data.lyrics || '');
        setCurrentSong(data.currentSong || { name, template: 'hip-hop', beat: { type: 'upload', name: 'Loaded Beat' } });
        setBpm(data.bpm || 120);
        setLoopStart([data.loopStart || 0]);
        setLoopEnd([data.loopEnd || 100]);
        setVolume([data.volume || 70]);
        if (data.savedAt) setLastSaved(new Date(data.savedAt));
        toast({ title: 'Project Loaded', description: `Loaded "${name}"` });
      } catch {
        toast({ title: 'Error', description: 'Could not load project', variant: 'destructive' });
      }
    }
  };

  // Delete a project
  const deleteProject = (name: string) => {
    if (confirm(`Delete project "${name}"?`)) {
      localStorage.removeItem(`barflow-project-${name}`);
      setSavedProjects(prev => prev.filter(p => p !== name));
      toast({ title: 'Deleted', description: `Project "${name}" deleted` });
    }
  };

  // Use beat from global player
  const useCurrentlyPlayingBeat = () => {
    if (playerState.currentTrack) {
      setUseGlobalPlayerBeat(true);
      toast({
        title: 'Using Global Player',
        description: `Writing to "${playerState.currentTrack.title}"`
      });
    } else {
      toast({ title: 'No Track Playing', description: 'Start playing a track first', variant: 'destructive' });
    }
  };

  if (!currentSong) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <div className="w-full max-w-6xl mx-auto p-6 pt-24">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm mb-6">
              <PenTool className="w-4 h-4" />
              <span>Songwriting Suite</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
              <span className="bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
                BarFlow
              </span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              The ultimate songwriting toolkit. Write lyrics, loop sections, record ideas, 
              and let AI help you craft your next hit.
            </p>
            
            {/* Quick Actions */}
            <div className="flex flex-wrap justify-center gap-4 mb-12">
              <Button onClick={() => setShowNewSongModal(true)} size="lg" className="gap-2 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90">
                <Plus className="w-5 h-5" />
                Create New Song
              </Button>
              {playerState.currentTrack && (
                <Button 
                  onClick={useCurrentlyPlayingBeat} 
                  variant="outline" 
                  size="lg" 
                  className="gap-2"
                >
                  <Headphones className="w-5 h-5" />
                  Write to "{playerState.currentTrack.title.slice(0, 20)}..."
                </Button>
              )}
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <Card className="border-primary/20 bg-gradient-to-br from-background to-primary/5">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <Type className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Smart Templates</h3>
                <p className="text-sm text-muted-foreground">
                  Pre-built song structures for Hip-Hop, Pop, R&B, Trap, and Rock
                </p>
              </CardContent>
            </Card>
            <Card className="border-purple-500/20 bg-gradient-to-br from-background to-purple-500/5">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-4">
                  <Wand2 className="w-6 h-6 text-purple-500" />
                </div>
                <h3 className="font-semibold text-lg mb-2">AI Assistant</h3>
                <p className="text-sm text-muted-foreground">
                  Generate verses, hooks, and rhymes with AI-powered suggestions
                </p>
              </CardContent>
            </Card>
            <Card className="border-pink-500/20 bg-gradient-to-br from-background to-pink-500/5">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-xl bg-pink-500/10 flex items-center justify-center mb-4">
                  <Mic className="w-6 h-6 text-pink-500" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Voice Recording</h3>
                <p className="text-sm text-muted-foreground">
                  Record ideas and get them transcribed instantly
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Saved Projects */}
          {savedProjects.length > 0 && (
            <Card className="border-muted">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FolderOpen className="w-5 h-5" />
                  Recent Projects
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {savedProjects.slice(0, 6).map((project) => (
                    <div 
                      key={project}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
                    >
                      <button
                        onClick={() => loadProject(project)}
                        className="flex items-center gap-2 flex-1 text-left"
                      >
                        <FileMusic className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium truncate">{project}</span>
                      </button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteProject(project)}
                        className="opacity-0 group-hover:opacity-100 h-7 w-7 p-0"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        
        <NewSongModal
          open={showNewSongModal}
          onOpenChange={setShowNewSongModal}
          onCreateSong={handleCreateSong}
        />
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Enhanced Header */}
      <div className="border-b bg-background/80 backdrop-blur-xl sticky top-0 z-20">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
                <PenTool className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
                BarFlow
              </h1>
            </div>
            <div className="h-6 w-px bg-border" />
            <div className="flex items-center gap-2">
              <Input
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="w-48 text-sm h-9"
                placeholder="Project name..."
              />
              <Button onClick={saveProject} size="sm" variant="outline" className="h-9">
                <Save className="w-4 h-4 mr-1" />
                Save
              </Button>
              <Button onClick={() => setShowNewSongModal(true)} size="sm" variant="outline" className="h-9">
                <Plus className="w-4 h-4 mr-1" />
                New
              </Button>
              <Button onClick={() => setCurrentSong(null)} size="sm" variant="ghost" className="h-9">
                <FolderOpen className="w-4 h-4 mr-1" />
                Projects
              </Button>
            </div>
          </div>
          
          {/* Stats Bar */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50">
                <AlignLeft className="w-3 h-3" />
                <span>{wordCount} words</span>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50">
                <Hash className="w-3 h-3" />
                <span>{charCount} chars</span>
              </div>
              {lastSaved && (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-600">
                  <Clock className="w-3 h-3" />
                  <span>Saved {lastSaved.toLocaleTimeString()}</span>
                </div>
              )}
            </div>
            
            {/* Currently Playing */}
            {useGlobalPlayerBeat && playerState.currentTrack && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs">
                <Music className="w-3 h-3 animate-pulse" />
                <span className="truncate max-w-[150px]">{playerState.currentTrack.title}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-6">

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-120px)]">
        {/* Main Lyrics Editor */}
        <div className="lg:col-span-2">
          <LyricsEditor
            songName={currentSong.name}
            songStructure={songTemplates[currentSong.template as keyof typeof songTemplates].structure}
            lyrics={lyrics}
            onLyricsChange={setLyrics}
          />
        </div>

        {/* AI Assistant Sidebar */}
        <div className="lg:col-span-1">
          <AIAssistantSidebar
            onInsertText={insertAIText}
            currentLyrics={lyrics}
            songGenre={currentSong.template}
          />
        </div>

        {/* Beat Player & Tools */}
        <div className="lg:col-span-1 space-y-4">

          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileMusic className="w-4 h-4 text-primary" />
                </div>
                Beat Player
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  <Music className="w-3 h-3 mr-1" />
                  {currentSong.beat.name}
                </Badge>
                {bpm > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {bpm} BPM
                  </Badge>
                )}
              </div>

              {beatFile && (
                <>
                  {/* Waveform-like Progress */}
                  <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="absolute h-full bg-gradient-to-r from-primary to-purple-500 transition-all duration-150"
                      style={{ width: `${(currentTime / duration) * 100}%` }}
                    />
                    {/* Loop region indicator */}
                    <div 
                      className="absolute h-full bg-primary/20"
                      style={{ 
                        left: `${(loopStart[0] / duration) * 100}%`,
                        width: `${((loopEnd[0] - loopStart[0]) / duration) * 100}%`
                      }}
                    />
                  </div>

                  {/* Time Display */}
                  <div className="flex justify-between text-xs text-muted-foreground font-mono">
                    <span>{currentTime.toFixed(1)}s</span>
                    <span>{duration.toFixed(1)}s</span>
                  </div>

                  {/* Transport Controls */}
                  <div className="flex items-center justify-center gap-2">
                    <Button onClick={() => stopAudio()} variant="outline" size="sm" className="h-9 w-9 p-0">
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                    <Button 
                      onClick={togglePlayPause} 
                      size="lg" 
                      className="h-12 w-12 rounded-full bg-gradient-to-r from-primary to-purple-600"
                    >
                      {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                    </Button>
                    <Button onClick={stopAudio} variant="outline" size="sm" className="h-9 w-9 p-0">
                      <Square className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Volume */}
                  <div className="flex items-center gap-3">
                    <Volume2 className="w-4 h-4 text-muted-foreground" />
                    <Slider
                      value={volume}
                      onValueChange={handleVolumeChange}
                      max={100}
                      step={1}
                      className="flex-1"
                    />
                    <span className="text-xs text-muted-foreground w-8 text-right">{volume[0]}%</span>
                  </div>

                  {/* Loop Controls */}
                  <div className="space-y-3 pt-2 border-t">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <RotateCcw className="w-3 h-3" />
                      Loop Region
                    </Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <span className="text-xs text-muted-foreground">Start: {loopStart[0].toFixed(1)}s</span>
                        <Slider
                          value={loopStart}
                          onValueChange={setLoopStart}
                          max={duration}
                          step={0.1}
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs text-muted-foreground">End: {loopEnd[0].toFixed(1)}s</span>
                        <Slider
                          value={loopEnd}
                          onValueChange={setLoopEnd}
                          max={duration}
                          step={0.1}
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {!beatFile && (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  <p>No beat file loaded</p>
                  <Button variant="outline" size="sm" className="mt-2" onClick={() => setShowNewSongModal(true)}>
                    <Upload className="w-4 h-4 mr-1" />
                    Load Beat
                  </Button>
                </div>
              )}

              <audio ref={audioRef} />
            </CardContent>
          </Card>

          <Card className="border-pink-500/20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="w-8 h-8 rounded-lg bg-pink-500/10 flex items-center justify-center">
                  <Mic className="w-4 h-4 text-pink-500" />
                </div>
                Voice Recorder
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col items-center gap-3">
                <Button
                  onClick={isRecording ? stopRecording : startRecording}
                  size="lg"
                  variant={isRecording ? "destructive" : "default"}
                  className={isRecording ? "animate-pulse" : ""}
                >
                  {isRecording ? (
                    <>
                      <MicOff className="w-5 h-5 mr-2" />
                      Stop Recording
                    </>
                  ) : (
                    <>
                      <Mic className="w-5 h-5 mr-2" />
                      Start Recording
                    </>
                  )}
                </Button>
                
                {isRecording && (
                  <div className="flex flex-col items-center gap-2 w-full">
                    <div className="flex items-center gap-2 text-destructive">
                      <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                      <span className="font-mono font-medium">{formatRecordingTime(recordingTime)}</span>
                    </div>
                    <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-pink-500 to-red-500 animate-pulse" 
                        style={{ width: `${Math.min((recordingTime / 60) * 100, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Recording your voice...</p>
                  </div>
                )}
              </div>

              {transcription && (
                <div className="space-y-3 pt-2 border-t">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Transcription</Label>
                  <div className="p-3 bg-muted/50 rounded-lg border">
                    <p className="text-sm">{transcription}</p>
                  </div>
                  <Button onClick={insertTranscription} className="w-full" size="sm">
                    <Plus className="w-4 h-4 mr-1" />
                    Insert into Lyrics
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Tools</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ChordHelper />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Rhyme Finder</CardTitle>
            </CardHeader>
            <CardContent>
              <RhymeFinder />
            </CardContent>
          </Card>
        </div>
      </div>
      
      <NewSongModal
        open={showNewSongModal}
        onOpenChange={setShowNewSongModal}
        onCreateSong={handleCreateSong}
      />
      </div>
    </div>
  );
};

export default Barflow;