import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  deleteMembershipAccessRules,
  fetchMembershipAccessRules,
  upsertMembershipAccessRules,
} from '@/services/memberships/accessRules';

const { rpcMock, apiCallMock, errorMock } = vi.hoisted(() => ({
  rpcMock: vi.fn(),
  apiCallMock: vi.fn(),
  errorMock: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: rpcMock,
    from: vi.fn(),
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    apiCall: apiCallMock,
    error: errorMock,
  },
}));

describe('membership access rule service', () => {
  beforeEach(() => {
    rpcMock.mockReset();
    apiCallMock.mockReset();
    errorMock.mockReset();
  });

  it('fetches membership access rules via RPC', async () => {
    rpcMock.mockResolvedValueOnce({ data: { gate_type: 'any_tier' }, error: null });

    const result = await fetchMembershipAccessRules('release', 'rel-123');

    expect(rpcMock).toHaveBeenCalledWith('get_membership_access_rules', {
      p_content_type: 'release',
      p_content_id: 'rel-123',
    });
    expect(apiCallMock).toHaveBeenCalledWith('rpc', 'get_membership_access_rules', expect.any(Number), 200, {
      contentType: 'release',
      contentId: 'rel-123',
    });
    expect(result).toEqual({ gate_type: 'any_tier' });
  });

  it('surfaces fetch errors via logger', async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: 'boom' } });

    await expect(fetchMembershipAccessRules('beat', 'beat-1')).rejects.toEqual({ message: 'boom' });

    expect(errorMock).toHaveBeenCalledWith('membership_access_rules_fetch_failed', {
      contentType: 'beat',
      contentId: 'beat-1',
      error: 'boom',
    });
  });

  it('upserts membership access rules', async () => {
    rpcMock.mockResolvedValueOnce({ error: null });

    await upsertMembershipAccessRules({
      contentId: 'post-1',
      contentType: 'post',
      ownerId: 'owner-1',
      ownerType: 'profile',
      gateType: 'tier_or_higher',
      minimumTierId: 'tier-1',
      allowedTierIds: null,
      previewText: 'Preview',
      previewDuration: 30,
    });

    expect(rpcMock).toHaveBeenCalledWith('upsert_membership_access_rules', {
      p_content_id: 'post-1',
      p_content_type: 'post',
      p_owner_id: 'owner-1',
      p_owner_type: 'profile',
      p_gate_type: 'tier_or_higher',
      p_minimum_tier_id: 'tier-1',
      p_allowed_tier_ids: null,
      p_preview_text: 'Preview',
      p_preview_duration: 30,
    });
  });

  it('deletes membership access rules', async () => {
    rpcMock.mockResolvedValueOnce({ error: null });

    await deleteMembershipAccessRules('sample_pack', 'sp-1');

    expect(rpcMock).toHaveBeenCalledWith('delete_membership_access_rules', {
      p_content_type: 'sample_pack',
      p_content_id: 'sp-1',
    });
  });
});
