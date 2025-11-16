import { toast } from 'sonner@2.0.3';

// WebRTC Configuration
const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
  iceCandidatePoolSize: 10,
};

// Media Constraints
export const DEFAULT_CONSTRAINTS: MediaStreamConstraints = {
  video: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30, max: 60 },
    facingMode: 'user',
  },
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 48000,
  },
};

export const SCREEN_SHARE_CONSTRAINTS: DisplayMediaStreamConstraints = {
  video: {
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    frameRate: { ideal: 30 },
  },
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
  },
};

// Event Types
export interface WebRTCEvents {
  'peer-connected': { peerId: string; stream: MediaStream };
  'peer-disconnected': { peerId: string };
  'stream-added': { peerId: string; stream: MediaStream };
  'stream-removed': { peerId: string };
  'data-received': { peerId: string; data: any };
  'connection-state-changed': { peerId: string; state: RTCPeerConnectionState };
  'ice-connection-state-changed': { peerId: string; state: RTCIceConnectionState };
  'screen-share-started': { peerId: string; stream: MediaStream };
  'screen-share-stopped': { peerId: string };
  'whiteboard-data': { peerId: string; data: WhiteboardData };
  'chat-message': { peerId: string; message: ChatMessage };
}

export interface WhiteboardData {
  type: 'draw' | 'erase' | 'clear' | 'cursor';
  x?: number;
  y?: number;
  prevX?: number;
  prevY?: number;
  color?: string;
  size?: number;
  tool?: string;
  timestamp: number;
  userId: string;
}

export interface ChatMessage {
  id: string;
  message: string;
  timestamp: number;
  userId: string;
  userName: string;
  type: 'text' | 'system';
}

export interface PeerConnection {
  id: string;
  connection: RTCPeerConnection;
  dataChannel?: RTCDataChannel;
  stream?: MediaStream;
  isHost: boolean;
  isConnected: boolean;
  connectionState: RTCPeerConnectionState;
  iceConnectionState: RTCIceConnectionState;
}

// Simulated Signaling Server (In production, this would be a WebSocket server)
class SignalingServer {
  private static instance: SignalingServer;
  private rooms: Map<string, Set<string>> = new Map();
  private connections: Map<string, WebRTCManager> = new Map();

  static getInstance(): SignalingServer {
    if (!SignalingServer.instance) {
      SignalingServer.instance = new SignalingServer();
    }
    return SignalingServer.instance;
  }

  joinRoom(roomId: string, userId: string, manager: WebRTCManager) {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Set());
    }
    
    this.rooms.get(roomId)!.add(userId);
    this.connections.set(userId, manager);

    // Notify existing users
    const existingUsers = Array.from(this.rooms.get(roomId)!).filter(id => id !== userId);
    existingUsers.forEach(existingUserId => {
      const existingManager = this.connections.get(existingUserId);
      if (existingManager) {
        existingManager.handleUserJoined(userId);
      }
      manager.handleUserJoined(existingUserId);
    });

    return existingUsers;
  }

  leaveRoom(roomId: string, userId: string) {
    const room = this.rooms.get(roomId);
    if (room) {
      room.delete(userId);
      
      // Notify remaining users
      Array.from(room).forEach(remainingUserId => {
        const remainingManager = this.connections.get(remainingUserId);
        if (remainingManager) {
          remainingManager.handleUserLeft(userId);
        }
      });

      if (room.size === 0) {
        this.rooms.delete(roomId);
      }
    }
    this.connections.delete(userId);
  }

  sendSignal(fromUserId: string, toUserId: string, signal: any) {
    const targetManager = this.connections.get(toUserId);
    if (targetManager) {
      targetManager.handleSignal(fromUserId, signal);
    }
  }

  broadcastToRoom(roomId: string, fromUserId: string, data: any) {
    const room = this.rooms.get(roomId);
    if (room) {
      Array.from(room)
        .filter(userId => userId !== fromUserId)
        .forEach(userId => {
          const manager = this.connections.get(userId);
          if (manager) {
            manager.handleBroadcast(fromUserId, data);
          }
        });
    }
  }
}

export class WebRTCManager extends EventTarget {
  private localStream?: MediaStream;
  private screenStream?: MediaStream;
  private peers: Map<string, PeerConnection> = new Map();
  private roomId: string;
  private userId: string;
  private isHost: boolean;
  private signaling: SignalingServer;
  private devicePermissions: { video: boolean; audio: boolean } = { video: false, audio: false };

  constructor(roomId: string, userId: string, isHost: boolean = false) {
    super();
    this.roomId = roomId;
    this.userId = userId;
    this.isHost = isHost;
    this.signaling = SignalingServer.getInstance();
  }

  // Initialize WebRTC and join room
  async initialize(): Promise<void> {
    try {
      // Check device permissions first
      await this.checkDevicePermissions();
      
      // Get local media stream
      await this.getLocalStream();
      
      // Join signaling room
      this.signaling.joinRoom(this.roomId, this.userId, this);
      
      console.log('WebRTC initialized successfully');
    } catch (error) {
      console.error('Failed to initialize WebRTC:', error);
      throw error;
    }
  }

  // Check and request device permissions
  private async checkDevicePermissions(): Promise<void> {
    try {
      // Check if browser supports mediaDevices
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('WebRTC not supported in this browser');
      }

      // Check permissions if available
      if (navigator.permissions) {
        try {
          const cameraPermission = await navigator.permissions.query({ name: 'camera' as PermissionName });
          const micPermission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          
          this.devicePermissions.video = cameraPermission.state === 'granted';
          this.devicePermissions.audio = micPermission.state === 'granted';
        } catch (error) {
          // Permissions API not supported, will check during getUserMedia
          console.log('Permissions API not supported');
        }
      }
    } catch (error) {
      console.error('Error checking device permissions:', error);
    }
  }

  // Get local media stream
  async getLocalStream(constraints: MediaStreamConstraints = DEFAULT_CONSTRAINTS): Promise<MediaStream> {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      this.devicePermissions.video = !!this.localStream.getVideoTracks().length;
      this.devicePermissions.audio = !!this.localStream.getAudioTracks().length;
      
      // Update all peer connections with new stream
      this.peers.forEach(peer => {
        if (peer.connection.connectionState === 'connected') {
          this.replaceTrack(peer.id, this.localStream!);
        }
      });

      return this.localStream;
    } catch (error) {
      console.error('Failed to get local stream:', error);
      toast.error('Camera/Microphone access denied', {
        description: 'Please allow camera and microphone access to join the call'
      });
      throw error;
    }
  }

  // Start screen sharing
  async startScreenShare(): Promise<MediaStream> {
    try {
      if (!navigator.mediaDevices.getDisplayMedia) {
        throw new Error('Screen sharing not supported');
      }

      this.screenStream = await navigator.mediaDevices.getDisplayMedia(SCREEN_SHARE_CONSTRAINTS);
      
      // Handle screen share end
      this.screenStream.getVideoTracks()[0].addEventListener('ended', () => {
        this.stopScreenShare();
      });

      // Replace video track in all peer connections
      this.peers.forEach(peer => {
        if (peer.connection.connectionState === 'connected') {
          this.replaceVideoTrack(peer.id, this.screenStream!.getVideoTracks()[0]);
        }
      });

      // Notify peers about screen share
      this.broadcastData({ type: 'screen-share-started', userId: this.userId });

      toast.success('Screen sharing started');
      return this.screenStream;
    } catch (error) {
      console.error('Failed to start screen share:', error);
      toast.error('Screen sharing failed', {
        description: 'Unable to start screen sharing. Please try again.'
      });
      throw error;
    }
  }

  // Stop screen sharing
  stopScreenShare(): void {
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(track => track.stop());
      this.screenStream = undefined;

      // Replace with camera stream
      if (this.localStream) {
        this.peers.forEach(peer => {
          if (peer.connection.connectionState === 'connected') {
            const videoTrack = this.localStream!.getVideoTracks()[0];
            if (videoTrack) {
              this.replaceVideoTrack(peer.id, videoTrack);
            }
          }
        });
      }

      // Notify peers
      this.broadcastData({ type: 'screen-share-stopped', userId: this.userId });
      toast.info('Screen sharing stopped');
    }
  }

  // Replace video track in peer connection
  private async replaceVideoTrack(peerId: string, newTrack: MediaStreamTrack): Promise<void> {
    const peer = this.peers.get(peerId);
    if (peer) {
      const sender = peer.connection.getSenders().find(s => 
        s.track && s.track.kind === 'video'
      );
      if (sender) {
        await sender.replaceTrack(newTrack);
      }
    }
  }

  // Replace all tracks in peer connection
  private async replaceTrack(peerId: string, newStream: MediaStream): Promise<void> {
    const peer = this.peers.get(peerId);
    if (peer) {
      const senders = peer.connection.getSenders();
      const newTracks = newStream.getTracks();

      for (const sender of senders) {
        const track = newTracks.find(t => t.kind === sender.track?.kind);
        if (track && sender.track) {
          await sender.replaceTrack(track);
        }
      }
    }
  }

  // Toggle local video
  toggleVideo(): boolean {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        return videoTrack.enabled;
      }
    }
    return false;
  }

  // Toggle local audio
  toggleAudio(): boolean {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        return audioTrack.enabled;
      }
    }
    return false;
  }

  // Create peer connection
  private createPeerConnection(peerId: string): RTCPeerConnection {
    const pc = new RTCPeerConnection(RTC_CONFIG);

    // Add local stream tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream!);
      });
    }

    // Handle remote stream
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      const peer = this.peers.get(peerId);
      if (peer) {
        peer.stream = remoteStream;
        this.dispatchEvent(new CustomEvent('stream-added', {
          detail: { peerId, stream: remoteStream }
        }));
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.signaling.sendSignal(this.userId, peerId, {
          type: 'ice-candidate',
          candidate: event.candidate
        });
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      const peer = this.peers.get(peerId);
      if (peer) {
        peer.connectionState = pc.connectionState;
        this.dispatchEvent(new CustomEvent('connection-state-changed', {
          detail: { peerId, state: pc.connectionState }
        }));

        if (pc.connectionState === 'connected') {
          peer.isConnected = true;
          this.dispatchEvent(new CustomEvent('peer-connected', {
            detail: { peerId, stream: peer.stream }
          }));
        } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          this.removePeer(peerId);
        }
      }
    };

    // Handle ICE connection state changes
    pc.oniceconnectionstatechange = () => {
      const peer = this.peers.get(peerId);
      if (peer) {
        peer.iceConnectionState = pc.iceConnectionState;
        this.dispatchEvent(new CustomEvent('ice-connection-state-changed', {
          detail: { peerId, state: pc.iceConnectionState }
        }));
      }
    };

    // Create data channel for chat and whiteboard
    const dataChannel = pc.createDataChannel('data', {
      ordered: true
    });

    dataChannel.onopen = () => {
      console.log('Data channel opened for peer:', peerId);
    };

    dataChannel.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleDataChannelMessage(peerId, data);
    };

    // Handle incoming data channels
    pc.ondatachannel = (event) => {
      const channel = event.channel;
      channel.onmessage = (event) => {
        const data = JSON.parse(event.data);
        this.handleDataChannelMessage(peerId, data);
      };
    };

    return pc;
  }

  // Handle data channel messages
  private handleDataChannelMessage(peerId: string, data: any): void {
    switch (data.type) {
      case 'whiteboard':
        this.dispatchEvent(new CustomEvent('whiteboard-data', {
          detail: { peerId, data: data.payload }
        }));
        break;
      case 'chat':
        this.dispatchEvent(new CustomEvent('chat-message', {
          detail: { peerId, message: data.payload }
        }));
        break;
      default:
        this.dispatchEvent(new CustomEvent('data-received', {
          detail: { peerId, data }
        }));
    }
  }

  // Send data to specific peer
  sendDataToPeer(peerId: string, data: any): void {
    const peer = this.peers.get(peerId);
    if (peer && peer.dataChannel && peer.dataChannel.readyState === 'open') {
      peer.dataChannel.send(JSON.stringify(data));
    }
  }

  // Broadcast data to all peers
  broadcastData(data: any): void {
    this.peers.forEach((peer, peerId) => {
      this.sendDataToPeer(peerId, data);
    });
  }

  // Send whiteboard data
  sendWhiteboardData(data: WhiteboardData): void {
    this.broadcastData({
      type: 'whiteboard',
      payload: data
    });
  }

  // Send chat message
  sendChatMessage(message: ChatMessage): void {
    this.broadcastData({
      type: 'chat',
      payload: message
    });
  }

  // Handle user joined
  async handleUserJoined(peerId: string): Promise<void> {
    if (this.peers.has(peerId)) return;

    const pc = this.createPeerConnection(peerId);
    const peer: PeerConnection = {
      id: peerId,
      connection: pc,
      dataChannel: pc.createDataChannel('data'),
      isHost: false,
      isConnected: false,
      connectionState: pc.connectionState,
      iceConnectionState: pc.iceConnectionState
    };

    this.peers.set(peerId, peer);

    // Create offer if we're the host or have a lower ID (to avoid duplicate offers)
    if (this.isHost || this.userId < peerId) {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        
        this.signaling.sendSignal(this.userId, peerId, {
          type: 'offer',
          offer: offer
        });
      } catch (error) {
        console.error('Failed to create offer for peer:', peerId, error);
      }
    }
  }

  // Handle user left
  handleUserLeft(peerId: string): void {
    this.removePeer(peerId);
  }

  // Remove peer
  private removePeer(peerId: string): void {
    const peer = this.peers.get(peerId);
    if (peer) {
      if (peer.stream) {
        this.dispatchEvent(new CustomEvent('stream-removed', {
          detail: { peerId }
        }));
      }
      
      peer.connection.close();
      this.peers.delete(peerId);
      
      this.dispatchEvent(new CustomEvent('peer-disconnected', {
        detail: { peerId }
      }));
    }
  }

  // Handle signaling messages
  async handleSignal(fromPeerId: string, signal: any): Promise<void> {
    let peer = this.peers.get(fromPeerId);
    
    if (!peer && (signal.type === 'offer' || signal.type === 'answer')) {
      // Create peer connection if it doesn't exist
      const pc = this.createPeerConnection(fromPeerId);
      peer = {
        id: fromPeerId,
        connection: pc,
        dataChannel: pc.createDataChannel('data'),
        isHost: false,
        isConnected: false,
        connectionState: pc.connectionState,
        iceConnectionState: pc.iceConnectionState
      };
      this.peers.set(fromPeerId, peer);
    }

    if (!peer) return;

    try {
      switch (signal.type) {
        case 'offer':
          await peer.connection.setRemoteDescription(signal.offer);
          const answer = await peer.connection.createAnswer();
          await peer.connection.setLocalDescription(answer);
          
          this.signaling.sendSignal(this.userId, fromPeerId, {
            type: 'answer',
            answer: answer
          });
          break;

        case 'answer':
          await peer.connection.setRemoteDescription(signal.answer);
          break;

        case 'ice-candidate':
          await peer.connection.addIceCandidate(signal.candidate);
          break;
      }
    } catch (error) {
      console.error('Error handling signal from peer:', fromPeerId, error);
    }
  }

  // Handle broadcast messages
  handleBroadcast(fromPeerId: string, data: any): void {
    this.dispatchEvent(new CustomEvent('data-received', {
      detail: { peerId: fromPeerId, data }
    }));
  }

  // Get local stream
  getLocalStream(): MediaStream | undefined {
    return this.localStream;
  }

  // Get screen stream
  getScreenStream(): MediaStream | undefined {
    return this.screenStream;
  }

  // Get peer stream
  getPeerStream(peerId: string): MediaStream | undefined {
    return this.peers.get(peerId)?.stream;
  }

  // Get all peers
  getPeers(): Map<string, PeerConnection> {
    return this.peers;
  }

  // Get device permissions
  getDevicePermissions(): { video: boolean; audio: boolean } {
    return this.devicePermissions;
  }

  // Check if sharing screen
  isSharingScreen(): boolean {
    return !!this.screenStream;
  }

  // Cleanup
  disconnect(): void {
    // Stop local streams
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
    }
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(track => track.stop());
    }

    // Close all peer connections
    this.peers.forEach(peer => {
      peer.connection.close();
    });
    this.peers.clear();

    // Leave signaling room
    this.signaling.leaveRoom(this.roomId, this.userId);
  }
}

// Utility functions
export const getMediaDevices = async (): Promise<MediaDeviceInfo[]> => {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices;
  } catch (error) {
    console.error('Failed to get media devices:', error);
    return [];
  }
};

export const checkWebRTCSupport = (): boolean => {
  return !!(
    navigator.mediaDevices &&
    navigator.mediaDevices.getUserMedia &&
    window.RTCPeerConnection &&
    window.RTCSessionDescription &&
    window.RTCIceCandidate
  );
};

export const getDeviceLabel = (device: MediaDeviceInfo): string => {
  return device.label || `${device.kind} ${device.deviceId.slice(0, 8)}`;
};