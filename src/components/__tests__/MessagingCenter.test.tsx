/// <reference types="vitest" />

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { act, type ReactNode } from "react";

import { MessagingCenter } from "../MessagingCenter";

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SheetContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SheetHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SheetTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: { children: ReactNode } & Record<string, any>) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock("@/components/ui/input", () => ({
  Input: (props: Record<string, any>) => <input {...props} />,
}));

vi.mock("@/components/ui/avatar", () => ({
  Avatar: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AvatarImage: () => <div />,
  AvatarFallback: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

const mockUseAuth = vi.fn();

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
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
      channelFactory,
      removeChannelMock,
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
      emitMessage: (payload: any) => {
        channelCallbacks.forEach((callback) => {
          callback(payload);
        });
      },
    },
  };
});

vi.mock("@/integrations/supabase/client", () => supabaseClientMock);

const { setRpcHandlers, reset, rpcMock } = supabaseHelpers;

const setupResizeObserver = () => {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  (globalThis as any).ResizeObserver = ResizeObserverMock;
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: vi.fn(),
  });
};

describe("MessagingCenter", () => {
  beforeEach(() => {
    setupResizeObserver();
    reset();
    mockUseAuth.mockReturnValue({ user: { id: "user-123" }, loading: false });
  });

  afterEach(() => {
    cleanup();
  });

  it("loads inbox threads and renders messages", async () => {
    const threadRow = {
      thread_id: "thread-1",
      social_account_id: "account-1",
      account_provider: "instagram_business",
      account_label: "@artist",
      latest_message: {
        id: "msg-latest",
        content: "Newest message",
        author_name: "Fan",
        author_handle: "fan",
        author_avatar_url: null,
        created_at: "2024-01-04T12:00:00Z",
        is_read: false,
        provider_message_id: "provider-1",
      },
      unread_count: 1,
      total_messages: 2,
      last_message_at: "2024-01-04T12:00:00Z",
    };

    const messageRows = [
      {
        id: "msg-new",
        thread_id: "thread-1",
        social_account_id: "account-1",
        provider_message_id: "provider-2",
        provider_thread_id: "thread-1",
        content: "Newest message",
        author_id: "fan",
        author_name: "Fan",
        author_handle: "fan",
        author_avatar_url: null,
        created_at: "2024-01-04T12:00:00Z",
        is_read: false,
        requires_response: false,
        media_urls: [],
      },
      {
        id: "msg-old",
        thread_id: "thread-1",
        social_account_id: "account-1",
        provider_message_id: "provider-3",
        provider_thread_id: "thread-1",
        content: "Older message",
        author_id: "user-123",
        author_name: "You",
        author_handle: "",
        author_avatar_url: null,
        created_at: "2024-01-03T12:00:00Z",
        is_read: true,
        requires_response: false,
        media_urls: [],
      },
    ];

    setRpcHandlers({
      inbox_list_threads: () => Promise.resolve({ data: [threadRow], error: null }),
      inbox_unread_count: () => Promise.resolve({ data: 1, error: null }),
      inbox_get_thread_messages: () => Promise.resolve({ data: messageRows, error: null }),
      inbox_mark_thread_read: () => Promise.resolve({ data: null, error: null }),
    });

    render(<MessagingCenter />);

    await waitFor(() => {
      expect(rpcMock).toHaveBeenCalledWith(
        "inbox_list_threads",
        expect.objectContaining({ p_limit: expect.any(Number) })
      );
    });

    act(() => {
      window.dispatchEvent(new CustomEvent("open-message"));
    });

    await waitFor(() => {
      expect(screen.getByText("@artist")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("@artist"));

    await waitFor(() => {
      expect(screen.getByText("Newest message")).toBeInTheDocument();
      expect(screen.getByText("Older message")).toBeInTheDocument();
    });

    expect(rpcMock).toHaveBeenCalledWith(
      "inbox_get_thread_messages",
      expect.objectContaining({ p_thread_id: "thread-1" })
    );
  });

  it("sends a message with optimistic rendering", async () => {
    const threadRow = {
      thread_id: "thread-1",
      social_account_id: "account-1",
      account_provider: "instagram_business",
      account_label: "@artist",
      latest_message: {
        id: "msg-1",
        content: "Hello",
        author_name: "Fan",
        author_handle: "fan",
        author_avatar_url: null,
        created_at: "2024-01-04T12:00:00Z",
        is_read: false,
        provider_message_id: "provider-1",
      },
      unread_count: 0,
      total_messages: 1,
      last_message_at: "2024-01-04T12:00:00Z",
    };

    const messageRows = [
      {
        id: "msg-1",
        thread_id: "thread-1",
        social_account_id: "account-1",
        provider_message_id: "provider-1",
        provider_thread_id: "thread-1",
        content: "Hello",
        author_id: "fan",
        author_name: "Fan",
        author_handle: "fan",
        author_avatar_url: null,
        created_at: "2024-01-04T12:00:00Z",
        is_read: true,
        requires_response: false,
        media_urls: [],
      },
    ];

    const updatedThreadRow = {
      ...threadRow,
      latest_message: {
        ...threadRow.latest_message,
        id: "msg-2",
        content: "Reply from user",
        author_name: "You",
        author_handle: "you",
        author_avatar_url: null,
        created_at: "2024-01-05T12:00:00Z",
        is_read: true,
        provider_message_id: "provider-user",
      },
      last_message_at: "2024-01-05T12:00:00Z",
    };

    const insertedRow = {
      id: "msg-2",
      thread_id: "thread-1",
      social_account_id: "account-1",
      provider_message_id: "provider-user",
      provider_thread_id: "thread-1",
      content: "Reply from user",
      author_id: "user-123",
      author_name: "You",
      author_handle: "you",
      author_avatar_url: null,
      created_at: "2024-01-05T12:00:00Z",
      is_read: true,
      requires_response: false,
      media_urls: [],
    };

    setRpcHandlers({
      inbox_list_threads: ({ p_thread_id }) => {
        if (p_thread_id) {
          return Promise.resolve({ data: [updatedThreadRow], error: null });
        }
        return Promise.resolve({ data: [threadRow], error: null });
      },
      inbox_unread_count: () => Promise.resolve({ data: 0, error: null }),
      inbox_get_thread_messages: () => Promise.resolve({ data: messageRows, error: null }),
      inbox_mark_thread_read: () => Promise.resolve({ data: null, error: null }),
      inbox_send_message: () => Promise.resolve({ data: insertedRow, error: null }),
    });

    render(<MessagingCenter />);

    await waitFor(() => {
      expect(rpcMock).toHaveBeenCalledWith(
        "inbox_list_threads",
        expect.objectContaining({ p_limit: expect.any(Number) })
      );
    });

    act(() => {
      window.dispatchEvent(new CustomEvent("open-message"));
    });

    await waitFor(() => {
      expect(screen.getByText("@artist")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("@artist"));

    await waitFor(() => {
      expect(screen.getByText("Hello")).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText("Type a message...");
    fireEvent.change(input, { target: { value: "Reply from user" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => {
      expect(rpcMock).toHaveBeenCalledWith(
        "inbox_send_message",
        expect.objectContaining({ p_content: "Reply from user" })
      );
    });

    await waitFor(() => {
      expect(screen.getByText("Reply from user")).toBeInTheDocument();
    });
  });
});
