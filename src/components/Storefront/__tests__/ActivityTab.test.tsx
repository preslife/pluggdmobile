import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent, act, within } from "@testing-library/react";
import { ActivityTab } from "../ActivityTab";

const supabaseMocks = vi.hoisted(() => {
  const listeners: Record<string, (payload: any) => void> = {};
  const query: any = {};
  query.select = vi.fn(() => query);
  query.eq = vi.fn(() => query);
  query.order = vi.fn(() => query);
  query.range = vi.fn();

  const from = vi.fn(() => query);

  const channel = {
    on: vi.fn((event: string, config: any, callback: (payload: any) => void) => {
      if (event === "postgres_changes" && config?.table) {
        listeners[config.table] = callback;
      }

      return channel;
    }),
    subscribe: vi.fn(() => channel),
  };

  const channelFactory = vi.fn(() => channel);
  const removeChannel = vi.fn();
  const clearListeners = () => {
    Object.keys(listeners).forEach((key) => delete listeners[key]);
  };

  return { query, from, channel, channelFactory, listeners, removeChannel, clearListeners };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: supabaseMocks.from,
    channel: supabaseMocks.channelFactory,
    removeChannel: supabaseMocks.removeChannel,
  },
}));

type ActivityRow = {
  id: string;
  actor_id: string;
  created_at: string;
  data: Record<string, any> | null;
  entity_id: string;
  entity_type: string;
  type: string;
  user_id: string;
};

const createActivityRow = (overrides: Partial<ActivityRow> = {}): ActivityRow => ({
  id: overrides.id ?? `activity-${Math.random().toString(36).slice(2)}`,
  actor_id: overrides.actor_id ?? "actor-1",
  created_at: overrides.created_at ?? new Date().toISOString(),
  data: overrides.data ?? { title: "Release" },
  entity_id: overrides.entity_id ?? "entity-1",
  entity_type: overrides.entity_type ?? "release",
  type: overrides.type ?? "release",
  user_id: overrides.user_id ?? "user-123",
});

describe("ActivityTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabaseMocks.clearListeners();
    supabaseMocks.query.range.mockResolvedValue({ data: [], error: null });
  });

  it("renders initial activity feed and loads more items", async () => {
    const initialData = Array.from({ length: 10 }, (_, index) =>
      createActivityRow({
        id: `activity-${index}`,
        created_at: new Date(2024, 5, 10 - index).toISOString(),
        data: {
          title: `Release ${index}`,
          cta_url: `/releases/release-${index}`,
        },
        entity_id: `release-${index}`,
      })
    );

    const moreData = [
      createActivityRow({
        id: "activity-extra-1",
        created_at: new Date(2024, 5, 1).toISOString(),
        data: { title: "Release extra 1", cta_url: "/releases/release-extra-1" },
        entity_id: "release-extra-1",
      }),
      createActivityRow({
        id: "activity-extra-2",
        created_at: new Date(2024, 4, 30).toISOString(),
        data: { title: "Release extra 2", cta_url: "/releases/release-extra-2" },
        entity_id: "release-extra-2",
      }),
    ];

    supabaseMocks.query.range
      .mockImplementationOnce(() => Promise.resolve({ data: initialData, error: null }))
      .mockImplementationOnce(() => Promise.resolve({ data: moreData, error: null }));

    render(<ActivityTab userId="user-123" />);

    await waitFor(() => {
      expect(screen.queryByTestId("activity-loading")).not.toBeInTheDocument();
    });

    const initialItems = screen.getAllByTestId("activity-item");
    expect(initialItems).toHaveLength(10);
    expect(initialItems[0]).toHaveTextContent("Release 0");

    const loadMoreButton = screen.getByRole("button", { name: /load more activity/i });
    fireEvent.click(loadMoreButton);

    await waitFor(() => {
      expect(screen.getAllByTestId("activity-item")).toHaveLength(12);
    });

    const allItems = screen.getAllByTestId("activity-item");
    expect(allItems[allItems.length - 1]).toHaveTextContent("Release extra 2");
  });

  it("adds new items when real-time events arrive", async () => {
    const initialData = [
      createActivityRow({
        id: "activity-initial",
        created_at: new Date(2024, 5, 5).toISOString(),
        data: { title: "Existing release", cta_url: "/releases/existing" },
        entity_id: "existing",
      }),
    ];

    supabaseMocks.query.range.mockImplementationOnce(() => Promise.resolve({ data: initialData, error: null }));

    const { unmount } = render(<ActivityTab userId="user-123" />);

    await waitFor(() => {
      expect(screen.getAllByTestId("activity-item")).toHaveLength(1);
    });

    const releaseHandler = supabaseMocks.listeners["releases"];
    expect(releaseHandler).toBeDefined();

    await act(async () => {
      releaseHandler?.({
        new: {
          id: "rel-2",
          title: "Fresh Drop",
          created_at: "2024-06-11T00:00:00Z",
          preview_url: "/releases/rel-2",
        },
      });
    });

    await waitFor(() => {
      const items = screen.getAllByTestId("activity-item");
      expect(items).toHaveLength(2);
      expect(items[0]).toHaveTextContent("Fresh Drop");
      expect(within(items[0]).getByRole("link", { name: /listen now/i })).toHaveAttribute(
        "href",
        "/releases/rel-2"
      );
    });

    unmount();

    await waitFor(() => {
      expect(supabaseMocks.removeChannel).toHaveBeenCalled();
    });
  });
});
