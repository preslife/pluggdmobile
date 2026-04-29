import { MaterialIcons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { supabase } from '../../src/lib/supabase';

const PLUGGD_ORANGE = '#FF5200';

type EventRow = {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string;
  location: string | null;
  price_cents: number;
  rsvp_count: number;
  stream_provider: string | null;
  stream_url: string | null;
  playback_url: string | null;
  created_at: string;
};

type EventTab = 'upcoming' | 'past';

function newDateInput() {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date.toISOString().slice(0, 10);
}

function newTimeInput() {
  const date = new Date();
  date.setHours(20, 0, 0, 0);
  return date.toTimeString().slice(0, 5);
}

function combineDateTime(dateInput: string, timeInput: string) {
  const date = new Date(`${dateInput}T${timeInput}:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateInputFromIso(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? newDateInput() : date.toISOString().slice(0, 10);
}

function timeInputFromIso(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? newTimeInput() : date.toTimeString().slice(0, 5);
}

function durationFromEvent(event: EventRow) {
  const start = new Date(event.starts_at).getTime();
  const end = new Date(event.ends_at).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return '180';
  return String(Math.round((end - start) / 60000));
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date not set';
  return date.toLocaleString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatMoneyFromCents(cents: number) {
  if (!cents) return 'Free';
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

function formatNumber(value: number) {
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}K`;
  return String(Math.max(0, Math.round(value)));
}

function PluggdWordmark() {
  return (
    <View style={styles.logoTextRow}>
      <Text style={styles.logoText}>PL</Text>
      <Text style={[styles.logoText, styles.logoAccent]}>U</Text>
      <Text style={styles.logoText}>GGD</Text>
    </View>
  );
}

export default function CreatorEventsScreen() {
  const router = useRouter();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tab, setTab] = useState<EventTab>('upcoming');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [dateInput, setDateInput] = useState(newDateInput());
  const [timeInput, setTimeInput] = useState(newTimeInput());
  const [durationMinutes, setDurationMinutes] = useState('180');
  const [priceGbp, setPriceGbp] = useState('0');
  const [streamUrl, setStreamUrl] = useState('');

  const loadEvents = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setEvents([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const { data, error } = await (supabase as any)
        .from('events')
        .select('id, title, description, starts_at, ends_at, location, price_cents, rsvp_count, stream_provider, stream_url, playback_url, created_at')
        .eq('created_by', user.id)
        .order('starts_at', { ascending: false });

      if (error) throw error;
      setEvents((data ?? []) as EventRow[]);
    } catch (error: any) {
      console.error('Failed to load creator events:', error);
      Alert.alert('Events unavailable', error?.message ?? 'We could not load your events.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const now = Date.now();
  const upcoming = useMemo(
    () =>
      events
        .filter((event) => new Date(event.ends_at).getTime() >= now)
        .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()),
    [events, now],
  );
  const past = useMemo(
    () => events.filter((event) => new Date(event.ends_at).getTime() < now),
    [events, now],
  );
  const visibleEvents = tab === 'upcoming' ? upcoming : past;
  const totalRsvps = events.reduce((sum, event) => sum + Number(event.rsvp_count ?? 0), 0);
  const estimatedGross = events.reduce(
    (sum, event) => sum + Number(event.rsvp_count ?? 0) * Number(event.price_cents ?? 0),
    0,
  );

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setDescription('');
    setLocation('');
    setDateInput(newDateInput());
    setTimeInput(newTimeInput());
    setDurationMinutes('180');
    setPriceGbp('0');
    setStreamUrl('');
  };

  const startCreate = () => {
    resetForm();
    setFormOpen(true);
  };

  const startEdit = (event: EventRow) => {
    setEditingId(event.id);
    setTitle(event.title);
    setDescription(event.description ?? '');
    setLocation(event.location ?? '');
    setDateInput(dateInputFromIso(event.starts_at));
    setTimeInput(timeInputFromIso(event.starts_at));
    setDurationMinutes(durationFromEvent(event));
    setPriceGbp(String(Number(event.price_cents ?? 0) / 100));
    setStreamUrl(event.stream_url ?? event.playback_url ?? '');
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    resetForm();
  };

  const saveEvent = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      Alert.alert('Title required', 'Add an event title before saving.');
      return;
    }

    const start = combineDateTime(dateInput, timeInput);
    if (!start) {
      Alert.alert('Invalid date', 'Use date format YYYY-MM-DD and time format HH:mm.');
      return;
    }

    const safeDuration = Math.min(720, Math.max(15, Math.round(Number(durationMinutes || 0))));
    const end = new Date(start.getTime() + safeDuration * 60000);
    const priceCents = Math.max(0, Math.round(Number(priceGbp || 0) * 100));
    const trimmedStreamUrl = streamUrl.trim();

    setSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/auth/login');
        return;
      }

      const payload = {
        title: trimmedTitle,
        description: description.trim() || null,
        location: location.trim() || null,
        starts_at: start.toISOString(),
        ends_at: end.toISOString(),
        price_cents: priceCents,
        stream_provider: trimmedStreamUrl ? 'external' : null,
        stream_url: trimmedStreamUrl || null,
        playback_url: trimmedStreamUrl || null,
      };

      if (editingId) {
        const { error } = await (supabase as any)
          .from('events')
          .update({
            ...payload,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingId)
          .eq('created_by', user.id);

        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from('events')
          .insert({
            ...payload,
            created_by: user.id,
            rsvp_count: 0,
          });

        if (error) throw error;
      }

      await loadEvents();
      closeForm();
    } catch (error: any) {
      console.error('Failed to save event:', error);
      Alert.alert('Could not save event', error?.message ?? 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const deleteEvent = (event: EventRow) => {
    Alert.alert('Delete event?', `Delete ${event.title}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await (supabase as any)
              .from('events')
              .delete()
              .eq('id', event.id);
            if (error) throw error;
            await loadEvents();
          } catch (error: any) {
            Alert.alert('Could not delete event', error?.message ?? 'Please try again.');
          }
        },
      },
    ]);
  };

  const refresh = () => {
    setRefreshing(true);
    loadEvents();
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={PLUGGD_ORANGE} />
        }
      >
        <View style={styles.topBar}>
          <Pressable style={styles.iconButton} onPress={() => router.back()}>
            <MaterialIcons name="chevron-left" size={27} color="#FFFFFF" />
          </Pressable>

          <View style={styles.headerCenter}>
            <PluggdWordmark />
            <Text style={styles.pageTitle}>Events</Text>
          </View>

          <Pressable style={styles.iconButton} onPress={startCreate}>
            <MaterialIcons name="add" size={24} color={PLUGGD_ORANGE} />
          </Pressable>
        </View>

        <View style={styles.summaryGrid}>
          <SummaryTile label="Upcoming" value={formatNumber(upcoming.length)} icon="event" />
          <SummaryTile label="RSVPs" value={formatNumber(totalRsvps)} icon="groups" />
          <SummaryTile label="Gross" value={formatMoneyFromCents(estimatedGross)} icon="payments" />
        </View>

        {formOpen ? (
          <View style={styles.formCard}>
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>{editingId ? 'Edit event' : 'New event'}</Text>
              <Pressable style={styles.closeButton} onPress={closeForm}>
                <MaterialIcons name="close" size={20} color="#FFFFFF" />
              </Pressable>
            </View>

            <FieldLabel label="Title" />
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Afrobeats Night"
              placeholderTextColor="#777777"
              style={styles.input}
            />

            <FieldLabel label="Description" />
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Lineup, vibe, age policy, and useful details"
              placeholderTextColor="#777777"
              style={[styles.input, styles.textArea]}
              multiline
            />

            <FieldLabel label="Location" />
            <TextInput
              value={location}
              onChangeText={setLocation}
              placeholder="Venue, city, or online"
              placeholderTextColor="#777777"
              style={styles.input}
            />

            <View style={styles.fieldGrid}>
              <View style={styles.fieldHalf}>
                <FieldLabel label="Date" />
                <TextInput
                  value={dateInput}
                  onChangeText={setDateInput}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#777777"
                  autoCapitalize="none"
                  style={styles.input}
                />
              </View>
              <View style={styles.fieldHalf}>
                <FieldLabel label="Time" />
                <TextInput
                  value={timeInput}
                  onChangeText={setTimeInput}
                  placeholder="HH:mm"
                  placeholderTextColor="#777777"
                  autoCapitalize="none"
                  style={styles.input}
                />
              </View>
            </View>

            <View style={styles.fieldGrid}>
              <View style={styles.fieldHalf}>
                <FieldLabel label="Duration mins" />
                <TextInput
                  value={durationMinutes}
                  onChangeText={setDurationMinutes}
                  keyboardType="numeric"
                  placeholder="180"
                  placeholderTextColor="#777777"
                  style={styles.input}
                />
              </View>
              <View style={styles.fieldHalf}>
                <FieldLabel label="Price GBP" />
                <TextInput
                  value={priceGbp}
                  onChangeText={setPriceGbp}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor="#777777"
                  style={styles.input}
                />
              </View>
            </View>

            <FieldLabel label="Stream or ticket link" />
            <TextInput
              value={streamUrl}
              onChangeText={setStreamUrl}
              placeholder="https://..."
              placeholderTextColor="#777777"
              autoCapitalize="none"
              style={styles.input}
            />

            <Pressable style={styles.saveButton} onPress={saveEvent} disabled={saving}>
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <MaterialIcons name="check" size={20} color="#FFFFFF" />
                  <Text style={styles.saveButtonText}>{editingId ? 'Save event' : 'Create event'}</Text>
                </>
              )}
            </Pressable>
          </View>
        ) : null}

        <View style={styles.segmentedControl}>
          <SegmentButton label="Upcoming" active={tab === 'upcoming'} onPress={() => setTab('upcoming')} />
          <SegmentButton label="Past" active={tab === 'past'} onPress={() => setTab('past')} />
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={PLUGGD_ORANGE} />
            <Text style={styles.loadingText}>Loading events...</Text>
          </View>
        ) : visibleEvents.length > 0 ? (
          <View style={styles.eventList}>
            {visibleEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onEdit={() => startEdit(event)}
                onDelete={() => deleteEvent(event)}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <MaterialIcons name="event" size={38} color="#FFFFFF33" />
            <Text style={styles.emptyTitle}>
              {tab === 'upcoming' ? 'No upcoming events' : 'No past events'}
            </Text>
            <Text style={styles.emptyBody}>
              {tab === 'upcoming'
                ? 'Create your next show, listening party, workshop, or venue night.'
                : 'Completed events will appear here after they end.'}
            </Text>
            {tab === 'upcoming' ? (
              <Pressable style={styles.emptyButton} onPress={startCreate}>
                <Text style={styles.emptyButtonText}>Create event</Text>
              </Pressable>
            ) : null}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function FieldLabel({ label }: { label: string }) {
  return <Text style={styles.fieldLabel}>{label}</Text>;
}

function SegmentButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.segmentButton, active && styles.segmentButtonActive]} onPress={onPress}>
      <Text style={[styles.segmentButtonText, active && styles.segmentButtonTextActive]}>{label}</Text>
    </Pressable>
  );
}

function SummaryTile({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: keyof typeof MaterialIcons.glyphMap;
}) {
  return (
    <View style={styles.summaryTile}>
      <MaterialIcons name={icon} size={20} color={PLUGGD_ORANGE} />
      <Text style={styles.summaryValue} numberOfLines={1}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function EventCard({
  event,
  onEdit,
  onDelete,
}: {
  event: EventRow;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isOnline = Boolean(event.stream_url || event.playback_url);
  return (
    <View style={styles.eventCard}>
      <View style={styles.eventDateBox}>
        <Text style={styles.eventMonth}>
          {new Date(event.starts_at).toLocaleDateString('en-GB', { month: 'short' }).toUpperCase()}
        </Text>
        <Text style={styles.eventDay}>
          {new Date(event.starts_at).toLocaleDateString('en-GB', { day: '2-digit' })}
        </Text>
      </View>

      <View style={styles.eventBody}>
        <View style={styles.eventTitleRow}>
          <Text style={styles.eventTitle} numberOfLines={1}>{event.title}</Text>
          <View style={styles.eventActions}>
            <Pressable style={styles.smallIconButton} onPress={onEdit}>
              <MaterialIcons name="edit" size={17} color="#FFFFFF" />
            </Pressable>
            <Pressable style={styles.smallIconButton} onPress={onDelete}>
              <MaterialIcons name="delete-outline" size={17} color="#FF5C5C" />
            </Pressable>
          </View>
        </View>

        <Text style={styles.eventMeta}>{formatDateTime(event.starts_at)}</Text>
        <Text style={styles.eventLocation} numberOfLines={1}>
          {event.location || (isOnline ? 'Online' : 'Location not set')}
        </Text>

        <View style={styles.eventFooter}>
          <View style={styles.eventPill}>
            <MaterialIcons name="groups" size={13} color={PLUGGD_ORANGE} />
            <Text style={styles.eventPillText}>{formatNumber(event.rsvp_count ?? 0)} RSVPs</Text>
          </View>
          <View style={styles.eventPill}>
            <MaterialIcons name={isOnline ? 'live-tv' : 'confirmation-number'} size={13} color={PLUGGD_ORANGE} />
            <Text style={styles.eventPillText}>{isOnline ? 'Stream' : formatMoneyFromCents(event.price_cents ?? 0)}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#080808',
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 40,
  },
  topBar: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: '#262626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    alignItems: 'center',
  },
  logoTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '900',
    letterSpacing: 1,
  },
  logoAccent: {
    color: PLUGGD_ORANGE,
  },
  pageTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 2,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  summaryTile: {
    flex: 1,
    minHeight: 86,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#262626',
    backgroundColor: '#151515',
    padding: 10,
    justifyContent: 'space-between',
  },
  summaryValue: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  summaryLabel: {
    color: '#AFAFAF',
    fontSize: 11,
    fontWeight: '800',
  },
  formCard: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#262626',
    backgroundColor: '#151515',
    padding: 14,
    marginBottom: 12,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  formTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#101010',
    borderWidth: 1,
    borderColor: '#303030',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldLabel: {
    color: '#BEBEBE',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginTop: 10,
    marginBottom: 6,
  },
  input: {
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#303030',
    backgroundColor: '#101010',
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    paddingHorizontal: 12,
  },
  textArea: {
    minHeight: 90,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  fieldGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  fieldHalf: {
    flex: 1,
  },
  saveButton: {
    height: 52,
    borderRadius: 8,
    backgroundColor: PLUGGD_ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
    marginTop: 14,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
  },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#303030',
    backgroundColor: '#101010',
    padding: 4,
    marginBottom: 12,
  },
  segmentButton: {
    flex: 1,
    height: 40,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentButtonActive: {
    backgroundColor: '#23140E',
    borderWidth: 1,
    borderColor: PLUGGD_ORANGE,
  },
  segmentButtonText: {
    color: '#AFAFAF',
    fontSize: 13,
    fontWeight: '900',
  },
  segmentButtonTextActive: {
    color: PLUGGD_ORANGE,
  },
  loadingWrap: {
    minHeight: 240,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    color: '#AFAFAF',
    fontSize: 14,
    fontWeight: '700',
  },
  eventList: {
    gap: 10,
  },
  eventCard: {
    minHeight: 120,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#262626',
    backgroundColor: '#151515',
    padding: 12,
    flexDirection: 'row',
  },
  eventDateBox: {
    width: 58,
    height: 76,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3B261A',
    backgroundColor: '#20130E',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  eventMonth: {
    color: PLUGGD_ORANGE,
    fontSize: 11,
    fontWeight: '900',
  },
  eventDay: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
    marginTop: 2,
  },
  eventBody: {
    flex: 1,
    minWidth: 0,
  },
  eventTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eventTitle: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  eventActions: {
    flexDirection: 'row',
    gap: 6,
  },
  smallIconButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#101010',
    borderWidth: 1,
    borderColor: '#303030',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventMeta: {
    color: '#D8D8D8',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 7,
  },
  eventLocation: {
    color: '#A8A8A8',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  eventFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 12,
  },
  eventPill: {
    minHeight: 30,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#343434',
    backgroundColor: '#101010',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
  },
  eventPillText: {
    color: '#DADADA',
    fontSize: 12,
    fontWeight: '800',
  },
  emptyCard: {
    minHeight: 180,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#262626',
    backgroundColor: '#151515',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 22,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '900',
    marginTop: 10,
  },
  emptyBody: {
    color: '#A8A8A8',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 6,
  },
  emptyButton: {
    height: 42,
    borderRadius: 8,
    backgroundColor: PLUGGD_ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    marginTop: 14,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
});
