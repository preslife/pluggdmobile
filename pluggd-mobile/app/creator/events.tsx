import { MaterialIcons } from '@expo/vector-icons';
import { pluggdFonts } from '../../src/design/typography';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text as NativeText,
  type TextProps,
  TextInput as NativeTextInput,
  type TextInputProps,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CreatorAccessGate } from '../../components/CreatorAccessGate';
import type { PluggdTheme } from '../../src/design/tokens';
import { usePluggdTheme } from '../../src/design/usePluggdTheme';
import { supabase } from '../../src/lib/supabase';

function Text({ maxFontSizeMultiplier = 1.3, ...props }: TextProps) {
  return <NativeText maxFontSizeMultiplier={maxFontSizeMultiplier} {...props} />;
}

function TextInput({ maxFontSizeMultiplier = 1.4, ...props }: TextInputProps) {
  return <NativeTextInput maxFontSizeMultiplier={maxFontSizeMultiplier} {...props} />;
}

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

export default function CreatorEventsScreen() {
  const router = useRouter();
  const theme = usePluggdTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
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
    <CreatorAccessGate>
      <SafeAreaView style={styles.screen}>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.colors.accentText} />
        }
      >
        <View style={styles.topBar}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back" style={styles.iconButton} onPress={() => router.back()}>
            <MaterialIcons name="chevron-left" size={27} color={theme.colors.text} />
          </Pressable>

          <View style={styles.headerCenter}>
            <Text style={styles.headerEyebrow}>CREATOR OPERATIONS</Text>
            <Text style={styles.pageTitle}>Events</Text>
          </View>

          <Pressable accessibilityRole="button" accessibilityLabel="Create event" style={styles.iconButton} onPress={startCreate}>
            <MaterialIcons name="add" size={24} color={theme.colors.accentText} />
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
              <Pressable accessibilityRole="button" accessibilityLabel="Close event form" style={styles.closeButton} onPress={closeForm}>
                <MaterialIcons name="close" size={20} color={theme.colors.text} />
              </Pressable>
            </View>

            <FieldLabel label="Title" />
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Afrobeats Night"
              placeholderTextColor={theme.colors.textMuted}
              style={styles.input}
            />

            <FieldLabel label="Description" />
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Lineup, vibe, age policy, and useful details"
              placeholderTextColor={theme.colors.textMuted}
              style={[styles.input, styles.textArea]}
              multiline
            />

            <FieldLabel label="Location" />
            <TextInput
              value={location}
              onChangeText={setLocation}
              placeholder="Venue, city, or online"
              placeholderTextColor={theme.colors.textMuted}
              style={styles.input}
            />

            <View style={styles.fieldGrid}>
              <View style={styles.fieldHalf}>
                <FieldLabel label="Date" />
                <TextInput
                  value={dateInput}
                  onChangeText={setDateInput}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={theme.colors.textMuted}
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
                  placeholderTextColor={theme.colors.textMuted}
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
                  placeholderTextColor={theme.colors.textMuted}
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
                  placeholderTextColor={theme.colors.textMuted}
                  style={styles.input}
                />
              </View>
            </View>

            <FieldLabel label="Stream or ticket link" />
            <TextInput
              value={streamUrl}
              onChangeText={setStreamUrl}
              placeholder="https://..."
              placeholderTextColor={theme.colors.textMuted}
              autoCapitalize="none"
              style={styles.input}
            />

            <Pressable accessibilityRole="button" accessibilityLabel={saving ? 'Saving event' : 'Save event'} style={styles.saveButton} onPress={saveEvent} disabled={saving}>
              {saving ? (
                <ActivityIndicator color={theme.colors.onAccent} />
              ) : (
                <>
                  <MaterialIcons name="check" size={20} color={theme.colors.onAccent} />
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
            <ActivityIndicator color={theme.colors.accentText} />
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
            <View style={styles.emptyMark}><MaterialIcons name="event" size={27} color={theme.colors.onAccent} /></View>
            <Text style={styles.emptyEyebrow}>NO ACTIVE DATES</Text>
            <Text style={styles.emptyTitle}>
              {tab === 'upcoming' ? 'No upcoming events' : 'No past events'}
            </Text>
            <Text style={styles.emptyBody}>
              {tab === 'upcoming'
                ? 'Create your next show, listening party, workshop, or venue night.'
                : 'Completed events will appear here after they end.'}
            </Text>
            {tab === 'upcoming' ? (
              <Pressable accessibilityRole="button" style={styles.emptyButton} onPress={startCreate}>
                <Text style={styles.emptyButtonText}>Create event</Text>
              </Pressable>
            ) : null}
          </View>
        )}
      </ScrollView>
      </SafeAreaView>
    </CreatorAccessGate>
  );
}

function FieldLabel({ label }: { label: string }) {
  const theme = usePluggdTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
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
  const theme = usePluggdTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} style={[styles.segmentButton, active && styles.segmentButtonActive]} onPress={onPress}>
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
  const theme = usePluggdTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={styles.summaryTile}>
      <MaterialIcons name={icon} size={20} color={theme.colors.accentText} />
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
  const theme = usePluggdTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
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
            <Pressable accessibilityRole="button" accessibilityLabel="Edit event" style={styles.smallIconButton} onPress={onEdit}>
              <MaterialIcons name="edit" size={17} color={theme.colors.text} />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Delete event" style={styles.smallIconButton} onPress={onDelete}>
              <MaterialIcons name="delete-outline" size={17} color={theme.colors.danger} />
            </Pressable>
          </View>
        </View>

        <Text style={styles.eventMeta}>{formatDateTime(event.starts_at)}</Text>
        <Text style={styles.eventLocation} numberOfLines={1}>
          {event.location || (isOnline ? 'Online' : 'Location not set')}
        </Text>

        <View style={styles.eventFooter}>
          <View style={styles.eventPill}>
            <MaterialIcons name="groups" size={13} color={theme.colors.accentText} />
            <Text style={styles.eventPillText}>{formatNumber(event.rsvp_count ?? 0)} RSVPs</Text>
          </View>
          <View style={styles.eventPill}>
            <MaterialIcons name={isOnline ? 'live-tv' : 'confirmation-number'} size={13} color={theme.colors.accentText} />
            <Text style={styles.eventPillText}>{isOnline ? 'Stream' : formatMoneyFromCents(event.price_cents ?? 0)}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function createStyles(theme: PluggdTheme) {
  return StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
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
    width: 44,
    height: 44,
    borderRadius: 5,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.controlBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'flex-start',
    paddingHorizontal: 12,
  },
  logoTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    color: theme.colors.text,
    fontSize: 20,
    lineHeight: 24,
    fontFamily: pluggdFonts.satoshiBold, fontWeight: '700',
    letterSpacing: 1,
  },
  logoAccent: {
    color: theme.colors.accentText,
  },
  headerEyebrow: {
    color: theme.colors.accentText,
    fontSize: 9.5,
    letterSpacing: 1.5,
    fontFamily: pluggdFonts.satoshiBlack,
    fontWeight: '900',
  },
  pageTitle: {
    color: theme.colors.text,
    fontSize: 22,
    fontFamily: pluggdFonts.displayExtraBold, fontWeight: '800',
    marginTop: 2,
  },
  summaryGrid: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 16,
  },
  summaryTile: {
    flex: 1,
    minHeight: 82,
    borderRightWidth: 1,
    borderRightColor: theme.colors.border,
    paddingVertical: 11,
    paddingHorizontal: 10,
    justifyContent: 'space-between',
  },
  summaryValue: {
    color: theme.colors.text,
    fontSize: 20,
    fontFamily: pluggdFonts.displayBold, fontWeight: '700',
  },
  summaryLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontFamily: pluggdFonts.satoshiBold, fontWeight: '700',
  },
  formCard: {
    borderRadius: 5,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: 14,
    marginBottom: 12,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  formTitle: {
    color: theme.colors.text,
    fontSize: 20,
    fontFamily: pluggdFonts.displayBold, fontWeight: '700',
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 5,
    backgroundColor: theme.colors.surfaceRaised,
    borderWidth: 1,
    borderColor: theme.colors.controlBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldLabel: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontFamily: pluggdFonts.satoshiBold, fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 10,
    marginBottom: 6,
  },
  input: {
    minHeight: 48,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: theme.colors.controlBorder,
    backgroundColor: theme.colors.surfaceRaised,
    color: theme.colors.text,
    fontSize: 15,
    fontFamily: pluggdFonts.satoshiBold, fontWeight: '700',
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
    borderRadius: 5,
    backgroundColor: theme.colors.accentFill,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
    marginTop: 14,
  },
  saveButtonText: {
    color: theme.colors.onAccent,
    fontSize: 17,
    fontFamily: pluggdFonts.satoshiBold, fontWeight: '700',
  },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: theme.colors.controlBorder,
    backgroundColor: theme.colors.surface,
    padding: 4,
    marginBottom: 12,
  },
  segmentButton: {
    flex: 1,
    height: 44,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentButtonActive: {
    backgroundColor: theme.colors.accentSoft,
    borderWidth: 1,
    borderColor: theme.colors.borderAccent,
  },
  segmentButtonText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontFamily: pluggdFonts.satoshiBold, fontWeight: '700',
  },
  segmentButtonTextActive: {
    color: theme.colors.accentText,
  },
  loadingWrap: {
    minHeight: 240,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    color: theme.colors.textMuted,
    fontSize: 14,
    fontFamily: pluggdFonts.satoshiBold, fontWeight: '700',
  },
  eventList: {
    gap: 0,
  },
  eventCard: {
    minHeight: 120,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 14,
    flexDirection: 'row',
  },
  eventDateBox: {
    width: 58,
    height: 76,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.borderAccent,
    backgroundColor: theme.colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  eventMonth: {
    color: theme.colors.accentText,
    fontSize: 11,
    fontFamily: pluggdFonts.displayExtraBold, fontWeight: '800',
  },
  eventDay: {
    color: theme.colors.text,
    fontSize: 26,
    fontFamily: pluggdFonts.displayBold, fontWeight: '700',
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
    color: theme.colors.text,
    fontSize: 18,
    fontFamily: pluggdFonts.satoshiBold, fontWeight: '700',
  },
  eventActions: {
    flexDirection: 'row',
    gap: 6,
  },
  smallIconButton: {
    width: 44,
    height: 44,
    borderRadius: 4,
    backgroundColor: theme.colors.surfaceRaised,
    borderWidth: 1,
    borderColor: theme.colors.controlBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventMeta: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontFamily: pluggdFonts.satoshiBold, fontWeight: '700',
    marginTop: 7,
  },
  eventLocation: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontFamily: pluggdFonts.satoshiBold, fontWeight: '700',
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
    borderRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.controlBorder,
    backgroundColor: theme.colors.surfaceRaised,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
  },
  eventPillText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontFamily: pluggdFonts.satoshiBold, fontWeight: '700',
  },
  emptyCard: {
    minHeight: 220,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  emptyMark: { width: 54, height: 54, borderRadius: 5, backgroundColor: theme.colors.accentFill, alignItems: 'center', justifyContent: 'center' },
  emptyEyebrow: { color: theme.colors.accentText, fontSize: 10, letterSpacing: 1.5, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900', marginTop: 20 },
  emptyTitle: {
    color: theme.colors.text,
    fontSize: 19,
    fontFamily: pluggdFonts.displayExtraBold, fontWeight: '800',
    marginTop: 10,
  },
  emptyBody: {
    color: theme.colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: pluggdFonts.satoshiBold, fontWeight: '700',
    textAlign: 'left',
    marginTop: 6,
  },
  emptyButton: {
    minHeight: 48,
    borderRadius: 5,
    backgroundColor: theme.colors.accentFill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    marginTop: 14,
  },
  emptyButtonText: {
    color: theme.colors.onAccent,
    fontSize: 14,
    fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900',
  },
  });
}
