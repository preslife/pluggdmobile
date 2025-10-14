import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest';
import React, { useEffect } from 'react';
import { render, screen, waitFor, fireEvent, cleanup, act } from '@testing-library/react';
import type { Track } from '../GlobalPlayerProvider';
import { GlobalPlayerProvider, useGlobalPlayer } from '../GlobalPlayerProvider';
import { trackAccessControl } from '@/services/audio/track-access-control';

vi.mock('@/services/audio/track-access-control', () => {
  return {
    trackAccessControl: {
      enhanceTrackWithAccess: vi.fn(),
      getMaxPlaybackTime: vi.fn(),
      shouldLimitPlayback: vi.fn(() => true),
    },
  };
});

vi.mock('@/services/audio/url-resolver', () => ({
  resolvePlayableUrl: vi.fn(async (src: string) => src),
}));

vi.mock('@/services/analytics/player-analytics', () => ({
  playerAnalytics: {
    startSession: vi.fn(),
    cleanup: vi.fn(),
    trackPlayEvent: vi.fn().mockResolvedValue(undefined),
    trackPlayProgress: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/services/library', () => ({
  fetchLibraryItems: vi.fn(async () => ({ items: [] })),
  useLibrary: () => ({ items: [], loading: false, error: null, refresh: vi.fn() }),
}));

const originalConsoleError = console.error;

beforeAll(() => {
  vi.spyOn(console, 'error').mockImplementation((...args: any[]) => {
    if (typeof args[0] === 'string' && args[0].includes('act(...)')) {
      return;
    }
    originalConsoleError(...args);
  });
});

afterAll(() => {
  (console.error as any).mockRestore?.();
});

const createQueryStub = () => {
  const query: Record<string, any> = {};
  query.select = vi.fn(() => query);
  query.eq = vi.fn(() => query);
  query.or = vi.fn(() => query);
  query.order = vi.fn(() => query);
  query.limit = vi.fn(() => query);
  query.single = vi.fn(async () => ({ data: null, error: { code: 'PGRST116' } }));
  query.maybeSingle = vi.fn(async () => ({ data: null, error: null }));
  query.upsert = vi.fn(async () => ({ error: null }));
  query.delete = vi.fn(() => query);
  return query;
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(async () => ({ data: { user: { id: 'user-123' } }, error: null })),
    },
    from: vi.fn(() => createQueryStub()),
  },
}));

const enhanceTrackMock = vi.mocked(trackAccessControl.enhanceTrackWithAccess);
const maxPlaybackMock = vi.mocked(trackAccessControl.getMaxPlaybackTime);

const baseTrack: Track = {
  id: 'track-1',
  title: 'Midnight Echoes',
  artist: 'The Synth Lords',
  src: 'https://example.com/audio.mp3',
  duration: 180,
  type: 'release',
};

type GatedConsumerProps = {
  track: Track;
};

const harnessControls: { play?: (track: Track) => Promise<void> } = {};

const GatedConsumer: React.FC<GatedConsumerProps> = ({ track }) => {
  const { state, actions, audioRef } = useGlobalPlayer();

  useEffect(() => {
    harnessControls.play = actions.play;
    return () => {
      harnessControls.play = undefined;
    };
  }, [actions]);

  const status = state.isPlaying ? 'playing' : state.isPaused ? 'paused' : 'idle';

  return (
    <div>
      <div data-testid="status">{status}</div>
      {state.currentTrack ? (
        <div>
          <div data-testid="streamable">{state.currentTrack.streamable ? 'full' : 'preview'}</div>
          <div data-testid="preview-duration">
            {state.currentTrack.preview_duration ?? ''}
          </div>
          {!state.currentTrack.streamable && (
            <div>
              <div data-testid="lock-ui">Locked preview</div>
              <button type="button" data-testid="purchase-cta">
                Purchase to unlock
              </button>
              <button
                type="button"
                data-testid="end-preview"
                onClick={() => {
                  const audio = audioRef.current;
                  if (!audio) return;
                  const cap = trackAccessControl.getMaxPlaybackTime(state.currentTrack!) ?? 0;
                  audio.currentTime = cap + 0.5;
                  audio.dispatchEvent(new Event('timeupdate'));
                }}
              >
                End preview
              </button>
            </div>
          )}
        </div>
      ) : (
        <div data-testid="streamable">none</div>
      )}
    </div>
  );
};

let originalPlay: any;
let originalPause: any;
let originalCurrentTimeDescriptor: PropertyDescriptor | undefined;
let originalDurationDescriptor: PropertyDescriptor | undefined;

const mediaState = new WeakMap<EventTarget, { paused: boolean; currentTime: number; duration: number }>();

beforeAll(() => {
  originalPlay = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'play')?.value;
  originalPause = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'pause')?.value;
  originalCurrentTimeDescriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'currentTime');
  originalDurationDescriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'duration');

  Object.defineProperty(HTMLMediaElement.prototype, 'play', {
    configurable: true,
    value: vi.fn(function thisPlay(this: HTMLMediaElement) {
      const state = mediaState.get(this) ?? { paused: true, currentTime: 0, duration: 0 };
      state.paused = false;
      mediaState.set(this, state);
      return Promise.resolve();
    }),
  });

  Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
    configurable: true,
    value: vi.fn(function thisPause(this: HTMLMediaElement) {
      const state = mediaState.get(this) ?? { paused: true, currentTime: 0, duration: 0 };
      state.paused = true;
      mediaState.set(this, state);
    }),
  });

  Object.defineProperty(HTMLMediaElement.prototype, 'paused', {
    configurable: true,
    get(this: HTMLMediaElement) {
      return mediaState.get(this)?.paused ?? true;
    },
  });

  Object.defineProperty(HTMLMediaElement.prototype, 'currentTime', {
    configurable: true,
    get(this: HTMLMediaElement) {
      return mediaState.get(this)?.currentTime ?? 0;
    },
    set(this: HTMLMediaElement, value: number) {
      const state = mediaState.get(this) ?? { paused: true, currentTime: 0, duration: 0 };
      state.currentTime = value;
      mediaState.set(this, state);
    },
  });

  Object.defineProperty(HTMLMediaElement.prototype, 'duration', {
    configurable: true,
    get(this: HTMLMediaElement) {
      return mediaState.get(this)?.duration ?? 0;
    },
    set(this: HTMLMediaElement, value: number) {
      const state = mediaState.get(this) ?? { paused: true, currentTime: 0, duration: value };
      state.duration = value;
      mediaState.set(this, state);
    },
  });
});

beforeEach(() => {
  localStorage.clear();
  cleanup();
  vi.clearAllMocks();
});

afterAll(() => {
  if (originalPlay) {
    Object.defineProperty(HTMLMediaElement.prototype, 'play', {
      configurable: true,
      value: originalPlay,
    });
  }
  if (originalPause) {
    Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
      configurable: true,
      value: originalPause,
    });
  }
  if (originalCurrentTimeDescriptor) {
    Object.defineProperty(HTMLMediaElement.prototype, 'currentTime', originalCurrentTimeDescriptor);
  }
  if (originalDurationDescriptor) {
    Object.defineProperty(HTMLMediaElement.prototype, 'duration', originalDurationDescriptor);
  }
});

describe('Global player access gating', () => {
  it('locks playback to the preview window and shows purchase prompts for locked tracks', async () => {
    enhanceTrackMock.mockResolvedValueOnce({
      ...baseTrack,
      streamable: false,
      owned: false,
      preview_duration: 30,
    });
    maxPlaybackMock.mockImplementation(() => 30);

    await act(async () => {
      render(
        <GlobalPlayerProvider>
          <GatedConsumer track={baseTrack} />
        </GlobalPlayerProvider>
      );
    });

    await waitFor(() => {
      expect(harnessControls.play).toBeDefined();
    });

    await act(async () => {
      await harnessControls.play?.(baseTrack);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByTestId('streamable').textContent).toBe('preview');
    });

    expect(screen.getByTestId('lock-ui')).toBeInTheDocument();
    expect(screen.getByTestId('purchase-cta')).toBeInTheDocument();
    expect(screen.getByTestId('preview-duration').textContent).toBe('30');

    const audio = document.querySelector('audio') as HTMLAudioElement;
    expect(audio).toBeTruthy();
    audio.duration = 180;

    fireEvent.click(screen.getByTestId('end-preview'));

    await waitFor(() => {
      expect(screen.getByTestId('status').textContent).toBe('paused');
    });

    const pauseMock = HTMLMediaElement.prototype.pause as unknown as ReturnType<typeof vi.fn>;
    expect(pauseMock).toHaveBeenCalled();
  });

  it('plays owned tracks without gating prompts', async () => {
    enhanceTrackMock.mockResolvedValueOnce({
      ...baseTrack,
      streamable: true,
      owned: true,
      preview_duration: undefined,
    });
    maxPlaybackMock.mockImplementation(() => null);

    await act(async () => {
      render(
        <GlobalPlayerProvider>
          <GatedConsumer track={baseTrack} />
        </GlobalPlayerProvider>
      );
    });

    await waitFor(() => {
      expect(harnessControls.play).toBeDefined();
    });

    await act(async () => {
      await harnessControls.play?.(baseTrack);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByTestId('streamable').textContent).toBe('full');
    });

    expect(screen.queryByTestId('lock-ui')).not.toBeInTheDocument();
    expect(screen.queryByTestId('purchase-cta')).not.toBeInTheDocument();

    const audio = document.querySelector('audio') as HTMLAudioElement;
    expect(audio).toBeTruthy();
    audio.duration = 180;
    audio.currentTime = 179;
    audio.dispatchEvent(new Event('timeupdate'));

    await waitFor(() => {
      expect(screen.getByTestId('status').textContent).toBe('playing');
    });

    const pauseMock = HTMLMediaElement.prototype.pause as unknown as ReturnType<typeof vi.fn>;
    expect(pauseMock).not.toHaveBeenCalled();
  });
});
