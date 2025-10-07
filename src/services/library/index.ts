import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

export type LibraryItemType = "beat" | "release" | "sample_pack" | "membership" | "course";

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
  licenseUrl?: string | null;
  receiptUrl?: string | null;
}

export interface LibraryFetchResult {
  items: LibraryItem[];
}

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
}

async function fetchDownloadEventCounts(userId: string) {
  const { data, error } = await supabase
    .from<DownloadEventRow>("download_events")
    .select("purchase_id, purchase_type")
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const key = `${row.purchase_type}:${row.purchase_id}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return counts;
}

function buildKey(type: LibraryItemType, id: string) {
  return `${type}:${id}`;
}

export async function fetchLibraryItems(userId: string): Promise<LibraryFetchResult> {
  const [downloadCounts, releaseRes, beatRes, packRes] = await Promise.all([
    fetchDownloadEventCounts(userId),
    supabase
      .from("release_purchases")
      .select(
        `id, amount_paid, purchased_at, download_expires_at, downloads_used, receipt_pdf_url, release_id,
         releases:release_id (id, title, artist, cover_art_url, genre, preview_url, download_url, download_limit, download_expires_days, user_id)`
      )
      .eq("user_id", userId)
      .order("purchased_at", { ascending: false }),
    supabase
      .from("purchases")
      .select(
        `id, amount, created_at, beat_id, license_pdf_url, license_type, stripe_payment_intent_id,
         beats:beat_id (id, title, producer_name, image_url, genre, audio_url, price, user_id)`
      )
      .eq("buyer_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("sample_pack_purchases")
      .select(
        `id, amount_paid, purchased_at, download_expires_at, download_url, sample_pack_id,
         sample_packs:sample_pack_id (id, title, cover_art_url, genre, demo_url, download_url, user_id)`
      )
      .eq("user_id", userId)
      .order("purchased_at", { ascending: false }),
  ]);

  if (releaseRes.error) {
    throw releaseRes.error;
  }
  if (beatRes.error) {
    throw beatRes.error;
  }
  if (packRes.error) {
    throw packRes.error;
  }

  const items: LibraryItem[] = [];

  for (const purchase of releaseRes.data ?? []) {
    const release = purchase.releases;
    if (!release) continue;
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
    const counted = downloadCounts.get(key) ?? used;

    items.push({
      id: purchase.id,
      type: "release",
      productId: release.id,
      title: release.title,
      creatorName: release.artist,
      artworkUrl: release.cover_art_url,
      genre: release.genre,
      purchaseDate: purchase.purchased_at,
      pricePaid: normalisePrice(purchase.amount_paid),
      downloadSourcePath: purchase.download_url || release.download_url,
      previewUrl: release.preview_url,
      canDownload: limit == null ? true : counted < limit,
      downloadCount: counted,
      maxDownloads: limit,
      downloadExpiresAt: toIsoString(downloadExpiresAt),
      licenseUrl: null,
      receiptUrl: purchase.receipt_pdf_url,
    });
  }

  for (const purchase of beatRes.data ?? []) {
    const beat = purchase.beats;
    if (!beat) continue;
    const key = buildKey("beat", purchase.id);
    const counted = downloadCounts.get(key) ?? 0;

    items.push({
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
      licenseUrl: purchase.license_pdf_url,
      receiptUrl: null,
    });
  }

  for (const purchase of packRes.data ?? []) {
    const pack = purchase.sample_packs;
    if (!pack) continue;
    const key = buildKey("sample_pack", purchase.id);
    const counted = downloadCounts.get(key) ?? 0;

    items.push({
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
      previewUrl: pack.preview_url ?? undefined,
      canDownload: counted < DEFAULT_SAMPLE_PACK_DOWNLOAD_LIMIT,
      downloadCount: counted,
      maxDownloads: DEFAULT_SAMPLE_PACK_DOWNLOAD_LIMIT,
      downloadExpiresAt: toIsoString(purchase.download_expires_at),
      licenseUrl: null,
      receiptUrl: null,
    });
  }

  // Additional types (memberships/courses) can be appended here when data sources are ready.

  items.sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());

  return { items };
}

export interface UseLibraryResult {
  items: LibraryItem[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useLibrary(userId?: string | null): UseLibraryResult {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(!!userId);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!userId) {
      setItems([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await fetchLibraryItems(userId);
      setItems(result.items);
    } catch (err: unknown) {
      console.error("Failed to load library", err);
      const message = err instanceof Error ? err.message : "Failed to load library";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return {
    items,
    loading,
    error,
    refresh: load,
  };
}
