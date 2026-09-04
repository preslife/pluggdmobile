export type LiveGiftCatalogItem = {
  id: string;
  slug: string;
  label: string;
  credit_cost: number;
  description?: string | null;
  thumbnail_url?: string | null;
  animation_url?: string | null;
};

export type LiveGiftEvent = {
  id: string;
  room_id: string;
  gift_id: string | null;
  sender_id: string;
  quantity: number;
  total_credits: number;
  animation_variant?: string | null;
  message?: string | null;
  created_at: string;
  gift: LiveGiftCatalogItem | null;
};

export type LiveGiftSenderProfile = {
  full_name?: string | null;
  username?: string | null;
};

type SupabaseLikeError = {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
};

function nonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function positiveInteger(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.max(1, Math.floor(parsed)) : fallback;
}

function nonNegativeInteger(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 0;
}

export function normalizeLiveGiftCatalogItem(row: unknown): LiveGiftCatalogItem | null {
  if (!row || typeof row !== 'object') return null;
  const value = row as Record<string, unknown>;
  const id = nonEmptyString(value.id);
  if (!id) return null;

  return {
    id,
    slug: nonEmptyString(value.slug) ?? 'gift',
    label: nonEmptyString(value.label) ?? 'Live gift',
    credit_cost: nonNegativeInteger(value.credit_cost),
    description: nonEmptyString(value.description),
    thumbnail_url: nonEmptyString(value.thumbnail_url),
    animation_url: nonEmptyString(value.animation_url),
  };
}

export function liveGiftCatalogLookup(
  catalog: readonly LiveGiftCatalogItem[],
): Map<string, LiveGiftCatalogItem> {
  return new Map(catalog.map((gift) => [gift.id, gift]));
}

export function normalizeLiveGiftEvent(
  row: unknown,
  catalogById: ReadonlyMap<string, LiveGiftCatalogItem>,
  fallbackGift?: LiveGiftCatalogItem | null,
): LiveGiftEvent | null {
  if (!row || typeof row !== 'object') return null;
  const value = row as Record<string, unknown>;
  const id = nonEmptyString(value.id);
  const roomId = nonEmptyString(value.room_id);
  const senderId = nonEmptyString(value.sender_id);
  if (!id || !roomId || !senderId) return null;

  const embeddedGift = normalizeLiveGiftCatalogItem(value.live_gift_catalog ?? value.gift);
  const giftId = nonEmptyString(value.gift_id) ?? embeddedGift?.id ?? fallbackGift?.id ?? null;
  const gift = embeddedGift ?? (giftId ? catalogById.get(giftId) ?? null : null) ?? fallbackGift ?? null;

  return {
    id,
    room_id: roomId,
    gift_id: giftId,
    sender_id: senderId,
    quantity: positiveInteger(value.quantity, 1),
    total_credits: nonNegativeInteger(value.total_credits),
    animation_variant: nonEmptyString(value.animation_variant),
    message: nonEmptyString(value.message),
    created_at: nonEmptyString(value.created_at) ?? new Date(0).toISOString(),
    gift,
  };
}

export function safeGiftAssetUrl(value?: string | null): string | null {
  const candidate = nonEmptyString(value);
  if (!candidate || candidate.length > 2048 || !/^https:\/\/[^\s]+$/i.test(candidate)) return null;
  return candidate;
}

export function liveGiftSenderName(
  event: LiveGiftEvent,
  currentUserId: string | null | undefined,
  profilesById: Readonly<Record<string, LiveGiftSenderProfile | undefined>>,
): string {
  if (currentUserId && event.sender_id === currentUserId) return 'You';
  const profile = profilesById[event.sender_id];
  return nonEmptyString(profile?.full_name) ?? nonEmptyString(profile?.username) ?? 'A supporter';
}

export function isGiftCatalogRpcUnavailable(error: SupabaseLikeError | null | undefined): boolean {
  if (!error) return false;
  if (error.code === '42883' || error.code === 'PGRST202') return true;
  const detail = [error.message, error.details, error.hint].filter(Boolean).join(' ');
  return /get_live_room_gift_catalog[\s\S]*(?:schema cache|could not find|does not exist|undefined function)/i.test(detail)
    || /(?:schema cache|could not find|does not exist|undefined function)[\s\S]*get_live_room_gift_catalog/i.test(detail);
}
