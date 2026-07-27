import { describe, expect, it, vi } from "vitest";
import { createDeleteAccountHandler } from "../delete-account/handler";
import { classifyContent } from "../moderate-user-content/handler";

describe("App Store UGC moderation contract", () => {
  it("allows ordinary text-only music discussion", () => {
    expect(classifyContent("That bassline is unreal. Who mixed this?", [])).toEqual({
      decision: "allow",
      reasonCodes: [],
    });
  });

  it("quarantines all new media before publication", () => {
    expect(classifyContent("Studio clip from tonight", ["https://cdn.example/clip.mov"])).toEqual({
      decision: "review",
      reasonCodes: ["media_review"],
    });
  });

  it("rejects explicit high-risk threats", () => {
    expect(classifyContent("go kill yourself", [])).toEqual({
      decision: "reject",
      reasonCodes: ["high_risk_text"],
    });
  });

  it("holds link spam for review", () => {
    expect(classifyContent("https://a.test https://b.test https://c.test", [])).toEqual({
      decision: "review",
      reasonCodes: ["review_text"],
    });
  });
});

const deletionRequest = (body: unknown) =>
  new Request("https://example.com/delete-account", {
    method: "POST",
    headers: {
      Authorization: "Bearer token",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

describe("App Store account deletion contract", () => {
  it("requires a recent sign-in before destructive work begins", async () => {
    const anon = {
      auth: {
        getUser: vi.fn(() => Promise.resolve({
          data: { user: { id: "user-1", last_sign_in_at: "2020-01-01T00:00:00.000Z" } },
          error: null,
        })),
      },
    };
    const admin = { auth: { admin: { deleteUser: vi.fn() } } };
    const handler = createDeleteAccountHandler({
      supabaseUrl: "url",
      anonKey: "anon",
      serviceKey: "service",
      auditSalt: "salt",
      createClient: (_url, key) => key === "anon" ? anon : admin,
    });

    const response = await handler(deletionRequest({
      confirmation: "DELETE",
      acknowledgeSubscription: true,
    }));

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ code: "reauth_required" });
    expect(admin.auth.admin.deleteUser).not.toHaveBeenCalled();
  });

  it("anonymises retained Apple transactions and removes the auth identity", async () => {
    const updateCalls: Array<{ table: string; values: Record<string, unknown> }> = [];
    const anon = {
      auth: {
        getUser: vi.fn(() => Promise.resolve({
          data: {
            user: {
              id: "user-1",
              last_sign_in_at: new Date().toISOString(),
            },
          },
          error: null,
        })),
      },
    };
    const fanSubscriptions: any = {
      select: vi.fn(() => fanSubscriptions),
      eq: vi.fn(() => fanSubscriptions),
      limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
      delete: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) })),
    };
    const audit = {
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: "audit-1" }, error: null })),
        })),
      })),
      update: vi.fn((values: Record<string, unknown>) => ({
        eq: vi.fn(() => {
          updateCalls.push({ table: "account_deletion_audit", values });
          return Promise.resolve({ error: null });
        }),
      })),
    };
    const genericTable = (table: string) => ({
      delete: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) })),
      update: vi.fn((values: Record<string, unknown>) => ({
        eq: vi.fn(() => {
          updateCalls.push({ table, values });
          return Promise.resolve({ error: null });
        }),
      })),
    });
    const deleteUser = vi.fn(() => Promise.resolve({ error: null }));
    const storage = {
      from: vi.fn(() => ({
        list: vi.fn(() => Promise.resolve({ data: [], error: null })),
        remove: vi.fn(() => Promise.resolve({ error: null })),
      })),
    };
    const admin = {
      auth: { admin: { deleteUser } },
      storage,
      from: vi.fn((table: string) => {
        if (table === "fan_subscriptions") return fanSubscriptions;
        if (table === "account_deletion_audit") return audit;
        return genericTable(table);
      }),
    };
    const handler = createDeleteAccountHandler({
      supabaseUrl: "url",
      anonKey: "anon",
      serviceKey: "service",
      auditSalt: "salt",
      createClient: (_url, key) => key === "anon" ? anon : admin,
    });

    const response = await handler(deletionRequest({
      confirmation: "DELETE",
      acknowledgeSubscription: true,
    }));

    expect(response.status).toBe(200);
    expect(deleteUser).toHaveBeenCalledWith("user-1");
    expect(updateCalls).toContainEqual({
      table: "iap_transactions",
      values: expect.objectContaining({ user_id: null, raw_receipt: null }),
    });
    expect(updateCalls).toContainEqual({
      table: "account_deletion_audit",
      values: { status: "completed" },
    });
  });
});
