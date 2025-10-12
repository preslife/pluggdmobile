/// <reference types="vitest" />

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";

import { EnhancedConnections } from "../EnhancedConnections";

const mockToast = vi.fn();
const mockUseAuth = vi.fn();

vi.mock("@/hooks/useToast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

interface TableResponse {
  data?: any;
  error?: { message: string } | Error | null;
}

const { module: supabaseClientMock, helpers: supabaseMocks } = vi.hoisted(() => {
  let tableResponses: Record<string, TableResponse> = {};

  const mockFrom = vi.fn((table: string) => {
    const getResponse = () => tableResponses[table] ?? {};
    const buildPromiseResult = () => {
      const { data, error } = getResponse();
      return {
        data: data ?? [],
        error: error ?? null,
      };
    };

    const builder: any = {
      select: vi.fn(() => builder),
      eq: vi.fn(() => builder),
      in: vi.fn(() => builder),
      order: vi.fn(() => builder),
      single: vi.fn(() => {
        const { data, error } = getResponse();
        return Promise.resolve({ data: data ?? null, error: error ?? null });
      }),
      then: (resolve: any, reject?: any) =>
        Promise.resolve(buildPromiseResult()).then(resolve, reject),
      catch: (reject: any) =>
        Promise.resolve(buildPromiseResult()).catch(reject),
      finally: (onFinally: any) =>
        Promise.resolve(buildPromiseResult()).finally(onFinally),
    };

    return builder;
  });

  const mockInvoke = vi.fn();

  return {
    module: {
      supabase: {
        from: (table: string) => mockFrom(table),
        functions: { invoke: mockInvoke },
      },
    },
    helpers: {
      mockFrom,
      mockInvoke,
      reset: () => {
        tableResponses = {};
        mockFrom.mockClear();
        mockInvoke.mockClear();
      },
      setResponses: (responses: Record<string, TableResponse>) => {
        tableResponses = responses;
      },
    },
  };
});

vi.mock("@/integrations/supabase/client", () => supabaseClientMock);

const { mockFrom, mockInvoke, setResponses, reset } = supabaseMocks;

beforeEach(() => {
  reset();
  mockInvoke.mockResolvedValue({ data: null, error: null });
  mockToast.mockReset();
  mockUseAuth.mockReturnValue({ user: { id: "user-1" }, loading: false });
});

afterEach(() => {
  cleanup();
});

describe("EnhancedConnections", () => {
  it("renders membership tiers from Supabase", async () => {
    setResponses({
      social_connections: {
        data: [
          { id: "conn-mailchimp", provider: "mailchimp", updated_at: new Date().toISOString() },
          { id: "conn-discord", provider: "discord", updated_at: new Date().toISOString() },
        ],
      },
      profiles: {
        data: {
          mailchimp_list_id: null,
          mailchimp_status: "connected",
          mailchimp_auto_sync: false,
          discord_guild_id: "guild-123",
          discord_role_map: {},
        },
      },
      membership_tiers: {
        data: [
          {
            id: "tier-basic",
            name: "Gold Tier",
            price_monthly: 999,
            currency: "USD",
            status: "active",
            tier_order: 0,
            created_at: new Date().toISOString(),
          },
        ],
      },
      mailchimp_audience_snapshots: {
        data: [
          {
            list_id: "aud-1",
            list_name: "Audience",
            member_count: 42,
            last_synced_at: new Date().toISOString(),
          },
        ],
      },
    });

    render(<EnhancedConnections />);

    await waitFor(() => {
      expect(screen.getByText("Gold Tier")).toBeInTheDocument();
    });

    expect(screen.getByText(/Total Audience/)).toBeInTheDocument();
    expect(screen.getAllByText("42").length).toBeGreaterThan(0);
  });

  it("shows a Mailchimp error when the snapshot query fails", async () => {
    setResponses({
      social_connections: {
        data: [{ id: "conn-mailchimp", provider: "mailchimp" }],
      },
      profiles: {
        data: {
          mailchimp_list_id: null,
          mailchimp_status: "error",
          mailchimp_auto_sync: false,
          discord_guild_id: null,
          discord_role_map: {},
        },
      },
      membership_tiers: {
        data: [],
      },
      mailchimp_audience_snapshots: {
        error: { message: "relation does not exist" },
      },
    });

    render(<EnhancedConnections />);

    await waitFor(() => {
      expect(screen.getByText(/Mailchimp error/)).toBeInTheDocument();
    });

    expect(screen.getByText(/relation does not exist/)).toBeInTheDocument();
  });
});
