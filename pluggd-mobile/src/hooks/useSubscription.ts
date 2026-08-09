import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  selectGoogleSubscriptionOffer,
  storeProductId,
  storeProductPrice,
  type StoreProduct,
  type StorePurchase,
  type StorePurchaseError,
} from '../billing';
import { useStoreKit } from '../context/StoreKitProvider';
import { supabase } from '../lib/supabase';

export interface MembershipProduct {
  catalogId: string;
  sku: string;
  creatorId: string;
  tierId: string;
  basePlanId: string | null;
  offerId: string | null;
  label: string;
  localizedPrice: string | null;
  product: StoreProduct | null;
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
  store_sku: string;
  store_base_plan_id: string | null;
  status: 'active' | 'cancelled' | 'past_due' | 'expired';
  current_period_end: string | null;
}

type CatalogRow = {
  id: string;
  creator_id: string;
  membership_tier_id: string;
  product_id: string;
  base_plan_id?: string | null;
  offer_id?: string | null;
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
  provider_product_id?: string | null;
  provider_base_plan_id?: string | null;
  metadata?: Record<string, any> | null;
  membership_tiers?: { name?: string | null } | Array<{ name?: string | null }> | null;
};

function relatedName(value: CatalogRow['membership_tiers'] | FanSubscriptionRow['membership_tiers']) {
  return Array.isArray(value) ? value[0]?.name ?? null : value?.name ?? null;
}

function localizedPrice(product: StoreProduct | null, catalog: CatalogRow): string | null {
  if (!product) return null;
  if (product.platform === 'android' && product.type === 'subs') {
    return selectGoogleSubscriptionOffer(
      product,
      catalog.base_plan_id,
      catalog.offer_id,
    )?.displayPrice ?? null;
  }
  return storeProductPrice(product) || null;
}

const PRODUCT_LOAD_DELAYS_MS = [0, 700, 1400, 2400] as const;
const SERVER_RECONCILIATION_DELAYS_MS = [0, 700, 1400, 2400, 4000] as const;
const SESSION_REFRESH_WINDOW_SECONDS = 60;

function waitForProductRetry(delayMs: number) {
  if (delayMs <= 0) return Promise.resolve();
  return new Promise<void>((resolve) => setTimeout(resolve, delayMs));
}

async function requireAuthenticatedSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;

  let session = data.session;
  const expiresSoon =
    typeof session?.expires_at === 'number' &&
    session.expires_at <= Math.floor(Date.now() / 1000) + SESSION_REFRESH_WINDOW_SECONDS;

  if (session && expiresSoon) {
    const refreshed = await supabase.auth.refreshSession();
    if (refreshed.error) throw refreshed.error;
    session = refreshed.data.session;
  }

  if (!session?.user?.id || !session.access_token) {
    throw new Error('Please sign in again to continue.');
  }

  return session;
}

export function useSubscription(options?: { creatorId?: string | null }) {
  const creatorId = options?.creatorId ?? null;
  const { ready: storeBillingReady, connectionError, adapter } = useStoreKit();
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
    let query = adapter?.provider === 'google'
      ? (supabase as any)
          .from('store_commerce_products')
          .select('id,creator_id,membership_tier_id,product_id,base_plan_id,offer_id,status,membership_tiers(name)')
          .eq('provider', 'google_play')
          .eq('app_id', 'com.pluggd.mobile')
          .eq('purchase_kind', 'creator_membership')
          .eq('product_type', 'subscription')
          .eq('status', 'active')
      : (supabase as any)
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
  }, [adapter?.provider, creatorId]);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    if (!adapter) {
      setLoading(false);
      return;
    }
    if (!storeBillingReady || !catalog.length) {
      if (storeBillingReady) {
        setTiers([]);
        setLoading(false);
      }
      return;
    }
    let mounted = true;
    void (async () => {
      setLoading(true);
      try {
        let subscriptions: StoreProduct[] = [];
        for (let attempt = 0; attempt < PRODUCT_LOAD_DELAYS_MS.length; attempt += 1) {
          await waitForProductRetry(PRODUCT_LOAD_DELAYS_MS[attempt]);
          subscriptions = await adapter.fetchProducts(productIds, 'subs');
          console.info(`[useSubscription] ${adapter.storeName} catalogue response`, {
            attempt: attempt + 1,
            requested: productIds,
            returned: subscriptions.map(storeProductId),
          });
          if (subscriptions.length > 0 || !mounted) break;
        }
        if (!mounted) return;
        setTiers(catalog.map((row) => {
          const product = subscriptions.find((item) => storeProductId(item) === row.product_id) ?? null;
          return {
            catalogId: row.id,
            sku: row.product_id,
            creatorId: row.creator_id,
            tierId: row.membership_tier_id,
            basePlanId: row.base_plan_id ?? null,
            offerId: row.offer_id ?? null,
            label: relatedName(row.membership_tiers) ?? 'Creator membership',
            localizedPrice: localizedPrice(product, row),
            product,
            provisioned: Boolean(product && localizedPrice(product, row)),
          };
        }));
      } catch (loadError) {
        console.warn(`[useSubscription] ${adapter.storeName} product load failed:`, loadError);
        if (mounted) setTiers(catalog.map((row) => ({
          catalogId: row.id,
          sku: row.product_id,
          creatorId: row.creator_id,
          tierId: row.membership_tier_id,
          basePlanId: row.base_plan_id ?? null,
          offerId: row.offer_id ?? null,
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
  }, [adapter, catalog, productIds.join('|'), storeBillingReady]);

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
        .select('id,creator_id,tier_id,apple_sku,provider_product_id,provider_base_plan_id,status,current_period_end,metadata,membership_tiers(name)')
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
          store_sku:
            adapter?.provider === 'google'
              ? row.provider_product_id ?? metadata.store_subscription?.provider_product_id ?? ''
              : row.apple_sku ?? metadata.apple_sku ?? '',
          store_base_plan_id:
            adapter?.provider === 'google'
              ? row.provider_base_plan_id ?? metadata.store_subscription?.provider_base_plan_id ?? null
              : null,
          status: row.status,
          current_period_end: row.current_period_end,
        };
      }));
    } catch (refreshError) {
      console.warn('[useSubscription] membership refresh failed:', refreshError);
    }
  }, [adapter?.provider]);

  useEffect(() => {
    void refreshMemberships();
  }, [refreshMemberships]);

  const validateReceipt = useCallback(async (purchase: StorePurchase) => {
    const billing = adapter!;
    if (!billing) throw new Error('Store billing is unavailable on this device.');
    const session = await requireAuthenticatedSession();
    const purchaseToken = purchase.purchaseToken;

    async function recoverServerVerifiedMembership() {
      for (const delayMs of SERVER_RECONCILIATION_DELAYS_MS) {
        await waitForProductRetry(delayMs);

        let query = (supabase as any)
          .from('fan_subscriptions')
          .select('id,status,current_period_end,apple_sku,metadata')
          .eq('fan_id', session.user.id)
          .in('status', ['active', 'past_due', 'cancelled'])
          .order('updated_at', { ascending: false })
          .limit(1);
        query = billing.provider === 'apple'
          ? query.eq('apple_sku', purchase.productId)
          : query.contains('metadata', { google_play_product_id: purchase.productId });
        const { data: subscription, error: lookupError } = await query.maybeSingle();

        if (lookupError) {
          console.warn(
            '[useSubscription] server-verified membership lookup failed:',
            lookupError.message,
          );
          return null;
        }

        const periodEnd = subscription?.current_period_end
          ? new Date(subscription.current_period_end).getTime()
          : null;
        const remainsEntitled =
          subscription?.status === 'active' ||
          subscription?.status === 'past_due' ||
          (subscription?.status === 'cancelled' &&
            periodEnd !== null &&
            Number.isFinite(periodEnd) &&
            periodEnd > Date.now());

        if (subscription && remainsEntitled) {
          return {
            success: true,
            recovered: true,
            type: 'subscription',
            subscription_id: subscription.id,
          };
        }
      }

      return null;
    }

    if (
      typeof purchaseToken !== 'string' ||
      (billing.provider === 'apple' && purchaseToken.split('.').length !== 3)
    ) {
      const recovered = await recoverServerVerifiedMembership();
      if (recovered) {
        return { data: recovered, finishRequired: billing.provider === 'apple' };
      }
      throw new Error(
        `${billing.storeName} confirmed this membership and PLUGGD is still syncing it. Do not subscribe again—reopen this page in a moment.`,
      );
    }
    const verification = await billing.buildVerificationRequest(
      purchase,
      'subscription',
      session.user.id,
    );
    const { data, error: validationError } = await supabase.functions.invoke(verification.functionName, {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      body: verification.body,
    });
    if (validationError) {
      const recovered = await recoverServerVerifiedMembership();
      if (recovered) {
        return { data: recovered, finishRequired: billing.provider === 'apple' };
      }
      console.error('[useSubscription] receipt verification request failed:', {
        name: validationError.name,
        message: validationError.message,
        productId: purchase.productId,
        transactionId: purchase.transactionId,
      });
      throw new Error(
        `${billing.storeName} confirmed this membership, but PLUGGD is still verifying it. Do not subscribe again—reopen this page in a moment.`,
      );
    }
    if (billing.provider === 'google') {
      const response = data as Record<string, unknown> | null;
      if (
        !response ||
        response.success !== true ||
        response.provider !== 'google_play' ||
        response.purchase_kind !== 'creator_membership' ||
        typeof response.subscription_id !== 'string' ||
        typeof response.store_subscription_entitlement_id !== 'string'
      ) {
        throw new Error('Google Play confirmed the membership, but PLUGGD did not return a valid entitlement.');
      }
      if (response.finish_required === true && response.finish_mode !== 'acknowledge') {
        throw new Error('Google Play returned an invalid membership completion mode.');
      }
      return { data: response, finishRequired: response.finish_required === true };
    }
    return { data: data ?? { success: true, type: 'subscription' }, finishRequired: true };
  }, [adapter]);

  useEffect(() => {
    if (!adapter) return;
    purchaseUpdateSub.current = adapter.listenForPurchases(async (purchase: StorePurchase) => {
      if (!knownProductIds.current.has(purchase.productId)) return;
      if (purchase.purchaseState === 'pending') {
        setPurchasing(false);
        setError(`${adapter.storeName} is waiting for payment approval. Do not subscribe again.`);
        return;
      }
      try {
        const verification = await validateReceipt(purchase);
        if (verification.finishRequired) {
          await adapter.finishTransaction(purchase, false);
        }
        setPurchasing(false);
        setError(null);
        await refreshMemberships();
      } catch (validationError) {
        setPurchasing(false);
        setError(validationError instanceof Error ? validationError.message : 'Subscription validation failed');
      }
    });
    purchaseErrorSub.current = adapter.listenForErrors((purchaseError: StorePurchaseError) => {
      if (purchaseError.productId && !knownProductIds.current.has(purchaseError.productId)) return;
      setPurchasing(false);
      if (purchaseError.code !== 'user-cancelled') setError(purchaseError.message ?? 'Subscription purchase failed');
    });
    return () => {
      purchaseUpdateSub.current?.remove();
      purchaseErrorSub.current?.remove();
    };
  }, [adapter, refreshMemberships, validateReceipt]);

  const subscribe = useCallback(async (catalogId: string) => {
    const product = tiers.find((tier) => tier.catalogId === catalogId);
    if (!adapter || !storeBillingReady) {
      setError('Store billing is not connected.');
      return;
    }
    if (!product?.product || !product.provisioned) {
      setError(`This creator tier is not yet available through ${adapter.storeName}.`);
      return;
    }
    setPurchasing(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Sign in to subscribe.');
      await adapter.requestSubscription({
        sku: product.sku,
        accountId: user.id,
        profileId: product.creatorId,
        product: product.product,
        basePlanId: product.basePlanId,
        offerId: product.offerId,
      });
    } catch (purchaseError: any) {
      setPurchasing(false);
      if (purchaseError?.code !== 'user-cancelled') {
        setError(purchaseError?.message ?? 'Subscription purchase failed');
      }
    }
  }, [adapter, storeBillingReady, tiers]);

  const restoreSubscriptions = useCallback(async () => {
    setRestoring(true);
    setError(null);
    try {
      if (!adapter) throw new Error('Store billing is unavailable on this device.');
      const purchases = await adapter.getAvailablePurchases();
      for (const purchase of purchases) {
        const isCurrentProduct = knownProductIds.current.has(purchase.productId);
        const isLegacyMembership = purchase.productId.startsWith('pluggd_tier_');
        if (!isCurrentProduct && !isLegacyMembership) continue;
        if (purchase.purchaseState === 'pending') continue;
        const verification = await validateReceipt(purchase);
        if (verification.finishRequired) {
          await adapter.finishTransaction(purchase, false);
        }
      }
      await refreshMemberships();
    } catch (restoreError) {
      setError(restoreError instanceof Error ? restoreError.message : 'Restore failed');
    } finally {
      setRestoring(false);
    }
  }, [adapter, refreshMemberships, validateReceipt]);

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
    billingProvider: adapter?.provider ?? null,
    storeName: adapter?.storeName ?? 'store',
    subscriptionRail: adapter?.subscriptionRail ?? null,
    subscriptionManagementUrl: adapter?.subscriptionManagementUrl() ?? null,
  };
}
