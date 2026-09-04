import * as WebBrowser from 'expo-web-browser';
import type { EventItem } from './mobileContent';
import { supabase } from './supabase';

const BLOCKED_HOSTS = new Set(['localhost', 'local', '0.0.0.0', '::', '::1']);
const BLOCKED_HOST_SUFFIXES = ['.localhost', '.local', '.internal', '.home.arpa'];

function isBlockedIpv4(host: string): boolean {
  const octets = host.split('.');
  if (octets.length !== 4 || octets.some((part) => !/^\d{1,3}$/.test(part))) return false;
  const values = octets.map(Number);
  if (values.some((part) => part > 255)) return true;
  const [first, second, third] = values;
  return first === 0
    || first === 10
    || first === 127
    || (first === 100 && second >= 64 && second <= 127)
    || (first === 169 && second === 254)
    || (first === 172 && second >= 16 && second <= 31)
    || (first === 192 && second === 0 && (third === 0 || third === 2))
    || (first === 192 && second === 168)
    || (first === 198 && (second === 18 || second === 19 || (second === 51 && third === 100)))
    || (first === 203 && second === 0 && third === 113)
    || first >= 224;
}

function isBlockedTicketHost(value: string): boolean {
  const host = value.toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');
  if (!host || BLOCKED_HOSTS.has(host) || BLOCKED_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix))) return true;
  if (isBlockedIpv4(host)) return true;
  if (!host.includes(':')) return false;

  const mappedIpv4 = host.match(/^(?:::ffff:)(\d+\.\d+\.\d+\.\d+)$/)?.[1];
  if (mappedIpv4) return isBlockedIpv4(mappedIpv4);
  return host === '::'
    || host === '::1'
    || /^(?:fc|fd)/.test(host)
    || /^fe[89ab]/.test(host);
}

export function normalizeExternalTicketUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' || !url.hostname || url.username || url.password) return null;
    if (isBlockedTicketHost(url.hostname)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function hasEligibleExternalTickets(
  event: Pick<EventItem, 'ticket_url' | 'commerce_classification' | 'stream_url' | 'playback_url'>,
): boolean {
  const classification = event.commerce_classification;
  const realWorldTicket = classification === 'physical'
    || classification === 'unclassified'
    || classification == null;

  return realWorldTicket
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
    [/seetickets\./, 'See Tickets'],
    [/eventim\./, 'Eventim'],
    [/fatsoma\./, 'Fatsoma'],
    [/outsavvy\./, 'OutSavvy'],
    [/gigantic\./, 'Gigantic'],
    [/luma\.com$/, 'Luma'],
    [/berghain\./, 'Berghain'],
    [/berlinerfestspiele\./, 'Berliner Festspiele'],
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
