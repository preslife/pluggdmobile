import { Buffer } from "node:buffer";
import {
  Environment,
  SignedDataVerifier,
  type JWSTransactionDecodedPayload,
  type JWSRenewalInfoDecodedPayload,
  type ResponseBodyV2DecodedPayload,
} from "npm:@apple/app-store-server-library@3.0.0";

type VerifierEnvironment = "Production" | "Sandbox";

function certificate(name: string): Buffer {
  const encoded = Deno.env.get(name)?.replace(/\s+/g, "");
  if (!encoded) throw new Error(`Missing ${name}`);
  return Buffer.from(encoded, "base64");
}

function roots() {
  return [
    certificate("APPLE_ROOT_CA_G2_BASE64"),
    certificate("APPLE_ROOT_CA_G3_BASE64"),
  ];
}

function verifier(environment: VerifierEnvironment) {
  const bundleId = Deno.env.get("APPLE_BUNDLE_ID") ?? "com.pluggd.mobile";
  const appAppleIdText = Deno.env.get("APPLE_APP_ID");
  const appAppleId = appAppleIdText ? Number(appAppleIdText) : undefined;
  if (environment === "Production" && (!appAppleId || !Number.isSafeInteger(appAppleId))) {
    throw new Error("APPLE_APP_ID is required for Production verification");
  }
  return new SignedDataVerifier(
    roots(),
    true,
    environment === "Production" ? Environment.PRODUCTION : Environment.SANDBOX,
    bundleId,
    environment === "Production" ? appAppleId : undefined,
  );
}

function configuredEnvironments(): VerifierEnvironment[] {
  const configured = (Deno.env.get("APPLE_IAP_ENVIRONMENT") ?? "Both").toLowerCase();
  if (configured === "sandbox") return ["Sandbox"];
  if (configured === "both") return ["Production", "Sandbox"];
  return ["Production"];
}

async function verifyWithEnvironment<T>(
  operation: (candidate: SignedDataVerifier) => Promise<T>,
): Promise<{ payload: T; verifiedEnvironment: VerifierEnvironment }> {
  let finalError: unknown = null;
  for (const environment of configuredEnvironments()) {
    try {
      return { payload: await operation(verifier(environment)), verifiedEnvironment: environment };
    } catch (error) {
      finalError = error;
    }
  }
  throw new Error(
    `Apple signature verification failed: ${finalError instanceof Error ? finalError.message : "invalid signed data"}`,
  );
}

export function verifyAppleTransaction(signedTransaction: string) {
  return verifyWithEnvironment<JWSTransactionDecodedPayload>(
    (candidate) => candidate.verifyAndDecodeTransaction(signedTransaction),
  );
}

export function verifyAppleNotification(signedPayload: string) {
  return verifyWithEnvironment<ResponseBodyV2DecodedPayload>(
    (candidate) => candidate.verifyAndDecodeNotification(signedPayload),
  );
}

export function verifyAppleRenewalInfo(signedRenewalInfo: string) {
  return verifyWithEnvironment<JWSRenewalInfoDecodedPayload>(
    (candidate) => candidate.verifyAndDecodeRenewalInfo(signedRenewalInfo),
  );
}
