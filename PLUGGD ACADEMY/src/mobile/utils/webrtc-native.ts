import {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  MediaStream,
  MediaStreamTrack,
  getUserMedia,
  getDisplayMedia,
  mediaDevices,
  RTCView,
} from 'react-native-webrtc';
import { PermissionsAndroid, Platform, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// WebRTC Configuration for React Native
const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
  iceCandidatePoolSize: 10,
};

// Media Constraints for Mobile
export const MOBILE_VIDEO_CONSTRAINTS = {
  video: {
    width: { ideal: 720 },
    height: { ideal: 1280 }, // Mobile portrait
    frameRate: { ideal: 30, max: 30 },
    facingMode: 'user',
  },
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 44100,
  },
};

export const MOBILE_SCREEN_SHARE_CONSTRAINTS = {
  video: {
    width: { ideal: 1080 },
    height: { ideal: 1920 },
    frameRate: { ideal: 15, max: 30 }, // Lower framerate for mobile
  },
};

// Event Types (same as web but adapted for mobile)
export interface MobileWebRTCEvents {
  'peer-connected': { peerId: string; stream: MediaStream };
  'peer-disconnected': { peerId: string };
  'stream-added': { peerId: string; stream: MediaStream };
  'stream-removed': { peerId: string };
  'data-received': { peerId: string; data: any };
  'connection-state-changed': { peerId: string; state: string };
  'ice-connection-state-changed': { peerId: string; state: string };
  'screen-share-started': { peerId: string; stream: MediaStream };
  'screen-share-stopped': { peerId: string };
  'whiteboard-data': { peerId: string; data: WhiteboardData };
  'chat-message': { peerId: string; message: ChatMessage };
  'permission-denied': { type: 'camera' | 'microphone'; reason: string };
  'app-background': { timestamp: number };
  'app-foreground': { timestamp: number };
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

export interface MobilePeerConnection {
  id: string;
  connection: RTCPeerConnection;
  dataChannel?: any; // react-native-webrtc data channel
  stream?: MediaStream;
  isHost: boolean;
  isConnected: boolean;
  connectionState: string;
  iceConnectionState: string;
}

// Mobile-specific permission handler
class MobilePermissionManager {
  private static instance: MobilePermissionManager;
  private permissionCache: Map<string, boolean> = new Map();

  static getInstance(): MobilePermissionManager {
    if (!MobilePermissionManager.instance) {
      MobilePermissionManager.instance = new MobilePermissionManager();
    }
    return MobilePermissionManager.instance;
  }

  async requestCameraPermission(): Promise<boolean> {
    if (this.permissionCache.has('camera')) {
      return this.permissionCache.get('camera')!;
    }

    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission',
            message: 'Pluggd Academy needs access to your camera for video calls',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        const hasPermission = granted === PermissionsAndroid.RESULTS.GRANTED;
        this.permissionCache.set('camera', hasPermission);
        return hasPermission;
      }
      return true; // iOS handles permissions differently
    } catch (error) {
      console.error('Camera permission error:', error);
      this.permissionCache.set('camera', false);
      return false;
    }
  }

  async requestMicrophonePermission(): Promise<boolean> {
    if (this.permissionCache.has('microphone')) {
      return this.permissionCache.get('microphone')!;
    }

    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Permission',
            message: 'Pluggd Academy needs access to your microphone for voice communication',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        const hasPermission = granted === PermissionsAndroid.RESULTS.GRANTED;
        this.permissionCache.set('microphone', hasPermission);
        return hasPermission;
      }
      return true; // iOS handles permissions differently
    } catch (error) {
      console.error('Microphone permission error:', error);
      this.permissionCache.set('microphone', false);
      return false;
    }
  }

  async requestAllPermissions(): Promise<{ camera: boolean; microphone: boolean }> {
    const [camera, microphone] = await Promise.all([
      this.requestCameraPermission(),
      this.requestMicrophonePermission(),
    ]);

    return { camera, microphone };
  }

  clearCache(): void {
    this.permissionCache.clear();
  }
}

// Mobile Signaling Server (extends web implementation)
class MobileSignalingServer {
  private static instance: MobileSignalingServer;
  private rooms: Map<string, Set<string>> = new Map();
  private connections: Map<string, MobileWebRTCManager> = new Map();
  private backgroundTimestamp: number = 0;

  static getInstance(): MobileSignalingServer {
    if (!MobileSignalingServer.instance) {
      MobileSignalingServer.instance = new MobileSignalingServer();
    }
    return MobileSignalingServer.instance;
  }

  constructor() {
    // Handle app state changes
    AppState.addEventListener('change', this.handleAppStateChange.bind(this));
  }

  private handleAppStateChange(nextAppState: string): void {
    const now = Date.now();
    
    if (nextAppState === 'background') {
      this.backgroundTimestamp = now;
      // Notify all connections about app going to background
      this.connections.forEach(manager => {
        manager.handleAppBackground();
      });
    } else if (nextAppState === 'active' && this.backgroundTimestamp > 0) {
      const backgroundDuration = now - this.backgroundTimestamp;
      // If app was in background for more than 30 seconds, reconnect
      if (backgroundDuration > 30000) {
        this.connections.forEach(manager => {
          manager.handleAppForegroundReconnect();
        });
      } else {
        this.connections.forEach(manager => {
          manager.handleAppForeground();
        });
      }
      this.backgroundTimestamp = 0;
    }
  }

  joinRoom(roomId: string, userId: string, manager: MobileWebRTCManager): string[] {
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

    // Save room state to persistent storage
    this.saveRoomState(roomId, userId);

    return existingUsers;
  }

  leaveRoom(roomId: string, userId: string): void {
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
        this.clearRoomState(roomId);
      }
    }
    this.connections.delete(userId);
  }

  private async saveRoomState(roomId: string, userId: string): Promise<void> {
    try {
      await AsyncStorage.setItem(`room_${roomId}_${userId}`, JSON.stringify({
        joinedAt: Date.now(),
        roomId,
        userId
      }));
    } catch (error) {
      console.error('Failed to save room state:', error);
    }
  }

  private async clearRoomState(roomId: string): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const roomKeys = keys.filter(key => key.startsWith(`room_${roomId}_`));
      await AsyncStorage.multiRemove(roomKeys);
    } catch (error) {
      console.error('Failed to clear room state:', error);
    }
  }

  sendSignal(fromUserId: string, toUserId: string, signal: any): void {
    const targetManager = this.connections.get(toUserId);
    if (targetManager) {
      targetManager.handleSignal(fromUserId, signal);
    }
  }

  broadcastToRoom(roomId: string, fromUserId: string, data: any): void {
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

export class MobileWebRTCManager extends EventTarget {
  private localStream?: MediaStream;
  private screenStream?: MediaStream;
  private peers: Map<string, MobilePeerConnection> = new Map();
  private roomId: string;
  private userId: string;
  private isHost: boolean;
  private signaling: MobileSignalingServer;
  private permissionManager: MobilePermissionManager;
  private devicePermissions: { video: boolean; audio: boolean } = { video: false, audio: false };
  private isInBackground: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 3;

  constructor(roomId: string, userId: string, isHost: boolean = false) {
    super();
    this.roomId = roomId;
    this.userId = userId;
    this.isHost = isHost;
    this.signaling = MobileSignalingServer.getInstance();
    this.permissionManager = MobilePermissionManager.getInstance();
  }

  // Initialize WebRTC for mobile
  async initialize(): Promise<void> {
    try {
      // Request permissions first
      const permissions = await this.permissionManager.requestAllPermissions();
      this.devicePermissions = permissions;

      if (!permissions.camera && !permissions.audio) {
        throw new Error('Camera and microphone permissions required for video calls');
      }

      // Get local media stream
      await this.getLocalStream();
      
      // Join signaling room
      this.signaling.joinRoom(this.roomId, this.userId, this);
      
      console.log('Mobile WebRTC initialized successfully');
    } catch (error) {
      console.error('Failed to initialize mobile WebRTC:', error);
      this.dispatchEvent(new CustomEvent('permission-denied', {
        detail: { 
          type: error.message.includes('camera') ? 'camera' : 'microphone',
          reason: error.message 
        }
      }));
      throw error;
    }
  }

  // Get local media stream for mobile
  async getLocalStream(constraints = MOBILE_VIDEO_CONSTRAINTS): Promise<MediaStream> {
    try {
      // Adjust constraints based on permissions
      const adjustedConstraints = {
        video: this.devicePermissions.video ? constraints.video : false,
        audio: this.devicePermissions.audio ? constraints.audio : false,
      };

      this.localStream = await getUserMedia(adjustedConstraints);
      
      // Update all peer connections with new stream
      this.peers.forEach(peer => {
        if (peer.connection.connectionState === 'connected') {
          this.replaceTrack(peer.id, this.localStream!);
        }
      });

      return this.localStream;
    } catch (error) {
      console.error('Failed to get local stream:', error);
      throw error;
    }
  }

  // Start screen sharing (mobile implementation)
  async startScreenShare(): Promise<MediaStream> {
    try {
      // Note: Screen sharing on mobile has limitations
      // This is more of a framework for future implementation
      if (Platform.OS === 'android') {
        // Android 21+ supports screen capture
        this.screenStream = await getDisplayMedia(MOBILE_SCREEN_SHARE_CONSTRAINTS);
      } else {
        // iOS has limited screen sharing capabilities
        throw new Error('Screen sharing not available on iOS');
      }
      
      // Handle screen share end
      if (this.screenStream) {
        this.screenStream.getTracks()[0].addEventListener('ended', () => {
          this.stopScreenShare();
        });

        // Replace video track in all peer connections
        this.peers.forEach(peer => {
          if (peer.connection.connectionState === 'connected') {
            this.replaceVideoTrack(peer.id, this.screenStream!.getTracks()[0]);
          }
        });

        // Notify peers about screen share
        this.broadcastData({ type: 'screen-share-started', userId: this.userId });
      }

      return this.screenStream!;
    } catch (error) {
      console.error('Failed to start screen share:', error);
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
            const videoTrack = this.localStream!.getTracks().find(track => track.kind === 'video');
            if (videoTrack) {
              this.replaceVideoTrack(peer.id, videoTrack);
            }
          }
        });
      }

      // Notify peers
      this.broadcastData({ type: 'screen-share-stopped', userId: this.userId });
    }
  }

  // Switch camera (front/back)
  async switchCamera(): Promise<void> {
    if (this.localStream) {
      const videoTrack = this.localStream.getTracks().find(track => track.kind === 'video') as any;
      if (videoTrack && videoTrack._switchCamera) {
        try {
          await videoTrack._switchCamera();
        } catch (error) {
          console.error('Failed to switch camera:', error);
        }
      }
    }
  }

  // Toggle video
  toggleVideo(): boolean {
    if (this.localStream) {
      const videoTrack = this.localStream.getTracks().find(track => track.kind === 'video');
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        return videoTrack.enabled;
      }
    }
    return false;
  }

  // Toggle audio
  toggleAudio(): boolean {
    if (this.localStream) {
      const audioTrack = this.localStream.getTracks().find(track => track.kind === 'audio');
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        return audioTrack.enabled;
      }
    }
    return false;
  }

  // Handle app going to background
  handleAppBackground(): void {
    this.isInBackground = true;
    this.dispatchEvent(new CustomEvent('app-background', {
      detail: { timestamp: Date.now() }
    }));

    // Pause video tracks to save battery
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        if (track.kind === 'video') {
          track.enabled = false;
        }
      });
    }
  }

  // Handle app coming to foreground
  handleAppForeground(): void {
    this.isInBackground = false;
    this.dispatchEvent(new CustomEvent('app-foreground', {
      detail: { timestamp: Date.now() }
    }));

    // Resume video tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        if (track.kind === 'video') {
          track.enabled = true;
        }
      });
    }
  }

  // Handle app foreground with reconnection
  async handleAppForegroundReconnect(): Promise<void> {
    this.isInBackground = false;
    
    try {
      // Attempt to reconnect
      await this.reconnectAllPeers();
      this.reconnectAttempts = 0;
    } catch (error) {
      console.error('Reconnection failed:', error);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        setTimeout(() => this.handleAppForegroundReconnect(), 2000);
      }
    }
  }

  // Reconnect all peer connections
  private async reconnectAllPeers(): Promise<void> {
    const reconnectPromises = Array.from(this.peers.entries()).map(async ([peerId, peer]) => {
      if (peer.connection.connectionState !== 'connected') {
        try {
          // Close existing connection
          peer.connection.close();
          
          // Create new connection
          const newConnection = this.createPeerConnection(peerId);
          peer.connection = newConnection;
          
          // Create offer to reconnect
          const offer = await newConnection.createOffer();
          await newConnection.setLocalDescription(offer);
          
          this.signaling.sendSignal(this.userId, peerId, {
            type: 'offer',
            offer: offer
          });
        } catch (error) {
          console.error(`Failed to reconnect to peer ${peerId}:`, error);
        }
      }
    });

    await Promise.all(reconnectPromises);
  }

  // Create peer connection (similar to web but with mobile considerations)
  private createPeerConnection(peerId: string): RTCPeerConnection {
    const pc = new RTCPeerConnection(RTC_CONFIG);

    // Add local stream tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream!);
      });
    }

    // Handle remote stream
    pc.onaddstream = (event) => {
      const remoteStream = event.stream;
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

    return pc;
  }

  // Replace video track in peer connection
  private async replaceVideoTrack(peerId: string, newTrack: MediaStreamTrack): Promise<void> {
    const peer = this.peers.get(peerId);
    if (peer) {
      const sender = peer.connection.getSenders().find(s => 
        s.track && s.track.kind === 'video'
      );
      if (sender && sender.replaceTrack) {
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
        if (track && sender.track && sender.replaceTrack) {
          await sender.replaceTrack(track);
        }
      }
    }
  }

  // Handle user joined (similar to web implementation)
  async handleUserJoined(peerId: string): Promise<void> {
    if (this.peers.has(peerId)) return;

    const pc = this.createPeerConnection(peerId);
    const peer: MobilePeerConnection = {
      id: peerId,
      connection: pc,
      isHost: false,
      isConnected: false,
      connectionState: pc.connectionState || 'new',
      iceConnectionState: pc.iceConnectionState || 'new'
    };

    this.peers.set(peerId, peer);

    // Create offer if we're the host or have a lower ID
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
      const pc = this.createPeerConnection(fromPeerId);
      peer = {
        id: fromPeerId,
        connection: pc,
        isHost: false,
        isConnected: false,
        connectionState: pc.connectionState || 'new',
        iceConnectionState: pc.iceConnectionState || 'new'
      };
      this.peers.set(fromPeerId, peer);
    }

    if (!peer) return;

    try {
      switch (signal.type) {
        case 'offer':
          await peer.connection.setRemoteDescription(new RTCSessionDescription(signal.offer));
          const answer = await peer.connection.createAnswer();
          await peer.connection.setLocalDescription(answer);
          
          this.signaling.sendSignal(this.userId, fromPeerId, {
            type: 'answer',
            answer: answer
          });
          break;

        case 'answer':
          await peer.connection.setRemoteDescription(new RTCSessionDescription(signal.answer));
          break;

        case 'ice-candidate':
          await peer.connection.addIceCandidate(new RTCIceCandidate(signal.candidate));
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
  getPeers(): Map<string, MobilePeerConnection> {
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

// Utility functions for React Native
export const getMobileMediaDevices = async (): Promise<any[]> => {
  try {
    const devices = await mediaDevices.enumerateDevices();
    return devices;
  } catch (error) {
    console.error('Failed to get mobile media devices:', error);
    return [];
  }
};

export const checkMobileWebRTCSupport = (): boolean => {
  return !!(
    RTCPeerConnection &&
    RTCSessionDescription &&
    RTCIceCandidate &&
    getUserMedia
  );
};

export const requestMobilePermissions = async (): Promise<{ camera: boolean; microphone: boolean }> => {
  const permissionManager = MobilePermissionManager.getInstance();
  return await permissionManager.requestAllPermissions();
};