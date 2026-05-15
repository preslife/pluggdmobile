/**
 * useWallet — mobile wallet hook.
 * Ported from PLUGGD_NEW/src/hooks/useWallet.tsx.
 *
 * Differences from web:
 *  - No React Context wrapper (uses Zustand store for global state)
 *  - topUpCredits() is NOT here (IAP purchases go through useCredits hook)
 *  - spendCredits() calls the current entitlement-aware Supabase function
 *  - cashOutCredits() calls the same edge function as web
 */
import { useEffect, useCallback } from 'react';
import { create } from 'zustand';
import { supabase } from '../lib/supabase';

// ─── Types (matched to web) ──────────────────────────────────────────
export type WalletTransactionKind =
  | 'topup'
  | 'topup_iap'
  | 'spend_tip'
  | 'spend_purchase'
  | 'spend_unlock'
  | 'spend_battle'
  | 'award_prize'
  | 'convert_cashout'
  | 'convert_sub_applied'
  | 'spend_gift'
  | 'earn_gift';

export interface WalletBalance {
  balance_credits: number;
  pending_credits: number;
  available_credits: number;
}

export interface WalletLedgerEntry {
  id: string;
  kind: WalletTransactionKind;
  amount_credits: number;
  ref_type?: string;
  ref_id?: string;
  counterparty_user_id?: string;
  meta?: Record<string, any>;
  created_at: string;
}

// ─── Constants ────────────────────────────────────────────────────────
export const CREDITS_PER_GBP = 100;

export function creditsToGBP(credits: number): number {
  return credits / CREDITS_PER_GBP;
}

export function formatCredits(credits: number, showConversion = false): string {
  const formatted = credits.toLocaleString();
  if (showConversion) {
    const gbp = creditsToGBP(credits);
    return `${formatted} credits (£${gbp.toFixed(2)})`;
  }
  return `${formatted} credits`;
}

// ─── Zustand Store ────────────────────────────────────────────────────
interface WalletStore {
  balance: WalletBalance;
  ledger: WalletLedgerEntry[];
  loading: boolean;
  setBalance: (b: WalletBalance) => void;
  setLedger: (l: WalletLedgerEntry[]) => void;
  setLoading: (l: boolean) => void;
}

export const useWalletStore = create<WalletStore>((set) => ({
  balance: { balance_credits: 0, pending_credits: 0, available_credits: 0 },
  ledger: [],
  loading: false,
  setBalance: (balance) => set({ balance }),
  setLedger: (ledger) => set({ ledger }),
  setLoading: (loading) => set({ loading }),
}));

// ─── Hook ─────────────────────────────────────────────────────────────
export function useWallet() {
  const { balance, ledger, loading, setBalance, setLedger, setLoading } =
    useWalletStore();

  const refreshBalance = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await (supabase as any).rpc('get_wallet_balance', {
        p_user_id: user.id,
      });

      if (error) throw error;

      setBalance(
        (data as WalletBalance) ?? {
          balance_credits: 0,
          pending_credits: 0,
          available_credits: 0,
        },
      );
    } catch (err) {
      console.error('[useWallet] refreshBalance failed:', err);
    }
  }, [setBalance]);

  const refreshLedger = useCallback(
    async (limit = 50) => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('wallet_ledger' as any)
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (error) throw error;

        setLedger((data as unknown as WalletLedgerEntry[]) ?? []);
      } catch (err) {
        console.error('[useWallet] refreshLedger failed:', err);
      } finally {
        setLoading(false);
      }
    },
    [setLedger, setLoading],
  );

  const spendCredits = useCallback(
    async (
      amount: number,
      kind: WalletTransactionKind,
      ref_type?: string,
      ref_id?: string,
      counterparty_id?: string,
    ): Promise<{ success: boolean; error?: string }> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: 'Not authenticated' };

      if (balance.available_credits < amount) {
        return { success: false, error: 'Insufficient credits' };
      }

      try {
        const metadata: Record<string, any> = {
          ref_type,
          ref_id,
          counterparty_user_id: counterparty_id,
          operator_id: user.id,
        };

        // Remove undefined values
        Object.keys(metadata).forEach((key) => {
          if (metadata[key] === undefined) delete metadata[key];
        });

        const { data, error } = await supabase.functions.invoke(
          'spend-credits',
          {
            body: {
              amount_credits: amount,
              kind,
              ...metadata,
            },
          },
        );

        if (error) throw error;

        if (data?.balance) {
          setBalance(data.balance);
        } else {
          await refreshBalance();
        }
        await refreshLedger();

        return { success: true };
      } catch (err: any) {
        console.error('[useWallet] spendCredits failed:', err);
        return { success: false, error: err?.message ?? 'Transaction failed' };
      }
    },
    [balance.available_credits, refreshBalance, refreshLedger, setBalance],
  );

  const cashOutCredits = useCallback(
    async (
      amount: number,
    ): Promise<{ success: boolean; error?: string }> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: 'Not authenticated' };

      try {
        const { error } = await supabase.functions.invoke('cash-out-credits', {
          body: { amount_credits: amount },
        });

        if (error) throw error;

        await refreshBalance();
        await refreshLedger();
        return { success: true };
      } catch (err: any) {
        console.error('[useWallet] cashOutCredits failed:', err);
        return { success: false, error: err?.message ?? 'Cash-out failed' };
      }
    },
    [refreshBalance, refreshLedger],
  );

  // Auto-fetch on mount
  useEffect(() => {
    refreshBalance();
    refreshLedger();
  }, []);

  return {
    balance,
    ledger,
    loading,
    refreshBalance,
    refreshLedger,
    spendCredits,
    cashOutCredits,
    formatCredits,
    creditsToGBP,
  };
}
