import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import useMembershipAccessRuleEditor from '../useMembershipAccessRuleEditor';

let mockTierRows: any[] = [];

const mockFetchMembershipAccessRules = vi.fn();
const mockUpsertMembershipAccessRules = vi.fn();
const mockDeleteMembershipAccessRules = vi.fn();

vi.mock('@/integrations/supabase/client', () => {
  const createQueryBuilder = () => {
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockImplementation(() =>
        Promise.resolve({
          data: mockTierRows,
          error: null,
        }),
      ),
    };
  };

  return {
    supabase: {
      from: vi.fn(() => createQueryBuilder()),
    },
  };
});

vi.mock('@/services/memberships/accessRules', () => ({
  fetchMembershipAccessRules: (...args: any[]) => mockFetchMembershipAccessRules(...args),
  upsertMembershipAccessRules: (...args: any[]) => mockUpsertMembershipAccessRules(...args),
  deleteMembershipAccessRules: (...args: any[]) => mockDeleteMembershipAccessRules(...args),
}));

vi.mock('@/hooks/useLogger', () => ({
  useLogger: () => ({
    logEvent: vi.fn().mockResolvedValue(undefined),
    logWarn: vi.fn().mockResolvedValue(undefined),
    logError: vi.fn().mockResolvedValue(undefined),
  }),
}));

const resolveOwner = () => ({
  ownerType: 'profile' as const,
  ownerId: 'owner-1',
});

describe('useMembershipAccessRuleEditor', () => {
  beforeEach(() => {
    mockTierRows = [];
    mockFetchMembershipAccessRules.mockReset();
    mockUpsertMembershipAccessRules.mockReset();
    mockDeleteMembershipAccessRules.mockReset();
  });

  it('returns validation issues when gating enabled without tiers', async () => {
    const { result } = renderHook(() =>
      useMembershipAccessRuleEditor({
        contentType: 'release',
        resolveOwner,
      }),
    );

    await waitFor(() => expect(result.current.tiersLoading).toBe(false));

    act(() => result.current.setGateEnabled(true));

    expect(result.current.validationIssues).toContain(
      'Create at least one active membership tier before enabling gating.',
    );
  });

  it('derives preview summary for tier or higher selection', async () => {
    mockTierRows = [
      {
        id: 'tier_basic',
        name: 'Supporter',
        tier_order: 0,
        status: 'active',
        price_monthly: 500,
        price_yearly: null,
        price_lifetime: null,
        currency: 'USD',
      },
    ];

    const { result } = renderHook(() =>
      useMembershipAccessRuleEditor({
        contentType: 'release',
        resolveOwner,
      }),
    );

    await waitFor(() => expect(result.current.tiersLoading).toBe(false));

    act(() => {
      result.current.setGateEnabled(true);
      result.current.setGateType('tier_or_higher');
      result.current.setMinimumTierId('tier_basic');
    });

    expect(result.current.validationIssues).toHaveLength(0);
    expect(result.current.previewSummary.minimumTier?.id).toBe('tier_basic');
  });

  it('throws when attempting to save invalid configuration', async () => {
    const { result } = renderHook(() =>
      useMembershipAccessRuleEditor({
        contentType: 'release',
        resolveOwner,
      }),
    );

    await waitFor(() => expect(result.current.tiersLoading).toBe(false));

    act(() => result.current.setGateEnabled(true));

    await expect(result.current.saveRulesFor('content-123')).rejects.toThrow();
  });

  it('persists rules when configuration is valid', async () => {
    mockTierRows = [
      {
        id: 'tier_basic',
        name: 'Supporter',
        tier_order: 0,
        status: 'active',
        price_monthly: 500,
        price_yearly: null,
        price_lifetime: null,
        currency: 'USD',
      },
    ];

    const { result } = renderHook(() =>
      useMembershipAccessRuleEditor({
        contentType: 'release',
        resolveOwner,
      }),
    );

    await waitFor(() => expect(result.current.tiersLoading).toBe(false));

    act(() => {
      result.current.setGateEnabled(true);
      result.current.setGateType('tier_or_higher');
      result.current.setMinimumTierId('tier_basic');
    });

    await act(async () => {
      await result.current.saveRulesFor('content-123');
    });

    expect(mockUpsertMembershipAccessRules).toHaveBeenCalledWith(
      expect.objectContaining({
        contentId: 'content-123',
        minimumTierId: 'tier_basic',
        gateType: 'tier_or_higher',
      }),
    );
  });
});
