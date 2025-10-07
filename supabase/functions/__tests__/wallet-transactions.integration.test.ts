import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { SupabaseTestHarness } from './helpers/supabaseTestHarness';
import { processCreditsTransaction } from '../process-credits-transaction/logic';
import { handleChargeReversal } from '../stripe-webhook/helpers';
import type { SupabaseHarnessClient } from './helpers/supabaseTestHarness';

const harness = new SupabaseTestHarness();

async function seedTopup(client: SupabaseHarnessClient, userId: string, amount: number) {
  await client
    .from('wallet_ledger')
    .insert({
      user_id: userId,
      kind: 'topup',
      amount_credits: amount,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 72),
      meta: { seed: true },
    } as any);
}

describe('wallet transactions integration', () => {
  beforeAll(async () => {
    await harness.setup();
  });

  beforeEach(async () => {
    await harness.reset();
  });

  it('records purchase spend and counterparty earnings', async () => {
    const supabase = harness.createClient();
    const buyerId = await harness.createUser();
    const sellerId = await harness.createUser();
    const orderId = await harness.createOrder({ userId: buyerId, totalAmount: 200 });

    await seedTopup(supabase, buyerId, 500);

    await processCreditsTransaction(supabase as any, buyerId, {
      amount_credits: -200,
      kind: 'spend_purchase',
      ref_type: 'order',
      ref_id: orderId,
      counterparty_user_id: sellerId,
      meta: { order_number: 'ORD-1001' },
    });

    const ledger = await harness.getLedgerEntries();
    expect(ledger).toHaveLength(3);

    const buyerSpend = ledger.find((entry) => entry.user_id === buyerId && entry.amount_credits === -200);
    const sellerEarn = ledger.find((entry) => entry.user_id === sellerId && entry.amount_credits === 200);

    expect(buyerSpend).toMatchObject({
      kind: 'spend_purchase',
      counterparty_user_id: sellerId,
      ref_id: orderId,
    });

    expect(sellerEarn).toMatchObject({
      kind: 'spend_purchase',
      counterparty_user_id: buyerId,
      ref_id: orderId,
    });
  });

  it('reverses wallet entries on refund events', async () => {
    const supabase = harness.createClient();
    const buyerId = await harness.createUser();
    const sellerId = await harness.createUser();
    const orderId = await harness.createOrder({ userId: buyerId, totalAmount: 200 });

    await seedTopup(supabase, buyerId, 500);

    await processCreditsTransaction(supabase as any, buyerId, {
      amount_credits: -200,
      kind: 'spend_purchase',
      ref_type: 'order',
      ref_id: orderId,
      counterparty_user_id: sellerId,
      meta: { order_number: 'ORD-2002', stripe_charge_id: 'ch_123' },
    });

    const logger = vi.fn();
    await handleChargeReversal(
      supabase as any,
      {
        id: 'ch_123',
        metadata: {
          user_id: buyerId,
          credits_applied: '200',
          manual_amount_credits: '200',
        },
      } as any,
      'evt_refund_1',
      'refund',
      logger,
    );

    const ledger = await harness.getLedgerEntries();
    expect(ledger).toHaveLength(4);

    const refundEntry = ledger.find((entry) => entry.user_id === buyerId && entry.amount_credits === 200);
    expect(refundEntry).toBeTruthy();
    expect(refundEntry?.meta?.stripe_event_id).toBe('evt_refund_1');
    expect(refundEntry?.meta?.reason).toBe('refund');

    const sellerBalance = ledger
      .filter((entry) => entry.user_id === sellerId)
      .reduce((sum, entry) => sum + entry.amount_credits, 0);

    expect(sellerBalance).toBe(200);
    expect(logger).toHaveBeenCalledWith('Recredited wallet after charge reversal', {
      chargeId: 'ch_123',
      creditsApplied: 200,
      reason: 'refund',
    });
  });

  it('prevents claw-back when counterparty balance is insufficient', async () => {
    const supabase = harness.createClient();
    const buyerId = await harness.createUser();
    const sellerId = await harness.createUser();
    const orderId = await harness.createOrder({ userId: buyerId, totalAmount: 200 });

    await seedTopup(supabase, buyerId, 400);

    await processCreditsTransaction(supabase as any, buyerId, {
      amount_credits: -200,
      kind: 'spend_purchase',
      ref_type: 'order',
      ref_id: orderId,
      counterparty_user_id: sellerId,
      meta: { order_number: 'ORD-3003' },
    });

    await expect(
      processCreditsTransaction(supabase as any, sellerId, {
        amount_credits: -300,
        kind: 'spend_purchase',
        ref_type: 'clawback',
        ref_id: orderId,
        counterparty_user_id: buyerId,
        meta: { reason: 'refund_clawback' },
      }),
    ).rejects.toThrow('Insufficient credits');

    const ledger = await harness.getLedgerEntries();
    const sellerEntries = ledger.filter((entry) => entry.user_id === sellerId);
    expect(sellerEntries).toHaveLength(1);
    expect(sellerEntries[0].amount_credits).toBe(200);
  });
});
