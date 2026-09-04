import { describe, expect, it } from "vitest";
import {
  assertAppleNestedTransactionIdentity,
  assertAppleNotificationIdentity,
  assertAppleTransactionIdentity,
} from "../_shared/appleIdentity.ts";

const configured = {
  bundleId: "com.pluggd.mobile",
  appAppleId: 6765738727,
};

describe("Apple signed-data identity", () => {
  it("accepts a production StoreKit transaction using its documented identity fields", () => {
    expect(() =>
      assertAppleTransactionIdentity("Production", {
        bundleId: "com.pluggd.mobile",
        environment: "Production",
      }, configured)
    ).not.toThrow();
  });

  it("accepts a sandbox transaction without an App Apple ID", () => {
    expect(() =>
      assertAppleTransactionIdentity("Sandbox", {
        bundleId: "com.pluggd.mobile",
        environment: "Sandbox",
      }, configured)
    ).not.toThrow();
  });

  it.each([
    ["wrong bundle", { bundleId: "com.example.copy", environment: "Production" }],
    ["wrong environment", { bundleId: "com.pluggd.mobile", environment: "Sandbox" }],
  ])("rejects a production transaction with %s", (_label, identity) => {
    expect(() =>
      assertAppleTransactionIdentity("Production", identity, configured)
    ).toThrow();
  });

  it("requires the App Apple ID on a production notification envelope", () => {
    expect(() =>
      assertAppleNotificationIdentity("Production", {
        bundleId: "com.pluggd.mobile",
        environment: "Production",
      }, configured)
    ).toThrow("Apple signed data app identifier mismatch");
    expect(() =>
      assertAppleNotificationIdentity("Production", {
        bundleId: "com.pluggd.mobile",
        appAppleId: 6765738727,
        environment: "Production",
      }, configured)
    ).not.toThrow();
  });

  it("binds a nested transaction to the verified notification identity", () => {
    expect(() =>
      assertAppleNestedTransactionIdentity(
        "Production",
        { bundleId: "com.pluggd.mobile", environment: "Production" },
        { bundleId: "com.pluggd.mobile", environment: "Production" },
        configured,
      )
    ).not.toThrow();
    expect(() =>
      assertAppleNestedTransactionIdentity(
        "Production",
        { bundleId: "com.example.copy", environment: "Production" },
        { bundleId: "com.pluggd.mobile", environment: "Production" },
        configured,
      )
    ).toThrow("Apple nested transaction bundle identifier mismatch");
  });
});
