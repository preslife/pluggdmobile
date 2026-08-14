/**
 * Events — selected mobile discovery system: fast filters, one authored
 * spotlight, artwork-led event rails, compact date-led rows and honest
 * promoter/opportunity states.
 */
import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import {
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useBottomChromeInset } from '../../design/useBottomChromeInset';
import { PluggdImage } from '../../components/PluggdImage';
import { PremiumSkeleton } from '../../components/PremiumSkeleton';
import { EventsMap } from '../../../components/EventsMap';
import { ed, edFonts } from '../../design/editorial';
import { usePluggdTheme } from '../../design/usePluggdTheme';
import { geocodeMany, type EventMapPoint } from '../../lib/mapbox';
import { safeList } from '../culture/mobileServices';
import { supabase } from '../../lib/supabase';
import { formatGBP, type EventItem } from '../../lib/mobileContent';
import { eventTicketPriceLabel, externalTicketProvider, hasEligibleExternalTickets, openExternalEventTickets } from '../../lib/eventTickets';
import { Enter, EdPressable } from './EditorialBits';
import { DiscoveryHeader } from '../discovery/DiscoveryHeader';
import { isCarnivalCampaignActive, loadCarnivalHub } from '../carnival/carnivalService';
import { WEB_PARITY_ASSETS } from '../parity/webAssets';

const CATEGORY_CHIPS = ['All events', 'Live Music', 'Culture', 'Meet-ups', 'Festivals', 'Clubbing', 'Comedy'] as const;

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Live Music': ['live', 'tour', 'concert', 'band', 'quartet', 'acoustic', 'session'],
  Culture: ['culture', 'showcase', 'exhibit', 'art', 'poetry', 'talk'],
  'Meet-ups': ['meet', 'network', 'social', 'brunch', 'link up'],
  Festivals: ['festival', 'fest', 'carnival', 'day party'],
  Clubbing: ['club', 'rave', 'night', 'dj', 'afterparty', 'dance'],
  Comedy: ['comedy', 'stand-up', 'standup', 'improv'],
};

const TAG_KEYWORDS: Array<{ tag: string; words: string[] }> = [
  { tag: 'techno', words: ['techno'] },
  { tag: 'house', words: ['house'] },
  { tag: 'afrobeats', words: ['afro', 'afrobeats', 'afrowork'] },
  { tag: 'dancehall', words: ['dancehall', 'bashment'] },
  { tag: 'rock', words: ['rock', 'metal'] },
  { tag: 'rap', words: ['rap', 'hip-hop', 'hip hop'] },
  { tag: 'jazz', words: ['jazz'] },
  { tag: 'electronic', words: ['electronic', 'd&b', 'drum & bass', 'garage'] },
];

const MUSIC_SPOTLIGHT_KEYWORDS = [
  'live music',
  'concert',
  'gig',
  'showcase',
  'festival',
  'club',
  'rave',
  'dj',
  'band',
  'singer',
  'album',
  'release',
  'acoustic',
  'session',
  'techno',
  'house',
  'afro',
  'dancehall',
  'rock',
  'rap',
  'hip-hop',
  'jazz',
  'electronic',
  'garage',
  'drum & bass',
];

function eventText(event: EventItem) {
  return `${event.title || ''} ${event.description || ''}`.toLowerCase();
}

function musicSpotlightScore(event: EventItem) {
  const text = eventText(event);
  const musicSignals = MUSIC_SPOTLIGHT_KEYWORDS.reduce(
    (score, keyword) => score + (text.includes(keyword) ? 1 : 0),
    0,
  );
  return musicSignals * 10 + (event.cover_image_url ? 2 : 0) + (event.description ? 1 : 0);
}

function matchesCategory(event: EventItem, category: string) {
  if (category === 'All events') return true;
  const words = CATEGORY_KEYWORDS[category] || [];
  const text = eventText(event);
  return words.some((word) => text.includes(word));
}

function tagsFor(event: EventItem): string[] {
  const text = eventText(event);
  return TAG_KEYWORDS.filter(({ words }) => words.some((word) => text.includes(word)))
    .map(({ tag }) => tag)
    .slice(0, 3);
}

function startsWithin(event: EventItem, hours: number) {
  if (!event.starts_at) return false;
  const diff = new Date(event.starts_at).getTime() - Date.now();
  return diff > 0 && diff < hours * 3600000;
}

function venueLine(event: EventItem) {
  return (event.location || 'Venue TBA').split(',')[0].trim();
}

function cityLine(event: EventItem) {
  const parts = (event.location || '').split(',').map((part) => part.trim()).filter(Boolean);
  return parts.length > 1 ? parts[parts.length - 1] : parts[0] || 'Location TBA';
}

function fullDateLine(event: EventItem) {
  if (!event.starts_at) return 'Date TBA';
  const date = new Date(event.starts_at);
  return `${date.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}, ${date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
}

function DateBlock({ event, size = 44 }: { event: EventItem; size?: number }) {
  const starts = event.starts_at ? new Date(event.starts_at) : null;
  return (
    <View style={[styles.dateBlock, { width: size, height: size }]}>
      <Text style={[styles.dateBlockDay, size > 48 && { fontSize: 18 }]}>
        {starts ? starts.getDate().toString().padStart(2, '0') : '--'}
      </Text>
      <Text style={styles.dateBlockMonth}>
        {starts ? starts.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase() : 'TBA'}
      </Text>
    </View>
  );
}

function StatusChips({ event }: { event: EventItem }) {
  const soon = startsWithin(event, 72);
  const ticketed = hasEligibleExternalTickets(event) || Number(event.price_cents ?? 0) > 0;
  if (!soon && !ticketed) return null;
  return (
    <View style={styles.statusRow}>
      {soon ? (
        <View style={styles.soonChip}>
          <Text style={styles.soonChipText}>Happening Soon</Text>
        </View>
      ) : null}
      {ticketed ? (
        <View style={styles.ticketsChip}>
          <Text style={styles.ticketsChipText}>Tickets Live</Text>
        </View>
      ) : null}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Sections                                                            */
/* ------------------------------------------------------------------ */

type LightPal = { light: boolean; card?: object | null; title: string; body: string; meta: string };

function BrowseFastList({ events, lp }: { events: EventItem[]; lp: LightPal }) {
  const router = useRouter();
  return (
    <View style={{ gap: 10 }}>
      <View style={styles.browseHeadRow}>
        <View>
          <Text style={styles.eventListEyebrow}>EVENT LIST</Text>
          <Text style={[styles.browseFastTitle, { color: lp.title }]}>Browse fast</Text>
        </View>
        <Text style={[styles.showingText, lp.light && { color: lp.meta }]}>{events.length} SHOWING</Text>
      </View>
      {events.slice(0, 12).map((event) => (
        <EdPressable
          key={event.id}
          accessibilityRole="button"
          accessibilityLabel={`View ${event.title || 'event'}`}
          onPress={() => router.push(`/events/${event.id}` as any)}
        >
          <View style={[styles.fastRow, lp.card]}>
            <View style={styles.fastDateWrap}>
              <DateBlock event={event} size={44} />
            </View>
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              <Text style={[styles.fastTitle, { color: lp.title }]} numberOfLines={1}>{event.title || 'Underground event'}</Text>
              <Text style={[styles.fastMeta, lp.light && { color: lp.body }]} numberOfLines={1}>{fullDateLine(event)}</Text>
              <Text style={[styles.fastVenue, lp.light && { color: lp.meta }]} numberOfLines={1}>{venueLine(event)}</Text>
            </View>
            <View style={styles.viewPill}>
              <Text style={styles.viewPillText}>View</Text>
            </View>
          </View>
        </EdPressable>
      ))}
    </View>
  );
}

function EventSpotlight({ event }: { event?: EventItem }) {
  const router = useRouter();
  if (!event) return null;
  const externalTickets = hasEligibleExternalTickets(event);
  const provider = externalTicketProvider(event.ticket_url);
  return (
    <View style={styles.spotlightCard}>
      <View style={styles.spotlightArtwork}>
        {event.cover_image_url ? (
          <PluggdImage uri={event.cover_image_url} style={StyleSheet.absoluteFillObject as any} />
        ) : (
          <Image source={WEB_PARITY_ASSETS.eventsHero} style={styles.spotlightArtworkFallback} resizeMode="cover" />
        )}
        <LinearGradient
          colors={['rgba(8,5,3,0.06)', 'rgba(8,5,3,0.76)']}
          locations={[0.3, 1]}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.spotlightPill}>
          <Text style={styles.spotlightPillText}>Event Spotlight</Text>
        </View>
        <View style={styles.spotlightDateTicket}>
          <DateBlock event={event} size={44} />
        </View>
      </View>
      <View style={styles.spotlightBody}>
        <Text style={styles.spotlightTitle} numberOfLines={2}>{event.title || 'Underground event'}</Text>
        <View style={styles.spotlightMetaRow}>
          <MaterialIcons name="schedule" size={15} color={ed.orange} />
          <Text style={styles.spotlightMeta} numberOfLines={1}>{fullDateLine(event)}</Text>
          <View style={styles.spotlightMetaDivider} />
          <MaterialIcons name="place" size={15} color={ed.orange} />
          <Text style={[styles.spotlightMeta, styles.spotlightMetaVenue]} numberOfLines={1}>{venueLine(event)}</Text>
        </View>
        <View style={styles.spotlightCtaRow}>
          <EdPressable
            accessibilityRole="button"
            accessibilityLabel={externalTickets ? `Open tickets for ${event.title || 'event'}${provider ? ` on ${provider}` : ''}` : `Open ${event.title || 'event'}`}
            onPress={() => {
              if (!externalTickets) {
                router.push(`/events/${event.id}` as any);
                return;
              }
              void openExternalEventTickets({
                eventId: event.id,
                eventTitle: event.title,
                ticketUrl: event.ticket_url,
                sourceSurface: 'events_spotlight',
              });
            }}
            style={[styles.spotlightPrimaryPressable, externalTickets && styles.spotlightPrimaryPressableWide]}
          >
            <View style={styles.openEventCta}>
              <MaterialIcons name={externalTickets ? 'open-in-new' : 'arrow-forward'} size={17} color="#3a1c04" />
              <Text style={styles.openEventText} numberOfLines={1}>
                {externalTickets ? `Tickets${provider ? ` · ${provider}` : ''}` : 'View event'}
              </Text>
            </View>
          </EdPressable>
          <EdPressable
            accessibilityRole="button"
            accessibilityLabel={`View details for ${event.title || 'event'}`}
            onPress={() => router.push(`/events/${event.id}` as any)}
            style={[styles.spotlightSecondaryPressable, externalTickets && styles.spotlightSecondaryPressableCompact]}
          >
            <View style={styles.ticketLinkCta}>
              <MaterialIcons name={externalTickets ? 'info-outline' : 'confirmation-number'} size={15} color={ed.cream} />
              <Text style={styles.ticketLinkText} numberOfLines={1}>Details</Text>
            </View>
          </EdPressable>
        </View>
      </View>
    </View>
  );
}

function UpcomingPosterRail({ events, lp }: { events: EventItem[]; lp: LightPal }) {
  const router = useRouter();
  if (!events.length) return null;
  return (
    <View style={{ gap: 12 }}>
      <View style={styles.browseHeadRow}>
        <View>
          <Text style={[styles.upcomingTitle, { color: lp.title }]}>Upcoming Events</Text>
          <Text style={[styles.upcomingSub, lp.light && { color: lp.body }]}>Global curators and live experiences.</Text>
        </View>
        <Text style={[styles.showingText, lp.light && { color: lp.meta }]}>{Math.min(events.length, 12)} SHOWN</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={262} decelerationRate="fast" contentContainerStyle={{ gap: 12, paddingRight: 20 }}>
        {events.slice(0, 8).map((event) => (
          <EdPressable
            key={event.id}
            accessibilityRole="button"
            accessibilityLabel={`View ${event.title || 'event'}`}
            onPress={() => router.push(`/events/${event.id}` as any)}
          >
            <View style={styles.posterCard}>
              {event.cover_image_url ? (
                <PluggdImage uri={event.cover_image_url} style={StyleSheet.absoluteFillObject as any} />
              ) : (
                <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#241a12' }]} />
              )}
              <LinearGradient colors={['rgba(16,8,4,0.05)', 'rgba(16,8,4,0.88)']} style={StyleSheet.absoluteFillObject} />
              <View style={styles.posterDate}>
                <DateBlock event={event} size={48} />
              </View>
              <View style={styles.posterBody}>
                <Text style={styles.posterTitle} numberOfLines={2}>{event.title || 'Underground event'}</Text>
                <Text style={styles.posterVenue} numberOfLines={1}>{venueLine(event)}</Text>
              </View>
            </View>
          </EdPressable>
        ))}
      </ScrollView>
    </View>
  );
}

function MapRecommendationRail({
  events,
  lp,
  onBrowseAll,
}: {
  events: EventItem[];
  lp: LightPal;
  onBrowseAll: () => void;
}) {
  const router = useRouter();
  if (!events.length) return null;

  return (
    <View style={styles.mapRecommendations}>
      <View style={styles.mapRecommendationHead}>
        <View style={styles.mapRecommendationHeadingCopy}>
          <Text style={styles.mapRecommendationEyebrow}>KEEP EXPLORING</Text>
          <Text style={[styles.mapRecommendationTitle, { color: lp.title }]}>More nights nearby</Text>
          <Text style={[styles.mapRecommendationSub, lp.light && { color: lp.body }]}>Similar dates, venues and scenes around your selected event.</Text>
        </View>
        <EdPressable accessibilityRole="button" accessibilityLabel="Browse all events" onPress={onBrowseAll}>
          <View style={styles.mapBrowseAllButton}>
            <Text style={styles.mapBrowseAllText}>Browse all</Text>
            <MaterialIcons name="arrow-forward" size={16} color={ed.orange} />
          </View>
        </EdPressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={236}
        decelerationRate="fast"
        contentContainerStyle={styles.mapRecommendationRail}
      >
        {events.map((event) => (
          <EdPressable
            key={event.id}
            accessibilityRole="button"
            accessibilityLabel={`View ${event.title || 'event'}`}
            onPress={() => router.push(`/events/${event.id}` as any)}
          >
            <View style={[styles.mapRecommendationCard, lp.card]}>
              <View style={styles.mapRecommendationArtwork}>
                <PluggdImage
                  uri={event.cover_image_url || ''}
                  fallbackSource={WEB_PARITY_ASSETS.eventsHero}
                  style={StyleSheet.absoluteFillObject as any}
                  resizeMode="cover"
                  displayWidth={520}
                />
                <LinearGradient colors={['rgba(12,7,4,0.02)', 'rgba(12,7,4,0.74)']} style={StyleSheet.absoluteFillObject} />
                <View style={styles.mapRecommendationDate}>
                  <DateBlock event={event} size={46} />
                </View>
                <View style={styles.mapRecommendationArrow}>
                  <MaterialIcons name="arrow-forward" size={19} color="#281204" />
                </View>
              </View>
              <View style={styles.mapRecommendationBody}>
                <Text style={[styles.mapRecommendationCardTitle, { color: lp.title }]} numberOfLines={2}>{event.title || 'Underground event'}</Text>
                <View style={styles.mapRecommendationMetaRow}>
                  <MaterialIcons name="place" size={14} color={ed.orange} />
                  <Text style={[styles.mapRecommendationMeta, lp.light && { color: lp.body }]} numberOfLines={1}>{venueLine(event)}</Text>
                </View>
                <Text style={[styles.mapRecommendationPrice, lp.light && { color: lp.meta }]}>{eventTicketPriceLabel(event)}</Text>
              </View>
            </View>
          </EdPressable>
        ))}
      </ScrollView>
    </View>
  );
}

function FullEventCards({ events, lp }: { events: EventItem[]; lp: LightPal }) {
  const router = useRouter();
  return (
    <View style={{ gap: 16 }}>
      {events.slice(0, 8).map((event) => {
        const tags = tagsFor(event);
        const externalTickets = hasEligibleExternalTickets(event);
        const provider = externalTicketProvider(event.ticket_url);
        return (
          <View key={event.id} style={[styles.fullCard, lp.card]}>
            <EdPressable
              accessibilityRole="button"
              accessibilityLabel={`View ${event.title || 'event'}`}
              onPress={() => router.push(`/events/${event.id}` as any)}
            >
              <View style={styles.fullPosterWrap}>
                {event.cover_image_url ? (
                  <PluggdImage uri={event.cover_image_url} style={styles.fullPoster} />
                ) : (
                  <View style={[styles.fullPoster, { backgroundColor: '#241a12' }]} />
                )}
              </View>
              {tags.length ? (
                <View style={styles.tagRow}>
                  {tags.map((tag, index) => (
                    <View key={tag} style={index === 0 ? styles.tagChipOrange : styles.tagChipGrey}>
                      <Text style={index === 0 ? styles.tagChipOrangeText : [styles.tagChipGreyText, lp.light && { color: lp.body }]}>{tag}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
              <Text style={[styles.fullTitle, { color: lp.title }]}>{event.title || 'Underground event'}</Text>
              {event.description ? (
                <Text style={[styles.fullDescription, lp.light && { color: lp.body }]} numberOfLines={2}>{event.description}</Text>
              ) : null}
              <View style={styles.fullMetaRow}>
                <MaterialIcons name="schedule" size={13.5} color={lp.light ? lp.body : "rgba(255,248,237,0.66)"} />
                <Text style={[styles.fullMeta, lp.light && { color: lp.body }]}>{fullDateLine(event)}</Text>
              </View>
              <View style={styles.fullMetaRow}>
                <MaterialIcons name="place" size={13.5} color={lp.light ? lp.body : "rgba(255,248,237,0.66)"} />
                <Text style={[styles.fullMeta, lp.light && { color: lp.body }]} numberOfLines={1}>{cityLine(event)}</Text>
                <MaterialIcons name="groups" size={13.5} color={lp.light ? lp.body : "rgba(255,248,237,0.66)"} />
                <Text style={[styles.fullMeta, { flexShrink: 1 }, lp.light && { color: lp.body }]} numberOfLines={1}>{venueLine(event)}</Text>
              </View>
              <StatusChips event={event} />
            </EdPressable>
            <View style={styles.fullCtaRow}>
              <EdPressable
                accessibilityRole="button"
                accessibilityLabel={externalTickets ? `Open tickets for ${event.title || 'event'}${provider ? ` on ${provider}` : ''}` : `${Number(event.price_cents ?? 0) > 0 ? 'View tickets for' : 'RSVP to'} ${event.title || 'event'}`}
                onPress={() => {
                  if (!externalTickets) {
                    router.push(`/events/${event.id}` as any);
                    return;
                  }
                  void openExternalEventTickets({
                    eventId: event.id,
                    eventTitle: event.title,
                    ticketUrl: event.ticket_url,
                    sourceSurface: 'events_card',
                  });
                }}
                style={styles.fullPrimaryPressable}
              >
                <View style={styles.getTicketsCta}>
                  <View style={styles.getTicketsLabelRow}>
                    <MaterialIcons
                      name={externalTickets ? 'open-in-new' : Number(event.price_cents ?? 0) > 0 ? 'confirmation-number' : 'event-available'}
                      size={20}
                      color="#3a1c04"
                    />
                    <Text style={styles.getTicketsText} numberOfLines={1}>
                    {externalTickets
                      ? `Tickets${provider ? ` · ${provider}` : ''}`
                      : Number(event.price_cents ?? 0) > 0
                        ? `Ticket details · ${formatGBP(event.price_cents, { cents: true })}`
                        : 'RSVP'}
                    </Text>
                  </View>
                  <MaterialIcons name="arrow-forward" size={21} color="#3a1c04" />
                </View>
              </EdPressable>
              <EdPressable
                accessibilityRole="button"
                accessibilityLabel={`View details for ${event.title || 'event'}`}
                onPress={() => router.push(`/events/${event.id}` as any)}
                style={styles.fullSecondaryPressable}
              >
                <View style={[styles.fullTicketLinkCta, lp.light && { backgroundColor: '#ffffff', borderColor: 'rgba(91,56,31,0.2)' }]}>
                  <MaterialIcons name="info-outline" size={15} color={lp.light ? ed.ink : ed.cream} />
                  <Text style={[styles.ticketLinkText, lp.light && { color: ed.ink }]} numberOfLines={1}>Event details</Text>
                </View>
              </EdPressable>
            </View>
          </View>
        );
      })}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Screen                                                              */
/* ------------------------------------------------------------------ */

export function EventsBoardScreen() {
  const bottomInset = useBottomChromeInset();
  const router = useRouter();
  const theme = usePluggdTheme();
  // The web /events page is hybrid in light mode: the header block stays a
  // dark card while the list, filters and panels go light.
  const light = theme.scheme === 'light';
  const pal = light
    ? {
        screen: '#faf2e6',
        card: '#ffffff',
        cardBorder: 'rgba(91, 56, 31, 0.16)',
        title: ed.ink,
        body: 'rgba(34, 23, 15, 0.62)',
        meta: 'rgba(34, 23, 15, 0.55)',
      }
    : {
        screen: '#0d0705',
        card: undefined,
        cardBorder: undefined,
        title: '#ffffff',
        body: 'rgba(255,248,237,0.66)',
        meta: 'rgba(255,248,237,0.5)',
      };
  const cardOverride = light ? { backgroundColor: pal.card, borderColor: pal.cardBorder } : null;
  const [mode, setMode] = useState<'browse' | 'map'>('browse');
  const [category, setCategory] = useState<(typeof CATEGORY_CHIPS)[number]>('All events');
  const [activeMapEventId, setActiveMapEventId] = useState<string | null>(null);

  const eventsQuery = useQuery({
    queryKey: ['events-board', 'events'],
    queryFn: () =>
      safeList<EventItem>(
        (supabase as any)
          .from('events')
          .select('id,title,description,cover_image_url,location,starts_at,ends_at,price_cents,rsvp_count,ticket_url,commerce_classification,stream_url,playback_url,created_at')
          .eq('discoverable', true)
          .gte('starts_at', new Date().toISOString())
          .order('starts_at', { ascending: true })
          .limit(30),
      ),
    staleTime: 1000 * 60 * 2,
  });

  const events = useMemo(() => eventsQuery.data ?? [], [eventsQuery.data]);
  const carnivalQuery = useQuery({
    queryKey: ['carnival-hub', 1],
    queryFn: loadCarnivalHub,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });
  const filtered = useMemo(
    () => events.filter((event) => matchesCategory(event, category)),
    [events, category],
  );

  const mapQuery = useQuery({
    queryKey: ['events-board', 'map-points', category, filtered.map((event) => event.id).join(',')],
    enabled: mode === 'map' && filtered.length > 0,
    queryFn: async (): Promise<EventMapPoint[]> => {
      const geo = await geocodeMany(filtered.map((event) => (event.location || '').trim()).filter(Boolean));
      return filtered.flatMap((event) => {
        const hit = event.location ? geo.get(event.location.trim()) : null;
        if (!hit) return [];
        return [{
          id: event.id,
          title: event.title || 'Upcoming event',
          coverImage: event.cover_image_url,
          location: event.location,
          startsAt: event.starts_at,
          priceCents: event.price_cents,
          ticketLabel: eventTicketPriceLabel(event),
          lat: hit.lat,
          lng: hit.lng,
        }];
      });
    },
    staleTime: 1000 * 60 * 10,
  });

  const spotlight = useMemo(
    () => [...filtered].sort((a, b) => musicSpotlightScore(b) - musicSpotlightScore(a))[0],
    [filtered],
  );

  const mapRecommendations = useMemo(() => {
    if (filtered.length < 2) return [];
    const anchor = filtered.find((event) => event.id === activeMapEventId) ?? filtered[0];
    const anchorTags = new Set(tagsFor(anchor));
    const anchorCity = cityLine(anchor).toLowerCase();
    const anchorTime = anchor.starts_at ? new Date(anchor.starts_at).getTime() : 0;

    return filtered
      .filter((event) => event.id !== anchor.id)
      .map((event, index) => {
        const sharedTags = tagsFor(event).filter((tag) => anchorTags.has(tag)).length;
        const sameCity = cityLine(event).toLowerCase() === anchorCity ? 1 : 0;
        const eventTime = event.starts_at ? new Date(event.starts_at).getTime() : 0;
        const dateDistance = anchorTime && eventTime ? Math.abs(eventTime - anchorTime) / 86_400_000 : 365;
        const score = sharedTags * 12 + sameCity * 8 - Math.min(dateDistance, 90) / 12 - index * 0.01;
        return { event, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map(({ event }) => event);
  }, [activeMapEventId, filtered]);

  const refreshing = eventsQuery.isRefetching;
  const refresh = () => {
    void eventsQuery.refetch();
  };

  const lp: LightPal = { light, card: cardOverride, title: pal.title, body: pal.body, meta: pal.meta };

  return (
    <View style={[styles.screen, { backgroundColor: pal.screen }]}>
      <StatusBar style={light ? 'dark' : 'light'} translucent />
      <DiscoveryHeader />
      <ScrollView
        style={[styles.screen, { backgroundColor: pal.screen }]}
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={ed.orange} />}
        contentContainerStyle={{
          paddingTop: 4,
          paddingBottom: bottomInset,
          paddingHorizontal: 20,
          gap: 24,
        }}
      >
        {/* Header — stays a dark board card in light mode, like the web */}
        <Enter delay={0}>
        <View style={light ? styles.headerBoardLight : null}>
        <View style={{ gap: 7 }}>
          <View style={styles.eventHeadingRow}>
            <Text style={styles.eyebrow}>LIVE CULTURE · EVENTS</Text>
            <View style={styles.calendarMark}><MaterialIcons name="event" size={20} color={ed.orange} /></View>
          </View>
          <Text style={styles.pageTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.84}>Find your next night.</Text>
          <Text style={styles.pageSub}>Live shows, sessions and scene-defining nights near you.</Text>
        </View>

        {/* Browse / Map toggle */}
        <View style={[styles.toggleRow, { marginTop: 18 }]}>
          {(['browse', 'map'] as const).map((value) => (
            <EdPressable
              key={value}
              accessibilityRole="button"
              accessibilityLabel={value === 'browse' ? 'Browse events' : 'Open events map'}
              onPress={() => setMode(value)}
            >
              <View style={[styles.togglePill, mode === value && styles.togglePillActive]}>
                <Text style={[styles.togglePillText, mode === value && styles.togglePillTextActive]}>
                  {value === 'browse' ? 'Browse' : 'Map'}
                </Text>
              </View>
            </EdPressable>
          ))}
        </View>

        </View>
        </Enter>

        {mode === 'browse' && spotlight ? <EventSpotlight event={spotlight} /> : null}

        {mode === 'browse' && isCarnivalCampaignActive(carnivalQuery.data) && carnivalQuery.data ? (
          <EdPressable
            accessibilityRole="button"
            accessibilityLabel="Open the featured Notting Hill Carnival 2026 guide"
            onPress={() => router.push('/hubs/notting-hill-carnival-2026' as any)}
            style={styles.carnivalCard}
          >
            <PluggdImage uri={carnivalQuery.data.hub.heroImageUrl} style={styles.carnivalImage} resizeMode="cover" displayWidth={900} accessibilityLabel="" />
            <LinearGradient colors={['rgba(8,5,3,0.05)', 'rgba(8,5,3,0.94)']} style={StyleSheet.absoluteFillObject} />
            <View style={styles.carnivalCopy}>
              <Text style={styles.carnivalEyebrow}>FEATURED EVENT GUIDE · 29–31 AUG</Text>
              <Text style={styles.carnivalTitle}>Notting Hill Carnival 2026</Text>
              <Text style={styles.carnivalBody}>Build a route, explore the sourced map, find your sound and save road essentials.</Text>
              <View style={styles.carnivalCta}><Text style={styles.carnivalCtaText}>Open Carnival hub</Text><MaterialIcons name="arrow-forward" size={17} color="#120A05" /></View>
            </View>
          </EdPressable>
        ) : null}

        {/* Category chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipWrap}>
          {CATEGORY_CHIPS.map((chip) => (
            <EdPressable
              key={chip}
              accessibilityRole="button"
              accessibilityLabel={`Filter ${chip}`}
              onPress={() => setCategory(chip)}
            >
              <View style={[styles.categoryChip, category === chip && styles.categoryChipActive]}>
                <Text style={[styles.categoryChipText, category === chip && styles.categoryChipTextActive]}>{chip}</Text>
              </View>
            </EdPressable>
          ))}
        </ScrollView>

        {mode === 'map' ? (
          <>
            <EventsMap
              points={mapQuery.data ?? []}
              count={filtered.length}
              loading={mapQuery.isLoading}
              onActiveEventChange={setActiveMapEventId}
              onSelectEvent={(id) => router.push(`/events/${id}` as any)}
            />
            <MapRecommendationRail events={mapRecommendations} lp={lp} onBrowseAll={() => setMode('browse')} />
          </>
        ) : eventsQuery.isLoading ? (
          <PremiumSkeleton compact label="Loading events..." />
        ) : filtered.length ? (
          <>
            {/* Filters / Reset row */}
            <View style={styles.filtersRow}>
              <View style={[styles.filterGhost, lp.card]}>
                <Text style={[styles.filterGhostText, light && { color: pal.body }]}>Filters</Text>
              </View>
              <EdPressable accessibilityRole="button" accessibilityLabel="Open map" onPress={() => setMode('map')}>
                <View style={[styles.filterGhost, lp.card]}>
                  <Text style={[styles.filterGhostText, light && { color: pal.body }]}>Map</Text>
                </View>
              </EdPressable>
              <EdPressable accessibilityRole="button" accessibilityLabel="Reset filters" onPress={() => setCategory('All events')}>
                <View style={[styles.filterGhost, lp.card]}>
                  <Text style={[styles.filterGhostText, light && { color: pal.body }]}>Reset</Text>
                </View>
              </EdPressable>
            </View>

            <UpcomingPosterRail events={filtered} lp={lp} />
            <BrowseFastList events={filtered} lp={lp} />
            <FullEventCards events={filtered} lp={lp} />
          </>
        ) : (
          <View style={[styles.emptyPanel, lp.card]}>
            <Text style={[styles.emptyText, light && { color: pal.body }]}>No events match this filter set yet. New shows land here as promoters publish them.</Text>
          </View>
        )}

        {mode === 'browse' ? (
          <>
            {/* Open Opportunities */}
            <View style={[styles.opsPanel, lp.card]}>
              <View style={styles.opsHeadRow}>
                <MaterialIcons name="auto-awesome" size={17} color={ed.orange} />
                <Text style={[styles.opsTitle, { color: pal.title }]}>Open Opportunities</Text>
              </View>
              <Text style={[styles.opsBody, light && { color: pal.body }]}>Support slots and event collaborations will appear here when organisers open them.</Text>
            </View>

            {/* For Promoters */}
            <View style={[styles.opsPanel, lp.card]}>
              <View style={styles.opsHeadRow}>
                <MaterialIcons name="campaign" size={18} color={ed.orange} />
                <Text style={[styles.opsTitle, { color: pal.title }]}>For Promoters</Text>
              </View>
              <Text style={[styles.opsBody, light && { color: pal.body }]}>
                Publish your event once, manage lineup changes, and open support-slot applications from the same workflow.
              </Text>
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0d0705' },
  headerBoardLight: {
    backgroundColor: '#0d0705',
    borderRadius: 5,
    padding: 16,
  },

  eyebrow: { fontFamily: edFonts.bodyBlack, fontSize: 12, letterSpacing: 1.6, color: ed.orange },
  eventHeadingRow: { minHeight: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14 },
  calendarMark: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: 'rgba(255,248,237,0.2)', alignItems: 'center', justifyContent: 'center' },
  pageTitle: { fontFamily: 'Sora-ExtraBold', fontSize: 31, lineHeight: 35, letterSpacing: -1.05, color: '#fff8ed' },
  pageSub: { fontFamily: edFonts.bodyMedium, fontSize: 13.5, lineHeight: 19, color: 'rgba(255,248,237,0.66)' },

  toggleRow: { flexDirection: 'row', gap: 10 },
  togglePill: {
    minHeight: 44,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,248,237,0.2)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  togglePillActive: { backgroundColor: ed.orange, borderColor: ed.orange },
  togglePillText: { fontFamily: edFonts.bodyBlack, fontSize: 13.5, color: ed.cream },
  togglePillTextActive: { color: '#ffffff' },

  chipWrap: { flexDirection: 'row', gap: 8, paddingRight: 20 },
  categoryChip: {
    minHeight: 44,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,248,237,0.16)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryChipActive: { backgroundColor: ed.orange, borderColor: ed.orange },
  categoryChipText: { fontFamily: edFonts.bodyBold, fontSize: 12.5, color: ed.cream },
  categoryChipTextActive: { color: '#ffffff' },

  filtersRow: { flexDirection: 'row', gap: 10 },
  filterGhost: {
    minHeight: 44,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,248,237,0.16)',
    backgroundColor: 'rgba(20,12,8,0.8)',
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterGhostText: { fontFamily: edFonts.bodyBold, fontSize: 12.5, color: 'rgba(255,248,237,0.8)' },

  browseHeadRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  eventListEyebrow: { fontFamily: edFonts.bodyBlack, fontSize: 11, letterSpacing: 1.4, color: ed.orange },
  browseFastTitle: { fontFamily: 'Sora-Bold', fontSize: 20, color: '#fff8ed', marginTop: 2 },
  showingText: { fontFamily: edFonts.mono, fontSize: 10, letterSpacing: 1.4, color: 'rgba(255,248,237,0.55)' },

  fastRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,248,237,0.1)',
    backgroundColor: 'rgba(30,18,10,0.55)',
    padding: 10,
  },
  fastDateWrap: {
    width: 52,
    height: 52,
    borderRadius: 4,
    backgroundColor: '#1d1712',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fastThumbWrap: { width: 52, height: 52, borderRadius: 4, overflow: 'hidden' },
  fastThumb: { width: '100%', height: '100%' },
  fastThumbDate: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(10,5,2,0.45)' },
  dateBlock: { alignItems: 'center', justifyContent: 'center' },
  dateBlockDay: { fontFamily: edFonts.bodyBlack, fontSize: 15, color: '#ffffff' },
  dateBlockMonth: { fontFamily: edFonts.bodyBlack, fontSize: 9, letterSpacing: 0.8, color: '#ffffff' },
  fastTitle: { fontFamily: edFonts.bodyBold, fontSize: 14.5, color: '#ffffff' },
  fastMeta: { fontFamily: edFonts.bodyMedium, fontSize: 11.5, color: 'rgba(255,248,237,0.66)' },
  fastVenue: { fontFamily: edFonts.bodyMedium, fontSize: 11.5, color: 'rgba(255,248,237,0.5)' },
  viewPill: {
    minHeight: 44,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,102,0,0.6)',
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewPillText: { fontFamily: edFonts.bodyBlack, fontSize: 11.5, color: ed.orange },

  spotlightCard: {
    borderRadius: 7,
    overflow: 'hidden',
    backgroundColor: '#15100C',
    borderWidth: 1,
    borderColor: 'rgba(255,248,237,0.10)',
  },
  carnivalCard: { minHeight: 248, borderRadius: 7, overflow: 'hidden', backgroundColor: '#26170F', borderWidth: 1, borderColor: 'rgba(255,102,0,0.35)' },
  carnivalImage: { ...StyleSheet.absoluteFillObject, width: undefined, height: undefined },
  carnivalCopy: { flex: 1, justifyContent: 'flex-end', padding: 17, gap: 6 },
  carnivalEyebrow: { color: ed.orange, fontFamily: edFonts.bodyBlack, fontSize: 9.5, letterSpacing: 1.2 },
  carnivalTitle: { color: '#FFFFFF', fontFamily: edFonts.displayExtraBold, fontSize: 25, lineHeight: 29, letterSpacing: -0.6 },
  carnivalBody: { color: 'rgba(255,248,237,0.72)', fontFamily: edFonts.bodyMedium, fontSize: 12.5, lineHeight: 18, maxWidth: 330 },
  carnivalCta: { minHeight: 44, marginTop: 4, alignSelf: 'flex-start', borderRadius: 999, backgroundColor: ed.orange, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 15 },
  carnivalCtaText: { color: '#120A05', fontFamily: edFonts.bodyBlack, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: 0.3 },
  spotlightArtwork: { height: 176, overflow: 'hidden', backgroundColor: '#26170F' },
  spotlightArtworkFallback: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  spotlightBody: { padding: 15, gap: 10 },
  spotlightPill: {
    position: 'absolute',
    left: 14,
    top: 14,
    backgroundColor: ed.orange,
    borderRadius: 4,
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
  spotlightPillText: { fontFamily: edFonts.bodyBlack, fontSize: 11.5, color: '#3a1c04' },
  spotlightDateTicket: {
    position: 'absolute',
    right: 14,
    bottom: 13,
    width: 54,
    height: 54,
    borderRadius: 5,
    backgroundColor: 'rgba(12,7,4,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,248,237,0.2)',
  },
  spotlightTitle: { fontFamily: edFonts.displayExtraBold, fontSize: 24, lineHeight: 28, color: '#ffffff', letterSpacing: -0.5 },
  spotlightMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 0 },
  spotlightMetaDivider: { width: 1, height: 13, backgroundColor: 'rgba(255,248,237,0.18)', marginHorizontal: 3 },
  spotlightMeta: { fontFamily: edFonts.bodyMedium, fontSize: 11.5, color: 'rgba(255,248,237,0.72)' },
  spotlightMetaVenue: { flex: 1, minWidth: 0 },
  spotlightCtaRow: { flexDirection: 'row', gap: 10, marginTop: 2 },
  spotlightPrimaryPressable: { flexGrow: 0, flexShrink: 0, flexBasis: 132, width: 132, maxWidth: 132 },
  spotlightPrimaryPressableWide: { flex: 1, flexBasis: 0, width: undefined, maxWidth: undefined },
  spotlightSecondaryPressable: { flex: 1, minWidth: 0 },
  spotlightSecondaryPressableCompact: { flexGrow: 0, flexShrink: 0, flexBasis: 108, width: 108 },
  openEventCta: {
    alignSelf: 'stretch',
    minHeight: 48,
    borderRadius: 5,
    backgroundColor: ed.orange,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  openEventText: { fontFamily: edFonts.bodyBlack, fontSize: 14, color: '#3a1c04' },
  ticketLinkCta: {
    alignSelf: 'stretch',
    minHeight: 48,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,248,237,0.25)',
    backgroundColor: 'rgba(10,5,2,0.6)',
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  ticketLinkText: { flexShrink: 1, minWidth: 0, fontFamily: edFonts.bodyBold, fontSize: 11.5, color: ed.cream },

  upcomingTitle: { fontFamily: edFonts.displayBold, fontSize: 24, color: '#ffffff', letterSpacing: -0.4 },
  upcomingSub: { fontFamily: edFonts.bodyMedium, fontSize: 12.5, color: 'rgba(255,248,237,0.62)', marginTop: 2 },
  posterCard: { width: 250, height: 320, borderRadius: 5, overflow: 'hidden', justifyContent: 'flex-end' },
  posterDate: {
    position: 'absolute',
    top: 14,
    left: 14,
    borderRadius: 4,
    backgroundColor: 'rgba(20,12,6,0.92)',
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  posterBody: { padding: 14, gap: 3 },
  posterTitle: { fontFamily: edFonts.displayBold, fontSize: 19, lineHeight: 24, color: '#ffffff' },
  posterVenue: { fontFamily: edFonts.bodyBold, fontSize: 12, color: ed.orange },

  mapRecommendations: { gap: 14, marginTop: 2 },
  mapRecommendationHead: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 14 },
  mapRecommendationHeadingCopy: { flex: 1, minWidth: 0, gap: 3 },
  mapRecommendationEyebrow: { fontFamily: edFonts.bodyBlack, fontSize: 9.5, letterSpacing: 1.35, color: ed.orange },
  mapRecommendationTitle: { fontFamily: edFonts.displayBold, fontSize: 23, lineHeight: 27, letterSpacing: -0.45, color: '#ffffff' },
  mapRecommendationSub: { fontFamily: edFonts.bodyMedium, fontSize: 12, lineHeight: 17, color: 'rgba(255,248,237,0.58)' },
  mapBrowseAllButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 4 },
  mapBrowseAllText: { fontFamily: edFonts.bodyBlack, fontSize: 12, color: ed.orange },
  mapRecommendationRail: { gap: 12, paddingRight: 20 },
  mapRecommendationCard: { width: 224, minHeight: 252, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,248,237,0.12)', backgroundColor: '#15100c' },
  mapRecommendationArtwork: { height: 132, overflow: 'hidden', backgroundColor: '#26170f' },
  mapRecommendationDate: { position: 'absolute', left: 11, top: 11, borderRadius: 5, overflow: 'hidden', backgroundColor: 'rgba(12,7,4,0.9)' },
  mapRecommendationArrow: { position: 'absolute', right: 11, bottom: 11, width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: ed.orange },
  mapRecommendationBody: { flex: 1, paddingHorizontal: 13, paddingTop: 11, paddingBottom: 13, gap: 6 },
  mapRecommendationCardTitle: { fontFamily: edFonts.displayBold, fontSize: 17, lineHeight: 21, color: '#ffffff' },
  mapRecommendationMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, minWidth: 0 },
  mapRecommendationMeta: { flex: 1, fontFamily: edFonts.bodyMedium, fontSize: 11.5, color: 'rgba(255,248,237,0.62)' },
  mapRecommendationPrice: { fontFamily: edFonts.bodyBlack, fontSize: 10.5, letterSpacing: 0.35, color: 'rgba(255,248,237,0.48)' },

  fullCard: {
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,248,237,0.1)',
    backgroundColor: 'rgba(24,14,8,0.6)',
    padding: 14,
    gap: 8,
  },
  fullPosterWrap: { borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  fullPoster: { width: '100%', height: 190 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 4 },
  tagChipGrey: {
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.09)',
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  tagChipGreyText: { fontFamily: edFonts.bodyMedium, fontSize: 11.5, color: 'rgba(255,248,237,0.78)' },
  tagChipOrange: {
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,102,0,0.6)',
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  tagChipOrangeText: { fontFamily: edFonts.bodyMedium, fontSize: 11.5, color: ed.orange },
  fullTitle: { fontFamily: edFonts.displayBold, fontSize: 18, lineHeight: 23, color: '#ffffff', marginTop: 6 },
  fullDescription: { fontFamily: edFonts.bodyMedium, fontSize: 13, lineHeight: 19, color: 'rgba(255,248,237,0.62)' },
  fullMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  fullMeta: { fontFamily: edFonts.bodyMedium, fontSize: 12, color: 'rgba(255,248,237,0.66)', marginRight: 8 },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  soonChip: {
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,102,0,0.6)',
    backgroundColor: 'rgba(255,102,0,0.1)',
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  soonChipText: { fontFamily: edFonts.bodyBold, fontSize: 11.5, color: ed.orange },
  ticketsChip: {
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(58,215,131,0.55)',
    backgroundColor: 'rgba(58,215,131,0.1)',
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  ticketsChipText: { fontFamily: edFonts.bodyBold, fontSize: 11.5, color: '#3ad783' },
  fullCtaRow: { gap: 10, marginTop: 8 },
  fullPrimaryPressable: { width: '100%', minHeight: 54 },
  fullSecondaryPressable: { width: '100%', minHeight: 48 },
  getTicketsCta: {
    width: '100%',
    minHeight: 54,
    borderRadius: 5,
    backgroundColor: ed.orange,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  getTicketsLabelRow: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 9 },
  getTicketsText: { flexShrink: 1, fontFamily: edFonts.bodyBlack, fontSize: 14.5, color: '#3a1c04' },
  fullTicketLinkCta: {
    width: '100%',
    minHeight: 48,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,248,237,0.25)',
    backgroundColor: 'rgba(10,5,2,0.6)',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  emptyPanel: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,248,237,0.14)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: 18,
  },
  emptyText: { fontFamily: edFonts.bodyMedium, fontSize: 13.5, lineHeight: 19, color: 'rgba(255,248,237,0.66)' },

  opsPanel: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,248,237,0.12)',
    backgroundColor: 'rgba(28,16,9,0.6)',
    padding: 18,
    gap: 8,
  },
  opsHeadRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  opsTitle: { fontFamily: edFonts.bodyBlack, fontSize: 17, color: '#ffffff' },
  opsBody: { fontFamily: edFonts.bodyMedium, fontSize: 13, lineHeight: 19, color: 'rgba(255,248,237,0.66)' },
});
