/**
 * useSubscription — Apple IAP subscription management for memberships.
 *
 * Handles:
 *  - Fetching subscription products from App Store (fixed SKUs)
 *  - Purchasing subscriptions
 *  - Checking active subscription status
 *  - Restoring subscriptions
 *  - Mapping Apple SKU → creator tier
 */
import { useEffect, useCallback, useState, useRef } from 'react';
import {
  getSubscriptions,
  requestSubscription,
  finishTransaction,
  purchaseUpdatedListener,
  purchaseErrorListener,
  getAvailablePurchases,
  type Subscription,
  type Purchase,
  type PurchaseError,
} from 'react-native-iap';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';

// ─── Fixed Apple Subscription SKUs ────────────────────────────────────
export const SUBSCRIPTION_SKUS = [
  'pluggd_tier_299',
  'pluggd_tier_499',
  'pluggd_tier_999',
  'pluggd_tier_1999',
  'pluggd_tier_4999',
] as const;

export type SubscriptionSKU = (typeof SUBSCRIPTION_SKUS)[number];

export interface SubscriptionTier {
  sku: SubscriptionSKU;
  price: string; // e.g. "£2.99"
  localizedPrice: string;
  label: string;
  product: Subscription | null;
}

// Map SKU → display info (prices are approximate — real price from App Store)
const SKU_INFO: Record<SubscriptionSKU, { label: string; fallbackPrice: string }> = {
  pluggd_tier_299: { label: 'Bronze', fallbackPrice: '£2.99/mo' },
  pluggd_tier_499: { label: 'Silver', fallbackPrice: '£4.99/mo' },
  pluggd_tier_999: { label: 'Gold', fallbackPrice: '£9.99/mo' },
  pluggd_tier_1999: { label: 'Platinum', fallbackPrice: '£19.99/mo' },
  pluggd_tier_4999: { label: 'Diamond', fallbackPrice: '£49.99/mo' },
};

function getLocalizedSubscriptionPrice(
  product: Subscription | null,
  fallback: string,
): string {
  if (product && 'localizedPrice' in product && product.localizedPrice) {
    return product.localizedPrice;
  }
  return fallback;
}

export interface ActiveMembership {
  id: string;
  creator_id: string;
  creator_name: string;
  tier_name: string;
  apple_sku: string;
  status: 'active' | 'cancelled' | 'past_due' | 'expired';
  current_period_end: string | null;
}

// ─── Hook ─────────────────────────────────────────────────────────────
export function useSubscription() {
  const [tiers, setTiers] = useState<SubscriptionTier[]>([]);
  const [activeMemberships, setActiveMemberships] = useState<ActiveMembership[]>([]);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const purchaseUpdateSub = useRef<any>(null);
  const purchaseErrorSub = useRef<any>(null);

  // ── Fetch subscription products ──
  useEffect(() => {
    if (Platform.OS !== 'ios') {
      setLoading(false);
      return;
    }

    async function loadProducts() {
      try {
        const subs = await getSubscriptions({ skus: [...SUBSCRIPTION_SKUS] });
        const built: SubscriptionTier[] = SUBSCRIPTION_SKUS.map((sku) => {
          const product = subs.find((s) => s.productId === sku) ?? null;
          return {
            sku,
            price: SKU_INFO[sku].fallbackPrice,
            localizedPrice: getLocalizedSubscriptionPrice(product, SKU_INFO[sku].fallbackPrice),
            label: SKU_INFO[sku].label,
            product,
          };
        });
        setTiers(built);
      } catch (err: any) {
        console.error('[useSubscription] loadProducts failed:', err);
      } finally {
        setLoading(false);
      }
    }

    loadProducts();
  }, []);

  // ── Fetch active memberships from Supabase ──
  const refreshMemberships = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error: fetchErr } = await supabase
        .from('fan_subscriptions' as any)
        .select('id, creator_id, apple_sku, status, current_period_end, metadata, membership_tiers(name), profiles!fan_subscriptions_creator_id_fkey(full_name, username)')
        .eq('fan_id', user.id)
        .in('status', ['active', 'past_due'])
        .order('created_at', { ascending: false });

      if (fetchErr) throw fetchErr;

      const memberships: ActiveMembership[] = (data ?? []).map((row: any) => {
        const meta = row.metadata ?? {};
        const appleSku = row.apple_sku ?? meta.apple_sku ?? '';
        const tierLabel = row.membership_tiers?.name ?? meta.tier_name ?? (appleSku ? SKU_INFO[appleSku as SubscriptionSKU]?.label : null) ?? 'Membership';
        return {
          id: row.id,
          creator_id: row.creator_id,
          creator_name: row.profiles?.full_name ?? row.profiles?.username ?? 'Creator',
          tier_name: tierLabel,
          apple_sku: appleSku,
          status: row.status,
          current_period_end: row.current_period_end,
        };
      });

      setActiveMemberships(memberships);
    } catch (err) {
      console.error('[useSubscription] refreshMemberships failed:', err);
    }
  }, []);

  useEffect(() => {
    refreshMemberships();
  }, [refreshMemberships]);

  // ── Purchase listeners ──
  useEffect(() => {
    if (Platform.OS !== 'ios') return;

    purchaseUpdateSub.current = purchaseUpdatedListener(
      async (purchase: Purchase) => {
        // Only handle subscription purchases here
        if (!SUBSCRIPTION_SKUS.includes(purchase.productId as SubscriptionSKU)) return;

        try {
          await validateSubscriptionReceipt(purchase);
          await finishTransaction({ purchase, isConsumable: false });
          setPurchasing(false);
          setError(null);
          await refreshMemberships();
        } catch (err: any) {
          console.error('[useSubscription] validation failed:', err);
          setPurchasing(false);
          setError(err?.message ?? 'Subscription validation failed');
        }
      },
    );

    purchaseErrorSub.current = purchaseErrorListener((err: PurchaseError) => {
      if (!SUBSCRIPTION_SKUS.includes(err.productId as SubscriptionSKU)) return;
      setPurchasing(false);
      if (err.code !== 'E_USER_CANCELLED') {
        setError(err.message ?? 'Subscription purchase failed');
      }
    });

    return () => {
      purchaseUpdateSub.current?.remove();
      purchaseErrorSub.current?.remove();
    };
  }, [refreshMemberships]);

  // ── Validate subscription receipt ──
  async function validateSubscriptionReceipt(purchase: Purchase) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error: fnError } = await supabase.functions.invoke(
      'validate-iap-receipt',
      {
        body: {
          receipt_data: purchase.transactionReceipt,
          product_id: purchase.productId,
          transaction_id: purchase.transactionId,
          platform: 'ios',
          type: 'subscription',
        },
      },
    );

    if (fnError) throw fnError;
  }

  // ── Subscribe to a creator ──
  const subscribe = useCallback(
    async (sku: SubscriptionSKU, creatorId: string) => {
      setPurchasing(true);
      setError(null);

      try {
        // Store the creator mapping before purchase so the webhook can find it
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // Create a pending subscription record
        await supabase.from('fan_subscriptions' as any).upsert({
          fan_id: user.id,
          creator_id: creatorId,
          apple_sku: sku,
          status: 'pending',
          price_cents: 0,
          metadata: {
            apple_sku: sku,
            tier_name: SKU_INFO[sku].label,
            platform: 'ios',
          },
        }, {
          onConflict: 'fan_id,creator_id',
        });

        await requestSubscription({
          sku,
          appAccountToken: user.id,
          andDangerouslyFinishTransactionAutomaticallyIOS: false,
        });
        // Purchase listener handles the rest
      } catch (err: any) {
        setPurchasing(false);
        if (err?.code !== 'E_USER_CANCELLED') {
          setError(err?.message ?? 'Subscription failed');
        }
      }
    },
    [],
  );

  // ── Restore subscriptions ──
  const restoreSubscriptions = useCallback(async () => {
    setRestoring(true);
    try {
      const purchases = await getAvailablePurchases();
      for (const purchase of purchases) {
        if (SUBSCRIPTION_SKUS.includes(purchase.productId as SubscriptionSKU)) {
          await validateSubscriptionReceipt(purchase);
          await finishTransaction({ purchase, isConsumable: false });
        }
      }
      await refreshMemberships();
      setRestoring(false);
    } catch (err: any) {
      setRestoring(false);
      setError(err?.message ?? 'Restore failed');
    }
  }, [refreshMemberships]);

  return {
    tiers,
    activeMemberships,
    purchasing,
    restoring,
    loading,
    error,
    subscribe,
    restoreSubscriptions,
    refreshMemberships,
    clearError: () => setError(null),
  };
}
