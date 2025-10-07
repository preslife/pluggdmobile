import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

export type LibraryItemType = "beat" | "release" | "sample_pack" | "membership" | "course" | "campaign";

export interface LibraryItem {
  id: string; // purchase id
  type: LibraryItemType;
  productId: string;
  title: string;
  creatorName: string | null;
  artworkUrl?: string | null;
  tags?: string[] | null;
  genre?: string | null;
  purchaseDate: string;
  pricePaid: number;
  downloadSourcePath?: string | null;
  previewUrl?: string | null;
  canDownload: boolean;
  downloadCount: number;
  maxDownloads: number | null;
  downloadExpiresAt?: string | null;
  lastDownloadedAt?: string | null;
  licenseUrl?: string | null;
  receiptUrl?: string | null;
}

export interface LibraryFetchResult {
  items: LibraryItem[];
  byType: Record<LibraryItemType, LibraryItem[]>;
}

export interface FetchLibraryItemsOptions {
  types?: LibraryItemType[];
}

const LIBRARY_ITEM_TYPES: LibraryItemType[] = ["release", "beat", "sample_pack", "membership", "course", "campaign"];

const DEFAULT_RELEASE_DOWNLOAD_LIMIT = 3;
const DEFAULT_BEAT_DOWNLOAD_LIMIT = 5;
const DEFAULT_SAMPLE_PACK_DOWNLOAD_LIMIT = 3;

const toIsoString = (value: string | null | undefined) => (value ? new Date(value).toISOString() : null);

function normalisePrice(value: number | null | undefined): number {
  if (value == null) return 0;
  return Number.isFinite(value) ? value : 0;
}

interface DownloadEventRow {
  purchase_id: string;
  purchase_type: string;
  created_at: string | null;
}

interface DownloadEventMeta {
  count: number;
  lastDownloadedAt: string | null;
}

async function fetchDownloadEventCounts(userId: string) {
  const { data, error } = await supabase
    .from<DownloadEventRow>("download_events")
    .select("purchase_id, purchase_type, created_at")
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  const counts = new Map<string, DownloadEventMeta>();
  for (const row of data ?? []) {
    const key = `${row.purchase_type}:${row.purchase_id}`;
    const existing = counts.get(key);
    const createdAt = row.created_at ? new Date(row.created_at).toISOString() : null;
    if (!existing) {
      counts.set(key, { count: 1, lastDownloadedAt: createdAt });
    } else {
      const lastDownloadedAt = existing.lastDownloadedAt;
      counts.set(key, {
        count: existing.count + 1,
        lastDownloadedAt:
          createdAt && (!lastDownloadedAt || new Date(createdAt).getTime() > new Date(lastDownloadedAt).getTime())
            ? createdAt
            : lastDownloadedAt,
      });
    }
  }

  return counts;
}

function buildKey(type: LibraryItemType, id: string) {
  return `${type}:${id}`;
}

export async function fetchLibraryItems(userId: string, options: FetchLibraryItemsOptions = {}): Promise<LibraryFetchResult> {
  const requestedTypes = options.types && options.types.length > 0 ? options.types : LIBRARY_ITEM_TYPES;
  const typeSet = new Set<LibraryItemType>(requestedTypes);

  const needsDownloadCounts = requestedTypes.some((type) =>
    ["release", "beat", "sample_pack", "course"].includes(type),
  );

  const supabaseClient = supabase as unknown as {
    from: (table: string) => any;
  };

  const promises: Array<Promise<any>> = [];

  const downloadCountsPromise = needsDownloadCounts ? fetchDownloadEventCounts(userId) : Promise.resolve(new Map());
  promises.push(downloadCountsPromise);

  const releasePromise = typeSet.has("release")
    ? supabase
        .from("release_purchases")
        .select(
          `id, amount_paid, purchased_at, paid_at, status, download_expires_at, downloads_used, receipt_pdf_url, release_id,
           releases:release_id (id, title, artist, cover_art_url, genre, preview_url, download_limit, download_expires_days, user_id)`
        )
        .eq("user_id", userId)
        .eq("status", "completed")
        .order("purchased_at", { ascending: false })
    : Promise.resolve({ data: null, error: null });
  promises.push(releasePromise);

  const beatPromise = typeSet.has("beat")
    ? supabase
        .from("purchases")
        .select(
          `id, amount, created_at, beat_id, license_pdf_url, license_type, stripe_payment_intent_id,
           beats:beat_id (id, title, producer_name, image_url, genre, audio_url, price, user_id)`
        )
        .eq("buyer_id", userId)
        .order("created_at", { ascending: false })
    : Promise.resolve({ data: null, error: null });
  promises.push(beatPromise);

  const packPromise = typeSet.has("sample_pack")
    ? supabase
        .from("sample_pack_purchases")
        .select(
          `id, amount_paid, purchased_at, download_expires_at, download_url, sample_pack_id,
           sample_packs:sample_pack_id (id, title, cover_art_url, genre, preview_url:demo_url, download_url, user_id)`
        )
        .eq("user_id", userId)
        .order("purchased_at", { ascending: false })
    : Promise.resolve({ data: null, error: null });
  promises.push(packPromise);

  const membershipPromise = typeSet.has("membership")
    ? supabaseClient
        .from("memberships")
        .select(
          `id, tier_id, started_at, created_at, current_period_end, support_amount, status, user_id, metadata, receipt_url,
           membership_tiers:tier_id (id, name, image_url, price_monthly, price_yearly, price_lifetime, currency, owner_id, owner_type, slug)`
        )
        .eq("user_id", userId)
        .order("started_at", { ascending: false })
    : Promise.resolve({ data: null, error: null });
  promises.push(membershipPromise);

  const coursePromise = typeSet.has("course")
    ? supabaseClient
        .from("enrollments")
        .select(
          `id, course_id, created_at, progress, last_accessed_at, amount_paid, user_id, receipt_url,
           courses:course_id (id, title, thumbnail_url, price, instructor_id, tags, description),
           lessons:course_id (id, course_id, title, download_url, resource_url, updated_at, order_position)`
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
    : Promise.resolve({ data: null, error: null });
  promises.push(coursePromise);

  const campaignPromise = typeSet.has("campaign")
    ? supabaseClient
        .from("campaign_supporters")
        .select(
          `id, campaign_id, user_id, amount, currency, created_at, updated_at, reward_tier, receipt_url,
           campaigns:campaign_id (id, title, slug, cover_url, owner_id, goal, raised, ends_at)`
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
    : Promise.resolve({ data: null, error: null });
  promises.push(campaignPromise);

  const [
    downloadCounts,
    releaseRes,
    beatRes,
    packRes,
    membershipRes,
    courseRes,
    campaignRes,
  ] = await Promise.all(promises);

  if (releaseRes.error) {
    throw releaseRes.error;
  }
  if (beatRes.error) {
    throw beatRes.error;
  }
  if (packRes.error) {
    throw packRes.error;
  }
  if (membershipRes.error) {
    throw membershipRes.error;
  }
  if (courseRes.error) {
    throw courseRes.error;
  }
  if (campaignRes.error) {
    throw campaignRes.error;
  }

  const itemsByType: Record<LibraryItemType, LibraryItem[]> = {
    release: [],
    beat: [],
    sample_pack: [],
    membership: [],
    course: [],
    campaign: [],
  };

  for (const purchase of releaseRes.data ?? []) {
    const release = purchase.releases;
    if (!release || purchase.status !== "completed") continue;
    const limit = release.download_limit ?? DEFAULT_RELEASE_DOWNLOAD_LIMIT;
    const used = purchase.downloads_used ?? 0;
    const downloadExpiresAt = purchase.download_expires_at
      ? purchase.download_expires_at
      : release.download_expires_days
      ? (() => {
          const purchasedAt = purchase.purchased_at ? new Date(purchase.purchased_at) : null;
          if (!purchasedAt) return null;
          purchasedAt.setDate(purchasedAt.getDate() + release.download_expires_days);
          return purchasedAt.toISOString();
        })()
      : null;

    const key = buildKey("release", purchase.id);
    const meta = (downloadCounts as Map<string, DownloadEventMeta>).get(key);
    const counted = meta?.count ?? used;

    itemsByType.release.push({
      id: purchase.id,
      type: "release",
      productId: release.id,
      title: release.title,
      creatorName: release.artist,
      artworkUrl: release.cover_art_url,
      genre: release.genre,
      purchaseDate: purchase.paid_at ?? purchase.purchased_at,
      pricePaid: normalisePrice(purchase.amount_paid),
      downloadSourcePath: null,
      previewUrl: release.preview_url,
      canDownload: limit == null ? true : counted < limit,
      downloadCount: counted,
      maxDownloads: limit,
      downloadExpiresAt: toIsoString(downloadExpiresAt),
      lastDownloadedAt: meta?.lastDownloadedAt ?? null,
      licenseUrl: null,
      receiptUrl: purchase.receipt_pdf_url,
    });
  }

  for (const purchase of beatRes.data ?? []) {
    const beat = purchase.beats;
    if (!beat) continue;
    const key = buildKey("beat", purchase.id);
    const meta = (downloadCounts as Map<string, DownloadEventMeta>).get(key);
    const counted = meta?.count ?? 0;

    itemsByType.beat.push({
      id: purchase.id,
      type: "beat",
      productId: beat.id,
      title: beat.title,
      creatorName: beat.producer_name,
      artworkUrl: beat.image_url,
      genre: beat.genre,
      purchaseDate: purchase.created_at,
      pricePaid: normalisePrice(purchase.amount),
      downloadSourcePath: beat.audio_url,
      previewUrl: beat.audio_url,
      canDownload: counted < DEFAULT_BEAT_DOWNLOAD_LIMIT,
      downloadCount: counted,
      maxDownloads: DEFAULT_BEAT_DOWNLOAD_LIMIT,
      downloadExpiresAt: null,
      lastDownloadedAt: meta?.lastDownloadedAt ?? null,
      licenseUrl: purchase.license_pdf_url,
      receiptUrl: null,
    });
  }

  for (const purchase of packRes.data ?? []) {
    const pack = purchase.sample_packs;
    if (!pack) continue;
    const key = buildKey("sample_pack", purchase.id);
    const meta = (downloadCounts as Map<string, DownloadEventMeta>).get(key);
    const counted = meta?.count ?? 0;

    itemsByType.sample_pack.push({
      id: purchase.id,
      type: "sample_pack",
      productId: pack.id,
      title: pack.title,
      creatorName: pack.user_id,
      artworkUrl: pack.cover_art_url,
      genre: pack.genre,
      purchaseDate: purchase.purchased_at,
      pricePaid: normalisePrice(purchase.amount_paid),
      downloadSourcePath: purchase.download_url || pack.download_url,
      previewUrl: pack.preview_url ?? pack.demo_url ?? null,
      canDownload: counted < DEFAULT_SAMPLE_PACK_DOWNLOAD_LIMIT,
      downloadCount: counted,
      maxDownloads: DEFAULT_SAMPLE_PACK_DOWNLOAD_LIMIT,
      downloadExpiresAt: toIsoString(purchase.download_expires_at),
      lastDownloadedAt: meta?.lastDownloadedAt ?? null,
      licenseUrl: null,
      receiptUrl: null,
    });
  }

  const memberships = membershipRes.data ?? [];
  if (memberships.length > 0) {
    const tierIds = Array.from(new Set(memberships.map((membership: any) => membership.tier_id).filter(Boolean)));
    let gatedPostsByTier: Map<string, any[]> = new Map();
    if (tierIds.length > 0) {
      const gatedPostsRes = await supabaseClient
        .from("gated_posts")
        .select(`id, tier_id, title, download_url, asset_url, updated_at, content_url`)
        .in("tier_id", tierIds);
      if (gatedPostsRes.error) {
        throw gatedPostsRes.error;
      }
      const grouped = new Map<string, any[]>();
      for (const post of gatedPostsRes.data ?? []) {
        const tierId = post.tier_id ?? "";
        if (!grouped.has(tierId)) {
          grouped.set(tierId, []);
        }
        grouped.get(tierId)!.push(post);
      }
      gatedPostsByTier = grouped;
    }

    for (const membership of memberships) {
      const tier = membership.membership_tiers;
      const tierId: string | null = membership.tier_id ?? null;
      const gatedPosts = tierId ? gatedPostsByTier.get(tierId) ?? [] : [];
      const downloadablePost = gatedPosts.find((post) => post.download_url || post.asset_url || post.content_url) ?? null;
      const downloadPath = downloadablePost?.download_url || downloadablePost?.asset_url || downloadablePost?.content_url || null;

      itemsByType.membership.push({
        id: membership.id,
        type: "membership",
        productId: tier?.id ?? tierId ?? membership.id,
        title: tier?.name ?? "Membership",
        creatorName: tier?.owner_id ?? null,
        artworkUrl: tier?.image_url ?? null,
        tags: tier?.slug ? [tier.slug] : null,
        genre: null,
        purchaseDate: membership.started_at ?? membership.created_at ?? new Date().toISOString(),
        pricePaid: normalisePrice(membership.support_amount ?? tier?.price_monthly ?? tier?.price_yearly ?? tier?.price_lifetime),
        downloadSourcePath: downloadPath,
        previewUrl: null,
        canDownload: !!downloadPath,
        downloadCount: 0,
        maxDownloads: null,
        downloadExpiresAt: membership.current_period_end ? toIsoString(membership.current_period_end) : null,
        lastDownloadedAt: null,
        licenseUrl: null,
        receiptUrl: membership.receipt_url ?? membership.metadata?.receipt_url ?? null,
      });
    }
  }

  for (const enrollment of courseRes.data ?? []) {
    const course = enrollment.courses;
    if (!course) continue;
    const lessons = Array.isArray(enrollment.lessons) ? enrollment.lessons : [];
    const downloadableLesson = lessons.find((lesson) => lesson?.download_url || lesson?.resource_url);
    const downloadPath = downloadableLesson?.download_url || downloadableLesson?.resource_url || null;
    const key = buildKey("course", enrollment.id);
    const meta = (downloadCounts as Map<string, DownloadEventMeta>).get(key);

    itemsByType.course.push({
      id: enrollment.id,
      type: "course",
      productId: course.id,
      title: course.title,
      creatorName: course.instructor_id ?? null,
      artworkUrl: course.thumbnail_url,
      tags: course.tags ?? null,
      genre: null,
      purchaseDate: enrollment.created_at ?? new Date().toISOString(),
      pricePaid: normalisePrice(enrollment.amount_paid ?? course.price ?? 0),
      downloadSourcePath: downloadPath,
      previewUrl: null,
      canDownload: !!downloadPath,
      downloadCount: meta?.count ?? 0,
      maxDownloads: null,
      downloadExpiresAt: null,
      lastDownloadedAt: meta?.lastDownloadedAt ?? null,
      licenseUrl: null,
      receiptUrl: enrollment.receipt_url ?? null,
    });
  }

  for (const supporter of campaignRes.data ?? []) {
    const campaign = supporter.campaigns;
    if (!campaign) continue;
    itemsByType.campaign.push({
      id: supporter.id,
      type: "campaign",
      productId: campaign.id,
      title: campaign.title,
      creatorName: campaign.owner_id ?? null,
      artworkUrl: campaign.cover_url ?? null,
      tags: campaign.slug ? [campaign.slug] : null,
      genre: null,
      purchaseDate: supporter.created_at ?? new Date().toISOString(),
      pricePaid: normalisePrice(supporter.amount ?? 0),
      downloadSourcePath: null,
      previewUrl: null,
      canDownload: false,
      downloadCount: 0,
      maxDownloads: null,
      downloadExpiresAt: null,
      lastDownloadedAt: null,
      licenseUrl: null,
      receiptUrl: supporter.receipt_url ?? null,
    });
  }

  const items = LIBRARY_ITEM_TYPES.filter((type) => typeSet.has(type)).flatMap((type) => itemsByType[type]);
  items.sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());

  return { items, byType: itemsByType };
}

export interface UseLibraryResult {
  items: LibraryItem[];
  itemsByType: Record<LibraryItemType, LibraryItem[]>;
  loading: boolean;
  loadingByType: Record<LibraryItemType, boolean> & { all: boolean };
  error: string | null;
  ensureLoaded: (types?: LibraryItemType[] | "all") => Promise<void>;
  refresh: () => Promise<void>;
}

const emptyItemsByType = (): Record<LibraryItemType, LibraryItem[]> => ({
  release: [],
  beat: [],
  sample_pack: [],
  membership: [],
  course: [],
  campaign: [],
});

export function useLibrary(userId?: string | null): UseLibraryResult {
  const [itemsByType, setItemsByType] = useState<Record<LibraryItemType, LibraryItem[]>>(emptyItemsByType);
  const [loadedTypes, setLoadedTypes] = useState<Set<LibraryItemType>>(new Set());
  const [loadingTypes, setLoadingTypes] = useState<Set<LibraryItemType | "all">>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setItemsByType(emptyItemsByType());
    setLoadedTypes(new Set());
    setLoadingTypes(new Set());
    setError(null);
  }, [userId]);

  const ensureLoaded = async (types: LibraryItemType[] | "all" = "all") => {
    if (!userId) {
      setItemsByType(emptyItemsByType());
      setLoadedTypes(new Set());
      setLoadingTypes(new Set());
      setError(null);
      return;
    }

    const requestTypes = types === "all" ? LIBRARY_ITEM_TYPES : types;
    const toFetch = requestTypes.filter((type) => types === "all" || !loadedTypes.has(type));
    if (toFetch.length === 0 && types !== "all") {
      return;
    }

    setLoadingTypes((current) => new Set([...current, ...(types === "all" ? ["all"] : toFetch)]));
    setError(null);

    try {
      const result = await fetchLibraryItems(userId, { types: types === "all" ? LIBRARY_ITEM_TYPES : toFetch });
      setItemsByType((prev) => {
        const next = { ...prev } as Record<LibraryItemType, LibraryItem[]>;
        for (const type of LIBRARY_ITEM_TYPES) {
          if (types === "all" || toFetch.includes(type)) {
            next[type] = result.byType[type] ?? [];
          }
        }
        return next;
      });
      setLoadedTypes((prev) => {
        const next = new Set(prev);
        if (types === "all") {
          for (const type of LIBRARY_ITEM_TYPES) {
            next.add(type);
          }
        } else {
          for (const type of toFetch) {
            next.add(type);
          }
        }
        return next;
      });
    } catch (err: unknown) {
      console.error("Failed to load library", err);
      const message = err instanceof Error ? err.message : "Failed to load library";
      setError(message);
    } finally {
      setLoadingTypes((current) => {
        const next = new Set(current);
        if (types === "all") {
          next.delete("all");
        }
        for (const type of requestTypes) {
          next.delete(type);
        }
        return next;
      });
    }
  };

  useEffect(() => {
    if (userId) {
      ensureLoaded("all");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const items = LIBRARY_ITEM_TYPES.flatMap((type) => itemsByType[type]);

  const loadingByType = LIBRARY_ITEM_TYPES.reduce(
    (acc, type) => {
      acc[type] = loadingTypes.has(type);
      return acc;
    },
    { all: loadingTypes.has("all") } as Record<LibraryItemType, boolean> & { all: boolean },
  );
  loadingByType.all = loadingTypes.has("all");

  return {
    items,
    itemsByType,
    loading: loadingTypes.size > 0,
    loadingByType,
    error,
    ensureLoaded,
    refresh: async () => {
      setLoadedTypes(new Set());
      await ensureLoaded("all");
    },
  };
}
