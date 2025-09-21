import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Video, Square } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface SessionRecordingProps {
  sessionId: string;
  disabled?: boolean;
  videoElements: HTMLVideoElement[];
}

export const SessionRecording = ({ sessionId, disabled, videoElements }: SessionRecordingProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { toast } = useToast();

  const startRecording = async () => {
    try {
      // Create canvas for compositing video streams
      const canvas = document.createElement('canvas');
      canvas.width = 1280;
      canvas.height = 720;
      canvasRef.current = canvas;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Failed to get canvas context');

      // Create MediaStream from canvas
      const canvasStream = canvas.captureStream(30);
      
      // Get audio from microphone
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Combine video and audio
      const combinedStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...audioStream.getAudioTracks()
      ]);

      setStream(combinedStream);

      // Set up MediaRecorder
      mediaRecorderRef.current = new MediaRecorder(combinedStream, {
        mimeType: 'video/webm;codecs=vp9'
      });

      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        await saveRecording();
      };

      // Start recording
      mediaRecorderRef.current.start(1000);
      setIsRecording(true);

      // Start rendering loop
      renderComposite(ctx);

      toast({
        title: "Recording started",
        description: "Session recording has begun"
      });
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Error",
        description: "Failed to start recording",
        variant: "destructive"
      });
    }
  };

  const renderComposite = (ctx: CanvasRenderingContext2D) => {
    if (!isRecording || !canvasRef.current) return;

    // Clear canvas
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    // Render video elements in grid
    const gridSize = Math.ceil(Math.sqrt(videoElements.length));
    const cellWidth = canvasRef.current.width / gridSize;
    const cellHeight = canvasRef.current.height / gridSize;

    videoElements.forEach((video, index) => {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        const row = Math.floor(index / gridSize);
        const col = index % gridSize;
        const x = col * cellWidth;
        const y = row * cellHeight;
        
        ctx.drawImage(video, x, y, cellWidth, cellHeight);
      }
    });

    // Continue rendering
    requestAnimationFrame(() => renderComposite(ctx));
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
    }
  };

  const saveRecording = async () => {
    try {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `recording-${timestamp}.webm`;
      
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('User not authenticated');

      // Upload to storage
      const filePath = `${user.id}/${sessionId}/${fileName}`;
      const { error: uploadError } = await supabase.storage
        .from('session-files')
        .upload(filePath, blob);

      if (uploadError) throw uploadError;

      // Add to session files
      const { error: fileError } = await supabase
        .from('session_files')
        .insert({
          session_id: sessionId,
          file_name: fileName,
          file_url: filePath,
          size: blob.size,
          file_type: 'video/webm',
          user_id: user.id
        });

      if (fileError) throw fileError;

      toast({
        title: "Recording saved",
        description: "Session recording has been saved to Files"
      });
    } catch (error) {
      console.error('Error saving recording:', error);
      toast({
        title: "Error",
        description: "Failed to save recording",
        variant: "destructive"
      });
    }
  };

  return (
    <Button
      onClick={isRecording ? stopRecording : startRecording}
      disabled={disabled}
      variant={isRecording ? "destructive" : "outline"}
      size="sm"
    >
      {isRecording ? (
        <>
          <Square className="h-4 w-4 mr-2" />
          Stop Recording
        </>
      ) : (
        <>
          <Video className="h-4 w-4 mr-2" />
          Record
        </>
      )}
    </Button>
  );
};