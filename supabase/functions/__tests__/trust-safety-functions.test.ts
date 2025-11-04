import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createBlockUserHandler } from '../block-user/handler';
import { createUnblockUserHandler } from '../unblock-user/handler';
import { createSubmitReportHandler } from '../submit-report/handler';
import { createReviewReportHandler } from '../review-report/handler';
import { createBroadcastNotificationHandler } from '../broadcast-notification/handler';

const buildRequest = (body: unknown) =>
  new Request('https://example.com', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer token',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

describe('trust & safety edge handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a new block when none exists', async () => {
    const systemLogsInsert = vi.fn(() => Promise.resolve({ error: null }));

    const userBlocksTable: any = {
      select: vi.fn(() => userBlocksTable),
      eq: vi.fn(() => userBlocksTable),
      order: vi.fn(() => userBlocksTable),
      limit: vi.fn(() => userBlocksTable),
      maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          maybeSingle: vi.fn(() =>
            Promise.resolve({ data: { id: 'block-1', blocker_id: 'admin-1', blocked_user_id: 'user-456', status: 'active' }, error: null }),
          ),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            maybeSingle: vi.fn(() => Promise.resolve({ data: { id: 'block-1', status: 'active' }, error: null })),
          })),
        })),
      })),
    };

    const anonClient = {
      auth: {
        getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'admin-1' } }, error: null })),
      },
      from: vi.fn(),
    };

    const serviceClient: any = {
      auth: { getUser: vi.fn() },
      from: vi.fn((table: string) => {
        if (table === 'user_blocks') return userBlocksTable;
        if (table === 'system_logs') return { insert: systemLogsInsert };
        throw new Error(`Unexpected table ${table}`);
      }),
    };

    const createClient = vi.fn((url: string, key: string) => (key === 'anon-key' ? anonClient : serviceClient));

    const handler = createBlockUserHandler({
      supabaseUrl: 'url',
      supabaseAnonKey: 'anon-key',
      supabaseServiceRoleKey: 'service-key',
      createClient,
    });

    const response = await handler(
      buildRequest({ blockedUserId: 'user-456', reason: 'spam' }),
    );

    expect(response.status).toBe(201);
    expect(userBlocksTable.insert).toHaveBeenCalledWith(
      expect.objectContaining({ blocker_id: 'admin-1', blocked_user_id: 'user-456', reason: 'spam' }),
    );
    expect(systemLogsInsert).toHaveBeenCalled();
  });

  it('marks a block as revoked on unblock', async () => {
    const systemLogsInsert = vi.fn(() => Promise.resolve({ error: null }));

    const updateResult = { data: { id: 'block-1', status: 'revoked' }, error: null };
    const userBlocksTable: any = {
      select: vi.fn(() => userBlocksTable),
      eq: vi.fn(() => userBlocksTable),
      order: vi.fn(() => userBlocksTable),
      limit: vi.fn(() => userBlocksTable),
      maybeSingle: vi.fn()
        .mockResolvedValueOnce({ data: { id: 'block-1', status: 'active' }, error: null })
        .mockResolvedValueOnce({ data: null, error: null }),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            maybeSingle: vi.fn(() => Promise.resolve(updateResult)),
          })),
        })),
      })),
    };

    const anonClient = {
      auth: {
        getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'admin-1' } }, error: null })),
      },
      from: vi.fn(),
    };

    const serviceClient: any = {
      auth: { getUser: vi.fn() },
      from: vi.fn((table: string) => {
        if (table === 'user_blocks') return userBlocksTable;
        if (table === 'system_logs') return { insert: systemLogsInsert };
        throw new Error(`Unexpected table ${table}`);
      }),
    };

    const createClient = vi.fn((url: string, key: string) => (key === 'anon-key' ? anonClient : serviceClient));

    const handler = createUnblockUserHandler({
      supabaseUrl: 'url',
      supabaseAnonKey: 'anon-key',
      supabaseServiceRoleKey: 'service-key',
      createClient,
    });

    const response = await handler(
      buildRequest({ blockedUserId: 'user-789', notes: 'cleared' }),
    );

    expect(response.status).toBe(200);
    expect(userBlocksTable.update).toHaveBeenCalled();
    expect(systemLogsInsert).toHaveBeenCalled();
  });

  it('submits a report after verifying context', async () => {
    const systemLogsInsert = vi.fn(() => Promise.resolve({ error: null }));

    const releasesTable: any = {
      select: vi.fn(() => releasesTable),
      eq: vi.fn(() => releasesTable),
      maybeSingle: vi.fn(() => Promise.resolve({ data: { owner_id: 'creator-1', title: 'Release' }, error: null })),
    };

    const reportsTable = {
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: 'report-1', status: 'pending' }, error: null })),
        })),
      })),
    };

    const userBlocksTable = {
      select: vi.fn(() => userBlocksTable),
      eq: vi.fn(() => userBlocksTable),
      order: vi.fn(() => userBlocksTable),
      limit: vi.fn(() => userBlocksTable),
      maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
    };

    const anonClient = {
      auth: {
        getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'reporter-1' } }, error: null })),
      },
      from: vi.fn(),
    };

    const serviceClient: any = {
      auth: { getUser: vi.fn() },
      rpc: vi.fn(() => Promise.resolve({ data: false, error: null })),
      from: vi.fn((table: string) => {
        if (table === 'releases') return releasesTable;
        if (table === 'content_reports') return reportsTable;
        if (table === 'system_logs') return { insert: systemLogsInsert };
        if (table === 'user_blocks') return userBlocksTable;
        throw new Error(`Unexpected table ${table}`);
      }),
    };

    const createClient = vi.fn((url: string, key: string) => (key === 'anon-key' ? anonClient : serviceClient));

    const handler = createSubmitReportHandler({
      supabaseUrl: 'url',
      supabaseAnonKey: 'anon-key',
      supabaseServiceRoleKey: 'service-key',
      createClient,
    });

    const response = await handler(
      buildRequest({ targetType: 'release', targetId: 'rel-1', reason: 'spam' }),
    );

    expect(response.status).toBe(201);
    expect(reportsTable.insert).toHaveBeenCalled();
    expect(serviceClient.rpc).toHaveBeenCalledWith('is_user_blocked', { p_actor: 'reporter-1', p_target: 'creator-1' });
  });

  it('updates report status during review', async () => {
    const systemLogsInsert = vi.fn(() => Promise.resolve({ error: null }));

    const reportsTable: any = {
      select: vi.fn(() => reportsTable),
      eq: vi.fn(() => reportsTable),
      maybeSingle: vi.fn()
        .mockResolvedValueOnce({ data: { id: 'report-1', reporter_id: 'user-x', status: 'pending' }, error: null })
        .mockResolvedValueOnce({ data: { id: 'report-1', status: 'resolved' }, error: null }),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            maybeSingle: vi.fn(() => Promise.resolve({ data: { id: 'report-1', status: 'resolved' }, error: null })),
          })),
        })),
      })),
    };

    const rolesTable = {
      select: vi.fn(() => rolesTable),
      eq: vi.fn(() => rolesTable),
      maybeSingle: vi.fn(() => Promise.resolve({ data: { role: 'admin' }, error: null })),
    };

    const anonClient = {
      auth: {
        getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'admin-1' } }, error: null })),
      },
      from: vi.fn(),
    };

    const serviceClient: any = {
      auth: { getUser: vi.fn() },
      from: vi.fn((table: string) => {
        if (table === 'content_reports') return reportsTable;
        if (table === 'user_roles') return rolesTable;
        if (table === 'system_logs') return { insert: systemLogsInsert };
        throw new Error(`Unexpected table ${table}`);
      }),
    };

    const createClient = vi.fn((url: string, key: string) => (key === 'anon-key' ? anonClient : serviceClient));

    const handler = createReviewReportHandler({
      supabaseUrl: 'url',
      supabaseAnonKey: 'anon-key',
      supabaseServiceRoleKey: 'service-key',
      createClient,
    });

    const response = await handler(
      buildRequest({ reportId: 'report-1', action: 'resolve', notes: 'confirmed' }),
    );

    expect(response.status).toBe(200);
    expect(reportsTable.update).toHaveBeenCalled();
    expect(systemLogsInsert).toHaveBeenCalled();
  });

  it('broadcasts notifications respecting preferences', async () => {
    const systemLogsInsert = vi.fn(() => Promise.resolve({ error: null }));

    const notificationsTable = {
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          maybeSingle: vi.fn(() => Promise.resolve({ data: { id: 'notif-1', user_id: 'user-123' }, error: null })),
        })),
      })),
    };

    const rolesTable = {
      select: vi.fn(() => rolesTable),
      eq: vi.fn(() => rolesTable),
      maybeSingle: vi.fn(() => Promise.resolve({ data: { role: 'admin' }, error: null })),
    };

    const anonClient = {
      auth: {
        getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'admin-1' } }, error: null })),
      },
      from: vi.fn(),
    };

    const serviceClient: any = {
      auth: { getUser: vi.fn() },
      rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
      from: vi.fn((table: string) => {
        if (table === 'notifications') return notificationsTable;
        if (table === 'user_roles') return rolesTable;
        if (table === 'system_logs') return { insert: systemLogsInsert };
        throw new Error(`Unexpected table ${table}`);
      }),
    };

    const createClient = vi.fn((url: string, key: string) => (key === 'anon-key' ? anonClient : serviceClient));

    const handler = createBroadcastNotificationHandler({
      supabaseUrl: 'url',
      supabaseAnonKey: 'anon-key',
      supabaseServiceRoleKey: 'service-key',
      createClient,
    });

    const response = await handler(
      buildRequest({
        recipients: ['user-123'],
        type: 'order',
        title: 'Test',
        message: 'Hello',
      }),
    );

    expect(response.status).toBe(200);
    expect(notificationsTable.insert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user-123', type: 'order' }),
    );
    expect(systemLogsInsert).toHaveBeenCalled();
  });
});
