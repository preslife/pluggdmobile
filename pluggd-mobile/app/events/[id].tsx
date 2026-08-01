import { MaterialIcons } from '@expo/vector-icons';
import { pluggdFonts } from '../../src/design/typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { PremiumScreenBackdrop } from '../../components/PluggdPrimitives';
import { DetailTitle } from '../../components/DetailTitle';
import { RecoveryState } from '../../components/ContentUI';
import { PluggdImage } from '../../src/components/PluggdImage';
import { PLUGGD_ORANGE, formatDate, formatGBP } from '../../src/lib/mobileContent';
import { addEventComment, loadEventCultureContext, loadEventDetail, setEventRsvp } from '../../src/features/culture/mobileServices';
import { MobileStoriesRail } from '../../src/features/culture/MobileStoriesRail';
import { cancelEventLocalReminder, scheduleEventLocalReminder } from '../../src/lib/localNotifications';
import { openHostedCheckout, reconcileHostedCheckout, useCommercePolicy } from '../../src/commerce/policy';
import { supabase } from '../../src/lib/supabase';

export default function EventDetailScreen() {
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
      <StatusBar style="light" />
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" style={styles.backButton} onPress={() => router.back()}>
          <MaterialIcons name="chevron-left" size={28} color="#FFFFFF" />
        </Pressable>

        {detail.isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={PLUGGD_ORANGE} />
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
            </View>
            <Text style={styles.eyebrow}>Event</Text>
            <DetailTitle title={event.title || 'Untitled event'} accentColor={PLUGGD_ORANGE} style={{ marginTop: 5 }} />
            <Text style={styles.subtitle}>{event.location || 'Location TBA'}</Text>

            <View style={styles.metaRow}>
              <Meta label="When" value={formatDate(event.starts_at)} />
              <Meta label="Price" value={formatGBP(event.price_cents, { cents: true })} />
              <Meta label="Interest" value={`${event.rsvp_count ?? 0}`} />
            </View>

            <View style={styles.buttonRow}>
              <Pressable accessibilityRole="button" accessibilityLabel="Open event thread" style={styles.secondaryButton} onPress={() => router.push({ pathname: '/create-post', params: { attachmentType: 'event', eventId: event.id, type: 'thread' } } as any)}>
                <MaterialIcons name="forum" size={20} color={PLUGGD_ORANGE} />
                <Text style={styles.secondaryButtonText}>Event thread</Text>
              </Pressable>
            </View>

            {!event.has_order && !event.has_ticket ? (
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
                    <MaterialIcons name="location-on" size={20} color={PLUGGD_ORANGE} />
                    <Text style={styles.contextTileTitle} numberOfLines={1}>{culture.data.venue.name || event.location || 'Venue TBA'}</Text>
                    <Text style={styles.contextTileMeta} numberOfLines={2}>{culture.data.venue.address || culture.data.venue.city || 'Location context will appear when backed.'}</Text>
                  </View>
                ) : null}
                {culture.data?.promoter ? (
                  <Pressable accessibilityRole="button" accessibilityLabel={`Open ${culture.data.promoter.name || 'promoter'} profile`} style={styles.contextTile} onPress={() => culture.data?.promoter?.route && router.push(culture.data.promoter.route as any)}>
                    <MaterialIcons name="campaign" size={20} color={PLUGGD_ORANGE} />
                    <Text style={styles.contextTileTitle} numberOfLines={1}>{culture.data.promoter.name || 'Promoter'}</Text>
                    <Text style={styles.contextTileMeta} numberOfLines={1}>{culture.data.promoter.username ? `@${culture.data.promoter.username}` : 'Promoter profile'}</Text>
                  </Pressable>
                ) : null}
                {culture.data?.discussion.backstageRoute ? (
                  <Pressable accessibilityRole="button" accessibilityLabel="Open community hub" style={styles.contextTile} onPress={() => router.push(culture.data?.discussion.backstageRoute as any)}>
                    <MaterialIcons name="groups" size={20} color={PLUGGD_ORANGE} />
                    <Text style={styles.contextTileTitle} numberOfLines={1}>Community hub</Text>
                    <Text style={styles.contextTileMeta} numberOfLines={2}>Open event hub, ticket threads and fan discussion.</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            {event.has_order || event.has_ticket ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Open linked ticket" style={styles.ticketCard} onPress={() => router.push(`/tickets?eventId=${event.id}` as any)}>
                <MaterialIcons name="confirmation-number" size={24} color={PLUGGD_ORANGE} />
                <View style={styles.liveText}>
                  <Text style={styles.liveTitle}>Ticket linked to this account</Text>
                  <Text style={styles.liveMeta}>Open Tickets for verified status. QR appears only when a real payload exists.</Text>
                </View>
                <MaterialIcons name="chevron-right" size={24} color="#777777" />
              </Pressable>
            ) : null}

            {event.stream_url || event.playback_url ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open linked live session"
                style={styles.liveCard}
                onPress={() => router.push('/live' as any)}
              >
                <MaterialIcons name="settings-input-antenna" size={24} color={PLUGGD_ORANGE} />
                <View style={styles.liveText}>
                  <Text style={styles.liveTitle}>Linked live session</Text>
                  <Text style={styles.liveMeta}>Open Live to join the stream or replay for this event.</Text>
                </View>
                <MaterialIcons name="chevron-right" size={24} color="#777777" />
              </Pressable>
            ) : null}

            <Text style={styles.sectionTitle}>Event discussion</Text>
            {culture.data?.discussion.socialPosts.length ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Open social thread" style={styles.threadLinkCard} onPress={() => router.push(`/post/${culture.data?.discussion.socialPosts[0]?.id}` as any)}>
                <MaterialIcons name="forum" size={22} color={PLUGGD_ORANGE} />
                <View style={styles.liveText}>
                  <Text style={styles.liveTitle}>Open social thread</Text>
                  <Text style={styles.liveMeta}>{culture.data.discussion.socialPosts.length} event-linked social posts are active.</Text>
                </View>
                <MaterialIcons name="chevron-right" size={22} color="#737373" />
              </Pressable>
            ) : null}
            <View style={styles.commentComposer}>
              <TextInput
                value={comment}
                onChangeText={setComment}
                placeholder="Add to the event thread"
                placeholderTextColor="#737373"
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
            onSecondary={() => router.back()}
          />
        ) : null}
      </ScrollView>
    </PremiumScreenBackdrop>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaCard}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
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
    return <View style={styles.ticketPurchase}><ActivityIndicator color={PLUGGD_ORANGE} /></View>;
  }

  if (!tiers.length || policy.permittedRail !== 'stripe_checkout') {
    const unavailableMessage = tiers.length
      ? 'Paid tickets are not available for this event right now.'
      : 'No paid ticket tiers have been published for this event.';
    return (
      <View style={styles.ticketPurchase}>
        <Text style={styles.ticketKicker}>TICKET ACCESS</Text>
        <Text style={styles.ticketHeading}>Purchase not available</Text>
        <Text style={styles.ticketBody}>{unavailableMessage}</Text>
        <Text style={styles.ticketFootnote}>Free RSVP remains available below. Paid tickets appear only when eligible inventory is ready.</Text>
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
            <MaterialIcons name="remove" size={19} color="#FFF" />
          </Pressable>
          <Text accessibilityLabel={`${quantity} tickets`} style={styles.quantityValue}>{quantity}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Increase ticket quantity" accessibilityState={{ disabled: quantity >= maxQuantity }} disabled={quantity >= maxQuantity} style={styles.quantityButton} onPress={() => setQuantity((value) => Math.min(maxQuantity, value + 1))}>
            <MaterialIcons name="add" size={19} color="#FFF" />
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
        {buying ? <ActivityIndicator color="#0A0806" /> : <>
          <Text style={styles.ticketBuyText}>Continue securely</Text>
          <MaterialIcons name="arrow-forward" size={19} color="#0A0806" />
        </>}
      </Pressable>
      <Text style={styles.ticketFootnote}>Your QR ticket is issued only after verified payment and inventory confirmation.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0a0806' },
  content: { padding: 14, paddingTop: 54, paddingBottom: 220 },
  backButton: { width: 44, height: 44, borderRadius: 5, backgroundColor: '#171310', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  loading: { minHeight: 260, alignItems: 'center', justifyContent: 'center' },
  empty: { minHeight: 260, alignItems: 'center', justifyContent: 'center' },
  hero: { height: 270, borderRadius: 6, backgroundColor: '#171310', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  heroImage: { width: '100%', height: '100%' },
  eyebrow: { color: PLUGGD_ORANGE, fontSize: 12, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700', textTransform: 'uppercase', marginTop: 18 },
  title: { color: '#FFFFFF', fontSize: 34, lineHeight: 39, fontFamily: pluggdFonts.displayExtraBold, fontWeight: '800', marginTop: 5 },
  subtitle: { color: '#B8B8B8', fontSize: 16, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700', marginTop: 5 },
  metaRow: { flexDirection: 'row', marginTop: 18, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#2B2723' },
  metaCard: { flex: 1, paddingVertical: 13, paddingRight: 8 },
  metaLabel: { color: '#8E8E8E', fontSize: 11, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700', textTransform: 'uppercase' },
  metaValue: { color: '#FFFFFF', fontSize: 15, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700', marginTop: 5 },
  description: { color: '#D4D4D4', fontSize: 15, lineHeight: 22, fontFamily: pluggdFonts.satoshiMedium, fontWeight: '600', marginTop: 18 },
  statusCard: { marginTop: 18, borderBottomWidth: 1, borderColor: '#2B2723', paddingBottom: 14, gap: 8 },
  statusText: { color: '#FFFFFF', fontSize: 15, fontFamily: pluggdFonts.satoshiBold, fontWeight: '800' },
  rsvpRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  rsvpButton: { minHeight: 44, borderBottomWidth: 2, borderColor: '#37312C', paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  rsvpButtonActive: { borderColor: PLUGGD_ORANGE },
  rsvpText: { color: '#B3B3B3', fontSize: 12, fontFamily: pluggdFonts.satoshiBold, fontWeight: '800', textTransform: 'capitalize' },
  rsvpTextActive: { color: PLUGGD_ORANGE },
  buttonRow: { flexDirection: 'row', gap: 9, marginTop: 20 },
  primaryButton: { flex: 1.25, height: 54, borderRadius: 5, backgroundColor: PLUGGD_ORANGE, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  primaryButtonText: { color: '#0A0806', fontSize: 14, fontFamily: pluggdFonts.satoshiBlack },
  secondaryButton: { flex: 1, height: 54, borderRadius: 5, borderWidth: 1, borderColor: '#54463C', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  secondaryButtonText: { color: PLUGGD_ORANGE, fontSize: 15, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700' },
  liveCard: { minHeight: 74, marginTop: 2, borderBottomWidth: 1, borderColor: '#2B2723', paddingVertical: 13, flexDirection: 'row', alignItems: 'center' },
  ticketCard: { minHeight: 74, marginTop: 16, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#3B281D', paddingVertical: 13, flexDirection: 'row', alignItems: 'center' },
  liveText: { flex: 1, marginLeft: 11 },
  liveTitle: { color: '#FFFFFF', fontSize: 16, fontFamily: pluggdFonts.displayBold },
  liveMeta: { color: '#AFAFAF', fontSize: 13, fontFamily: pluggdFonts.satoshiMedium, marginTop: 3 },
  contextCard: { marginTop: 20, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#2B2723', paddingVertical: 14, gap: 12 },
  contextHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  contextTitle: { color: '#FFFFFF', fontSize: 17, fontFamily: pluggdFonts.displayBold },
  contextMeta: { color: '#8E8E9F', fontSize: 12, fontFamily: pluggdFonts.satoshiBold, fontWeight: '800' },
  avatarStack: { flexDirection: 'row', alignItems: 'center', paddingLeft: 2 },
  attendeeAvatar: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: '#171310', overflow: 'hidden', backgroundColor: '#262626', alignItems: 'center', justifyContent: 'center' },
  attendeeImage: { width: '100%', height: '100%' },
  attendeeInitial: { color: '#FFFFFF', fontSize: 12, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  contextGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 12 },
  contextTile: { flexGrow: 1, flexBasis: '47%', minHeight: 112, borderTopWidth: 2, borderColor: '#513422', backgroundColor: '#14110F', padding: 13, gap: 8 },
  contextTileTitle: { color: '#FFFFFF', fontSize: 14, fontFamily: pluggdFonts.displayBold },
  contextTileMeta: { color: '#B3B3B3', fontSize: 12, lineHeight: 17, fontFamily: pluggdFonts.satoshiMedium },
  threadLinkCard: { minHeight: 72, marginBottom: 4, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#3B281D', paddingVertical: 13, flexDirection: 'row', alignItems: 'center' },
  sectionTitle: { color: '#FFFFFF', fontSize: 19, fontFamily: pluggdFonts.displayBold, marginTop: 20, marginBottom: 10 },
  commentComposer: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#2B2723', paddingVertical: 12, gap: 10 },
  commentInput: { minHeight: 70, color: '#FFFFFF', fontSize: 15, lineHeight: 21, fontFamily: pluggdFonts.satoshiMedium, fontWeight: '600' },
  commentButton: { height: 46, borderRadius: 5, backgroundColor: PLUGGD_ORANGE, alignItems: 'center', justifyContent: 'center' },
  commentButtonText: { color: '#0a0806', fontSize: 13, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  commentCard: { marginTop: 2, borderBottomWidth: 1, borderColor: '#2B2723', paddingVertical: 13 },
  commentBody: { color: '#E4E4E9', fontSize: 14, lineHeight: 20, fontFamily: pluggdFonts.satoshiMedium, fontWeight: '600' },
  commentMeta: { color: '#737373', fontSize: 11, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700', marginTop: 6 },
  ticketPurchase: { marginTop: 18, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#3B3028', paddingVertical: 18 },
  ticketKicker: { color: PLUGGD_ORANGE, fontSize: 9, letterSpacing: 1.35, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  ticketHeading: { color: '#FFF', fontSize: 23, lineHeight: 28, fontFamily: pluggdFonts.displayBold, marginTop: 6 },
  ticketBody: { color: '#AFA7A0', fontSize: 13, lineHeight: 19, fontFamily: pluggdFonts.satoshiMedium, marginTop: 5 },
  ticketTierList: { marginTop: 14, borderTopWidth: 1, borderColor: '#302A26' },
  ticketTier: { minHeight: 68, borderBottomWidth: 1, borderColor: '#302A26', paddingHorizontal: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ticketTierSelected: { borderLeftWidth: 3, borderLeftColor: PLUGGD_ORANGE, paddingLeft: 11 },
  ticketTierCopy: { flex: 1 },
  ticketTierName: { color: '#FFF', fontSize: 14, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  ticketTierMeta: { color: '#8F8882', fontSize: 11, fontFamily: pluggdFonts.satoshiMedium, marginTop: 3 },
  ticketTierPrice: { color: PLUGGD_ORANGE, fontSize: 14, fontFamily: pluggdFonts.displayBold },
  quantityRow: { minHeight: 72, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: '#302A26' },
  ticketQuantityLabel: { color: '#817A75', fontSize: 9, letterSpacing: 1.3, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  quantityControl: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  quantityButton: { width: 44, height: 44, borderWidth: 1, borderColor: '#443C36', alignItems: 'center', justifyContent: 'center' },
  quantityValue: { width: 38, color: '#FFF', textAlign: 'center', fontSize: 16, fontFamily: pluggdFonts.displayBold },
  totalRow: { minHeight: 70, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  totalLabel: { color: '#FFF', fontSize: 10, letterSpacing: 1.3, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  totalValue: { color: '#FFF', fontSize: 22, fontFamily: pluggdFonts.displayBold },
  refundTerms: { color: '#A49D97', fontSize: 11, lineHeight: 16, fontFamily: pluggdFonts.satoshiMedium, marginBottom: 12 },
  ticketBuyButton: { minHeight: 54, borderRadius: 5, backgroundColor: PLUGGD_ORANGE, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  ticketBuyText: { color: '#0A0806', fontSize: 14, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  ticketFootnote: { color: '#746D67', fontSize: 10, lineHeight: 15, fontFamily: pluggdFonts.satoshiMedium, marginTop: 10 },
});
