import * as Crypto from 'expo-crypto';
import {
  endConnection,
  fetchProducts,
  finishTransaction,
  getAvailablePurchases,
  getStorefront,
  initConnection,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestPurchase,
} from 'expo-iap';
import type {
  ProductSubscriptionAndroid,
} from 'expo-iap';
import type {
  StoreBillingAdapter,
  StoreBillingPurchaseInput,
  StoreProduct,
} from '../types';

export const ANDROID_PACKAGE_NAME = 'com.pluggd.mobile';
export const GOOGLE_SUBSCRIPTION_MANAGEMENT_URL =
  `https://play.google.com/store/account/subscriptions?package=${ANDROID_PACKAGE_NAME}`;

function asProducts(value: Awaited<ReturnType<typeof fetchProducts>>): StoreProduct[] {
  return Array.isArray(value) ? (value as StoreProduct[]) : [];
}

export async function createGoogleBillingIdentifiers(
  accountId: string,
  profileId?: string | null,
) {
  // This exact value is independently recomputed by the Play verifier from
  // the authenticated Supabase user. Never substitute email, username or a
  // device identifier here.
  const obfuscatedAccountId = (await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `pluggd:${accountId}`,
  )).toLowerCase();
  const obfuscatedProfileId = (await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `pluggd-profile:${profileId ?? accountId}`,
  )).toLowerCase();
  return { obfuscatedAccountId, obfuscatedProfileId };
}

export function selectGoogleSubscriptionOffer(
  product: StoreProduct,
  basePlanId?: string | null,
  offerId?: string | null,
) {
  if (product.platform !== 'android' || product.type !== 'subs') return null;
  const androidProduct = product as ProductSubscriptionAndroid;
  const eligible = androidProduct.subscriptionOffers.filter((offer) =>
    Boolean(offer.offerTokenAndroid),
  );
  if (!basePlanId) {
    return eligible.length === 1 ? eligible[0] : null;
  }
  const matchingPlan = eligible.filter((offer) =>
    offer.basePlanIdAndroid === basePlanId,
  );
  // OpenIAP represents a base-plan-only Play offer with id=basePlanId. A
  // promotional offer keeps its real offerId. Never fall back to another offer
  // on the same subscription product.
  const selected = offerId
    ? matchingPlan.find((offer) => offer.id === offerId)
    : matchingPlan.find((offer) => offer.id === basePlanId);
  return selected ?? null;
}

async function googleRequestFields(input: StoreBillingPurchaseInput) {
  const identifiers = await createGoogleBillingIdentifiers(input.accountId, input.profileId);
  return {
    skus: [input.sku],
    ...identifiers,
  };
}

export function googleSubscriptionManagementUrl(sku?: string | null) {
  return sku
    ? `${GOOGLE_SUBSCRIPTION_MANAGEMENT_URL}&sku=${encodeURIComponent(sku)}`
    : GOOGLE_SUBSCRIPTION_MANAGEMENT_URL;
}

export const googleBillingAdapter: StoreBillingAdapter = {
  provider: 'google',
  storeName: 'Google Play',
  accountName: 'Google Play account',
  creditRail: 'google_play_iap',
  subscriptionRail: 'google_play_subscription',
  subscriptionManagementUrl: googleSubscriptionManagementUrl,
  connect: () => initConnection(),
  disconnect: () => endConnection(),
  fetchProducts: async (skus, type) => asProducts(await fetchProducts({ skus, type })),
  getAvailablePurchases,
  finishTransaction: (purchase, isConsumable) =>
    finishTransaction({ purchase, isConsumable }),
  listenForPurchases: purchaseUpdatedListener,
  listenForErrors: purchaseErrorListener,
  requestProduct: async (input) =>
    requestPurchase({
      request: { google: await googleRequestFields(input) },
      type: 'in-app',
    }),
  requestSubscription: async (input) => {
    const offer = selectGoogleSubscriptionOffer(
      input.product,
      input.basePlanId,
      input.offerId,
    );
    if (!offer?.offerTokenAndroid) {
      throw new Error('This membership does not have an eligible Google Play base plan.');
    }
    return requestPurchase({
      request: {
        google: {
          ...(await googleRequestFields(input)),
          subscriptionOffers: [{ sku: input.sku, offerToken: offer.offerTokenAndroid }],
        },
      },
      type: 'subs',
    });
  },
  getStorefront: async () => getStorefront(),
  buildVerificationRequest: async (purchase, kind, accountId) => {
    const { obfuscatedAccountId } = await createGoogleBillingIdentifiers(accountId);
    return {
      functionName: 'validate-google-play-purchase',
      body: {
        product_id: purchase.productId,
        purchase_token: purchase.purchaseToken,
        package_name: ANDROID_PACKAGE_NAME,
        obfuscated_account_id: obfuscatedAccountId,
        type: kind,
      },
    };
  },
};
