import { MaterialIcons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { supabase } from '../../src/lib/supabase';
import { EventItem, PLUGGD_ORANGE, formatDate, formatGBP } from '../../src/lib/mobileContent';

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [event, setEvent] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data, error } = await supabase
        .from('events')
        .select('id,title,description,cover_image_url,location,starts_at,ends_at,price_cents,rsvp_count,stream_url,playback_url,created_at')
        .eq('id', id)
        .maybeSingle();
      if (mounted) {
        setEvent(error ? null : (data as EventItem | null));
        setLoading(false);
      }
    };
    if (id) load();
    return () => {
      mounted = false;
    };
  }, [id]);

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <MaterialIcons name="chevron-left" size={28} color="#FFFFFF" />
        </Pressable>

        {loading ? (
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

            {event.description ? <Text style={styles.description}>{event.description}</Text> : null}

            <View style={styles.buttonRow}>
              <Pressable style={styles.primaryButton}>
                <MaterialIcons name="confirmation-number" size={20} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>Tickets / RSVP</Text>
              </Pressable>
              <Pressable style={styles.secondaryButton} onPress={() => router.push('/creator/events' as any)}>
                <MaterialIcons name="campaign" size={20} color={PLUGGD_ORANGE} />
                <Text style={styles.secondaryButtonText}>Apply to play</Text>
              </Pressable>
            </View>

            {event.stream_url || event.playback_url ? (
              <Pressable
                style={styles.liveCard}
                onPress={() => Linking.openURL((event.stream_url || event.playback_url) as string)}
              >
                <MaterialIcons name="settings-input-antenna" size={24} color={PLUGGD_ORANGE} />
                <View style={styles.liveText}>
                  <Text style={styles.liveTitle}>Linked live session</Text>
                  <Text style={styles.liveMeta}>Open stream or replay for this event.</Text>
                </View>
                <MaterialIcons name="chevron-right" size={24} color="#777777" />
              </Pressable>
            ) : null}
          </>
        ) : !loading ? (
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
  buttonRow: { flexDirection: 'row', gap: 9, marginTop: 20 },
  primaryButton: { flex: 1, height: 54, borderRadius: 8, backgroundColor: PLUGGD_ORANGE, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  secondaryButton: { flex: 1, height: 54, borderRadius: 8, borderWidth: 1, borderColor: PLUGGD_ORANGE, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  secondaryButtonText: { color: PLUGGD_ORANGE, fontSize: 15, fontWeight: '700' },
  liveCard: { marginTop: 16, borderRadius: 8, borderWidth: 1, borderColor: '#262626', backgroundColor: '#151515', padding: 13, flexDirection: 'row', alignItems: 'center' },
  liveText: { flex: 1, marginLeft: 11 },
  liveTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  liveMeta: { color: '#AFAFAF', fontSize: 13, fontWeight: '700', marginTop: 3 },
});

