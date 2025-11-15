import { supabase } from '@/integrations/supabase/client';
import { creditPolicyService } from './credit-policy';

export type WalletTransactionKind =
  | 'topup'
  | 'spend_tip'
  | 'spend_purchase'
  | 'spend_battle'
  | 'award_prize'
  | 'convert_cashout'
  | 'convert_sub_applied'
  | 'spend_gift'
  | 'earn_gift';

export const PURCHASE_ITEM_TYPES = [
  'beat',
  'release',
  'sample_pack',
  'membership',
  'course',
  'merchandise',
  'digital_download',
  'software',
  'digital',
  'physical',
  'hardware',
  'bundle',
] as const;

export type PurchaseItemType = (typeof PURCHASE_ITEM_TYPES)[number];

export interface CreditTransaction {
  id: string;
  user_id: string;
  kind: WalletTransactionKind;
  amount_credits: number;
  ref_type?: string | null;
  ref_id?: string | null;
  counterparty_user_id?: string | null;
  meta?: Record<string, any> | null;
  created_at: string;
}

export interface TransactionFilters {
  kind?: WalletTransactionKind;
  startDate?: string;
  endDate?: string;
}

interface TransactionHistoryOptions {
  limit?: number;
  offset?: number;
  filters?: TransactionFilters;
}

export interface WalletBalanceSummary {
  balance_credits: number;
  pending_credits: number;
  available_credits: number;
  total_earned: number;
  total_spent: number;
}

export interface ManualWalletEntryPayload {
  order_id?: string | null;
  item_type?: string | null;
  item_id?: string | null;
  operator_id?: string | null;
  direction?: 'debit' | 'credit';
  amount_credits: number;
  metadata?: Record<string, any> | null;
}

export interface WalletTransactionResult {
  ledgerEntryId: string;
  manualEntryId: string | null;
}

const WALLET_TRANSACTION_RPC = 'wallet_process_transaction';

export interface PurchaseItem {
  id: string;
  type: PurchaseItemType;
  title: string;
  price: number;
  license_type?: 'basic' | 'premium' | 'exclusive';
  metadata?: Record<string, any>;
}

class CreditSystemService {
  /**
   * Get user's current credit balance
   */
  async getBalance(userId: string): Promise<number> {
    const balance = await this.getWalletBalance(userId);
    return balance.available_credits;
  }

  private async getWalletBalance(userId: string): Promise<WalletBalanceSummary> {
    const { data, error } = await supabase.rpc('get_wallet_balance', {
      p_user_id: userId,
    });

    if (error) {
      throw error;
    }

    const balanceData = (data as any) || {};

    return {
      balance_credits: balanceData.balance_credits ?? 0,
      pending_credits: balanceData.pending_credits ?? 0,
      available_credits: balanceData.available_credits ?? 0,
      total_earned: balanceData.total_earned ?? 0,
      total_spent: balanceData.total_spent ?? 0,
    };
  }

  async getBalanceSummary(userId: string): Promise<WalletBalanceSummary> {
    return this.getWalletBalance(userId);
  }

  /**
   * Add credits to user's balance
   */
  async addCredits(
    userId: string,
    amount: number,
    metadata?: Record<string, any>,
  ): Promise<WalletTransactionResult> {
    return this.executeWalletTransaction({
      userId,
      amountCredits: amount,
      kind: 'topup',
      metadata,
    });
  }

  async spendCredits(
    userId: string,
    amount: number,
    kind: WalletTransactionKind,
    metadata?: Record<string, any>,
  ): Promise<WalletTransactionResult> {
    const balance = await this.getBalance(userId);
    if (balance < amount) {
      throw new Error('Insufficient credits');
    }

    return this.executeWalletTransaction({
      userId,
      amountCredits: -amount,
      kind,
      metadata,
    });
  }

  /**
   * Process a purchase using credits
   */
  async processPurchase(
    userId: string,
    items: PurchaseItem[],
    options: {
      requestedCredits?: number;
      requestedCreditSpend?: number;
      maxCreditPercentage?: number;
      cartTotal?: number;
      stripePaymentIntentId?: string;
      stripeChargeId?: string;
      stripeCheckoutSessionId?: string;
    } = {},
  ): Promise<{
    creditsUsed: number;
    cashDue: number;
    totalCost: number;
    message: string;
    appliedCredits: number;
    maxCreditsAllowed: number;
    cartTotal: number;
  }> {
    const totalCost = items.reduce((sum, item) => sum + item.price, 0);

    if (totalCost === 0) {
      await this.createDownloadRecords(userId, items);
      return {
        creditsUsed: 0,
        cashDue: 0,
        totalCost: 0,
        message: 'Free download successful',
        appliedCredits: 0,
        maxCreditsAllowed: 0,
        cartTotal: 0,
      };
    }

    const cartTotal = Math.max(options.cartTotal ?? totalCost, 0);

    const [{ maxCartPercent }, balanceSummary] = await Promise.all([
      creditPolicyService.getCurrentPolicy(),
      this.getBalanceSummary(userId),
    ]);

    const policyPercent = Number.isFinite(maxCartPercent) ? maxCartPercent : 1;
    const configuredPercent = options.maxCreditPercentage;
    const effectiveMaxPercent = Math.max(
      0,
      Math.min(typeof configuredPercent === 'number' ? configuredPercent : policyPercent, 1),
    );

    const maxCreditsByPolicy = Math.floor(cartTotal * effectiveMaxPercent);
    const maxCreditsAllowed = Math.max(
      Math.min(maxCreditsByPolicy, balanceSummary.available_credits, totalCost),
      0,
    );

    const requestedCreditsRaw =
      options.requestedCredits ?? options.requestedCreditSpend ?? maxCreditsAllowed;
    const creditsToUse = Math.max(
      0,
      Math.min(requestedCreditsRaw, maxCreditsAllowed),
    );

    let creditsSpent = 0;

    if (creditsToUse > 0) {
      let remainingCredits = creditsToUse;

      for (const item of items) {
        if (item.price <= 0 || remainingCredits <= 0) {
          continue;
        }

        const creditsForItem = Math.min(remainingCredits, item.price);
        remainingCredits -= creditsForItem;
        creditsSpent += creditsForItem;

        if (creditsForItem > 0) {
          const orderId =
            options.stripeCheckoutSessionId ||
            options.stripePaymentIntentId ||
            options.stripeChargeId ||
            (item.metadata as any)?.order_id ||
            undefined;

          const baseMetadata: Record<string, any> = {
            product_id: item.id,
            product_type: item.type,
            license_type: item.license_type,
            requested_credits: creditsToUse,
            max_credit_percentage: effectiveMaxPercent,
            cash_due: Math.max(item.price - creditsForItem, 0),
            stripe_payment_intent_id: options.stripePaymentIntentId,
            stripe_charge_id: options.stripeChargeId,
            stripe_checkout_session_id: options.stripeCheckoutSessionId,
            product_title: item.title,
            order_id: orderId,
            operator_id: userId,
            ...(item.metadata || {}),
          };

          Object.keys(baseMetadata).forEach((key) => {
            if (baseMetadata[key] === undefined) {
              delete baseMetadata[key];
            }
          });

          const manualEntry: ManualWalletEntryPayload = {
            order_id: typeof orderId === 'string' ? orderId : undefined,
            item_type: item.type,
            item_id: item.id,
            operator_id: userId,
            direction: 'debit',
            amount_credits: creditsForItem,
            metadata: {
              ...baseMetadata,
              cart_total: totalCost,
              credits_spent_on_item: creditsForItem,
            },
          };

          await this.spendCredits(userId, creditsForItem, 'spend_purchase', {
            ...baseMetadata,
            manual_entry: manualEntry,
          });
        }
      }
    }

    const cashDue = Math.max(totalCost - creditsSpent, 0);

    if (cashDue === 0) {
      await this.createDownloadRecords(userId, items);
    }

    return {
      creditsUsed: creditsSpent,
      cashDue,
      totalCost,
      message: cashDue === 0 ? 'Purchase completed with credits' : 'Additional payment required',
      appliedCredits: creditsSpent,
      maxCreditsAllowed,
      cartTotal,
    };
  }

  /**
   * Create download records for purchased items
   */
  private async createDownloadRecords(userId: string, items: PurchaseItem[]): Promise<void> {
    const downloadRecords = items.map((item) => ({
      user_id: userId,
      product_id: item.id,
      product_type: item.type,
      license_type: item.license_type || 'basic',
      metadata: item.metadata || {},
    }));

    const { error } = await supabase.from('user_downloads').insert(downloadRecords);

    if (error) {
      throw error;
    }
  }

  /**
   * Get user's transaction history
   */
  async getTransactionHistory(
    userId: string,
    options: TransactionHistoryOptions = {},
  ): Promise<CreditTransaction[]> {
    const { limit = 50, offset = 0, filters } = options;

    let query = supabase
      .from('wallet_ledger')
      .select('*')
      .eq('user_id', userId);

    if (filters?.kind) {
      query = query.eq('kind', filters.kind);
    }

    if (filters?.startDate) {
      query = query.gte('created_at', filters.startDate);
    }

    if (filters?.endDate) {
      query = query.lte('created_at', filters.endDate);
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    return data || [];
  }

  async getFilteredTransactions(
    userId: string,
    filters?: TransactionFilters,
  ): Promise<CreditTransaction[]> {
    let query = supabase
      .from('wallet_ledger')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (filters?.kind) {
      query = query.eq('kind', filters.kind);
    }

    if (filters?.startDate) {
      query = query.gte('created_at', filters.startDate);
    }

    if (filters?.endDate) {
      query = query.lte('created_at', filters.endDate);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return data || [];
  }

  /**
   * Get user's purchased items
   */
  async getPurchasedItems(
    userId: string,
    productType?: PurchaseItemType,
  ): Promise<any[]> {
    let query = supabase
      .from('user_downloads')
      .select(`
        *,
        beats(id, title, image_url, audio_url, genre, bpm, key, tags),
        releases(id, title, cover_art_url, artist, genre, description)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (productType) {
      query = query.eq('product_type', productType);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return data || [];
  }

  /**
   * Check if user has purchased a specific item
   */
  async hasPurchased(userId: string, productId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('user_downloads')
      .select('id')
      .eq('user_id', userId)
      .eq('product_id', productId)
      .limit(1);

    if (error) {
      throw error;
    }

    return !!(data && data.length > 0);
  }

  /**
   * Purchase credits with Stripe
   */
  async purchaseCreditsWithStripe(
    userId: string,
    creditAmount: number,
    priceInCents: number,
  ): Promise<{ clientSecret: string }> {
    const { data, error } = await supabase.functions.invoke('create-credit-purchase', {
      body: {
        userId,
        creditAmount,
        priceInCents,
      },
    });

    if (error) {
      throw error;
    }

    return data;
  }

  /**
   * Confirm credit purchase after Stripe payment
   */
  async confirmCreditPurchase(paymentIntentId: string): Promise<CreditTransaction> {
    const { data, error } = await supabase.functions.invoke('confirm-credit-purchase', {
      body: {
        paymentIntentId,
      },
    });

    if (error) {
      throw error;
    }

    return data;
  }

  private async executeWalletTransaction({
    userId,
    amountCredits,
    kind,
    metadata,
  }: {
    userId: string;
    amountCredits: number;
    kind: WalletTransactionKind;
    metadata?: Record<string, any>;
  }): Promise<WalletTransactionResult> {
    const manualEntry = this.extractManualEntry(amountCredits, kind, metadata, userId);

    const payload = {
      user_id: userId,
      amount_credits: amountCredits,
      kind,
      ref_type: metadata?.ref_type ?? null,
      ref_id: metadata?.ref_id ?? null,
      counterparty_user_id: metadata?.counterparty_user_id ?? null,
      meta: this.stripUndefined({ ...(metadata ?? {}), manual_entry: manualEntry ?? undefined }),
      manual_entry: manualEntry,
    };

    const rpcResult = await supabase.rpc(WALLET_TRANSACTION_RPC, payload as any);

    if (rpcResult.error) {
      console.warn('[Wallet] RPC failed, falling back to edge function', rpcResult.error.message);

      const fallback = await supabase.functions.invoke('process-credits-transaction', {
        body: payload,
      });

      if (fallback.error) {
        throw fallback.error;
      }

      return this.normalizeTransactionResponse(fallback.data);
    }

    return this.normalizeTransactionResponse(rpcResult.data);
  }

  private extractManualEntry(
    amountCredits: number,
    kind: WalletTransactionKind,
    metadata: Record<string, any> | undefined,
    userId: string,
  ): ManualWalletEntryPayload | null {
    const manualFromMetadata = metadata?.manual_entry as ManualWalletEntryPayload | undefined;
    const effectiveAmount = Math.abs(amountCredits);

    if (manualFromMetadata) {
      return {
        direction: manualFromMetadata.direction ?? (amountCredits < 0 ? 'debit' : 'credit'),
        amount_credits: manualFromMetadata.amount_credits ?? effectiveAmount,
        item_id: manualFromMetadata.item_id ?? metadata?.product_id ?? null,
        item_type: manualFromMetadata.item_type ?? metadata?.product_type ?? null,
        order_id: manualFromMetadata.order_id ?? metadata?.order_id ?? null,
        operator_id: manualFromMetadata.operator_id ?? metadata?.operator_id ?? userId,
        metadata: manualFromMetadata.metadata ?? this.stripUndefined({ ...(metadata ?? {}) }),
      };
    }

    if (!metadata) {
      return null;
    }

    return {
      order_id: metadata.order_id ?? metadata.ref_id ?? null,
      item_type: metadata.product_type ?? null,
      item_id: metadata.product_id ?? null,
      operator_id: metadata.operator_id ?? userId,
      direction: amountCredits < 0 ? 'debit' : 'credit',
      amount_credits: effectiveAmount,
      metadata: this.stripUndefined({
        ...(metadata ?? {}),
        kind,
      }),
    };
  }

  private normalizeTransactionResponse(data: any): WalletTransactionResult {
    if (!data || typeof data !== 'object') {
      throw new Error('Unexpected wallet transaction response');
    }

    const ledgerEntryId =
      data.ledgerEntryId || data.ledger_entry_id || data.ledger_id || data.id;

    if (!ledgerEntryId || typeof ledgerEntryId !== 'string') {
      throw new Error('Wallet transaction response missing ledger entry id');
    }

    const manualEntryId =
      (typeof data.manualEntryId === 'string' && data.manualEntryId) ||
      (typeof data.manual_entry_id === 'string' && data.manual_entry_id) ||
      null;

    return {
      ledgerEntryId,
      manualEntryId,
    };
  }

  private stripUndefined<T extends Record<string, any>>(value: T): T {
    Object.keys(value).forEach((key) => {
      if (value[key] === undefined) {
        delete value[key];
      }
    });
    return value;
  }
}

export const creditSystem = new CreditSystemService();
