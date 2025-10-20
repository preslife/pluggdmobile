/// <reference types="vitest" />

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { MobileBeatMaker } from '../MobileBeatMaker';

const uploadMock = vi.fn();
const getPublicUrlMock = vi.fn();
const fromMock = vi.fn(() => ({
  upload: uploadMock,
  getPublicUrl: getPublicUrlMock,
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    storage: {
      from: (bucket: string) => fromMock(bucket),
    },
  },
}));

const toastInvocations: Array<{ options: any; update: ReturnType<typeof vi.fn> }> = [];

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: (options: any) => {
      const update = vi.fn();
      toastInvocations.push({ options, update });
      return { id: `toast-${toastInvocations.length}`, update, dismiss: vi.fn() };
    },
  }),
}));

describe('MobileBeatMaker mobile actions', () => {
  const originalInnerWidth = window.innerWidth;
  const shareMock = vi.fn();
  const clipboardMock = { writeText: vi.fn() };
  const originalCreateObjectURL = (globalThis.URL as any)?.createObjectURL;
  const originalRevokeObjectURL = (globalThis.URL as any)?.revokeObjectURL;
  const originalShare = (navigator as any).share;
  const originalClipboard = (navigator as any).clipboard;
  let restoreCrypto: (() => void) | undefined;

  beforeEach(() => {
    restoreCrypto = undefined;
    toastInvocations.length = 0;
    uploadMock.mockResolvedValue({ data: { path: 'test.wav' }, error: null });
    getPublicUrlMock.mockReturnValue({ data: { publicUrl: 'https://storage.test/test.wav' } });
    fromMock.mockClear();
    uploadMock.mockClear();
    getPublicUrlMock.mockClear();
    shareMock.mockResolvedValue(undefined);
    clipboardMock.writeText.mockResolvedValue(undefined);

    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 375,
    });

    Object.defineProperty(window.navigator, 'share', {
      configurable: true,
      value: shareMock,
    });

    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: clipboardMock,
    });

    if (!globalThis.crypto || typeof globalThis.crypto.randomUUID !== 'function') {
      const previousCrypto = globalThis.crypto;
      Object.defineProperty(globalThis, 'crypto', {
        configurable: true,
        value: {
          randomUUID: () => 'test-uuid',
        },
      });
      restoreCrypto = () => {
        if (previousCrypto) {
          Object.defineProperty(globalThis, 'crypto', {
            configurable: true,
            value: previousCrypto,
          });
        } else {
          delete (globalThis as any).crypto;
        }
      };
    } else {
      const spy = vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue('test-uuid');
      restoreCrypto = () => spy.mockRestore();
    }

    Object.defineProperty(globalThis.URL as any, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:mock-url'),
    });

    Object.defineProperty(globalThis.URL as any, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    });
  });

  afterEach(() => {
    cleanup();
    uploadMock.mockReset();
    getPublicUrlMock.mockReset();
    shareMock.mockReset();
    clipboardMock.writeText.mockReset();
    restoreCrypto?.();
    if (originalCreateObjectURL) {
      Object.defineProperty(globalThis.URL as any, 'createObjectURL', {
        configurable: true,
        value: originalCreateObjectURL,
      });
    } else {
      delete (globalThis.URL as any).createObjectURL;
    }

    if (originalRevokeObjectURL) {
      Object.defineProperty(globalThis.URL as any, 'revokeObjectURL', {
        configurable: true,
        value: originalRevokeObjectURL,
      });
    } else {
      delete (globalThis.URL as any).revokeObjectURL;
    }

    if (originalShare !== undefined) {
      Object.defineProperty(window.navigator, 'share', {
        configurable: true,
        value: originalShare,
      });
    } else {
      delete (window.navigator as any).share;
    }

    if (originalClipboard !== undefined) {
      Object.defineProperty(window.navigator, 'clipboard', {
        configurable: true,
        value: originalClipboard,
      });
    } else {
      delete (window.navigator as any).clipboard;
    }
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: originalInnerWidth,
    });
  });

  it('exports the beat and uploads it to Supabase storage', async () => {
    render(<MobileBeatMaker />);

    const exportButton = screen.getByRole('button', { name: /Export/i });
    await userEvent.click(exportButton);

    await waitFor(() => expect(uploadMock).toHaveBeenCalled());
    await waitFor(() => expect(toastInvocations.length).toBeGreaterThan(0));

    expect(fromMock).toHaveBeenCalledWith('beat-exports');
    expect(uploadMock.mock.calls[0][0]).toMatch(/exports\//);
    expect(uploadMock.mock.calls[0][2]).toEqual({ contentType: 'audio/wav' });

    await waitFor(() => expect(screen.getByRole('button', { name: 'Export' })).toBeEnabled());

    expect(toastInvocations[0]?.options.title).toMatch(/Exporting beat/i);
    await waitFor(() =>
      expect(toastInvocations[0]?.update).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Beat exported' })
      )
    );
  });

  it('shares the beat using the Web Share API on mobile', async () => {
    render(<MobileBeatMaker />);

    const shareButton = screen.getByRole('button', { name: /Share/i });
    await userEvent.click(shareButton);

    await waitFor(() => expect(uploadMock).toHaveBeenCalled());
    await waitFor(() => expect(toastInvocations.length).toBeGreaterThan(0));

    expect(uploadMock.mock.calls[0][0]).toMatch(/shares\//);
    expect(shareMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://storage.test/test.wav',
      })
    );

    await waitFor(() => expect(screen.getByRole('button', { name: 'Share' })).toBeEnabled());

    expect(toastInvocations[0]?.options.title).toMatch(/Preparing share link/i);
    await waitFor(() =>
      expect(toastInvocations[0]?.update).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Beat shared' })
      )
    );
  });
});
