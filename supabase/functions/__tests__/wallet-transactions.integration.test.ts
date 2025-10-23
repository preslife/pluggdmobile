import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { SupabaseTestHarness } from './helpers/supabaseTestHarness';
import { processCreditsTransaction } from '../process-credits-transaction/logic';
import { performManualTransactionFallback } from '../process-credits-transaction/manualFallback';
import { handleChargeReversal } from '../stripe-webhook/helpers';
import type { SupabaseHarnessClient } from './helpers/supabaseTestHarness';

const harness = new SupabaseTestHarness();

async function seedTopup(client: SupabaseHarnessClient, userId: string, amount: number) {
  const { data, error } = await client
    .from('wallet_ledger')
    .insert({
      user_id: userId,
      kind: 'topup',
      amount_credits: amount,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 72),
      meta: { seed: true },
    } as any);

  if (error) {
    throw new Error(`Failed to seed topup: ${error.message}`);
  }

  return Array.isArray(data) ? data[0] : data;
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

  it('falls back to manual inserts when the RPC is unavailable', async () => {
    const supabase = harness.createClient();
    const buyerId = await harness.createUser();
    const sellerId = await harness.createUser();
    const orderId = await harness.createOrder({ userId: buyerId, totalAmount: 150 });

    await seedTopup(supabase, buyerId, 400);

    const result = await performManualTransactionFallback(supabase as any, buyerId, {
      amount_credits: -150,
      kind: 'spend_purchase',
      ref_type: 'order',
      ref_id: orderId,
      counterparty_user_id: sellerId,
      meta: { order_number: 'ORD-FALLBACK' },
    });

    expect(result.ledgerEntryId).toBeTruthy();
    expect(result.manualEntryId).toBeNull();
    expect(result.counterpartyError).toBeNull();

    const ledger = await harness.getLedgerEntries();
    expect(ledger).toHaveLength(3);

    const buyerSpend = ledger.find((entry) => entry.user_id === buyerId && entry.amount_credits === -150);
    const sellerEarn = ledger.find((entry) => entry.user_id === sellerId && entry.amount_credits === 150);

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

    const logger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as any;
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

    const spendEntry = ledger.find(
      (entry) => entry.user_id === buyerId && entry.amount_credits === -200 && entry.kind === 'spend_purchase',
    );
    const refundEntry = ledger.find((entry) => entry.user_id === buyerId && entry.amount_credits === 200);
    expect(refundEntry).toBeTruthy();
    expect(refundEntry?.meta?.stripe_event_id).toBe('evt_refund_1');
    expect(refundEntry?.meta?.reason).toBe('refund');
    expect(refundEntry?.reversal_of_entry_id).toBe(spendEntry?.id);

    const sellerBalance = ledger
      .filter((entry) => entry.user_id === sellerId)
      .reduce((sum, entry) => sum + entry.amount_credits, 0);

    expect(sellerBalance).toBe(200);
    expect(logger.info).toHaveBeenCalledWith('charge_reversal_recredited', {
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

  it('tracks running balances for credit purchase, spend, and refund lifecycle', async () => {
    const supabase = harness.createClient();
    const buyerId = await harness.createUser();
    const sellerId = await harness.createUser();
    const orderId = await harness.createOrder({ userId: buyerId, totalAmount: 300 });

    await seedTopup(supabase, buyerId, 1000);

    let balance = await supabase.rpc('get_wallet_balance', { p_user_id: buyerId });
    expect(balance.data?.balance_credits).toBe(1000);
    expect(balance.data?.pending_credits).toBe(0);
    expect(balance.data?.available_credits).toBe(1000);

    await processCreditsTransaction(supabase as any, buyerId, {
      amount_credits: -300,
      kind: 'spend_purchase',
      ref_type: 'order',
      ref_id: orderId,
      counterparty_user_id: sellerId,
      meta: { order_number: 'ORD-RUN-1' },
    });

    balance = await supabase.rpc('get_wallet_balance', { p_user_id: buyerId });
    expect(balance.data?.balance_credits).toBe(700);
    expect(balance.data?.pending_credits).toBe(0);
    expect(balance.data?.available_credits).toBe(700);

    const logger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as any;
    await handleChargeReversal(
      supabase as any,
      {
        id: 'ch_run_1',
        metadata: {
          user_id: buyerId,
          credits_applied: '300',
          manual_amount_credits: '300',
        },
      } as any,
      'evt_run_refund',
      'refund',
      logger,
    );

    const buyerEntries = (await harness.getLedgerEntries()).filter((entry) => entry.user_id === buyerId);
    expect(buyerEntries).toHaveLength(3);

    const [topup, spend, refund] = buyerEntries;
    expect(topup.balance_before).toBe(0);
    expect(topup.balance_after).toBe(1000);
    expect(spend.balance_before).toBe(1000);
    expect(spend.balance_after).toBe(700);
    expect(refund.balance_before).toBe(700);
    expect(refund.balance_after).toBe(1000);

    expect(logger.warn).toHaveBeenCalledWith('charge_reversal_original_entry_missing', {
      chargeId: 'ch_run_1',
      userId: buyerId,
    });
    expect(logger.info).toHaveBeenCalledWith('charge_reversal_recredited', {
      chargeId: 'ch_run_1',
      creditsApplied: 300,
      reason: 'refund',
    });

    balance = await supabase.rpc('get_wallet_balance', { p_user_id: buyerId });
    expect(balance.data?.balance_credits).toBe(1000);
    expect(balance.data?.pending_credits).toBe(0);
    expect(balance.data?.available_credits).toBe(1000);
  });

  it('rejects direct ledger inserts that would violate balance integrity', async () => {
    const supabase = harness.createClient();
    const userId = await harness.createUser();

    const { error: topupError } = await supabase.from('wallet_ledger').insert({
      user_id: userId,
      kind: 'topup',
      amount_credits: 150,
    } as any);

    expect(topupError).toBeNull();

    const { error: overspendError } = await supabase.from('wallet_ledger').insert({
      user_id: userId,
      kind: 'spend_purchase',
      amount_credits: -300,
      ref_type: 'manual_test',
    } as any);

    expect(overspendError?.message).toContain('Insufficient credits');

    const entries = await harness.getLedgerEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].balance_after).toBe(150);
  });

  it('links reversal entries and allows compliant chargebacks', async () => {
    const supabase = harness.createClient();
    const userId = await harness.createUser();

    const topup = await seedTopup(supabase, userId, 400);

    await processCreditsTransaction(supabase as any, userId, {
      amount_credits: -300,
      kind: 'spend_purchase',
      ref_type: 'order',
      ref_id: await harness.createOrder({ userId, totalAmount: 300 }),
      meta: { order_number: 'REV-ORDER-1' },
    });

    const { error: reversalError } = await supabase.from('wallet_ledger').insert({
      user_id: userId,
      kind: 'convert_cashout',
      amount_credits: -400,
      reversal_of_entry_id: topup?.id,
      meta: { reason: 'chargeback' },
    } as any);

    expect(reversalError).toBeNull();

    const entries = await harness.getLedgerEntries();
    const reversal = entries.find((entry) => entry.reversal_of_entry_id === topup?.id);
    expect(reversal).toBeTruthy();
    expect(reversal?.balance_before).toBe(100);
    expect(reversal?.balance_after).toBe(-300);

    const { error: duplicateError } = await supabase.from('wallet_ledger').insert({
      user_id: userId,
      kind: 'convert_cashout',
      amount_credits: -100,
      reversal_of_entry_id: topup?.id,
      meta: { reason: 'duplicate' },
    } as any);

    expect(duplicateError?.message).toContain('already reversed');
  });
});
