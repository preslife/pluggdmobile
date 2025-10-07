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

export interface PurchaseItem {
  id: string;
  type: 'beat' | 'release' | 'pack' | 'license';
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

    const [earnedData, spentData] = await Promise.all([
      supabase
        .from('wallet_ledger')
        .select('total:amount_credits', { head: false, count: 'exact' })
        .eq('user_id', userId)
        .gte('amount_credits', 0)
        .single()
        .then((result) => {
          if (result.error && result.error.code !== 'PGRST116') {
            throw result.error;
          }
          return (result.data as any)?.total ?? 0;
        }),
      supabase
        .from('wallet_ledger')
        .select('total:amount_credits', { head: false, count: 'exact' })
        .eq('user_id', userId)
        .lt('amount_credits', 0)
        .single()
        .then((result) => {
          if (result.error && result.error.code !== 'PGRST116') {
            throw result.error;
          }
          const spent = (result.data as any)?.total ?? 0;
          return Math.abs(spent);
        }),
    ]);

    return {
      balance_credits: balanceData.balance_credits ?? 0,
      pending_credits: balanceData.pending_credits ?? 0,
      available_credits: balanceData.available_credits ?? 0,
      total_earned: earnedData,
      total_spent: spentData,
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
  ): Promise<void> {
    const { error } = await supabase.functions.invoke('process-credits-transaction', {
      body: {
        amount_credits: amount,
        kind: 'topup',
        meta: metadata || {},
        ref_type: metadata?.ref_type,
        ref_id: metadata?.ref_id,
        counterparty_user_id: metadata?.counterparty_user_id,
      },
    });

    if (error) {
      throw error;
    }
  }

  async spendCredits(
    userId: string,
    amount: number,
    metadata?: Record<string, any>,
  ): Promise<void> {
    const balance = await this.getBalance(userId);
    if (balance < amount) {
      throw new Error('Insufficient credits');
    }

    const { error } = await supabase.functions.invoke('process-credits-transaction', {
      body: {
        amount_credits: -amount,
        kind: 'spend_purchase',
        meta: metadata || {},
        ref_type: metadata?.ref_type,
        ref_id: metadata?.ref_id,
        counterparty_user_id: metadata?.counterparty_user_id,
      },
    });

    if (error) {
      throw error;
    }
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
          const metadata: Record<string, any> = {
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
            ...(item.metadata || {}),
          };

          Object.keys(metadata).forEach((key) => {
            if (metadata[key] === undefined) {
              delete metadata[key];
            }
          });

          await this.spendCredits(userId, creditsForItem, metadata);
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
    productType?: 'beat' | 'release' | 'pack',
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
}

export const creditSystem = new CreditSystemService();
