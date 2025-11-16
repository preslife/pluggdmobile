import { useState, useEffect, useCallback, useRef } from 'react';
import { WebRTCManager, WhiteboardData, ChatMessage, PeerConnection, checkWebRTCSupport } from './webrtc';
import { toast } from 'sonner@2.0.3';

export interface Participant {
  id: string;
  name: string;
  stream?: MediaStream;
  isHost: boolean;
  isConnected: boolean;
  hasVideo: boolean;
  hasAudio: boolean;
  isScreenSharing: boolean;
  connectionState: RTCPeerConnectionState;
  iceConnectionState: RTCIceConnectionState;
}

export interface WebRTCState {
  isInitialized: boolean;
  isConnecting: boolean;
  localStream?: MediaStream;
  screenStream?: MediaStream;
  participants: Map<string, Participant>;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  isScreenSharing: boolean;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
  error?: string;
  webRTCSupported: boolean;
}

export interface UseWebRTCOptions {
  roomId: string;
  userId: string;
  userName: string;
  isHost?: boolean;
  autoJoin?: boolean;
  constraints?: MediaStreamConstraints;
}

export interface WebRTCActions {
  initialize: () => Promise<void>;
  disconnect: () => void;
  toggleVideo: () => boolean;
  toggleAudio: () => boolean;
  startScreenShare: () => Promise<void>;
  stopScreenShare: () => void;
  sendWhiteboardData: (data: WhiteboardData) => void;
  sendChatMessage: (message: string) => void;
  changeMediaDevice: (deviceId: string, kind: 'videoinput' | 'audioinput') => Promise<void>;
  getParticipantStream: (participantId: string) => MediaStream | undefined;
  kickParticipant: (participantId: string) => void;
  muteParticipant: (participantId: string) => void;
}

export function useWebRTC(options: UseWebRTCOptions) {
  const {
    roomId,
    userId,
    userName,
    isHost = false,
    autoJoin = false,
    constraints
  } = options;

  const managerRef = useRef<WebRTCManager | null>(null);
  const [state, setState] = useState<WebRTCState>({
    isInitialized: false,
    isConnecting: false,
    participants: new Map(),
    isVideoEnabled: false,
    isAudioEnabled: false,
    isScreenSharing: false,
    connectionQuality: 'excellent',
    webRTCSupported: checkWebRTCSupport()
  });

  // Event handlers
  const handlePeerConnected = useCallback((event: any) => {
    const { peerId, stream } = event.detail;
    setState(prev => {
      const newParticipants = new Map(prev.participants);
      const existing = newParticipants.get(peerId);
      newParticipants.set(peerId, {
        ...existing,
        id: peerId,
        name: existing?.name || `User ${peerId.slice(0, 8)}`,
        stream,
        isConnected: true,
        hasVideo: stream?.getVideoTracks().some(track => track.enabled) || false,
        hasAudio: stream?.getAudioTracks().some(track => track.enabled) || false,
        isScreenSharing: false,
        isHost: false,
        connectionState: 'connected',
        iceConnectionState: 'connected'
      });
      return { ...prev, participants: newParticipants };
    });

    toast.success('Participant connected', {
      description: `New participant joined the session`
    });
  }, []);

  const handlePeerDisconnected = useCallback((event: any) => {
    const { peerId } = event.detail;
    setState(prev => {
      const newParticipants = new Map(prev.participants);
      newParticipants.delete(peerId);
      return { ...prev, participants: newParticipants };
    });

    toast.info('Participant left', {
      description: 'A participant has left the session'
    });
  }, []);

  const handleStreamAdded = useCallback((event: any) => {
    const { peerId, stream } = event.detail;
    setState(prev => {
      const newParticipants = new Map(prev.participants);
      const existing = newParticipants.get(peerId);
      if (existing) {
        newParticipants.set(peerId, {
          ...existing,
          stream,
          hasVideo: stream.getVideoTracks().some(track => track.enabled),
          hasAudio: stream.getAudioTracks().some(track => track.enabled)
        });
      }
      return { ...prev, participants: newParticipants };
    });
  }, []);

  const handleStreamRemoved = useCallback((event: any) => {
    const { peerId } = event.detail;
    setState(prev => {
      const newParticipants = new Map(prev.participants);
      const existing = newParticipants.get(peerId);
      if (existing) {
        newParticipants.set(peerId, {
          ...existing,
          stream: undefined,
          hasVideo: false,
          hasAudio: false
        });
      }
      return { ...prev, participants: newParticipants };
    });
  }, []);

  const handleConnectionStateChanged = useCallback((event: any) => {
    const { peerId, state: connectionState } = event.detail;
    setState(prev => {
      const newParticipants = new Map(prev.participants);
      const existing = newParticipants.get(peerId);
      if (existing) {
        newParticipants.set(peerId, {
          ...existing,
          connectionState,
          isConnected: connectionState === 'connected'
        });
      }
      return { ...prev, participants: newParticipants };
    });
  }, []);

  const handleWhiteboardData = useCallback((event: any) => {
    // This will be handled by the whiteboard component
    window.dispatchEvent(new CustomEvent('whiteboard-data', { detail: event.detail }));
  }, []);

  const handleChatMessage = useCallback((event: any) => {
    // This will be handled by the chat component
    window.dispatchEvent(new CustomEvent('webrtc-chat-message', { detail: event.detail }));
  }, []);

  // Initialize WebRTC
  const initialize = useCallback(async () => {
    if (!state.webRTCSupported) {
      toast.error('WebRTC not supported', {
        description: 'Your browser does not support video conferencing features'
      });
      return;
    }

    if (managerRef.current || state.isInitialized) {
      return;
    }

    setState(prev => ({ ...prev, isConnecting: true, error: undefined }));

    try {
      const manager = new WebRTCManager(roomId, userId, isHost);
      managerRef.current = manager;

      // Set up event listeners
      manager.addEventListener('peer-connected', handlePeerConnected);
      manager.addEventListener('peer-disconnected', handlePeerDisconnected);
      manager.addEventListener('stream-added', handleStreamAdded);
      manager.addEventListener('stream-removed', handleStreamRemoved);
      manager.addEventListener('connection-state-changed', handleConnectionStateChanged);
      manager.addEventListener('whiteboard-data', handleWhiteboardData);
      manager.addEventListener('chat-message', handleChatMessage);

      // Initialize the manager
      await manager.initialize();

      const localStream = manager.getLocalStream();
      
      setState(prev => ({
        ...prev,
        isInitialized: true,
        isConnecting: false,
        localStream,
        isVideoEnabled: localStream?.getVideoTracks().some(track => track.enabled) || false,
        isAudioEnabled: localStream?.getAudioTracks().some(track => track.enabled) || false
      }));

      toast.success('Connected to virtual classroom', {
        description: 'Video conferencing is now active'
      });

    } catch (error) {
      console.error('Failed to initialize WebRTC:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize video conferencing';
      
      setState(prev => ({
        ...prev,
        isConnecting: false,
        error: errorMessage
      }));

      toast.error('Connection failed', {
        description: errorMessage
      });
    }
  }, [roomId, userId, isHost, state.webRTCSupported, state.isInitialized, handlePeerConnected, handlePeerDisconnected, handleStreamAdded, handleStreamRemoved, handleConnectionStateChanged, handleWhiteboardData, handleChatMessage]);

  // Disconnect
  const disconnect = useCallback(() => {
    if (managerRef.current) {
      managerRef.current.disconnect();
      managerRef.current = null;
    }

    setState(prev => ({
      ...prev,
      isInitialized: false,
      isConnecting: false,
      localStream: undefined,
      screenStream: undefined,
      participants: new Map(),
      isVideoEnabled: false,
      isAudioEnabled: false,
      isScreenSharing: false,
      error: undefined
    }));

    toast.info('Disconnected from virtual classroom');
  }, []);

  // Toggle video
  const toggleVideo = useCallback((): boolean => {
    if (!managerRef.current) return false;

    const enabled = managerRef.current.toggleVideo();
    setState(prev => ({ ...prev, isVideoEnabled: enabled }));
    
    toast.info(enabled ? 'Camera turned on' : 'Camera turned off');
    return enabled;
  }, []);

  // Toggle audio
  const toggleAudio = useCallback((): boolean => {
    if (!managerRef.current) return false;

    const enabled = managerRef.current.toggleAudio();
    setState(prev => ({ ...prev, isAudioEnabled: enabled }));
    
    toast.info(enabled ? 'Microphone turned on' : 'Microphone turned off');
    return enabled;
  }, []);

  // Start screen share
  const startScreenShare = useCallback(async () => {
    if (!managerRef.current) return;

    try {
      const screenStream = await managerRef.current.startScreenShare();
      setState(prev => ({
        ...prev,
        screenStream,
        isScreenSharing: true
      }));
    } catch (error) {
      console.error('Failed to start screen share:', error);
    }
  }, []);

  // Stop screen share
  const stopScreenShare = useCallback(() => {
    if (!managerRef.current) return;

    managerRef.current.stopScreenShare();
    setState(prev => ({
      ...prev,
      screenStream: undefined,
      isScreenSharing: false
    }));
  }, []);

  // Send whiteboard data
  const sendWhiteboardData = useCallback((data: WhiteboardData) => {
    if (!managerRef.current) return;
    managerRef.current.sendWhiteboardData(data);
  }, []);

  // Send chat message
  const sendChatMessage = useCallback((message: string) => {
    if (!managerRef.current) return;

    const chatMessage: ChatMessage = {
      id: Date.now().toString(),
      message,
      timestamp: Date.now(),
      userId,
      userName,
      type: 'text'
    };

    managerRef.current.sendChatMessage(chatMessage);
  }, [userId, userName]);

  // Change media device
  const changeMediaDevice = useCallback(async (deviceId: string, kind: 'videoinput' | 'audioinput') => {
    if (!managerRef.current) return;

    try {
      const newConstraints = {
        video: kind === 'videoinput' ? { deviceId: { exact: deviceId } } : state.isVideoEnabled,
        audio: kind === 'audioinput' ? { deviceId: { exact: deviceId } } : state.isAudioEnabled
      };

      const newStream = await managerRef.current.getLocalStream(newConstraints);
      setState(prev => ({ ...prev, localStream: newStream }));

      toast.success(`${kind === 'videoinput' ? 'Camera' : 'Microphone'} changed`);
    } catch (error) {
      console.error('Failed to change media device:', error);
      toast.error('Failed to change device');
    }
  }, [state.isVideoEnabled, state.isAudioEnabled]);

  // Get participant stream
  const getParticipantStream = useCallback((participantId: string): MediaStream | undefined => {
    if (!managerRef.current) return undefined;
    return managerRef.current.getPeerStream(participantId);
  }, []);

  // Kick participant (host only)
  const kickParticipant = useCallback((participantId: string) => {
    if (!isHost || !managerRef.current) return;
    
    // In a real implementation, this would send a kick signal
    toast.info(`Participant ${participantId} has been removed from the session`);
  }, [isHost]);

  // Mute participant (host only)
  const muteParticipant = useCallback((participantId: string) => {
    if (!isHost || !managerRef.current) return;
    
    // In a real implementation, this would send a mute signal
    toast.info(`Participant ${participantId} has been muted`);
  }, [isHost]);

  // Monitor connection quality
  useEffect(() => {
    if (!managerRef.current || !state.isInitialized) return;

    const interval = setInterval(() => {
      // Simulate connection quality monitoring
      // In a real implementation, this would analyze actual network stats
      const peers = managerRef.current?.getPeers();
      if (peers && peers.size > 0) {
        let connectedPeers = 0;
        let totalPeers = peers.size;

        peers.forEach(peer => {
          if (peer.connectionState === 'connected') {
            connectedPeers++;
          }
        });

        const ratio = connectedPeers / totalPeers;
        let quality: 'excellent' | 'good' | 'fair' | 'poor';

        if (ratio >= 0.9) quality = 'excellent';
        else if (ratio >= 0.7) quality = 'good';
        else if (ratio >= 0.5) quality = 'fair';
        else quality = 'poor';

        setState(prev => {
          if (prev.connectionQuality !== quality) {
            return { ...prev, connectionQuality: quality };
          }
          return prev;
        });
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [state.isInitialized]);

  // Auto-join on mount if enabled
  useEffect(() => {
    if (autoJoin && !state.isInitialized && !state.isConnecting) {
      initialize();
    }
  }, [autoJoin, state.isInitialized, state.isConnecting, initialize]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (managerRef.current) {
        managerRef.current.disconnect();
      }
    };
  }, []);

  const actions: WebRTCActions = {
    initialize,
    disconnect,
    toggleVideo,
    toggleAudio,
    startScreenShare,
    stopScreenShare,
    sendWhiteboardData,
    sendChatMessage,
    changeMediaDevice,
    getParticipantStream,
    kickParticipant,
    muteParticipant
  };

  return [state, actions] as const;
}