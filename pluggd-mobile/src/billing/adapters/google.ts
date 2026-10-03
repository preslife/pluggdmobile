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

let googleRecovery: Promise<void> | null = null;
let googleDisconnect: Promise<unknown> | null = null;
let activeGoogleMutations = 0;
let googleMutationsDrained: Promise<void> | null = null;
let resolveGoogleMutationsDrained: (() => void) | null = null;

function waitForGoogleMutationsToDrain() {
  if (activeGoogleMutations === 0) return Promise.resolve();
  if (!googleMutationsDrained) {
    googleMutationsDrained = new Promise((resolve) => {
      resolveGoogleMutationsDrained = resolve;
    });
  }
  return googleMutationsDrained;
}

function releaseGoogleMutation() {
  activeGoogleMutations -= 1;
  if (activeGoogleMutations === 0) {
    const resolve = resolveGoogleMutationsDrained;
    googleMutationsDrained = null;
    resolveGoogleMutationsDrained = null;
    resolve?.();
  }
}

function runGoogleMutation<T>(operation: () => Promise<T>): Promise<T> {
  const connectionWork = googleRecovery ?? googleDisconnect;
  if (connectionWork) {
    return connectionWork.then(() => runGoogleMutation(operation));
  }

  // Enter synchronously after checking the transition gate so recovery cannot
  // observe an empty mutation set and then race a mutation queued in a microtask.
  activeGoogleMutations += 1;
  try {
    return Promise.resolve(operation()).finally(releaseGoogleMutation);
  } catch (error) {
    releaseGoogleMutation();
    return Promise.reject(error);
  }
}

function connectGoogleConnection(): Promise<boolean> {
  const connectionWork = googleRecovery ?? googleDisconnect;
  return connectionWork
    ? connectionWork.then(connectGoogleConnection)
    : initConnection();
}

function isGoogleConnectionUnavailable(error: unknown) {
  if (typeof error === 'string') return error === 'Billing client not ready';
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { message?: unknown; code?: unknown; responseCode?: unknown };
  return candidate.message === 'Billing client not ready'
    || candidate.code === 'service-disconnected'
    || candidate.responseCode === -1;
}

function recoverGoogleConnection() {
  if (googleRecovery) return googleRecovery;

  const recovery = (async () => {
    if (googleDisconnect) await googleDisconnect;
    await waitForGoogleMutationsToDrain();
    await endConnection();
    if (!(await initConnection())) {
      throw new Error('Google Play billing connection recovery did not initialize.');
    }
  })();
  googleRecovery = recovery;
  const clearRecovery = () => {
    if (googleRecovery === recovery) googleRecovery = null;
  };
  void recovery.then(clearRecovery, clearRecovery);
  return recovery;
}

async function readWithGoogleRecovery<T>(read: () => Promise<T>): Promise<T> {
  try {
    return await read();
  } catch (error) {
    if (!isGoogleConnectionUnavailable(error)) throw error;
  }
  await recoverGoogleConnection();
  return read();
}

function disconnectGoogleConnection() {
  if (googleDisconnect) return googleDisconnect;

  const disconnect = (async () => {
    if (googleRecovery) await googleRecovery;
    await waitForGoogleMutationsToDrain();
    return endConnection();
  })();
  googleDisconnect = disconnect;
  const clearDisconnect = () => {
    if (googleDisconnect === disconnect) googleDisconnect = null;
  };
  void disconnect.then(clearDisconnect, clearDisconnect);
  return disconnect;
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
  connect: connectGoogleConnection,
  disconnect: disconnectGoogleConnection,
  fetchProducts: async (skus, type) => asProducts(await readWithGoogleRecovery(
    () => fetchProducts({ skus, type }),
  )),
  getAvailablePurchases: (options) => readWithGoogleRecovery(
    () => getAvailablePurchases(options),
  ),
  finishTransaction: (purchase, isConsumable) => runGoogleMutation(
    () => finishTransaction({ purchase, isConsumable }),
  ),
  listenForPurchases: purchaseUpdatedListener,
  listenForErrors: purchaseErrorListener,
  requestProduct: async (input) => {
    const google = await googleRequestFields(input);
    return runGoogleMutation(() => requestPurchase({
      request: { google },
      type: 'in-app',
    }));
  },
  requestSubscription: async (input) => {
    const offer = selectGoogleSubscriptionOffer(
      input.product,
      input.basePlanId,
      input.offerId,
    );
    if (!offer?.offerTokenAndroid) {
      throw new Error('This membership does not have an eligible Google Play base plan.');
    }
    const google = {
      ...(await googleRequestFields(input)),
      subscriptionOffers: [{ sku: input.sku, offerToken: offer.offerTokenAndroid }],
      ...(input.googleReplacement ? {
        purchaseToken: input.googleReplacement.purchaseToken,
        subscriptionProductReplacementParams: {
          oldProductId: input.googleReplacement.oldProductId,
          replacementMode: input.googleReplacement.replacementMode,
        },
      } : {}),
    };
    return runGoogleMutation(() => requestPurchase({
      request: {
        google,
      },
      type: 'subs',
    }));
  },
  getStorefront: async () => readWithGoogleRecovery(() => getStorefront()),
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
