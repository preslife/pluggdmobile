import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { SubscriptionGatedContent } from '../SubscriptionGatedContent';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

const mocks = vi.hoisted(() => {
  const channelOn = vi.fn().mockReturnThis();
  const channelSubscribe = vi.fn().mockReturnThis();
  return {
    rpcMock: vi.fn(),
    orderMock: vi.fn(),
    eqMock: vi.fn(),
    selectMock: vi.fn(),
    channelFactory: vi.fn(() => ({ on: channelOn, subscribe: channelSubscribe })),
    channelOnMock: channelOn,
    channelSubscribeMock: channelSubscribe,
    removeChannelMock: vi.fn(),
  };
});

vi.mock('@/integrations/supabase/client', () => {
  const fromMock = (table: string) => ({
    select: mocks.selectMock.mockReturnThis(),
    eq: mocks.eqMock.mockReturnThis(),
    order: mocks.orderMock.mockImplementation(() =>
      Promise.resolve({
        data:
          table === 'membership_tiers'
            ? [
                {
                  id: 'tier-1',
                  name: 'Gold',
                  tier_order: 0,
                  status: 'active',
                  price_monthly: 500,
                  price_yearly: null,
                  price_lifetime: null,
                  currency: 'USD',
                },
              ]
            : [],
        error: null,
      })
    ),
  });

  return {
    supabase: {
      rpc: mocks.rpcMock,
      from: fromMock,
      channel: mocks.channelFactory,
      removeChannel: mocks.removeChannelMock,
    },
  };
});

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    apiCall: vi.fn(),
    userAction: vi.fn(),
  },
}));

describe('SubscriptionGatedContent', () => {
  beforeEach(() => {
    mocks.rpcMock.mockReset();
    mocks.selectMock.mockClear();
    mocks.eqMock.mockClear();
    mocks.orderMock.mockClear();
    mocks.channelOnMock.mockReset();
    mocks.channelOnMock.mockReturnThis();
    mocks.channelSubscribeMock.mockReset();
    mocks.channelSubscribeMock.mockReturnThis();
    mocks.channelFactory.mockReset();
    mocks.channelFactory.mockReturnValue({ on: mocks.channelOnMock, subscribe: mocks.channelSubscribeMock });
    mocks.removeChannelMock.mockReset();
  });

  it('shows gating message when membership access is denied', async () => {
    mocks.rpcMock.mockImplementation((fnName: string) => {
      if (fnName === 'get_membership_access_rules') {
        return Promise.resolve({
          data: {
            gate_type: 'tier_or_higher',
            minimum_tier_id: 'tier-1',
            allowed_tier_ids: null,
            preview_text: null,
            preview_duration: null,
            owner_id: 'owner-1',
            owner_type: 'profile',
          },
          error: null,
        });
      }
      if (fnName === 'check_content_access') {
        return Promise.resolve({ data: false, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });

    render(
      <SubscriptionGatedContent contentId="beat-1" contentType="beat" creatorId="owner-1">
        <div>Secret Content</div>
      </SubscriptionGatedContent>
    );

    await waitFor(() => {
      expect(mocks.rpcMock).toHaveBeenCalledWith(
        'check_content_access',
        expect.objectContaining({
          p_content_id: 'beat-1',
          p_content_type: 'beat',
          p_user_id: 'user-1',
        })
      );
    });

    expect(screen.getByText(/exclusive to supporters/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /unlock with membership/i })).toBeInTheDocument();
    expect(screen.getByText(/gold tier or higher/i)).toBeInTheDocument();
  });

  it('renders children when membership access is granted', async () => {
    mocks.rpcMock.mockImplementation((fnName: string) => {
      if (fnName === 'get_membership_access_rules') {
        return Promise.resolve({
          data: {
            gate_type: 'tier_or_higher',
            minimum_tier_id: 'tier-1',
            allowed_tier_ids: null,
            preview_text: null,
            preview_duration: null,
            owner_id: 'owner-1',
            owner_type: 'profile',
          },
          error: null,
        });
      }
      if (fnName === 'check_content_access') {
        return Promise.resolve({ data: true, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });

    render(
      <SubscriptionGatedContent contentId="beat-1" contentType="beat" creatorId="owner-1">
        <div>Secret Content</div>
      </SubscriptionGatedContent>
    );

    await waitFor(() => {
      expect(screen.getByText('Secret Content')).toBeInTheDocument();
    });
  });
});
