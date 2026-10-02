export type PaidPlatformPlanTier = 'starter' | 'creator' | 'pro';
export type PlatformPlanCycle = 'monthly' | 'yearly';

export const GOOGLE_PLATFORM_PLAN_PRODUCTS = {
  starter: { monthly: 'plg_plan_starter_monthly', yearly: 'plg_plan_starter_yearly' },
  creator: { monthly: 'plg_plan_creator_monthly', yearly: 'plg_plan_creator_yearly' },
  pro: { monthly: 'plg_plan_pro_monthly', yearly: 'plg_plan_pro_yearly' },
} as const;

export const GOOGLE_PLATFORM_PLAN_SKUS = Object.values(GOOGLE_PLATFORM_PLAN_PRODUCTS)
  .flatMap((cycles) => Object.values(cycles));

export function googlePlatformPlan(productId: string) {
  for (const [tier, cycles] of Object.entries(GOOGLE_PLATFORM_PLAN_PRODUCTS)) {
    for (const [billingCycle, sku] of Object.entries(cycles)) {
      if (sku === productId) return { tier: tier as PaidPlatformPlanTier, billingCycle: billingCycle as PlatformPlanCycle };
    }
  }
  return null;
}

// Inspect the underlying paid sources, not only the effective promo/admin tier.
// These existing user_subscriptions fields mirror the server's reconciliation
// rules; uncertain dates fail closed instead of treating a paid source as free.
export function hasNonGooglePlatformSubscription(row: Record<string, any>, now = Date.now()) {
  const futureOrUnknown = (end: unknown) => {
    if (end === null || end === undefined) return true;
    const expiry = typeof end === 'string' ? Date.parse(end) : NaN;
    return !Number.isFinite(expiry) || expiry > now;
  };
  const paidTier = (tier: unknown) => tier === 'starter' || tier === 'creator' || tier === 'pro';
  const statuses = ['active', 'trialing', 'past_due', 'cancelled', 'canceled'];
  const stripe = paidTier(row.stripe_tier) && statuses.includes(row.stripe_status)
    && futureOrUnknown(row.stripe_current_period_end);
  const apple = paidTier(row.apple_tier) && statuses.includes(row.apple_status)
    && (futureOrUnknown(row.apple_current_period_end)
      || (typeof row.apple_grace_period_end === 'string' && Date.parse(row.apple_grace_period_end) > now));
  return stripe || apple || Boolean(row.stripe_subscription_id && row.stripe_status === 'incomplete');
}

// Google platform plans are acknowledged by the server only, after a durable
// token-specific grant. Effective access may instead come from Apple, Stripe or
// a promotion, so a paid effective tier is not proof about this purchase.
export function validateGooglePlatformPlanResponse(productId: string, response: unknown) {
  const plan = googlePlatformPlan(productId);
  const result = response as Record<string, unknown> | null;
  if (!plan || !result || result.success !== true || result.type !== 'platform_subscription'
    || result.provider !== 'google_play' || result.product_id !== productId
    || result.token_tier !== plan.tier || result.token_billing_cycle !== plan.billingCycle
    || typeof result.entitled !== 'boolean' || typeof result.serverFinished !== 'boolean'
    || result.finish_required !== false) {
    throw new Error('Google Play confirmed the purchase, but PLUGGD did not return a valid plan verification. Do not buy again.');
  }
  if (result.entitled && !result.serverFinished) {
    throw new Error('Your plan access is saved, but Google Play confirmation is still syncing. Restore purchases shortly; do not buy again.');
  }
  return { finishRequired: false as const, entitlementActive: result.entitled };
}

// One plan per account: a switch must replace the owned Play subscription,
// never start a second independently renewing plan. Tokens stay transient.
export function googlePlanReplacement(
  currentProductId: string | null,
  targetProductId: string,
  ownedPurchases: Array<{ productId: string; purchaseToken?: string | null; purchaseState?: string | null; isSuspendedAndroid?: boolean | null; obfuscatedAccountIdAndroid?: string | null; pendingPurchaseUpdateAndroid?: unknown }>,
  expectedObfuscatedAccountId: string,
) {
  if (!googlePlatformPlan(targetProductId)) throw new Error('This Google Play plan is not supported.');
  if (!/^[0-9a-f]{64}$/.test(expectedObfuscatedAccountId) || ownedPurchases.some((purchase) =>
    googlePlatformPlan(purchase.productId) && purchase.obfuscatedAccountIdAndroid !== expectedObfuscatedAccountId)) {
    throw new Error('The Google Play plan on this device belongs to a different or unconfirmed PLUGGD account. Restore it with the owning account before changing plans.');
  }
  if (ownedPurchases.some((purchase) => googlePlatformPlan(purchase.productId)
    && (purchase.purchaseState === 'pending' || purchase.pendingPurchaseUpdateAndroid))) {
    throw new Error('Google Play is waiting for payment approval. Do not subscribe again until that payment is resolved.');
  }
  if (ownedPurchases.some((purchase) => googlePlatformPlan(purchase.productId)
    && (purchase.isSuspendedAndroid || purchase.purchaseState !== 'purchased'))) {
    throw new Error('Your existing Google Play plan needs attention. Manage it in Google Play before choosing another plan.');
  }
  const owned = ownedPurchases.filter((purchase) =>
    googlePlatformPlan(purchase.productId) && purchase.purchaseState === 'purchased',
  );
  const distinct = new Set(owned.map((purchase) => purchase.productId));
  const distinctTokens = new Set(owned.map((purchase) => purchase.purchaseToken).filter(Boolean));
  if (distinct.size > 1 || distinctTokens.size > 1) throw new Error('More than one Google Play plan was found. Manage your subscriptions in Google Play before changing plans.');
  const previous = currentProductId
    ? owned.find((purchase) => purchase.productId === currentProductId)
    : owned[0];
  if (!previous) {
    if (currentProductId) throw new Error('Sign in to the Google Play account that owns your current plan, then restore it before changing plans.');
    return null;
  }
  if (!currentProductId) throw new Error('Restore your existing Google Play plan before choosing another plan.');
  if (previous.productId === targetProductId) throw new Error('You already own this Google Play plan. Restore purchases to refresh your access.');
  if (!previous.purchaseToken) throw new Error('Your current Google Play plan could not be confirmed. Restore purchases before changing plans.');
  return {
    purchaseToken: previous.purchaseToken,
    oldProductId: previous.productId,
    replacementMode: 'with-time-proration' as const,
  };
}
