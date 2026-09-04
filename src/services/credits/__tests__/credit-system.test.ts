import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { creditSystem, type PurchaseItem } from '../credit-system';
import { creditPolicyService } from '../credit-policy';

describe('CreditSystemService.processPurchase', () => {
  const baseSummary = {
    balance_credits: 0,
    pending_credits: 0,
    available_credits: 0,
    total_earned: 0,
    total_spent: 0,
  };

  let getBalanceSummarySpy: ReturnType<typeof vi.spyOn>;
  let spendCreditsSpy: ReturnType<typeof vi.spyOn>;
  let createDownloadSpy: ReturnType<typeof vi.spyOn>;
  let policySpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    policySpy = vi
      .spyOn(creditPolicyService, 'getCurrentPolicy')
      .mockResolvedValue({ maxCartPercent: 0.5 });

    getBalanceSummarySpy = vi
      .spyOn(creditSystem, 'getBalanceSummary')
      .mockResolvedValue({
        ...baseSummary,
        available_credits: 500,
        balance_credits: 500,
      });

    spendCreditsSpy = vi
      .spyOn(creditSystem, 'spendCredits')
      .mockResolvedValue({ ledgerEntryId: 'ledger-1', manualEntryId: 'manual-1' });

    createDownloadSpy = vi
      .spyOn(creditSystem as any, 'createDownloadRecords')
      .mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('caps credit usage based on policy and available balance', async () => {
    const items: PurchaseItem[] = [
      { id: 'item-1', type: 'release', title: 'Release Unlock', price: 200 },
    ];

    policySpy.mockResolvedValue({ maxCartPercent: 0.4 });
    getBalanceSummarySpy.mockResolvedValue({
      ...baseSummary,
      available_credits: 120,
    });

    const result = await creditSystem.processPurchase('user-1', items, {
      requestedCredits: 200,
    });

    expect(result.creditsUsed).toBe(80);
    expect(result.cashDue).toBe(120);
    expect(result.appliedCredits).toBe(80);
    expect(result.maxCreditsAllowed).toBe(80);
    expect(result.cartTotal).toBe(200);

    expect(spendCreditsSpy).toHaveBeenCalledWith(
      'user-1',
      80,
      'spend_purchase',
      expect.objectContaining({
        product_id: 'item-1',
        max_credit_percentage: 0.4,
        requested_credits: 80,
        manual_entry: expect.objectContaining({
          amount_credits: 80,
          direction: 'debit',
        }),
      }),
    );
  });

  it('creates download records when credits cover entire cart', async () => {
    const items: PurchaseItem[] = [
      { id: 'release-1', type: 'release', title: 'Release One', price: 30 },
      { id: 'release-2', type: 'release', title: 'Release Two', price: 20 },
    ];

    const result = await creditSystem.processPurchase('user-2', items, {
      requestedCredits: 50,
      maxCreditPercentage: 1,
    });

    expect(result.cashDue).toBe(0);
    expect(result.creditsUsed).toBe(50);
    expect(createDownloadSpy).toHaveBeenCalledWith('user-2', items);
    expect(spendCreditsSpy).toHaveBeenCalledTimes(2);
  });

  it('respects requestedCreditSpend when provided', async () => {
    const items: PurchaseItem[] = [
      { id: 'release-3', type: 'release', title: 'Release Three', price: 150 },
    ];

    const result = await creditSystem.processPurchase('user-3', items, {
      requestedCreditSpend: 60,
    });

    expect(result.creditsUsed).toBe(60);
    expect(spendCreditsSpy).toHaveBeenCalledWith(
      'user-3',
      60,
      'spend_purchase',
      expect.objectContaining({
        requested_credits: 60,
        manual_entry: expect.objectContaining({ amount_credits: 60 }),
      }),
    );
  });

  it('allows previewing credit usage without spending', async () => {
    const items: PurchaseItem[] = [
      { id: 'preview-1', type: 'release', title: 'Preview Item', price: 80 },
    ];

    policySpy.mockResolvedValue({ maxCartPercent: 1 });

    const result = await creditSystem.processPurchase('user-preview', items, {
      requestedCredits: 80,
      previewOnly: true,
      maxCreditPercentage: 1,
    });

    expect(result.creditsUsed).toBe(80);
    expect(result.cashDue).toBe(0);
    expect(spendCreditsSpy).not.toHaveBeenCalled();
    expect(createDownloadSpy).not.toHaveBeenCalled();
  });

  it('never applies credits to beat licences or other excluded products', async () => {
    const items: PurchaseItem[] = [
      { id: 'beat-1', type: 'beat', title: 'Beat Licence', price: 100 },
      { id: 'membership-1', type: 'membership', title: 'Membership', price: 50 },
      { id: 'merch-1', type: 'merchandise', title: 'T-shirt', price: 30 },
    ];

    const result = await creditSystem.processPurchase('user-excluded', items, {
      requestedCredits: 180,
      maxCreditPercentage: 1,
      previewOnly: true,
    });

    expect(result.creditsUsed).toBe(0);
    expect(result.cashDue).toBe(180);
    expect(result.maxCreditsAllowed).toBe(0);
    expect(spendCreditsSpy).not.toHaveBeenCalled();
  });
});
