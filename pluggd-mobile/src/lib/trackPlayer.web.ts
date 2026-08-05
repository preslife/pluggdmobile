export const Capability = {
  Play: 'play',
  Pause: 'pause',
  SkipToNext: 'skip-to-next',
  SkipToPrevious: 'skip-to-previous',
  SeekTo: 'seek-to',
  Stop: 'stop',
} as const;

export const State = {
  None: 'none',
  Ready: 'ready',
  Playing: 'playing',
  Paused: 'paused',
  Stopped: 'stopped',
  Buffering: 'buffering',
  Loading: 'loading',
} as const;

export const RepeatMode = {
  Off: 'off',
  Track: 'track',
  Queue: 'queue',
} as const;

export const AppKilledPlaybackBehavior = {
  StopPlaybackAndRemoveNotification: 'stop-playback-and-remove-notification',
} as const;

export type Track = {
  id?: string;
  url: string;
  title?: string;
  artist?: string;
  artwork?: string;
  duration?: number;
  [key: string]: unknown;
};

const queue: Track[] = [];
let repeatMode: typeof RepeatMode[keyof typeof RepeatMode] = RepeatMode.Off;
let activeIndex = -1;

const TrackPlayer = {
  registerPlaybackService: () => undefined,
  setupPlayer: async () => undefined,
  updateOptions: async () => undefined,
  getQueue: async () => [...queue],
  reset: async () => {
    queue.length = 0;
    activeIndex = -1;
  },
  add: async (tracks: Track | Track[]) => {
    const incoming = Array.isArray(tracks) ? tracks : [tracks];
    queue.push(...incoming);
    if (activeIndex < 0 && queue.length > 0) activeIndex = 0;
  },
  play: async () => undefined,
  pause: async () => undefined,
  skipToNext: async () => {
    activeIndex = Math.min(activeIndex + 1, queue.length - 1);
  },
  skipToPrevious: async () => {
    activeIndex = Math.max(activeIndex - 1, 0);
  },
  skip: async (index: number) => {
    activeIndex = Math.min(Math.max(index, 0), queue.length - 1);
  },
  seekTo: async () => undefined,
  getRepeatMode: async () => repeatMode,
  setRepeatMode: async (nextMode: typeof RepeatMode[keyof typeof RepeatMode]) => {
    repeatMode = nextMode;
  },
  getActiveTrack: async () => (activeIndex >= 0 ? queue[activeIndex] : undefined),
};

export function usePlaybackState() {
  return { state: State.None };
}

export function useProgress() {
  return { position: 0, duration: 0, buffered: 0 };
}

export function useActiveTrack() {
  return activeIndex >= 0 ? queue[activeIndex] : undefined;
}

export const Event = {
  PlaybackState: 'playback-state',
  PlaybackError: 'playback-error',
  PlaybackActiveTrackChanged: 'playback-active-track-changed',
  PlaybackQueueEnded: 'playback-queue-ended',
  RemotePlay: 'remote-play',
  RemotePause: 'remote-pause',
  RemoteNext: 'remote-next',
  RemotePrevious: 'remote-previous',
  RemoteSeek: 'remote-seek',
  RemoteStop: 'remote-stop',
} as const;

/**
 * No-op on web: this shim has no native event source to subscribe to.
 * It must still exist and be callable — consumers call it unconditionally at
 * the top of a component, so returning undefined here crashes the whole tree.
 */
export function useTrackPlayerEvents(
  _events: readonly (typeof Event)[keyof typeof Event][],
  _handler: (event: unknown) => void,
) {
  return undefined;
}

export default TrackPlayer;
