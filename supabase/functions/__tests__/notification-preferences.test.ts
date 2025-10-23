import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createPreferenceCache,
  executeWithNotificationPreference,
  shouldSendNotification,
} from '../_shared/notificationPreferences.ts';

type RpcResult = { data: Record<string, boolean> | null; error: { message: string } | null };

const mockRpc = vi.fn<[
  string,
  Record<string, unknown>,
], Promise<RpcResult>>();

const buildClient = () => ({
  rpc: mockRpc,
});

beforeEach(() => {
  mockRpc.mockReset();
});

describe('notification preference helpers', () => {
  it('skips executing the action when the user opted out', async () => {
    mockRpc.mockImplementation(async (fn) => {
      if (fn === 'get_notification_prefs') {
        return { data: { notify_push: false }, error: null };
      }
      return { data: null, error: null };
    });

    const cache = createPreferenceCache();
    const client = buildClient();
    const action = vi.fn().mockResolvedValue('sent');

    const result = await executeWithNotificationPreference(client as any, cache, 'user-1', 'notify_push', action);

    expect(result.skipped).toBe(true);
    expect(action).not.toHaveBeenCalled();
  });

  it('runs the action when preference is enabled', async () => {
    mockRpc.mockImplementation(async (fn) => {
      if (fn === 'get_notification_prefs') {
        return { data: { notify_push: true }, error: null };
      }
      return { data: null, error: null };
    });

    const cache = createPreferenceCache();
    const client = buildClient();
    const action = vi.fn().mockResolvedValue('sent');

    const result = await executeWithNotificationPreference(client as any, cache, 'user-2', 'notify_push', action);

    expect(result.skipped).toBe(false);
    expect(result.result).toBe('sent');
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('caches preferences for repeated checks', async () => {
    mockRpc.mockImplementation(async (fn) => {
      if (fn === 'get_notification_prefs') {
        return { data: { notify_contest_reminders: true }, error: null };
      }
      return { data: null, error: null };
    });

    const cache = createPreferenceCache();
    const client = buildClient();

    const first = await shouldSendNotification(client as any, cache, 'user-3', 'notify_contest_reminders');
    const second = await shouldSendNotification(client as any, cache, 'user-3', 'notify_contest_reminders');

    expect(first).toBe(true);
    expect(second).toBe(true);
    expect(mockRpc).toHaveBeenCalledTimes(1);
  });
});
