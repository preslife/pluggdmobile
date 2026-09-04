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
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text as NativeText,
  TextInput,
  View,
  type TextProps,
} from 'react-native';
import { useBottomChromeInset } from '../../design/useBottomChromeInset';
import { PluggdImage } from '../../components/PluggdImage';
import { PremiumSkeleton } from '../../components/PremiumSkeleton';
import { EventsMap } from '../../../components/EventsMap';
import { ed, edFonts } from '../../design/editorial';
import { usePluggdTheme } from '../../design/usePluggdTheme';
import { geocodeMany, type EventMapPoint } from '../../lib/mapbox';
import type { EventItem } from '../../lib/mobileContent';
import { eventTicketPriceLabel, externalTicketProvider, hasEligibleExternalTickets, openExternalEventTickets } from '../../lib/eventTickets';
import { EdPressable } from './EditorialBits';
import { DiscoveryHeader } from '../discovery/DiscoveryHeader';
import { loadCarnivalHub } from '../carnival/carnivalService';
import { WEB_PARITY_ASSETS } from '../parity/webAssets';
import { loadCuratedPublicItems } from '../discovery/siteCuration';
import { isPublicActiveEvent, loadPublicEventDiscovery, type PublicEventItem } from '../events/eventDiscoveryData';
import { resolveCarnivalFeaturedPlans } from '../events/carnivalFeaturedPlans';
import {
  NOTTING_HILL_CARNIVAL_2026_TAKEOVER,
  eventBelongsToTakeover,
  eventMatchesTakeoverCategory,
  eventTakeoverPhaseCopy,
  isEventTakeoverEntryVisible,
  resolveEventTakeoverPhase,
  takeoverGroupForEvent,
  zonedCalendarDay,
  type EventTakeoverGroup,
  type EventTakeoverPhase,
} from '../events/eventTakeovers';

/**
 * The accepted Events design is an artwork-led, fixed-rhythm editorial board.
 * Preserve Dynamic Type without allowing accessibility categories to inflate a
 * single label past its card and cover neighbouring artwork or actions.
 */
function Text({ maxFontSizeMultiplier, ...props }: TextProps) {
  return <NativeText maxFontSizeMultiplier={maxFontSizeMultiplier ?? 1.15} {...props} />;
}

const CATEGORY_CHIPS = ['All events', 'Live Music', 'Culture', 'Meet-ups', 'Festivals', 'Clubbing', 'Comedy'] as const;
const DATE_FILTERS = [
  ['all', 'All upcoming'],
  ['today', 'Tonight'],
  ['week', 'This week'],
  ['weekend', 'Weekend'],
] as const;

type EventDateFilter = (typeof DATE_FILTERS)[number][0];
type EventsExperienceMode = 'all' | 'takeover';
type TakeoverGroupFilter = 'all' | EventTakeoverGroup;
type EventFilterDropdown = 'when' | 'city' | 'genre';

// Keep Events on the same loaded display family as the rest of the native app.
// A platform Georgia fallback made this route look like an older, unrelated build.
const EVENTS_SERIF_FONT = edFonts.serif;

const CARNIVAL_SHARE_ARTWORK_URL = 'https://pluggd.fm/carnival-2026/assets/carnival-hub-share.webp';

const TAKEOVER_GROUP_LABELS: Record<EventTakeoverGroup, string> = {
  before: 'Before the road',
  live: 'Carnival weekend',
  after: 'After the road',
};

const TAKEOVER_COLLECTION_QUERY_FLOOR = (() => {
  const configuredStart = new Date(`${NOTTING_HILL_CARNIVAL_2026_TAKEOVER.collectionStartsOn}T00:00:00.000Z`);
  return new Date(configuredStart.getTime() - 24 * 60 * 60 * 1000).toISOString();
})();

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
  return [
    event.title,
    event.description,
    event.lineup_headline,
    event.city,
    event.location,
    ...(event.genre_tags ?? []),
    ...(event.event_tags ?? []),
  ].filter(Boolean).join(' ').toLowerCase();
}

function matchesCategory(event: EventItem, category: string) {
  if (category === 'All events') return true;
  const words = CATEGORY_KEYWORDS[category] || [];
  const text = eventText(event);
  return words.some((word) => text.includes(word));
}

function tagsFor(event: EventItem): string[] {
  const text = eventText(event);
  const explicit = [...(event.genre_tags ?? []), ...(event.event_tags ?? [])]
    .map((tag) => String(tag).trim().toLowerCase())
    .filter(Boolean);
  const inferred = TAG_KEYWORDS.filter(({ words }) => words.some((word) => text.includes(word)))
    .map(({ tag }) => tag);
  return [...new Set([...explicit, ...inferred])].slice(0, 3);
}

function matchesDateFilter(event: EventItem, filter: EventDateFilter, now = new Date()) {
  if (!event.starts_at) return false;
  const start = new Date(event.starts_at).getTime();
  if (!Number.isFinite(start)) return false;
  if (filter === 'all') {
    const boundary = event.ends_at ? new Date(event.ends_at).getTime() : start;
    return Number.isFinite(boundary) && boundary >= now.getTime();
  }

  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);
  const weekEnd = new Date(todayStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const daysToSaturday = (6 - todayStart.getDay() + 7) % 7;
  const weekendStart = new Date(todayStart);
  weekendStart.setDate(weekendStart.getDate() + daysToSaturday);
  const weekendEnd = new Date(weekendStart);
  weekendEnd.setDate(weekendEnd.getDate() + 2);

  if (filter === 'today') return start >= todayStart.getTime() && start < todayEnd.getTime();
  if (filter === 'week') return start >= todayStart.getTime() && start < weekEnd.getTime();
  return start >= weekendStart.getTime() && start < weekendEnd.getTime();
}

function venueLine(event: EventItem) {
  return (event.location || 'Venue TBA').split(',')[0].trim();
}

function cityLine(event: EventItem) {
  if (event.city?.trim()) return event.city.trim();
  const parts = (event.location || '').split(',').map((part) => part.trim()).filter(Boolean);
  return parts.length > 1 ? parts[parts.length - 1] : parts[0] || 'Location TBA';
}

function eventGeocodeQuery(event: PublicEventItem, campaignCity?: string | null) {
  const venueParts = [event.venue_name, event.venue_address, event.venue_city, event.venue_postcode, event.venue_country]
    .map((part) => part?.trim()).filter(Boolean);
  if (venueParts.length) return venueParts.join(', ');
  const location = event.location?.trim() || '';
  const city = campaignCity?.trim() || event.city?.trim() || '';
  if (!location) return city ? `${city}, United Kingdom` : '';
  const withCity = !city || location.toLowerCase().includes(city.toLowerCase()) ? location : `${location}, ${city}`;
  return /\b(united kingdom|u\.?k\.?|england|scotland|wales|northern ireland)\b/i.test(withCity)
    ? withCity
    : `${withCity}, United Kingdom`;
}

function isWithinGreaterLondon(point: { lat: number; lng: number }) {
  return point.lat >= 51.25 && point.lat <= 51.75 && point.lng >= -0.55 && point.lng <= 0.35;
}

function isWithinUnitedKingdom(point: { lat: number; lng: number }) {
  return point.lat >= 49.5 && point.lat <= 61.2 && point.lng >= -8.7 && point.lng <= 2.2;
}

function venueCoordinate(event: PublicEventItem) {
  if (event.venue_latitude == null || event.venue_longitude == null) return null;
  const lat = Number(event.venue_latitude);
  const lng = Number(event.venue_longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
    ? { lat, lng }
    : null;
}

function fullDateLine(event: EventItem) {
  if (!event.starts_at) return 'Date TBA';
  const date = new Date(event.starts_at);
  return `${date.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}, ${date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
}

function takeoverDateTimeLine(event: EventItem) {
  if (!event.starts_at) return 'DATE TBA';
  const date = new Date(event.starts_at);
  const day = date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    timeZone: NOTTING_HILL_CARNIVAL_2026_TAKEOVER.timeZone,
  }).toUpperCase();
  const time = date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: NOTTING_HILL_CARNIVAL_2026_TAKEOVER.timeZone,
  });
  return `${day} · ${time}`;
}

function FilterDropdownField({
  label,
  selectedLabel,
  options,
  value,
  open,
  onToggle,
  onSelect,
  light,
}: {
  label: string;
  selectedLabel: string;
  options: Array<{ value: string; label: string }>;
  value: string;
  open: boolean;
  onToggle: () => void;
  onSelect: (value: string) => void;
  light: boolean;
}) {
  return (
    <View style={[styles.filterDropdownColumn, open && styles.filterDropdownColumnOpen]}>
      <Text style={[styles.filterDropdownLabel, light && styles.filterDropdownLabelLight]}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selectedLabel}`}
        accessibilityHint={`Opens ${label.toLowerCase()} choices`}
        accessibilityState={{ expanded: open, selected: value !== 'all' }}
        onPress={onToggle}
        style={({ pressed }) => [
          styles.filterDropdownField,
          light && styles.filterDropdownFieldLight,
          open && styles.filterDropdownFieldOpen,
          pressed && styles.pressed,
        ]}
      >
        <Text numberOfLines={1} style={[styles.filterDropdownValue, light && styles.filterDropdownValueLight]}>{selectedLabel}</Text>
        <MaterialIcons name={open ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} size={17} color={light ? ed.inkMuted : 'rgba(255,248,237,0.72)'} />
      </Pressable>
      {open ? <FilterDropdownMenu label={label} options={options} value={value} onSelect={onSelect} light={light} /> : null}
    </View>
  );
}

function FilterDropdownMenu({
  label,
  options,
  value,
  onSelect,
  light,
}: {
  label: string;
  options: Array<{ value: string; label: string }>;
  value: string;
  onSelect: (value: string) => void;
  light: boolean;
}) {
  return (
    <View style={[styles.filterDropdownMenu, light && styles.filterDropdownMenuLight]} accessibilityLabel={`${label} choices`}>
      <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={options.length > 6} style={styles.filterDropdownScroll} contentContainerStyle={styles.filterDropdownOptions}>
        {options.map((option) => {
          const active = option.value === value;
          return (
            <Pressable
              key={`${label}-${option.value}`}
              accessibilityRole="radio"
              accessibilityLabel={`${label}: ${option.label}`}
              accessibilityState={{ selected: active }}
              onPress={() => onSelect(option.value)}
              style={({ pressed }) => [
                styles.filterDropdownOption,
                light && styles.filterDropdownOptionLight,
                active && styles.filterDropdownOptionActive,
                pressed && styles.pressed,
              ]}
            >
              <Text numberOfLines={1} style={[styles.filterDropdownOptionText, light && styles.filterDropdownOptionTextLight, active && styles.filterDropdownOptionTextActive]}>
                {option.label}
              </Text>
              {active ? <MaterialIcons name="check" size={17} color={ed.orange} /> : null}
            </Pressable>
          );
        })}
      </ScrollView>
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
    <View style={styles.fastListSection}>
      <View style={styles.browseHeadRow}>
        <View>
          <Text style={styles.eventListEyebrow}>EVENT LIST</Text>
          <Text style={[styles.browseFastTitle, { color: lp.title }]}>Browse events</Text>
        </View>
        <Text style={[styles.showingText, lp.light && { color: lp.meta }]}>{events.length} SHOWING</Text>
      </View>
      {events.map((event) => {
        return (
          <EdPressable
            key={event.id}
            accessibilityRole="button"
            accessibilityLabel={`View ${event.title || 'event'}`}
            onPress={() => router.push(`/events/${event.id}` as any)}
          >
            <View style={[styles.fastRow, lp.card]}>
              <View style={styles.fastThumbWrap}>
                {event.cover_image_url ? (
                  <PluggdImage uri={event.cover_image_url} style={styles.fastThumb} resizeMode="cover" displayWidth={160} />
                ) : (
                  <LinearGradient colors={['#1d2028', '#352114', '#8b3f14']} style={StyleSheet.absoluteFillObject} />
                )}
              </View>
              <View style={styles.fastCopy}>
                <Text style={[styles.fastTitle, { color: lp.title }]} numberOfLines={1}>{event.title || 'Underground event'}</Text>
                <Text style={[styles.fastMeta, lp.light && { color: lp.body }]} numberOfLines={1}>{fullDateLine(event)}</Text>
                <Text style={[styles.fastVenue, lp.light && { color: lp.meta }]} numberOfLines={1}>{venueLine(event)}</Text>
              </View>
              <View style={styles.viewPill}>
                <Text style={styles.viewPillText}>View</Text>
              </View>
            </View>
          </EdPressable>
        );
      })}
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
      {event.cover_image_url ? (
        <PluggdImage uri={event.cover_image_url} style={StyleSheet.absoluteFillObject as any} resizeMode="cover" displayWidth={900} />
      ) : (
        <Image source={WEB_PARITY_ASSETS.eventsHero} style={styles.spotlightArtworkFallback} resizeMode="cover" />
      )}
      <LinearGradient
        colors={['rgba(7,8,11,0.97)', 'rgba(7,8,11,0.74)', 'rgba(7,8,11,0.28)']}
        locations={[0, 0.58, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFillObject}
      />
      <LinearGradient
        colors={['rgba(7,8,11,0.02)', 'rgba(7,8,11,0.9)']}
        locations={[0.42, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.spotlightBody}>
        <View style={styles.spotlightEyebrowPill}>
          <Text style={styles.spotlightEyebrow}>EVENT SPOTLIGHT</Text>
        </View>
        <Text style={styles.spotlightTitle}>{event.title || 'Underground event'}</Text>
        {event.description ? <Text style={styles.spotlightDescription}>{event.description}</Text> : null}
        <View style={styles.spotlightMetaWrap}>
          <View style={styles.spotlightMetaRow}>
            <MaterialIcons name="schedule" size={14} color={ed.orange} />
            <Text style={styles.spotlightMeta} numberOfLines={1}>{fullDateLine(event)}</Text>
          </View>
          <View style={styles.spotlightMetaRow}>
            <MaterialIcons name="place" size={14} color={ed.orange} />
            <Text style={[styles.spotlightMeta, styles.spotlightMetaVenue]} numberOfLines={1}>{event.city || venueLine(event)}</Text>
          </View>
          {event.city && venueLine(event) !== event.city ? (
            <View style={styles.spotlightMetaRow}>
              <MaterialIcons name="groups" size={14} color={ed.orange} />
              <Text style={[styles.spotlightMeta, styles.spotlightMetaVenue]} numberOfLines={1}>{venueLine(event)}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.spotlightCtaRow}>
          <View style={[styles.spotlightPrimaryPressable, !externalTickets && styles.spotlightPrimaryPressableWide]}>
            <EdPressable
              accessibilityRole="button"
              accessibilityLabel={`Open ${event.title || 'event'}`}
              onPress={() => router.push(`/events/${event.id}` as any)}
            >
              <View style={styles.openEventCta}>
                <Text style={styles.openEventText} numberOfLines={1}>Open Event</Text>
                <MaterialIcons name="arrow-forward" size={17} color="#3a1c04" />
              </View>
            </EdPressable>
          </View>
          {externalTickets ? (
            <View style={styles.spotlightSecondaryPressable}>
              <EdPressable
                accessibilityRole="link"
                accessibilityLabel={`Open ticket link for ${event.title || 'event'}${provider ? ` on ${provider}` : ''}`}
                onPress={() => {
                  void openExternalEventTickets({
                    eventId: event.id,
                    eventTitle: event.title,
                    ticketUrl: event.ticket_url,
                    sourceSurface: 'events_spotlight',
                  });
                }}
              >
                <View style={styles.ticketLinkCta}>
                  <MaterialIcons name="confirmation-number" size={15} color={ed.cream} />
                  <Text style={styles.ticketLinkText} numberOfLines={1}>Ticket Link</Text>
                </View>
              </EdPressable>
            </View>
          ) : null}
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
      <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={288} decelerationRate="fast" contentContainerStyle={styles.posterRail}>
        {events.slice(0, 12).map((event) => {
          const eventDate = event.starts_at ? new Date(event.starts_at) : null;
          return (
            <EdPressable
              key={event.id}
              accessibilityRole="button"
              accessibilityLabel={`View ${event.title || 'event'}`}
              onPress={() => router.push(`/events/${event.id}` as any)}
            >
              <View style={[styles.posterCard, lp.card]}>
                <View style={styles.posterArtwork}>
                  {event.cover_image_url ? (
                    <PluggdImage uri={event.cover_image_url} style={StyleSheet.absoluteFillObject as any} resizeMode="cover" displayWidth={720} />
                  ) : (
                    <LinearGradient colors={['#1c1f27', '#2e1e16', '#8b3b12']} style={StyleSheet.absoluteFillObject} />
                  )}
                  <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.94)']} locations={[0.42, 1]} style={StyleSheet.absoluteFillObject} />
                  <View style={styles.posterDateBadge}>
                    <Text style={styles.posterMonth}>{eventDate ? eventDate.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase() : 'TBA'}</Text>
                    <Text style={styles.posterDay}>{eventDate ? eventDate.toLocaleDateString('en-GB', { day: '2-digit' }) : '—'}</Text>
                  </View>
                  <View style={styles.posterOverlayCopy}>
                    <Text style={styles.posterVenue} numberOfLines={1}>{venueLine(event) || event.city || 'Live Event'}</Text>
                    <Text style={styles.posterTitle} numberOfLines={2}>{event.title || 'Underground event'}</Text>
                  </View>
                </View>
                <View style={styles.posterFooter}>
                  <Text style={[styles.posterFooterStatus, lp.light && { color: lp.body }]}>{hasEligibleExternalTickets(event) ? 'Tickets live' : 'Ticket link pending'}</Text>
                </View>
              </View>
            </EdPressable>
          );
        })}
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
                <LinearGradient colors={['rgba(12,7,4,0)', 'rgba(12,7,4,0.16)']} style={StyleSheet.absoluteFillObject} />
                <View style={styles.mapRecommendationArrow}>
                  <MaterialIcons name="arrow-forward" size={19} color="#281204" />
                </View>
              </View>
              <View style={styles.mapRecommendationBody}>
                <Text style={styles.mapRecommendationMetaDate} numberOfLines={1}>{fullDateLine(event)}</Text>
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

function LocalSceneRail({
  events,
  lp,
  onSelectCity,
}: {
  events: EventItem[];
  lp: LightPal;
  onSelectCity: (city: string) => void;
}) {
  const scenes = useMemo(() => {
    const grouped = new Map<string, { count: number; cover: string | null }>();
    events.forEach((event) => {
      const city = event.city?.trim();
      if (!city || city === 'Location TBA') return;
      const current = grouped.get(city);
      grouped.set(city, {
        count: (current?.count ?? 0) + 1,
        cover: current?.cover || event.cover_image_url || null,
      });
    });
    return [...grouped.entries()]
      .map(([city, value]) => ({ city, ...value }))
      .sort((a, b) => b.count - a.count || a.city.localeCompare(b.city))
      .slice(0, 6);
  }, [events]);

  if (!scenes.length) return null;
  return (
    <View style={styles.localSceneSection}>
      <Text style={[styles.localSceneTitle, { color: lp.title }]}>Local Scene</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={222}
        decelerationRate="fast"
        contentContainerStyle={styles.localSceneRail}
      >
        {scenes.map((scene) => (
          <EdPressable
            key={scene.city}
            accessibilityRole="button"
            accessibilityLabel={`Show ${scene.count} events in ${scene.city}`}
            onPress={() => onSelectCity(scene.city)}
          >
            <View style={styles.localSceneCard}>
              <PluggdImage
                uri={scene.cover || ''}
                fallbackSource={WEB_PARITY_ASSETS.eventsHero}
                style={StyleSheet.absoluteFillObject as any}
                resizeMode="cover"
                displayWidth={480}
              />
              <LinearGradient colors={['rgba(5,3,2,0.08)', 'rgba(5,3,2,0.8)']} style={StyleSheet.absoluteFillObject} />
              <View style={styles.localSceneCopy}>
                <Text style={styles.localSceneCity} numberOfLines={1}>{scene.city}</Text>
                <Text style={styles.localSceneCount}>{scene.count} active {scene.count === 1 ? 'event' : 'events'}</Text>
              </View>
            </View>
          </EdPressable>
        ))}
      </ScrollView>
    </View>
  );
}

function CompactEventBoard({
  events,
  limit,
  lp,
  heading,
  onShowMore,
}: {
  events: EventItem[];
  limit: number;
  lp: LightPal;
  heading: string;
  onShowMore: () => void;
}) {
  const router = useRouter();
  const visible = events.slice(0, limit);
  return (
    <View style={styles.compactBoardSection}>
      <View style={styles.compactBoardHeading}>
        <Text style={[styles.compactBoardTitle, { color: lp.title }]}>{heading}</Text>
        <Text style={[styles.showingText, lp.light && { color: lp.meta }]}>{events.length} RESULTS</Text>
      </View>
      <View style={styles.compactBoardGrid}>
        {visible.map((event) => {
          const externalTickets = hasEligibleExternalTickets(event);
          const startsAtMs = event.starts_at ? new Date(event.starts_at).getTime() : Number.NaN;
          const startsSoon = Number.isFinite(startsAtMs)
            && startsAtMs >= Date.now()
            && startsAtMs - Date.now() <= 1000 * 60 * 60 * 24 * 10;
          return (
            <View key={event.id} style={[styles.compactBoardCard, lp.card]}>
              <EdPressable
                accessibilityRole="button"
                accessibilityLabel={`View ${event.title || 'event'}`}
                onPress={() => router.push(`/events/${event.id}` as any)}
              >
                <View style={styles.compactBoardArtwork}>
                  <PluggdImage
                    uri={event.cover_image_url || ''}
                    fallbackSource={WEB_PARITY_ASSETS.eventsHero}
                    style={StyleSheet.absoluteFillObject as any}
                    resizeMode="cover"
                    displayWidth={420}
                  />
                  <LinearGradient colors={['rgba(8,7,9,0)', 'rgba(8,7,9,0.72)']} locations={[0.45, 1]} style={StyleSheet.absoluteFillObject} />
                  {startsSoon ? (
                    <View style={styles.compactBoardSoonPill}>
                      <Text style={styles.compactBoardSoonText}>SOON</Text>
                    </View>
                  ) : null}
                </View>
                <View style={styles.compactBoardBody}>
                  <Text style={styles.compactBoardDate} numberOfLines={2}>{fullDateLine(event)}</Text>
                  <Text style={[styles.compactBoardEventTitle, { color: lp.title }]} numberOfLines={2}>{event.title || 'Underground event'}</Text>
                  <Text style={[styles.compactBoardVenue, lp.light && { color: lp.body }]} numberOfLines={1}>{venueLine(event)}</Text>
                </View>
              </EdPressable>
              <View style={styles.compactBoardFooter}>
                <EdPressable
                  accessibilityRole={externalTickets ? 'link' : 'button'}
                  accessibilityLabel={externalTickets ? `Open tickets for ${event.title || 'event'}` : `View details for ${event.title || 'event'}`}
                  onPress={() => {
                    if (!externalTickets) {
                      router.push(`/events/${event.id}` as any);
                      return;
                    }
                    void openExternalEventTickets({
                      eventId: event.id,
                      eventTitle: event.title,
                      ticketUrl: event.ticket_url,
                      sourceSurface: 'events_compact_board',
                    });
                  }}
                  style={styles.compactBoardFooterAction}
                >
                  <Text style={[styles.compactBoardTicket, lp.light && { color: lp.body }]} numberOfLines={1}>
                    {externalTickets ? 'Tickets live' : eventTicketPriceLabel(event)}
                  </Text>
                  <MaterialIcons name="arrow-forward" size={17} color={ed.orange} />
                </EdPressable>
              </View>
            </View>
          );
        })}
      </View>
      {visible.length < events.length ? (
        <EdPressable
          accessibilityRole="button"
          accessibilityLabel={`Show 8 more events, ${events.length - visible.length} remaining`}
          onPress={onShowMore}
        >
          <View style={styles.loadMoreButton}>
            <Text style={styles.loadMoreText}>Show 8 more events</Text>
            <Text style={[styles.loadMoreCount, lp.light && { color: lp.meta }]}>{events.length - visible.length} REMAINING</Text>
          </View>
        </EdPressable>
      ) : null}
    </View>
  );
}

function TakeoverEntry({
  phase,
  total,
  artwork,
  onOpen,
  onGuide,
}: {
  phase: EventTakeoverPhase;
  total: number;
  artwork: string | null;
  onOpen: () => void;
  onGuide: () => void;
}) {
  const copy = eventTakeoverPhaseCopy(phase);
  return (
    <View style={styles.takeoverEntry}>
      {artwork ? (
        <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, styles.takeoverEntryArtwork]}>
          <PluggdImage
            uri={artwork}
            fallbackSource={WEB_PARITY_ASSETS.eventsHero}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
            displayWidth={900}
          />
        </View>
      ) : null}
      <LinearGradient
        colors={['rgba(10,5,2,0.98)', 'rgba(18,7,3,0.9)', 'rgba(18,7,3,0.38)']}
        locations={[0, 0.5, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.takeoverEntryCopy}>
        <Text style={styles.takeoverEntryEyebrow}>PLUGGD CULTURAL TAKEOVER · {copy.label.toUpperCase()}</Text>
        <Text style={styles.takeoverEntryTitle}>Notting Hill Carnival is on the Events board.</Text>
        <Text style={styles.takeoverEntryBody}>{total} verified {total === 1 ? 'listing' : 'listings'} around the road, connected to the complete PLUGGD guide.</Text>
        <View style={styles.takeoverEntryActions}>
          <View style={styles.takeoverEntryPrimarySlot}>
            <EdPressable accessibilityRole="button" accessibilityLabel="Open Carnival mode" onPress={onOpen}>
              <View style={styles.takeoverEntryPrimary}>
                <Text style={styles.takeoverEntryPrimaryText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.84}>Open Carnival mode</Text>
                <MaterialIcons name="arrow-forward" size={18} color="#2B1607" />
              </View>
            </EdPressable>
          </View>
          <View style={styles.takeoverEntrySecondarySlot}>
            <EdPressable accessibilityRole="button" accessibilityLabel="Open complete Carnival guide" onPress={onGuide}>
              <View style={styles.takeoverEntrySecondary}>
                <Text style={styles.takeoverEntrySecondaryText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>Complete guide</Text>
              </View>
            </EdPressable>
          </View>
        </View>
      </View>
    </View>
  );
}

function TakeoverModeHeader({
  onAllEvents,
}: {
  onAllEvents: () => void;
}) {
  return (
    <View style={styles.takeoverHeader}>
      <View accessibilityRole="tablist" style={styles.takeoverModeSwitch}>
        <EdPressable accessibilityRole="button" accessibilityLabel="All Events" accessibilityState={{ selected: false }} onPress={onAllEvents}>
          <View style={styles.takeoverModeTab}>
            <Text style={styles.takeoverModeTabText}>All Events</Text>
          </View>
        </EdPressable>
        <View accessibilityRole="tab" accessibilityLabel="Carnival 60" accessibilityState={{ selected: true }} style={styles.takeoverModeTabActive}>
          <Text style={styles.takeoverModeTabActiveText}>Carnival 60</Text>
        </View>
      </View>
      <Text style={styles.takeoverRoadLine}><Text style={styles.takeoverRoadLineStrong}>Made for the road.</Text> Every Carnival plan. One road-ready board.</Text>
    </View>
  );
}

function TakeoverDiscovery({
  events,
  featuredPlans,
  spotlight,
  category,
  group,
  groupCounts,
  lp,
  onCategoryChange,
  onGroupChange,
  onOpenMap,
  onSeeAllPlans,
}: {
  events: EventItem[];
  featuredPlans: EventItem[];
  spotlight?: EventItem;
  category: string;
  group: TakeoverGroupFilter;
  groupCounts: Record<EventTakeoverGroup, number>;
  lp: LightPal;
  onCategoryChange: (category: string) => void;
  onGroupChange: (group: TakeoverGroupFilter) => void;
  onOpenMap: () => void;
  onSeeAllPlans: () => void;
}) {
  const router = useRouter();
  const programmeGroups = useMemo(() => {
    const grouped = new Map<string, { date: Date; events: EventItem[] }>();
    events.slice(0, 10).forEach((event) => {
      if (!event.starts_at) return;
      const date = new Date(event.starts_at);
      if (!Number.isFinite(date.getTime())) return;
      const key = zonedCalendarDay(date, NOTTING_HILL_CARNIVAL_2026_TAKEOVER.timeZone);
      const current = grouped.get(key);
      if (current) current.events.push(event);
      else grouped.set(key, { date, events: [event] });
    });
    return [...grouped.values()].slice(0, 3);
  }, [events]);

  return (
    <View style={styles.takeoverDiscovery}>
      {spotlight ? (
        <View style={styles.takeoverTopPick}>
          <View style={styles.takeoverTopPickCopy}>
            <Text style={styles.takeoverTopPickEyebrow}>TOP PICK</Text>
            <Text style={styles.takeoverTopPickTitle} allowFontScaling={false}>{spotlight.title || 'Carnival plan'}</Text>
            <Text style={styles.takeoverTopPickMeta}>{takeoverDateTimeLine(spotlight)}{`\n`}{venueLine(spotlight)}</Text>
            {spotlight.description ? <Text style={styles.takeoverTopPickBody} numberOfLines={2}>{spotlight.description}</Text> : null}
            <EdPressable accessibilityRole="button" accessibilityLabel={`Open ${spotlight.title || 'Carnival event'}`} onPress={() => router.push(`/events/${spotlight.id}` as any)} style={styles.takeoverTextAction}>
              <Text style={styles.takeoverTextActionLabel}>Open Event</Text>
              <MaterialIcons name="arrow-forward" size={17} color={ed.orange} />
            </EdPressable>
          </View>
          <View style={styles.takeoverTopPickArtwork}>
            <PluggdImage uri={spotlight.cover_image_url || ''} fallbackSource={WEB_PARITY_ASSETS.eventsHero} style={StyleSheet.absoluteFillObject as any} resizeMode="cover" displayWidth={520} />
          </View>
        </View>
      ) : null}

      {featuredPlans.length ? (
        <View style={styles.featuredPlansSection}>
          <View style={styles.featuredPlansHeading}>
            <Text style={styles.featuredPlansTitle}>Featured plans</Text>
            <EdPressable accessibilityRole="button" accessibilityLabel="See all Carnival plans" onPress={onSeeAllPlans}>
              <View style={styles.featuredPlansAction}>
                <Text style={styles.featuredPlansHint}>See all plans</Text>
                <MaterialIcons name="arrow-forward" size={17} color={ed.orange} />
              </View>
            </EdPressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} decelerationRate="fast" snapToInterval={198} contentContainerStyle={styles.featuredPlansRail}>
            {featuredPlans.map((event, index) => (
              <EdPressable key={event.id} accessibilityRole="button" accessibilityLabel={`Open ${event.title || 'Carnival event'}`} onPress={() => router.push(`/events/${event.id}` as any)}>
                <View style={[styles.featuredPlanCard, index === 0 ? styles.featuredPlanWide : styles.featuredPlanNarrow, lp.card]}>
                  <View style={[styles.featuredPlanArtwork, index === 0 ? styles.featuredPlanArtworkTall : index % 3 === 1 ? styles.featuredPlanArtworkShort : styles.featuredPlanArtworkMedium]}>
                    <PluggdImage uri={event.cover_image_url || ''} fallbackSource={WEB_PARITY_ASSETS.eventsHero} style={StyleSheet.absoluteFillObject as any} resizeMode="cover" displayWidth={480} />
                  </View>
                  <View style={styles.featuredPlanBody}>
                    <Text style={styles.featuredPlanDate} numberOfLines={1}>{takeoverDateTimeLine(event)}</Text>
                    <Text style={[styles.featuredPlanTitle, { color: lp.title }]} numberOfLines={2}>{event.title || 'Carnival plan'}</Text>
                    <Text style={[styles.featuredPlanVenue, lp.light && { color: lp.body }]} numberOfLines={1}>{venueLine(event)}</Text>
                    <View style={styles.featuredPlanAction}><Text style={styles.featuredPlanActionText}>Open Event</Text><MaterialIcons name="arrow-forward" size={16} color={ed.orange} /></View>
                  </View>
                </View>
              </EdPressable>
            ))}
          </ScrollView>
        </View>
      ) : null}

      <View style={styles.takeoverFilterPanel}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.takeoverFilterRail}>
          {[{ id: 'all', label: 'All plans' }, ...NOTTING_HILL_CARNIVAL_2026_TAKEOVER.categories].map((item) => {
            const selected = category === item.id;
            return (
              <EdPressable key={item.id} accessibilityRole="button" accessibilityLabel={`Filter Carnival plans: ${item.label}`} accessibilityState={{ selected }} onPress={() => onCategoryChange(item.id)}>
                <View style={[styles.takeoverFilterChip, selected && styles.takeoverFilterChipActive]}>
                  <Text style={[styles.takeoverFilterChipText, selected && styles.takeoverFilterChipTextActive]}>{item.label}</Text>
                </View>
              </EdPressable>
            );
          })}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.takeoverGroupRail}>
          {(['before', 'live', 'after'] as const).map((item) => {
            const selected = group === item;
            return (
              <EdPressable key={item} accessibilityRole="button" accessibilityLabel={`Filter ${TAKEOVER_GROUP_LABELS[item]}, ${groupCounts[item]} events`} accessibilityState={{ selected }} onPress={() => onGroupChange(selected ? 'all' : item)}>
                <View style={[styles.takeoverGroupChip, selected && styles.takeoverGroupChipActive]}>
                  <Text style={[styles.takeoverGroupChipText, selected && styles.takeoverGroupChipTextActive]}>{TAKEOVER_GROUP_LABELS[item]} · {groupCounts[item]}</Text>
                </View>
              </EdPressable>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.programmeHeading}>
        <View>
          <Text style={styles.programmeEyebrow}>ROAD SCHEDULE</Text>
          <Text style={styles.programmeTitle}>Full programme</Text>
        </View>
        <Text style={styles.showingText}>{events.length} RESULTS</Text>
      </View>

      {events.length ? programmeGroups.map((day) => (
        <View key={day.date.toISOString()} style={[styles.programmeDay, lp.card]}>
          <View style={styles.programmeDayHeader}>
            <PluggdImage uri={day.events[0]?.cover_image_url || ''} fallbackSource={WEB_PARITY_ASSETS.eventsHero} style={StyleSheet.absoluteFillObject as any} resizeMode="cover" displayWidth={820} />
            <LinearGradient colors={['rgba(10,5,2,0.62)', 'rgba(10,5,2,0.95)']} style={StyleSheet.absoluteFillObject} />
            <View style={styles.programmeDayCopy}>
              <Text style={styles.programmeWeekday}>{day.date.toLocaleDateString('en-GB', { weekday: 'long', timeZone: NOTTING_HILL_CARNIVAL_2026_TAKEOVER.timeZone })}</Text>
              <Text style={styles.programmeDayTitle}>{day.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', timeZone: NOTTING_HILL_CARNIVAL_2026_TAKEOVER.timeZone })}</Text>
            </View>
          </View>
          <View style={styles.programmeRows}>
            {day.events.map((event, index) => (
              <EdPressable key={event.id} accessibilityRole="button" accessibilityLabel={`Open ${event.title || 'Carnival event'}`} onPress={() => router.push(`/events/${event.id}` as any)}>
                <View style={styles.programmeRow}>
                  <View style={[styles.programmeRowArtwork, index % 3 === 1 ? styles.programmeRowArtworkCircle : index % 3 === 2 ? styles.programmeRowArtworkCompact : null]}>
                    <PluggdImage uri={event.cover_image_url || ''} fallbackSource={WEB_PARITY_ASSETS.eventsHero} style={StyleSheet.absoluteFillObject as any} resizeMode="cover" displayWidth={220} />
                  </View>
                  <View style={styles.programmeRowCopy}>
                    <Text style={styles.programmeRowMeta} numberOfLines={1}>{event.starts_at ? new Date(event.starts_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: NOTTING_HILL_CARNIVAL_2026_TAKEOVER.timeZone }) : 'TIME TBA'}{hasEligibleExternalTickets(event) ? ' · TICKETS LIVE' : ''}</Text>
                    <Text style={[styles.programmeRowTitle, { color: lp.title }]} numberOfLines={2}>{event.title || 'Carnival plan'}</Text>
                    <Text style={[styles.programmeRowVenue, lp.light && { color: lp.body }]} numberOfLines={1}>{venueLine(event)}</Text>
                  </View>
                  <View style={styles.programmeRowArrow}><MaterialIcons name="arrow-forward" size={20} color={ed.orange} /></View>
                </View>
              </EdPressable>
            ))}
          </View>
        </View>
      )) : (
        <View style={[styles.emptyPanel, lp.card]}>
          <Text style={[styles.emptyTitle, { color: lp.title }]}>No verified Carnival events match</Text>
          <Text style={[styles.emptyText, lp.light && { color: lp.body }]}>Try another category, road phase or search, or open the complete guide.</Text>
          <EdPressable
            accessibilityRole="button"
            accessibilityLabel="Show all Carnival plans"
            onPress={() => {
              onCategoryChange('all');
              onGroupChange('all');
            }}
          >
            <View style={styles.emptyAction}>
              <Text style={styles.emptyActionText}>Show all Carnival plans</Text>
            </View>
          </EdPressable>
        </View>
      )}

      {events.length ? (
        <View style={styles.programmeFooter}>
          <EdPressable accessibilityRole="button" accessibilityLabel={`View all ${events.length} Carnival events`} onPress={onSeeAllPlans}>
            <View style={styles.programmeViewAllAction}>
              <Text style={styles.programmeFooterText}>View all {events.length} events</Text>
              <MaterialIcons name="arrow-forward" size={17} color={ed.orange} />
            </View>
          </EdPressable>
          <EdPressable accessibilityRole="button" accessibilityLabel="Open Carnival event map" onPress={onOpenMap}>
            <View style={styles.programmeMapButton}>
              <MaterialIcons name="map" size={18} color={ed.cream} />
              <Text style={styles.programmeMapButtonText}>Map</Text>
            </View>
          </EdPressable>
        </View>
      ) : null}
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
  const [experienceMode, setExperienceMode] = useState<EventsExperienceMode>('all');
  const [mode, setMode] = useState<'browse' | 'map'>('browse');
  const [category, setCategory] = useState<(typeof CATEGORY_CHIPS)[number]>('All events');
  const [takeoverCategory, setTakeoverCategory] = useState('all');
  const [takeoverGroup, setTakeoverGroup] = useState<TakeoverGroupFilter>('all');
  const [query, setQuery] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState<EventDateFilter>('all');
  const [cityFilter, setCityFilter] = useState('all');
  const [genreFilter, setGenreFilter] = useState('all');
  const [openFilterDropdown, setOpenFilterDropdown] = useState<EventFilterDropdown | null>(null);
  const [activeMapEventId, setActiveMapEventId] = useState<string | null>(null);
  const [boardLimit, setBoardLimit] = useState(8);
  const [takeoverClock, setTakeoverClock] = useState(() => new Date());
  const [takeoverBoardY, setTakeoverBoardY] = useState<number | null>(null);
  const [normalBoardY, setNormalBoardY] = useState<number | null>(null);
  const [normalTopStackY, setNormalTopStackY] = useState(0);
  const [browseUtilitiesY, setBrowseUtilitiesY] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const eventsQuery = useQuery({
    queryKey: ['culture', 'events', 'takeover-candidates', NOTTING_HILL_CARNIVAL_2026_TAKEOVER.id],
    queryFn: () => loadPublicEventDiscovery({ includePastSince: TAKEOVER_COLLECTION_QUERY_FLOOR }),
    staleTime: 1000 * 60 * 2,
  });
  const spotlightQuery = useQuery({
    queryKey: ['site-curation', 'featured_event'],
    queryFn: () => loadCuratedPublicItems('featured_event', 60),
    staleTime: 1000 * 60 * 2,
    retry: 1,
  });

  const eventCandidates = useMemo(() => eventsQuery.data ?? [], [eventsQuery.data]);
  const events = useMemo(
    () => eventCandidates.filter((event) => isPublicActiveEvent(event, takeoverClock.getTime())),
    [eventCandidates, takeoverClock],
  );
  const carnivalQuery = useQuery({
    queryKey: ['carnival-hub', 1],
    queryFn: loadCarnivalHub,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  useEffect(() => {
    const timer = setInterval(() => setTakeoverClock(new Date()), 5 * 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  const takeoverPhase = useMemo(
    () => resolveEventTakeoverPhase(NOTTING_HILL_CARNIVAL_2026_TAKEOVER, takeoverClock),
    [takeoverClock],
  );
  const takeoverEntryVisible = isEventTakeoverEntryVisible(takeoverPhase);
  const takeoverEvents = useMemo(
    () => eventCandidates.filter((event) => eventBelongsToTakeover(event, NOTTING_HILL_CARNIVAL_2026_TAKEOVER)),
    [eventCandidates],
  );
  const takeoverGroupCounts = useMemo<Record<EventTakeoverGroup, number>>(() => {
    const counts: Record<EventTakeoverGroup, number> = { before: 0, live: 0, after: 0 };
    takeoverEvents.forEach((event) => {
      const eventGroup = takeoverGroupForEvent(event, NOTTING_HILL_CARNIVAL_2026_TAKEOVER);
      if (eventGroup) counts[eventGroup] += 1;
    });
    return counts;
  }, [takeoverEvents]);
  const filterSourceEvents = experienceMode === 'takeover' ? takeoverEvents : events;

  const cityOptions = useMemo(
    () => [...new Set(filterSourceEvents.map((event) => event.city?.trim()).filter((value): value is string => Boolean(value)))]
      .sort((a, b) => a.localeCompare(b)),
    [filterSourceEvents],
  );
  const genreOptions = useMemo(() => {
    const counts = new Map<string, number>();
    filterSourceEvents.forEach((event) => {
      (event.genre_tags ?? []).forEach((tag) => {
        const normalized = String(tag).trim();
        if (!normalized) return;
        counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
      });
    });
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 14)
      .map(([genre]) => genre);
  }, [filterSourceEvents]);
  const eventFilterDropdowns: Array<{
    key: EventFilterDropdown;
    label: string;
    value: string;
    options: Array<{ value: string; label: string }>;
  }> = [
    {
      key: 'when',
      label: 'When',
      value: dateFilter,
      options: DATE_FILTERS.map(([value, label]) => ({ value, label })),
    },
    {
      key: 'city',
      label: 'City',
      value: cityFilter,
      options: [{ value: 'all', label: 'All cities' }, ...cityOptions.map((city) => ({ value: city, label: city }))],
    },
    {
      key: 'genre',
      label: 'Genre',
      value: genreFilter,
      options: [{ value: 'all', label: 'All genres' }, ...genreOptions.map((genre) => ({ value: genre, label: genre }))],
    },
  ];
  const filtered = useMemo(
    () => {
      const normalizedQuery = query.trim().toLowerCase();
      return filterSourceEvents.filter((event) => {
        if (experienceMode === 'all' && !matchesCategory(event, category)) return false;
        if (experienceMode === 'takeover') {
          if (!eventMatchesTakeoverCategory(event, takeoverCategory, NOTTING_HILL_CARNIVAL_2026_TAKEOVER)) return false;
          if (takeoverGroup !== 'all' && takeoverGroupForEvent(event, NOTTING_HILL_CARNIVAL_2026_TAKEOVER) !== takeoverGroup) return false;
        }
        if (normalizedQuery && !eventText(event).includes(normalizedQuery)) return false;
        if (cityFilter !== 'all' && event.city?.trim().toLowerCase() !== cityFilter.toLowerCase()) return false;
        if (genreFilter !== 'all' && !(event.genre_tags ?? []).some((tag) => tag.toLowerCase() === genreFilter.toLowerCase())) return false;
        return matchesDateFilter(event, dateFilter);
      });
    },
    [category, cityFilter, dateFilter, experienceMode, filterSourceEvents, genreFilter, query, takeoverCategory, takeoverGroup],
  );
  const takeoverRailEvents = useMemo(
    () => filtered.filter((event) => isPublicActiveEvent(event, takeoverClock.getTime())),
    [filtered, takeoverClock],
  );
  const takeoverSpotlight = takeoverRailEvents[0] ?? filtered[0];
  const takeoverFeaturedPlans = useMemo(
    () => resolveCarnivalFeaturedPlans<EventItem>(
      spotlightQuery.data,
      takeoverRailEvents,
      takeoverSpotlight?.id,
      6,
    ),
    [spotlightQuery.data, takeoverRailEvents, takeoverSpotlight?.id],
  );
  useEffect(() => setBoardLimit(8), [category, cityFilter, dateFilter, experienceMode, genreFilter, query, takeoverCategory, takeoverGroup]);
  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [experienceMode]);
  useEffect(() => {
    if (!takeoverEntryVisible && experienceMode === 'takeover') {
      setExperienceMode('all');
      setTakeoverCategory('all');
      setTakeoverGroup('all');
      setMode('browse');
    }
  }, [experienceMode, takeoverEntryVisible]);

  const mapQuery = useQuery({
    queryKey: ['events-board', 'map-points', 'venue-authority-v4', experienceMode, filtered.map((event) => event.id).join(',')],
    enabled: mode === 'map' && filtered.length > 0,
    queryFn: async (): Promise<EventMapPoint[]> => {
      const campaignCity = experienceMode === 'takeover' ? NOTTING_HILL_CARNIVAL_2026_TAKEOVER.cities[0] : null;
      const geocodeQueries = new Map(filtered.map((event) => [event.id, venueCoordinate(event) ? '' : eventGeocodeQuery(event, campaignCity)]));
      const geo = await geocodeMany([...new Set([...geocodeQueries.values()].filter(Boolean))]);
      const campaignFallbackQuery = campaignCity ? `${campaignCity}, United Kingdom` : null;
      const campaignFallback = campaignFallbackQuery
        ? (await geocodeMany([campaignFallbackQuery])).get(campaignFallbackQuery) ?? null
        : null;
      return filtered.flatMap((event) => {
        const query = geocodeQueries.get(event.id);
        const trusted = venueCoordinate(event);
        const resolved = trusted ?? (query ? geo.get(query) : null);
        const ukResolved = resolved && (trusted || isWithinUnitedKingdom(resolved)) ? resolved : null;
        const hit = campaignCity && (!ukResolved || !isWithinGreaterLondon(ukResolved)) ? campaignFallback : ukResolved;
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

  const spotlight = useMemo(() => {
    const curated = (spotlightQuery.data ?? [])
      .map((item) => item.event)
      .filter((event): event is EventItem => Boolean(event && filtered.some((candidate) => candidate.id === event.id)));
    if (experienceMode === 'all' && takeoverEntryVisible) {
      const takeoverIds = new Set(takeoverEvents.map((event) => event.id));
      // Keep the normal Spotlight admin-curated while avoiding a duplicate of
      // the active Carnival takeover. If the first curated row belongs to the
      // takeover, advance to the next eligible featured event in admin order.
      return curated.find((event) => !takeoverIds.has(event.id));
    }
    return curated[0];
  }, [experienceMode, filtered, spotlightQuery.data, takeoverEntryVisible, takeoverEvents]);

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
    setTakeoverClock(new Date());
    void eventsQuery.refetch();
    void spotlightQuery.refetch();
    void carnivalQuery.refetch();
  };

  const activeFilterCount = Number(experienceMode === 'all' ? category !== 'All events' : takeoverCategory !== 'all')
    + Number(experienceMode === 'takeover' && takeoverGroup !== 'all')
    + Number(query.trim().length > 0)
    + Number(dateFilter !== 'all')
    + Number(cityFilter !== 'all')
    + Number(genreFilter !== 'all');
  const resetFilters = () => {
    setCategory('All events');
    setQuery('');
    setDateFilter('all');
    setCityFilter('all');
    setGenreFilter('all');
    setTakeoverCategory('all');
    setTakeoverGroup('all');
    setOpenFilterDropdown(null);
    setBoardLimit(8);
  };
  const selectEventFilterOption = (key: EventFilterDropdown, value: string) => {
    if (key === 'when') setDateFilter(value as EventDateFilter);
    if (key === 'city') setCityFilter(value);
    if (key === 'genre') setGenreFilter(value);
    setOpenFilterDropdown(null);
  };
  const toggleEventFilterDropdown = (key: EventFilterDropdown) => {
    const next = openFilterDropdown === key ? null : key;
    setOpenFilterDropdown(next);
    if (next) {
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ y: Math.max(0, normalTopStackY + browseUtilitiesY + 70), animated: true });
      });
    }
  };
  const openTakeover = () => {
    resetFilters();
    setFiltersOpen(false);
    setExperienceMode('takeover');
    setMode('browse');
  };
  const exitTakeover = () => {
    resetFilters();
    setFiltersOpen(false);
    setExperienceMode('all');
    setMode('browse');
  };
  const openCarnivalGuide = () => router.push(NOTTING_HILL_CARNIVAL_2026_TAKEOVER.hubHref as any);

  const lp: LightPal = { light, card: cardOverride, title: pal.title, body: pal.body, meta: pal.meta };
  const scrollToTakeoverBoard = () => {
    if (takeoverBoardY == null) {
      scrollRef.current?.scrollToEnd({ animated: true });
      return;
    }
    scrollRef.current?.scrollTo({ y: Math.max(0, takeoverBoardY - 12), animated: true });
  };
  const scrollToNormalBoard = () => {
    if (normalBoardY == null) {
      scrollRef.current?.scrollToEnd({ animated: true });
      return;
    }
    scrollRef.current?.scrollTo({ y: Math.max(0, normalBoardY - 12), animated: true });
  };
  const browseUtilities = (
    <View style={styles.browseUtilities} onLayout={(event) => setBrowseUtilitiesY(event.nativeEvent.layout.y)}>
      <View style={styles.filtersRow}>
        <View style={styles.filterControlPressable}>
          <EdPressable accessibilityRole="button" accessibilityLabel={filtersOpen ? 'Hide event search and filters' : 'Open event search and filters'} accessibilityState={{ expanded: filtersOpen }} onPress={() => {
            setFiltersOpen((current) => !current);
            setOpenFilterDropdown(null);
          }}>
            <View style={[styles.filterGhost, lp.card, filtersOpen && styles.filterGhostActive]}>
              <Text style={[styles.filterGhostText, light && { color: pal.body }, filtersOpen && styles.filterGhostTextActive]}>Search{activeFilterCount ? ` · ${activeFilterCount}` : ''}</Text>
            </View>
          </EdPressable>
        </View>
        <View style={styles.filterControlPressable}>
          <EdPressable accessibilityRole="button" accessibilityLabel="Open event map" onPress={() => setMode('map')}>
            <View style={[styles.filterGhost, lp.card]}>
              <Text style={[styles.filterGhostText, light && { color: pal.body }]}>Map</Text>
            </View>
          </EdPressable>
        </View>
        <View style={styles.filterControlPressable}>
          <EdPressable accessibilityRole="button" accessibilityLabel="Reset event filters" accessibilityState={{ disabled: activeFilterCount === 0 }} disabled={activeFilterCount === 0} onPress={resetFilters}>
            <View style={[styles.filterGhost, lp.card, activeFilterCount === 0 && styles.filterGhostDisabled]}>
              <Text style={[styles.filterGhostText, light && { color: pal.body }]}>Reset</Text>
            </View>
          </EdPressable>
        </View>
      </View>

      {filtersOpen ? (
        <View style={styles.expandedFilters}>
          <View style={[styles.searchBar, light && styles.searchBarLight]}>
            <MaterialIcons name="search" size={21} color={light ? ed.inkMuted : 'rgba(255,248,237,0.66)'} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={() => setMode('browse')}
              accessibilityLabel="Search events, lineups, venues and cities"
              placeholder={experienceMode === 'takeover' ? 'Search Carnival plans, venues and sound systems' : 'Search events, lineups, venues and cities'}
              placeholderTextColor={light ? 'rgba(34,23,15,0.48)' : 'rgba(255,248,237,0.45)'}
              autoCapitalize="none"
              autoCorrect={false}
              maxFontSizeMultiplier={1.15}
              returnKeyType="search"
              style={[styles.searchInput, light && styles.searchInputLight]}
            />
            {query ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Clear event search" onPress={() => setQuery('')} style={styles.searchClear}>
                <MaterialIcons name="close" size={19} color={light ? ed.ink : ed.cream} />
              </Pressable>
            ) : null}
          </View>

          {experienceMode === 'all' ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipWrap}>
              {CATEGORY_CHIPS.map((chip) => (
                <EdPressable
                  key={chip}
                  accessibilityRole="button"
                  accessibilityLabel={`Filter ${chip}`}
                  accessibilityState={{ selected: category === chip }}
                  onPress={() => setCategory(chip)}
                >
                  <View style={[styles.categoryChip, category === chip && styles.categoryChipActive]}>
                    <Text style={[styles.categoryChipText, category === chip && styles.categoryChipTextActive]}>{chip}</Text>
                  </View>
                </EdPressable>
              ))}
            </ScrollView>
          ) : null}

          <View style={[styles.filterPanel, lp.card]}>
            <View style={styles.filterPanelHeading}>
              <Text style={styles.filterPanelEyebrow}>{experienceMode === 'takeover' ? 'PLAN THE ROAD' : 'FIND YOUR NIGHT'}</Text>
              <Text style={[styles.filterPanelCount, light && { color: pal.meta }]}>{filtered.length} RESULTS</Text>
            </View>
            <View style={styles.filterDropdownRow}>
              {eventFilterDropdowns.map((dropdown) => {
                const selectedLabel = dropdown.options.find((option) => option.value === dropdown.value)?.label ?? dropdown.options[0]?.label ?? dropdown.label;
                return (
                  <FilterDropdownField
                    key={dropdown.key}
                    label={dropdown.label}
                    selectedLabel={selectedLabel}
                    options={dropdown.options}
                    value={dropdown.value}
                    open={openFilterDropdown === dropdown.key}
                    onToggle={() => toggleEventFilterDropdown(dropdown.key)}
                    onSelect={(value) => selectEventFilterOption(dropdown.key, value)}
                    light={light}
                  />
                );
              })}
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={[styles.screen, { backgroundColor: pal.screen }]}>
      <StatusBar style={light ? 'dark' : 'light'} translucent />
      <DiscoveryHeader />
      <ScrollView
        ref={scrollRef}
        accessibilityLabel="Events discovery"
        style={[styles.screen, { backgroundColor: pal.screen }]}
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={ed.orange} />}
        contentContainerStyle={{
          paddingTop: 4,
          paddingBottom: bottomInset,
          paddingHorizontal: 16,
          gap: experienceMode === 'takeover' ? 0 : 24,
        }}
      >
        {experienceMode === 'takeover' ? (
          <TakeoverModeHeader onAllEvents={exitTakeover} />
        ) : null}

        {experienceMode === 'all' && mode === 'browse' ? (
          <View style={styles.normalTopStack} onLayout={(event) => setNormalTopStackY(event.nativeEvent.layout.y)}>
            {takeoverEntryVisible ? (
              <TakeoverEntry
                phase={takeoverPhase}
                total={takeoverEvents.length}
                artwork={CARNIVAL_SHARE_ARTWORK_URL}
                onOpen={openTakeover}
                onGuide={openCarnivalGuide}
              />
            ) : null}
            {browseUtilities}
          </View>
        ) : null}

        {mode === 'map' ? (
          <View style={[styles.mapWrap, experienceMode === 'takeover' && styles.takeoverMapWrap]}>
            <EdPressable accessibilityRole="button" accessibilityLabel="Back to Events" onPress={() => setMode('browse')}>
              <View style={[styles.mapBackButton, lp.card]}>
                <MaterialIcons name="arrow-back" size={19} color={light ? ed.ink : ed.cream} />
                <Text style={[styles.mapBackButtonText, light && { color: pal.title }]}>Back to Events</Text>
              </View>
            </EdPressable>
            <EventsMap
              points={mapQuery.data ?? []}
              count={(mapQuery.data ?? []).length}
              loading={mapQuery.isLoading}
              onActiveEventChange={setActiveMapEventId}
              onSelectEvent={(id) => router.push(`/events/${id}` as any)}
            />
            <MapRecommendationRail events={mapRecommendations} lp={lp} onBrowseAll={() => setMode('browse')} />
          </View>
        ) : eventsQuery.isLoading ? (
          <PremiumSkeleton compact label="Loading events..." />
        ) : eventsQuery.isError ? (
          <View accessibilityRole="alert" style={[styles.emptyPanel, lp.card]}>
            <Text style={[styles.emptyTitle, { color: pal.title }]}>The event board did not load</Text>
            <Text style={[styles.emptyText, light && { color: pal.body }]}>Check your connection and try the live listings again.</Text>
            <EdPressable accessibilityRole="button" accessibilityLabel="Retry loading events" onPress={() => eventsQuery.refetch()}>
              <View style={styles.emptyAction}>
                <Text style={styles.emptyActionText}>Try again</Text>
              </View>
            </EdPressable>
          </View>
        ) : experienceMode === 'takeover' ? (
          <>
            <TakeoverDiscovery
              events={filtered}
              featuredPlans={takeoverFeaturedPlans}
              spotlight={takeoverSpotlight}
              category={takeoverCategory}
              group={takeoverGroup}
              groupCounts={takeoverGroupCounts}
              lp={lp}
              onCategoryChange={setTakeoverCategory}
              onGroupChange={setTakeoverGroup}
              onOpenMap={() => setMode('map')}
              onSeeAllPlans={scrollToTakeoverBoard}
            />
            {filtered.length ? (
              <View style={styles.takeoverBoardWrap} onLayout={(event) => setTakeoverBoardY(event.nativeEvent.layout.y)}>
                <CompactEventBoard
                  events={filtered}
                  limit={boardLimit}
                  lp={lp}
                  heading="All Carnival Events"
                  onShowMore={() => setBoardLimit((count) => Math.min(filtered.length, count + 8))}
                />
              </View>
            ) : null}
          </>
        ) : filtered.length ? (
          <>
            {spotlight ? <EventSpotlight event={spotlight} /> : null}
            <UpcomingPosterRail events={filtered} lp={lp} />
            <View style={styles.mobileListGroup}>
              <BrowseFastList events={filtered.slice(0, 12)} lp={lp} />
              {filtered.length > 12 ? (
                <EdPressable accessibilityRole="button" accessibilityLabel={`View all ${filtered.length} events`} onPress={scrollToNormalBoard}>
                  <View style={styles.viewAllEventsButton}>
                    <Text style={styles.viewAllEventsText}>View all {filtered.length} events</Text>
                  </View>
                </EdPressable>
              ) : null}
            </View>
            <LocalSceneRail
              events={filtered}
              lp={lp}
              onSelectCity={(city) => {
                setCityFilter(city);
                setFiltersOpen(true);
              }}
            />
            <View onLayout={(event) => setNormalBoardY(event.nativeEvent.layout.y)}>
              <CompactEventBoard
                events={filtered}
                limit={boardLimit}
                lp={lp}
                heading="Event Board"
                onShowMore={() => setBoardLimit((count) => Math.min(filtered.length, count + 8))}
              />
            </View>
          </>
        ) : (
          <View style={[styles.emptyPanel, lp.card]}>
            <Text style={[styles.emptyTitle, { color: pal.title }]}>No events match</Text>
            <Text style={[styles.emptyText, light && { color: pal.body }]}>
              {query.trim() ? `Nothing on the live board matches “${query.trim()}” with these filters.` : 'No events match this filter set yet. Try another city, genre or date.'}
            </Text>
            <EdPressable accessibilityRole="button" accessibilityLabel="Clear event search and filters" onPress={resetFilters}>
              <View style={styles.emptyAction}>
                <Text style={styles.emptyActionText}>Clear filters</Text>
              </View>
            </EdPressable>
          </View>
        )}

        {mode === 'browse' && experienceMode === 'all' ? (
          <>
            {/* Open Opportunities */}
            <EdPressable
              accessibilityRole="button"
              accessibilityLabel="Browse open music opportunities"
              onPress={() => router.push('/opportunities' as any)}
            >
              <View style={[styles.opsPanel, styles.opportunitiesPanel, lp.card]}>
                <View style={styles.opsHeadRow}>
                  <MaterialIcons name="auto-awesome" size={17} color={ed.orange} />
                  <Text style={[styles.opsTitle, { color: pal.title }]}>Open Opportunities</Text>
                  <MaterialIcons name="arrow-forward" size={18} color={ed.orange} style={styles.opsArrow} />
                </View>
                <Text style={[styles.opsBody, light && { color: pal.body }]}>Explore verified funding, showcases, programmes and industry openings for music creatives.</Text>
                <Text style={styles.opsCta}>Find your next opportunity</Text>
              </View>
            </EdPressable>

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
  normalTopStack: { gap: 8 },
  browseUtilities: {
    gap: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,248,237,0.1)',
    backgroundColor: 'rgba(18,19,24,0.94)',
    padding: 6,
  },
  expandedFilters: { gap: 12 },
  mapWrap: { gap: 12 },
  takeoverMapWrap: { gap: 18, paddingTop: 16 },
  mapBackButton: {
    minHeight: 44,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,248,237,0.14)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  mapBackButtonText: { fontFamily: edFonts.bodyBold, fontSize: 12.5, color: ed.cream },
  takeoverBoardWrap: { marginTop: 30 },
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

  searchBar: {
    minHeight: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,248,237,0.16)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingLeft: 15,
    paddingRight: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchBarLight: { backgroundColor: '#FFFFFF', borderColor: 'rgba(91,56,31,0.18)' },
  searchInput: { flex: 1, minWidth: 0, height: 48, paddingVertical: 0, color: ed.cream, fontFamily: edFonts.bodyMedium, fontSize: 16 },
  searchInputLight: { color: ed.ink },
  searchClear: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },

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

  chipWrap: { flexDirection: 'row', gap: 6, paddingRight: 18 },
  categoryChip: {
    minHeight: 35,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,248,237,0.16)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryChipActive: { backgroundColor: ed.orange, borderColor: ed.orange },
  categoryChipText: { fontFamily: edFonts.bodyBold, fontSize: 12.5, color: ed.cream },
  categoryChipTextActive: { color: '#ffffff' },
  loadMoreButton: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: 'rgba(255,102,0,0.48)',
    borderRadius: 5,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,102,0,0.08)',
  },
  loadMoreText: { fontFamily: edFonts.bodyBlack, fontSize: 13.5, color: ed.orange },
  loadMoreCount: { fontFamily: edFonts.bodyBlack, fontSize: 9.5, letterSpacing: 0.8, color: 'rgba(255,248,237,0.52)' },
  viewAllEventsButton: { minHeight: 44, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,126,46,0.38)', backgroundColor: 'rgba(255,126,46,0.1)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  viewAllEventsText: { fontFamily: edFonts.bodyBlack, fontSize: 12.5, color: '#FFD8BB' },
  mobileListGroup: { gap: 12 },

  filtersRow: { width: '100%', flexDirection: 'row', gap: 4 },
  filterControlPressable: { flex: 1, minWidth: 0 },
  filterGhost: {
    width: '100%',
    minHeight: 35,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,248,237,0.1)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterGhostText: { fontFamily: edFonts.bodyBold, fontSize: 12.5, color: 'rgba(255,248,237,0.8)' },
  filterGhostActive: { backgroundColor: ed.orange, borderColor: ed.orange },
  filterGhostTextActive: { color: '#2B1607' },
  filterGhostDisabled: { opacity: 0.42 },
  filterPanel: { borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,248,237,0.12)', backgroundColor: 'rgba(24,14,8,0.72)', paddingVertical: 12, gap: 9 },
  filterPanelHeading: { paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  filterPanelEyebrow: { fontFamily: edFonts.bodyBlack, fontSize: 9.5, letterSpacing: 1.35, color: ed.orange },
  filterPanelCount: { fontFamily: edFonts.mono, fontSize: 9.5, letterSpacing: 1, color: 'rgba(255,248,237,0.52)' },
  filterDropdownRow: { paddingHorizontal: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  filterDropdownColumn: { position: 'relative', flex: 1, minWidth: 0, gap: 5 },
  filterDropdownColumnOpen: { zIndex: 40, elevation: 40 },
  filterDropdownField: { width: '100%', minHeight: 40, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,248,237,0.15)', backgroundColor: 'rgba(255,255,255,0.055)', paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4 },
  filterDropdownFieldLight: { borderColor: 'rgba(91,56,31,0.18)', backgroundColor: '#FFF9F0' },
  filterDropdownFieldOpen: { borderColor: ed.orange, backgroundColor: 'rgba(255,102,0,0.1)' },
  filterDropdownLabel: { fontFamily: edFonts.bodyBlack, fontSize: 8.5, letterSpacing: 0.95, textTransform: 'uppercase', color: 'rgba(255,248,237,0.52)' },
  filterDropdownLabelLight: { color: 'rgba(34,23,15,0.55)' },
  filterDropdownValue: { flex: 1, minWidth: 0, fontFamily: edFonts.bodyBlack, fontSize: 10.5, lineHeight: 14, letterSpacing: 0.35, color: ed.cream, textTransform: 'uppercase' },
  filterDropdownValueLight: { color: ed.ink },
  filterDropdownMenu: { position: 'absolute', top: 58, left: 0, right: 0, zIndex: 50, elevation: 50, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,102,0,0.42)', backgroundColor: '#18100B', overflow: 'hidden' },
  filterDropdownMenuLight: { borderColor: 'rgba(176,63,0,0.3)', backgroundColor: '#FFF9F0' },
  filterDropdownScroll: { maxHeight: 184 },
  filterDropdownOptions: { padding: 4, gap: 2 },
  filterDropdownOption: { minHeight: 35, borderRadius: 8, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 5 },
  filterDropdownOptionLight: { backgroundColor: 'rgba(91,56,31,0.035)' },
  filterDropdownOptionActive: { backgroundColor: 'rgba(255,102,0,0.13)' },
  filterDropdownOptionText: { flex: 1, fontFamily: edFonts.bodyBold, fontSize: 10.5, letterSpacing: 0.35, color: ed.cream, textTransform: 'uppercase' },
  filterDropdownOptionTextLight: { color: ed.ink },
  filterDropdownOptionTextActive: { color: ed.orange },
  pressed: { opacity: 0.8 },

  fastListSection: { gap: 8 },
  browseHeadRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  eventListEyebrow: { fontFamily: edFonts.bodyBlack, fontSize: 11, letterSpacing: 1.4, color: ed.orange },
  browseFastTitle: { fontFamily: EVENTS_SERIF_FONT, fontSize: 20, lineHeight: 22, color: '#fff8ed', marginTop: 2 },
  showingText: { fontFamily: edFonts.mono, fontSize: 10, letterSpacing: 1.4, color: 'rgba(255,248,237,0.55)' },

  fastRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,248,237,0.1)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 7,
    paddingVertical: 5,
  },
  fastCopy: { flex: 1, minWidth: 0 },
  fastThumbWrap: { width: 40, height: 40, borderRadius: 12, overflow: 'hidden', backgroundColor: '#1d1712' },
  fastThumb: { width: '100%', height: '100%' },
  fastTitle: { fontFamily: EVENTS_SERIF_FONT, fontSize: 14.5, lineHeight: 17, color: '#ffffff' },
  fastMeta: { marginTop: 2, fontFamily: edFonts.bodyMedium, fontSize: 12.5, lineHeight: 15, color: 'rgba(255,248,237,0.66)' },
  fastVenue: { fontFamily: edFonts.bodyMedium, fontSize: 12.5, lineHeight: 15, color: 'rgba(255,248,237,0.5)' },
  viewPill: {
    minHeight: 24,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,102,0,0.38)',
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewPillText: { fontFamily: edFonts.bodyBold, fontSize: 10.5, color: ed.orange },

  spotlightCard: {
    minHeight: 340,
    borderRadius: 16,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    backgroundColor: '#08090b',
    borderWidth: 1,
    borderColor: 'rgba(255,248,237,0.13)',
  },
  spotlightArtworkFallback: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  spotlightBody: { minHeight: 340, justifyContent: 'flex-end', padding: 16, gap: 10 },
  spotlightEyebrowPill: { position: 'absolute', top: 16, left: 16, minHeight: 29, alignSelf: 'flex-start', justifyContent: 'center', borderRadius: 999, backgroundColor: ed.orange, paddingHorizontal: 11 },
  spotlightEyebrow: { fontFamily: edFonts.bodyBlack, fontSize: 9.5, letterSpacing: 1.15, color: '#2B1607' },
  spotlightTitle: { maxWidth: 350, fontFamily: EVENTS_SERIF_FONT, fontSize: 34, lineHeight: 35, color: '#ffffff', letterSpacing: -0.72 },
  spotlightDescription: { maxWidth: 345, fontFamily: edFonts.bodyMedium, fontSize: 12.5, lineHeight: 18, color: 'rgba(255,248,237,0.74)' },
  spotlightMetaWrap: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 12, rowGap: 7 },
  spotlightMetaRow: { maxWidth: '100%', flexDirection: 'row', alignItems: 'center', gap: 5, minWidth: 0 },
  spotlightMeta: { fontFamily: edFonts.bodyMedium, fontSize: 11, color: 'rgba(255,248,237,0.76)' },
  spotlightMetaVenue: { flexShrink: 1, minWidth: 0 },
  spotlightCtaRow: { flexDirection: 'row', gap: 9, marginTop: 2 },
  spotlightPrimaryPressable: { flexGrow: 0, flexShrink: 0, flexBasis: 138, width: 138, maxWidth: 138 },
  spotlightPrimaryPressableWide: { flex: 1, flexBasis: 0, width: undefined, maxWidth: undefined },
  spotlightSecondaryPressable: { flex: 1, minWidth: 0 },
  openEventCta: {
    alignSelf: 'stretch',
    minHeight: 48,
    borderRadius: 999,
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
    borderRadius: 999,
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

  upcomingTitle: { fontFamily: EVENTS_SERIF_FONT, fontSize: 27, lineHeight: 29, color: '#ffffff', letterSpacing: -0.45 },
  upcomingSub: { fontFamily: edFonts.bodyMedium, fontSize: 12.5, color: 'rgba(255,248,237,0.62)', marginTop: 2 },
  posterRail: { gap: 20, paddingRight: 52 },
  posterCard: { width: 268, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,248,237,0.11)', backgroundColor: '#111318' },
  posterArtwork: { width: '100%', aspectRatio: 3 / 4, overflow: 'hidden', backgroundColor: '#241a12' },
  posterDateBadge: { position: 'absolute', left: 13, top: 13, minWidth: 46, borderRadius: 11, borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)', backgroundColor: 'rgba(0,0,0,0.66)', paddingHorizontal: 8, paddingVertical: 6, alignItems: 'center' },
  posterMonth: { fontFamily: edFonts.bodyBlack, fontSize: 10.5, letterSpacing: 1.15, color: ed.orange },
  posterDay: { marginTop: 1, fontFamily: edFonts.bodyBlack, fontSize: 18, lineHeight: 20, color: '#FFFFFF' },
  posterOverlayCopy: { position: 'absolute', left: 16, right: 16, bottom: 16, gap: 3 },
  posterVenue: { fontFamily: edFonts.bodyBlack, fontSize: 10.5, letterSpacing: 0.35, color: ed.orange },
  posterTitle: { fontFamily: EVENTS_SERIF_FONT, fontSize: 18.5, lineHeight: 20.5, color: '#ffffff' },
  posterFooter: { minHeight: 42, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  posterFooterStatus: { flex: 1, minWidth: 0, fontFamily: edFonts.bodyMedium, fontSize: 11.5, color: 'rgba(255,248,237,0.62)' },
  posterApplyPill: { borderRadius: 999, backgroundColor: 'rgba(255,102,0,0.15)', paddingHorizontal: 9, paddingVertical: 5, fontFamily: edFonts.bodyBold, fontSize: 10.5, color: ed.orange },

  mapRecommendations: { gap: 14, marginTop: 2 },
  mapRecommendationHead: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 14 },
  mapRecommendationHeadingCopy: { flex: 1, minWidth: 0, gap: 3 },
  mapRecommendationEyebrow: { fontFamily: edFonts.bodyBlack, fontSize: 9.5, letterSpacing: 1.35, color: ed.orange },
  mapRecommendationTitle: { fontFamily: EVENTS_SERIF_FONT, fontSize: 26, lineHeight: 28, letterSpacing: -0.45, color: '#ffffff' },
  mapRecommendationSub: { fontFamily: edFonts.bodyMedium, fontSize: 12, lineHeight: 17, color: 'rgba(255,248,237,0.58)' },
  mapBrowseAllButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 4 },
  mapBrowseAllText: { fontFamily: edFonts.bodyBlack, fontSize: 12, color: ed.orange },
  mapRecommendationRail: { gap: 12, paddingRight: 20 },
  mapRecommendationCard: { width: 224, minHeight: 252, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,248,237,0.12)', backgroundColor: '#15100c' },
  mapRecommendationArtwork: { height: 132, overflow: 'hidden', backgroundColor: '#26170f' },
  mapRecommendationArrow: { position: 'absolute', right: 11, bottom: 11, width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: ed.orange },
  mapRecommendationBody: { flex: 1, paddingHorizontal: 13, paddingTop: 11, paddingBottom: 13, gap: 6 },
  mapRecommendationMetaDate: { fontFamily: edFonts.mono, fontSize: 9.5, lineHeight: 14, letterSpacing: 0.3, color: ed.orange, textTransform: 'uppercase' },
  mapRecommendationCardTitle: { fontFamily: EVENTS_SERIF_FONT, fontSize: 20, lineHeight: 22, color: '#ffffff' },
  mapRecommendationMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, minWidth: 0 },
  mapRecommendationMeta: { flex: 1, fontFamily: edFonts.bodyMedium, fontSize: 11.5, color: 'rgba(255,248,237,0.62)' },
  mapRecommendationPrice: { fontFamily: edFonts.bodyBlack, fontSize: 10.5, letterSpacing: 0.35, color: 'rgba(255,248,237,0.48)' },

  localSceneSection: { gap: 20 },
  localSceneTitle: { fontFamily: EVENTS_SERIF_FONT, fontSize: 24, lineHeight: 26, color: '#FFFFFF', letterSpacing: -0.4 },
  localSceneSub: { marginTop: 2, fontFamily: edFonts.bodyMedium, fontSize: 12.5, lineHeight: 18, color: 'rgba(255,248,237,0.6)' },
  localSceneRail: { gap: 12, paddingRight: 20 },
  localSceneCard: { width: 210, height: 126, borderRadius: 12, overflow: 'hidden', justifyContent: 'flex-end', backgroundColor: '#1d1712' },
  localSceneCopy: { padding: 14, gap: 2 },
  localSceneCity: { fontFamily: EVENTS_SERIF_FONT, fontStyle: 'italic', fontSize: 24, lineHeight: 26, color: '#FFFFFF' },
  localSceneCount: { fontFamily: edFonts.bodyBold, fontSize: 11.5, color: 'rgba(255,248,237,0.72)' },

  compactBoardSection: { gap: 14 },
  compactBoardHeading: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  compactBoardTitle: { flex: 1, fontFamily: EVENTS_SERIF_FONT, fontSize: 24, lineHeight: 26, color: '#FFFFFF', letterSpacing: -0.45 },
  compactBoardGrid: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'stretch', justifyContent: 'space-between', rowGap: 12 },
  compactBoardCard: { width: '48.2%', borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,248,237,0.11)', backgroundColor: '#121116' },
  compactBoardArtwork: { width: '100%', aspectRatio: 4 / 3, overflow: 'hidden', backgroundColor: '#241a12' },
  compactBoardSoonPill: { position: 'absolute', left: 9, bottom: 8, minHeight: 25, borderRadius: 999, justifyContent: 'center', backgroundColor: ed.orange, paddingHorizontal: 8 },
  compactBoardSoonText: { fontFamily: edFonts.bodyBlack, fontSize: 9, letterSpacing: 0.65, color: '#2B1607' },
  compactBoardBody: { minHeight: 78, paddingHorizontal: 11, paddingTop: 8, paddingBottom: 7, gap: 3 },
  compactBoardDate: { fontFamily: edFonts.mono, fontSize: 9, lineHeight: 11.5, letterSpacing: 0.2, color: '#EFB083', textTransform: 'uppercase' },
  compactBoardEventTitle: { fontFamily: EVENTS_SERIF_FONT, fontSize: 15, lineHeight: 16.5, color: '#FFFFFF', letterSpacing: -0.15 },
  compactBoardVenue: { fontFamily: edFonts.bodyMedium, fontSize: 10.5, lineHeight: 14, color: 'rgba(255,248,237,0.58)' },
  compactBoardFooter: { minHeight: 44, marginHorizontal: 9, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,248,237,0.12)' },
  compactBoardFooterAction: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  compactBoardTicket: { flex: 1, minWidth: 0, fontFamily: edFonts.bodyBlack, fontSize: 10.5, color: 'rgba(255,248,237,0.58)' },

  takeoverEntry: { minHeight: 190, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,126,46,0.42)', backgroundColor: '#180A04' },
  // PluggdImage owns its internal fade opacity, so the parity opacity belongs
  // on a wrapper. This mirrors the accepted web layer (`opacity-38`) without
  // being overwritten once the image finishes loading.
  takeoverEntryArtwork: { opacity: 0.38 },
  takeoverEntryCopy: { flex: 1, justifyContent: 'flex-end', padding: 14, gap: 5 },
  takeoverEntryEyebrow: { fontFamily: edFonts.mono, fontSize: 9, lineHeight: 13, letterSpacing: 0.65, color: '#FFB17A' },
  takeoverEntryTitle: { maxWidth: 350, fontFamily: EVENTS_SERIF_FONT, fontSize: 26, lineHeight: 27, letterSpacing: -0.5, color: '#FFFFFF' },
  takeoverEntryBody: { maxWidth: 355, fontFamily: edFonts.bodyMedium, fontSize: 11.5, lineHeight: 16, color: 'rgba(255,248,237,0.8)' },
  takeoverEntryActions: { flexDirection: 'row', gap: 8, marginTop: 1 },
  takeoverEntryPrimarySlot: { flex: 1.18, minWidth: 0 },
  takeoverEntryPrimary: { width: '100%', minHeight: 44, borderRadius: 999, backgroundColor: ed.orange, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  takeoverEntryPrimaryText: { flexShrink: 1, fontFamily: edFonts.bodyBlack, fontSize: 11.5, color: '#2B1607' },
  takeoverEntrySecondarySlot: { flex: 1, minWidth: 0 },
  takeoverEntrySecondary: { width: '100%', minHeight: 44, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,248,237,0.22)', backgroundColor: 'rgba(8,5,3,0.62)', paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  takeoverEntrySecondaryText: { fontFamily: edFonts.bodyBlack, fontSize: 11.5, color: '#FFFFFF' },

  takeoverHeader: { marginHorizontal: -1, backgroundColor: '#080808', paddingTop: 8, paddingBottom: 14, gap: 13 },
  takeoverModeSwitch: { alignSelf: 'flex-start', flexDirection: 'row', gap: 6, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,248,237,0.12)', backgroundColor: '#050505', padding: 4 },
  takeoverModeTab: { minHeight: 44, borderRadius: 999, paddingHorizontal: 17, alignItems: 'center', justifyContent: 'center' },
  takeoverModeTabText: { fontFamily: edFonts.bodyBlack, fontSize: 12.5, color: 'rgba(255,248,237,0.78)' },
  takeoverModeTabActive: { minHeight: 44, borderRadius: 999, backgroundColor: ed.orange, paddingHorizontal: 17, alignItems: 'center', justifyContent: 'center' },
  takeoverModeTabActiveText: { fontFamily: edFonts.bodyBlack, fontSize: 12.5, color: '#2B1607' },
  takeoverRoadLine: { fontFamily: EVENTS_SERIF_FONT, fontSize: 16.5, lineHeight: 21, color: 'rgba(255,248,237,0.88)' },
  takeoverRoadLineStrong: { fontFamily: EVENTS_SERIF_FONT, fontWeight: '700', color: '#FF9A55' },

  takeoverDiscovery: { gap: 24, paddingTop: 12, paddingBottom: 10, borderRadius: 18, overflow: 'hidden', backgroundColor: '#1B1C22' },
  takeoverTopPick: { minHeight: 248, flexDirection: 'row', overflow: 'hidden', borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(255,248,237,0.12)', backgroundColor: '#080808' },
  takeoverTopPickCopy: { width: '48%', minWidth: 0, justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 18, gap: 8 },
  takeoverTopPickArtwork: { flex: 1, minWidth: 0, alignSelf: 'stretch', backgroundColor: '#1a1512' },
  takeoverTopPickEyebrow: { fontFamily: edFonts.mono, fontSize: 9.5, letterSpacing: 1.1, color: ed.orange },
  takeoverTopPickTitle: { fontFamily: EVENTS_SERIF_FONT, fontSize: 24, lineHeight: 23.5, letterSpacing: -0.55, color: '#FFFFFF' },
  takeoverTopPickMeta: { fontFamily: edFonts.mono, fontSize: 9, lineHeight: 14, color: 'rgba(255,248,237,0.7)', textTransform: 'uppercase' },
  takeoverTopPickBody: { fontFamily: edFonts.bodyMedium, fontSize: 11.5, lineHeight: 16, color: 'rgba(255,248,237,0.7)' },
  takeoverTextAction: { minHeight: 44, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5 },
  takeoverTextActionLabel: { fontFamily: edFonts.bodyBlack, fontSize: 12.5, color: ed.orange },

  featuredPlansSection: { gap: 13 },
  featuredPlansHeading: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  featuredPlansTitle: { flex: 1, fontFamily: EVENTS_SERIF_FONT, fontSize: 28, lineHeight: 30, letterSpacing: -0.6, color: '#FFFFFF' },
  featuredPlansAction: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6 },
  featuredPlansHint: { fontFamily: edFonts.bodyBlack, fontSize: 11.5, color: ed.orange },
  featuredPlansRail: { alignItems: 'flex-end', gap: 12, paddingRight: 80, paddingBottom: 2 },
  featuredPlanCard: { overflow: 'hidden', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,248,237,0.12)', backgroundColor: '#101010' },
  featuredPlanWide: { width: 185 },
  featuredPlanNarrow: { width: 155 },
  featuredPlanArtwork: { overflow: 'hidden', backgroundColor: '#1a1512' },
  featuredPlanArtworkTall: { height: 148 },
  featuredPlanArtworkShort: { height: 108 },
  featuredPlanArtworkMedium: { height: 133 },
  featuredPlanBody: { paddingHorizontal: 10, paddingTop: 9, paddingBottom: 8, gap: 4 },
  featuredPlanDate: { fontFamily: edFonts.mono, fontSize: 9, lineHeight: 13, color: ed.orange, textTransform: 'uppercase' },
  featuredPlanTitle: { fontFamily: EVENTS_SERIF_FONT, fontSize: 20.5, lineHeight: 21, letterSpacing: -0.3, color: '#FFFFFF' },
  featuredPlanVenue: { fontFamily: edFonts.bodyMedium, fontSize: 11, color: 'rgba(255,248,237,0.62)' },
  featuredPlanAction: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 5 },
  featuredPlanActionText: { fontFamily: edFonts.bodyBlack, fontSize: 11.5, color: ed.orange },

  takeoverFilterPanel: { marginHorizontal: -16, borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(255,248,237,0.09)', backgroundColor: 'rgba(255,255,255,0.025)', paddingVertical: 12, gap: 12 },
  takeoverFilterRail: { gap: 8, paddingHorizontal: 16, paddingRight: 38 },
  takeoverGroupRail: { gap: 8, paddingHorizontal: 16, paddingRight: 38, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,248,237,0.09)' },
  takeoverFilterChip: { minHeight: 44, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,248,237,0.15)', backgroundColor: 'rgba(255,255,255,0.04)', paddingHorizontal: 15, alignItems: 'center', justifyContent: 'center' },
  takeoverFilterChipActive: { backgroundColor: ed.orange, borderColor: ed.orange },
  takeoverFilterChipText: { fontFamily: edFonts.bodyBlack, fontSize: 12.5, color: 'rgba(255,248,237,0.78)' },
  takeoverFilterChipTextActive: { color: '#2B1607' },
  takeoverGroupChip: { minHeight: 44, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,248,237,0.13)', paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  takeoverGroupChipActive: { backgroundColor: ed.orange, borderColor: ed.orange },
  takeoverGroupChipText: { fontFamily: edFonts.mono, fontSize: 9.5, letterSpacing: 0.5, textTransform: 'uppercase', color: 'rgba(255,248,237,0.64)' },
  takeoverGroupChipTextActive: { color: '#2B1607' },

  programmeHeading: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  programmeEyebrow: { fontFamily: edFonts.mono, fontSize: 9.5, letterSpacing: 1.1, color: ed.orange },
  programmeTitle: { marginTop: 3, fontFamily: EVENTS_SERIF_FONT, fontSize: 30, lineHeight: 32, letterSpacing: -0.52, color: '#FFFFFF' },
  programmeDay: { overflow: 'hidden', borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(255,248,237,0.13)', backgroundColor: '#090909' },
  programmeDayHeader: { minHeight: 84, overflow: 'hidden', justifyContent: 'flex-end' },
  programmeDayCopy: { paddingHorizontal: 16, paddingVertical: 14, gap: 2 },
  programmeWeekday: { fontFamily: edFonts.mono, fontSize: 9.5, letterSpacing: 1, color: ed.orange, textTransform: 'uppercase' },
  programmeDayTitle: { fontFamily: EVENTS_SERIF_FONT, fontSize: 30, lineHeight: 32, color: '#FFFFFF' },
  programmeRows: { paddingHorizontal: 16 },
  programmeRow: { minHeight: 100, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,248,237,0.12)' },
  programmeRowArtwork: { width: 70, height: 70, borderRadius: 14, overflow: 'hidden', backgroundColor: '#1a1512' },
  programmeRowArtworkCircle: { height: 64, borderRadius: 35 },
  programmeRowArtworkCompact: { height: 75, borderRadius: 9 },
  programmeRowCopy: { flex: 1, minWidth: 0, gap: 3 },
  programmeRowMeta: { fontFamily: edFonts.mono, fontSize: 9, lineHeight: 13, color: ed.orange, textTransform: 'uppercase' },
  programmeRowTitle: { fontFamily: EVENTS_SERIF_FONT, fontSize: 20, lineHeight: 20.5, letterSpacing: -0.2, color: '#FFFFFF' },
  programmeRowVenue: { fontFamily: edFonts.bodyMedium, fontSize: 12, color: 'rgba(255,248,237,0.66)' },
  programmeRowArrow: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,102,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  programmeFooter: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 4 },
  programmeViewAllAction: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6 },
  programmeFooterText: { fontFamily: edFonts.bodyBlack, fontSize: 13, color: ed.orange },
  programmeMapButton: { minHeight: 44, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,248,237,0.16)', paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 7 },
  programmeMapButtonText: { fontFamily: edFonts.bodyBlack, fontSize: 12.5, color: ed.cream },

  emptyPanel: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,248,237,0.14)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: 18,
    gap: 9,
  },
  emptyTitle: { fontFamily: EVENTS_SERIF_FONT, fontSize: 23, color: '#FFFFFF' },
  emptyText: { fontFamily: edFonts.bodyMedium, fontSize: 13.5, lineHeight: 19, color: 'rgba(255,248,237,0.66)' },
  emptyAction: { minHeight: 46, marginTop: 4, alignSelf: 'flex-start', borderRadius: 5, backgroundColor: ed.orange, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  emptyActionText: { fontFamily: edFonts.bodyBlack, fontSize: 13, color: '#2B1607' },

  opsPanel: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,248,237,0.12)',
    backgroundColor: 'rgba(28,16,9,0.6)',
    padding: 18,
    gap: 8,
  },
  opportunitiesPanel: { borderColor: 'rgba(255,102,0,0.30)', backgroundColor: 'rgba(255,102,0,0.07)' },
  opsHeadRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  opsArrow: { marginLeft: 'auto' },
  opsTitle: { fontFamily: edFonts.bodyBlack, fontSize: 17, color: '#ffffff' },
  opsBody: { fontFamily: edFonts.bodyMedium, fontSize: 13, lineHeight: 19, color: 'rgba(255,248,237,0.66)' },
  opsCta: { color: ed.orange, fontFamily: edFonts.bodyBlack, fontSize: 12.5 },
});
