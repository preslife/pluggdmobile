import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createPreferenceCache,
  executeWithNotificationPreference,
  shouldSendNotification,
} from '../_shared/notificationPreferences.ts';

type MaybeSingleResult = { data: Record<string, boolean> | null; error: { message: string } | null };

const mockMaybeSingle = vi.fn<[], Promise<MaybeSingleResult>>();
const mockEq = vi.fn();
const mockSelect = vi.fn();
const mockFrom = vi.fn();

const buildClient = () => ({
  from: mockFrom,
});

beforeEach(() => {
  mockMaybeSingle.mockReset();
  mockEq.mockReset();
  mockSelect.mockReset();
  mockFrom.mockReset();

  mockEq.mockReturnValue({ maybeSingle: mockMaybeSingle });
  mockSelect.mockReturnValue({ eq: mockEq });
  mockFrom.mockReturnValue({ select: mockSelect });
});

describe('notification preference helpers', () => {
  it('skips executing the action when the user opted out', async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: { notify_push: false }, error: null });

    const cache = createPreferenceCache();
    const client = buildClient();
    const action = vi.fn().mockResolvedValue('sent');

    const result = await executeWithNotificationPreference(client as any, cache, 'user-1', 'notify_push', action);

    expect(result.skipped).toBe(true);
    expect(action).not.toHaveBeenCalled();
  });

  it('runs the action when preference is enabled', async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: { notify_push: true }, error: null });

    const cache = createPreferenceCache();
    const client = buildClient();
    const action = vi.fn().mockResolvedValue('sent');

    const result = await executeWithNotificationPreference(client as any, cache, 'user-2', 'notify_push', action);

    expect(result.skipped).toBe(false);
    expect(result.result).toBe('sent');
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('caches preferences for repeated checks', async () => {
    mockMaybeSingle.mockResolvedValue({ data: { notify_contest_reminders: true }, error: null });

    const cache = createPreferenceCache();
    const client = buildClient();

    const first = await shouldSendNotification(client as any, cache, 'user-3', 'notify_contest_reminders');
    const second = await shouldSendNotification(client as any, cache, 'user-3', 'notify_contest_reminders');

    expect(first).toBe(true);
    expect(second).toBe(true);
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });
});
