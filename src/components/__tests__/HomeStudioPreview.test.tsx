/// <reference types="vitest" />

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import { HomeStudioPreview } from "../HomeStudioPreview";

const mockUseAuth = vi.fn();
const mockUseCreatorCheck = vi.fn();

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@/hooks/useCreatorCheck", () => ({
  useCreatorCheck: () => mockUseCreatorCheck(),
}));

interface TableResponse {
  data?: any;
  error?: { message: string } | Error | null;
  count?: number | null;
}

let tableResponses: Record<string, TableResponse> = {};

const mockFrom = vi.fn((table: string) => {
  const getResponse = () => tableResponses[table] ?? {};
  const buildPromiseResult = () => {
    const { data, error, count } = getResponse();
    return {
      data: data ?? [],
      error: error ?? null,
      count: count ?? (Array.isArray(data) ? data.length : null),
    };
  };

  const builder: any = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    gte: vi.fn(() => builder),
    in: vi.fn(() => builder),
    or: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    neq: vi.fn(() => builder),
    head: vi.fn(() => builder),
    maybeSingle: vi.fn(() => {
      const { data, error } = getResponse();
      const value = Array.isArray(data) ? data[0] ?? null : data ?? null;
      return Promise.resolve({ data: value, error: error ?? null });
    }),
    single: vi.fn(() => {
      const { data, error } = getResponse();
      return Promise.resolve({ data: data ?? null, error: error ?? null });
    }),
    then: (resolve: any, reject?: any) =>
      Promise.resolve(buildPromiseResult()).then(resolve, reject),
    catch: (reject: any) => Promise.resolve(buildPromiseResult()).catch(reject),
    finally: (onFinally: any) => Promise.resolve(buildPromiseResult()).finally(onFinally),
  };

  return builder;
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: (table: string) => mockFrom(table) },
}));

const renderComponent = () =>
  render(
    <MemoryRouter>
      <HomeStudioPreview role="creators" />
    </MemoryRouter>,
  );

beforeEach(() => {
  tableResponses = {};
  mockFrom.mockClear();
  mockUseAuth.mockReturnValue({ user: { id: "user-123" }, loading: false });
  mockUseCreatorCheck.mockReturnValue({ isCreator: true, loading: false });
});

afterEach(() => {
  cleanup();
});

const futureIso = (offsetMinutes: number) => new Date(Date.now() + offsetMinutes * 60 * 1000).toISOString();

describe("HomeStudioPreview", () => {
  it("renders metrics when Supabase returns data", async () => {
    tableResponses = {
      order_items: {
        data: [
          { price: 150.5, quantity: 1, created_at: futureIso(-10) },
          { price: 42, quantity: 2, created_at: futureIso(-20) },
        ],
      },
      conversations: {
        data: [{ id: "conv-1" }],
      },
      messages: {
        count: 3,
      },
      collab_applicants: {
        count: 2,
      },
      profiles: {
        data: {
          onboarding_progress: { completed_tasks: ["complete_profile", "connect_stripe"] },
        },
      },
      sessions: {
        data: [
          { id: "sess-1", title: "Listening Party", scheduled_at: futureIso(90), status: "scheduled" },
        ],
      },
    };

    renderComponent();

    await waitFor(() => expect(screen.getByText(/Studio preview/i)).toBeInTheDocument());

    expect(screen.getByTestId("studio-preview-earnings")).toHaveTextContent("$234.50");
    expect(screen.getByTestId("studio-preview-messages")).toHaveTextContent("3");
    expect(screen.getByTestId("studio-preview-invites")).toHaveTextContent("2");
    expect(screen.getByTestId("studio-preview-tasks")).toHaveTextContent("2 of 6 tasks complete");
    expect(screen.getByTestId("studio-preview-sessions")).toHaveTextContent("Listening Party");
  });

  it("renders empty states when tables do not have data", async () => {
    tableResponses = {
      order_items: { data: [] },
      conversations: { data: [] },
      messages: { count: 0 },
      collab_applicants: { count: 0 },
      profiles: { data: { onboarding_progress: { completed_tasks: [] } } },
      sessions: { data: [] },
    };

    renderComponent();

    await waitFor(() => expect(screen.getByText(/No earnings recorded/i)).toBeInTheDocument());

    expect(screen.getByTestId("studio-preview-messages")).toHaveTextContent("You’re all caught up");
    expect(screen.getByTestId("studio-preview-invites")).toHaveTextContent("No pending invites");
    expect(screen.getByTestId("studio-preview-tasks")).toHaveTextContent("0 of 6 tasks complete");
    expect(screen.getByTestId("studio-preview-sessions")).toHaveTextContent("No upcoming live events scheduled");
  });

  it("surfaces errors and retries individual metrics", async () => {
    tableResponses = {
      order_items: { error: { message: "Unable to fetch earnings" } },
      conversations: { data: [] },
      messages: { count: 0 },
      collab_applicants: { count: 0 },
      profiles: { data: { onboarding_progress: { completed_tasks: [] } } },
      sessions: { data: [] },
    };

    renderComponent();

    await waitFor(() => expect(screen.getByText(/Unable to fetch earnings/i)).toBeInTheDocument());

    tableResponses.order_items = {
      data: [{ price: 25, quantity: 1, created_at: futureIso(-5) }],
    };

    const retryButton = screen.getByRole("button", { name: /Retry loading Latest earnings/i });
    await userEvent.click(retryButton);

    await waitFor(() => expect(screen.getByTestId("studio-preview-earnings")).toHaveTextContent("$25.00"));
    expect(mockFrom.mock.calls.filter(([table]) => table === "order_items")).toHaveLength(2);
  });
});
