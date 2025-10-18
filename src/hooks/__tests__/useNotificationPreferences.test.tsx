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

const mockMaybeSingle = vi.fn();
const mockSelectEq = vi.fn();
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockInsertSelect = vi.fn();
const mockInsertSingle = vi.fn();
const mockUpdate = vi.fn();
const mockUpdateEq = vi.fn();
const mockFrom = vi.fn();

let supabaseClientMock = {
  from: (...args: unknown[]) => mockFrom(...args),
};

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-123' } }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => supabaseClientMock.from(...args),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockMaybeSingle.mockReset();
  mockSelectEq.mockReset();
  mockSelect.mockReset();
  mockInsert.mockReset();
  mockInsertSelect.mockReset();
  mockInsertSingle.mockReset();
  mockUpdate.mockReset();
  mockUpdateEq.mockReset();
  mockFrom.mockReset();

  mockMaybeSingle.mockResolvedValue({ data: { ...basePreferences }, error: null });
  mockSelectEq.mockReturnValue({ maybeSingle: mockMaybeSingle });
  mockSelect.mockReturnValue({ eq: mockSelectEq });

  mockInsertSingle.mockResolvedValue({ data: { ...basePreferences }, error: null });
  mockInsertSelect.mockReturnValue({ single: mockInsertSingle });
  mockInsert.mockReturnValue({ select: mockInsertSelect });

  mockUpdateEq.mockResolvedValue({ error: null });
  mockUpdate.mockReturnValue({ eq: mockUpdateEq });

  mockFrom.mockImplementation((table: string) => {
    if (table === 'notification_prefs') {
      return {
        select: mockSelect,
        insert: mockInsert,
        update: mockUpdate,
      };
    }

    return {
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
    } as any;
  });

  supabaseClientMock = {
    from: (...args: unknown[]) => mockFrom(...args),
  };
});

describe('useNotificationPreferences', () => {
  it('updates preferences and persists via Supabase', async () => {
    const { result } = renderHook(() => useNotificationPreferences());

    await result.current.updatePreference('notify_push', false);

    expect(mockUpdate).toHaveBeenCalledWith({ notify_push: false });
    expect(mockUpdateEq).toHaveBeenCalledWith('user_id', 'user-123');
    expect(mockMaybeSingle).toHaveBeenCalled();
  });
});
