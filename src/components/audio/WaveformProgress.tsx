import React, { useEffect, useRef } from 'react';

interface WaveformProgressProps {
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  className?: string;
}

const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export const WaveformProgress: React.FC<WaveformProgressProps> = ({
  currentTime,
  duration,
  onSeek,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Generate static waveform data only once - stays the same throughout playback
  const waveformDataRef = useRef<number[]>();
  
  if (!waveformDataRef.current) {
    // Generate realistic mock waveform data that simulates actual audio patterns
    waveformDataRef.current = Array.from({ length: 400 }, (_, index) => {
      // Create more realistic waveform patterns with peaks and valleys
      const baseAmplitude = Math.random() * 0.7 + 0.2;
      const sineWave = Math.sin((index / 400) * Math.PI * 4) * 0.2;
      const randomVariation = (Math.random() - 0.5) * 0.3;
      
      // Add occasional peaks to simulate musical dynamics
      const peakChance = Math.random();
      const peak = peakChance > 0.95 ? 0.3 : 0;
      
      return Math.max(0.1, Math.min(1, baseAmplitude + sineWave + randomVariation + peak));
    });
  }
  
  const waveformData = waveformDataRef.current;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match display size for crisp rendering
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const { width, height } = rect;
    const progress = duration > 0 ? currentTime / duration : 0;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw waveform with continuous appearance
    const barWidth = width / waveformData.length;
    const gap = Math.max(0.5, barWidth * 0.05); // Very minimal gap for continuous look
    
    waveformData.forEach((amplitude, index) => {
      const barHeight = Math.max(2, amplitude * height * 0.85); // Minimum height of 2px
      const x = index * barWidth;
      const y = (height - barHeight) / 2;
      
      // Determine color based on progress
      const barProgress = index / waveformData.length;
      const isPlayed = barProgress <= progress;
      
      // Use explicit colors that work reliably in canvas
      ctx.fillStyle = isPlayed 
        ? '#f97316' // Orange color for played portion
        : '#64748b'; // Gray color for unplayed portion
      
      // Use almost full bar width for continuous appearance
      const actualBarWidth = Math.max(barWidth - gap, 0.8);
      ctx.fillRect(x, y, actualBarWidth, barHeight);
    });
    
    // Draw current time indicator
    if (duration > 0) {
      const progressX = progress * width;
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(progressX, 0);
      ctx.lineTo(progressX, height);
      ctx.stroke();
    }
  }, [currentTime, duration, waveformData]);

  const handleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    event.stopPropagation();
    event.preventDefault();
    
    console.log('Waveform clicked!'); // Debug log
    
    const canvas = canvasRef.current;
    if (!canvas || duration <= 0) {
      console.log('Canvas or duration not available:', { canvas: !!canvas, duration });
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const progress = Math.max(0, Math.min(1, x / rect.width)); // Clamp between 0 and 1
    const time = progress * duration;
    
    console.log('Seeking to:', { progress, time, duration }); // Debug log
    onSeek(time);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Time Display */}
      <div className="flex justify-between items-center text-xs text-muted-foreground">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>
      
      {/* Waveform Canvas */}
      <canvas
        ref={canvasRef}
        className="cursor-pointer hover:opacity-90 transition-opacity w-full bg-background/20 rounded-sm"
        onClick={handleClick}
        style={{ width: '100%', height: '50px', display: 'block' }}
      />
    </div>
  );
};