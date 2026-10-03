import { View, type StyleProp, type ViewStyle } from 'react-native';

export const ChannelProfileType = {
  ChannelProfileLiveBroadcasting: 1,
} as const;

export const ClientRoleType = {
  ClientRoleBroadcaster: 1,
  ClientRoleAudience: 2,
} as const;

export const OrientationMode = { OrientationModeFixedPortrait: 2 } as const;
export const RenderModeType = { RenderModeFit: 2 } as const;
export type VideoEncoderConfiguration = {
  dimensions?: { width: number; height: number };
  frameRate?: number;
  bitrate?: number;
  orientationMode?: number;
};

export type IRtcEngine = {
  registerEventHandler: (handler: unknown) => void;
  initialize: (config: unknown) => void;
  setVideoEncoderConfiguration: (config: VideoEncoderConfiguration) => number;
  setCameraCapturerConfiguration: (config: { followEncodeDimensionRatio: boolean }) => number;
  enableVideo: () => void;
  disableVideo: () => void;
  startPreview: () => void;
  joinChannel: (token: string, channelName: string, uid: number, options: unknown) => void;
  leaveChannel: () => void;
  release: () => void;
};

export function createAgoraRtcEngine(): IRtcEngine {
  return {
    registerEventHandler: () => undefined,
    initialize: () => undefined,
    setVideoEncoderConfiguration: () => 0,
    setCameraCapturerConfiguration: () => 0,
    enableVideo: () => undefined,
    disableVideo: () => undefined,
    startPreview: () => undefined,
    joinChannel: () => undefined,
    leaveChannel: () => undefined,
    release: () => undefined,
  };
}

export function RtcSurfaceView({ style }: { canvas?: unknown; style?: StyleProp<ViewStyle> }) {
  return <View style={style} />;
}
