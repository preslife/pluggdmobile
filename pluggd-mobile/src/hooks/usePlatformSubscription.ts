import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { StoreProduct, StorePurchase, StorePurchaseError } from '../billing';
import { createGoogleBillingIdentifiers, selectGoogleSubscriptionOffer, storeProductId } from '../billing';
import { GOOGLE_PLATFORM_PLAN_PRODUCTS, GOOGLE_PLATFORM_PLAN_SKUS, googlePlatformPlan, googlePlanReplacement, hasNonGooglePlatformSubscription, validateGooglePlatformPlanResponse } from '../billing/platformPlanProducts';
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
    features: ['Advanced live streaming', 'Full analytics', 'Host events', 'Private collaboration tools', 'Verified badge'],
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
  'ai content tools',
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
  providerProductId: string | null;
  hasNonGooglePaidSource: boolean;
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
  providerProductId: null,
  hasNonGooglePaidSource: false,
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
    providerProductId: typeof row.provider_product_id === 'string' ? row.provider_product_id : null,
    hasNonGooglePaidSource: hasNonGooglePlatformSubscription(row),
  };
}

export async function loadPlatformPlanEntitlement(expectedUserId?: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    if (expectedUserId) throw new Error('Your PLUGGD account changed. Reopen Plans before purchasing.');
    return FREE_ENTITLEMENT;
  }
  if (expectedUserId && user.id !== expectedUserId) throw new Error('Your PLUGGD account changed. Reopen Plans before purchasing.');
  const { data, error } = await (supabase as any)
    .from('user_subscriptions')
    .select('tier,status,current_period_end,billing_provider,billing_cycle,commission_rate,source,auto_renew_status,apple_product_id,provider_product_id,stripe_subscription_id,stripe_tier,stripe_status,stripe_current_period_end,apple_tier,apple_status,apple_current_period_end,apple_grace_period_end')
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
  const [googleCatalog, setGoogleCatalog] = useState<Array<{ product_id: string; base_plan_id: string; offer_id: string | null }>>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [purchasingSku, setPurchasingSku] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const purchaseListener = useRef<{ remove: () => void } | null>(null);
  const errorListener = useRef<{ remove: () => void } | null>(null);
  const isGoogle = adapter?.provider === 'google';
  const storeName = adapter?.storeName ?? 'your app store';
  const accountName = adapter?.accountName ?? 'store account';
  const knownSkus = useMemo(() => new Set<string>(isGoogle ? GOOGLE_PLATFORM_PLAN_SKUS : PLATFORM_PLAN_SKUS), [isGoogle]);
  const currentProvider = isGoogle ? 'google_play' : 'apple';
  const hasOtherPaidProvider = (isGoogle && entitlementState.entitlement.hasNonGooglePaidSource) || (entitlementState.entitlement.tier !== 'free'
    && ['apple', 'google_play', 'stripe'].includes(entitlementState.entitlement.billingProvider ?? '')
    && entitlementState.entitlement.billingProvider !== currentProvider);
  const definitionsForStore = useMemo(() => planDefinitions.map((plan) => ({
    ...plan,
    skus: isGoogle && plan.tier !== 'free' ? GOOGLE_PLATFORM_PLAN_PRODUCTS[plan.tier] : plan.skus,
  })), [isGoogle, planDefinitions]);

  useEffect(() => {
    let mounted = true;
    loadPlatformPlanDefinitions()
      .then((definitions) => { if (mounted) setPlanDefinitions(definitions); })
      .catch((loadError) => console.warn('[usePlatformSubscription] pricing load failed:', loadError));
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    if (!adapter || !ready) {
      setLoadingProducts(Boolean(adapter) && !connectionError);
      return () => { mounted = false; };
    }
    setLoadingProducts(true);
    void (async () => {
      let skus = [...knownSkus];
      if (isGoogle) {
        const { data, error: catalogError } = await (supabase as any)
          .from('store_commerce_products')
          .select('product_id,base_plan_id,offer_id')
          .eq('provider', 'google_play').eq('app_id', 'com.pluggd.mobile')
          .eq('purchase_kind', 'platform_subscription').eq('product_type', 'subscription').eq('status', 'active');
        if (catalogError) throw catalogError;
        const approved = (data ?? []).filter((row: any) =>
          knownSkus.has(row.product_id) && googlePlatformPlan(row.product_id)?.billingCycle === row.base_plan_id,
        );
        if (!mounted) return [];
        setGoogleCatalog(approved);
        skus = [...new Set<string>(approved.map((row: any) => row.product_id))];
      }
      return skus.length ? adapter.fetchProducts(skus, 'subs') : [];
    })()
      .then((loaded) => {
        if (mounted) setProducts(loaded.filter((product) => knownSkus.has(storeProductId(product))));
      })
      .catch((loadError) => {
        console.warn('[usePlatformSubscription] product load failed:', loadError);
        if (mounted) setProducts([]);
      })
      .finally(() => { if (mounted) setLoadingProducts(false); });
    return () => { mounted = false; };
  }, [adapter, connectionError, isGoogle, knownSkus, ready]);

  const recoverEntitlement = useCallback(async (productId: string) => {
    for (const delay of RECONCILIATION_DELAYS_MS) {
      await wait(delay);
      const recovered = await loadPlatformPlanEntitlement();
      const googlePlan = googlePlatformPlan(productId);
      if (recovered.tier !== 'free' && (
        isGoogle
          ? recovered.billingProvider === 'google_play' && recovered.tier === googlePlan?.tier && recovered.billingCycle === googlePlan?.billingCycle
          : recovered.billingProvider === 'apple' && recovered.appleProductId === productId
      )) return recovered;
    }
    return null;
  }, [isGoogle]);

  const validate = useCallback(async (purchase: StorePurchase) => {
    if (!adapter) throw new Error('Your app store is not connected. Please try again.');
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user || !session.access_token) throw new Error('Sign in to manage a PLUGGD plan.');
    if (!purchase.purchaseToken || (!isGoogle && purchase.purchaseToken.split('.').length !== 3)) {
      const recovered = isGoogle ? null : await recoverEntitlement(purchase.productId);
      if (recovered) return { finishRequired: true, entitlementActive: true };
      throw new Error(`${storeName} confirmed this plan and PLUGGD is still syncing it. Do not subscribe again—reopen Plans in a moment.`);
    }
    const verification = await adapter.buildVerificationRequest(purchase, 'subscription', session.user.id);
    const { data, error: validationError } = await supabase.functions.invoke(verification.functionName, {
      headers: { Authorization: `Bearer ${session.access_token}` },
      body: { ...verification.body, subscription_scope: 'platform' },
    });
    if (validationError) {
      // A prior entitlement is not proof that this Google purchase token was
      // verified. Leave it unacknowledged for safe server retry/restore.
      const recovered = isGoogle ? null : await recoverEntitlement(purchase.productId);
      if (recovered) return { finishRequired: true, entitlementActive: true };
      throw new Error(`${storeName} confirmed this plan, but PLUGGD is still verifying it. Do not subscribe again—reopen Plans in a moment.`);
    }
    const response = data as Record<string, unknown> | null;
    if (isGoogle) return validateGooglePlatformPlanResponse(purchase.productId, response);
    if (!response || response.success !== true || response.type !== 'platform_subscription' || (response.tier !== 'starter' && response.tier !== 'creator' && response.tier !== 'pro')) {
      throw new Error(`${storeName} confirmed the purchase, but PLUGGD did not return a valid plan entitlement.`);
    }
    return { finishRequired: response.serverFinished !== true, entitlementActive: true };
  }, [adapter, isGoogle, recoverEntitlement, storeName]);

  useEffect(() => {
    if (!adapter) return;
    purchaseListener.current = adapter.listenForPurchases(async (purchase) => {
      if (!knownSkus.has(purchase.productId)) return;
      if (purchase.purchaseState === 'pending') {
        setPurchasingSku(null);
        setNotice(`${storeName} is waiting for payment approval. Do not subscribe again.`);
        return;
      }
      try {
        const result = await validate(purchase);
        if (result.finishRequired) await adapter.finishTransaction(purchase, false);
        await entitlementState.refresh();
        setError(null);
        setNotice(result.entitlementActive ? 'Your PLUGGD plan is active.' : 'Your Google Play plan is not currently active. Manage it in Google Play, or restore again after payment is resolved.');
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
  }, [adapter, entitlementState.refresh, knownSkus, storeName, validate]);

  const subscribe = useCallback(async (sku: string) => {
    setError(null);
    setNotice(null);
    if (!adapter || !ready) {
      setError(connectionError || 'Your app store is not connected. Please try again.');
      return;
    }
    if (isGoogle && (entitlementState.loading || entitlementState.error)) {
      setError('Your current plan could not be confirmed yet. Refresh Plans before purchasing.');
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('Sign in to choose a PLUGGD plan.');
      return;
    }
    if (hasOtherPaidProvider) {
      setError('This plan was started with another billing provider. Manage it where you originally subscribed.');
      return;
    }
    const product = products.find((candidate) => storeProductId(candidate) === sku);
    if (!product) {
      setError(`This PLUGGD plan is not currently available from ${storeName}.`);
      return;
    }
    setPurchasingSku(sku);
    try {
      const catalog = isGoogle ? googleCatalog.find((row) => row.product_id === sku) : null;
      if (isGoogle && (!catalog || !selectGoogleSubscriptionOffer(product, catalog.base_plan_id, catalog.offer_id))) {
        throw new Error('This plan does not have an available Google Play billing period.');
      }
      // Re-read this authenticated account immediately before opening the Play
      // sheet. Captured FREE/loading state is not evidence of no paid plan.
      const entitlement = isGoogle ? await loadPlatformPlanEntitlement(user.id) : entitlementState.entitlement;
      const targetGooglePlan = isGoogle ? googlePlatformPlan(sku) : null;
      const tierRank = { free: 0, starter: 1, creator: 2, pro: 3 };
      if (isGoogle && targetGooglePlan && entitlement.source === 'admin_grant' && entitlement.status === 'active'
        && (!entitlement.currentPeriodEnd || !Number.isFinite(Date.parse(entitlement.currentPeriodEnd)) || Date.parse(entitlement.currentPeriodEnd) > Date.now())
        && tierRank[targetGooglePlan.tier] > tierRank[entitlement.tier]) {
        throw new Error('You already have complimentary PLUGGD access. Contact support before changing to a higher paid plan so your existing access is protected.');
      }
      if (isGoogle && (entitlement.hasNonGooglePaidSource || (entitlement.tier !== 'free' && ['apple', 'stripe'].includes(entitlement.billingProvider ?? '')))) {
        throw new Error('This plan was started with another billing provider. Manage it where you originally subscribed.');
      }
      if (isGoogle && entitlement.billingProvider === 'google_play' && !googlePlatformPlan(entitlement.providerProductId ?? '')) {
        throw new Error('Your existing Google Play plan needs to be restored before changing plans.');
      }
      // Promotional overlays change the effective tier/cycle but not the
      // underlying store product that must be replaced.
      const currentGoogleSku = googlePlatformPlan(entitlement.providerProductId ?? '') ? entitlement.providerProductId : null;
      const googleIdentifiers = isGoogle ? await createGoogleBillingIdentifiers(user.id) : null;
      const googleReplacement = isGoogle
        ? googlePlanReplacement(currentGoogleSku, sku, await adapter.getAvailablePurchases({ includeSuspendedAndroid: true }), googleIdentifiers!.obfuscatedAccountId) : null;
      await adapter.requestSubscription({ sku, accountId: user.id, product, basePlanId: catalog?.base_plan_id, offerId: catalog?.offer_id, googleReplacement });
    } catch (purchaseError: any) {
      setPurchasingSku(null);
      if (purchaseError?.code !== 'user-cancelled') setError(purchaseError?.message || 'Plan purchase failed.');
    }
  }, [adapter, connectionError, entitlementState.entitlement, entitlementState.error, entitlementState.loading, googleCatalog, hasOtherPaidProvider, isGoogle, products, ready, storeName]);

  const restore = useCallback(async () => {
    setRestoring(true);
    setError(null);
    setNotice(null);
    try {
      if (!adapter || !ready) throw new Error('Your app store is not connected. Please try again.');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Sign in before restoring a PLUGGD plan.');
      const purchases = (await adapter.getAvailablePurchases(isGoogle ? { includeSuspendedAndroid: true } : undefined))
        .filter((purchase) => knownSkus.has(purchase.productId) && (isGoogle || purchase.purchaseState !== 'pending'));
      let activePurchases = 0;
      for (const purchase of purchases) {
        const result = await validate(purchase);
        if (result.finishRequired) await adapter.finishTransaction(purchase, false);
        if (result.entitlementActive) activePurchases += 1;
      }
      await entitlementState.refresh();
      setNotice(activePurchases ? 'Your PLUGGD plan has been restored.' : purchases.length ? 'Your Google Play plan is not currently active. Check its payment status in Google Play.' : `No restorable PLUGGD plan was found for this ${accountName}.`);
    } catch (restoreError) {
      setError(restoreError instanceof Error ? restoreError.message : 'Plan restore failed.');
    } finally {
      setRestoring(false);
    }
  }, [accountName, adapter, entitlementState.refresh, isGoogle, knownSkus, ready, validate]);

  return {
    ...entitlementState,
    planDefinitions: definitionsForStore,
    products,
    loadingProducts,
    purchasingSku,
    restoring,
    error: error || entitlementState.error || connectionError,
    notice,
    subscribe,
    restore,
    clearMessage: () => { setError(null); setNotice(null); },
    storeName,
    accountName,
    hasOtherPaidProvider,
    purchaseBlocked: isGoogle && (entitlementState.loading || Boolean(entitlementState.error)),
    isCurrentPlan: (sku: string | null) => isGoogle
      ? entitlementState.entitlement.providerProductId === sku && Boolean(googlePlatformPlan(sku ?? ''))
      : entitlementState.entitlement.billingProvider === 'apple' && entitlementState.entitlement.appleProductId === sku,
    priceForProduct: (product: StoreProduct | null, sku: string | null) => {
      if (!product) return null;
      if (!isGoogle) return product.displayPrice || null;
      const catalog = googleCatalog.find((row) => row.product_id === sku);
      return catalog ? selectGoogleSubscriptionOffer(product, catalog.base_plan_id, catalog.offer_id)?.displayPrice ?? null : null;
    },
    managementUrl: adapter?.subscriptionManagementUrl() ?? null,
  };
}
