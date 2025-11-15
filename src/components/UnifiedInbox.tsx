import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import {
  Inbox,
  Star,
  Reply,
  ExternalLink,
  MessageSquare,
  Mail,
  Youtube,
  Instagram,
  Hash,
  Crown,
  Search,
  Bot,
  Loader2,
  RefreshCw,
  SendHorizontal
} from "lucide-react";

interface InboxMessage {
  id: string;
  provider: string;
  message_id: string | null;
  author_name: string | null;
  author_handle: string | null;
  author_id?: string | null;
  snippet: string | null;
  permalink: string | null;
  thread_id: string | null;
  is_read: boolean;
  is_starred: boolean;
  created_at: string;
  user_id: string;
}

type InboxProvider = "gmail" | "discord";

interface ProviderStatus {
  connected: boolean;
  detail?: string | null;
  meta?: Record<string, any>;
  lastSynced?: string | null;
}

const PROVIDER_ICONS = {
  youtube: Youtube,
  discord: MessageSquare,
  gmail: Mail,
  instagram: Instagram,
  twitter: Hash
};

const PROVIDER_COLORS = {
  youtube: "bg-red-500",
  discord: "bg-indigo-500",
  gmail: "bg-red-600",
  instagram: "bg-gradient-to-r from-purple-500 to-pink-500",
  twitter: "bg-black"
};

const INBOX_PROVIDERS: InboxProvider[] = ["gmail", "discord"];
const PAGE_SIZE = 25;

const DEFAULT_CONNECTIONS: Record<InboxProvider, ProviderStatus> = {
  gmail: { connected: false },
  discord: { connected: false }
};

export const UnifiedInbox = () => {
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [filteredMessages, setFilteredMessages] = useState<InboxMessage[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingPage, setLoadingPage] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<InboxMessage | null>(null);
  const [replyText, setReplyText] = useState("");
  const [filters, setFilters] = useState({
    provider: "all",
    status: "all",
    search: ""
  });
  const [connections, setConnections] = useState<Record<InboxProvider, ProviderStatus>>(DEFAULT_CONNECTIONS);
  const [connectionsLoading, setConnectionsLoading] = useState(false);
  const [pollingProvider, setPollingProvider] = useState<InboxProvider | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeProvider, setComposeProvider] = useState<InboxProvider>("gmail");
  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [composeChannel, setComposeChannel] = useState("");
  const [sendingCompose, setSendingCompose] = useState(false);

  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    if (user) {
      void fetchConnections();
      void loadMessages(0, true);
    } else {
      setMessages([]);
      setFilteredMessages([]);
      setConnections(DEFAULT_CONNECTIONS);
    }
  }, [user?.id]);

  useEffect(() => {
    applyFilters();
  }, [messages, filters]);

  const fetchConnections = async () => {
    if (!user) return;
    setConnectionsLoading(true);

    try {
      const { data, error } = await supabase
        .from("social_connections")
        .select("provider, display_name, account_id, updated_at, connection_data")
        .eq("user_id", user.id)
        .in("provider", INBOX_PROVIDERS);

      if (error) throw error;

      const next = { ...DEFAULT_CONNECTIONS };
      for (const row of data || []) {
        const provider = row.provider as InboxProvider;
        next[provider] = {
          connected: true,
          detail:
            provider === "gmail"
              ? (row.connection_data?.email as string | undefined) || row.account_id || row.display_name
              : (row.connection_data?.channel_name as string | undefined) ||
                row.connection_data?.channel_id ||
                row.display_name,
          lastSynced: row.updated_at,
          meta: row.connection_data || {}
        };
      }
      setConnections(next);
    } catch (error) {
      console.error("Error loading inbox connections:", error);
      setConnections(DEFAULT_CONNECTIONS);
    } finally {
      setConnectionsLoading(false);
    }
  };

  const loadMessages = async (pageToLoad: number, reset = false) => {
    if (!user) return;

    if (reset) {
      setInitialLoading(true);
      setHasMore(true);
    } else {
      setLoadingPage(true);
    }

    try {
      const from = pageToLoad * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from("unified_inbox")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      setMessages((prev) => {
        if (reset || pageToLoad === 0) {
          return data || [];
        }

        const ids = new Set(prev.map((msg) => msg.id));
        const merged = [...prev];

        for (const message of data || []) {
          if (!ids.has(message.id)) {
            merged.push(message);
          }
        }

        return merged;
      });

      setPage(pageToLoad);
      setHasMore((data || []).length === PAGE_SIZE);
    } catch (error) {
      console.error("Error fetching inbox messages:", error);
      if (reset) {
        setMessages([]);
      }
      toast({
        title: "Error",
        description: "Failed to load inbox messages",
        variant: "destructive"
      });
    } finally {
      setInitialLoading(false);
      setLoadingPage(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...messages];

    if (filters.provider !== "all") {
      filtered = filtered.filter((msg) => msg.provider === filters.provider);
    }

    if (filters.status === "unread") {
      filtered = filtered.filter((msg) => !msg.is_read);
    } else if (filters.status === "starred") {
      filtered = filtered.filter((msg) => msg.is_starred);
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (msg) =>
          (msg.snippet && msg.snippet.toLowerCase().includes(searchLower)) ||
          (msg.author_name && msg.author_name.toLowerCase().includes(searchLower)) ||
          (msg.author_handle && msg.author_handle.toLowerCase().includes(searchLower))
      );
    }

    setFilteredMessages(filtered);
  };

  const markAsRead = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from("unified_inbox")
        .update({ is_read: true })
        .eq("id", messageId)
        .eq("user_id", user!.id);

      if (error) throw error;

      setMessages((prev) => prev.map((msg) => (msg.id === messageId ? { ...msg, is_read: true } : msg)));
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  const toggleStar = async (messageId: string, starred: boolean) => {
    try {
      const { error } = await supabase
        .from("unified_inbox")
        .update({ is_starred: starred })
        .eq("id", messageId)
        .eq("user_id", user!.id);

      if (error) throw error;

      setMessages((prev) => prev.map((msg) => (msg.id === messageId ? { ...msg, is_starred: starred } : msg)));

      toast({
        title: starred ? "Starred" : "Unstarred",
        description: `Message ${starred ? "added to" : "removed from"} favorites`
      });
    } catch (error) {
      console.error("Error toggling star:", error);
    }
  };

  const handleReply = async (message: InboxMessage) => {
    if (!replyText.trim()) return;

    try {
      let replyUrl = "";

      switch (message.provider) {
        case "youtube": {
          const { error } = await supabase.functions.invoke("reply-youtube-comment", {
            body: {
              comment_id: message.message_id,
              reply_text: replyText
            }
          });
          if (error) throw error;
          break;
        }
        case "discord": {
          const { error } = await supabase.functions.invoke("reply-discord-message", {
            body: {
              channel_id: message.thread_id,
              reply_text: replyText,
              original_message_id: message.message_id
            }
          });
          if (error) throw error;
          break;
        }
        case "gmail": {
          replyUrl = `https://mail.google.com/mail/u/0/#inbox/${message.thread_id}`;
          window.open(replyUrl, "_blank");
          break;
        }
        default: {
          toast({
            title: "Reply Not Available",
            description: `Replies not supported for ${message.provider}`,
            variant: "destructive"
          });
          return;
        }
      }

      if (message.provider !== "gmail") {
        toast({
          title: "Reply Sent",
          description: `Your reply has been sent via ${message.provider}`
        });
      }

      setReplyText("");
      setSelectedMessage(null);
    } catch (error) {
      console.error("Error sending reply:", error);
      toast({
        title: "Reply Failed",
        description: "Failed to send reply",
        variant: "destructive"
      });
    }
  };

  const getProviderIcon = (provider: string) => {
    const Icon = PROVIDER_ICONS[provider] || MessageSquare;
    return Icon;
  };

  const getProviderColor = (provider: string) => {
    return PROVIDER_COLORS[provider] || "bg-gray-500";
  };

  const unreadCount = messages.filter((msg) => !msg.is_read).length;
  const starredCount = messages.filter((msg) => msg.is_starred).length;

  const connectProvider = (provider: InboxProvider) => {
    // route user to integrations page where OAuth flow is handled
    window.open(`/studio/plugins?tab=connections&provider=${provider}`, "_blank");
  };

  const disconnectProvider = async (provider: InboxProvider) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from("social_connections")
        .delete()
        .eq("provider", provider)
        .eq("user_id", user.id);

      if (error) throw error;
      toast({
        title: "Disconnected",
        description: `Removed ${provider} credentials`
      });
      await fetchConnections();
    } catch (error) {
      console.error("Disconnect error:", error);
      toast({
        title: "Error disconnecting",
        description: "Unable to remove credentials right now",
        variant: "destructive"
      });
    }
  };

  const triggerPoll = async (provider: InboxProvider) => {
    if (!user) return;
    setPollingProvider(provider);
    try {
      const functionName =
        provider === "gmail" ? "inbox-fetch-gmail" : provider === "discord" ? "inbox-fetch-discord" : null;
      if (!functionName) return;
      const { error } = await supabase.functions.invoke(functionName, {
        body: { manual: true }
      });
      if (error) throw error;
      toast({
        title: "Sync requested",
        description: `Checking ${provider} for new messages`
      });
      await loadMessages(0, true);
    } catch (error) {
      console.error("Inbox poll failed", error);
      toast({
        title: "Unable to sync",
        description: `Could not poll ${provider} right now`,
        variant: "destructive"
      });
    } finally {
      setPollingProvider(null);
    }
  };

  const sendComposeMessage = async () => {
    if (!composeBody.trim()) {
      toast({
        title: "Message required",
        description: "Enter a message before sending",
        variant: "destructive"
      });
      return;
    }

    if (!connections[composeProvider]?.connected) {
      toast({
        title: "Provider not connected",
        description: `Connect ${composeProvider} before sending`,
        variant: "destructive"
      });
      return;
    }

    try {
      setSendingCompose(true);
      if (composeProvider === "gmail") {
        const to = composeTo.trim();
        if (!to || !composeSubject.trim()) {
          toast({
            title: "Missing details",
            description: "Provide a recipient email and subject.",
            variant: "destructive"
          });
          setSendingCompose(false);
          return;
        }
        const { error } = await supabase.functions.invoke("inbox-send-gmail", {
          body: {
            to,
            subject: composeSubject.trim(),
            body: composeBody.trim()
          }
        });
        if (error) throw error;
      } else {
        const channelId = composeChannel.trim() || (connections.discord.meta?.channel_id as string | undefined);
        if (!channelId) {
          toast({
            title: "Missing channel",
            description: "Provide a Discord channel ID.",
            variant: "destructive"
          });
          setSendingCompose(false);
          return;
        }
        const { error } = await supabase.functions.invoke("inbox-send-discord", {
          body: {
            channel_id: channelId,
            content: composeBody.trim()
          }
        });
        if (error) throw error;
      }

      toast({
        title: "Message sent",
        description: `Delivered via ${composeProvider}`
      });
      setComposeBody("");
      setComposeSubject("");
      setComposeTo("");
      setComposeChannel("");
      setComposeOpen(false);
      await loadMessages(0, true);
    } catch (error) {
      console.error("Compose send failed", error);
      toast({
        title: "Send failed",
        description: "Unable to send message right now.",
        variant: "destructive"
      });
    } finally {
      setSendingCompose(false);
    }
  };

  const renderConnections = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Inbox Connectors
          </span>
          <Button variant="ghost" size="sm" onClick={() => fetchConnections()} disabled={connectionsLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${connectionsLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </CardTitle>
        <CardDescription>Connect Gmail and Discord to collect fan conversations automatically.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {INBOX_PROVIDERS.map((provider) => {
          const status = connections[provider];
          const Icon = provider === "gmail" ? Mail : MessageSquare;
          const detailLabel =
            provider === "gmail"
              ? status.detail || "No email connected"
              : status.detail || "No default channel configured";

          return (
            <div
              key={provider}
              className="flex flex-col gap-3 rounded-lg border bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-background shadow">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-semibold capitalize">{provider}</p>
                    <p className="text-xs text-muted-foreground">{detailLabel}</p>
                  </div>
                </div>
                {status.lastSynced && (
                  <p className="text-xs text-muted-foreground">
                    Last synced {new Date(status.lastSynced).toLocaleString()}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={status.connected ? "default" : "secondary"}>
                  {status.connected ? "Connected" : "Not connected"}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => connectProvider(provider)}
                  disabled={connectionsLoading}
                >
                  {status.connected ? "Manage" : "Connect"}
                </Button>
                {status.connected && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => disconnectProvider(provider)}
                      disabled={connectionsLoading}
                    >
                      Disconnect
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => triggerPoll(provider)}
                      disabled={pollingProvider === provider}
                    >
                      {pollingProvider === provider ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Syncing
                        </>
                      ) : (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Poll now
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );

  if (!user) {
    return (
      <div className="text-center py-12">
        <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Authentication Required</h3>
        <p className="text-muted-foreground">Please sign in to manage your inbox.</p>
      </div>
    );
  }

  if (initialLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="w-full h-16 bg-muted rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Inbox className="h-5 w-5" />
              {t("pages.messaging.heading")}
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {unreadCount} unread
                </Badge>
              )}
            </CardTitle>
            <CardDescription>{t("pages.messaging.description")}</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => loadMessages(0, true)} disabled={loadingPage}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loadingPage ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button onClick={() => setComposeOpen(true)}>
              <SendHorizontal className="mr-2 h-4 w-4" />
              Compose
            </Button>
          </div>
        </CardHeader>
      </Card>

      {renderConnections()}

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("common.search")}
                value={filters.search}
                onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                className="w-64"
              />
            </div>

            <Select
              value={filters.provider}
              onValueChange={(value) => setFilters((prev) => ({ ...prev, provider: value }))}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder={t("pages.messaging.providerPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("pages.messaging.providerPlaceholder")}</SelectItem>
                <SelectItem value="youtube">YouTube</SelectItem>
                <SelectItem value="discord">Discord</SelectItem>
                <SelectItem value="gmail">Gmail</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="twitter">Twitter</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.status} onValueChange={(value) => setFilters((prev) => ({ ...prev, status: value }))}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="unread">Unread</SelectItem>
                <SelectItem value="starred">Starred</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Crown className="h-4 w-4" />
              {starredCount} starred
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {filteredMessages.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Inbox className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {messages.length === 0 ? "No messages in your inbox" : "No messages match your filters"}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredMessages.map((message) => {
            const Icon = getProviderIcon(message.provider);
            const providerColor = getProviderColor(message.provider);

            return (
              <Sheet key={message.id}>
                <SheetTrigger asChild>
                  <Card
                    className={`cursor-pointer hover:bg-muted/50 transition-colors ${
                      !message.is_read ? "border-l-4 border-l-primary" : ""
                    }`}
                    onClick={() => {
                      setSelectedMessage(message);
                      if (!message.is_read) {
                        void markAsRead(message.id);
                      }
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${providerColor} flex-shrink-0`}>
                          <Icon className="h-4 w-4 text-white" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{message.author_name}</span>
                            {message.author_handle && (
                              <span className="text-xs text-muted-foreground">@{message.author_handle}</span>
                            )}
                            <Badge variant="outline" className="text-xs capitalize">
                              {message.provider}
                            </Badge>
                            {message.is_starred && <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />}
                          </div>

                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {message.snippet || "No preview available"}
                          </p>

                          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                            <span>{new Date(message.created_at).toLocaleDateString()}</span>
                            {!message.is_read && <Badge variant="secondary">Unread</Badge>}
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              void toggleStar(message.id, !message.is_starred);
                            }}
                          >
                            <Star className={`h-4 w-4 ${message.is_starred ? "fill-yellow-400 text-yellow-400" : ""}`} />
                          </Button>

                          {message.permalink && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(message.permalink!, "_blank");
                              }}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </SheetTrigger>

                <SheetContent className="w-full sm:max-w-lg">
                  <SheetHeader>
                    <SheetTitle className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${providerColor}`}>
                          <Icon className="h-3 w-3 text-white" />
                        </div>
                        {message.author_name}
                      </span>
                    </SheetTitle>
                  </SheetHeader>

                  <div className="mt-6 space-y-4">
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm whitespace-pre-wrap">{message.snippet || "No content available"}</p>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Badge variant="outline" className="capitalize">
                        {message.provider}
                      </Badge>
                      <span>{new Date(message.created_at).toLocaleString()}</span>
                    </div>

                    {["youtube", "discord", "gmail"].includes(message.provider) && (
                      <div className="space-y-3">
                        <Textarea
                          placeholder="Write your reply..."
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          rows={3}
                        />
                        <Button onClick={() => handleReply(message)} disabled={!replyText.trim()} className="w-full">
                          <Reply className="h-4 w-4 mr-2" />
                          {message.provider === "gmail" ? "Open in Gmail" : "Send Reply"}
                        </Button>
                      </div>
                    )}

                    {!["youtube", "discord", "gmail"].includes(message.provider) && (
                      <div className="p-3 bg-muted rounded-lg text-sm text-muted-foreground">
                        Replies not available for {message.provider}
                      </div>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            );
          })
        )}
      </div>

      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button onClick={() => loadMessages(page + 1)} disabled={loadingPage}>
            {loadingPage ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading
              </>
            ) : (
              "Load more"
            )}
          </Button>
        </div>
      )}

      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Compose message</DialogTitle>
            <DialogDescription>Select a connected provider and send a new conversation.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">Provider</label>
              <Select
                value={composeProvider}
                onValueChange={(value) => setComposeProvider(value as InboxProvider)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gmail">Gmail</SelectItem>
                  <SelectItem value="discord">Discord</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {composeProvider === "gmail" ? (
              <>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Recipient email</label>
                  <Input
                    placeholder="fan@example.com"
                    value={composeTo}
                    onChange={(e) => setComposeTo(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Subject</label>
                  <Input
                    placeholder="Subject"
                    value={composeSubject}
                    onChange={(e) => setComposeSubject(e.target.value)}
                  />
                </div>
              </>
            ) : (
              <div className="space-y-1">
                <label className="text-sm font-medium">Channel ID</label>
                <Input
                  placeholder="Discord channel ID"
                  value={composeChannel}
                  onChange={(e) => setComposeChannel(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Leave blank to use the default channel stored in your Discord connector.
                </p>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-sm font-medium">Message</label>
              <Textarea
                rows={5}
                placeholder="Type your message..."
                value={composeBody}
                onChange={(e) => setComposeBody(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setComposeOpen(false)}>
              Cancel
            </Button>
            <Button onClick={sendComposeMessage} disabled={sendingCompose}>
              {sendingCompose ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending…
                </>
              ) : (
                "Send"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
