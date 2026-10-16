import type { SavedContentItem } from './mobileTypes';

// Display evidence only. These fields never authorise access or change order state.
export type LibraryOwnershipDisplayItem = SavedContentItem & {
  ownershipStatus?: unknown;
  ownershipExpiresAt?: unknown;
};

const CONFIRMED_STATUSES: Partial<Record<SavedContentItem['source'], readonly string[]>> = {
  release_purchases: ['completed', 'paid'],
  sample_pack_purchases: ['paid'],
  purchases: ['completed', 'paid', 'active'],
  licensing_contracts: ['completed', 'paid', 'active'],
  fan_subscriptions: ['active'],
  external_checkout_sessions: ['completed'],
  orders: ['completed', 'paid'],
};

function rawStatus(item: LibraryOwnershipDisplayItem): string | null {
  return typeof item.ownershipStatus === 'string' && item.ownershipStatus.trim()
    ? item.ownershipStatus.trim().toLowerCase()
    : null;
}

function expiryState(item: LibraryOwnershipDisplayItem, now: number): 'current' | 'expired' | 'unknown' {
  if (item.ownershipExpiresAt == null) return 'current';
  if (typeof item.ownershipExpiresAt !== 'string') return 'unknown';
  const expiresAt = Date.parse(item.ownershipExpiresAt);
  if (!Number.isFinite(expiresAt)) return 'unknown';
  return expiresAt <= now ? 'expired' : 'current';
}

export function isLibraryOwnershipConfirmed(item: LibraryOwnershipDisplayItem, now: number): boolean {
  const status = rawStatus(item);
  const confirmed = Object.prototype.hasOwnProperty.call(CONFIRMED_STATUSES, item.source)
    ? CONFIRMED_STATUSES[item.source]
    : undefined;
  return status !== null
    && (confirmed?.includes(status) ?? false)
    && expiryState(item, now) === 'current';
}

export function libraryHistoryStatus(item: LibraryOwnershipDisplayItem, now: number): string {
  const status = rawStatus(item);
  const labels: Record<string, string> = {
    pending: 'Pending', processing: 'Processing', failed: 'Failed', refunded: 'Refunded',
    expired: 'Expired', revoked: 'Revoked', terminated: 'Ended',
    cancelled: 'Cancelled', canceled: 'Cancelled',
  };
  const label = status ? labels[status] : undefined;
  if (typeof label === 'string') return label;
  if (expiryState(item, now) === 'expired') return 'Expired';
  if (status === 'signed') return 'Signed · access not confirmed';
  return 'Access not confirmed';
}

export function projectLibraryOwnership(items: readonly LibraryOwnershipDisplayItem[], now: number) {
  const unique = new Map<string, LibraryOwnershipDisplayItem>();
  for (const item of items) {
    const key = `${item.source}:${item.id}`;
    const previous = unique.get(key);
    // Conflicting duplicate states cannot turn an uncertain item into ownership.
    if (!previous || (isLibraryOwnershipConfirmed(previous, now) && !isLibraryOwnershipConfirmed(item, now))) {
      unique.set(key, item);
    }
  }
  const owned: LibraryOwnershipDisplayItem[] = [];
  const history: LibraryOwnershipDisplayItem[] = [];
  for (const item of unique.values()) {
    (isLibraryOwnershipConfirmed(item, now) ? owned : history).push(item);
  }
  return { owned, history };
}
