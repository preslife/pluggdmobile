/// <reference types="vitest" />

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { act, type ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";

import { NotificationBell } from "../NotificationBell";

const mockUseAuth = vi.fn();
const mockToast = vi.fn();

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PopoverContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: { children: ReactNode } & Record<string, any>) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

const { module: supabaseClientMock, helpers: supabaseHelpers } = vi.hoisted(() => {
  type RpcHandler = (args?: Record<string, any>) => Promise<{ data: any; error: any } | { data: any; error: any }>;

  let rpcHandlers: Record<string, RpcHandler> = {};

  const rpcMock = vi.fn((fnName: string, args?: Record<string, any>) => {
    const handler = rpcHandlers[fnName];
    if (handler) {
      const result = handler(args);
      return Promise.resolve(result);
    }
    return Promise.resolve({ data: null, error: null });
  });

  const channelCallbacks: Array<(payload: any) => void | Promise<void>> = [];

  const channel = {
    on: vi.fn((event: string, filter: Record<string, any>, callback: (payload: any) => void | Promise<void>) => {
      channelCallbacks.push(callback);
      return channel;
    }),
    subscribe: vi.fn(() => channel),
  };

  const channelFactory = vi.fn(() => channel);
  const removeChannelMock = vi.fn();

  return {
    module: {
      supabase: {
        rpc: rpcMock,
        channel: channelFactory,
        removeChannel: removeChannelMock,
      },
    },
    helpers: {
      rpcMock,
      channel,
      removeChannelMock,
      channelFactory,
      setRpcHandlers: (handlers: Record<string, RpcHandler>) => {
        rpcHandlers = handlers;
      },
      reset: () => {
        rpcHandlers = {};
        rpcMock.mockClear();
        channel.on.mockClear();
        channel.subscribe.mockClear();
        channelFactory.mockClear();
        removeChannelMock.mockClear();
        channelCallbacks.length = 0;
      },
      emitNotification: (payload: any) => {
        channelCallbacks.forEach((callback) => {
          callback(payload);
        });
      },
    },
  };
});

vi.mock("@/integrations/supabase/client", () => supabaseClientMock);

const { setRpcHandlers, reset, emitNotification, rpcMock, channelFactory } = supabaseHelpers;

const setupResizeObserver = () => {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  (globalThis as any).ResizeObserver = ResizeObserverMock;
};

describe("NotificationBell", () => {
  beforeEach(() => {
    setupResizeObserver();
    reset();
    mockToast.mockReset();
    mockUseAuth.mockReturnValue({ user: { id: "user-456" }, loading: false });
  });

  afterEach(() => {
    cleanup();
  });

  it("loads notifications and marks them as read", async () => {
    let notifications = [
      {
        id: "notif-1",
        type: "follow",
        title: "New follower",
        message: "Someone followed you",
        data: {},
        read: false,
        created_at: "2024-01-04T12:00:00Z",
        related_id: null,
        related_type: null,
      },
    ];

    setRpcHandlers({
      notifications_list_recent: () => Promise.resolve({ data: notifications, error: null }),
      notifications_unread_count: () => Promise.resolve({ data: notifications.length, error: null }),
      notifications_mark_read: ({ p_notification_id }) => {
        notifications = notifications.filter((notification) => notification.id !== p_notification_id);
        return Promise.resolve({ data: null, error: null });
      },
      notifications_mark_all_read: () => {
        notifications = [];
        return Promise.resolve({ data: null, error: null });
      },
    });

    const getListRecentCount = () =>
      rpcMock.mock.calls.filter(([fnName]) => fnName === "notifications_list_recent").length;

    render(
      <MemoryRouter>
        <NotificationBell />
      </MemoryRouter>
    );

    expect(channelFactory).toHaveBeenCalledWith("notifications-user-456");

    await waitFor(() => {
      expect(screen.getByText("New follower")).toBeInTheDocument();
    });

    const beforeOpenCount = getListRecentCount();

    act(() => {
      window.dispatchEvent(new Event("open-notifications"));
    });

    await waitFor(() => {
      expect(getListRecentCount()).toBeGreaterThan(beforeOpenCount);
    });

    fireEvent.click(screen.getByRole("button", { name: /mark all read/i }));

    await waitFor(() => {
      expect(
        rpcMock.mock.calls.some(([fnName]) => fnName === "notifications_mark_all_read")
      ).toBe(true);
    });

    await waitFor(() => {
      expect(screen.queryByText("New follower")).not.toBeInTheDocument();
    });
  });

  it("handles realtime notifications and updates unread count", async () => {
    let notifications = [
      {
        id: "notif-1",
        type: "follow",
        title: "New follower",
        message: "Someone followed you",
        data: {},
        read: false,
        created_at: "2024-01-04T12:00:00Z",
        related_id: null,
        related_type: null,
      },
    ];

    setRpcHandlers({
      notifications_list_recent: () => Promise.resolve({ data: notifications, error: null }),
      notifications_unread_count: () => Promise.resolve({ data: notifications.length, error: null }),
      notifications_mark_read: () => Promise.resolve({ data: null, error: null }),
      notifications_mark_all_read: () => Promise.resolve({ data: null, error: null }),
    });

    render(
      <MemoryRouter>
        <NotificationBell />
      </MemoryRouter>
    );

    expect(channelFactory).toHaveBeenCalledWith("notifications-user-456");

    await waitFor(() => {
      expect(screen.getByText("New follower")).toBeInTheDocument();
    });

    act(() => {
      window.dispatchEvent(new Event("open-notifications"));
    });

    notifications = [
      {
        id: "notif-2",
        type: "support",
        title: "New tip",
        message: "A fan tipped you",
        data: {},
        read: false,
        created_at: "2024-01-05T12:00:00Z",
        related_id: null,
        related_type: null,
      },
      ...notifications,
    ];

    act(() => {
      emitNotification({
        new: notifications[0],
      });
    });

    await waitFor(() => {
      expect(screen.getByText("New tip")).toBeInTheDocument();
    });

    expect(mockToast).toHaveBeenCalledWith({
      title: "New tip",
      description: "A fan tipped you",
    });
  });
});
