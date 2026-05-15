import { MaterialIcons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { EventItem, PLUGGD_ORANGE, formatDate, formatGBP } from '../../src/lib/mobileContent';
import { addEventComment, loadEventDetail, setEventRsvp } from '../../src/features/culture/mobileServices';
import { cancelEventLocalReminder, scheduleEventLocalReminder } from '../../src/lib/localNotifications';

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
    <View style={styles.screen}>
      <StatusBar style="light" />
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
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
              {event.cover_image_url ? <Image source={{ uri: event.cover_image_url }} style={styles.heroImage} /> : null}
              {!event.cover_image_url ? <MaterialIcons name="event" size={58} color={PLUGGD_ORANGE} /> : null}
            </View>
            <Text style={styles.eyebrow}>Event</Text>
            <Text style={styles.title}>{event.title || 'Untitled event'}</Text>
            <Text style={styles.subtitle}>{event.location || 'Location TBA'}</Text>

            <View style={styles.metaRow}>
              <Meta label="When" value={formatDate(event.starts_at)} />
              <Meta label="Price" value={formatGBP(event.price_cents, { cents: true })} />
              <Meta label="Interest" value={`${event.rsvp_count ?? 0}`} />
            </View>

            <View style={styles.statusCard}>
              <Text style={styles.metaLabel}>Your status</Text>
              <Text style={styles.statusText}>
                {event.has_order || event.has_ticket ? 'Ticket found in Wallet' : event.rsvp_status && event.rsvp_status !== 'none' ? `RSVP: ${event.rsvp_status}` : 'No RSVP yet'}
              </Text>
              <View style={styles.rsvpRow}>
                {(['interested', 'going', 'cancelled'] as const).map((status) => (
                  <Pressable
                    key={status}
                    style={[styles.rsvpButton, event.rsvp_status === status && styles.rsvpButtonActive]}
                    onPress={() => rsvpMutation.mutate(status)}
                  >
                    <Text style={[styles.rsvpText, event.rsvp_status === status && styles.rsvpTextActive]}>{status}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {event.description ? <Text style={styles.description}>{event.description}</Text> : null}

            <View style={styles.buttonRow}>
              <Pressable style={styles.primaryButton} onPress={() => router.push(`/tickets?eventId=${event.id}` as any)}>
                <MaterialIcons name="confirmation-number" size={20} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>Tickets / RSVP</Text>
              </Pressable>
              <Pressable style={styles.secondaryButton} onPress={() => router.push('/backstage' as any)}>
                <MaterialIcons name="forum" size={20} color={PLUGGD_ORANGE} />
                <Text style={styles.secondaryButtonText}>Event thread</Text>
              </Pressable>
            </View>

            {event.has_order || event.has_ticket ? (
              <Pressable style={styles.ticketCard} onPress={() => router.push(`/tickets?eventId=${event.id}` as any)}>
                <MaterialIcons name="confirmation-number" size={24} color={PLUGGD_ORANGE} />
                <View style={styles.liveText}>
                  <Text style={styles.liveTitle}>Ticket linked to this account</Text>
                  <Text style={styles.liveMeta}>Open Wallet Tickets for verified status. QR appears only when a real payload exists.</Text>
                </View>
                <MaterialIcons name="chevron-right" size={24} color="#777777" />
              </Pressable>
            ) : null}

            {event.stream_url || event.playback_url ? (
              <Pressable
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
            <View style={styles.commentComposer}>
              <TextInput
                value={comment}
                onChangeText={setComment}
                placeholder="Add to the event thread"
                placeholderTextColor="#737373"
                style={styles.commentInput}
                multiline
              />
              <Pressable style={styles.commentButton} onPress={() => commentMutation.mutate()} disabled={commentMutation.isPending}>
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
          <View style={styles.empty}>
            <Text style={styles.title}>Event unavailable</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#080808' },
  content: { padding: 14, paddingTop: 54, paddingBottom: 220 },
  backButton: { width: 42, height: 42, borderRadius: 8, backgroundColor: '#151515', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  loading: { minHeight: 260, alignItems: 'center', justifyContent: 'center' },
  empty: { minHeight: 260, alignItems: 'center', justifyContent: 'center' },
  hero: { height: 310, borderRadius: 8, backgroundColor: '#151515', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1, borderColor: '#262626' },
  heroImage: { width: '100%', height: '100%' },
  eyebrow: { color: PLUGGD_ORANGE, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginTop: 18 },
  title: { color: '#FFFFFF', fontSize: 34, lineHeight: 39, fontWeight: '700', marginTop: 5 },
  subtitle: { color: '#B8B8B8', fontSize: 16, fontWeight: '700', marginTop: 5 },
  metaRow: { flexDirection: 'row', gap: 8, marginTop: 18 },
  metaCard: { flex: 1, borderRadius: 8, borderWidth: 1, borderColor: '#262626', backgroundColor: '#151515', padding: 12 },
  metaLabel: { color: '#8E8E8E', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  metaValue: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', marginTop: 5 },
  description: { color: '#D4D4D4', fontSize: 15, lineHeight: 22, fontWeight: '600', marginTop: 18 },
  statusCard: { marginTop: 16, borderRadius: 14, borderWidth: 1, borderColor: '#262626', backgroundColor: '#151515', padding: 13, gap: 8 },
  statusText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  rsvpRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  rsvpButton: { minHeight: 34, borderRadius: 17, borderWidth: 1, borderColor: '#262626', paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  rsvpButtonActive: { borderColor: PLUGGD_ORANGE, backgroundColor: 'rgba(255,82,0,0.15)' },
  rsvpText: { color: '#B3B3B3', fontSize: 12, fontWeight: '800', textTransform: 'capitalize' },
  rsvpTextActive: { color: PLUGGD_ORANGE },
  buttonRow: { flexDirection: 'row', gap: 9, marginTop: 20 },
  primaryButton: { flex: 1, height: 54, borderRadius: 8, backgroundColor: PLUGGD_ORANGE, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  secondaryButton: { flex: 1, height: 54, borderRadius: 8, borderWidth: 1, borderColor: PLUGGD_ORANGE, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  secondaryButtonText: { color: PLUGGD_ORANGE, fontSize: 15, fontWeight: '700' },
  liveCard: { marginTop: 16, borderRadius: 8, borderWidth: 1, borderColor: '#262626', backgroundColor: '#151515', padding: 13, flexDirection: 'row', alignItems: 'center' },
  ticketCard: { marginTop: 16, borderRadius: 8, borderWidth: 1, borderColor: '#3B281D', backgroundColor: '#151515', padding: 13, flexDirection: 'row', alignItems: 'center' },
  liveText: { flex: 1, marginLeft: 11 },
  liveTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  liveMeta: { color: '#AFAFAF', fontSize: 13, fontWeight: '700', marginTop: 3 },
  sectionTitle: { color: '#FFFFFF', fontSize: 19, fontWeight: '900', marginTop: 20, marginBottom: 10 },
  commentComposer: { borderRadius: 14, borderWidth: 1, borderColor: '#262626', backgroundColor: '#151515', padding: 12, gap: 10 },
  commentInput: { minHeight: 70, color: '#FFFFFF', fontSize: 15, lineHeight: 21, fontWeight: '600' },
  commentButton: { height: 42, borderRadius: 21, backgroundColor: PLUGGD_ORANGE, alignItems: 'center', justifyContent: 'center' },
  commentButtonText: { color: '#08080C', fontSize: 13, fontWeight: '900' },
  commentCard: { marginTop: 10, borderRadius: 14, borderWidth: 1, borderColor: '#262626', backgroundColor: '#151515', padding: 13 },
  commentBody: { color: '#E4E4E9', fontSize: 14, lineHeight: 20, fontWeight: '600' },
  commentMeta: { color: '#737373', fontSize: 11, fontWeight: '700', marginTop: 6 },
});
