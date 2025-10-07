import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { handleChargeReversal, syncMembershipFromSubscription } from '../stripe-webhook/helpers';

describe('handleChargeReversal', () => {
  const insertMock = vi.fn();
  const maybeSingleMock = vi.fn();
  let supabaseClient: any;

  beforeEach(() => {
    insertMock.mockReset();
    maybeSingleMock.mockReset();

    const secondEqMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
    const firstEqMock = vi.fn().mockReturnValue({ eq: secondEqMock });
    const selectMock = vi.fn().mockReturnValue({ eq: firstEqMock });

    supabaseClient = {
      from: vi.fn(() => ({
        select: selectMock,
        insert: insertMock,
      })),
    };

    maybeSingleMock.mockResolvedValue({ data: null });
    insertMock.mockResolvedValue({ error: null });
  });

  it('re-credits wallet when charge metadata includes credits', async () => {
    const charge = {
      id: 'ch_123',
      metadata: {
        user_id: 'user-1',
        credits_applied: '120',
        manual_amount_credits: '80',
      },
    } as any;

    const logger = vi.fn();
    await handleChargeReversal(supabaseClient, charge, 'evt_1', 'refund', logger);

    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 'user-1',
      amount_credits: 120,
      meta: expect.objectContaining({ stripe_charge_id: 'ch_123', reason: 'refund' }),
    }));
  });

  it('does not double credit if reversal already exists', async () => {
    maybeSingleMock.mockResolvedValueOnce({ data: { id: 'existing' } });

    const charge = {
      id: 'ch_456',
      metadata: {
        user_id: 'user-2',
        credits_applied: '60',
      },
    } as any;

    const logger = vi.fn();
    await handleChargeReversal(supabaseClient, charge, 'evt_2', 'failure', logger);

    expect(insertMock).not.toHaveBeenCalled();
  });
});

describe('syncMembershipFromSubscription', () => {
  const logger = vi.fn();

  let membershipMaybeSingleResponses: Array<Promise<any>>;
  let membershipInsertResponses: Array<{ data: any; error: any }>;
  let membershipInsertPayloads: any[];
  let membershipUpdatePayloads: any[];
  let membershipActiveCount: number;
  let membershipTierResponse: { data: any; error: any };
  let membershipTiersUpdateMock: ReturnType<typeof vi.fn>;
  let systemLogsInsertMock: ReturnType<typeof vi.fn>;
  let discordInvokeMock: ReturnType<typeof vi.fn>;
  let supabaseClient: any;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));

    membershipMaybeSingleResponses = [];
    membershipInsertResponses = [];
    membershipInsertPayloads = [];
    membershipUpdatePayloads = [];
    membershipActiveCount = 0;
    membershipTierResponse = {
      data: { id: 'tier-1', owner_id: 'creator-1', owner_type: 'profile', name: 'VIP' },
      error: null,
    };

    const membershipTable: any = {
      lastOptions: undefined as any,
      eqCallCountForHead: 0,
      select: vi.fn(function (_columns: any, options?: any) {
        membershipTable.lastOptions = options;
        if (!options?.head) {
          membershipTable.eqCallCountForHead = 0;
        }
        return membershipTable;
      }),
      eq: vi.fn((column: string, value: any) => {
        if (membershipTable.lastOptions?.head) {
          membershipTable.eqCallCountForHead += 1;
          if (membershipTable.eqCallCountForHead === 2) {
            const result = Promise.resolve({ count: membershipActiveCount, error: null });
            membershipTable.eqCallCountForHead = 0;
            membershipTable.lastOptions = undefined;
            return result;
          }
          return membershipTable;
        }

        membershipTable.lastOptions = undefined;
        return membershipTable;
      }),
      maybeSingle: vi.fn(() => {
        const response = membershipMaybeSingleResponses.shift();
        return response ?? Promise.resolve({ data: null, error: null });
      }),
      insert: vi.fn((payload: any) => {
        membershipInsertPayloads.push(payload);
        const response =
          membershipInsertResponses.shift() ?? {
            data: { id: 'membership-new', user_id: payload.user_id },
            error: null,
          };
        return {
          select: vi.fn(() => ({
            maybeSingle: vi.fn(() => Promise.resolve(response)),
          })),
        };
      }),
      update: vi.fn((payload: any) => {
        membershipUpdatePayloads.push(payload);
        return Promise.resolve({ error: null });
      }),
    };

    membershipTiersUpdateMock = vi.fn(() => Promise.resolve({ error: null }));

    const membershipTiersTable: any = {
      select: vi.fn(() => membershipTiersTable),
      eq: vi.fn(() => membershipTiersTable),
      maybeSingle: vi.fn(() => Promise.resolve(membershipTierResponse)),
      update: membershipTiersUpdateMock,
    };

    systemLogsInsertMock = vi.fn(() => Promise.resolve({ error: null }));

    const systemLogsTable: any = {
      insert: systemLogsInsertMock,
    };

    discordInvokeMock = vi.fn(() => Promise.resolve({ data: null }));

    supabaseClient = {
      from: vi.fn((table: string) => {
        if (table === 'memberships') return membershipTable;
        if (table === 'membership_tiers') return membershipTiersTable;
        if (table === 'system_logs') return systemLogsTable;
        throw new Error(`Unexpected table ${table}`);
      }),
      functions: {
        invoke: discordInvokeMock,
      },
    };
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('creates a membership record and updates counts for an active subscription', async () => {
    membershipMaybeSingleResponses.push(
      Promise.resolve({ data: null, error: null }),
      Promise.resolve({ data: null, error: null })
    );
    membershipInsertResponses.push({ data: { id: 'membership-created', user_id: 'fan-123' }, error: null });
    membershipActiveCount = 1;

    const subscription = {
      id: 'sub_123',
      status: 'active',
      metadata: {
        membership_tier_id: 'tier-1',
        fan_id: 'fan-123',
        creator_id: 'creator-1',
        stripe_price_id: 'price_123',
      },
      current_period_start: 1704067200,
      current_period_end: 1706745600,
      cancel_at: null,
      cancel_at_period_end: false,
      customer: 'cus_123',
      items: {
        data: [
          {
            price: { id: 'price_123', recurring: { interval: 'month' } },
            plan: { interval: 'month' },
          },
        ],
      },
    } as any;

    const result = await syncMembershipFromSubscription(supabaseClient, subscription, logger);

    expect(result).toMatchObject({ processed: true, status: 'active', tierId: 'tier-1', userId: 'fan-123' });
    expect(membershipInsertPayloads).toHaveLength(1);
    expect(membershipInsertPayloads[0]).toMatchObject({
      tier_id: 'tier-1',
      user_id: 'fan-123',
      status: 'active',
      billing_period: 'monthly',
      stripe_subscription_id: 'sub_123',
    });
    expect(membershipInsertPayloads[0].metadata).toMatchObject({
      stripe_price_id: 'price_123',
      stripe_status: 'active',
    });
    expect(membershipTiersUpdateMock).toHaveBeenCalledWith({ current_members: 1 });
    expect(systemLogsInsertMock).toHaveBeenCalled();
    expect(discordInvokeMock).toHaveBeenCalledWith('discord-sync-subscriber', {
      body: {
        creator_id: 'creator-1',
        fan_user_id: 'fan-123',
        action: 'grant',
      },
    });
  });

  it('updates an existing membership when a subscription is cancelled', async () => {
    membershipMaybeSingleResponses.push(
      Promise.resolve({ data: { id: 'membership-1', user_id: 'fan-123', status: 'active' }, error: null })
    );
    membershipActiveCount = 0;

    const subscription = {
      id: 'sub_999',
      status: 'canceled',
      metadata: {
        membership_tier_id: 'tier-1',
        fan_id: 'fan-123',
        creator_id: 'creator-1',
      },
      current_period_start: 1704067200,
      current_period_end: 1706745600,
      cancel_at: 1706745600,
      cancel_at_period_end: true,
      canceled_at: 1705000000,
      customer: 'cus_123',
      items: {
        data: [
          {
            price: { id: 'price_123', recurring: { interval: 'month' } },
            plan: { interval: 'month' },
          },
        ],
      },
    } as any;

    const result = await syncMembershipFromSubscription(supabaseClient, subscription, logger);

    expect(result).toMatchObject({ processed: true, status: 'cancelled', tierId: 'tier-1', userId: 'fan-123' });
    expect(membershipUpdatePayloads).toHaveLength(1);
    expect(membershipUpdatePayloads[0]).toMatchObject({
      status: 'cancelled',
      cancelled_at: expect.any(String),
      expires_at: expect.any(String),
      stripe_subscription_id: 'sub_999',
    });
    expect(membershipTiersUpdateMock).toHaveBeenCalledWith({ current_members: 0 });
    expect(discordInvokeMock).toHaveBeenCalledWith('discord-sync-subscriber', {
      body: {
        creator_id: 'creator-1',
        fan_user_id: 'fan-123',
        action: 'revoke',
      },
    });
  });
});
