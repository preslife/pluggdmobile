import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { StoreProduct, StorePurchase, StorePurchaseError } from '../billing';
import { storeProductId } from '../billing';
import { withStoreTimeout } from '../billing/storeOperation';
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
  const { data: { session }, error: sessionError } = await withStoreTimeout(supabase.auth.getSession(), 'Your current plan could not be checked. Tap Retry plan details.');
  if (sessionError) throw sessionError;
  const user = session?.user;
  if (!user) return FREE_ENTITLEMENT;
  const { data, error } = await withStoreTimeout<any>((supabase as any)
    .from('user_subscriptions')
    .select('tier,status,current_period_end,billing_provider,billing_cycle,commission_rate,source,auto_renew_status,apple_product_id,stripe_subscription_id')
    .eq('user_id', user.id)
    .maybeSingle(), 'Your current plan could not be checked. Tap Retry plan details.');
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
      const next = await loadPlatformPlanEntitlement();
      setEntitlement(next);
      setError(null);
      return next;
    } catch (loadError) {
      setError('Your current plan could not be checked. Tap Retry plan details.');
      return null;
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
  const { adapter, ready, connectionError, retryConnection } = useStoreKit();
  const entitlementState = usePlatformPlanEntitlement();
  const [planDefinitions, setPlanDefinitions] = useState(PLATFORM_PLANS);
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [purchasingSku, setPurchasingSku] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [retryingStore, setRetryingStore] = useState(false);
  const [purchaseTakingLong, setPurchaseTakingLong] = useState(false);
  const [checkingPurchase, setCheckingPurchase] = useState(false);
  const [feedbackSku, setFeedbackSku] = useState<string | null>(null);
  const purchaseInFlight = useRef(false);
  const activePurchaseSku = useRef<string | null>(null);
  const nativeRequestSettled = useRef(false);
  const purchaseGeneration = useRef(0);
  const productRequest = useRef(0);
  const processingPurchases = useRef(new Map<string, Promise<void>>());
  const completedPurchases = useRef(new Set<string>());
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

  const reloadProducts = useCallback(async () => {
    const request = ++productRequest.current;
    if (!adapter || !ready || adapter.provider !== 'apple') {
      setLoadingProducts(Boolean(adapter && adapter.provider === 'apple') && !connectionError);
      return;
    }
    setLoadingProducts(true);
    setError(null);
    try {
      const loaded = await withStoreTimeout(adapter.fetchProducts([...PLATFORM_PLAN_SKUS], 'subs'), 'App Store prices could not be loaded. Tap Retry App Store.');
      if (request !== productRequest.current) return;
      setProducts(loaded.filter((product) => knownSkus.has(storeProductId(product))));
    } catch (loadError) {
      console.warn('[usePlatformSubscription] product load failed:', loadError);
      if (request === productRequest.current) {
        setProducts([]);
        setError('App Store prices could not be loaded. Tap Retry App Store to try again.');
      }
    } finally {
      if (request === productRequest.current) setLoadingProducts(false);
    }
  }, [adapter, connectionError, knownSkus, ready]);

  useEffect(() => {
    void reloadProducts();
    return () => { productRequest.current++; };
  }, [reloadProducts]);

  const retryStore = useCallback(async () => {
    if (purchaseInFlight.current || retryingStore) return;
    setRetryingStore(true);
    setError(null);
    setNotice(null);
    setFeedbackSku(null);
    try {
      if (!ready) await retryConnection();
      else await reloadProducts();
    } finally {
      setRetryingStore(false);
    }
  }, [ready, reloadProducts, retryConnection, retryingStore]);

  useEffect(() => {
    if (!purchasingSku) { setPurchaseTakingLong(false); return; }
    const timer = setTimeout(() => {
      setPurchaseTakingLong(true);
      setNotice('The App Store is taking longer than expected. Check purchase status before trying to subscribe again.');
    }, 45_000);
    return () => clearTimeout(timer);
  }, [purchasingSku]);

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
    const { data: { session } } = await withStoreTimeout(supabase.auth.getSession(), 'Your purchase is waiting for account verification. Check purchase status before subscribing again.');
    if (!session?.user || !session.access_token) throw new Error('Sign in to manage a PLUGGD plan.');
    if (typeof purchase.purchaseToken !== 'string' || purchase.purchaseToken.split('.').length !== 3) {
      const recovered = await recoverEntitlement(purchase.productId);
      if (recovered) return { finishRequired: true };
      throw new Error('The App Store confirmed this plan and PLUGGD is still syncing it. Do not subscribe again—reopen Plans in a moment.');
    }
    const verification = await adapter.buildVerificationRequest(purchase, 'subscription', session.user.id);
    const { data, error: validationError } = await withStoreTimeout(supabase.functions.invoke(verification.functionName, {
      headers: { Authorization: `Bearer ${session.access_token}` },
      body: { ...verification.body, subscription_scope: 'platform' },
    }), 'The App Store confirmed this purchase, but verification is taking longer than expected. Restore purchases before subscribing again.');
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

  // One transaction owns verification and finishing across listener, direct
  // StoreKit results and Restore. Native finish is never raced against a timeout:
  // a slow finish must remain owned until its real promise settles.
  const fulfillPurchase = useCallback((purchase: StorePurchase) => {
    const key = `${purchase.productId}:${purchase.transactionId || purchase.purchaseToken}`;
    if (completedPurchases.current.has(key)) return Promise.resolve();
    const existing = processingPurchases.current.get(key);
    if (existing) return existing;
    const operation = (async () => {
      const result = await validate(purchase);
      if (result.finishRequired) await adapter!.finishTransaction(purchase, false);
      completedPurchases.current.add(key);
    })();
    processingPurchases.current.set(key, operation);
    void operation.finally(() => {
      if (processingPurchases.current.get(key) === operation) processingPurchases.current.delete(key);
    }).catch(() => {});
    return operation;
  }, [adapter, validate]);

  const handlePurchase = useCallback(async (purchase: StorePurchase) => {
    if (!adapter || !knownSkus.has(purchase.productId)) return;
    const generation = purchaseGeneration.current;
    setFeedbackSku(purchase.productId);
    if (purchase.purchaseState === 'pending') {
      if (activePurchaseSku.current === purchase.productId) {
        purchaseInFlight.current = false;
        activePurchaseSku.current = null;
        setPurchasingSku(null);
      }
      setNotice('The App Store is waiting for payment approval. Do not subscribe again.');
      return;
    }
    try {
      await withStoreTimeout(fulfillPurchase(purchase), 'Your purchase is still syncing. Check purchase status before subscribing again.');
      const refreshed = await entitlementState.refresh();
      if (purchaseGeneration.current !== generation) return;
      setError(null);
      setNotice(refreshed ? 'Your PLUGGD plan is active.' : 'Your purchase is verified. Reopen Plans to refresh your access.');
    } catch (purchaseError) {
      if (purchaseGeneration.current === generation) setError(purchaseError instanceof Error ? purchaseError.message : 'Plan verification failed.');
    } finally {
      const key = `${purchase.productId}:${purchase.transactionId || purchase.purchaseToken}`;
      if (purchaseGeneration.current === generation && activePurchaseSku.current === purchase.productId && !processingPurchases.current.has(key)) {
        purchaseInFlight.current = false;
        activePurchaseSku.current = null;
        setPurchasingSku(null);
      }
    }
  }, [adapter, entitlementState.refresh, fulfillPurchase, knownSkus]);

  const checkPurchaseStatus = useCallback(async () => {
    if (!adapter || checkingPurchase) return;
    setCheckingPurchase(true);
    try {
      const purchases = await withStoreTimeout(adapter.getAvailablePurchases(), 'Purchase status could not be checked. Please try again.');
      const purchase = purchases.find((item) => item.productId === purchasingSku);
      if (purchase) await handlePurchase(purchase);
      else if (nativeRequestSettled.current && processingPurchases.current.size === 0) {
        purchaseInFlight.current = false;
        activePurchaseSku.current = null;
        setPurchasingSku(null);
        setError(null);
        setNotice('No completed purchase was found. You can choose a plan again. If Apple is waiting for payment approval, do not repeat the purchase.');
      } else {
        setNotice('No completed purchase is available yet. Finish or cancel any open App Store sheet, then check again. Do not subscribe again while Apple is processing it.');
      }
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : 'Purchase status could not be checked. Please try again.');
    } finally {
      setCheckingPurchase(false);
    }
  }, [adapter, checkingPurchase, handlePurchase, purchasingSku]);

  useEffect(() => {
    if (!adapter || adapter.provider !== 'apple') return;
    purchaseListener.current = adapter.listenForPurchases(handlePurchase);
    errorListener.current = adapter.listenForErrors((purchaseError: StorePurchaseError) => {
      if (purchaseError.productId && (!knownSkus.has(purchaseError.productId) || (activePurchaseSku.current && purchaseError.productId !== activePurchaseSku.current))) return;
      activePurchaseSku.current = null;
      purchaseInFlight.current = false;
      setPurchasingSku(null);
      if (purchaseError.code !== 'user-cancelled') setError(purchaseError.message || 'Plan purchase failed.');
    });
    return () => {
      purchaseListener.current?.remove();
      errorListener.current?.remove();
    };
  }, [adapter, handlePurchase, knownSkus]);

  const subscribe = useCallback(async (sku: string) => {
    // Guard synchronously: a second tap can precede React's busy render.
    if (purchaseInFlight.current) return;
    const generation = ++purchaseGeneration.current;
    purchaseInFlight.current = true;
    activePurchaseSku.current = sku;
    nativeRequestSettled.current = false;
    setPurchasingSku(sku);
    setFeedbackSku(sku);
    setPurchaseTakingLong(false);
    setError(null);
    setNotice(null);
    try {
      if (!adapter || !ready || adapter.provider !== 'apple') {
        throw new Error(connectionError || 'The App Store is not connected. Close Plans and try again.');
      }
      // The signed-in session already identifies the account. A network getUser
      // here delayed the Apple sheet without any visible response to the tap.
      const { data: { session }, error: sessionError } = await withStoreTimeout(supabase.auth.getSession(), 'Your session could not be checked. Please try again.');
      if (sessionError || !session?.user) throw new Error('Sign in to choose a PLUGGD plan.');
      if (entitlementState.loading || entitlementState.error) throw new Error('Your current plan could not be checked. Tap Retry plan details.');
      if (entitlementState.entitlement.billingProvider === 'stripe' && entitlementState.entitlement.tier !== 'free') {
        throw new Error('This plan was started outside the App Store. Manage it where you originally subscribed.');
      }
      const product = products.find((candidate) => storeProductId(candidate) === sku);
      if (!product) throw new Error('This PLUGGD plan is not currently available from the App Store. Tap Retry App Store to reload prices.');
      const result = await adapter.requestSubscription({ sku, accountId: session.user.id, product });
      if (purchaseGeneration.current === generation) nativeRequestSettled.current = true;
      // Some StoreKit versions return the purchase before delivering its event.
      // Share one idempotent handler so neither a dropped nor duplicate event loses it.
      for (const candidate of Array.isArray(result) ? result : result ? [result] : []) {
        if (purchaseGeneration.current === generation && candidate && typeof candidate === 'object' && typeof candidate.productId === 'string') {
          await handlePurchase(candidate as StorePurchase);
        }
      }
      // Missing results remain guarded; the watchdog exposes read-only status recovery.
    } catch (purchaseError: unknown) {
      if (purchaseGeneration.current !== generation) return;
      nativeRequestSettled.current = true;
      activePurchaseSku.current = null;
      purchaseInFlight.current = false;
      setPurchasingSku(null);
      const failure = purchaseError as StorePurchaseError;
      if (failure?.code !== 'user-cancelled') setError(failure?.message || 'Plan purchase failed. Please try again.');
    }
  }, [adapter, connectionError, entitlementState.entitlement, entitlementState.loading, entitlementState.error, handlePurchase, products, ready]);

  const restore = useCallback(async () => {
    if (purchaseInFlight.current) return;
    purchaseInFlight.current = true;
    purchaseGeneration.current++;
    activePurchaseSku.current = null;
    setFeedbackSku(null);
    setRestoring(true);
    setError(null);
    setNotice(null);
    let restoreSku: string | null = null;
    try {
      if (!adapter || !ready || adapter.provider !== 'apple') throw new Error('PLUGGD plans are currently available through the App Store on iPhone.');
      const { data: { session: restoreSession } } = await withStoreTimeout(supabase.auth.getSession(), 'Your session could not be checked. Please try again.');
      const user = restoreSession?.user;
      if (!user) throw new Error('Sign in before restoring a PLUGGD plan.');
      const purchases = (await withStoreTimeout(adapter.getAvailablePurchases(), 'Purchases could not be loaded. Please try again.')).filter((purchase) => knownSkus.has(purchase.productId) && purchase.purchaseState !== 'pending');
      for (const purchase of purchases) {
        restoreSku = purchase.productId;
        await withStoreTimeout(fulfillPurchase(purchase), 'Your purchase is still syncing. Restore purchases to check again.');
      }
      const refreshed = await entitlementState.refresh();
      setNotice(!refreshed ? 'Purchases were checked. Reopen Plans to refresh your access.' : purchases.length ? 'Your PLUGGD plan has been restored.' : 'No restorable PLUGGD plan was found for this App Store account.');
    } catch (restoreError) {
      setError(restoreError instanceof Error ? restoreError.message : 'Plan restore failed.');
    } finally {
      purchaseInFlight.current = processingPurchases.current.size > 0;
      if (purchaseInFlight.current) {
        activePurchaseSku.current = restoreSku;
        setPurchasingSku(restoreSku);
        nativeRequestSettled.current = true;
      }
      setRestoring(false);
    }
  }, [adapter, entitlementState.refresh, fulfillPurchase, knownSkus, ready]);

  return {
    ...entitlementState,
    planDefinitions,
    products,
    loadingProducts,
    retryStore,
    retryingStore,
    purchaseTakingLong,
    checkingPurchase,
    checkPurchaseStatus,
    entitlementError: entitlementState.error,
    feedbackSku,
    purchasingSku,
    restoring,
    error,
    globalError: entitlementState.error || connectionError,
    notice,
    subscribe,
    restore,
    clearMessage: () => { setError(null); setNotice(null); setFeedbackSku(null); },
    storeName: adapter?.storeName ?? 'App Store',
    managementUrl: adapter?.subscriptionManagementUrl() ?? null,
  };
}
