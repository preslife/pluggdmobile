import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Progress } from './ui/progress';
import { Slider } from './ui/slider';
import { Label } from './ui/label';
import { useWebRTC, Participant } from './utils/useWebRTC';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Monitor,
  MonitorOff,
  Volume2,
  VolumeX,
  Settings,
  Users,
  Hand,
  MoreVertical,
  PhoneOff,
  Maximize2,
  Minimize2,
  RotateCcw,
  Camera,
  Square,
  Circle,
  Pause,
  Play,
  SkipForward,
  SkipBack,
  Repeat,
  Shuffle,
  Headphones,
  Speaker
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner@2.0.3';

interface VideoConferenceProps {
  roomId: string;
  userId: string;
  userName: string;
  isHost?: boolean;
  onParticipantUpdate?: (participants: Participant[]) => void;
  onScreenShareChange?: (isSharing: boolean) => void;
  className?: string;
}

interface VideoElementProps {
  stream?: MediaStream;
  participant: Participant;
  isLocal?: boolean;
  isSpeaking?: boolean;
  isScreenShare?: boolean;
  onVolumeChange?: (volume: number) => void;
  onToggleMute?: () => void;
}

function VideoElement({
  stream,
  participant,
  isLocal = false,
  isSpeaking = false,
  isScreenShare = false,
  onVolumeChange,
  onToggleMute
}: VideoElementProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [volume, setVolume] = useState([100]);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (video && stream) {
      video.srcObject = stream;
      video.muted = isLocal; // Always mute local video to prevent echo
      
      if (!isLocal) {
        video.volume = volume[0] / 100;
      }
    }
  }, [stream, isLocal, volume]);

  const handleVolumeChange = (newVolume: number[]) => {
    setVolume(newVolume);
    if (videoRef.current && !isLocal) {
      videoRef.current.volume = newVolume[0] / 100;
    }
    onVolumeChange?.(newVolume[0]);
  };

  const handleMuteToggle = () => {
    setIsMuted(!isMuted);
    if (videoRef.current && !isLocal) {
      videoRef.current.muted = !isMuted;
    }
    onToggleMute?.();
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`relative bg-gray-900 rounded-lg overflow-hidden group ${
        isSpeaking ? 'ring-2 ring-green-400 ring-opacity-75' : ''
      } ${isScreenShare ? 'aspect-video' : 'aspect-square'}`}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      {/* Video Element */}
      {participant.hasVideo && stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
          onLoadedMetadata={() => {
            // Auto-play when metadata is loaded
            videoRef.current?.play().catch(console.error);
          }}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-700">
          <Avatar className="w-16 h-16">
            <AvatarFallback className="bg-gray-600 text-white text-xl">
              {participant.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
        </div>
      )}

      {/* Overlay Controls */}
      <AnimatePresence>
        {showControls && !isLocal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/20 flex items-center justify-center"
          >
            <div className="bg-black/60 rounded-lg p-2 flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMuteToggle}
                className="text-white hover:bg-white/20"
              >
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>
              
              <div className="w-16">
                <Slider
                  value={volume}
                  onValueChange={handleVolumeChange}
                  max={100}
                  min={0}
                  step={1}
                  className="w-full"
                />
              </div>
              
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Participant Info */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-white font-medium text-sm truncate">
              {isLocal ? 'You' : participant.name}
            </span>
            {isScreenShare && (
              <Badge className="text-xs bg-blue-500 text-white">
                <Monitor className="h-3 w-3 mr-1" />
                Screen
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            {participant.isHost && (
              <Badge className="text-xs bg-orange-500 text-white">Host</Badge>
            )}
            {!participant.hasAudio && (
              <MicOff className="h-4 w-4 text-red-400" />
            )}
            {!participant.hasVideo && (
              <VideoOff className="h-4 w-4 text-red-400" />
            )}
            {isSpeaking && (
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            )}
          </div>
        </div>
      </div>

      {/* Connection Status */}
      <div className="absolute top-2 right-2">
        {participant.connectionState === 'connecting' && (
          <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
        )}
        {participant.connectionState === 'connected' && (
          <div className="w-2 h-2 bg-green-400 rounded-full" />
        )}
        {participant.connectionState === 'disconnected' && (
          <div className="w-2 h-2 bg-red-400 rounded-full" />
        )}
      </div>
    </motion.div>
  );
}

export function VideoConference({
  roomId,
  userId,
  userName,
  isHost = false,
  onParticipantUpdate,
  onScreenShareChange,
  className = ''
}: VideoConferenceProps) {
  const [webRTCState, webRTCActions] = useWebRTC({
    roomId,
    userId,
    userName,
    isHost,
    autoJoin: false
  });

  const [layout, setLayout] = useState<'grid' | 'speaker' | 'sidebar'>('grid');
  const [mainSpeaker, setMainSpeaker] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [speakingParticipants, setSpeakingParticipants] = useState<Set<string>>(new Set());

  // Audio level monitoring
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);

  // Initialize audio level monitoring
  useEffect(() => {
    if (webRTCState.localStream && webRTCState.isAudioEnabled) {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(webRTCState.localStream);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      analyser.smoothingTimeConstant = 0.8;
      analyser.fftSize = 1024;

      microphone.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      dataArrayRef.current = dataArray;

      const updateAudioLevel = () => {
        if (analyser && dataArray) {
          analyser.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          setAudioLevel(average);

          // Detect if user is speaking
          if (average > 30) {
            setSpeakingParticipants(prev => new Set(prev).add(userId));
            setTimeout(() => {
              setSpeakingParticipants(prev => {
                const newSet = new Set(prev);
                newSet.delete(userId);
                return newSet;
              });
            }, 1000);
          }

          requestAnimationFrame(updateAudioLevel);
        }
      };

      updateAudioLevel();
    }

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [webRTCState.localStream, webRTCState.isAudioEnabled, userId]);

  // Handle participant updates
  useEffect(() => {
    const participants = Array.from(webRTCState.participants.values());
    onParticipantUpdate?.(participants);
  }, [webRTCState.participants, onParticipantUpdate]);

  // Handle screen share changes
  useEffect(() => {
    onScreenShareChange?.(webRTCState.isScreenSharing);
  }, [webRTCState.isScreenSharing, onScreenShareChange]);

  // Join call
  const joinCall = useCallback(async () => {
    try {
      await webRTCActions.initialize();
    } catch (error) {
      console.error('Failed to join call:', error);
    }
  }, [webRTCActions]);

  // Leave call
  const leaveCall = useCallback(() => {
    webRTCActions.disconnect();
    toast.info('Left the video conference');
  }, [webRTCActions]);

  // Toggle screen share
  const toggleScreenShare = useCallback(async () => {
    if (webRTCState.isScreenSharing) {
      webRTCActions.stopScreenShare();
    } else {
      try {
        await webRTCActions.startScreenShare();
      } catch (error) {
        toast.error('Screen share failed', {
          description: 'Unable to start screen sharing. Please check permissions.'
        });
      }
    }
  }, [webRTCState.isScreenSharing, webRTCActions]);

  // Get layout classes
  const getLayoutClasses = () => {
    const participantCount = webRTCState.participants.size + 1; // +1 for local user
    
    switch (layout) {
      case 'grid':
        if (participantCount <= 4) return 'grid-cols-2 gap-4';
        if (participantCount <= 9) return 'grid-cols-3 gap-3';
        return 'grid-cols-4 gap-2';
      case 'speaker':
        return 'grid-cols-1';
      case 'sidebar':
        return 'flex gap-4';
      default:
        return 'grid-cols-2 gap-4';
    }
  };

  // Create local participant
  const localParticipant: Participant = {
    id: userId,
    name: userName,
    stream: webRTCState.localStream,
    isHost,
    isConnected: webRTCState.isInitialized,
    hasVideo: webRTCState.isVideoEnabled,
    hasAudio: webRTCState.isAudioEnabled,
    isScreenSharing: webRTCState.isScreenSharing,
    connectionState: 'connected',
    iceConnectionState: 'connected'
  };

  const allParticipants = [localParticipant, ...Array.from(webRTCState.participants.values())];

  if (!webRTCState.webRTCSupported) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <VideoOff className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold mb-2">WebRTC Not Supported</h3>
            <p className="text-gray-600 mb-4">
              Your browser doesn't support video conferencing features. Please use a modern browser like Chrome, Firefox, Safari, or Edge.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!webRTCState.isInitialized) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <Video className="h-16 w-16 mx-auto mb-4 text-blue-500" />
            <h3 className="text-lg font-semibold mb-2">Join Video Conference</h3>
            <p className="text-gray-600 mb-4">
              Connect with other participants in this virtual classroom session.
            </p>
            
            {webRTCState.error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm">{webRTCState.error}</p>
              </div>
            )}
            
            <Button 
              onClick={joinCall} 
              disabled={webRTCState.isConnecting}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-500"
            >
              {webRTCState.isConnecting ? (
                <>
                  <Circle className="h-4 w-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Video className="h-4 w-4 mr-2" />
                  Join Call
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex items-center gap-4">
          <h3 className="font-semibold">Video Conference</h3>
          <Badge variant="outline">
            {allParticipants.length} participants
          </Badge>
          
          {/* Connection Quality */}
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              webRTCState.connectionQuality === 'excellent' ? 'bg-green-500' :
              webRTCState.connectionQuality === 'good' ? 'bg-yellow-500' :
              webRTCState.connectionQuality === 'fair' ? 'bg-orange-500' :
              'bg-red-500'
            }`} />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {webRTCState.connectionQuality}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Layout Selector */}
          <div className="flex items-center gap-1 bg-white dark:bg-gray-800 rounded-lg p-1 border">
            <Button
              variant={layout === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setLayout('grid')}
            >
              Grid
            </Button>
            <Button
              variant={layout === 'speaker' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setLayout('speaker')}
            >
              Speaker
            </Button>
            <Button
              variant={layout === 'sidebar' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setLayout('sidebar')}
            >
              Sidebar
            </Button>
          </div>

          <Button variant="outline" size="sm" onClick={() => setShowSettings(!showSettings)}>
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Video Grid */}
      <div className="flex-1 p-4 overflow-hidden">
        {layout === 'sidebar' ? (
          <div className="flex h-full gap-4">
            {/* Main Speaker */}
            <div className="flex-1">
              {mainSpeaker ? (
                <VideoElement
                  stream={webRTCActions.getParticipantStream(mainSpeaker) || webRTCState.localStream}
                  participant={allParticipants.find(p => p.id === mainSpeaker) || localParticipant}
                  isLocal={mainSpeaker === userId}
                  isSpeaking={speakingParticipants.has(mainSpeaker || '')}
                  isScreenShare={allParticipants.find(p => p.id === mainSpeaker)?.isScreenSharing}
                />
              ) : (
                <div className="h-full bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                  <p className="text-gray-500">No active speaker</p>
                </div>
              )}
            </div>

            {/* Participant Sidebar */}
            <div className="w-64 space-y-2 overflow-y-auto">
              {allParticipants.map((participant) => (
                <div
                  key={participant.id}
                  className="cursor-pointer"
                  onClick={() => setMainSpeaker(participant.id)}
                >
                  <VideoElement
                    stream={participant.id === userId ? webRTCState.localStream : webRTCActions.getParticipantStream(participant.id)}
                    participant={participant}
                    isLocal={participant.id === userId}
                    isSpeaking={speakingParticipants.has(participant.id)}
                    isScreenShare={participant.isScreenSharing}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className={`grid ${getLayoutClasses()} h-full`}>
            {allParticipants.map((participant) => (
              <VideoElement
                key={participant.id}
                stream={participant.id === userId ? webRTCState.localStream : webRTCActions.getParticipantStream(participant.id)}
                participant={participant}
                isLocal={participant.id === userId}
                isSpeaking={speakingParticipants.has(participant.id)}
                isScreenShare={participant.isScreenSharing}
              />
            ))}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Button
            variant={webRTCState.isAudioEnabled ? "default" : "destructive"}
            size="sm"
            onClick={webRTCActions.toggleAudio}
          >
            {webRTCState.isAudioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
          </Button>

          <Button
            variant={webRTCState.isVideoEnabled ? "default" : "destructive"}
            size="sm"
            onClick={webRTCActions.toggleVideo}
          >
            {webRTCState.isVideoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
          </Button>

          <Button
            variant={webRTCState.isScreenSharing ? "secondary" : "outline"}
            size="sm"
            onClick={toggleScreenShare}
          >
            {webRTCState.isScreenSharing ? <MonitorOff className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
          </Button>

          {/* Audio Level Indicator */}
          {webRTCState.isAudioEnabled && (
            <div className="flex items-center gap-2 ml-4">
              <Mic className="h-4 w-4 text-gray-400" />
              <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 transition-all duration-100"
                  style={{ width: `${Math.min(audioLevel, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {allParticipants.length} participants
          </span>
          
          <Button variant="destructive" size="sm" onClick={leaveCall}>
            <PhoneOff className="h-4 w-4 mr-2" />
            Leave
          </Button>
        </div>
      </div>
    </div>
  );
}