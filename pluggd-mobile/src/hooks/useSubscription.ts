import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import {
  finishTransaction,
  getAvailablePurchases,
  getSubscriptions,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestSubscription,
  type Purchase,
  type PurchaseError,
  type Subscription,
} from 'react-native-iap';
import { useStoreKit } from '../context/StoreKitProvider';
import { supabase } from '../lib/supabase';

export interface MembershipProduct {
  catalogId: string;
  sku: string;
  creatorId: string;
  tierId: string;
  label: string;
  localizedPrice: string | null;
  product: Subscription | null;
  provisioned: boolean;
}

export type SubscriptionTier = MembershipProduct;

export interface ActiveMembership {
  id: string;
  creator_id: string;
  tier_id: string | null;
  creator_name: string;
  tier_name: string;
  apple_sku: string;
  status: 'active' | 'cancelled' | 'past_due' | 'expired';
  current_period_end: string | null;
}

type CatalogRow = {
  id: string;
  creator_id: string;
  membership_tier_id: string;
  product_id: string;
  status: string;
  membership_tiers?: { name?: string | null } | Array<{ name?: string | null }> | null;
};

type FanSubscriptionRow = {
  id: string;
  creator_id: string;
  tier_id?: string | null;
  apple_sku?: string | null;
  status: ActiveMembership['status'];
  current_period_end: string | null;
  metadata?: Record<string, any> | null;
  membership_tiers?: { name?: string | null } | Array<{ name?: string | null }> | null;
};

function relatedName(value: CatalogRow['membership_tiers'] | FanSubscriptionRow['membership_tiers']) {
  return Array.isArray(value) ? value[0]?.name ?? null : value?.name ?? null;
}

function localizedPrice(product: Subscription | null): string | null {
  if (!product) return null;
  if ('localizedPrice' in product && typeof product.localizedPrice === 'string') {
    return product.localizedPrice;
  }
  return null;
}

const PRODUCT_LOAD_DELAYS_MS = [0, 700, 1400, 2400] as const;

function waitForProductRetry(delayMs: number) {
  if (delayMs <= 0) return Promise.resolve();
  return new Promise<void>((resolve) => setTimeout(resolve, delayMs));
}

export function useSubscription(options?: { creatorId?: string | null }) {
  const creatorId = options?.creatorId ?? null;
  const { ready: storeKitReady, connectionError } = useStoreKit();
  const [catalog, setCatalog] = useState<CatalogRow[]>([]);
  const [tiers, setTiers] = useState<MembershipProduct[]>([]);
  const [activeMemberships, setActiveMemberships] = useState<ActiveMembership[]>([]);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const purchaseUpdateSub = useRef<{ remove: () => void } | null>(null);
  const purchaseErrorSub = useRef<{ remove: () => void } | null>(null);

  const productIds = useMemo(
    () => Array.from(new Set(catalog.map((row) => row.product_id).filter(Boolean))),
    [catalog],
  );
  const knownProductIds = useRef(new Set<string>());
  useEffect(() => {
    knownProductIds.current = new Set(productIds);
  }, [productIds]);

  const loadCatalog = useCallback(async () => {
    let query = (supabase as any)
      .from('membership_iap_products')
      .select('id,creator_id,membership_tier_id,product_id,status,membership_tiers(name)')
      .eq('status', 'active');
    if (creatorId) query = query.eq('creator_id', creatorId);
    const { data, error: catalogError } = await query.order('created_at', { ascending: true });
    if (catalogError) {
      console.warn('[useSubscription] product catalogue unavailable:', catalogError.message);
      setCatalog([]);
      setTiers([]);
      setLoading(false);
      return;
    }
    setCatalog((data ?? []) as CatalogRow[]);
  }, [creatorId]);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    if (Platform.OS !== 'ios') {
      setLoading(false);
      return;
    }
    if (!storeKitReady || !catalog.length) {
      if (storeKitReady) {
        setTiers([]);
        setLoading(false);
      }
      return;
    }
    let mounted = true;
    void (async () => {
      setLoading(true);
      try {
        let subscriptions: Subscription[] = [];
        for (let attempt = 0; attempt < PRODUCT_LOAD_DELAYS_MS.length; attempt += 1) {
          await waitForProductRetry(PRODUCT_LOAD_DELAYS_MS[attempt]);
          subscriptions = await getSubscriptions({ skus: productIds });
          console.info('[useSubscription] App Store catalogue response', {
            attempt: attempt + 1,
            requested: productIds,
            returned: subscriptions.map((item) => item.productId),
          });
          if (subscriptions.length > 0 || !mounted) break;
        }
        if (!mounted) return;
        setTiers(catalog.map((row) => {
          const product = subscriptions.find((item) => item.productId === row.product_id) ?? null;
          return {
            catalogId: row.id,
            sku: row.product_id,
            creatorId: row.creator_id,
            tierId: row.membership_tier_id,
            label: relatedName(row.membership_tiers) ?? 'Creator membership',
            localizedPrice: localizedPrice(product),
            product,
            provisioned: Boolean(product),
          };
        }));
      } catch (loadError) {
        console.warn('[useSubscription] App Store product load failed:', loadError);
        if (mounted) setTiers(catalog.map((row) => ({
          catalogId: row.id,
          sku: row.product_id,
          creatorId: row.creator_id,
          tierId: row.membership_tier_id,
          label: relatedName(row.membership_tiers) ?? 'Creator membership',
          localizedPrice: null,
          product: null,
          provisioned: false,
        })));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [catalog, productIds.join('|'), storeKitReady]);

  useEffect(() => {
    if (connectionError) {
      setError(connectionError);
      setLoading(false);
    }
  }, [connectionError]);

  const refreshMemberships = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setActiveMemberships([]);
        return;
      }
      const { data, error: fetchError } = await (supabase as any)
        .from('fan_subscriptions')
        .select('id,creator_id,tier_id,apple_sku,status,current_period_end,metadata,membership_tiers(name)')
        .eq('fan_id', user.id)
        .in('status', ['active', 'past_due'])
        .order('created_at', { ascending: false });
      if (fetchError) throw fetchError;
      const rows = (data ?? []) as FanSubscriptionRow[];
      const creatorIds = Array.from(new Set(rows.map((row) => row.creator_id).filter(Boolean)));
      const creators = creatorIds.length
        ? await (supabase as any).from('profiles').select('user_id,full_name,username').in('user_id', creatorIds)
        : { data: [] };
      const creatorById = new Map<string, any>((creators.data ?? []).map((row: any) => [row.user_id, row]));
      setActiveMemberships(rows.map((row) => {
        const metadata = row.metadata ?? {};
        const creator = creatorById.get(row.creator_id);
        return {
          id: row.id,
          creator_id: row.creator_id,
          tier_id: row.tier_id ?? metadata.tier_id ?? null,
          creator_name: creator?.full_name ?? creator?.username ?? 'Creator',
          tier_name: relatedName(row.membership_tiers) ?? metadata.tier_name ?? 'Membership',
          apple_sku: row.apple_sku ?? metadata.apple_sku ?? '',
          status: row.status,
          current_period_end: row.current_period_end,
        };
      }));
    } catch (refreshError) {
      console.warn('[useSubscription] membership refresh failed:', refreshError);
    }
  }, []);

  useEffect(() => {
    void refreshMemberships();
  }, [refreshMemberships]);

  const validateReceipt = useCallback(async (purchase: Purchase) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Sign in to validate this membership.');
    const signedTransaction = purchase.verificationResultIOS;
    if (
      typeof signedTransaction !== 'string' ||
      signedTransaction.split('.').length !== 3
    ) {
      throw new Error(
        'Apple confirmed this membership, but verification is still pending. Reopen this page or restore purchases to try again.',
      );
    }
    const { error: validationError } = await supabase.functions.invoke('validate-iap-receipt', {
      body: {
        receipt_data: signedTransaction,
        product_id: purchase.productId,
        transaction_id: purchase.transactionId,
        platform: 'ios',
        type: 'subscription',
      },
    });
    if (validationError) {
      console.error('[useSubscription] receipt verification request failed:', {
        name: validationError.name,
        message: validationError.message,
        productId: purchase.productId,
        transactionId: purchase.transactionId,
      });
      throw new Error(
        'Apple confirmed this membership, but PLUGGD is still verifying it. Do not subscribe again—reopen this page in a moment.',
      );
    }
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    purchaseUpdateSub.current = purchaseUpdatedListener(async (purchase: Purchase) => {
      if (!knownProductIds.current.has(purchase.productId)) return;
      try {
        await validateReceipt(purchase);
        await finishTransaction({ purchase, isConsumable: false });
        setPurchasing(false);
        setError(null);
        await refreshMemberships();
      } catch (validationError) {
        setPurchasing(false);
        setError(validationError instanceof Error ? validationError.message : 'Subscription validation failed');
      }
    });
    purchaseErrorSub.current = purchaseErrorListener((purchaseError: PurchaseError) => {
      if (purchaseError.productId && !knownProductIds.current.has(purchaseError.productId)) return;
      setPurchasing(false);
      if (purchaseError.code !== 'E_USER_CANCELLED') setError(purchaseError.message ?? 'Subscription purchase failed');
    });
    return () => {
      purchaseUpdateSub.current?.remove();
      purchaseErrorSub.current?.remove();
    };
  }, [refreshMemberships, validateReceipt]);

  const subscribe = useCallback(async (productId: string) => {
    const product = tiers.find((tier) => tier.sku === productId);
    if (!storeKitReady) {
      setError('The App Store is not connected.');
      return;
    }
    if (!product?.product || !product.provisioned) {
      setError('This creator tier is not yet available through the App Store.');
      return;
    }
    setPurchasing(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Sign in to subscribe.');
      await requestSubscription({
        sku: productId,
        appAccountToken: user.id,
        andDangerouslyFinishTransactionAutomaticallyIOS: false,
      });
    } catch (purchaseError: any) {
      setPurchasing(false);
      if (purchaseError?.code !== 'E_USER_CANCELLED') {
        setError(purchaseError?.message ?? 'Subscription purchase failed');
      }
    }
  }, [storeKitReady, tiers]);

  const restoreSubscriptions = useCallback(async () => {
    setRestoring(true);
    setError(null);
    try {
      const purchases = await getAvailablePurchases();
      for (const purchase of purchases) {
        const isCurrentProduct = knownProductIds.current.has(purchase.productId);
        const isLegacyMembership = purchase.productId.startsWith('pluggd_tier_');
        if (!isCurrentProduct && !isLegacyMembership) continue;
        await validateReceipt(purchase);
        await finishTransaction({ purchase, isConsumable: false });
      }
      await refreshMemberships();
    } catch (restoreError) {
      setError(restoreError instanceof Error ? restoreError.message : 'Restore failed');
    } finally {
      setRestoring(false);
    }
  }, [refreshMemberships, validateReceipt]);

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
    refreshCatalog: loadCatalog,
    clearError: () => setError(null),
  };
}
