import type { ComponentType } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Music, ShoppingBag, Sparkles, Swords } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const PAGE_SIZE = 10;

type ActivityRow = Database["public"]["Tables"]["activity_feed"]["Row"];
type ActivityCategory = "release" | "battle" | "merch" | "other";

type ActivityFeedItem = {
  id: string;
  type: ActivityCategory;
  title: string;
  description?: string;
  createdAt: string;
  cta?: {
    label: string;
    href: string;
  };
};

const iconByType: Record<ActivityCategory, ComponentType<{ className?: string }>> = {
  release: Music,
  battle: Swords,
  merch: ShoppingBag,
  other: Sparkles,
};

const defaultCtaLabel: Record<ActivityCategory, string | undefined> = {
  release: "Listen now",
  battle: "Join battle",
  merch: "Shop now",
  other: undefined,
};

const getEntityHref = (type: ActivityCategory, id: string) => {
  switch (type) {
    case "release":
      return `/releases/${id}`;
    case "battle":
      return `/battles/${id}`;
    case "merch":
      return `/merch/${id}`;
    default:
      return undefined;
  }
};

const mapActivityRowToFeedItem = (row: ActivityRow): ActivityFeedItem => {
  const metadata = (row.data as Record<string, any> | null) ?? {};
  const entityType = (row.entity_type ?? metadata.entity_type ?? row.type ?? "").toLowerCase();
  const type: ActivityCategory = entityType.includes("release")
    ? "release"
    : entityType.includes("battle")
    ? "battle"
    : entityType.includes("merch")
    ? "merch"
    : "other";

  const fallbackTitle =
    type === "release"
      ? `New release${metadata.title ? `: ${metadata.title}` : ""}`
      : type === "battle"
      ? `New battle${metadata.title ? `: ${metadata.title}` : ""}`
      : type === "merch"
      ? `New merch drop${metadata.title ? `: ${metadata.title}` : ""}`
      : metadata.title ?? "New activity";

  const title = metadata.title ?? metadata.headline ?? fallbackTitle;
  const description = metadata.description ?? metadata.summary ?? metadata.subtitle ?? undefined;

  let ctaHref = metadata.cta_url ?? metadata.url ?? metadata.link ?? undefined;
  const ctaLabel = metadata.cta_label ?? metadata.ctaLabel ?? defaultCtaLabel[type];

  if (!ctaHref && row.entity_id) {
    ctaHref = getEntityHref(type, row.entity_id);
  }

  return {
    id: row.id,
    type,
    title,
    description,
    createdAt: row.created_at,
    cta: ctaHref && ctaLabel ? { label: ctaLabel, href: ctaHref } : undefined,
  };
};

const generateId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return Math.random().toString(36).slice(2);
};

const buildReleaseFeedItem = (payload: Record<string, any>): ActivityFeedItem => {
  const href =
    payload.preview_url ||
    payload.spotify_url ||
    payload.apple_music_url ||
    (payload.smartlink_slug ? `/releases/${payload.smartlink_slug}` : undefined) ||
    (payload.id ? `/releases/${payload.id}` : undefined);

  return {
    id: `release-${payload.id ?? generateId()}`,
    type: "release",
    title: payload.title ? `New release: ${payload.title}` : "New release available",
    description: payload.description ?? undefined,
    createdAt: payload.created_at ?? new Date().toISOString(),
    cta: href ? { label: defaultCtaLabel.release!, href } : undefined,
  };
};

const buildBattleFeedItem = (payload: Record<string, any>): ActivityFeedItem => {
  const href = payload.id ? `/battles/${payload.id}` : undefined;
  const status = payload.status ? payload.status.replace(/_/g, " ") : undefined;

  return {
    id: `battle-${payload.id ?? generateId()}`,
    type: "battle",
    title: payload.title ? `New battle: ${payload.title}` : "New battle announced",
    description: status ? `Status: ${status}` : undefined,
    createdAt: payload.created_at ?? new Date().toISOString(),
    cta: href ? { label: defaultCtaLabel.battle!, href } : undefined,
  };
};

const formatMerchDescription = (payload: Record<string, any>) => {
  const { price, description } = payload;

  if (typeof price === "number") {
    const formatted = price >= 1 ? `$${price.toFixed(2)}` : `$${price}`;
    return `Starting at ${formatted}`;
  }

  if (typeof price === "string" && price.trim().length > 0) {
    return `Starting at ${price}`;
  }

  return description ?? undefined;
};

const buildMerchFeedItem = (payload: Record<string, any>): ActivityFeedItem => {
  const href = payload.id ? `/merch/${payload.id}` : undefined;

  return {
    id: `merch-${payload.id ?? generateId()}`,
    type: "merch",
    title: payload.title ? `New merch: ${payload.title}` : "New merch drop",
    description: formatMerchDescription(payload),
    createdAt: payload.created_at ?? new Date().toISOString(),
    cta: href ? { label: defaultCtaLabel.merch!, href } : undefined,
  };
};

interface ActivityTabProps {
  userId: string;
}

export const ActivityTab = ({ userId }: ActivityTabProps) => {
  const [items, setItems] = useState<ActivityFeedItem[]>([]);
  const [page, setPage] = useState(0);
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const sortedItems = useMemo(
    () =>
      [...items].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [items]
  );

  const loadPage = useCallback(
    async (pageToLoad: number, isInitial = false) => {
      if (!userId) return;

      setError(null);
      if (isInitial) {
        setIsInitialLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      const from = pageToLoad * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from("activity_feed")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) {
        console.error("Failed to load activity feed", error);
        setError("We couldn't load recent activity. Please try again later.");
      } else if (data) {
        const mapped = data.map(mapActivityRowToFeedItem);

        setItems((previous) => {
          if (pageToLoad === 0) {
            return mapped;
          }

          const existingIds = new Set(previous.map((item) => item.id));
          const merged = [...previous];

          for (const entry of mapped) {
            if (!existingIds.has(entry.id)) {
              merged.push(entry);
            }
          }

          return merged;
        });

        setHasMore(data.length === PAGE_SIZE);
        setPage(pageToLoad);
      }

      setIsInitialLoading(false);
      setIsLoadingMore(false);
    },
    [userId]
  );

  useEffect(() => {
    loadPage(0, true);
  }, [loadPage]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    const channel = supabase
      .channel(`storefront-activity-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "releases", filter: `user_id=eq.${userId}` },
        (payload) => {
          const newItem = buildReleaseFeedItem(payload.new ?? {});
          setItems((current) => [newItem, ...current]);
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "battles", filter: `created_by=eq.${userId}` },
        (payload) => {
          const newItem = buildBattleFeedItem(payload.new ?? {});
          setItems((current) => [newItem, ...current]);
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "creator_merchandise", filter: `user_id=eq.${userId}` },
        (payload) => {
          const newItem = buildMerchFeedItem(payload.new ?? {});
          setItems((current) => [newItem, ...current]);
        }
      );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const handleLoadMore = () => {
    if (isLoadingMore || !hasMore) return;
    const nextPage = page + 1;
    loadPage(nextPage, false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Real-time updates for releases, battles, and merch drops.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isInitialLoading ? (
          <div className="space-y-4" data-testid="activity-loading">
            {[...Array(3).keys()].map((key) => (
              <div className="flex items-start gap-4" key={key}>
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : sortedItems.length === 0 ? (
          <div className="text-center py-12 space-y-4">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground" />
            <div className="space-y-2">
              <p className="text-lg font-semibold">No activity yet</p>
              <p className="text-muted-foreground">
                Share a release, launch a merch drop, or host a battle to start building momentum.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {sortedItems.map((item) => {
              const Icon = iconByType[item.type];
              return (
                <div
                  key={item.id}
                  className="flex items-start gap-4 rounded-lg border p-4 hover:border-primary/40 transition"
                  data-testid="activity-item"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div>
                      <p className="font-semibold">{item.title}</p>
                      {item.description && (
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span>{formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}</span>
                      {item.cta && (
                        <Button size="sm" variant="outline" asChild>
                          <a href={item.cta.href} target="_blank" rel="noreferrer">
                            {item.cta.label}
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {hasMore && (
              <div className="text-center">
                <Button onClick={handleLoadMore} disabled={isLoadingMore} variant="ghost">
                  {isLoadingMore ? "Loading more..." : "Load more activity"}
                </Button>
              </div>
            )}
          </div>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
};
