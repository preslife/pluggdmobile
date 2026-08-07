import { Buffer } from "node:buffer";
import {
  BasicConstraintsExtension,
  cryptoProvider,
  X509Certificate,
} from "npm:@peculiar/x509@1.14.3";
import {
  decodeProtectedHeader,
  importX509,
  jwtVerify,
  type JWTPayload,
} from "npm:jose@6.1.0";
import type {
  JWSTransactionDecodedPayload,
  JWSRenewalInfoDecodedPayload,
  ResponseBodyV2DecodedPayload,
} from "npm:@apple/app-store-server-library@3.0.0";

type VerifierEnvironment = "Production" | "Sandbox";

const APPLE_LEAF_OID = "1.2.840.113635.100.6.11.1";
const APPLE_INTERMEDIATE_OID = "1.2.840.113635.100.6.2.1";
const MAX_CLOCK_SKEW_MS = 60_000;

cryptoProvider.set(globalThis.crypto);

function certificate(name: string): Buffer {
  const encoded = Deno.env.get(name)?.replace(/\s+/g, "");
  if (!encoded) throw new Error(`Missing ${name}`);
  return Buffer.from(encoded, "base64");
}

function roots(): X509Certificate[] {
  return [
    new X509Certificate(certificate("APPLE_ROOT_CA_G2_BASE64")),
    new X509Certificate(certificate("APPLE_ROOT_CA_G3_BASE64")),
  ];
}

function configuredEnvironments(): VerifierEnvironment[] {
  const configured = (Deno.env.get("APPLE_IAP_ENVIRONMENT") ?? "Both").toLowerCase();
  if (configured === "sandbox") return ["Sandbox"];
  if (configured === "both") return ["Production", "Sandbox"];
  return ["Production"];
}

function configuredApp(environment: VerifierEnvironment) {
  const bundleId = Deno.env.get("APPLE_BUNDLE_ID") ?? "com.pluggd.mobile";
  const appAppleIdText = Deno.env.get("APPLE_APP_ID");
  const appAppleId = appAppleIdText ? Number(appAppleIdText) : undefined;
  if (environment === "Production" && (!appAppleId || !Number.isSafeInteger(appAppleId))) {
    throw new Error("APPLE_APP_ID is required for Production verification");
  }
  return { bundleId, appAppleId };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringField(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function numberField(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function assertCertificateDate(certificate: X509Certificate, effectiveDate: Date) {
  const time = effectiveDate.getTime();
  if (
    !Number.isFinite(time) ||
    certificate.notBefore.getTime() > time + MAX_CLOCK_SKEW_MS ||
    certificate.notAfter.getTime() < time - MAX_CLOCK_SKEW_MS
  ) {
    throw new Error("Apple signing certificate is outside its validity period");
  }
}

async function verifyCertificateChain(
  encodedChain: string[],
  effectiveDate: Date,
): Promise<X509Certificate> {
  if (encodedChain.length !== 3 || encodedChain.some((item) => typeof item !== "string" || !item)) {
    throw new Error("Apple signed data has an invalid certificate chain");
  }

  const leaf = new X509Certificate(Buffer.from(encodedChain[0], "base64"));
  const intermediate = new X509Certificate(Buffer.from(encodedChain[1], "base64"));
  const basicConstraints = intermediate.getExtension(BasicConstraintsExtension);

  if (leaf.issuer !== intermediate.subject) {
    throw new Error("Apple leaf certificate issuer mismatch");
  }
  if (!basicConstraints?.ca) {
    throw new Error("Apple intermediate certificate is not a CA");
  }
  if (!leaf.getExtension(APPLE_LEAF_OID)) {
    throw new Error("Apple leaf certificate purpose is invalid");
  }
  if (!intermediate.getExtension(APPLE_INTERMEDIATE_OID)) {
    throw new Error("Apple intermediate certificate purpose is invalid");
  }

  assertCertificateDate(leaf, effectiveDate);
  assertCertificateDate(intermediate, effectiveDate);

  const leafVerified = await leaf.verify({
    publicKey: intermediate.publicKey,
    signatureOnly: true,
  });
  if (!leafVerified) throw new Error("Apple leaf certificate signature is invalid");

  let trusted = false;
  for (const root of roots()) {
    if (intermediate.issuer !== root.subject) continue;
    assertCertificateDate(root, effectiveDate);
    if (await intermediate.verify({ publicKey: root.publicKey, signatureOnly: true })) {
      trusted = true;
      break;
    }
  }
  if (!trusted) throw new Error("Apple certificate chain is not anchored to a configured root");

  return leaf;
}

function effectiveDateFromUnverifiedPayload(signedData: string): Date {
  const parts = signedData.split(".");
  if (parts.length !== 3) throw new Error("Apple signed data is not a compact JWS");
  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    const signedDate = isRecord(payload) ? numberField(payload.signedDate) : undefined;
    return signedDate === undefined ? new Date() : new Date(signedDate);
  } catch {
    throw new Error("Apple signed data payload is malformed");
  }
}

async function verifySignedData(signedData: string): Promise<Record<string, unknown>> {
  if (!signedData || typeof signedData !== "string") {
    throw new Error("Apple signed data is required");
  }

  const header = decodeProtectedHeader(signedData);
  if (header.alg !== "ES256") throw new Error("Apple signed data must use ES256");
  const encodedChain = header.x5c;
  if (!Array.isArray(encodedChain)) throw new Error("Apple signed data is missing x5c");

  const leaf = await verifyCertificateChain(
    encodedChain as string[],
    effectiveDateFromUnverifiedPayload(signedData),
  );
  const verificationKey = await importX509(leaf.toString("pem"), "ES256");
  const { payload } = await jwtVerify(signedData, verificationKey, {
    algorithms: ["ES256"],
  });
  if (!isRecord(payload)) throw new Error("Apple signed data payload is invalid");
  return payload as JWTPayload & Record<string, unknown>;
}

function notificationIdentity(payload: Record<string, unknown>) {
  const data = isRecord(payload.data) ? payload.data : undefined;
  const summary = isRecord(payload.summary) ? payload.summary : undefined;
  const external = isRecord(payload.externalPurchaseToken)
    ? payload.externalPurchaseToken
    : undefined;
  const appData = isRecord(payload.appData) ? payload.appData : undefined;
  const source = data ?? summary ?? external ?? appData;

  let environment = source ? stringField(source.environment) : undefined;
  if (external) {
    environment = stringField(external.externalPurchaseId)?.startsWith("SANDBOX")
      ? "Sandbox"
      : "Production";
  }
  return {
    appAppleId: source ? numberField(source.appAppleId) : undefined,
    bundleId: source ? stringField(source.bundleId) : undefined,
    environment,
  };
}

function assertAppIdentity(
  environment: VerifierEnvironment,
  identity: { bundleId?: string; appAppleId?: number; environment?: string },
) {
  const configured = configuredApp(environment);
  if (identity.bundleId !== configured.bundleId) {
    throw new Error("Apple signed data bundle identifier mismatch");
  }
  if (environment === "Production" && identity.appAppleId !== configured.appAppleId) {
    throw new Error("Apple signed data app identifier mismatch");
  }
  if (identity.environment !== environment) {
    throw new Error("Apple signed data environment mismatch");
  }
}

async function verifyWithEnvironment<T>(
  signedData: string,
  validate: (payload: Record<string, unknown>, environment: VerifierEnvironment) => T,
): Promise<{ payload: T; verifiedEnvironment: VerifierEnvironment }> {
  const verifiedPayload = await verifySignedData(signedData);
  const failures: string[] = [];
  for (const environment of configuredEnvironments()) {
    try {
      return { payload: validate(verifiedPayload, environment), verifiedEnvironment: environment };
    } catch (error) {
      failures.push(`${environment}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  throw new Error(`Apple signed data identity verification failed: ${failures.join("; ")}`);
}

export function verifyAppleTransaction(signedTransaction: string) {
  return verifyWithEnvironment<JWSTransactionDecodedPayload>(
    signedTransaction,
    (payload, environment) => {
      assertAppIdentity(environment, {
        bundleId: stringField(payload.bundleId),
        environment: stringField(payload.environment),
      });
      return payload as JWSTransactionDecodedPayload;
    },
  );
}

export function verifyAppleNotification(signedPayload: string) {
  return verifyWithEnvironment<ResponseBodyV2DecodedPayload>(
    signedPayload,
    (payload, environment) => {
      assertAppIdentity(environment, notificationIdentity(payload));
      return payload as ResponseBodyV2DecodedPayload;
    },
  );
}

export function verifyAppleRenewalInfo(signedRenewalInfo: string) {
  return verifyWithEnvironment<JWSRenewalInfoDecodedPayload>(
    signedRenewalInfo,
    (payload, environment) => {
      if (stringField(payload.environment) !== environment) {
        throw new Error("Apple signed data environment mismatch");
      }
      return payload as JWSRenewalInfoDecodedPayload;
    },
  );
}
