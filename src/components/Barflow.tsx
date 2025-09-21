import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
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
  Save
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import ChordHelper from "./ChordHelper";
import RhymeFinder from "./RhymeFinder";
import AILyricGenerator from "./AILyricGenerator";
import NewSongModal, { SongCreationData } from "./NewSongModal";
import LyricsEditor from "./LyricsEditor";
import AIAssistantSidebar from "./AIAssistantSidebar";

const Barflow = () => {
  const { toast } = useToast();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
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
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);

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
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setAudioChunks(prev => [...prev, event.data]);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        transcribeAudio(audioBlob);
        setAudioChunks([]);
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast({
        title: "Recording Started",
        description: "Speak into your microphone",
      });
    } catch (error) {
      toast({
        title: "Recording Error",
        description: "Could not access microphone",
        variant: "destructive"
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      toast({
        title: "Recording Stopped",
        description: "Processing transcription...",
      });
    }
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

  if (!currentSong) {
    return (
      <div className="w-full max-w-4xl mx-auto p-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
            Barflow Songwriting Suite
          </h1>
          <p className="text-muted-foreground mb-6">
            Complete songwriting toolkit with beat playback, voice recording, and lyric templates
          </p>
          <Button onClick={() => setShowNewSongModal(true)} size="lg">
            <Plus className="w-5 h-5 mr-2" />
            Create New Song
          </Button>
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
    <div className="w-full h-screen p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Barflow
          </h1>
          <div className="flex items-center gap-2">
            <Input
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="w-48 text-sm"
              placeholder="Project name..."
            />
            <Button onClick={saveProject} size="sm" variant="outline">
              <Save className="w-4 h-4 mr-1" />
              Save
            </Button>
            <Button onClick={() => setShowNewSongModal(true)} size="sm" variant="outline">
              <Plus className="w-4 h-4 mr-1" />
              New Song
            </Button>
          </div>
        </div>
        {lastSaved && (
          <p className="text-xs text-muted-foreground">
            Last saved: {lastSaved.toLocaleTimeString()}
          </p>
        )}
      </div>

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

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileMusic className="w-5 h-5" />
                Beat Player
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-sm text-muted-foreground">
                Current Beat: {currentSong.beat.name}
              </div>

              {beatFile && (
                <>
                  <div className="flex items-center justify-center gap-4">
                    <Button onClick={togglePlayPause} size="lg">
                      {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                    </Button>
                    <Button onClick={stopAudio} variant="outline" size="lg">
                      <Square className="w-6 h-6" />
                    </Button>
                    <Button onClick={() => stopAudio()} variant="outline">
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <Volume2 className="w-4 h-4" />
                      <Slider
                        value={volume}
                        onValueChange={handleVolumeChange}
                        max={100}
                        step={1}
                        className="flex-1"
                      />
                      <span className="text-sm text-muted-foreground w-12">{volume[0]}%</span>
                    </div>

                    <div className="space-y-2">
                      <Label>Loop Start</Label>
                      <Slider
                        value={loopStart}
                        onValueChange={setLoopStart}
                        max={duration}
                        step={0.1}
                        className="w-full"
                      />
                      <span className="text-sm text-muted-foreground">{loopStart[0].toFixed(1)}s</span>
                    </div>

                    <div className="space-y-2">
                      <Label>Loop End</Label>
                      <Slider
                        value={loopEnd}
                        onValueChange={setLoopEnd}
                        max={duration}
                        step={0.1}
                        className="w-full"
                      />
                      <span className="text-sm text-muted-foreground">{loopEnd[0].toFixed(1)}s</span>
                    </div>

                    <div className="text-center text-sm text-muted-foreground">
                      {currentTime.toFixed(1)}s / {duration.toFixed(1)}s
                    </div>
                  </div>
                </>
              )}

              <audio ref={audioRef} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mic className="w-5 h-5" />
                Voice Recorder
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-center gap-4">
                <Button
                  onClick={isRecording ? stopRecording : startRecording}
                  size="lg"
                  variant={isRecording ? "destructive" : "default"}
                >
                  {isRecording ? (
                    <>
                      <MicOff className="w-6 h-6 mr-2" />
                      Stop
                    </>
                  ) : (
                    <>
                      <Mic className="w-6 h-6 mr-2" />
                      Record
                    </>
                  )}
                </Button>
              </div>

              {isRecording && (
                <div className="text-center">
                  <div className="animate-pulse text-destructive font-medium text-sm">
                    🔴 Recording...
                  </div>
                </div>
              )}

              {transcription && (
                <div className="space-y-4">
                  <Label>Transcription</Label>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm">{transcription}</p>
                  </div>
                  <Button onClick={insertTranscription} className="w-full" size="sm">
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
  );
};

export default Barflow;