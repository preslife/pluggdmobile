import React, { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Play, Pause } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface WaveformFeedbackProps {
  audioUrl: string;
  sessionId: string;
  onAddFeedback: (content: string, timecode: number) => Promise<void>;
  feedbackItems: Array<{
    id: string;
    content: string;
    timecode_seconds: number;
    created_at: string;
    user_id: string;
  }>;
}

export const WaveformFeedback: React.FC<WaveformFeedbackProps> = ({
  audioUrl,
  sessionId,
  onAddFeedback,
  feedbackItems
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [clickPosition, setClickPosition] = useState<{ x: number; time: number } | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const { toast } = useToast();

  // Generate waveform visualization data
  const generateWaveform = useCallback(async () => {
    if (!audioUrl) return;

    try {
      const audioContext = new AudioContext();
      const response = await fetch(audioUrl);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      const channelData = audioBuffer.getChannelData(0);
      const samples = 200; // Number of bars in waveform
      const blockSize = Math.floor(channelData.length / samples);
      const waveform: number[] = [];

      for (let i = 0; i < samples; i++) {
        const start = i * blockSize;
        let sum = 0;
        for (let j = 0; j < blockSize; j++) {
          sum += Math.abs(channelData[start + j] || 0);
        }
        waveform.push(sum / blockSize);
      }

      // Normalize to 0-1 range
      const max = Math.max(...waveform);
      const normalized = waveform.map(val => val / max);
      setWaveformData(normalized);
      setDuration(audioBuffer.duration);
    } catch (error) {
      console.error('Error generating waveform:', error);
      toast({
        title: "Waveform Error",
        description: "Could not generate waveform visualization",
        variant: "destructive"
      });
    }
  }, [audioUrl, toast]);

  // Draw waveform on canvas
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || waveformData.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    const barWidth = width / waveformData.length;
    const progressPosition = (currentTime / duration) * width;

    waveformData.forEach((amplitude, index) => {
      const barHeight = amplitude * height * 0.8;
      const x = index * barWidth;
      const y = (height - barHeight) / 2;

      // Color bars based on playback position
      ctx.fillStyle = x < progressPosition 
        ? 'hsl(var(--primary))' 
        : 'hsl(var(--muted-foreground))';
      
      ctx.fillRect(x, y, barWidth - 1, barHeight);
    });

    // Draw feedback markers
    feedbackItems.forEach(feedback => {
      if (feedback.timecode_seconds <= duration) {
        const x = (feedback.timecode_seconds / duration) * width;
        ctx.fillStyle = 'hsl(var(--accent))';
        ctx.fillRect(x - 2, 0, 4, height);
        
        // Add comment icon
        ctx.fillStyle = 'hsl(var(--accent))';
        ctx.beginPath();
        ctx.arc(x, 10, 4, 0, 2 * Math.PI);
        ctx.fill();
      }
    });

    // Draw click position indicator
    if (clickPosition) {
      ctx.strokeStyle = 'hsl(var(--primary))';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(clickPosition.x, 0);
      ctx.lineTo(clickPosition.x, height);
      ctx.stroke();
    }
  }, [waveformData, currentTime, duration, feedbackItems, clickPosition]);

  // Handle canvas click for timestamped feedback
  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || duration === 0) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const time = (x / canvas.width) * duration;

    setClickPosition({ x, time });
    
    // Seek audio to clicked position
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  // Submit feedback at clicked position
  const handleSubmitFeedback = async () => {
    if (!clickPosition || !feedbackText.trim()) return;

    try {
      await onAddFeedback(feedbackText, clickPosition.time);
      setFeedbackText("");
      setClickPosition(null);
      toast({
        title: "Feedback Added",
        description: `Added feedback at ${Math.floor(clickPosition.time)}s`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add feedback",
        variant: "destructive"
      });
    }
  };

  // Audio event handlers
  const handlePlay = () => setIsPlaying(true);
  const handlePause = () => setIsPlaying(false);
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const togglePlayback = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  useEffect(() => {
    generateWaveform();
  }, [generateWaveform]);

  useEffect(() => {
    drawWaveform();
  }, [drawWaveform]);

  return (
    <div className="space-y-4 p-4 border border-border rounded-lg bg-card">
      <div className="flex items-center gap-3">
        <Button
          size="sm"
          variant="outline"
          onClick={togglePlayback}
          className="flex items-center gap-2"
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          {isPlaying ? "Pause" : "Play"}
        </Button>
        <div className="text-sm text-muted-foreground">
          {Math.floor(currentTime)}s / {Math.floor(duration)}s
        </div>
      </div>

      {/* Waveform Canvas */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={800}
          height={100}
          className="w-full h-24 cursor-crosshair border border-border rounded bg-background"
          onClick={handleCanvasClick}
        />
        <div className="text-xs text-muted-foreground mt-1">
          Click on the waveform to add timestamped feedback
        </div>
      </div>

      {/* Feedback Input */}
      {clickPosition && (
        <div className="space-y-3 p-3 border border-primary/20 rounded bg-primary/5">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">
              Add feedback at {Math.floor(clickPosition.time)}s
            </span>
          </div>
          <Textarea
            placeholder="Enter your feedback for this moment in the track..."
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            className="min-h-[80px]"
          />
          <div className="flex gap-2">
            <Button onClick={handleSubmitFeedback} size="sm">
              Add Feedback
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setClickPosition(null)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Feedback List */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <MessageCircle className="w-4 h-4" />
          Feedback ({feedbackItems.length})
        </h4>
        {feedbackItems.map((feedback) => (
          <div
            key={feedback.id}
            className="p-3 border border-border rounded bg-background/40 cursor-pointer hover:bg-background/60 transition-colors"
            onClick={() => {
              if (audioRef.current) {
                audioRef.current.currentTime = feedback.timecode_seconds;
              }
            }}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs">
                    {Math.floor(feedback.timecode_seconds)}s
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(feedback.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm">{feedback.content}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        src={audioUrl}
        onPlay={handlePlay}
        onPause={handlePause}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => {
          if (audioRef.current) {
            setDuration(audioRef.current.duration);
          }
        }}
      />
    </div>
  );
};