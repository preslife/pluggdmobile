import { MaterialIcons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { ContextRail, EmptyState, ListCard, ScreenShell, SectionTitle } from '../../components/ContentUI';
import { supabase } from '../../src/lib/supabase';
import { EventItem, PLUGGD_ORANGE, formatDate, formatGBP } from '../../src/lib/mobileContent';

const TABS = ['Local Events', 'Featured Events', 'Promoted Events', 'Promoters', 'Venues', 'Ticket Links', 'RSVPs'];

export default function EventsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('List');
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('events')
        .select('id,title,description,cover_image_url,location,starts_at,ends_at,price_cents,rsvp_count,stream_url,playback_url,created_at')
        .gte('starts_at', new Date().toISOString())
        .order('starts_at', { ascending: true })
        .limit(60);

      if (mounted) {
        setEvents(error || !Array.isArray(data) ? [] : (data as EventItem[]));
        setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const cityGroups = useMemo(() => {
    const groups = new Map<string, EventItem[]>();
    events.forEach((event) => {
      const city = (event.location || 'Location TBA').split(',').pop()?.trim() || 'Location TBA';
      groups.set(city, [...(groups.get(city) ?? []), event]);
    });
    return Array.from(groups.entries());
  }, [events]);

  return (
    <ScreenShell
      title="Events"
      subtitle="Real-world events, promoters, venues, ticket links, RSVPs and apply-to-play opportunities."
    >
      <StatusBar style="light" />
      <Stack.Screen options={{ headerShown: false }} />
      <ContextRail tabs={TABS} active={activeTab} onChange={setActiveTab} />

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={PLUGGD_ORANGE} />
        </View>
      ) : null}

      {!loading && events.length === 0 ? (
        <EmptyState title="No upcoming events" body="Events and ticket links will appear here once promoters and venues publish them." />
      ) : null}

      {!loading && ['Local Events', 'Featured Events', 'Promoted Events'].includes(activeTab) ? (
        <>
          <SectionTitle title={activeTab === 'Local Events' ? 'Upcoming near you' : activeTab} />
          {events.map((event) => (
            <ListCard
              key={event.id}
              title={event.title || 'Untitled event'}
              subtitle={event.location || 'Location TBA'}
              meta={`${formatDate(event.starts_at)} · ${formatGBP(event.price_cents, { cents: true })} · ${event.rsvp_count ?? 0} interested`}
              imageUrl={event.cover_image_url}
              onPress={() => router.push(`/events/${event.id}` as any)}
            />
          ))}
        </>
      ) : null}

      {!loading && activeTab === 'Promoters' ? (
        <>
          <SectionTitle title="Promoters" />
          <ListCard title="Promoter directory" subtitle="Find promoters by city, genre and event type" meta="Promoter profiles" icon="chevron-right" onPress={() => router.push('/discover' as any)} />
          <ListCard title="Promote an event" subtitle="Create an event, add ticket links and apply-to-play details" meta="Creator tools" icon="chevron-right" onPress={() => router.push('/creator/events' as any)} />
        </>
      ) : null}

      {!loading && activeTab === 'Venues' ? (
        <>
          <SectionTitle title="Venues" />
          {cityGroups.length > 0 ? cityGroups.map(([city, rows]) => (
            <Pressable key={city} style={styles.cityCard}>
              <View>
                <Text style={styles.cityName}>{city}</Text>
                <Text style={styles.cityMeta}>{rows.length} upcoming event{rows.length === 1 ? '' : 's'}</Text>
              </View>
              <MaterialIcons name="apartment" size={24} color={PLUGGD_ORANGE} />
            </Pressable>
          )) : <EmptyState title="No venues yet" body="Venue profiles will appear here as they publish events." />}
        </>
      ) : null}

      {!loading && activeTab === 'Ticket Links' ? (
        <>
          <SectionTitle title="Ticket links" />
          {events.map((event) => (
            <ListCard
              key={event.id}
              title={event.title || 'Untitled event'}
              subtitle={event.location || 'Location TBA'}
              meta={`${formatDate(event.starts_at)} · ${formatGBP(event.price_cents, { cents: true })}`}
              imageUrl={event.cover_image_url}
              onPress={() => router.push(`/events/${event.id}` as any)}
            />
          ))}
        </>
      ) : null}

      {!loading && activeTab === 'RSVPs' ? (
        <>
          <SectionTitle title="RSVPs and opportunities" />
          {events.map((event) => (
            <Pressable key={event.id} style={styles.opportunityCard} onPress={() => router.push(`/events/${event.id}` as any)}>
              <View style={styles.opportunityIcon}>
                <MaterialIcons name="campaign" size={23} color={PLUGGD_ORANGE} />
              </View>
              <View style={styles.opportunityText}>
                <Text style={styles.opportunityTitle} numberOfLines={1}>{event.title || 'Event opportunity'}</Text>
                <Text style={styles.opportunityMeta} numberOfLines={1}>
                  {event.location || 'Location TBA'} · {formatDate(event.starts_at)}
                </Text>
              </View>
              {event.stream_url ? (
                <Pressable onPress={() => Linking.openURL(event.stream_url as string)} style={styles.smallButton}>
                  <Text style={styles.smallButtonText}>Live</Text>
                </Pressable>
              ) : (
                <Text style={styles.applyText}>Apply</Text>
              )}
            </Pressable>
          ))}
        </>
      ) : null}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    minHeight: 42,
    borderRadius: 8,
    backgroundColor: PLUGGD_ORANGE,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  loading: {
    minHeight: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapFallback: {
    minHeight: 150,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#262626',
    backgroundColor: '#151515',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    marginBottom: 12,
  },
  mapTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 8,
  },
  mapBody: {
    color: '#AFAFAF',
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 5,
  },
  cityCard: {
    minHeight: 76,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#262626',
    backgroundColor: '#151515',
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 9,
  },
  cityName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  cityMeta: {
    color: '#AFAFAF',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 3,
  },
  opportunityCard: {
    minHeight: 78,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#262626',
    backgroundColor: '#151515',
    padding: 11,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 9,
  },
  opportunityIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#21130E',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  opportunityText: {
    flex: 1,
    minWidth: 0,
  },
  opportunityTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  opportunityMeta: {
    color: '#AFAFAF',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  applyText: {
    color: PLUGGD_ORANGE,
    fontSize: 14,
    fontWeight: '900',
  },
  smallButton: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: PLUGGD_ORANGE,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  smallButtonText: {
    color: PLUGGD_ORANGE,
    fontSize: 12,
    fontWeight: '900',
  },
});
