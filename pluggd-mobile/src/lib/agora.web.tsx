import { View, type StyleProp, type ViewStyle } from 'react-native';

export const ChannelProfileType = {
  ChannelProfileLiveBroadcasting: 1,
} as const;

export const ClientRoleType = {
  ClientRoleBroadcaster: 1,
  ClientRoleAudience: 2,
} as const;

export type IRtcEngine = {
  registerEventHandler: (handler: unknown) => void;
  initialize: (config: unknown) => void;
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
