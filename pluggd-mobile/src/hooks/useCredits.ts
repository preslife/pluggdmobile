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
  initConnection,
  endConnection,
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
import { useWalletStore } from './useWallet';

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

// Approved iOS credit packs. The production PLUGGD packs are GBP-priced;
// sandbox/simulator storefronts can report another localized currency, so UI
// copy falls back to the approved GBP label unless StoreKit also returns GBP.
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

function formatExpectedPrice(fallbackPriceGBP: number) {
  return `£${fallbackPriceGBP.toFixed(2)}`;
}

function displayPriceForProduct(product: Product | null, fallbackPriceGBP: number) {
  const expectedPrice = formatExpectedPrice(fallbackPriceGBP);
  if (!product?.localizedPrice) return expectedPrice;
  if (product.currency === 'GBP' || product.localizedPrice.includes('£')) return product.localizedPrice;
  return expectedPrice;
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
      localizedPrice: displayPriceForProduct(product, definition.fallbackPriceGBP),
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
  const [connected, setConnected] = useState(false);

  const setBalance = useWalletStore((s) => s.setBalance);
  const purchaseUpdateSub = useRef<any>(null);
  const purchaseErrorSub = useRef<any>(null);

  // ── Connect to IAP ──
  useEffect(() => {
    if (Platform.OS !== 'ios') return;

    let mounted = true;

    async function init() {
      try {
        await initConnection();
        if (mounted) setConnected(true);

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
      endConnection();
    };
  }, []);

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
        console.error('[useCredits] purchase error:', err);
        setPurchasing(false);
        // User cancelled is not an error we should display
        if (err.code !== 'E_USER_CANCELLED') {
          setError(err.message ?? 'Purchase failed');
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error: fnError } = await supabase.functions.invoke(
      'validate-iap-receipt',
      {
        body: {
          receipt_data: purchase.transactionReceipt,
          product_id: purchase.productId,
          transaction_id: purchase.transactionId,
          platform: 'ios',
        },
      },
    );

    if (fnError) throw fnError;

    // Update local balance from response
    if (data?.balance) {
      setBalance(data.balance);
    }

    return data;
  }

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
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        await requestPurchase({
          sku,
          appAccountToken: user.id,
          andDangerouslyFinishTransactionAutomaticallyIOS: false,
        });
        // Purchase listener handles the rest
      } catch (err: any) {
        setPurchasing(false);
        if (err?.code !== 'E_USER_CANCELLED') {
          setError(err?.message ?? 'Purchase failed');
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
