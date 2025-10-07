import React, { useEffect, useMemo, useState } from "react";

import DomainAwareNavigation from "@/components/DomainAwareNavigation";
import { CreditBalance } from "@/components/checkout/CreditBalance";
import { DownloadTracker } from "@/components/DownloadTracker";
import { ReceiptViewer } from "@/components/ReceiptViewer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { setMeta } from "@/lib/seo";
import { useLibrary, LibraryItem, LibraryItemType } from "@/services/library";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { CreditCard, Download, ExternalLink, Folder, Library as LibraryIcon, Plus } from "lucide-react";

const TAB_ORDER: { value: LibraryItemType | "all"; label: string; helper?: string }[] = [
  { value: "all", label: "All" },
  { value: "release", label: "Releases", helper: "Music you’ve purchased" },
  { value: "beat", label: "Beats", helper: "Licensed instrumentals" },
  { value: "sample_pack", label: "Sample Packs", helper: "Sound packs & kits" },
  { value: "membership", label: "Memberships", helper: "Creator memberships" },
  { value: "course", label: "Courses", helper: "Lessons & programs" },
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
    title: "Memberships coming soon",
    description: "Creator memberships unlock behind-the-scenes content. Stay tuned!",
  },
  course: {
    title: "Courses coming soon",
    description: "Learn from industry pros. Courses will appear here once available.",
  },
};

const typeAccent: Record<LibraryItemType, string> = {
  release: "bg-emerald-500/10 text-emerald-400",
  beat: "bg-fuchsia-500/10 text-fuchsia-400",
  sample_pack: "bg-sky-500/10 text-sky-400",
  membership: "bg-amber-500/10 text-amber-400",
  course: "bg-indigo-500/10 text-indigo-400",
};

const formatDate = (iso: string) => new Date(iso).toLocaleDateString();

const LibraryPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<(typeof TAB_ORDER)[number]["value"]>("all");
  const [search, setSearch] = useState("");

  const { items, loading, error, refresh } = useLibrary(user?.id ?? null);

  useEffect(() => {
    setMeta(
      "Your Library — Pluggd",
      "Access the beats, releases, sample packs, and memberships you've unlocked on Pluggd.",
      "/library"
    );
  }, []);

  const filteredItems = useMemo(() => {
    const normalisedSearch = search.trim().toLowerCase();
    return items.filter((item) => {
      const matchesTab = activeTab === "all" ? true : item.type === activeTab;
      const matchesSearch = normalisedSearch
        ? [item.title, item.creatorName, item.genre]
            .filter(Boolean)
            .some((value) => value!.toLowerCase().includes(normalisedSearch))
        : true;
      return matchesTab && matchesSearch;
    });
  }, [items, activeTab, search]);

  const itemsForTab = useMemo(() => {
    if (activeTab === "all") return filteredItems;
    return filteredItems.filter((item) => item.type === activeTab);
  }, [filteredItems, activeTab]);

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <DomainAwareNavigation />
        <div className="container mx-auto px-4 py-16 pt-24 max-w-4xl text-center">
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

  const handleDownload = async (item: LibraryItem) => {
    if (!item.canDownload || !item.downloadSourcePath) {
      handleRequestMore(item);
      return;
    }

    try {
      const { data, error: fnError } = await supabase.functions.invoke("download-signed-url", {
        body: {
          purchaseId: item.id,
          purchaseType: item.type,
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
    } catch (err) {
      console.error("Failed to download", err);
      toast({
        title: "Download failed",
        description: err instanceof Error ? err.message : "Please try again or contact support.",
        variant: "destructive",
      });
    }
  };

  const handleRequestMore = (item: LibraryItem) => {
    toast({
      title: "Need more downloads?",
      description: "Reach out to support and include your order details so we can help reset your download limit.",
    });
  };

  const activeType = activeTab === "all" ? undefined : (activeTab as LibraryItemType);
  const emptyCopy = activeType ? EMPTY_COPY[activeType] : null;

  return (
    <div className="min-h-screen bg-background">
      <DomainAwareNavigation />

      <div className="container mx-auto max-w-7xl px-4 py-10 pt-24">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Your Library</h1>
            <p className="text-muted-foreground">
              Manage downloads, receipts, and licenses for everything you’ve unlocked on Pluggd.
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
                    />
                  </div>
                  <div className="flex flex-col gap-2 text-sm text-muted-foreground md:text-right">
                    <span>{items.length} total items</span>
                    {activeTab !== "all" && <span>{itemsForTab.length} in this view</span>}
                  </div>
                </div>

                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
                  <TabsList className="flex w-full overflow-x-auto">
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
                    <CardContent className="py-4 text-sm">
                      {error}
                    </CardContent>
                  </Card>
                )}

                <Tabs value={activeTab} className="space-y-6">
                  {TAB_ORDER.map((tab) => {
                    const tabItems = tab.value === "all" ? filteredItems : filteredItems.filter((item) => item.type === tab.value);
                    return (
                      <TabsContent key={tab.value} value={tab.value} className="space-y-6">
                        <SectionSummary helper={tab.helper} count={tabItems.length} />
                        {tabItems.length === 0 ? (
                          tab.value !== "all" && emptyCopy ? (
                            <EmptyState title={emptyCopy.title} description={emptyCopy.description} />
                          ) : (
                            <EmptyState
                              title="Nothing here yet"
                              description="Items you purchase or unlock will appear here immediately."
                            />
                          )
                        ) : (
                          <ScrollArea className="max-h-[620px] pr-3">
                            <div className="space-y-4">
                              {tabItems.map((item) => (
                                <LibraryRow key={item.id} item={item} onDownload={handleDownload} />
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
              items={filteredItems}
              loading={loading}
              onDownload={handleDownload}
              onRequestMore={handleRequestMore}
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
  );
};

const SectionSummary = ({ helper, count }: { helper?: string; count: number }) => (
  <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
    <span>{helper ?? ""}</span>
    <span>{count} item{count === 1 ? "" : "s"}</span>
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

const LibraryRow = ({ item, onDownload }: { item: LibraryItem; onDownload: (item: LibraryItem) => Promise<void> }) => {
  const accent = typeAccent[item.type];
  return (
    <Card className="overflow-hidden">
      <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={cn("capitalize", accent)}>{item.type.replace("_", " ")}</Badge>
            <h3 className="text-lg font-semibold leading-tight">{item.title}</h3>
            {item.creatorName && <span className="text-sm text-muted-foreground">by {item.creatorName}</span>}
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span>Purchased {formatDate(item.purchaseDate)}</span>
            {item.genre && <span>{item.genre}</span>}
            <span>
              Downloads: {item.downloadCount}
              {item.maxDownloads != null ? ` / ${item.maxDownloads}` : ""}
            </span>
            {item.downloadExpiresAt && <span>Expires {formatDate(item.downloadExpiresAt)}</span>}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {item.receiptUrl && (
            <ReceiptViewer paymentId={item.id} receiptUrl={item.receiptUrl}>
              <Button variant="ghost" size="sm">
                Receipt
              </Button>
            </ReceiptViewer>
          )}
          {item.licenseUrl && (
            <Button variant="ghost" size="sm" asChild>
              <a href={item.licenseUrl} target="_blank" rel="noopener noreferrer">
                License
              </a>
            </Button>
          )}
          <Button
            size="sm"
            variant={item.canDownload ? "default" : "outline"}
            disabled={item.canDownload && !item.downloadSourcePath}
            onClick={() => onDownload(item)}
          >
            <Download className="mr-2 h-4 w-4" />
            {item.canDownload ? "Download" : "Request support"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default LibraryPage;
