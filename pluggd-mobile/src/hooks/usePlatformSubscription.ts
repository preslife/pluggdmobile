import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { StoreProduct, StorePurchase, StorePurchaseError } from '../billing';
import { storeProductId } from '../billing';
import { useStoreKit } from '../context/StoreKitProvider';
import { supabase } from '../lib/supabase';

export type PlatformPlanTier = 'free' | 'starter' | 'creator' | 'pro';
export type PlatformBillingCycle = 'monthly' | 'yearly';
export type PlatformBillingProvider = 'apple' | 'stripe' | 'google_play' | 'access_code' | 'admin_grant' | null;

export type PlatformPlanDefinition = {
  tier: PlatformPlanTier;
  name: string;
  skus: Record<PlatformBillingCycle, string | null>;
  commissionRate: number;
  commission: string;
  summary: string;
  features: string[];
  featured?: boolean;
};

export const PLATFORM_PLAN_SKUS = [
  'com.pluggd.mobile.plan.starter.monthly',
  'com.pluggd.mobile.plan.starter.yearly',
  'com.pluggd.mobile.plan.creator.monthly',
  'com.pluggd.mobile.plan.creator.yearly',
  'com.pluggd.mobile.plan.pro.monthly',
  'com.pluggd.mobile.plan.pro.yearly.v2',
] as const;

export const PLATFORM_PLANS: PlatformPlanDefinition[] = [
  {
    tier: 'free',
    name: 'Free',
    skus: { monthly: null, yearly: null },
    commissionRate: 20,
    commission: '20% platform commission',
    summary: 'Start your catalogue and build your PLUGGD presence.',
    features: ['Basic creator profile', 'Community access & social feed', 'Basic live streaming', 'Standard licensing templates'],
  },
  {
    tier: 'starter',
    name: 'Starter',
    skus: {
      monthly: PLATFORM_PLAN_SKUS[0],
      yearly: PLATFORM_PLAN_SKUS[1],
    },
    commissionRate: 12.5,
    commission: '12.5% platform commission',
    summary: 'Open your catalogue and start selling without upload caps.',
    features: ['Unlimited beat uploads', 'Unlimited releases', 'Active beat store', 'Sell sample packs', 'Basic analytics', 'Basic live streaming'],
  },
  {
    tier: 'creator',
    name: 'Creator',
    skus: {
      monthly: PLATFORM_PLAN_SKUS[2],
      yearly: PLATFORM_PLAN_SKUS[3],
    },
    commissionRate: 5,
    commission: '5% platform commission',
    summary: 'Grow your audience and operate with professional creator tools.',
    features: ['Advanced live streaming', 'Full analytics', 'AI content tools', 'Host events', 'Private collaboration tools', 'Verified badge'],
    featured: true,
  },
  {
    tier: 'pro',
    name: 'Pro',
    skus: {
      monthly: PLATFORM_PLAN_SKUS[4],
      yearly: PLATFORM_PLAN_SKUS[5],
    },
    commissionRate: 0,
    commission: '0% platform commission',
    summary: 'Operate at full scale with PLUGGD’s deepest creator stack.',
    features: ['Everything in Creator', 'Unlimited creator tools', 'Full analytics & exports', 'Featured listings', 'Private collaborations', 'Availability calendar'],
  },
];

const RETIRED_PLATFORM_PLAN_COPY = new Set([
  'streaming payout pool',
  'advanced ai studio',
  'content id protection',
  'white-label storefront',
  'sub-accounts',
]);

export type PlatformPlanEntitlement = {
  tier: PlatformPlanTier;
  status: string;
  currentPeriodEnd: string | null;
  billingProvider: PlatformBillingProvider;
  billingCycle: PlatformBillingCycle | 'comped' | null;
  commissionRate: number;
  source: string | null;
  autoRenewStatus: boolean | null;
  appleProductId: string | null;
};

const FREE_ENTITLEMENT: PlatformPlanEntitlement = {
  tier: 'free',
  status: 'active',
  currentPeriodEnd: null,
  billingProvider: null,
  billingCycle: null,
  commissionRate: 20,
  source: null,
  autoRenewStatus: null,
  appleProductId: null,
};

function normalizedEntitlement(row: any): PlatformPlanEntitlement {
  if (!row) return FREE_ENTITLEMENT;
  const provider: PlatformBillingProvider =
    row.billing_provider === 'apple' || row.billing_provider === 'stripe' || row.billing_provider === 'google_play' || row.billing_provider === 'access_code' || row.billing_provider === 'admin_grant'
      ? row.billing_provider
      : row.stripe_subscription_id
      ? 'stripe'
      : null;
  const periodEnd = typeof row.current_period_end === 'string' ? row.current_period_end : null;
  const periodEndMs = periodEnd ? new Date(periodEnd).getTime() : null;
  const entitled =
    (row.tier === 'starter' || row.tier === 'creator' || row.tier === 'pro') &&
    (row.status === 'active' ||
      row.status === 'past_due' ||
      (row.status === 'cancelled' &&
        periodEndMs !== null &&
        Number.isFinite(periodEndMs) &&
        periodEndMs > Date.now()));
  return {
    tier: entitled ? row.tier : 'free',
    status: typeof row.status === 'string' ? row.status : 'active',
    currentPeriodEnd: periodEnd,
    billingProvider: provider,
    billingCycle: row.billing_cycle === 'monthly' || row.billing_cycle === 'yearly' || row.billing_cycle === 'comped' ? row.billing_cycle : null,
    commissionRate: typeof row.commission_rate === 'number' ? row.commission_rate : Number(row.commission_rate ?? (entitled ? 20 : 20)),
    source: typeof row.source === 'string' ? row.source : null,
    autoRenewStatus: typeof row.auto_renew_status === 'boolean' ? row.auto_renew_status : null,
    appleProductId: typeof row.apple_product_id === 'string' ? row.apple_product_id : null,
  };
}

export async function loadPlatformPlanEntitlement() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return FREE_ENTITLEMENT;
  const { data, error } = await (supabase as any)
    .from('user_subscriptions')
    .select('tier,status,current_period_end,billing_provider,billing_cycle,commission_rate,source,auto_renew_status,apple_product_id,stripe_subscription_id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) throw error;
  return normalizedEntitlement(data);
}

async function loadPlatformPlanDefinitions() {
  const { data, error } = await (supabase as any)
    .from('platform_pricing_config')
    .select('tier,commission_rate,features')
    .eq('currency', 'GBP')
    .eq('is_active', true);
  if (error) throw error;
  const rows = new Map((data ?? []).map((row: any) => [row.tier, row]));
  return PLATFORM_PLANS.map((plan) => {
    const row: any = rows.get(plan.tier);
    if (!row) return plan;
    const commissionRate = Number(row.commission_rate);
    const remoteFeatures = Array.isArray(row.features) && row.features.every((feature: unknown) => typeof feature === 'string')
      ? row.features as string[]
      : null;
    const hasRetiredCopy = remoteFeatures?.some((feature) => RETIRED_PLATFORM_PLAN_COPY.has(feature.trim().toLowerCase())) ?? false;
    return {
      ...plan,
      commissionRate: Number.isFinite(commissionRate) ? commissionRate : plan.commissionRate,
      commission: `${Number.isFinite(commissionRate) ? commissionRate : plan.commissionRate}% platform commission`,
      features: remoteFeatures && !hasRetiredCopy ? remoteFeatures : plan.features,
    };
  });
}

export function usePlatformPlanEntitlement() {
  const [entitlement, setEntitlement] = useState<PlatformPlanEntitlement>(FREE_ENTITLEMENT);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setEntitlement(await loadPlatformPlanEntitlement());
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Your plan could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  return { entitlement, loading, error, refresh };
}

const RECONCILIATION_DELAYS_MS = [0, 800, 1600] as const;

function wait(delayMs: number) {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

export function usePlatformSubscription() {
  const { adapter, ready, connectionError } = useStoreKit();
  const entitlementState = usePlatformPlanEntitlement();
  const [planDefinitions, setPlanDefinitions] = useState(PLATFORM_PLANS);
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [purchasingSku, setPurchasingSku] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const purchaseListener = useRef<{ remove: () => void } | null>(null);
  const errorListener = useRef<{ remove: () => void } | null>(null);
  const knownSkus = useMemo(() => new Set<string>(PLATFORM_PLAN_SKUS), []);

  useEffect(() => {
    let mounted = true;
    loadPlatformPlanDefinitions()
      .then((definitions) => { if (mounted) setPlanDefinitions(definitions); })
      .catch((loadError) => console.warn('[usePlatformSubscription] pricing load failed:', loadError));
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    if (!adapter || !ready || adapter.provider !== 'apple') {
      setLoadingProducts(Boolean(adapter && adapter.provider === 'apple') && !connectionError);
      return () => { mounted = false; };
    }
    setLoadingProducts(true);
    adapter.fetchProducts([...PLATFORM_PLAN_SKUS], 'subs')
      .then((loaded) => {
        if (mounted) setProducts(loaded.filter((product) => knownSkus.has(storeProductId(product))));
      })
      .catch((loadError) => {
        console.warn('[usePlatformSubscription] product load failed:', loadError);
        if (mounted) setProducts([]);
      })
      .finally(() => { if (mounted) setLoadingProducts(false); });
    return () => { mounted = false; };
  }, [adapter, connectionError, knownSkus, ready]);

  const recoverEntitlement = useCallback(async (productId: string) => {
    for (const delay of RECONCILIATION_DELAYS_MS) {
      await wait(delay);
      const recovered = await loadPlatformPlanEntitlement();
      if (recovered.tier !== 'free' && recovered.appleProductId === productId) return recovered;
    }
    return null;
  }, []);

  const validate = useCallback(async (purchase: StorePurchase) => {
    if (!adapter || adapter.provider !== 'apple') throw new Error('PLUGGD plans are currently available through the App Store on iPhone.');
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user || !session.access_token) throw new Error('Sign in to manage a PLUGGD plan.');
    if (typeof purchase.purchaseToken !== 'string' || purchase.purchaseToken.split('.').length !== 3) {
      const recovered = await recoverEntitlement(purchase.productId);
      if (recovered) return { finishRequired: true };
      throw new Error('The App Store confirmed this plan and PLUGGD is still syncing it. Do not subscribe again—reopen Plans in a moment.');
    }
    const verification = await adapter.buildVerificationRequest(purchase, 'subscription', session.user.id);
    const { data, error: validationError } = await supabase.functions.invoke(verification.functionName, {
      headers: { Authorization: `Bearer ${session.access_token}` },
      body: { ...verification.body, subscription_scope: 'platform' },
    });
    if (validationError) {
      const recovered = await recoverEntitlement(purchase.productId);
      if (recovered) return { finishRequired: true };
      throw new Error('The App Store confirmed this plan, but PLUGGD is still verifying it. Do not subscribe again—reopen Plans in a moment.');
    }
    const response = data as Record<string, unknown> | null;
    if (!response || response.success !== true || response.type !== 'platform_subscription' || (response.tier !== 'starter' && response.tier !== 'creator' && response.tier !== 'pro')) {
      throw new Error('The App Store confirmed the purchase, but PLUGGD did not return a valid plan entitlement.');
    }
    return { finishRequired: true };
  }, [adapter, recoverEntitlement]);

  useEffect(() => {
    if (!adapter || adapter.provider !== 'apple') return;
    purchaseListener.current = adapter.listenForPurchases(async (purchase) => {
      if (!knownSkus.has(purchase.productId)) return;
      if (purchase.purchaseState === 'pending') {
        setPurchasingSku(null);
        setNotice('The App Store is waiting for payment approval. Do not subscribe again.');
        return;
      }
      try {
        const result = await validate(purchase);
        if (result.finishRequired) await adapter.finishTransaction(purchase, false);
        await entitlementState.refresh();
        setError(null);
        setNotice('Your PLUGGD plan is active.');
      } catch (purchaseError) {
        setError(purchaseError instanceof Error ? purchaseError.message : 'Plan verification failed.');
      } finally {
        setPurchasingSku(null);
      }
    });
    errorListener.current = adapter.listenForErrors((purchaseError: StorePurchaseError) => {
      if (purchaseError.productId && !knownSkus.has(purchaseError.productId)) return;
      setPurchasingSku(null);
      if (purchaseError.code !== 'user-cancelled') setError(purchaseError.message || 'Plan purchase failed.');
    });
    return () => {
      purchaseListener.current?.remove();
      errorListener.current?.remove();
    };
  }, [adapter, entitlementState.refresh, knownSkus, validate]);

  const subscribe = useCallback(async (sku: string) => {
    setError(null);
    setNotice(null);
    if (!adapter || !ready || adapter.provider !== 'apple') {
      setError(connectionError || 'PLUGGD plans are currently available through the App Store on iPhone.');
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('Sign in to choose a PLUGGD plan.');
      return;
    }
    if (entitlementState.entitlement.billingProvider === 'stripe' && entitlementState.entitlement.tier !== 'free') {
      setError('This plan was started outside the App Store. Manage it where you originally subscribed.');
      return;
    }
    const product = products.find((candidate) => storeProductId(candidate) === sku);
    if (!product) {
      setError('This PLUGGD plan is not currently available from the App Store.');
      return;
    }
    setPurchasingSku(sku);
    try {
      await adapter.requestSubscription({ sku, accountId: user.id, product });
    } catch (purchaseError: any) {
      setPurchasingSku(null);
      if (purchaseError?.code !== 'user-cancelled') setError(purchaseError?.message || 'Plan purchase failed.');
    }
  }, [adapter, connectionError, entitlementState.entitlement, products, ready]);

  const restore = useCallback(async () => {
    setRestoring(true);
    setError(null);
    setNotice(null);
    try {
      if (!adapter || !ready || adapter.provider !== 'apple') throw new Error('PLUGGD plans are currently available through the App Store on iPhone.');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Sign in before restoring a PLUGGD plan.');
      const purchases = (await adapter.getAvailablePurchases()).filter((purchase) => knownSkus.has(purchase.productId) && purchase.purchaseState !== 'pending');
      for (const purchase of purchases) {
        const result = await validate(purchase);
        if (result.finishRequired) await adapter.finishTransaction(purchase, false);
      }
      await entitlementState.refresh();
      setNotice(purchases.length ? 'Your PLUGGD plan has been restored.' : 'No restorable PLUGGD plan was found for this App Store account.');
    } catch (restoreError) {
      setError(restoreError instanceof Error ? restoreError.message : 'Plan restore failed.');
    } finally {
      setRestoring(false);
    }
  }, [adapter, entitlementState.refresh, knownSkus, ready, validate]);

  return {
    ...entitlementState,
    planDefinitions,
    products,
    loadingProducts,
    purchasingSku,
    restoring,
    error: error || entitlementState.error || connectionError,
    notice,
    subscribe,
    restore,
    clearMessage: () => { setError(null); setNotice(null); },
    storeName: adapter?.storeName ?? 'App Store',
    managementUrl: adapter?.subscriptionManagementUrl() ?? null,
  };
}
