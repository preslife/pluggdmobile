/// <reference types="vitest" />

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';


const mockToast = vi.fn();
const mockUseAuth = vi.fn();

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

const loggerSpies = vi.hoisted(() => {
  const logEvent = vi.fn(async () => {});
  const logError = vi.fn(async () => {});
  const logUserAction = vi.fn(async () => {});
  const logApiCall = vi.fn(async () => {});
  const logWarn = vi.fn(async () => {});
  const logDebug = vi.fn(async () => {});
  const logPerformance = vi.fn(async () => {});
  const trackPromise = vi.fn(async (_event: string, operation: () => Promise<any>) => operation());
  const childLogger = {
    setLevel: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    userAction: vi.fn(),
    performance: vi.fn(),
    apiCall: vi.fn(),
    child: vi.fn(() => childLogger),
  } as any;

  const reset = () => {
    logEvent.mockClear();
    logError.mockClear();
    logUserAction.mockClear();
    logApiCall.mockClear();
    logWarn.mockClear();
    logDebug.mockClear();
    logPerformance.mockClear();
    trackPromise.mockClear();
    Object.values(childLogger).forEach((spy) => {
      (spy as any)?.mockClear?.();
    });
  };

  return {
    logEvent,
    logError,
    logUserAction,
    logApiCall,
    logWarn,
    logDebug,
    logPerformance,
    trackPromise,
    childLogger,
    reset,
  };
});

vi.mock('@/hooks/useLogger', () => ({
  useLogger: () => ({
    logger: loggerSpies.childLogger,
    correlationId: 'moderation-test-corr',
    logEvent: loggerSpies.logEvent,
    logError: loggerSpies.logError,
    logUserAction: loggerSpies.logUserAction,
    logApiCall: loggerSpies.logApiCall,
    logWarn: loggerSpies.logWarn,
    logDebug: loggerSpies.logDebug,
    logPerformance: loggerSpies.logPerformance,
    trackPromise: loggerSpies.trackPromise,
  }),
  loggerSpies,
}));

interface TableResponse {
  data?: any;
  error?: { message: string } | Error | null;
  count?: number | null;
}

const { module: supabaseClientMock, helpers: supabaseMocks } = vi.hoisted(() => {
  let tableResponses: Record<string, TableResponse> = {};

  const buildResult = (table: string) => {
    const response = tableResponses[table] ?? {};
    const data = response.data ?? [];
    return {
      data: data,
      error: response.error ?? null,
      count: response.count ?? (Array.isArray(data) ? data.length : null),
    };
  };

  const mockFrom = vi.fn((table: string) => {
    const builder: any = {
      select: vi.fn(() => builder),
      order: vi.fn(() => builder),
      eq: vi.fn(() => builder),
      gte: vi.fn(() => builder),
      in: vi.fn(() => builder),
      limit: vi.fn(() => builder),
      update: vi.fn(() => Promise.resolve({ data: null, error: null })),
      insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
      single: vi.fn(() => Promise.resolve(buildResult(table))),
      maybeSingle: vi.fn(() => Promise.resolve(buildResult(table))),
      then: (resolve: any, reject?: any) => Promise.resolve(buildResult(table)).then(resolve, reject),
      catch: (reject: any) => Promise.resolve(buildResult(table)).catch(reject),
      finally: (onFinally: any) => Promise.resolve(buildResult(table)).finally(onFinally),
    };

    return builder;
  });

  const mockInvoke = vi.fn();

  return {
    module: {
      supabase: {
        from: (table: string) => mockFrom(table),
        functions: { invoke: mockInvoke },
      },
    },
    helpers: {
      mockFrom,
      mockInvoke,
      reset: () => {
        tableResponses = {};
        mockFrom.mockClear();
        mockInvoke.mockClear();
      },
      setResponses: (responses: Record<string, TableResponse>) => {
        tableResponses = responses;
      },
      updateResponse: (table: string, updater: (current: TableResponse) => TableResponse) => {
        tableResponses[table] = updater(tableResponses[table] ?? {});
      },
    },
  };
});

vi.mock('@/integrations/supabase/client', () => supabaseClientMock);

import ModerationDashboard from '../ModerationDashboard';

const { setResponses, updateResponse, reset, mockInvoke } = supabaseMocks;

const user = userEvent.setup();

const baseModerationItem = {
  id: 'item-1',
  item_type: 'release',
  item_id: 'release-1',
  status: 'pending',
  severity: 'high',
  created_at: new Date().toISOString(),
  reason: null,
  reported_by: null,
};

const baseReport = {
  id: 'report-1',
  reporter_id: 'fan-1',
  target_type: 'release',
  target_id: 'release-2',
  reason: 'spam',
  description: 'Looks suspicious',
  status: 'pending',
  created_at: new Date().toISOString(),
};

beforeEach(() => {
  reset();
  mockToast.mockReset();
  mockUseAuth.mockReturnValue({ user: { id: 'admin-1' }, loading: false });
  loggerSpies.reset();
});

afterEach(() => {
  cleanup();
});

describe('ModerationDashboard', () => {
  it('approves a moderation item through the edge function and updates the UI', async () => {
    setResponses({
      moderation_items: { data: [baseModerationItem] },
      content_reports: { data: [] },
      releases: { data: { title: 'Sample Release', artist: 'Artist', description: 'Desc', genre: 'Hip Hop' } },
      moderation_actions: { count: 0 },
    });

    mockInvoke.mockImplementation(async (_name, options) => {
      const body = options?.body as { itemIds: string[]; action: string };
      updateResponse('moderation_items', current => ({
        ...current,
        data: (current.data as any[]).map(item => (
          body.itemIds.includes(item.id) ? { ...item, status: 'approved' } : item
        )),
      }));

      return {
        data: {
          results: body.itemIds.map(id => ({ itemId: id, status: 'approved', success: true })),
        },
        error: null,
      };
    });

    await act(async () => {
      render(<ModerationDashboard />);
    });

    await waitFor(() => expect(screen.getByText('Approve')).toBeInTheDocument());

    await user.click(screen.getByText('Approve'));

    await waitFor(() =>
      expect(mockInvoke).toHaveBeenCalledWith(
        'moderation-review',
        expect.objectContaining({
          body: expect.objectContaining({ action: 'approve', itemIds: ['item-1'] }),
        }),
      ),
    );

    await waitFor(() => expect(screen.getByText(/Approved/i)).toBeInTheDocument());
  });

  it('closes a reported item and reflects the closed state', async () => {
    setResponses({
      moderation_items: { data: [] },
      content_reports: { data: [baseReport] },
      releases: { data: { title: 'Reported Release', artist: 'Owner', description: null, genre: null } },
      moderation_actions: { count: 0 },
    });

    mockInvoke.mockImplementation(async (_name, options) => {
      const body = options?.body as { itemIds: string[]; action: string };
      return {
        data: {
          results: body.itemIds.map(id => ({ itemId: id, status: 'rejected', reportStatus: 'dismissed', success: true })),
        },
        error: null,
      };
    });

    await act(async () => {
      render(<ModerationDashboard />);
    });

    const reportsTab = await screen.findByRole('tab', { name: 'Reports' });
    await user.click(reportsTab);

    await screen.findByText(/Report: spam/i);

    await user.click(screen.getByText('Close'));

    await waitFor(() =>
      expect(mockInvoke).toHaveBeenCalledWith(
        'moderation-review',
        expect.objectContaining({
          body: expect.objectContaining({ action: 'close', itemIds: ['report-1'] }),
        }),
      ),
    );

    await waitFor(() => expect(screen.getByText(/closed/i)).toBeInTheDocument());
  });

  it('handles batch approval for selected items', async () => {
    const secondItem = {
      ...baseReport,
      id: 'report-2',
      reason: 'duplicate content',
    };

    setResponses({
      moderation_items: { data: [] },
      content_reports: { data: [baseReport, secondItem] },
      releases: { data: { title: 'Reported Release', artist: 'Owner', description: null, genre: null } },
      moderation_actions: { count: 0 },
    });

    mockInvoke.mockImplementation(async (_name, options) => {
      const body = options?.body as { itemIds: string[]; action: string };
      return {
        data: {
          results: body.itemIds.map(id => ({ itemId: id, status: 'approved', reportStatus: 'resolved', success: true })),
        },
        error: null,
      };
    });

    await act(async () => {
      render(<ModerationDashboard />);
    });

    const reportsTab = await screen.findByRole('tab', { name: 'Reports' });
    await user.click(reportsTab);

    const checkboxes = await screen.findAllByTestId(/moderation-select-/);
    expect(checkboxes).toHaveLength(2);

    await user.click(screen.getByTestId('moderation-select-report-1'));
    await user.click(screen.getByTestId('moderation-select-report-2'));

    await waitFor(() => expect(screen.getByText(/2 items selected/i)).toBeInTheDocument());

    await user.click(screen.getByText(/Approve Selected/i));

    await waitFor(() =>
      expect(mockInvoke).toHaveBeenCalledWith(
        'moderation-review',
        expect.objectContaining({
          body: expect.objectContaining({ action: 'approve', itemIds: ['report-1', 'report-2'] }),
        }),
      ),
    );

    await waitFor(() => expect(screen.queryByText(/items selected/i)).not.toBeInTheDocument());
  });
});

