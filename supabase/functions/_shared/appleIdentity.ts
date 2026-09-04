export type AppleVerifierEnvironment = "Production" | "Sandbox";

export type AppleAppIdentity = {
  bundleId?: string;
  appAppleId?: number;
  environment?: string;
};

export type AppleAppConfiguration = {
  bundleId: string;
  appAppleId?: number;
};

/**
 * StoreKit transaction JWS payloads identify the app with bundleId and
 * environment. Apple does not include appAppleId in this payload type.
 */
export function assertAppleTransactionIdentity(
  environment: AppleVerifierEnvironment,
  identity: AppleAppIdentity,
  configured: AppleAppConfiguration,
) {
  if (identity.bundleId !== configured.bundleId) {
    throw new Error("Apple signed data bundle identifier mismatch");
  }
  if (identity.environment !== environment) {
    throw new Error("Apple signed data environment mismatch");
  }
}

/**
 * Server-notification envelopes do include appAppleId. Keep that additional
 * production check at the envelope boundary before trusting nested payloads.
 */
export function assertAppleNotificationIdentity(
  environment: AppleVerifierEnvironment,
  identity: AppleAppIdentity,
  configured: AppleAppConfiguration,
) {
  assertAppleTransactionIdentity(environment, identity, configured);
  if (
    environment === "Production" &&
    identity.appAppleId !== configured.appAppleId
  ) {
    throw new Error("Apple signed data app identifier mismatch");
  }
}

export function assertAppleNestedTransactionIdentity(
  environment: AppleVerifierEnvironment,
  transaction: AppleAppIdentity,
  notification: AppleAppIdentity,
  configured: AppleAppConfiguration,
) {
  if (
    transaction.bundleId !== notification.bundleId ||
    transaction.bundleId !== configured.bundleId
  ) {
    throw new Error("Apple nested transaction bundle identifier mismatch");
  }
  if (
    transaction.environment !== notification.environment ||
    transaction.environment !== environment
  ) {
    throw new Error("Apple nested transaction environment mismatch");
  }
}
