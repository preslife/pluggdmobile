import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useNotificationPreferences } from '../useNotificationPreferences';

const basePreferences = {
  notify_push: true,
  notify_contest_reminders: true,
  notify_live_sessions: true,
  notify_purchases: true,
  notify_supporters: true,
  notify_follows: true,
  notify_session_feedback: true,
  notify_email_marketing: true,
};

const mockRpc = vi.fn();
const toastMock = vi.fn();

let supabaseClientMock = {
  rpc: (...args: unknown[]) => mockRpc(...args),
};

const mockUser = { id: 'user-123' };

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: mockUser }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: (...args: unknown[]) => supabaseClientMock.rpc(...args),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockRpc.mockReset();
  toastMock.mockReset();

  supabaseClientMock = {
    rpc: (...args: unknown[]) => mockRpc(...args),
  };
});

describe('useNotificationPreferences', () => {
  it('reverts optimistic updates when Supabase update fails', async () => {
    mockRpc.mockImplementation(async (fn: string) => {
      if (fn === 'get_notification_prefs') {
        return { data: { ...basePreferences }, error: null };
      }

      if (fn === 'set_notification_pref') {
        return { data: null, error: { message: 'Update failed' } };
      }

      return { data: null, error: null };
    });

    const { result } = renderHook(() => useNotificationPreferences());

    await act(async () => {
      await result.current.refresh();
    });

    await waitFor(() => expect(result.current.preferences).not.toBeNull());
    mockRpc.mockClear();

    const previous = result.current.preferences;
    expect(previous?.notify_push).toBe(true);

    await act(async () => {
      await result.current.updatePreference('notify_push', false);
    });

    await waitFor(() => expect(result.current.preferences?.notify_push).toBe(true));
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: 'destructive',
      }),
    );
  });
});
