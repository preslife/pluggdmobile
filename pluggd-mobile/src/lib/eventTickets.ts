import * as WebBrowser from 'expo-web-browser';
import type { EventItem } from './mobileContent';
import { supabase } from './supabase';

const BLOCKED_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1']);

export function normalizeExternalTicketUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' || !url.hostname || url.username || url.password) return null;
    if (BLOCKED_HOSTS.has(url.hostname.toLowerCase())) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function hasEligibleExternalTickets(
  event: Pick<EventItem, 'ticket_url' | 'commerce_classification' | 'stream_url' | 'playback_url'>,
): boolean {
  return event.commerce_classification === 'physical'
    && !event.stream_url
    && !event.playback_url
    && Boolean(normalizeExternalTicketUrl(event.ticket_url));
}

export function externalTicketProvider(value: string | null | undefined): string | null {
  const normalized = normalizeExternalTicketUrl(value);
  if (!normalized) return null;
  const host = new URL(normalized).hostname.replace(/^www\./i, '').toLowerCase();
  const known: Array<[RegExp, string]> = [
    [/ticketmaster\./, 'Ticketmaster'],
    [/eventbrite\./, 'Eventbrite'],
    [/(^|\.)ra\.co$/, 'Resident Advisor'],
    [/skiddle\./, 'Skiddle'],
    [/dice\.fm$/, 'DICE'],
    [/axs\./, 'AXS'],
    [/shoobs\./, 'Shoobs'],
  ];
  return known.find(([pattern]) => pattern.test(host))?.[1]
    ?? host.split('.').slice(0, -1).join('.').replace(/(^|[-_])\w/g, (match) => match.toUpperCase())
    ?? 'ticket partner';
}

export function eventTicketPriceLabel(
  event: Pick<EventItem, 'price_cents' | 'ticket_url' | 'commerce_classification' | 'stream_url' | 'playback_url'>,
): string {
  const price = Number(event.price_cents ?? 0);
  if (price > 0) {
    const formatted = new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: price % 100 === 0 ? 0 : 2,
    }).format(price / 100);
    return hasEligibleExternalTickets(event) ? `From ${formatted}` : formatted;
  }
  return hasEligibleExternalTickets(event) ? 'See ticket site' : 'Free';
}

export async function trackExternalTicketOpen(input: {
  eventId: string;
  eventTitle?: string | null;
  destinationUrl: string;
  sourceSurface: string;
}) {
  const { data: auth } = await supabase.auth.getUser();
  await (supabase as any).from('analytics_events').insert({
    user_id: auth.user?.id ?? null,
    event_name: 'event_ticket_link_clicked',
    properties: {
      event_id: input.eventId,
      event_title: input.eventTitle ?? null,
      destination_url: input.destinationUrl,
      source_surface: input.sourceSurface,
      platform: 'ios',
    },
  });
}

export async function openExternalEventTickets(input: {
  eventId: string;
  eventTitle?: string | null;
  ticketUrl: string | null | undefined;
  sourceSurface: string;
}): Promise<boolean> {
  const url = normalizeExternalTicketUrl(input.ticketUrl);
  if (!url) return false;

  void trackExternalTicketOpen({
    eventId: input.eventId,
    eventTitle: input.eventTitle,
    destinationUrl: url,
    sourceSurface: input.sourceSurface,
  }).catch(() => undefined);

  await WebBrowser.openBrowserAsync(url, {
    controlsColor: '#ff6600',
    dismissButtonStyle: 'close',
    presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
  });
  // Closing the in-app browser is a normal end to a successful handoff.
  return true;
}
