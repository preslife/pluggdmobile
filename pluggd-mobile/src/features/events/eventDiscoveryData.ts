import { supabase } from '../../lib/supabase';
import type { EventItem } from '../../lib/mobileContent';

export const PUBLIC_EVENT_SELECT =
  'id,slug,title,description,cover_image_url,location,city,venue_id,lineup_headline,genre_tags,event_tags,starts_at,ends_at,price_cents,rsvp_count,ticket_url,commerce_classification,stream_url,playback_url,created_at,occurrence_status';

export type PublicEventItem = EventItem & {
  occurrence_status?: string | null;
  venue_name?: string | null;
  venue_address?: string | null;
  venue_city?: string | null;
  venue_postcode?: string | null;
  venue_country?: string | null;
  venue_latitude?: number | null;
  venue_longitude?: number | null;
};

type EventVenueRow = {
  id: string;
  name: string | null;
  address: string | null;
  city: string | null;
  postcode: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
};

async function attachEventVenues(events: PublicEventItem[]) {
  const venueIds = [...new Set(events.map((event) => event.venue_id).filter((id): id is string => Boolean(id)))];
  if (!venueIds.length) return events;
  const { data, error } = await (supabase as any)
    .from('venues')
    .select('id,name,address,city,postcode,country,latitude,longitude')
    .in('id', venueIds);
  if (error || !Array.isArray(data)) return events;
  const venues = new Map((data as EventVenueRow[]).map((venue) => [venue.id, venue]));
  return events.map((event) => {
    const venue = event.venue_id ? venues.get(event.venue_id) : null;
    return venue ? {
      ...event,
      venue_name: venue.name,
      venue_address: venue.address,
      venue_city: venue.city,
      venue_postcode: venue.postcode,
      venue_country: venue.country,
      venue_latitude: venue.latitude,
      venue_longitude: venue.longitude,
    } : event;
  });
}

export type PublicEventDiscoveryOptions = {
  pageSize?: number;
  /**
   * Optional UTC floor for a bounded historical campaign window. The caller
   * still owns the exact local-calendar membership check; this only makes
   * elapsed candidates available alongside the normal active collection.
   */
  includePastSince?: string | null;
  now?: Date;
};

export function activeEventWindowFilter(value = new Date().toISOString()) {
  return `ends_at.gte.${value},and(ends_at.is.null,starts_at.gte.${value})`;
}

export function pastEventWindowFilter(value = new Date().toISOString()) {
  return `ends_at.lt.${value},and(ends_at.is.null,starts_at.lt.${value})`;
}

export function isPublicActiveEvent(event: PublicEventItem, now = Date.now()) {
  const status = String(event.occurrence_status || 'scheduled').toLowerCase();
  if (status === 'cancelled' || status === 'canceled') return false;
  const boundary = event.ends_at || event.starts_at;
  if (!boundary) return false;
  const boundaryMs = new Date(boundary).getTime();
  return Number.isFinite(boundaryMs) && boundaryMs >= now;
}

/**
 * A stricter Home-only contract than "active": an event must be underway or
 * genuinely imminent. Admin curation can choose between eligible events, but
 * cannot make a future listing appear to be happening now.
 */
export function isHappeningNowEvent(event: PublicEventItem, now = Date.now()) {
  const status = String(event.occurrence_status || 'scheduled').toLowerCase();
  if (status === 'cancelled' || status === 'canceled' || status === 'ended' || status === 'completed') return false;

  const startsAt = event.starts_at ? new Date(event.starts_at).getTime() : Number.NaN;
  const endsAt = event.ends_at ? new Date(event.ends_at).getTime() : Number.NaN;
  if (!Number.isFinite(startsAt)) return false;
  if (Number.isFinite(endsAt) && endsAt < now) return false;

  const explicitlyLive = ['live', 'in_progress', 'in-progress', 'underway', 'happening_now'].includes(status);
  if (explicitlyLive) return true;

  const imminentWindowMs = 3 * 60 * 60 * 1000;
  if (startsAt > now) return startsAt - now <= imminentWindowMs;

  // Some imported events have no end time. Keep them current only for a
  // bounded six-hour road window instead of leaving them live indefinitely.
  return Number.isFinite(endsAt) ? endsAt >= now : now - startsAt <= 6 * 60 * 60 * 1000;
}

/**
 * Loads the complete public live/upcoming event layer in bounded pages.
 * The explicit pagination avoids PostgREST's default row cap while keeping
 * each request small enough for mobile networks.
 */
async function loadPublicEventPages(
  pageSize: number,
  buildQuery: (from: number, to: number) => PromiseLike<{ data: unknown; error: unknown }>,
) {
  const rows: PublicEventItem[] = [];

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await buildQuery(from, from + pageSize - 1);

    if (error) throw error;
    const page = (data ?? []) as PublicEventItem[];
    rows.push(...page);
    if (page.length < pageSize) break;
  }

  return rows;
}

export async function loadPublicEventDiscovery(
  options: PublicEventDiscoveryOptions = {},
): Promise<PublicEventItem[]> {
  const pageSize = options.pageSize ?? 200;
  const now = options.now ?? new Date();
  const boundary = now.toISOString();
  const activeRows = await loadPublicEventPages(pageSize, (from, to) =>
    (supabase as any)
      .from('events')
      .select(PUBLIC_EVENT_SELECT)
      .eq('discoverable', true)
      .or(activeEventWindowFilter(boundary))
      .order('starts_at', { ascending: true })
      .range(from, to),
  );
  const includePastSince = options.includePastSince?.trim() || null;
  const pastRows = includePastSince
    ? await loadPublicEventPages(pageSize, (from, to) =>
        (supabase as any)
          .from('events')
          .select(PUBLIC_EVENT_SELECT)
          .eq('discoverable', true)
          .gte('starts_at', includePastSince)
          .or(pastEventWindowFilter(boundary))
          .order('starts_at', { ascending: true })
          .range(from, to),
      )
    : [];

  const unique = new Map<string, PublicEventItem>();
  const pastFloorMs = includePastSince ? new Date(includePastSince).getTime() : Number.NaN;
  [...activeRows, ...pastRows]
    .filter((event) => {
      if (isPublicActiveEvent(event, now.getTime())) return true;
      const status = String(event.occurrence_status || 'scheduled').toLowerCase();
      if (status === 'cancelled' || status === 'canceled' || !Number.isFinite(pastFloorMs)) return false;
      const startMs = new Date(event.starts_at || 0).getTime();
      return Number.isFinite(startMs) && startMs >= pastFloorMs;
    })
    .forEach((event) => unique.set(event.id, event));
  const sorted = [...unique.values()].sort(
    (a, b) => new Date(a.starts_at || 0).getTime() - new Date(b.starts_at || 0).getTime(),
  );
  return attachEventVenues(sorted);
}

export async function loadPublicActiveEvents(pageSize = 200): Promise<PublicEventItem[]> {
  return loadPublicEventDiscovery({ pageSize });
}
