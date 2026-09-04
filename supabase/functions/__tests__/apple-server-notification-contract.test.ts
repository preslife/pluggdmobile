import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(
  resolve(process.cwd(), "supabase/functions/apple-server-notification/index.ts"),
  "utf8",
);
const verifierSource = readFileSync(
  resolve(process.cwd(), "supabase/functions/_shared/appleSignedData.ts"),
  "utf8",
);
const identitySource = readFileSync(
  resolve(process.cwd(), "supabase/functions/_shared/appleIdentity.ts"),
  "utf8",
);

describe("Apple server notification contract", () => {
  it("verifies and records Apple's transaction-free TEST notification", () => {
    const verificationIndex = source.indexOf("verifyAppleNotificationEnvelope(signedPayload)");
    const testBranchIndex = source.indexOf('notificationType === "TEST"');
    const transactionRequirementIndex = source.indexOf(
      'throw new Error("Verified notification is missing signed transaction data")',
    );

    expect(verificationIndex).toBeGreaterThan(-1);
    expect(testBranchIndex).toBeGreaterThan(verificationIndex);
    expect(transactionRequirementIndex).toBeGreaterThan(testBranchIndex);
    expect(source).toContain('notification_type: notificationType');
    expect(source).toContain('JSON.stringify({ received: true, test: true })');
  });

  it("uses WebCrypto-compatible verification without weakening Apple's trust checks", () => {
    expect(verifierSource).toContain('from "npm:@peculiar/x509@1.14.3"');
    expect(verifierSource).toContain('from "npm:jose@6.1.0"');
    expect(verifierSource).toContain('certificate("APPLE_ROOT_CA_G2_BASE64")');
    expect(verifierSource).toContain('certificate("APPLE_ROOT_CA_G3_BASE64")');
    expect(verifierSource).toContain('const APPLE_LEAF_OID = "1.2.840.113635.100.6.11.1"');
    expect(verifierSource).toContain('const APPLE_INTERMEDIATE_OID = "1.2.840.113635.100.6.2.1"');
    expect(verifierSource).toContain('if (header.alg !== "ES256")');
    expect(verifierSource).toContain("await leaf.verify");
    expect(verifierSource).toContain("await intermediate.verify");
    expect(verifierSource).toContain("await jwtVerify");
    expect(identitySource).toContain("Apple signed data bundle identifier mismatch");
    expect(identitySource).toContain("Apple signed data app identifier mismatch");
    expect(identitySource).toContain("Apple signed data environment mismatch");
    expect(verifierSource).not.toContain("node:crypto");
  });

  it("fulfils verified one-time credit charges exactly once", () => {
    const nestedVerificationIndex = source.indexOf("verifiedNotification.transaction");
    const creditBranchIndex = source.indexOf(
      'notificationType === "ONE_TIME_CHARGE"',
    );

    expect(nestedVerificationIndex).toBeGreaterThan(-1);
    expect(creditBranchIndex).toBeGreaterThan(nestedVerificationIndex);
    expect(source).toContain(
      'const idempotencyKey = `apple-iap:${txInfo.transactionId}`',
    );
    expect(source).toContain('kind: "topup_iap"');
    expect(source).toContain('type: "credits"');
    expect(source).toContain("await fulfilCreditPack(supabaseClient, txInfo, creditPack)");
    expect(source).not.toContain('kind: "topup",\n        ref_type: "apple_iap"');
  });

  it("binds notification transactions to the outer production app identity", () => {
    expect(verifierSource).toContain("verifyAppleNotificationEnvelope");
    expect(verifierSource).toContain("await verifyAppleNotification(signedPayload)");
    expect(verifierSource).toContain("await verifySignedData(signedTransaction)");
    expect(verifierSource).toContain("assertAppleNestedTransactionIdentity");
    expect(identitySource).toContain("Apple nested transaction bundle identifier mismatch");
    expect(identitySource).toContain("Apple nested transaction environment mismatch");
    expect(identitySource).toContain("identity.appAppleId !== configured.appAppleId");
    expect(source).not.toContain("verifyAppleTransaction(");
  });

  it("retries a pre-logged membership notification until its entitlement mutation is applied", () => {
    expect(source).not.toContain(
      'if (existing && notificationType !== "ONE_TIME_CHARGE")',
    );
    expect(source).toContain(
      'subscriptionRecord.metadata?.apple_transaction_id === transactionId',
    );
    expect(source).toContain(
      'subscriptionRecord.metadata?.last_notification_type === notificationType',
    );
    expect(source).toContain(
      '(subscriptionRecord.metadata?.last_notification_subtype ?? null)',
    );
    expect(source).toContain('if (alreadyApplied)');
    expect(source).toContain('Duplicate TEST ${notificationUUID}, skipping');
  });
});
