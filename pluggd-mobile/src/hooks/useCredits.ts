/**
 * useCredits — Apple IAP integration for credit packs.
 *
 * Handles:
 *  - Fetching IAP products from App Store
 *  - Purchasing credit packs
 *  - Receipt validation via validate-iap-receipt edge function
 *  - Purchase restoration
 *  - Purchase listener for interrupted/deferred purchases
 */
import { useEffect, useCallback, useState, useRef } from 'react';
import {
  getProducts,
  requestPurchase,
  finishTransaction,
  purchaseUpdatedListener,
  purchaseErrorListener,
  getAvailablePurchases,
  type Product,
  type Purchase,
  type PurchaseError,
} from 'react-native-iap';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { useWalletStore, type WalletBalance } from './useWallet';
import { useStoreKit } from '../context/StoreKitProvider';
import { resolveCommercePolicy } from '../commerce/policy';

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

// Approved iOS credit packs. App Store Connect owns customer-facing prices;
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

export interface CreditPack {
  sku: CreditPackSKU;
  credits: number;
  baseCredits: number;
  bonusCredits: number;
  bonusPercent: number;
  fallbackPriceGBP: number;
  product: Product | null; // null if product not loaded yet
  localizedPrice: string;
  label: string;
  bonus?: string;
  popular?: boolean;
}

function displayPriceForProduct(product: Product | null) {
  return product?.localizedPrice ?? '';
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

function purchaseErrorMessage(error: Pick<PurchaseError, 'code' | 'message'>): string {
  switch (error.code) {
    case 'E_USER_ERROR':
      return 'This Apple account is not currently allowed to make purchases.';
    case 'E_ITEM_UNAVAILABLE':
      return 'This credit pack is not available in your current App Store.';
    case 'E_NETWORK_ERROR':
      return 'The App Store could not be reached. Check your connection and try again.';
    case 'E_REMOTE_ERROR':
    case 'E_SERVICE_ERROR':
      return 'The App Store is temporarily unavailable. Please try again shortly.';
    case 'E_DEFERRED_PAYMENT':
      return 'Apple is waiting for purchase approval. Your credits will appear when it is approved.';
    case 'E_INTERRUPTED':
      return 'Apple needs you to finish an account step before this purchase can continue.';
    case 'E_IAP_NOT_AVAILABLE':
      return 'In-app purchases are not available on this device.';
    case 'E_UNKNOWN':
      return 'Apple could not complete this purchase. Check your App Store account and purchase permissions, then try again.';
    default:
      return error.message || 'Apple could not complete this purchase. Please try again.';
  }
}

function logPurchaseError(context: string, error: PurchaseError) {
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

function buildCreditPacks(prods: Product[] = []): CreditPack[] {
  return CREDIT_PACK_SKUS.map((sku) => {
    const definition = CREDIT_PACK_DEFINITIONS[sku];
    const product = prods.find((p) => p.productId === sku) ?? null;

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
  const [products, setProducts] = useState<Product[]>([]);
  const [packs, setPacks] = useState<CreditPack[]>(() => buildCreditPacks());
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { ready: connected, connectionError } = useStoreKit();

  const setBalance = useWalletStore((s) => s.setBalance);
  const purchaseUpdateSub = useRef<any>(null);
  const purchaseErrorSub = useRef<any>(null);
  const pendingReconciliationStarted = useRef(false);

  // ── Fetch credit products after the root StoreKit connection is ready ──
  useEffect(() => {
    if (Platform.OS !== 'ios' || !connected) return;

    let mounted = true;

    async function init() {
      try {
        const prods = await getProducts({ skus: [...CREDIT_PACK_SKUS] });
        if (mounted) {
          setProducts(prods);
          setPacks(buildCreditPacks(prods));
        }
      } catch (err: any) {
        console.error('[useCredits] init failed:', err);
        if (mounted) setError(err?.message ?? 'Failed to connect to App Store');
      }
    }

    init();

    return () => {
      mounted = false;
    };
  }, [connected]);

  useEffect(() => {
    if (connectionError) setError(connectionError);
  }, [connectionError]);

  // ── Purchase listeners ──
  useEffect(() => {
    if (Platform.OS !== 'ios') return;

    purchaseUpdateSub.current = purchaseUpdatedListener(
      async (purchase: Purchase) => {
        console.log('[useCredits] purchase update:', purchase.productId);
        try {
          // Validate receipt with backend
          await validateReceipt(purchase);
          // Finish the transaction so Apple knows we handled it
          await finishTransaction({ purchase, isConsumable: true });
          setPurchasing(false);
          setError(null);
        } catch (err: any) {
          console.error('[useCredits] validation failed:', err);
          setPurchasing(false);
          setError(err?.message ?? 'Receipt validation failed');
        }
      },
    );

    purchaseErrorSub.current = purchaseErrorListener(
      (err: PurchaseError) => {
        logPurchaseError('purchase error', err);
        setPurchasing(false);
        // User cancelled is not an error we should display
        if (err.code !== 'E_USER_CANCELLED') {
          setError(purchaseErrorMessage(err));
        }
      },
    );

    return () => {
      purchaseUpdateSub.current?.remove();
      purchaseErrorSub.current?.remove();
    };
  }, []);

  // ── Validate receipt with Supabase ──
  async function validateReceipt(purchase: Purchase) {
    const session = await requireAuthenticatedSession();
    const signedTransaction = purchase.verificationResultIOS;

    async function recoverServerVerifiedPurchase() {
      if (!purchase.transactionId) return null;

      const { data: ledgerEntry, error: ledgerError } = await supabase
        .from('wallet_ledger')
        .select('id,kind,amount_credits,meta')
        .eq('user_id', session.user.id)
        .eq('ref_type', 'apple_iap')
        .contains('meta', {
          transaction_id: purchase.transactionId,
          product_id: purchase.productId,
        })
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

    // The StoreKit 2 adapter intentionally leaves `transactionReceipt` empty.
    // `verificationResultIOS` is Apple's signed transaction JWS and is the
    // only client-supplied transaction payload the server may trust.
    if (
      typeof signedTransaction !== 'string' ||
      signedTransaction.split('.').length !== 3
    ) {
      const recovered = await recoverServerVerifiedPurchase();
      if (recovered) return recovered;
      throw new Error(
        'Apple confirmed this purchase, but verification is still pending. Reopen Wallet or use Restore Purchases to try again.',
      );
    }

    const { data, error: fnError } = await supabase.functions.invoke(
      'validate-iap-receipt',
      {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          receipt_data: signedTransaction,
          product_id: purchase.productId,
          transaction_id: purchase.transactionId,
          platform: 'ios',
        },
      },
    );

    if (fnError) {
      // Apple's signed server notification can win the race with the client
      // callback. Treat that verified, user-owned transaction as success
      // instead of displaying a false failure or encouraging another purchase.
      const recovered = await recoverServerVerifiedPurchase();
      if (recovered) return recovered;
      console.error('[useCredits] receipt verification request failed:', {
        name: fnError.name,
        message: fnError.message,
        productId: purchase.productId,
        transactionId: purchase.transactionId,
      });
      throw new Error(
        'Apple confirmed this purchase, but PLUGGD is still verifying it. Do not buy again—reopen Wallet in a moment.',
      );
    }

    // Update local balance from response
    if (data?.balance) {
      setBalance(data.balance);
    }

    return data;
  }

  // Recover an Apple-confirmed transaction if the app was interrupted between
  // payment and server validation. When StoreKit reports an unfinished
  // consumable, the backend transaction/ledger idempotency keys make this safe
  // to repeat after relaunches. Apple's server notification is the independent
  // recovery path when StoreKit no longer returns the consumable to the app.
  useEffect(() => {
    if (
      Platform.OS !== 'ios' ||
      !connected ||
      pendingReconciliationStarted.current
    ) {
      return;
    }

    pendingReconciliationStarted.current = true;
    let cancelled = false;

    async function reconcilePendingPurchases() {
      try {
        const purchases = await getAvailablePurchases();
        const pendingCredits = purchases.filter((purchase) =>
          CREDIT_PACK_SKUS.includes(purchase.productId as CreditPackSKU),
        );

        for (const purchase of pendingCredits) {
          await validateReceipt(purchase);
          await finishTransaction({ purchase, isConsumable: true });
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
              : 'Apple confirmed a purchase that is still being verified.',
          );
        }
      }
    }

    void reconcilePendingPurchases();
    return () => {
      cancelled = true;
    };
  }, [connected]);

  // ── Purchase a credit pack ──
  const purchaseCredits = useCallback(
    async (sku: CreditPackSKU) => {
      if (!connected) {
        setError('App Store not connected');
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
        if (policy.permittedRail !== 'apple_iap') {
          throw new Error(policy.reason);
        }

        await requestPurchase({
          sku,
          appAccountToken: session.user.id,
          andDangerouslyFinishTransactionAutomaticallyIOS: false,
        });
        // Purchase listener handles the rest
      } catch (err: any) {
        setPurchasing(false);
        if (err?.code !== 'E_USER_CANCELLED') {
          if (err?.code) {
            logPurchaseError('purchase request failed', err as PurchaseError);
            setError(purchaseErrorMessage(err as PurchaseError));
          } else {
            setError(err?.message ?? 'Purchase failed');
          }
        }
      }
    },
    [connected],
  );

  // ── Restore purchases (consumables don't restore, but needed for compliance) ──
  const restorePurchases = useCallback(async () => {
    setRestoring(true);
    try {
      const purchases = await getAvailablePurchases();
      // For consumables, there's nothing to restore — they're one-time.
      // But we validate any pending receipts that weren't finished.
      for (const purchase of purchases) {
        if (CREDIT_PACK_SKUS.includes(purchase.productId as CreditPackSKU)) {
          await validateReceipt(purchase);
          await finishTransaction({ purchase, isConsumable: true });
        }
      }
      setRestoring(false);
    } catch (err: any) {
      setRestoring(false);
      setError(err?.message ?? 'Restore failed');
    }
  }, []);

  return {
    packs,
    products,
    purchasing,
    restoring,
    error,
    connected,
    purchaseCredits,
    restorePurchases,
    clearError: () => setError(null),
  };
}
