/**
 * useCredits — App Store / Google Play billing integration for credit packs.
 *
 * Handles:
 *  - Fetching consumable products from the device store
 *  - Purchasing credit packs
 *  - Receipt validation via validate-iap-receipt edge function
 *  - Purchase restoration
 *  - Purchase listener for interrupted/deferred purchases
 */
import { useEffect, useCallback, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useWalletStore, type WalletBalance } from './useWallet';
import { useStoreKit } from '../context/StoreKitProvider';
import { resolveCommercePolicy } from '../commerce/policy';
import {
  storeProductId,
  storeProductPrice,
  type StoreProduct,
  type StorePurchase,
  type StorePurchaseError,
} from '../billing';

// ─── SKU Definitions ──────────────────────────────────────────────────
export const CREDIT_PACK_SKUS = [
  'pluggd_credits_starter',
  'pluggd_credits_popular',
  'pluggd_credits_value',
  'pluggd_credits_premium',
  'pluggd_credits_ultimate',
] as const;

export type CreditPackSKU = (typeof CREDIT_PACK_SKUS)[number];

export interface CreditPackDefinition {
  sku: CreditPackSKU;
  label: string;
  fallbackPriceGBP: number;
  baseCredits: number;
  bonusCredits: number;
  bonusPercent: number;
  totalCredits: number;
  popular?: boolean;
}

// Approved store credit packs. App Store Connect / Play Console own customer-facing prices;
// fallback GBP values are retained only as catalogue reference data and must
// never be shown in place of StoreKit's storefront-localized price.
export const CREDIT_PACK_DEFINITIONS: Record<CreditPackSKU, CreditPackDefinition> = {
  pluggd_credits_starter: {
    sku: 'pluggd_credits_starter',
    label: 'Starter Credits',
    fallbackPriceGBP: 5,
    baseCredits: 500,
    bonusCredits: 0,
    bonusPercent: 0,
    totalCredits: 500,
  },
  pluggd_credits_popular: {
    sku: 'pluggd_credits_popular',
    label: 'Plus Credits',
    fallbackPriceGBP: 9.99,
    baseCredits: 1000,
    bonusCredits: 50,
    bonusPercent: 5,
    totalCredits: 1050,
    popular: true,
  },
  pluggd_credits_value: {
    sku: 'pluggd_credits_value',
    label: 'Value Credits',
    fallbackPriceGBP: 24.99,
    baseCredits: 2500,
    bonusCredits: 250,
    bonusPercent: 10,
    totalCredits: 2750,
  },
  pluggd_credits_premium: {
    sku: 'pluggd_credits_premium',
    label: 'Premium Credits',
    fallbackPriceGBP: 49.99,
    baseCredits: 5000,
    bonusCredits: 750,
    bonusPercent: 15,
    totalCredits: 5750,
  },
  pluggd_credits_ultimate: {
    sku: 'pluggd_credits_ultimate',
    label: 'Ultimate Credits',
    fallbackPriceGBP: 99.99,
    baseCredits: 10000,
    bonusCredits: 2000,
    bonusPercent: 20,
    totalCredits: 12000,
  },
};

// Maps SKU → total credits awarded (must match App Store Connect + backend)
export const SKU_CREDITS_MAP: Record<CreditPackSKU, number> = {
  pluggd_credits_starter: 500,
  pluggd_credits_popular: 1050,
  pluggd_credits_value: 2750,
  pluggd_credits_premium: 5750,
  pluggd_credits_ultimate: 12000,
};

export type CreditPackRecommendation = {
  sku: CreditPackSKU;
  label: string;
  count: number;
  credits: number;
};

/**
 * Returns the smallest-credit-overage pack combination for a shortfall, then
 * prefers the fewest separate purchases. It is display guidance only: every
 * Play purchase must still be explicitly initiated by the fan.
 */
export function recommendCreditPacks(shortfall: number): CreditPackRecommendation[] {
  const required = Math.max(0, Math.ceil(shortfall));
  if (!required) return [];

  // Every approved pack is a multiple of 50 credits. Searching one maximum
  // pack beyond the target guarantees a reachable recommendation.
  const unit = 50;
  const catalogue = CREDIT_PACK_SKUS.map((sku) => ({
    sku,
    units: CREDIT_PACK_DEFINITIONS[sku].totalCredits / unit,
  }));
  const target = Math.ceil(required / unit);
  const limit = target + Math.max(...catalogue.map((pack) => pack.units));
  const best = Array<number>(limit + 1).fill(Number.POSITIVE_INFINITY);
  const previous = Array<{ total: number; sku: CreditPackSKU } | null>(limit + 1).fill(null);
  best[0] = 0;

  for (let total = 1; total <= limit; total += 1) {
    for (const pack of catalogue) {
      const prior = total - pack.units;
      if (prior < 0 || !Number.isFinite(best[prior])) continue;
      if (best[prior] + 1 < best[total]) {
        best[total] = best[prior] + 1;
        previous[total] = { total: prior, sku: pack.sku };
      }
    }
  }

  let recommendedTotal = target;
  while (recommendedTotal <= limit && !Number.isFinite(best[recommendedTotal])) {
    recommendedTotal += 1;
  }
  if (recommendedTotal > limit) return [];

  const counts = new Map<CreditPackSKU, number>();
  for (let cursor = recommendedTotal; cursor > 0;) {
    const step = previous[cursor];
    if (!step) return [];
    counts.set(step.sku, (counts.get(step.sku) ?? 0) + 1);
    cursor = step.total;
  }

  return CREDIT_PACK_SKUS.flatMap((sku) => {
    const count = counts.get(sku) ?? 0;
    if (!count) return [];
    const definition = CREDIT_PACK_DEFINITIONS[sku];
    return [{
      sku,
      label: definition.label,
      count,
      credits: definition.totalCredits * count,
    }];
  });
}

export interface CreditPack {
  sku: CreditPackSKU;
  credits: number;
  baseCredits: number;
  bonusCredits: number;
  bonusPercent: number;
  fallbackPriceGBP: number;
  product: StoreProduct | null; // null if product not loaded yet
  localizedPrice: string;
  label: string;
  bonus?: string;
  popular?: boolean;
}

function displayPriceForProduct(product: StoreProduct | null) {
  return storeProductPrice(product);
}

function isWalletBalance(value: unknown): value is WalletBalance {
  if (!value || typeof value !== 'object') return false;
  const balance = value as Partial<WalletBalance>;
  return (
    Number.isFinite(balance.balance_credits) &&
    Number.isFinite(balance.pending_credits) &&
    Number.isFinite(balance.available_credits)
  );
}

function purchaseErrorMessage(
  error: Pick<StorePurchaseError, 'code' | 'message'>,
  storeName: string,
): string {
  switch (error.code) {
    case 'user-error':
      return `This store account is not currently allowed to make purchases.`;
    case 'item-unavailable':
    case 'sku-not-found':
      return `This credit pack is not available in your current ${storeName} storefront.`;
    case 'network-error':
      return `${storeName} could not be reached. Check your connection and try again.`;
    case 'remote-error':
    case 'service-error':
    case 'service-disconnected':
      return `${storeName} is temporarily unavailable. Please try again shortly.`;
    case 'deferred-payment':
    case 'pending':
      return `${storeName} is waiting for purchase approval. Your credits will appear when it is approved.`;
    case 'interrupted':
      return `${storeName} needs you to finish an account step before this purchase can continue.`;
    case 'iap-not-available':
    case 'billing-unavailable':
      return 'In-app purchases are not available on this device.';
    case 'unknown':
      return `${storeName} could not complete this purchase. Check your store account and purchase permissions, then try again.`;
    default:
      return error.message || `${storeName} could not complete this purchase. Please try again.`;
  }
}

function logPurchaseError(context: string, error: StorePurchaseError) {
  console.error(`[useCredits] ${context}:`, {
    code: error.code,
    message: error.message,
    debugMessage: error.debugMessage,
    responseCode: error.responseCode,
    productId: error.productId,
  });
}

const SESSION_REFRESH_WINDOW_SECONDS = 60;

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

function buildCreditPacks(prods: StoreProduct[] = []): CreditPack[] {
  return CREDIT_PACK_SKUS.map((sku) => {
    const definition = CREDIT_PACK_DEFINITIONS[sku];
    const product = prods.find((p) => storeProductId(p) === sku) ?? null;

    return {
      sku,
      credits: definition.totalCredits,
      baseCredits: definition.baseCredits,
      bonusCredits: definition.bonusCredits,
      bonusPercent: definition.bonusPercent,
      fallbackPriceGBP: definition.fallbackPriceGBP,
      product,
      localizedPrice: displayPriceForProduct(product),
      label: definition.label,
      bonus:
        definition.bonusPercent > 0
          ? `+${definition.bonusPercent}% bonus`
          : undefined,
      popular: definition.popular,
    };
  });
}

// ─── Hook ─────────────────────────────────────────────────────────────
export function useCredits() {
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [packs, setPacks] = useState<CreditPack[]>(() => buildCreditPacks());
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { ready: connected, connectionError, adapter } = useStoreKit();

  const setBalance = useWalletStore((s) => s.setBalance);
  const purchaseUpdateSub = useRef<any>(null);
  const purchaseErrorSub = useRef<any>(null);
  const pendingReconciliationStarted = useRef(false);

  // ── Fetch credit products after the root store connection is ready ──
  useEffect(() => {
    const billing = adapter!;
    if (!billing || !connected) return;

    let mounted = true;

    async function init() {
      try {
        const prods = await billing.fetchProducts([...CREDIT_PACK_SKUS], 'in-app');
        if (mounted) {
          setProducts(prods);
          setPacks(buildCreditPacks(prods));
        }
      } catch (err: any) {
        console.error('[useCredits] init failed:', err);
        if (mounted) setError(err?.message ?? `Failed to connect to ${billing.storeName}`);
      }
    }

    init();

    return () => {
      mounted = false;
    };
  }, [adapter, connected]);

  useEffect(() => {
    if (connectionError) setError(connectionError);
  }, [connectionError]);

  // ── Purchase listeners ──
  useEffect(() => {
    if (!adapter) return;

    purchaseUpdateSub.current = adapter.listenForPurchases(
      async (purchase: StorePurchase) => {
        if (!CREDIT_PACK_SKUS.includes(purchase.productId as CreditPackSKU)) return;
        console.log('[useCredits] purchase update:', purchase.productId);
        if (purchase.purchaseState === 'pending') {
          setPurchasing(false);
          setError(`${adapter.storeName} is waiting for payment approval. Do not buy again.`);
          return;
        }
        try {
          // Validate receipt with backend
          const verification = await validateReceipt(purchase);
          // On Android this consumes the item; on iOS it finishes StoreKit.
          if (verification.finishRequired) {
            await adapter.finishTransaction(purchase, true);
          }
          setPurchasing(false);
          setError(null);
        } catch (err: any) {
          console.error('[useCredits] validation failed:', err);
          setPurchasing(false);
          setError(err?.message ?? 'Receipt validation failed');
        }
      },
    );

    purchaseErrorSub.current = adapter.listenForErrors(
      (err: StorePurchaseError) => {
        if (err.productId && !CREDIT_PACK_SKUS.includes(err.productId as CreditPackSKU)) return;
        logPurchaseError('purchase error', err);
        setPurchasing(false);
        // User cancelled is not an error we should display
        if (err.code !== 'user-cancelled') {
          setError(purchaseErrorMessage(err, adapter.storeName));
        }
      },
    );

    return () => {
      purchaseUpdateSub.current?.remove();
      purchaseErrorSub.current?.remove();
    };
  }, [adapter]);

  // ── Validate receipt with Supabase ──
  async function validateReceipt(purchase: StorePurchase) {
    const billing = adapter!;
    if (!billing) throw new Error('Store billing is unavailable on this device.');
    const session = await requireAuthenticatedSession();
    const purchaseToken = purchase.purchaseToken;

    async function recoverServerVerifiedPurchase() {
      const transactionReference =
        billing.provider === 'apple' ? purchase.transactionId : purchase.purchaseToken;
      if (!transactionReference) return null;

      const metadata =
        billing.provider === 'apple'
          ? { transaction_id: transactionReference, product_id: purchase.productId }
          : { purchase_token: transactionReference, product_id: purchase.productId };

      const { data: ledgerEntry, error: ledgerError } = await supabase
        .from('wallet_ledger')
        .select('id,kind,amount_credits,meta')
        .eq('user_id', session.user.id)
        .eq('ref_type', billing.creditRail)
        .contains('meta', metadata)
        .limit(1)
        .maybeSingle();

      if (
        ledgerError ||
        !ledgerEntry ||
        !['topup_iap', 'topup'].includes(ledgerEntry.kind) ||
        ledgerEntry.amount_credits <= 0
      ) {
        if (ledgerError) {
          console.warn(
            '[useCredits] server-fulfilled purchase lookup failed:',
            ledgerError.message,
          );
        }
        return null;
      }

      const { data: balance, error: balanceError } = await supabase.rpc(
        'get_wallet_balance',
        { p_user_id: session.user.id },
      );
      if (balanceError) {
        console.warn(
          '[useCredits] recovered balance lookup failed:',
          balanceError.message,
        );
        return null;
      }

      if (!isWalletBalance(balance)) return null;
      setBalance(balance);
      return {
        success: true,
        recovered: true,
        type: 'credits',
        balance,
      };
    }

    // expo-iap exposes one token field: StoreKit 2 JWS on iOS and the Play
    // purchase token on Android. The server remains the trust boundary.
    if (
      typeof purchaseToken !== 'string' ||
      (billing.provider === 'apple' && purchaseToken.split('.').length !== 3)
    ) {
      const recovered = await recoverServerVerifiedPurchase();
      if (recovered) {
        return { data: recovered, finishRequired: billing.provider === 'apple' };
      }
      throw new Error(
        `${billing.storeName} confirmed this purchase, but verification is still pending. Reopen Wallet or use Restore Purchases to try again.`,
      );
    }

    const verification = await billing.buildVerificationRequest(
      purchase,
      'credits',
      session.user.id,
    );
    const { data, error: fnError } = await supabase.functions.invoke(
      verification.functionName,
      {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: verification.body,
      },
    );

    if (fnError) {
      // Apple's signed server notification can win the race with the client
      // callback. Treat that verified, user-owned transaction as success
      // instead of displaying a false failure or encouraging another purchase.
      const recovered = await recoverServerVerifiedPurchase();
      if (recovered) {
        return { data: recovered, finishRequired: billing.provider === 'apple' };
      }
      console.error('[useCredits] receipt verification request failed:', {
        name: fnError.name,
        message: fnError.message,
        productId: purchase.productId,
        transactionId: purchase.transactionId,
      });
      throw new Error(
        `${billing.storeName} confirmed this purchase, but PLUGGD is still verifying it. Do not buy again—reopen Wallet in a moment.`,
      );
    }

    if (billing.provider === 'google') {
      const response = data as Record<string, unknown> | null;
      if (
        !response ||
        response.success !== true ||
        response.provider !== 'google_play' ||
        response.purchase_kind !== 'credit_pack'
      ) {
        throw new Error('Google Play confirmed the purchase, but PLUGGD did not return a valid credit entitlement.');
      }
      if (response.finish_required === true && response.finish_mode !== 'consume') {
        throw new Error('Google Play returned an invalid credit completion mode.');
      }

      const { data: balance, error: balanceError } = await supabase.rpc(
        'get_wallet_balance',
        { p_user_id: session.user.id },
      );
      if (!balanceError && isWalletBalance(balance)) setBalance(balance);
      return { data: response, finishRequired: response.finish_required === true };
    }

    // Preserve the submitted StoreKit 2 response path.
    if (data?.balance) setBalance(data.balance);
    return { data, finishRequired: true };
  }

  // Recover a store-confirmed transaction if the app was interrupted between
  // payment and server validation. The backend ledger idempotency key makes
  // this safe to repeat after relaunches.
  useEffect(() => {
    const billing = adapter!;
    if (
      !billing ||
      !connected ||
      pendingReconciliationStarted.current
    ) {
      return;
    }

    pendingReconciliationStarted.current = true;
    let cancelled = false;

    async function reconcilePendingPurchases() {
      try {
        const purchases = await billing.getAvailablePurchases();
        const pendingCredits = purchases.filter((purchase) =>
          CREDIT_PACK_SKUS.includes(purchase.productId as CreditPackSKU),
        );

        for (const purchase of pendingCredits) {
          if (purchase.purchaseState === 'pending') continue;
          const verification = await validateReceipt(purchase);
          if (verification.finishRequired) {
            await billing.finishTransaction(purchase, true);
          }
        }

        if (!cancelled && pendingCredits.length > 0) {
          setPurchasing(false);
          setError(null);
        }
      } catch (reconciliationError) {
        console.error(
          '[useCredits] pending purchase reconciliation failed:',
          reconciliationError,
        );
        if (!cancelled) {
          setPurchasing(false);
          setError(
            reconciliationError instanceof Error
              ? reconciliationError.message
              : `${billing.storeName} confirmed a purchase that is still being verified.`,
          );
        }
      }
    }

    void reconcilePendingPurchases();
    return () => {
      cancelled = true;
    };
  }, [adapter, connected]);

  // ── Purchase a credit pack ──
  const purchaseCredits = useCallback(
    async (sku: CreditPackSKU) => {
      if (!connected || !adapter) {
        setError('Store billing is not connected');
        return;
      }

      setPurchasing(true);
      setError(null);

      try {
        const session = await requireAuthenticatedSession();

        const policy = await resolveCommercePolicy({
          kind: 'credit_pack',
          itemId: sku,
          classification: 'digital',
        });
        if (policy.permittedRail !== adapter.creditRail) {
          throw new Error(policy.reason);
        }

        await adapter.requestProduct({
          sku,
          accountId: session.user.id,
        });
        // Purchase listener handles the rest
      } catch (err: any) {
        setPurchasing(false);
        if (err?.code !== 'user-cancelled') {
          if (err?.code) {
            logPurchaseError('purchase request failed', err as StorePurchaseError);
            setError(purchaseErrorMessage(err as StorePurchaseError, adapter.storeName));
          } else {
            setError(err?.message ?? 'Purchase failed');
          }
        }
      }
    },
    [adapter, connected],
  );

  // ── Restore purchases (consumables don't restore, but needed for compliance) ──
  const restorePurchases = useCallback(async () => {
    setRestoring(true);
    try {
      if (!adapter) throw new Error('Store billing is unavailable on this device.');
      const purchases = await adapter.getAvailablePurchases();
      // For consumables, there's nothing to restore — they're one-time.
      // But we validate any pending receipts that weren't finished.
      for (const purchase of purchases) {
        if (CREDIT_PACK_SKUS.includes(purchase.productId as CreditPackSKU)) {
          if (purchase.purchaseState === 'pending') continue;
          const verification = await validateReceipt(purchase);
          if (verification.finishRequired) {
            await adapter.finishTransaction(purchase, true);
          }
        }
      }
      setRestoring(false);
    } catch (err: any) {
      setRestoring(false);
      setError(err?.message ?? 'Restore failed');
    }
  }, [adapter]);

  return {
    packs,
    products,
    purchasing,
    restoring,
    error,
    connected,
    storeName: adapter?.storeName ?? 'store',
    storeAccountName: adapter?.accountName ?? 'store account',
    purchaseCredits,
    restorePurchases,
    clearError: () => setError(null),
  };
}
