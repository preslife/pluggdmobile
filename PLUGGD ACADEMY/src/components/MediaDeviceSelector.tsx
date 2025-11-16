import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Slider } from './ui/slider';
import { Label } from './ui/label';
import { Progress } from './ui/progress';
import { getMediaDevices, getDeviceLabel } from './utils/webrtc';
import {
  Camera,
  Mic,
  Monitor,
  Volume2,
  VolumeX,
  Settings,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Headphones,
  Speaker,
  VideoOff,
  MicOff
} from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner@2.0.3';

interface MediaDeviceSelectorProps {
  onDeviceChange?: (deviceId: string, kind: 'videoinput' | 'audioinput' | 'audiooutput') => void;
  currentStream?: MediaStream;
  className?: string;
}

interface MediaDevice {
  deviceId: string;
  label: string;
  kind: MediaDeviceKind;
  groupId: string;
}

export function MediaDeviceSelector({
  onDeviceChange,
  currentStream,
  className = ''
}: MediaDeviceSelectorProps) {
  const [devices, setDevices] = useState<MediaDevice[]>([]);
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>('');
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>('');
  const [selectedOutputDevice, setSelectedOutputDevice] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [volume, setVolume] = useState([75]);
  const [isTestingAudio, setIsTestingAudio] = useState(false);

  const videoRef = React.useRef<HTMLVideoElement>(null);
  const audioContextRef = React.useRef<AudioContext | null>(null);
  const analyserRef = React.useRef<AnalyserNode | null>(null);

  // Load available devices
  const loadDevices = async () => {
    try {
      setIsLoading(true);
      
      // Request permissions first
      await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      
      const deviceList = await getMediaDevices();
      const filteredDevices = deviceList.filter(device => 
        device.kind === 'videoinput' || 
        device.kind === 'audioinput' || 
        device.kind === 'audiooutput'
      );

      setDevices(filteredDevices as MediaDevice[]);

      // Set default devices
      const videoDevices = filteredDevices.filter(d => d.kind === 'videoinput');
      const audioDevices = filteredDevices.filter(d => d.kind === 'audioinput');
      const outputDevices = filteredDevices.filter(d => d.kind === 'audiooutput');

      if (videoDevices.length > 0 && !selectedVideoDevice) {
        setSelectedVideoDevice(videoDevices[0].deviceId);
      }
      if (audioDevices.length > 0 && !selectedAudioDevice) {
        setSelectedAudioDevice(audioDevices[0].deviceId);
      }
      if (outputDevices.length > 0 && !selectedOutputDevice) {
        setSelectedOutputDevice(outputDevices[0].deviceId);
      }

    } catch (error) {
      console.error('Failed to load media devices:', error);
      toast.error('Failed to load media devices', {
        description: 'Please check your camera and microphone permissions'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize preview stream
  const initPreview = async () => {
    try {
      if (previewStream) {
        previewStream.getTracks().forEach(track => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: selectedVideoDevice ? { deviceId: { exact: selectedVideoDevice } } : true,
        audio: selectedAudioDevice ? { deviceId: { exact: selectedAudioDevice } } : true
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setPreviewStream(stream);

      // Set video preview
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Set up audio level monitoring
      setupAudioLevelMonitoring(stream);

    } catch (error) {
      console.error('Failed to initialize preview:', error);
      toast.error('Preview failed', {
        description: 'Unable to access selected devices'
      });
    }
  };

  // Setup audio level monitoring
  const setupAudioLevelMonitoring = (stream: MediaStream) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      
      analyser.smoothingTimeConstant = 0.8;
      analyser.fftSize = 1024;
      
      microphone.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const updateAudioLevel = () => {
        if (analyser) {
          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          analyser.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          setAudioLevel(average);
          
          if (previewStream) {
            requestAnimationFrame(updateAudioLevel);
          }
        }
      };

      updateAudioLevel();
    } catch (error) {
      console.error('Audio monitoring setup failed:', error);
    }
  };

  // Handle device change
  const handleDeviceChange = (deviceId: string, kind: MediaDeviceKind) => {
    switch (kind) {
      case 'videoinput':
        setSelectedVideoDevice(deviceId);
        onDeviceChange?.(deviceId, 'videoinput');
        break;
      case 'audioinput':
        setSelectedAudioDevice(deviceId);
        onDeviceChange?.(deviceId, 'audioinput');
        break;
      case 'audiooutput':
        setSelectedOutputDevice(deviceId);
        onDeviceChange?.(deviceId, 'audiooutput');
        break;
    }
  };

  // Test audio output
  const testAudioOutput = async () => {
    setIsTestingAudio(true);
    
    try {
      // Create a simple test tone
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // A4 note
      gainNode.gain.setValueAtTime(volume[0] / 300, audioContext.currentTime); // Reduced volume
      
      oscillator.start();
      
      setTimeout(() => {
        oscillator.stop();
        audioContext.close();
        setIsTestingAudio(false);
      }, 1000);
      
      toast.success('Audio test completed');
    } catch (error) {
      console.error('Audio test failed:', error);
      toast.error('Audio test failed');
      setIsTestingAudio(false);
    }
  };

  // Load devices on mount
  useEffect(() => {
    loadDevices();
  }, []);

  // Update preview when devices change
  useEffect(() => {
    if (selectedVideoDevice || selectedAudioDevice) {
      initPreview();
    }
  }, [selectedVideoDevice, selectedAudioDevice]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (previewStream) {
        previewStream.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [previewStream]);

  const videoDevices = devices.filter(d => d.kind === 'videoinput');
  const audioDevices = devices.filter(d => d.kind === 'audioinput');
  const outputDevices = devices.filter(d => d.kind === 'audiooutput');

  return (
    <Card className={`${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Media Device Settings
            </CardTitle>
            <CardDescription>Configure your camera, microphone, and speakers</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={loadDevices} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Video Device Selection */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Camera className="h-4 w-4" />
            Camera
          </Label>
          
          <Select
            value={selectedVideoDevice}
            onValueChange={(value) => handleDeviceChange(value, 'videoinput')}
            disabled={isLoading || videoDevices.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select camera" />
            </SelectTrigger>
            <SelectContent>
              {videoDevices.map((device) => (
                <SelectItem key={device.deviceId} value={device.deviceId}>
                  {getDeviceLabel(device)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Video Preview */}
          <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
            {previewStream && previewStream.getVideoTracks().length > 0 ? (
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center text-gray-400">
                  <VideoOff className="h-12 w-12 mx-auto mb-2" />
                  <p className="text-sm">No video preview</p>
                </div>
              </div>
            )}
            
            {selectedVideoDevice && (
              <div className="absolute top-2 right-2">
                <Badge className="bg-green-500/80 text-white">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Active
                </Badge>
              </div>
            )}
          </div>
        </div>

        {/* Audio Input Device Selection */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Mic className="h-4 w-4" />
            Microphone
          </Label>
          
          <Select
            value={selectedAudioDevice}
            onValueChange={(value) => handleDeviceChange(value, 'audioinput')}
            disabled={isLoading || audioDevices.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select microphone" />
            </SelectTrigger>
            <SelectContent>
              {audioDevices.map((device) => (
                <SelectItem key={device.deviceId} value={device.deviceId}>
                  {getDeviceLabel(device)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Audio Level Indicator */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Input Level</span>
              <Badge variant={audioLevel > 30 ? "default" : "secondary"}>
                {audioLevel > 30 ? 'Speaking' : 'Silent'}
              </Badge>
            </div>
            <Progress value={Math.min(audioLevel * 2, 100)} className="h-2" />
          </div>
        </div>

        {/* Audio Output Device Selection */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Speaker className="h-4 w-4" />
            Speakers
          </Label>
          
          <Select
            value={selectedOutputDevice}
            onValueChange={(value) => handleDeviceChange(value, 'audiooutput')}
            disabled={isLoading || outputDevices.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select speakers" />
            </SelectTrigger>
            <SelectContent>
              {outputDevices.map((device) => (
                <SelectItem key={device.deviceId} value={device.deviceId}>
                  {getDeviceLabel(device)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Volume Control */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Output Volume</Label>
              <span className="text-sm text-muted-foreground">{volume[0]}%</span>
            </div>
            <div className="flex items-center gap-3">
              <VolumeX className="h-4 w-4 text-muted-foreground" />
              <Slider
                value={volume}
                onValueChange={setVolume}
                max={100}
                min={0}
                step={1}
                className="flex-1"
              />
              <Volume2 className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>

          {/* Test Audio Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={testAudioOutput}
            disabled={isTestingAudio || !selectedOutputDevice}
            className="w-full"
          >
            {isTestingAudio ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Volume2 className="h-4 w-4 mr-2" />
                </motion.div>
                Testing Audio...
              </>
            ) : (
              <>
                <Headphones className="h-4 w-4 mr-2" />
                Test Audio Output
              </>
            )}
          </Button>
        </div>

        {/* Device Status */}
        <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <h4 className="font-medium text-sm mb-2">Device Status</h4>
          <div className="space-y-1 text-sm">
            <div className="flex items-center justify-between">
              <span>Camera:</span>
              <Badge variant={selectedVideoDevice ? "default" : "secondary"}>
                {selectedVideoDevice ? 'Connected' : 'Not selected'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Microphone:</span>
              <Badge variant={selectedAudioDevice ? "default" : "secondary"}>
                {selectedAudioDevice ? 'Connected' : 'Not selected'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Speakers:</span>
              <Badge variant={selectedOutputDevice ? "default" : "secondary"}>
                {selectedOutputDevice ? 'Connected' : 'Not selected'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Troubleshooting */}
        {(videoDevices.length === 0 || audioDevices.length === 0) && (
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-yellow-800 dark:text-yellow-200">
                  Some devices not found
                </p>
                <p className="text-yellow-700 dark:text-yellow-300 mt-1">
                  Make sure your camera and microphone are connected and permissions are granted.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}