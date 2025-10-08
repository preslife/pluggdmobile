import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import DomainAwareNavigation from "@/components/DomainAwareNavigation";
import { CreditBalance } from "@/components/checkout/CreditBalance";
import { DownloadTracker } from "@/components/DownloadTracker";
import { ReceiptViewer } from "@/components/ReceiptViewer";
import { PlaylistModal } from "@/components/PlaylistModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import useAnalytics from "@/hooks/useAnalytics";
import { useToast } from "@/hooks/use-toast";
import { setMeta } from "@/lib/seo";
import { useLibrary, LibraryItem, LibraryItemType } from "@/services/library";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Track, useGlobalPlayer } from "@/components/GlobalPlayer/GlobalPlayer";
import {
  Clock,
  CreditCard,
  Download,
  ExternalLink,
  Folder,
  Library as LibraryIcon,
  ListPlus,
  Music,
  Plus,
  Share2,
} from "lucide-react";

const TAB_ORDER: { value: LibraryItemType | "all"; label: string; helper?: string }[] = [
  { value: "all", label: "All" },
  { value: "release", label: "Releases", helper: "Music you’ve purchased" },
  { value: "beat", label: "Beats", helper: "Licensed instrumentals" },
  { value: "sample_pack", label: "Sample Packs", helper: "Sound packs & kits" },
  { value: "membership", label: "Memberships", helper: "Creator memberships" },
  { value: "course", label: "Courses", helper: "Lessons & programs" },
  { value: "campaign", label: "Campaigns", helper: "Crowdfunding pledges" },
  { value: "live_session", label: "Live Sessions", helper: "Recordings from events" },
];

const EMPTY_COPY: Record<LibraryItemType, { title: string; description: string }> = {
  beat: {
    title: "No beats yet",
    description: "Browse featured producers and license your first instrumental.",
  },
  release: {
    title: "No releases yet",
    description: "Discover exclusive drops from the community and start your collection.",
  },
  sample_pack: {
    title: "No sample packs yet",
    description: "Explore curated drum kits, one-shots, and loops from top creators.",
  },
  membership: {
    title: "No memberships yet",
    description: "Join a creator’s membership to unlock exclusive posts and downloads.",
  },
  course: {
    title: "No courses yet",
    description: "Enroll in a course to start learning and access lesson materials here.",
  },
  campaign: {
    title: "No pledges yet",
    description: "Support a crowdfunding campaign to see your rewards and updates here.",
  },
  live_session: {
    title: "No recordings yet",
    description: "Attend a live session or workshop and the recording will appear here once published.",
  },
};

const typeAccent: Record<LibraryItemType, string> = {
  release: "bg-emerald-500/10 text-emerald-400",
  beat: "bg-fuchsia-500/10 text-fuchsia-400",
  sample_pack: "bg-sky-500/10 text-sky-400",
  membership: "bg-amber-500/10 text-amber-400",
  course: "bg-indigo-500/10 text-indigo-400",
  campaign: "bg-rose-500/10 text-rose-400",
  live_session: "bg-blue-500/10 text-blue-400",
};

const formatDate = (iso: string) => new Date(iso).toLocaleDateString();

const playableTypes = new Set<LibraryItemType>(["beat", "release", "live_session"]);

const formatPrice = (value: number) => {
  if (!value) return "Included";
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
  } catch (error) {
    console.error("Failed to format price", error);
    return `$${value.toFixed(2)}`;
  }
};

const libraryItemToTrack = (item: LibraryItem): Track | null => {
  if (!playableTypes.has(item.type)) return null;
  const src = item.previewUrl ?? item.downloadSourcePath;
  if (!src) return null;

  return {
    id: item.productId,
    title: item.title,
    artist: item.creatorName ?? "Unknown artist",
    src,
    artwork: item.artworkUrl ?? undefined,
    type: item.type === "beat" ? "beat" : "release",
    releaseId: item.type === "release" ? item.productId : undefined,
    userId: undefined,
    price: item.pricePaid,
    streamable: true,
  };
};

const getSharePath = (item: LibraryItem): string | null => {
  switch (item.type) {
    case "release":
      return `/releases/${item.productId}`;
    case "beat":
      return `/beats/${item.productId}`;
    case "course":
      return `/courses/${item.productId}`;
    case "live_session":
      return null;
    default:
      return null;
  }
};

const LibraryPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { track } = useAnalytics({ enableGDPRCompliance: true, consentRequired: false });
  const { actions: playerActions } = useGlobalPlayer();
  const [activeTab, setActiveTab] = useState<(typeof TAB_ORDER)[number]["value"]>("all");
  const [search, setSearch] = useState("");
  const [playlistTrack, setPlaylistTrack] = useState<Track | null>(null);
  const [isPlaylistModalOpen, setPlaylistModalOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const { items, itemsByType, loading, loadingByType, error, ensureLoaded, refresh } = useLibrary(user?.id ?? null);
  const ensureLoadedRef = useRef(ensureLoaded);

  useEffect(() => {
    ensureLoadedRef.current = ensureLoaded;
  }, [ensureLoaded]);

  useEffect(() => {
    setMeta(
      "Your Library — Pluggd",
      "Access the beats, releases, sample packs, and memberships you've unlocked on Pluggd.",
      "/library",
    );
  }, []);

  useEffect(() => {
    if (!user) return;
    const load = ensureLoadedRef.current;
    if (activeTab === "all") {
      void load("all");
    } else {
      void load([activeTab as LibraryItemType]);
    }
    void track("library_tab_viewed", { tab: activeTab });
  }, [activeTab, track, user]);

  const filterItems = useCallback(
    (list: LibraryItem[]) => {
      const normalisedSearch = search.trim().toLowerCase();
      if (!normalisedSearch) return list;
      return list.filter((item) =>
        [item.title, item.creatorName, item.genre]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(normalisedSearch)),
      );
    },
    [search],
  );

  const filteredAllItems = useMemo(() => filterItems(items), [items, filterItems]);

  const activeType = activeTab === "all" ? undefined : (activeTab as LibraryItemType);

  const itemsForTab = useMemo(() => {
    if (!activeType) return filteredAllItems;
    return filterItems(itemsByType[activeType] ?? []);
  }, [activeType, filteredAllItems, filterItems, itemsByType]);

  useEffect(() => {
    if (!listRef.current || itemsForTab.length === 0) return;
    const firstRow = listRef.current.querySelector<HTMLElement>("[data-library-row]");
    firstRow?.focus();
  }, [activeTab, itemsForTab.length]);

  const handleRequestMore = useCallback(
    async (item: LibraryItem) => {
      try {
        const { error: fnError } = await supabase.functions.invoke("request-download-reset", {
          body: {
            purchaseId: item.id,
            purchaseType: item.type,
            productId: item.productId,
            title: item.title,
          },
        });

        if (fnError) throw fnError;

        toast({
          title: "Request sent",
          description: "Our support team will email you once your download limit is reset.",
        });
        await track("library_download_reset_requested", {
          purchase_id: item.id,
          purchase_type: item.type,
          product_id: item.productId,
        });
      } catch (err) {
        console.error("Failed to request download reset", err);
        toast({
          title: "Request failed",
          description: err instanceof Error ? err.message : "Please try again or contact support.",
          variant: "destructive",
        });
      }
    },
    [toast, track],
  );

  const handleDownload = useCallback(
    async (item: LibraryItem) => {
      if (!item.canDownload) {
        await handleRequestMore(item);
        return;
      }

      try {
        const { data, error: fnError } = await supabase.functions.invoke("download-signed-url", {
          body: {
            purchaseId: item.id,
            purchaseType: item.type,
            productId: item.productId,
          },
        });

        if (fnError) throw fnError;

        const signedUrl: string | undefined = data?.signedUrl ?? data?.downloadUrl;
        if (!signedUrl) {
          throw new Error("Download URL unavailable. Please try again later.");
        }

        window.open(signedUrl, "_blank", "noopener,noreferrer");
        await refresh();
        toast({ title: "Download started", description: `${item.title} is preparing in a new tab.` });
        await track("library_download", {
          purchase_id: item.id,
          purchase_type: item.type,
          product_id: item.productId,
        });
      } catch (err) {
        console.error("Failed to download", err);
        toast({
          title: "Download failed",
          description: err instanceof Error ? err.message : "Please try again or contact support.",
          variant: "destructive",
        });
      }
    },
    [handleRequestMore, refresh, toast, track],
  );

  const handleAddToQueue = useCallback(
    (item: LibraryItem) => {
      const trackItem = libraryItemToTrack(item);
      if (!trackItem) {
        toast({
          title: "Unable to queue",
          description: "This item doesn’t have a playable preview yet.",
          variant: "destructive",
        });
        return;
      }
      playerActions.addToQueue(trackItem);
      toast({ title: "Added to queue", description: `${item.title} was queued in the player.` });
      void track("library_add_to_queue", { purchase_id: item.id, purchase_type: item.type });
    },
    [playerActions, toast, track],
  );

  const handleAddToPlaylist = useCallback(
    (item: LibraryItem) => {
      const trackItem = libraryItemToTrack(item);
      if (!trackItem) {
        toast({
          title: "Unable to add to playlist",
          description: "This item doesn’t include a playlist-ready track.",
          variant: "destructive",
        });
        return;
      }
      setPlaylistTrack(trackItem);
      setPlaylistModalOpen(true);
      void track("library_add_to_playlist", { purchase_id: item.id, purchase_type: item.type });
    },
    [toast, track],
  );

  const handleShare = useCallback(
    async (item: LibraryItem) => {
      const path = getSharePath(item);
      if (!path) return;
      const url = `${window.location.origin}${path}`;

      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(url);
        } else {
          const temp = document.createElement("textarea");
          temp.value = url;
          document.body.appendChild(temp);
          temp.select();
          document.execCommand("copy");
          document.body.removeChild(temp);
        }
        toast({ title: "Link copied", description: "Shareable link copied to your clipboard." });
        await track("library_share_copied", { purchase_type: item.type, product_id: item.productId });
      } catch (err) {
        console.error("Failed to copy share link", err);
        toast({
          title: "Copy failed",
          description: "We couldn’t copy that link. Try again or copy it manually.",
          variant: "destructive",
        });
      }
    },
    [toast, track],
  );

  if (!user) {
    return unauthenticatedView;
  }

  const emptyCopy = activeType ? EMPTY_COPY[activeType] : null;
  const isTabLoading = activeType ? loadingByType[activeType] : loadingByType.all;
  const totalCount = filteredAllItems.length;
  const tabCount = itemsForTab.length;

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <DomainAwareNavigation />
        <div className="container mx-auto max-w-4xl px-4 py-16 pt-24 text-center">
          <Card>
            <CardContent className="py-12">
              <LibraryIcon className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
              <h2 className="mb-2 text-2xl font-semibold">Sign in required</h2>
              <p className="mb-6 text-muted-foreground">
                Sign in to view your library of releases, beats, and downloads.
              </p>
              <Button asChild>
                <a href="/auth/login?redirect=/library">Sign in</a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        <DomainAwareNavigation />

        <div className="container mx-auto max-w-7xl px-4 py-10 pt-24">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold">Your Library</h1>
              <p className="text-muted-foreground">
                Manage downloads, receipts, memberships, and pledges you’ve unlocked on Pluggd.
              </p>
            </div>
            <Button asChild size="sm" variant="secondary">
              <a href="/marketplace">
                <Plus className="mr-2 h-4 w-4" /> Browse marketplace
              </a>
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
            <div className="space-y-6 lg:col-span-3">
              <Card>
                <CardHeader className="space-y-4">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="w-full md:w-72">
                      <Input
                        placeholder="Search your library"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        aria-label="Search library"
                      />
                    </div>
                    <div className="flex flex-col gap-2 text-sm text-muted-foreground md:text-right">
                      <span>{totalCount} total item{totalCount === 1 ? "" : "s"}</span>
                      {activeTab !== "all" && <span>{tabCount} in this view</span>}
                    </div>
                  </div>

                  <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
                    <TabsList className="flex w-full overflow-x-auto" aria-label="Library categories">
                      {TAB_ORDER.map((tab) => (
                        <TabsTrigger key={tab.value} value={tab.value} className="shrink-0">
                          {tab.label}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>
                </CardHeader>

                <CardContent className="space-y-6">
                  {error && (
                    <Card className="border-destructive/30 bg-destructive/10 text-destructive">
                      <CardContent className="py-4 text-sm">{error}</CardContent>
                    </Card>
                  )}

                  <Tabs value={activeTab} className="space-y-6">
                    {TAB_ORDER.map((tab) => {
                      const tabType = tab.value === "all" ? undefined : (tab.value as LibraryItemType);
                      const isLoading = tabType ? loadingByType[tabType] : loadingByType.all;
                      const tabItems = tabType ? filterItems(itemsByType[tabType] ?? []) : filteredAllItems;
                      const tabEmpty = tabType ? EMPTY_COPY[tabType] : null;

                      return (
                        <TabsContent key={tab.value} value={tab.value} className="space-y-6 focus-visible:outline-none">
                          <SectionSummary helper={tab.helper} count={tabItems.length} loading={isLoading} />
                          {isLoading ? (
                            <LibrarySkeleton />
                          ) : tabItems.length === 0 ? (
                            tabType && tabEmpty ? (
                              <EmptyState title={tabEmpty.title} description={tabEmpty.description} />
                            ) : (
                              <EmptyState
                                title="Nothing here yet"
                                description="Items you purchase or unlock will appear here immediately."
                              />
                            )
                          ) : (
                            <ScrollArea className="max-h-[620px] pr-3">
                              <div
                                ref={tab.value === activeTab ? listRef : undefined}
                                className="space-y-4"
                                role="list"
                              >
                                {tabItems.map((item, index) => (
                                  <LibraryRow
                                    key={item.id}
                                    item={item}
                                    onDownload={handleDownload}
                                    onRequestMore={handleRequestMore}
                                    onAddToQueue={handleAddToQueue}
                                    onAddToPlaylist={handleAddToPlaylist}
                                    onShare={handleShare}
                                    autoFocus={index === 0 && tab.value === activeTab}
                                  />
                                ))}
                              </div>
                            </ScrollArea>
                          )}
                        </TabsContent>
                      );
                    })}
                  </Tabs>
                </CardContent>
              </Card>

              <DownloadTracker
                items={filteredAllItems}
                loading={loading}
                onDownload={handleDownload}
                onRequestMore={(item) => {
                  void handleRequestMore(item);
                }}
              />
            </div>

            <div className="space-y-6 lg:col-span-1">
              <Card>
                <CardContent className="p-6 text-center">
                  <Folder className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                  <h3 className="mb-2 text-lg font-semibold">Need more sounds?</h3>
                  <p className="mb-4 text-sm text-muted-foreground">
                    Browse curated releases, exclusive beats, and community sample packs.
                  </p>
                  <Button asChild variant="outline">
                    <a href="/marketplace">
                      <ExternalLink className="mr-2 h-4 w-4" /> Explore marketplace
                    </a>
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CreditCard className="h-4 w-4" />
                    Wallet balance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CreditBalance showTransactions={true} />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {playlistTrack && (
        <PlaylistModal
          isOpen={isPlaylistModalOpen}
          onClose={() => {
            setPlaylistModalOpen(false);
            setPlaylistTrack(null);
          }}
          track={{
            ...playlistTrack,
            type: playlistTrack.type ?? (playlistTrack.releaseId ? "release" : "beat"),
          }}
        />
      )}
    </TooltipProvider>
  );
};

const SectionSummary = ({ helper, count, loading }: { helper?: string; count: number; loading?: boolean }) => (
  <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
    <span>{helper ?? ""}</span>
    <span>{loading ? "Loading…" : `${count} item${count === 1 ? "" : "s"}`}</span>
  </div>
);

const EmptyState = ({ title, description }: { title: string; description: string }) => (
  <Card className="border-dashed">
    <CardContent className="py-10 text-center">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-1 text-muted-foreground">{description}</p>
    </CardContent>
  </Card>
);

const LibrarySkeleton = () => (
  <div className="space-y-4">
    {[0, 1, 2].map((key) => (
      <Card key={key} className="overflow-hidden">
        <CardContent className="flex items-center gap-4 p-4">
          <Skeleton className="h-20 w-20 rounded-md" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-2/5" />
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);

const LibraryRow = ({
  item,
  onDownload,
  onRequestMore,
  onAddToQueue,
  onAddToPlaylist,
  onShare,
  autoFocus,
}: {
  item: LibraryItem;
  onDownload: (item: LibraryItem) => Promise<void>;
  onRequestMore: (item: LibraryItem) => Promise<void> | void;
  onAddToQueue: (item: LibraryItem) => void;
  onAddToPlaylist: (item: LibraryItem) => void;
  onShare: (item: LibraryItem) => Promise<void> | void;
  autoFocus?: boolean;
}) => {
  const accent = typeAccent[item.type];
  const cardRef = useRef<HTMLDivElement>(null);
  const isPlayable = playableTypes.has(item.type) && !!libraryItemToTrack(item);
  const sharePath = getSharePath(item);
  const priceLabel = formatPrice(item.pricePaid ?? 0);

  useEffect(() => {
    if (autoFocus && cardRef.current) {
      cardRef.current.focus();
    }
  }, [autoFocus]);

  return (
    <Card
      ref={cardRef}
      data-library-row
      tabIndex={0}
      role="listitem"
      className="overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          void onDownload(item);
        }
      }}
    >
      <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center">
          <div className="relative mr-4 h-20 w-20 flex-shrink-0 overflow-hidden rounded-md bg-muted">
            {item.artworkUrl ? (
              <img src={item.artworkUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                <Music className="h-8 w-8" />
              </div>
            )}
            <Badge className={cn("absolute left-2 top-2 capitalize", accent)}>{item.type.replace("_", " ")}</Badge>
          </div>

          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold leading-tight">{item.title}</h3>
              {item.creatorName && <span className="text-sm text-muted-foreground">by {item.creatorName}</span>}
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span>Purchased {formatDate(item.purchaseDate)}</span>
              {item.genre && <span>{item.genre}</span>}
              <span>
                Downloads: {item.downloadCount}
                {item.maxDownloads != null ? ` / ${item.maxDownloads}` : ""}
              </span>
              {item.lastDownloadedAt && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Last downloaded {formatDate(item.lastDownloadedAt)}</span>}
              {item.downloadExpiresAt && <span>Expires {formatDate(item.downloadExpiresAt)}</span>}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Badge variant="secondary" className="flex items-center gap-1">
                <CreditCard className="h-3 w-3" /> {priceLabel}
              </Badge>
              {item.receiptUrl && (
                <ReceiptViewer paymentId={item.id} receiptUrl={item.receiptUrl}>
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                    Receipt
                  </Button>
                </ReceiptViewer>
              )}
              {item.licenseUrl && (
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" asChild>
                  <a href={item.licenseUrl} target="_blank" rel="noopener noreferrer">
                    License
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant={item.canDownload ? "default" : "outline"} onClick={() => onDownload(item)}>
            <Download className="mr-2 h-4 w-4" />
            {item.canDownload ? "Download" : "Request reset"}
          </Button>

          {!item.canDownload && (
            <Button size="sm" variant="ghost" onClick={() => onRequestMore(item)}>
              Request support
            </Button>
          )}

          {isPlayable && (
            <Button size="sm" variant="outline" onClick={() => onAddToQueue(item)}>
              <ListPlus className="mr-2 h-4 w-4" /> Queue
            </Button>
          )}

          {isPlayable && (
            <Button size="sm" variant="outline" onClick={() => onAddToPlaylist(item)}>
              <Music className="mr-2 h-4 w-4" /> Playlist
            </Button>
          )}

          {sharePath && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="ghost" onClick={() => onShare(item)} aria-label="Copy share link">
                  <Share2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Copy share link</p>
              </TooltipContent>
            </Tooltip>
          )}

        </div>
      </CardContent>
    </Card>
  );
};

export default LibraryPage;
