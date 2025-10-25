import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Send, X, Search } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLogger } from "@/hooks/useLogger";
import { useTranslation } from "@/hooks/useTranslation";
import { formatRelativeTime } from "@/lib/formatting";
import type { LocaleCode } from "@/lib/locales";

const THREAD_PAGE_SIZE = 20;
const MESSAGE_PAGE_SIZE = 30;

interface InboxThreadRow {
  thread_id: string;
  social_account_id: string | null;
  account_provider: string | null;
  account_label: string | null;
  latest_message: {
    id: string;
    content: string | null;
    author_name: string | null;
    author_handle: string | null;
    author_avatar_url: string | null;
    created_at: string;
    is_read: boolean | null;
    provider_message_id: string | null;
  } | null;
  unread_count: number | null;
  total_messages: number | null;
  last_message_at: string | null;
}

interface InboxMessageRow {
  id: string;
  thread_id: string;
  social_account_id: string | null;
  provider_message_id: string | null;
  provider_thread_id: string | null;
  content: string | null;
  author_id: string | null;
  author_name: string | null;
  author_handle: string | null;
  author_avatar_url: string | null;
  created_at: string;
  is_read: boolean | null;
  requires_response: boolean | null;
  media_urls: string[] | null;
}

interface InboxThread {
  threadId: string;
  socialAccountId: string | null;
  accountProvider: string | null;
  accountLabel: string | null;
  latestMessage?: {
    id: string;
    content: string;
    authorName: string | null;
    authorHandle: string | null;
    authorAvatarUrl: string | null;
    createdAt: string;
    isRead: boolean;
    providerMessageId: string | null;
  };
  unreadCount: number;
  totalMessages: number;
  lastMessageAt: string;
}

interface InboxMessage {
  id: string;
  threadId: string;
  socialAccountId: string | null;
  providerMessageId: string | null;
  providerThreadId: string | null;
  content: string;
  authorId: string | null;
  authorName: string | null;
  authorHandle: string | null;
  authorAvatarUrl: string | null;
  createdAt: string;
  isRead: boolean;
  requiresResponse: boolean;
  mediaUrls: string[];
  optimistic?: boolean;
}

type FetchThreadOptions = {
  reset?: boolean;
  cursor?: string | null;
  search?: string | null;
  threadId?: string | null;
};

type FetchMessagesOptions = {
  reset?: boolean;
  cursor?: string | null;
};

const keyFromThread = (threadId: string, socialAccountId?: string | null) =>
  `${threadId ?? ""}::${socialAccountId ?? ""}`;

const mapThreadRow = (row: InboxThreadRow): InboxThread | undefined => {
  if (!row?.thread_id) {
    return undefined;
  }

  const latest = row.latest_message;
  return {
    threadId: row.thread_id,
    socialAccountId: row.social_account_id,
    accountProvider: row.account_provider,
    accountLabel: row.account_label,
    latestMessage: latest
      ? {
          id: latest.id,
          content: latest.content ?? "",
          authorName: latest.author_name,
          authorHandle: latest.author_handle,
          authorAvatarUrl: latest.author_avatar_url,
          createdAt: latest.created_at,
          isRead: latest.is_read ?? false,
          providerMessageId: latest.provider_message_id,
        }
      : undefined,
    unreadCount: row.unread_count ?? 0,
    totalMessages: row.total_messages ?? 0,
    lastMessageAt: row.last_message_at ?? new Date().toISOString(),
  };
};

const mapMessageRow = (row: InboxMessageRow): InboxMessage | undefined => {
  if (!row?.id) {
    return undefined;
  }

  const threadId = row.thread_id ?? row.provider_thread_id ?? row.provider_message_id;

  return {
    id: row.id,
    threadId: threadId ?? row.id,
    socialAccountId: row.social_account_id,
    providerMessageId: row.provider_message_id,
    providerThreadId: row.provider_thread_id,
    content: row.content ?? "",
    authorId: row.author_id,
    authorName: row.author_name,
    authorHandle: row.author_handle,
    authorAvatarUrl: row.author_avatar_url,
    createdAt: row.created_at,
    isRead: row.is_read ?? false,
    requiresResponse: row.requires_response ?? false,
    mediaUrls: row.media_urls ?? [],
  };
};

export const MessagingCenter = () => {
  const { user } = useAuth();
  const { t, locale } = useTranslation();
  const currentLocale = (locale || "en-GB") as LocaleCode;
  const [threads, setThreads] = useState<InboxThread[]>([]);
  const [threadsLoading, setThreadsLoading] = useState(false);
  const [threadsLoadingMore, setThreadsLoadingMore] = useState(false);
  const [threadsCursor, setThreadsCursor] = useState<string | null>(null);
  const [threadsHasMore, setThreadsHasMore] = useState(false);

  const [activeThread, setActiveThread] = useState<InboxThread | null>(null);
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesLoadingMore, setMessagesLoadingMore] = useState(false);
  const [messagesCursor, setMessagesCursor] = useState<string | null>(null);
  const [messagesHasMore, setMessagesHasMore] = useState(false);

  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const handledRealtimeIds = useRef<Set<string>>(new Set());
  const previousOpenRef = useRef<boolean | null>(null);
  const loggerMetadata = useMemo(() => ({ user_id: user?.id ?? null }), [user?.id]);
  const { logEvent, logError, logApiCall } = useLogger({
    component: "MessagingCenter",
    feature: "messaging",
    view: "messaging_center",
    metadata: loggerMetadata,
  });

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 300);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    if (!user) return;
    if (previousOpenRef.current === isOpen) return;
    previousOpenRef.current = isOpen;
    void logEvent(isOpen ? "messaging_center_opened" : "messaging_center_closed", {
      unread_count: unreadCount,
    });
  }, [isOpen, unreadCount, user?.id, logEvent]);

  const fetchUnreadCount = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    const start = performance.now();
    let status = 200;
    let unread = 0;
    try {
      const { data, error } = await supabase.rpc("inbox_unread_count");
      unread = Number(data ?? 0);
      if (error) {
        status = 500;
        throw error;
      }
      setUnreadCount(unread);
    } catch (error) {
      status = 500;
      setUnreadCount(0);
      void logError("inbox_unread_fetch_failed", error, { user_id: user.id });
    } finally {
      const duration = performance.now() - start;
      void logApiCall("rpc", "inbox_unread_count", duration, status, {
        user_id: user.id,
        unread_count: unread,
      });
    }
  }, [user, logApiCall, logError]);

  const fetchThreads = useCallback(
    async (options?: FetchThreadOptions) => {
      if (!user) return undefined;

      const { reset = false, cursor = null, search = null, threadId = null } = options ?? {};

      if (reset) {
        setThreadsLoading(true);
        setThreadsCursor(null);
      } else if (cursor) {
        setThreadsLoadingMore(true);
      }

      const start = performance.now();
      let status = 200;
      let fetchedCount = 0;
      try {
        const { data, error } = await supabase.rpc("inbox_list_threads", {
          p_limit: THREAD_PAGE_SIZE,
          p_cursor: cursor,
          p_search: search && search.length > 0 ? search : null,
          p_thread_id: threadId,
        });

        if (error) {
          status = 500;
          throw error;
        }

        const rows: InboxThreadRow[] = Array.isArray(data)
          ? (data as InboxThreadRow[])
          : data
            ? [data as InboxThreadRow]
            : [];

        const mapped = rows
          .map(mapThreadRow)
          .filter((thread): thread is InboxThread => Boolean(thread));

        fetchedCount = mapped.length;

        if (threadId) {
          const [target] = mapped;
          if (target) {
            setThreads((prev) => {
              const filtered = prev.filter(
                (thread) => keyFromThread(thread.threadId, thread.socialAccountId) !== keyFromThread(target.threadId, target.socialAccountId)
              );
              return [target, ...filtered];
            });
          }

          await fetchUnreadCount();
          return mapped[0];
        }

        if (reset) {
          setThreads(mapped);
        } else if (cursor) {
          setThreads((prev) => {
            const existingKeys = new Set(prev.map((thread) => keyFromThread(thread.threadId, thread.socialAccountId)));
            const appended = mapped.filter(
              (thread) => !existingKeys.has(keyFromThread(thread.threadId, thread.socialAccountId))
            );
            return [...prev, ...appended];
          });
        } else {
          setThreads(mapped);
        }

        if (!threadId) {
          if (mapped.length > 0) {
            setThreadsCursor(mapped[mapped.length - 1].lastMessageAt);
          } else if (reset) {
            setThreadsCursor(null);
          }
          setThreadsHasMore(mapped.length === THREAD_PAGE_SIZE);
        }

        await fetchUnreadCount();

        return mapped[0];
      } catch (error) {
        status = 500;
        if (reset) {
          setThreads([]);
        }
        void logError("inbox_threads_fetch_failed", error, {
          user_id: user.id,
          has_cursor: Boolean(cursor),
          has_search: Boolean(search),
          thread_id: threadId,
        });
      } finally {
        if (reset) {
          setThreadsLoading(false);
        }
        if (!reset && cursor) {
          setThreadsLoadingMore(false);
        }
        const duration = performance.now() - start;
        void logApiCall("rpc", "inbox_list_threads", duration, status, {
          user_id: user.id,
          fetched: fetchedCount,
          has_cursor: Boolean(cursor),
          has_search: Boolean(search),
          thread_id: threadId,
        });
      }

      return undefined;
    },
    [user, fetchUnreadCount, logApiCall, logError]
  );

  const fetchMessages = useCallback(
    async (thread: InboxThread, options?: FetchMessagesOptions) => {
      if (!user) return;

      const { reset = false, cursor = null } = options ?? {};

      if (reset) {
        setMessagesLoading(true);
        setMessagesCursor(null);
      } else if (cursor) {
        setMessagesLoadingMore(true);
      }

      const start = performance.now();
      let status = 200;
      let fetchedCount = 0;

      try {
        const { data, error } = await supabase.rpc("inbox_get_thread_messages", {
          p_thread_id: thread.threadId,
          p_limit: MESSAGE_PAGE_SIZE,
          p_cursor: cursor,
        });

        if (error) {
          status = 500;
          throw error;
        }

        const rows: InboxMessageRow[] = Array.isArray(data)
          ? (data as InboxMessageRow[])
          : data
            ? [data as InboxMessageRow]
            : [];

        const mapped = rows
          .map(mapMessageRow)
          .filter((message): message is InboxMessage => Boolean(message));

        fetchedCount = mapped.length;

        const sortedAscending = mapped.slice().reverse();

        if (reset) {
          setMessages(sortedAscending);
        } else if (cursor) {
          setMessages((prev) => {
            const existingIds = new Set(prev.map((message) => message.id));
            const prepend = sortedAscending.filter((message) => !existingIds.has(message.id));
            return [...prepend, ...prev];
          });
        } else {
          setMessages(sortedAscending);
        }

        if (mapped.length > 0) {
          setMessagesCursor(mapped[mapped.length - 1].createdAt);
        } else if (reset) {
          setMessagesCursor(null);
        }

        setMessagesHasMore(mapped.length === MESSAGE_PAGE_SIZE);

        if (reset) {
          const markStart = performance.now();
          let markStatus = 200;
          const { error: markError } = await supabase.rpc("inbox_mark_thread_read", { p_thread_id: thread.threadId });
          if (markError) {
            markStatus = 500;
            void logError("inbox_mark_thread_read_failed", markError, {
              user_id: user.id,
              thread_id: thread.threadId,
            });
          }
          const markDuration = performance.now() - markStart;
          void logApiCall("rpc", "inbox_mark_thread_read", markDuration, markStatus, {
            user_id: user.id,
            thread_id: thread.threadId,
          });

          setThreads((prev) =>
            prev.map((existing) =>
              keyFromThread(existing.threadId, existing.socialAccountId) ===
              keyFromThread(thread.threadId, thread.socialAccountId)
                ? { ...existing, unreadCount: 0 }
                : existing
            )
          );
          await fetchUnreadCount();
        }
      } catch (error) {
        status = 500;
        if (reset) {
          setMessages([]);
        }
        void logError("inbox_messages_fetch_failed", error, {
          user_id: user.id,
          thread_id: thread.threadId,
          has_cursor: Boolean(cursor),
        });
      } finally {
        if (reset) {
          setMessagesLoading(false);
        }
        if (!reset && cursor) {
          setMessagesLoadingMore(false);
        }
        const duration = performance.now() - start;
        void logApiCall("rpc", "inbox_get_thread_messages", duration, status, {
          user_id: user.id,
          thread_id: thread.threadId,
          fetched: fetchedCount,
          has_cursor: Boolean(cursor),
          reset,
        });
      }
    },
    [user, fetchUnreadCount, logApiCall, logError]
  );

  useEffect(() => {
    if (!user) {
      setThreads([]);
      setActiveThread(null);
      setMessages([]);
      setUnreadCount(0);
      return;
    }

    fetchThreads({ reset: true, search: debouncedSearch });
  }, [user, debouncedSearch, fetchThreads]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSelectThread = useCallback(
    async (thread: InboxThread) => {
      setActiveThread(thread);
      await fetchMessages(thread, { reset: true });
    },
    [fetchMessages]
  );

  const openThreadById = useCallback(
    async (threadId: string | undefined | null) => {
      if (!threadId) return;
      const updated = await fetchThreads({ threadId });
      if (updated) {
        setActiveThread(updated);
        await fetchMessages(updated, { reset: true });
      }
    },
    [fetchThreads, fetchMessages]
  );

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ threadId?: string; socialAccountId?: string | null; userId?: string }>).detail;
      setIsOpen(true);
      if (detail?.threadId) {
        openThreadById(detail.threadId);
      } else if (detail?.userId) {
        openThreadById(detail.userId);
      }
    };

    window.addEventListener("open-message", handler as EventListener);
    return () => window.removeEventListener("open-message", handler as EventListener);
  }, [openThreadById]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`inbox-messages-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "inbox_messages_events",
        },
        async (payload) => {
          const record = ((payload.record ?? payload.new) as {
            id?: string;
            thread_id?: string;
            created_at?: string;
          }) ?? {};
          if (!record.thread_id || !record.id) return;

          const { data, error } = await supabase.rpc("inbox_get_thread_messages", {
            p_thread_id: record.thread_id,
            p_limit: MESSAGE_PAGE_SIZE,
          });

          if (error) {
            void logError("inbox_realtime_message_fetch_failed", error, {
              user_id: user.id,
              thread_id: record.thread_id,
              message_id: record.id,
            });
            return;
          }

          const rows: InboxMessageRow[] = Array.isArray(data)
            ? (data as InboxMessageRow[])
            : data
              ? [data as InboxMessageRow]
              : [];

          const fetched = rows.find((row) => row.id === record.id);
          const mapped = fetched ? mapMessageRow(fetched) : undefined;
          if (!mapped) return;

          if (mapped.id) {
            if (handledRealtimeIds.current.has(mapped.id)) {
              return;
            }
            handledRealtimeIds.current.add(mapped.id);
            if (handledRealtimeIds.current.size > 200) {
              handledRealtimeIds.current = new Set(Array.from(handledRealtimeIds.current).slice(-100));
            }
          }

          const threadKey = keyFromThread(mapped.threadId, mapped.socialAccountId);

          if (
            activeThread &&
            keyFromThread(activeThread.threadId, activeThread.socialAccountId) === threadKey
          ) {
            setMessages((prev) => {
              const exists = prev.some((message) => message.id === mapped.id);
              if (exists) {
                return prev.map((message) =>
                  message.id === mapped.id ||
                  (message.optimistic && message.providerMessageId === mapped.providerMessageId)
                    ? { ...mapped, optimistic: false }
                    : message
                );
              }

              const withoutDupes = prev.filter(
                (message) => message.providerMessageId !== mapped.providerMessageId
              );
              const merged = [...withoutDupes, mapped].sort(
                (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
              );
              return merged;
            });

            if (mapped.authorId !== user.id) {
              const markStart = performance.now();
              let markStatus = 200;
              const { error: realtimeMarkError } = await supabase.rpc("inbox_mark_thread_read", {
                p_thread_id: mapped.threadId,
              });
              if (realtimeMarkError) {
                markStatus = 500;
                void logError("inbox_mark_thread_read_failed", realtimeMarkError, {
                  user_id: user.id,
                  thread_id: mapped.threadId,
                  source: "realtime",
                });
              }
              const markDuration = performance.now() - markStart;
              void logApiCall("rpc", "inbox_mark_thread_read", markDuration, markStatus, {
                user_id: user.id,
                thread_id: mapped.threadId,
                source: "realtime",
              });
              await fetchUnreadCount();
            }
          }

          const refreshed = await fetchThreads({ threadId: mapped.threadId });
          if (
            refreshed &&
            activeThread &&
            keyFromThread(activeThread.threadId, activeThread.socialAccountId) ===
              keyFromThread(refreshed.threadId, refreshed.socialAccountId)
          ) {
            setActiveThread(refreshed);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, activeThread, fetchThreads, fetchUnreadCount, logApiCall, logError]);

  const loadMoreThreads = () => {
    if (!threadsHasMore || !threadsCursor) return;
    fetchThreads({ cursor: threadsCursor, search: debouncedSearch });
  };

  const loadOlderMessages = () => {
    if (!activeThread || !messagesHasMore || !messagesCursor) return;
    fetchMessages(activeThread, { cursor: messagesCursor });
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeThread || !user) return;

    const messageContent = newMessage.trim();
    const optimisticId = `temp-${Date.now()}`;
    const optimisticMessage: InboxMessage = {
      id: optimisticId,
      threadId: activeThread.threadId,
      socialAccountId: activeThread.socialAccountId,
      providerMessageId: null,
      providerThreadId: activeThread.threadId,
      content: messageContent,
      authorId: user.id,
      authorName: "You",
      authorHandle: null,
      authorAvatarUrl: null,
      createdAt: new Date().toISOString(),
      isRead: true,
      requiresResponse: false,
      mediaUrls: [],
      optimistic: true,
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setNewMessage("");
    setSendingMessage(true);

    void logEvent("inbox_send_attempt", {
      thread_id: activeThread.threadId,
      has_media: false,
      message_length: messageContent.length,
    });

    const start = performance.now();
    let status = 200;
    try {
      const { data, error } = await supabase.rpc("inbox_send_message", {
        p_thread_id: activeThread.threadId,
        p_social_account_id: activeThread.socialAccountId,
        p_content: optimisticMessage.content,
        p_media_urls: [],
      });

      if (error) {
        status = 500;
        throw error;
      }

      const insertedRow = Array.isArray(data)
        ? (data[0] as InboxMessageRow | undefined)
        : ((data as InboxMessageRow | undefined));

      if (insertedRow) {
        const mapped = mapMessageRow(insertedRow);
        if (mapped) {
          setMessages((prev) =>
            prev
              .map((message) =>
                message.id === optimisticId ||
                (message.optimistic && message.providerMessageId === mapped.providerMessageId)
                  ? { ...mapped, optimistic: false }
                  : message
              )
              .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
          );
        }
      }

      const updated = await fetchThreads({ threadId: activeThread.threadId });
      if (
        updated &&
        keyFromThread(updated.threadId, updated.socialAccountId) ===
          keyFromThread(activeThread.threadId, activeThread.socialAccountId)
      ) {
        setActiveThread(updated);
      }
      void logEvent("inbox_send_success", {
        thread_id: activeThread.threadId,
      });
    } catch (error) {
      setMessages((prev) => prev.filter((message) => message.id !== optimisticId));
      status = 500;
      void logError("inbox_send_failed", error, {
        thread_id: activeThread.threadId,
        user_id: user.id,
      });
    } finally {
      setSendingMessage(false);
      const duration = performance.now() - start;
      void logApiCall("rpc", "inbox_send_message", duration, status, {
        user_id: user.id,
        thread_id: activeThread.threadId,
        message_length: messageContent.length,
        status,
      });
    }
  };

  if (!user) return null;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <MessageCircle className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? t("messaging:badgeOverflow", { count: 9 }) : unreadCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-2xl p-0">
        <div className="flex h-full">
          <div className="w-1/3 border-r border-border">
            <SheetHeader className="p-4 border-b">
              <SheetTitle>{t("messaging:title")}</SheetTitle>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={t("messaging:searchPlaceholder")}
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="pl-10"
                />
              </div>
            </SheetHeader>
            <ScrollArea className="h-[calc(100vh-120px)]">
              {threadsLoading && threads.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">{t("messaging:loadingConversations")}</div>
              ) : threads.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">{t("messaging:emptyState")}</div>
              ) : (
                <div className="space-y-1">
                  {threads.map((thread) => (
                    <div
                      key={keyFromThread(thread.threadId, thread.socialAccountId)}
                      className={`p-3 cursor-pointer hover:bg-muted/50 transition-colors ${
                        activeThread &&
                        keyFromThread(activeThread.threadId, activeThread.socialAccountId) ===
                          keyFromThread(thread.threadId, thread.socialAccountId)
                          ? "bg-muted"
                          : ""
                      }`}
                      onClick={() => handleSelectThread(thread)}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={thread.latestMessage?.authorAvatarUrl ?? undefined} />
                          <AvatarFallback>
                            {thread.latestMessage?.authorName?.[0] || thread.accountLabel?.[0] || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-medium truncate">{thread.accountLabel || t("messaging:threadFallback")}</p>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {formatRelativeTime(thread.lastMessageAt, { locale: currentLocale })}
                            </span>
                          </div>
                          {thread.latestMessage && (
                            <p className="text-sm text-muted-foreground truncate">
                              {thread.latestMessage.authorName
                                ? t("messaging:authorPrefix", { author: thread.latestMessage.authorName })
                                : ""}
                              {thread.latestMessage.content}
                            </p>
                          )}
                        </div>
                        {thread.unreadCount > 0 && (
                          <Badge variant="secondary" className="ml-2 text-xs">
                            {thread.unreadCount > 9
                              ? t("messaging:badgeOverflow", { count: 9 })
                              : thread.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {threadsHasMore && (
                <div className="p-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={loadMoreThreads}
                    disabled={threadsLoadingMore}
                    className="w-full"
                  >
                    {threadsLoadingMore ? t("messaging:loading") : t("messaging:loadMore")}
                  </Button>
                </div>
              )}
            </ScrollArea>
          </div>

          <div className="flex-1 flex flex-col">
            {activeThread ? (
              <>
                <div className="p-4 border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={activeThread.latestMessage?.authorAvatarUrl ?? undefined} />
                        <AvatarFallback>
                          {activeThread.accountLabel?.[0] || activeThread.latestMessage?.authorName?.[0] || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-medium">
                          {activeThread.accountLabel || t("messaging:threadHeaderFallback")}
                        </h3>
                        {activeThread.accountProvider && (
                          <p className="text-xs text-muted-foreground uppercase">
                            {activeThread.accountProvider.replace(/_/g, " ")}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setActiveThread(null)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {messagesHasMore && (
                      <div className="flex justify-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={loadOlderMessages}
                          disabled={messagesLoadingMore}
                        >
                          {messagesLoadingMore ? t("messaging:loading") : t("messaging:loadPreviousMessages")}
                        </Button>
                      </div>
                    )}
                    {messagesLoading && messages.length === 0 ? (
                      <div className="text-center text-muted-foreground py-8">
                        {t("messaging:loadingMessages")}
                      </div>
                    ) : (
                      messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.authorId === user.id ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                              message.authorId === user.id
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                            <p className="text-xs opacity-70 mt-1">
                              {formatRelativeTime(message.createdAt, { locale: currentLocale })}
                              {message.optimistic ? t("messaging:optimisticStatus") : ""}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                <div className="p-4 border-t">
                  <div className="flex gap-2">
                    <Input
                      placeholder={t("messaging:composerPlaceholder")}
                      value={newMessage}
                      onChange={(event) => setNewMessage(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          sendMessage();
                        }
                      }}
                      className="flex-1"
                      disabled={sendingMessage}
                    />
                    <Button
                      onClick={sendMessage}
                      size="sm"
                      disabled={sendingMessage || !newMessage.trim()}
                      aria-label="Send message"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                {t("messaging:emptyThreadState")}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
