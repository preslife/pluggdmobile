/**
 * Events — direct mobile port of the web /events page: bold "Discover
 * local shows" header, Browse/Map toggle, category chips, Filters/Reset
 * row, the "Browse fast" event list with date-block thumbnails, the
 * Event Spotlight card, the Upcoming Events poster rail, full event
 * cards with tag + status chips, and the Open Opportunities / For
 * Promoters panels.
 */
import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PluggdImage } from '../../components/PluggdImage';
import { PremiumSkeleton } from '../../components/PremiumSkeleton';
import { EventsMap } from '../../../components/EventsMap';
import { ed, edFonts } from '../../design/editorial';
import { usePluggdTheme } from '../../design/usePluggdTheme';
import { geocodeMany, type MapPoint } from '../../lib/mapbox';
import { safeList } from '../culture/mobileServices';
import { supabase } from '../../lib/supabase';
import { formatGBP, type EventItem } from '../../lib/mobileContent';
import { EdPressable } from './EditorialBits';

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

function eventText(event: EventItem) {
  return `${event.title || ''} ${event.description || ''}`.toLowerCase();
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
  const ticketed = Number(event.price_cents ?? 0) > 0;
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
            <View style={styles.fastThumbWrap}>
              {event.cover_image_url ? (
                <PluggdImage uri={event.cover_image_url} style={styles.fastThumb} />
              ) : (
                <View style={[styles.fastThumb, { backgroundColor: '#241a12' }]} />
              )}
              <View style={styles.fastThumbDate}>
                <DateBlock event={event} size={40} />
              </View>
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
  return (
    <View style={styles.spotlightCard}>
      {event.cover_image_url ? (
        <PluggdImage uri={event.cover_image_url} style={StyleSheet.absoluteFillObject as any} />
      ) : null}
      <LinearGradient colors={['rgba(16,8,4,0.55)', 'rgba(16,8,4,0.94)']} style={StyleSheet.absoluteFillObject} />
      <View style={styles.spotlightBody}>
        <View style={styles.spotlightPill}>
          <Text style={styles.spotlightPillText}>Event Spotlight</Text>
        </View>
        <Text style={styles.spotlightTitle}>{event.title || 'Underground event'}</Text>
        {event.description ? (
          <Text style={styles.spotlightDescription} numberOfLines={3}>{event.description}</Text>
        ) : null}
        <View style={styles.spotlightMetaRow}>
          <MaterialIcons name="schedule" size={14} color="rgba(255,248,237,0.75)" />
          <Text style={styles.spotlightMeta}>{fullDateLine(event)}</Text>
          <MaterialIcons name="place" size={14} color="rgba(255,248,237,0.75)" />
          <Text style={styles.spotlightMeta} numberOfLines={1}>{cityLine(event)}</Text>
        </View>
        <View style={styles.spotlightMetaRow}>
          <MaterialIcons name="groups" size={14} color="rgba(255,248,237,0.75)" />
          <Text style={styles.spotlightMeta} numberOfLines={1}>{venueLine(event)}</Text>
        </View>
        <View style={styles.spotlightCtaRow}>
          <EdPressable
            accessibilityRole="button"
            accessibilityLabel={`Open ${event.title || 'event'}`}
            onPress={() => router.push(`/events/${event.id}` as any)}
            style={{ flex: 1 }}
          >
            <View style={styles.openEventCta}>
              <Text style={styles.openEventText}>Open Event</Text>
              <MaterialIcons name="arrow-forward" size={16} color="#3a1c04" />
            </View>
          </EdPressable>
          <EdPressable
            accessibilityRole="button"
            accessibilityLabel="Ticket link"
            onPress={() => router.push(`/events/${event.id}` as any)}
            style={{ flex: 1 }}
          >
            <View style={styles.ticketLinkCta}>
              <MaterialIcons name="confirmation-number" size={15} color={ed.cream} />
              <Text style={styles.ticketLinkText}>Ticket Link</Text>
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
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 20 }}>
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

function FullEventCards({ events, lp }: { events: EventItem[]; lp: LightPal }) {
  const router = useRouter();
  return (
    <View style={{ gap: 16 }}>
      {events.slice(0, 8).map((event) => {
        const tags = tagsFor(event);
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
                accessibilityLabel={`Get tickets for ${event.title || 'event'}`}
                onPress={() => router.push(`/events/${event.id}` as any)}
                style={{ flex: 1 }}
              >
                <View style={styles.getTicketsCta}>
                  <Text style={styles.getTicketsText}>
                    {Number(event.price_cents ?? 0) > 0 ? `Get Tickets · ${formatGBP(event.price_cents, { cents: true })}` : 'RSVP'}
                  </Text>
                </View>
              </EdPressable>
              <EdPressable
                accessibilityRole="button"
                accessibilityLabel={`Ticket link for ${event.title || 'event'}`}
                onPress={() => router.push(`/events/${event.id}` as any)}
                style={{ flex: 1 }}
              >
                <View style={[styles.ticketLinkCta, lp.light && { backgroundColor: '#ffffff', borderColor: 'rgba(91,56,31,0.2)' }]}>
                  <MaterialIcons name="confirmation-number" size={15} color={lp.light ? ed.ink : ed.cream} />
                  <Text style={[styles.ticketLinkText, lp.light && { color: ed.ink }]}>Ticket Link</Text>
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
  const insets = useSafeAreaInsets();
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

  const eventsQuery = useQuery({
    queryKey: ['events-board', 'events'],
    queryFn: () =>
      safeList<EventItem>(
        (supabase as any)
          .from('events')
          .select('id,title,description,cover_image_url,location,starts_at,ends_at,price_cents,rsvp_count,stream_url,playback_url,created_at')
          .gte('starts_at', new Date().toISOString())
          .order('starts_at', { ascending: true })
          .limit(30),
      ),
    staleTime: 1000 * 60 * 2,
  });

  const events = useMemo(() => eventsQuery.data ?? [], [eventsQuery.data]);
  const filtered = useMemo(
    () => events.filter((event) => matchesCategory(event, category)),
    [events, category],
  );

  const mapQuery = useQuery({
    queryKey: ['events-board', 'map-points', events.length],
    enabled: mode === 'map' && events.length > 0,
    queryFn: async (): Promise<MapPoint[]> => {
      const geo = await geocodeMany(events.map((event) => (event.location || '').trim()).filter(Boolean));
      return events
        .map((event) => (event.location ? geo.get(event.location.trim()) : null))
        .filter((hit): hit is NonNullable<typeof hit> => Boolean(hit))
        .map((hit) => ({ lat: hit.lat, lng: hit.lng }));
    },
    staleTime: 1000 * 60 * 10,
  });

  const spotlight = useMemo(
    () => filtered.find((event) => event.cover_image_url && event.description) || filtered[0],
    [filtered],
  );

  const refreshing = eventsQuery.isRefetching;
  const refresh = () => {
    void eventsQuery.refetch();
  };

  const lp: LightPal = { light, card: cardOverride, title: pal.title, body: pal.body, meta: pal.meta };

  return (
    <View style={[styles.screen, { backgroundColor: pal.screen }]}>
      <StatusBar style={light ? 'dark' : 'light'} translucent />
      <ScrollView
        style={[styles.screen, { backgroundColor: pal.screen }]}
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={ed.orange} />}
        contentContainerStyle={{
          paddingTop: Math.max(insets.top + 76, 96),
          paddingBottom: insets.bottom + 210,
          paddingHorizontal: 20,
          gap: 24,
        }}
      >
        {/* Header — stays a dark board card in light mode, like the web */}
        <View style={light ? styles.headerBoardLight : null}>
        <View style={{ gap: 8 }}>
          <Text style={styles.eyebrow}>EVENTS</Text>
          <Text style={styles.pageTitle}>Discover local shows</Text>
          <Text style={styles.pageSub}>Live shows, club nights, and creator sessions in a tighter feed.</Text>
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

        {/* Category chips */}
        <View style={[styles.chipWrap, { marginTop: 12 }]}>
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
        </View>
        </View>

        {mode === 'map' ? (
          <EventsMap points={mapQuery.data ?? []} count={filtered.length} />
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

            <BrowseFastList events={filtered} lp={lp} />
            <EventSpotlight event={spotlight} />
            <UpcomingPosterRail events={filtered} lp={lp} />
            <FullEventCards events={filtered} lp={lp} />
          </>
        ) : (
          <View style={[styles.emptyPanel, lp.card]}>
            <Text style={[styles.emptyText, light && { color: pal.body }]}>No events match this filter set yet. New shows land here as promoters publish them.</Text>
          </View>
        )}

        {/* Open Opportunities */}
        <View style={[styles.opsPanel, lp.card]}>
          <View style={styles.opsHeadRow}>
            <MaterialIcons name="auto-awesome" size={17} color={ed.orange} />
            <Text style={[styles.opsTitle, { color: pal.title }]}>Open Opportunities</Text>
          </View>
          <Text style={[styles.opsBody, light && { color: pal.body }]}>No open opportunities match this filter set.</Text>
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0d0705' },
  headerBoardLight: {
    backgroundColor: '#0d0705',
    borderRadius: 20,
    padding: 16,
  },

  eyebrow: { fontFamily: edFonts.bodyBlack, fontSize: 12, letterSpacing: 1.6, color: ed.orange },
  pageTitle: { fontFamily: edFonts.bodyBlack, fontSize: 27, lineHeight: 32, color: '#ffffff' },
  pageSub: { fontFamily: edFonts.bodyMedium, fontSize: 13.5, lineHeight: 19, color: 'rgba(255,248,237,0.66)' },

  toggleRow: { flexDirection: 'row', gap: 10 },
  togglePill: {
    minHeight: 44,
    borderRadius: 999,
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

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: {
    minHeight: 38,
    borderRadius: 999,
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
    minHeight: 42,
    borderRadius: 999,
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
  browseFastTitle: { fontFamily: edFonts.bodyBlack, fontSize: 20, color: '#ffffff', marginTop: 2 },
  showingText: { fontFamily: edFonts.mono, fontSize: 10, letterSpacing: 1.4, color: 'rgba(255,248,237,0.55)' },

  fastRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,248,237,0.1)',
    backgroundColor: 'rgba(30,18,10,0.55)',
    padding: 10,
  },
  fastThumbWrap: { width: 52, height: 52, borderRadius: 10, overflow: 'hidden' },
  fastThumb: { width: '100%', height: '100%' },
  fastThumbDate: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(10,5,2,0.45)' },
  dateBlock: { alignItems: 'center', justifyContent: 'center' },
  dateBlockDay: { fontFamily: edFonts.bodyBlack, fontSize: 15, color: '#ffffff' },
  dateBlockMonth: { fontFamily: edFonts.bodyBlack, fontSize: 9, letterSpacing: 0.8, color: '#ffffff' },
  fastTitle: { fontFamily: edFonts.bodyBold, fontSize: 14.5, color: '#ffffff' },
  fastMeta: { fontFamily: edFonts.bodyMedium, fontSize: 11.5, color: 'rgba(255,248,237,0.66)' },
  fastVenue: { fontFamily: edFonts.bodyMedium, fontSize: 11.5, color: 'rgba(255,248,237,0.5)' },
  viewPill: {
    minHeight: 36,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,102,0,0.6)',
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewPillText: { fontFamily: edFonts.bodyBlack, fontSize: 11.5, color: ed.orange },

  spotlightCard: { borderRadius: 18, overflow: 'hidden', minHeight: 330 },
  spotlightBody: { flex: 1, justifyContent: 'flex-end', padding: 18, gap: 9 },
  spotlightPill: {
    alignSelf: 'flex-start',
    backgroundColor: ed.orange,
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
  spotlightPillText: { fontFamily: edFonts.bodyBlack, fontSize: 11.5, color: '#3a1c04' },
  spotlightTitle: { fontFamily: edFonts.bodyBlack, fontSize: 26, lineHeight: 31, color: '#ffffff' },
  spotlightDescription: { fontFamily: edFonts.bodyMedium, fontSize: 13, lineHeight: 19, color: 'rgba(255,248,237,0.78)' },
  spotlightMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  spotlightMeta: { fontFamily: edFonts.bodyMedium, fontSize: 12, color: 'rgba(255,248,237,0.75)', marginRight: 8 },
  spotlightCtaRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
  openEventCta: {
    minHeight: 48,
    borderRadius: 10,
    backgroundColor: ed.orange,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  openEventText: { fontFamily: edFonts.bodyBlack, fontSize: 14, color: '#3a1c04' },
  ticketLinkCta: {
    minHeight: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,248,237,0.25)',
    backgroundColor: 'rgba(10,5,2,0.6)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  ticketLinkText: { fontFamily: edFonts.bodyBold, fontSize: 13, color: ed.cream },

  upcomingTitle: { fontFamily: edFonts.bodyBlack, fontSize: 24, color: '#ffffff' },
  upcomingSub: { fontFamily: edFonts.bodyMedium, fontSize: 12.5, color: 'rgba(255,248,237,0.62)', marginTop: 2 },
  posterCard: { width: 300, height: 380, borderRadius: 18, overflow: 'hidden', justifyContent: 'flex-end' },
  posterDate: {
    position: 'absolute',
    top: 14,
    left: 14,
    borderRadius: 10,
    backgroundColor: 'rgba(20,12,6,0.92)',
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  posterBody: { padding: 14, gap: 3 },
  posterTitle: { fontFamily: edFonts.bodyBlack, fontSize: 19, lineHeight: 24, color: '#ffffff' },
  posterVenue: { fontFamily: edFonts.bodyBold, fontSize: 12, color: ed.orange },

  fullCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,248,237,0.1)',
    backgroundColor: 'rgba(24,14,8,0.6)',
    padding: 14,
    gap: 8,
  },
  fullPosterWrap: { borderRadius: 12, overflow: 'hidden', marginBottom: 6 },
  fullPoster: { width: '100%', height: 320 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 4 },
  tagChipGrey: {
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.09)',
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  tagChipGreyText: { fontFamily: edFonts.bodyMedium, fontSize: 11.5, color: 'rgba(255,248,237,0.78)' },
  tagChipOrange: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,102,0,0.6)',
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  tagChipOrangeText: { fontFamily: edFonts.bodyMedium, fontSize: 11.5, color: ed.orange },
  fullTitle: { fontFamily: edFonts.bodyBlack, fontSize: 21, lineHeight: 26, color: '#ffffff', marginTop: 6 },
  fullDescription: { fontFamily: edFonts.bodyMedium, fontSize: 13, lineHeight: 19, color: 'rgba(255,248,237,0.62)' },
  fullMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  fullMeta: { fontFamily: edFonts.bodyMedium, fontSize: 12, color: 'rgba(255,248,237,0.66)', marginRight: 8 },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  soonChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,102,0,0.6)',
    backgroundColor: 'rgba(255,102,0,0.1)',
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  soonChipText: { fontFamily: edFonts.bodyBold, fontSize: 11.5, color: ed.orange },
  ticketsChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(58,215,131,0.55)',
    backgroundColor: 'rgba(58,215,131,0.1)',
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  ticketsChipText: { fontFamily: edFonts.bodyBold, fontSize: 11.5, color: '#3ad783' },
  fullCtaRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
  getTicketsCta: {
    minHeight: 48,
    borderRadius: 10,
    backgroundColor: ed.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  getTicketsText: { fontFamily: edFonts.bodyBlack, fontSize: 13.5, color: '#3a1c04' },

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
