import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleChargeReversal } from '../stripe-webhook/helpers';

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
