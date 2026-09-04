import { describe, expect, it, vi } from "vitest";
import {
  handleAuthorizeBeatLicenseOption,
  type AuthorizeBeatLicenseDependencies,
} from "../authorize-beat-license-option/handler.ts";

const request = (body: unknown) => new Request("https://functions.test", {
  method: "POST",
  headers: {
    Authorization: "Bearer token",
    "Content-Type": "application/json",
    "x-forwarded-for": "203.0.113.20, 10.0.0.2",
    "user-agent": "PLUGGD-Test/1.0",
  },
  body: JSON.stringify(body),
});

const body = {
  beatId: "beat",
  licenseOptionId: "option",
  accepted: true,
  authorizationVersion: "2026-08-01.1",
};

const deps = (
  overrides: Partial<AuthorizeBeatLicenseDependencies> = {},
): AuthorizeBeatLicenseDependencies => ({
  authenticate: async () => ({ id: "producer" }),
  loadOption: async () => ({
    id: "option",
    beat_id: "beat",
    license_type: "exclusive_rights",
    beat_owner_id: "producer",
  }),
  authorize: async () => {},
  now: () => new Date("2026-08-01T12:00:00Z"),
  ...overrides,
});

describe("authorize-beat-license-option", () => {
  it("records exact, versioned, authenticated Exclusive authorization", async () => {
    const authorize = vi.fn(async () => {});
    const response = await handleAuthorizeBeatLicenseOption(
      request(body),
      deps({ authorize }),
    );
    expect(response.status).toBe(200);
    expect(authorize).toHaveBeenCalledWith("option", expect.objectContaining({
      producer_authorization_version: "2026-08-01.1",
      producer_authorized_by: "producer",
      producer_authorization_ip: "203.0.113.20",
      producer_authorization_user_agent: "PLUGGD-Test/1.0",
      is_available: true,
    }));
  });

  it("fails closed for absent acceptance, wrong owner, or non-Exclusive tier", async () => {
    expect((await handleAuthorizeBeatLicenseOption(
      request({ ...body, accepted: false }), deps(),
    )).status).toBe(400);
    expect((await handleAuthorizeBeatLicenseOption(
      request(body), deps({
        loadOption: async () => ({
          id: "option", beat_id: "beat", license_type: "exclusive_rights", beat_owner_id: "other",
        }),
      }),
    )).status).toBe(403);
    expect((await handleAuthorizeBeatLicenseOption(
      request(body), deps({
        loadOption: async () => ({
          id: "option", beat_id: "beat", license_type: "premium_lease", beat_owner_id: "producer",
        }),
      }),
    )).status).toBe(400);
  });
});
