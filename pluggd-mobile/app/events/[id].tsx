import { MaterialIcons } from '@expo/vector-icons';
import { pluggdFonts } from '../../src/design/typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { PremiumScreenBackdrop } from '../../components/PluggdPrimitives';
import { DetailTitle } from '../../components/DetailTitle';
import { RecoveryState } from '../../components/ContentUI';
import { PluggdImage } from '../../src/components/PluggdImage';
import { formatDate, formatGBP, type EventItem } from '../../src/lib/mobileContent';
import { addEventComment, loadEventCultureContext, loadEventDetail, setEventRsvp } from '../../src/features/culture/mobileServices';
import { MobileStoriesRail } from '../../src/features/culture/MobileStoriesRail';
import { cancelEventLocalReminder, scheduleEventLocalReminder } from '../../src/lib/localNotifications';
import { openHostedCheckout, reconcileHostedCheckout, useCommercePolicy } from '../../src/commerce/policy';
import { supabase } from '../../src/lib/supabase';
import { eventTicketPriceLabel, externalTicketProvider, hasEligibleExternalTickets, openExternalEventTickets } from '../../src/lib/eventTickets';
import { useBottomChromeInset } from '../../src/design/useBottomChromeInset';
import { usePluggdTheme } from '../../src/design/usePluggdTheme';

function eventStatus(event: Pick<EventItem, 'starts_at' | 'ends_at' | 'occurrence_status'>) {
  const explicit = String(event.occurrence_status || '').toLowerCase();
  if (['cancelled', 'canceled'].includes(explicit)) return 'Cancelled';
  const now = Date.now();
  const start = event.starts_at ? new Date(event.starts_at).getTime() : Number.NaN;
  const end = event.ends_at ? new Date(event.ends_at).getTime() : Number.NaN;
  if (Number.isFinite(start) && start > now) return 'Upcoming';
  if (Number.isFinite(start) && start <= now && (!Number.isFinite(end) || end >= now)) return 'Happening now';
  return Number.isFinite(end) && end < now ? 'Ended' : 'Date TBA';
}

function eventDateTime(value: string | null | undefined) {
  if (!value) return 'Date TBA';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date TBA';
  return date.toLocaleString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function launchExternalTickets(event: Pick<EventItem, 'id' | 'title' | 'ticket_url'>, sourceSurface: string) {
  try {
    const opened = await openExternalEventTickets({
      eventId: event.id,
      eventTitle: event.title,
      ticketUrl: event.ticket_url,
      sourceSurface,
    });
    if (!opened) Alert.alert('Ticket page unavailable', 'The organiser’s ticket page could not be opened. Please try again.');
    return opened;
  } catch {
    Alert.alert('Ticket page unavailable', 'The organiser’s ticket page could not be opened. Please try again.');
    return false;
  }
}

export default function EventDetailScreen() {
  const bottomInset = useBottomChromeInset();
  const theme = usePluggdTheme();
  const styles = useEventDetailStyles();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState('');
  const detail = useQuery({
    queryKey: ['culture', 'event-detail', id],
    queryFn: () => loadEventDetail(String(id)),
    enabled: !!id,
  });
  const culture = useQuery({
    queryKey: ['culture', 'event-context', id],
    queryFn: () => loadEventCultureContext(String(id)),
    enabled: !!id,
  });
  const event = detail.data?.event ?? null;
  const externalTickets = event ? hasEligibleExternalTickets(event) : false;
  const ticketProvider = event ? externalTicketProvider(event.ticket_url) : null;
  const statusLabel = event ? eventStatus(event) : null;

  const rsvpMutation = useMutation({
    mutationFn: async (status: 'going' | 'interested' | 'cancelled') => {
      const result = await setEventRsvp(String(id), status);
      if (!result.success) return result;

      if (status === 'cancelled') {
        await cancelEventLocalReminder(String(id));
        return result;
      }

      const notification = await scheduleEventLocalReminder({
        eventId: String(id),
        title: event?.title,
        startsAt: event?.starts_at,
      });

      return notification.success ? result : { ...result, notificationError: notification.error };
    },
    onSuccess: (result) => {
      if (!result.success) throw new Error(result.error);
      if ('notificationError' in result && result.notificationError) {
        Alert.alert('RSVP saved', 'Your RSVP was saved in PLUGGD. Enable notifications in iOS Settings to receive a local alert.');
      }
      void queryClient.invalidateQueries({ queryKey: ['culture', 'event-detail', id] });
      void queryClient.invalidateQueries({ queryKey: ['culture', 'events'] });
    },
    onError: (error) => Alert.alert('RSVP failed', error instanceof Error ? error.message : String(error)),
  });

  const commentMutation = useMutation({
    mutationFn: () => addEventComment(String(id), comment),
    onSuccess: (result) => {
      if (!result.success) throw new Error(result.error);
      setComment('');
      void queryClient.invalidateQueries({ queryKey: ['culture', 'event-detail', id] });
    },
    onError: (error) => Alert.alert('Comment failed', error instanceof Error ? error.message : String(error)),
  });

  return (
    <PremiumScreenBackdrop tone="live" style={styles.screen}>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomInset }]}>
        <View style={styles.navigationRow}>
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" style={styles.navigationButton} onPress={() => (router.canGoBack() ? router.back() : router.replace('/events' as any))}>
            <MaterialIcons name="chevron-left" size={28} color={theme.colors.text} />
          </Pressable>
          {event ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Share ${event.title || 'event'}`}
              style={styles.navigationButton}
              onPress={() => void Share.share({
                message: `${event.title || 'PLUGGD event'}\n${eventDateTime(event.starts_at)}\n${event.location || event.city || 'Location TBA'}\nhttps://pluggd.fm/events/${event.slug || event.id}`,
              })}
            >
              <MaterialIcons name="ios-share" size={21} color={theme.colors.text} />
            </Pressable>
          ) : null}
        </View>

        {detail.isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={theme.colors.accentText} />
          </View>
        ) : null}

        {event ? (
          <>
            <View style={styles.hero}>
              <PluggdImage
                uri={event.cover_image_url ?? ''}
                fallbackSource={require('../../assets/web-parity/home/intimate-crowd-hero.png')}
                style={styles.heroImage}
                displayWidth={800}
                resizeMode="cover"
                accessibilityLabel={`${event.title || 'PLUGGD event'} artwork`}
              />
              <View style={styles.heroStatusRow}>
                <View style={[styles.heroStatusBadge, statusLabel === 'Happening now' && styles.heroStatusBadgeLive]}>
                  <View style={[styles.heroStatusDot, statusLabel === 'Happening now' && styles.heroStatusDotLive]} />
                  <Text style={styles.heroStatusText}>{statusLabel}</Text>
                </View>
                <View style={styles.heroDateBadge}>
                  <Text style={styles.heroDateDay}>{event.starts_at ? new Date(event.starts_at).getDate().toString().padStart(2, '0') : '--'}</Text>
                  <Text style={styles.heroDateMonth}>{event.starts_at ? new Date(event.starts_at).toLocaleDateString('en-GB', { month: 'short' }).toUpperCase() : 'TBA'}</Text>
                </View>
              </View>
            </View>
            {externalTickets ? <HeroTicketAction event={event} provider={ticketProvider} /> : null}
            <Text style={styles.eyebrow}>Event</Text>
            <DetailTitle title={event.title || 'Untitled event'} color={theme.colors.text} accentColor={theme.colors.accentText} style={{ marginTop: 5 }} />
            <Text style={styles.subtitle}>{event.location || 'Location TBA'}</Text>

            {event.lineup_headline ? <Text style={styles.lineup}>{event.lineup_headline}</Text> : null}
            {(event.genre_tags?.length || event.event_tags?.length) ? (
              <View style={styles.genreRow}>
                {[...new Set([...(event.genre_tags ?? []), ...(event.event_tags ?? [])].filter(Boolean))].slice(0, 5).map((tag) => (
                  <View key={tag} style={styles.genreChip}><Text style={styles.genreChipText}>{tag}</Text></View>
                ))}
              </View>
            ) : null}

            <View style={styles.metaRow}>
              <Meta label="When" value={formatDate(event.starts_at)} />
              <Meta label="Tickets" value={eventTicketPriceLabel(event)} />
              <Meta label="Going" value={`${event.rsvp_count ?? 0}`} />
            </View>

            <View style={styles.factList}>
              <View style={styles.factRow}>
                <View style={styles.factIcon}><MaterialIcons name="schedule" size={19} color={theme.colors.accentText} /></View>
                <View style={styles.factCopy}><Text style={styles.factLabel}>DATE AND TIME</Text><Text style={styles.factValue}>{eventDateTime(event.starts_at)}</Text></View>
              </View>
              <View style={styles.factRow}>
                <View style={styles.factIcon}><MaterialIcons name="place" size={20} color={theme.colors.accentText} /></View>
                <View style={styles.factCopy}><Text style={styles.factLabel}>LOCATION</Text><Text style={styles.factValue}>{event.location || event.city || 'Location TBA'}</Text></View>
              </View>
            </View>

            {culture.data?.promoter?.route ? (
              <Pressable accessibilityRole="button" accessibilityLabel={`Open ${culture.data.promoter.name || 'event host'} profile`} style={styles.hostStrip} onPress={() => router.push(culture.data!.promoter!.route as any)}>
                <View style={styles.hostIcon}><MaterialIcons name="campaign" size={20} color={theme.colors.accentText} /></View>
                <View style={styles.liveText}>
                  <Text style={styles.hostLabel}>PRESENTED BY</Text>
                  <Text style={styles.hostName} numberOfLines={1}>{culture.data.promoter.name || culture.data.promoter.username || 'Event host'}</Text>
                </View>
                <MaterialIcons name="chevron-right" size={24} color={theme.colors.textMuted} />
              </Pressable>
            ) : null}

            {externalTickets ? (
              <ExternalTicketAccess event={event} />
            ) : !event.has_order && !event.has_ticket ? (
              <EventTicketPurchase
                eventId={event.id}
                title={event.title || 'Event'}
                onComplete={() => {
                  void queryClient.invalidateQueries({ queryKey: ['culture', 'event-detail', id] });
                  void queryClient.invalidateQueries({ queryKey: ['culture', 'library'] });
                }}
              />
            ) : null}

            <View style={styles.statusCard}>
              <Text style={styles.metaLabel}>Your status</Text>
              <Text style={styles.statusText}>
                {event.has_order || event.has_ticket ? 'Ticket found in Wallet' : event.rsvp_status && event.rsvp_status !== 'none' ? `RSVP: ${event.rsvp_status}` : 'No RSVP yet'}
              </Text>
              <View style={styles.rsvpRow}>
                {(['interested', 'going', 'cancelled'] as const).map((status) => (
                  <Pressable
                    key={status}
                    accessibilityRole="button"
                    accessibilityLabel={`RSVP ${status}`}
                    accessibilityState={{ selected: event.rsvp_status === status }}
                    style={[styles.rsvpButton, event.rsvp_status === status && styles.rsvpButtonActive]}
                    onPress={() => rsvpMutation.mutate(status)}
                  >
                    <Text style={[styles.rsvpText, event.rsvp_status === status && styles.rsvpTextActive]}>{status}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {event.description ? <Text style={styles.description}>{event.description}</Text> : null}

            <MobileStoriesRail eventId={event.id} title="Event moments" />

            {culture.data?.attendance.attendees.length ? (
              <View style={styles.contextCard}>
                <View style={styles.contextHeader}>
                  <Text style={styles.contextTitle}>Who’s going</Text>
                  <Text style={styles.contextMeta}>{culture.data.attendance.going_count ?? culture.data.attendance.attendees.length} interested</Text>
                </View>
                <View style={styles.avatarStack}>
                  {culture.data.attendance.attendees.slice(0, 6).map((person, index) => (
                    <View key={`${person.user_id}-${index}`} style={[styles.attendeeAvatar, { marginLeft: index ? -10 : 0 }]}>
                      {person.avatar_url ? <Image source={{ uri: person.avatar_url }} style={styles.attendeeImage} /> : <Text style={styles.attendeeInitial}>{(person.full_name || person.username || 'P').slice(0, 1).toUpperCase()}</Text>}
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {culture.data?.venue || culture.data?.promoter || culture.data?.discussion.backstageRoute ? (
              <View style={styles.contextGrid}>
                {culture.data?.venue ? (
                  <View style={styles.contextTile}>
                    <MaterialIcons name="location-on" size={20} color={theme.colors.accentText} />
                    <Text style={styles.contextTileTitle} numberOfLines={1}>{culture.data.venue.name || event.location || 'Venue TBA'}</Text>
                    <Text style={styles.contextTileMeta} numberOfLines={2}>{culture.data.venue.address || culture.data.venue.city || 'Location context will appear when backed.'}</Text>
                  </View>
                ) : null}
                {culture.data?.promoter ? (
                  <Pressable accessibilityRole="button" accessibilityLabel={`Open ${culture.data.promoter.name || 'promoter'} profile`} style={styles.contextTile} onPress={() => culture.data?.promoter?.route && router.push(culture.data.promoter.route as any)}>
                    <MaterialIcons name="campaign" size={20} color={theme.colors.accentText} />
                    <Text style={styles.contextTileTitle} numberOfLines={1}>{culture.data.promoter.name || 'Promoter'}</Text>
                    <Text style={styles.contextTileMeta} numberOfLines={1}>{culture.data.promoter.username ? `@${culture.data.promoter.username}` : 'Promoter profile'}</Text>
                  </Pressable>
                ) : null}
                {culture.data?.discussion.backstageRoute ? (
                  <Pressable accessibilityRole="button" accessibilityLabel="Open community hub" style={styles.contextTile} onPress={() => router.push(culture.data?.discussion.backstageRoute as any)}>
                    <MaterialIcons name="groups" size={20} color={theme.colors.accentText} />
                    <Text style={styles.contextTileTitle} numberOfLines={1}>Community hub</Text>
                    <Text style={styles.contextTileMeta} numberOfLines={2}>Open event hub, ticket threads and fan discussion.</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            {event.has_order || event.has_ticket ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Open linked ticket" style={styles.ticketCard} onPress={() => router.push(`/tickets?eventId=${event.id}` as any)}>
                <MaterialIcons name="confirmation-number" size={24} color={theme.colors.accentText} />
                <View style={styles.liveText}>
                  <Text style={styles.liveTitle}>Ticket linked to this account</Text>
                  <Text style={styles.liveMeta}>Open Tickets for verified status. QR appears only when a real payload exists.</Text>
                </View>
                <MaterialIcons name="chevron-right" size={24} color={theme.colors.textMuted} />
              </Pressable>
            ) : null}

            {event.stream_url || event.playback_url ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open linked live session"
                style={styles.liveCard}
                onPress={() => {
                  const linkedUrl = event.stream_url || event.playback_url;
                  if (/^https?:\/\//i.test(linkedUrl || '')) void Linking.openURL(linkedUrl!);
                  else router.push('/live' as any);
                }}
              >
                <MaterialIcons name="settings-input-antenna" size={24} color={theme.colors.accentText} />
                <View style={styles.liveText}>
                  <Text style={styles.liveTitle}>Linked live session</Text>
                  <Text style={styles.liveMeta}>Open Live to join the stream or replay for this event.</Text>
                </View>
                <MaterialIcons name="chevron-right" size={24} color={theme.colors.textMuted} />
              </Pressable>
            ) : null}

            <Text style={styles.sectionTitle}>Event discussion</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Start an event thread" style={styles.secondaryButton} onPress={() => router.push({ pathname: '/create-post', params: { attachmentType: 'event', eventId: event.id, type: 'thread' } } as any)}>
              <MaterialIcons name="forum" size={20} color={theme.colors.accentText} />
              <Text style={styles.secondaryButtonText}>Start a community thread</Text>
            </Pressable>
            {culture.data?.discussion.socialPosts.length ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Open social thread" style={styles.threadLinkCard} onPress={() => router.push(`/post/${culture.data?.discussion.socialPosts[0]?.id}` as any)}>
                <MaterialIcons name="forum" size={22} color={theme.colors.accentText} />
                <View style={styles.liveText}>
                  <Text style={styles.liveTitle}>Open social thread</Text>
                  <Text style={styles.liveMeta}>{culture.data.discussion.socialPosts.length} event-linked social posts are active.</Text>
                </View>
                <MaterialIcons name="chevron-right" size={22} color={theme.colors.textMuted} />
              </Pressable>
            ) : null}
            <View style={styles.commentComposer}>
              <TextInput
                value={comment}
                onChangeText={setComment}
                placeholder="Add to the event thread"
                placeholderTextColor={theme.colors.textSubtle}
                style={styles.commentInput}
                multiline
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Post event comment"
                accessibilityState={{ disabled: commentMutation.isPending }}
                style={styles.commentButton}
                onPress={() => commentMutation.mutate()}
                disabled={commentMutation.isPending}
              >
                <Text style={styles.commentButtonText}>{commentMutation.isPending ? 'Posting...' : 'Post'}</Text>
              </Pressable>
            </View>
            {detail.data?.comments.length ? detail.data.comments.map((row) => (
              <View key={row.id} style={styles.commentCard}>
                <Text style={styles.commentBody}>{row.deleted_at ? 'Comment removed' : row.body}</Text>
                <Text style={styles.commentMeta}>{formatDate(row.created_at)}</Text>
              </View>
            )) : (
              <View style={styles.commentCard}>
                <Text style={styles.commentBody}>No comments yet. Event discussion appears here when fans start talking.</Text>
              </View>
            )}
          </>
        ) : !detail.isLoading ? (
          <RecoveryState
            eyebrow="LISTING CLOSED"
            title="This event is no longer on the bill"
            body="The organiser may have updated or removed it. Browse the live calendar for what is happening next."
            icon="event"
            primaryLabel="Explore events"
            onPrimary={() => router.replace('/events' as any)}
            secondaryLabel="Go back"
            onSecondary={() => (router.canGoBack() ? router.back() : router.replace('/events' as any))}
          />
        ) : null}
      </ScrollView>
    </PremiumScreenBackdrop>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  const styles = useEventDetailStyles();
  return (
    <View style={styles.metaCard}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

function HeroTicketAction({
  event,
  provider,
}: {
  event: NonNullable<Awaited<ReturnType<typeof loadEventDetail>>['event']>;
  provider: string | null;
}) {
  const theme = usePluggdTheme();
  const styles = useEventDetailStyles();
  const [opening, setOpening] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open tickets for ${event.title || 'this event'}${provider ? ` on ${provider}` : ''}`}
      accessibilityHint="Opens the organiser’s secure ticket website"
      accessibilityState={{ busy: opening }}
      disabled={opening}
      onPress={() => {
        if (opening) return;
        setOpening(true);
        void launchExternalTickets(event, 'event_detail_hero').finally(() => setOpening(false));
      }}
      style={styles.heroTicketAction}
    >
      <View style={styles.heroTicketSurface}>
        <View style={styles.heroTicketCopy}>
          <Text style={styles.heroTicketKicker}>TICKETS LIVE</Text>
          <Text style={styles.heroTicketProvider} numberOfLines={1}>{provider || 'Organiser website'}</Text>
        </View>
        {opening ? <ActivityIndicator color={theme.colors.onAccent} /> : <MaterialIcons name="open-in-new" size={20} color={theme.colors.onAccent} />}
      </View>
    </Pressable>
  );
}

function ExternalTicketAccess({ event }: { event: NonNullable<Awaited<ReturnType<typeof loadEventDetail>>['event']> }) {
  const theme = usePluggdTheme();
  const styles = useEventDetailStyles();
  const provider = externalTicketProvider(event.ticket_url) || 'the event organiser';
  const [opening, setOpening] = useState(false);

  const openTickets = async () => {
    if (opening) return;
    setOpening(true);
    try {
      await launchExternalTickets(event, 'event_detail');
    } finally {
      setOpening(false);
    }
  };

  return (
    <View style={styles.externalTicketCard}>
      <View style={styles.externalTicketHeadingRow}>
        <View style={styles.externalTicketIcon}>
          <MaterialIcons name="confirmation-number" size={22} color={theme.colors.accentText} />
        </View>
        <View style={styles.externalTicketCopy}>
          <Text style={styles.ticketKicker}>IN-PERSON EVENT</Text>
          <Text style={styles.externalTicketTitle}>Tickets from {provider}</Text>
          <Text style={styles.externalTicketBody}>Choose tickets and complete payment securely on the organiser’s website.</Text>
        </View>
      </View>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`Open tickets for ${event.title || 'this event'} on ${provider}`}
        accessibilityHint="Opens the organiser’s secure ticket website"
        accessibilityState={{ busy: opening }}
        disabled={opening}
        style={({ pressed }) => [styles.externalTicketButton, pressed && styles.externalTicketButtonPressed]}
        onPress={() => void openTickets()}
      >
        {opening ? <ActivityIndicator color={theme.colors.onAccent} /> : (
          <>
            <Text style={styles.externalTicketButtonText}>View tickets</Text>
            <MaterialIcons name="open-in-new" size={19} color={theme.colors.onAccent} />
          </>
        )}
      </Pressable>
      <Text style={styles.ticketFootnote}>PLUGGD does not set the organiser’s price, availability or refund terms.</Text>
    </View>
  );
}

type TicketType = {
  id: string;
  name: string;
  price_cents: number;
  available_quantity: number | null;
  max_per_order: number;
  fee_cents: number;
  currency: string;
  refund_terms: string | null;
};

function formatTicketMoney(amountCents: number, currency: string) {
  const code = /^[A-Z]{3}$/.test(currency) ? currency : 'GBP';
  try {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: code }).format(amountCents / 100);
  } catch {
    return formatGBP(amountCents, { cents: true });
  }
}

function EventTicketPurchase({ eventId, title, onComplete }: { eventId: string; title: string; onComplete: () => void }) {
  const router = useRouter();
  const theme = usePluggdTheme();
  const styles = useEventDetailStyles();
  const [tiers, setTiers] = useState<TicketType[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const policyRequest = useMemo(() => ({ kind: 'event_ticket' as const, itemId: eventId }), [eventId]);
  const policy = useCommercePolicy(policyRequest);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const { data, error } = await (supabase as any)
        .from('event_ticket_tiers')
        .select('id,name,price_cents,available_quantity,max_per_order,fee_cents,currency,refund_terms')
        .eq('event_id', eventId)
        .eq('is_active', true)
        .order('price_cents', { ascending: true });
      if (!mounted) return;
      const rows = error ? [] : ((data ?? []) as TicketType[]);
      setTiers(rows);
      setSelectedId(rows[0]?.id ?? null);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [eventId]);

  const selected = tiers.find((tier) => tier.id === selectedId) ?? null;
  const unitPrice = Number(selected?.price_cents ?? 0);
  const fees = Number(selected?.fee_cents ?? 0) * quantity;
  const total = unitPrice * quantity + fees;
  const maxQuantity = Math.max(1, Math.min(
    Number(selected?.max_per_order ?? 4),
    selected?.available_quantity == null ? 4 : Number(selected.available_quantity),
  ));

  const buy = async () => {
    if (!selected || buying) return;
    if (policy.permittedRail !== 'stripe_checkout') {
      Alert.alert('Tickets unavailable', policy.reason);
      return;
    }
    setBuying(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-event-checkout', {
        body: {
          eventId,
          ticketTypeId: selected.id,
          quantity,
          storefront: policy.storefront,
          returnUrl: 'pluggd://commerce/success',
          requestId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        },
      });
      if (error) throw error;
      const response = (data ?? {}) as Record<string, unknown>;
      const checkoutUrl = String(response.checkoutUrl ?? response.checkout_url ?? response.url ?? '');
      const sessionId = typeof (response.sessionId ?? response.session_id) === 'string'
        ? String(response.sessionId ?? response.session_id)
        : null;
      const checkout = await openHostedCheckout(checkoutUrl, {
        reconcile: async () => (await reconcileHostedCheckout({
          kind: 'event_ticket',
          sessionId,
          itemId: eventId,
        })).state,
      });
      onComplete();
      router.push({
        pathname: '/commerce/success',
        params: {
          kind: 'event_ticket',
          status: checkout.state,
          sessionId: sessionId ?? '',
          itemId: eventId,
        },
      } as any);
    } catch (error) {
      Alert.alert('Checkout unavailable', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setBuying(false);
    }
  };

  if (loading || policy.loading) {
    return <View style={styles.ticketPurchase}><ActivityIndicator color={theme.colors.accentText} /></View>;
  }

  if (!tiers.length) return null;

  if (policy.permittedRail !== 'stripe_checkout') {
    return (
      <View style={styles.ticketPurchase}>
        <Text style={styles.ticketKicker}>TICKET ACCESS</Text>
        <Text style={styles.ticketHeading}>Purchase not available</Text>
        <Text style={styles.ticketBody}>Paid tickets are not available for this event right now.</Text>
        <Text style={styles.ticketFootnote}>Free RSVP remains available below.</Text>
      </View>
    );
  }

  return (
    <View style={styles.ticketPurchase}>
      <Text style={styles.ticketKicker}>REAL-WORLD EVENT · VERIFIED INVENTORY</Text>
      <Text style={styles.ticketHeading}>Choose your ticket</Text>
      <Text style={styles.ticketBody}>{title}</Text>
      <View style={styles.ticketTierList}>
        {tiers.map((tier) => {
          const selectedTier = tier.id === selectedId;
          return (
            <Pressable
              key={tier.id}
              accessibilityRole="radio"
              accessibilityState={{ selected: selectedTier }}
              accessibilityLabel={`${tier.name}, ${formatTicketMoney(tier.price_cents, tier.currency)}`}
              onPress={() => {
                setSelectedId(tier.id);
                setQuantity(1);
              }}
              style={[styles.ticketTier, selectedTier && styles.ticketTierSelected]}
            >
              <View style={styles.ticketTierCopy}>
                <Text style={styles.ticketTierName}>{tier.name}</Text>
                <Text style={styles.ticketTierMeta}>{tier.available_quantity == null ? 'Inventory confirmed at checkout' : `${tier.available_quantity} remaining`}</Text>
              </View>
              <Text style={styles.ticketTierPrice}>{formatTicketMoney(tier.price_cents, tier.currency)}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.quantityRow}>
        <View><Text style={styles.ticketQuantityLabel}>QUANTITY</Text><Text style={styles.ticketTierMeta}>Maximum {maxQuantity} per order</Text></View>
        <View style={styles.quantityControl}>
          <Pressable accessibilityRole="button" accessibilityLabel="Decrease ticket quantity" accessibilityState={{ disabled: quantity <= 1 }} disabled={quantity <= 1} style={styles.quantityButton} onPress={() => setQuantity((value) => Math.max(1, value - 1))}>
            <MaterialIcons name="remove" size={19} color={theme.colors.text} />
          </Pressable>
          <Text accessibilityLabel={`${quantity} tickets`} style={styles.quantityValue}>{quantity}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Increase ticket quantity" accessibilityState={{ disabled: quantity >= maxQuantity }} disabled={quantity >= maxQuantity} style={styles.quantityButton} onPress={() => setQuantity((value) => Math.min(maxQuantity, value + 1))}>
            <MaterialIcons name="add" size={19} color={theme.colors.text} />
          </Pressable>
        </View>
      </View>
      <View style={styles.totalRow}>
        <View>
          <Text style={styles.totalLabel}>TOTAL</Text>
          <Text style={styles.ticketTierMeta}>{fees > 0 ? `${formatTicketMoney(unitPrice * quantity, selected?.currency || 'GBP')} + ${formatTicketMoney(fees, selected?.currency || 'GBP')} fees` : 'No additional fees'}</Text>
        </View>
        <Text style={styles.totalValue}>{formatTicketMoney(total, selected?.currency || 'GBP')}</Text>
      </View>
      {selected?.refund_terms ? <Text style={styles.refundTerms}>{selected.refund_terms}</Text> : null}
      <Pressable accessibilityRole="button" accessibilityLabel={`Continue to secure checkout for ${quantity} ${selected?.name} ticket${quantity === 1 ? '' : 's'}`} accessibilityState={{ busy: buying }} disabled={buying} style={styles.ticketBuyButton} onPress={buy}>
        {buying ? <ActivityIndicator color={theme.colors.onAccent} /> : <>
          <Text style={styles.ticketBuyText}>Continue securely</Text>
          <MaterialIcons name="arrow-forward" size={19} color={theme.colors.onAccent} />
        </>}
      </Pressable>
      <Text style={styles.ticketFootnote}>Your QR ticket is issued only after verified payment and inventory confirmation.</Text>
    </View>
  );
}

function useEventDetailStyles() {
  const theme = usePluggdTheme();
  return useMemo(() => StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 14, paddingTop: 54, paddingBottom: 220 },
  navigationRow: { minHeight: 46, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navigationButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.controlBorder, alignItems: 'center', justifyContent: 'center' },
  loading: { minHeight: 260, alignItems: 'center', justifyContent: 'center' },
  empty: { minHeight: 260, alignItems: 'center', justifyContent: 'center' },
  hero: { height: 290, borderRadius: 8, backgroundColor: theme.colors.artworkBase, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  heroImage: { width: '100%', height: '100%' },
  heroStatusRow: { position: 'absolute', left: 14, right: 14, top: 14, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  heroStatusBadge: { minHeight: 34, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', backgroundColor: 'rgba(10,6,4,0.82)', paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 7 },
  heroStatusBadgeLive: { borderColor: 'rgba(58,215,131,0.55)' },
  heroStatusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: theme.colors.accentFill },
  heroStatusDotLive: { backgroundColor: theme.colors.success },
  heroStatusText: { color: theme.colors.mediaText, fontSize: 11, fontFamily: pluggdFonts.satoshiBlack, textTransform: 'uppercase', letterSpacing: 0.65 },
  heroDateBadge: { width: 58, height: 58, borderRadius: 7, backgroundColor: 'rgba(10,6,4,0.88)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  heroDateDay: { color: theme.colors.mediaText, fontSize: 21, lineHeight: 23, fontFamily: pluggdFonts.displayBold },
  heroDateMonth: { color: '#FF6600', fontSize: 9.5, fontFamily: pluggdFonts.satoshiBlack, letterSpacing: 0.8 },
  heroTicketAction: { marginTop: 10, marginBottom: 18, borderRadius: 7, overflow: 'hidden' },
  heroTicketSurface: { minHeight: 60, borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.accentFill, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  heroTicketCopy: { flex: 1, minWidth: 0 },
  heroTicketKicker: { color: theme.colors.onAccent, fontSize: 9, fontFamily: pluggdFonts.satoshiBlack, letterSpacing: 1.2 },
  heroTicketProvider: { color: theme.colors.onAccent, fontSize: 16, lineHeight: 20, fontFamily: pluggdFonts.displayBold, marginTop: 2 },
  eyebrow: { color: theme.colors.accentText, fontSize: 12, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700', textTransform: 'uppercase', marginTop: 18 },
  title: { color: theme.colors.text, fontSize: 34, lineHeight: 39, fontFamily: pluggdFonts.displayExtraBold, fontWeight: '800', marginTop: 5 },
  subtitle: { color: theme.colors.textSecondary, fontSize: 16, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700', marginTop: 5 },
  lineup: { color: theme.colors.textSecondary, fontSize: 14, lineHeight: 20, fontFamily: pluggdFonts.satoshiMedium, marginTop: 9 },
  genreRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 12 },
  genreChip: { minHeight: 30, borderRadius: 999, borderWidth: 1, borderColor: theme.colors.borderAccent, backgroundColor: theme.colors.accentSoft, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' },
  genreChipText: { color: theme.colors.accentText, fontSize: 11, fontFamily: pluggdFonts.satoshiBold, textTransform: 'capitalize' },
  metaRow: { flexDirection: 'row', marginTop: 18, borderTopWidth: 1, borderBottomWidth: 1, borderColor: theme.colors.border },
  metaCard: { flex: 1, paddingVertical: 13, paddingRight: 8 },
  metaLabel: { color: theme.colors.textMuted, fontSize: 11, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700', textTransform: 'uppercase' },
  metaValue: { color: theme.colors.text, fontSize: 15, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700', marginTop: 5 },
  factList: { marginTop: 14, borderTopWidth: 1, borderBottomWidth: 1, borderColor: theme.colors.border },
  factRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border },
  factIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  factCopy: { flex: 1, minWidth: 0 },
  factLabel: { color: theme.colors.textMuted, fontSize: 9.5, letterSpacing: 1.15, fontFamily: pluggdFonts.satoshiBlack },
  factValue: { color: theme.colors.text, fontSize: 14, lineHeight: 19, fontFamily: pluggdFonts.satoshiBold, marginTop: 3 },
  description: { color: theme.colors.textSecondary, fontSize: 15, lineHeight: 22, fontFamily: pluggdFonts.satoshiMedium, fontWeight: '600', marginTop: 18 },
  statusCard: { marginTop: 18, borderBottomWidth: 1, borderColor: theme.colors.border, paddingBottom: 14, gap: 8 },
  statusText: { color: theme.colors.text, fontSize: 15, fontFamily: pluggdFonts.satoshiBold, fontWeight: '800' },
  rsvpRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  rsvpButton: { minHeight: 44, borderBottomWidth: 2, borderColor: theme.colors.controlBorder, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  rsvpButtonActive: { borderColor: theme.colors.accentText },
  rsvpText: { color: theme.colors.textMuted, fontSize: 12, fontFamily: pluggdFonts.satoshiBold, fontWeight: '800', textTransform: 'capitalize' },
  rsvpTextActive: { color: theme.colors.accentText },
  buttonRow: { flexDirection: 'row', gap: 9, marginTop: 20 },
  primaryButton: { flex: 1.25, height: 54, borderRadius: 5, backgroundColor: theme.colors.accentFill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  primaryButtonText: { color: theme.colors.onAccent, fontSize: 14, fontFamily: pluggdFonts.satoshiBlack },
  secondaryButton: { minHeight: 54, borderRadius: 5, borderWidth: 1, borderColor: theme.colors.controlBorder, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 12 },
  secondaryButtonText: { color: theme.colors.accentText, fontSize: 15, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700' },
  hostStrip: { minHeight: 70, marginTop: 14, borderTopWidth: 1, borderBottomWidth: 1, borderColor: theme.colors.borderAccent, flexDirection: 'row', alignItems: 'center', paddingVertical: 11 },
  hostIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: theme.colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  hostLabel: { color: theme.colors.textMuted, fontSize: 9, letterSpacing: 1.4, fontFamily: pluggdFonts.satoshiBlack },
  hostName: { color: theme.colors.text, fontSize: 16, fontFamily: pluggdFonts.displayBold, marginTop: 3 },
  liveCard: { minHeight: 74, marginTop: 2, borderBottomWidth: 1, borderColor: theme.colors.border, paddingVertical: 13, flexDirection: 'row', alignItems: 'center' },
  ticketCard: { minHeight: 74, marginTop: 16, borderTopWidth: 1, borderBottomWidth: 1, borderColor: theme.colors.borderAccent, paddingVertical: 13, flexDirection: 'row', alignItems: 'center' },
  liveText: { flex: 1, marginLeft: 11 },
  liveTitle: { color: theme.colors.text, fontSize: 16, fontFamily: pluggdFonts.displayBold },
  liveMeta: { color: theme.colors.textMuted, fontSize: 13, fontFamily: pluggdFonts.satoshiMedium, marginTop: 3 },
  contextCard: { marginTop: 20, borderTopWidth: 1, borderBottomWidth: 1, borderColor: theme.colors.border, paddingVertical: 14, gap: 12 },
  contextHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  contextTitle: { color: theme.colors.text, fontSize: 17, fontFamily: pluggdFonts.displayBold },
  contextMeta: { color: theme.colors.textMuted, fontSize: 12, fontFamily: pluggdFonts.satoshiBold, fontWeight: '800' },
  avatarStack: { flexDirection: 'row', alignItems: 'center', paddingLeft: 2 },
  attendeeAvatar: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: theme.colors.background, overflow: 'hidden', backgroundColor: theme.colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  attendeeImage: { width: '100%', height: '100%' },
  attendeeInitial: { color: theme.colors.text, fontSize: 12, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  contextGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 12 },
  contextTile: { flexGrow: 1, flexBasis: '47%', minHeight: 112, borderTopWidth: 2, borderColor: theme.colors.borderAccent, backgroundColor: theme.colors.surface, padding: 13, gap: 8 },
  contextTileTitle: { color: theme.colors.text, fontSize: 14, fontFamily: pluggdFonts.displayBold },
  contextTileMeta: { color: theme.colors.textMuted, fontSize: 12, lineHeight: 17, fontFamily: pluggdFonts.satoshiMedium },
  threadLinkCard: { minHeight: 72, marginBottom: 4, borderTopWidth: 1, borderBottomWidth: 1, borderColor: theme.colors.borderAccent, paddingVertical: 13, flexDirection: 'row', alignItems: 'center' },
  sectionTitle: { color: theme.colors.text, fontSize: 19, fontFamily: pluggdFonts.displayBold, marginTop: 20, marginBottom: 10 },
  commentComposer: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: theme.colors.border, paddingVertical: 12, gap: 10 },
  commentInput: { minHeight: 70, color: theme.colors.text, fontSize: 15, lineHeight: 21, fontFamily: pluggdFonts.satoshiMedium, fontWeight: '600' },
  commentButton: { height: 46, borderRadius: 5, backgroundColor: theme.colors.accentFill, alignItems: 'center', justifyContent: 'center' },
  commentButtonText: { color: theme.colors.onAccent, fontSize: 13, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  commentCard: { marginTop: 2, borderBottomWidth: 1, borderColor: theme.colors.border, paddingVertical: 13 },
  commentBody: { color: theme.colors.textSecondary, fontSize: 14, lineHeight: 20, fontFamily: pluggdFonts.satoshiMedium, fontWeight: '600' },
  commentMeta: { color: theme.colors.textMuted, fontSize: 11, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700', marginTop: 6 },
  ticketPurchase: { marginTop: 18, borderTopWidth: 1, borderBottomWidth: 1, borderColor: theme.colors.border, paddingVertical: 18 },
  externalTicketCard: { marginTop: 18, borderWidth: 1, borderColor: theme.colors.borderAccent, backgroundColor: theme.colors.surface, borderRadius: 8, padding: 16, gap: 14 },
  externalTicketHeadingRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  externalTicketIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: theme.colors.accentSoft, borderWidth: 1, borderColor: theme.colors.borderAccent, alignItems: 'center', justifyContent: 'center' },
  externalTicketCopy: { flex: 1, minWidth: 0 },
  externalTicketTitle: { color: theme.colors.text, fontSize: 19, lineHeight: 24, fontFamily: pluggdFonts.displayBold, marginTop: 4 },
  externalTicketBody: { color: theme.colors.textMuted, fontSize: 13, lineHeight: 19, fontFamily: pluggdFonts.satoshiMedium, marginTop: 4 },
  externalTicketButton: { minHeight: 54, borderRadius: 5, backgroundColor: theme.colors.accentFill, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  externalTicketButtonPressed: { opacity: 0.88, transform: [{ scale: 0.995 }] },
  externalTicketButtonText: { color: theme.colors.onAccent, fontSize: 15, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  ticketKicker: { color: theme.colors.accentText, fontSize: 9, letterSpacing: 1.35, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  ticketHeading: { color: theme.colors.text, fontSize: 23, lineHeight: 28, fontFamily: pluggdFonts.displayBold, marginTop: 6 },
  ticketBody: { color: theme.colors.textMuted, fontSize: 13, lineHeight: 19, fontFamily: pluggdFonts.satoshiMedium, marginTop: 5 },
  ticketTierList: { marginTop: 14, borderTopWidth: 1, borderColor: theme.colors.border },
  ticketTier: { minHeight: 68, borderBottomWidth: 1, borderColor: theme.colors.border, paddingHorizontal: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ticketTierSelected: { borderLeftWidth: 3, borderLeftColor: theme.colors.accentText, paddingLeft: 11 },
  ticketTierCopy: { flex: 1 },
  ticketTierName: { color: theme.colors.text, fontSize: 14, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  ticketTierMeta: { color: theme.colors.textMuted, fontSize: 11, fontFamily: pluggdFonts.satoshiMedium, marginTop: 3 },
  ticketTierPrice: { color: theme.colors.accentText, fontSize: 14, fontFamily: pluggdFonts.displayBold },
  quantityRow: { minHeight: 72, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: theme.colors.border },
  ticketQuantityLabel: { color: theme.colors.textMuted, fontSize: 9, letterSpacing: 1.3, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  quantityControl: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  quantityButton: { width: 44, height: 44, borderWidth: 1, borderColor: theme.colors.controlBorder, alignItems: 'center', justifyContent: 'center' },
  quantityValue: { width: 38, color: theme.colors.text, textAlign: 'center', fontSize: 16, fontFamily: pluggdFonts.displayBold },
  totalRow: { minHeight: 70, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  totalLabel: { color: theme.colors.text, fontSize: 10, letterSpacing: 1.3, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  totalValue: { color: theme.colors.text, fontSize: 22, fontFamily: pluggdFonts.displayBold },
  refundTerms: { color: theme.colors.textMuted, fontSize: 11, lineHeight: 16, fontFamily: pluggdFonts.satoshiMedium, marginBottom: 12 },
  ticketBuyButton: { minHeight: 54, borderRadius: 5, backgroundColor: theme.colors.accentFill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  ticketBuyText: { color: theme.colors.onAccent, fontSize: 14, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  ticketFootnote: { color: theme.colors.textMuted, fontSize: 10, lineHeight: 15, fontFamily: pluggdFonts.satoshiMedium, marginTop: 10 },
}), [theme]);
}
