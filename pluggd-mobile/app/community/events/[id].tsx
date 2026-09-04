import { MaterialIcons } from '@expo/vector-icons';
import { pluggdFonts } from '../../../src/design/typography';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RecoveryState } from '../../../components/ContentUI';
import { selectionHaptic } from '../../../src/design/haptics';
import { supabase } from '../../../src/lib/supabase';
import { formatDate } from '../../../src/lib/mobileContent';
import { useBottomChromeInset } from '../../../src/design/useBottomChromeInset';
import { usePluggdTheme } from '../../../src/design/usePluggdTheme';

type CommunityEventDetail = {
  id: string;
  community_id: string;
  title: string;
  description?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  location?: string | null;
  event_type?: string | null;
  meeting_url?: string | null;
  replay_url?: string | null;
  community?: {
    id: string;
    slug?: string | null;
    name?: string | null;
    title?: string | null;
  } | null;
};

async function loadCommunityEvent(id: string): Promise<CommunityEventDetail | null> {
  const { data: event, error } = await (supabase as any)
    .from('community_events')
    .select('id,community_id,title,description,start_at,end_at,event_type,meeting_url,replay_url,location')
    .eq('id', id)
    .maybeSingle();
  if (error || !event) return null;

  const { data: community } = await (supabase as any)
    .from('communities')
    .select('id,slug,name')
    .eq('id', (event as any).community_id)
    .maybeSingle();

  return {
    id: String((event as any).id),
    community_id: String((event as any).community_id),
    title: (event as any).title || 'Community event',
    description: (event as any).description || null,
    starts_at: (event as any).start_at || null,
    ends_at: (event as any).end_at || null,
    location: (event as any).location || null,
    event_type: (event as any).event_type || null,
    meeting_url: (event as any).meeting_url || null,
    replay_url: (event as any).replay_url || null,
    community: community ? {
      id: String((community as any).id),
      slug: (community as any).slug || null,
      name: (community as any).name || null,
      title: (community as any).name || null,
    } : null,
  };
}

function communityRoute(event: CommunityEventDetail) {
  return `/backstage/${event.community?.slug || event.community_id}`;
}

export default function CommunityEventRoute() {
  const theme = usePluggdTheme();
  const styles = useCommunityEventStyles();
  const bottomInset = useBottomChromeInset();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const eventId = String(id || '');
  const query = useQuery({
    queryKey: ['culture', 'community-event', eventId],
    queryFn: () => loadCommunityEvent(eventId),
    enabled: !!eventId,
  });
  const event = query.data;

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <LinearGradient colors={theme.scheme === 'dark' ? ['#0A0806', '#0B0B12', '#0A0806'] : ['#FFF8ED', '#F1E5F8', '#FFF8ED']} style={StyleSheet.absoluteFill} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: Math.max(insets.top + 18, 56), paddingBottom: bottomInset }}
      >
        <View style={styles.headerRow}>
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" style={styles.iconButton} onPress={() => (router.canGoBack() ? router.back() : router.replace('/community' as any))}>
            <MaterialIcons name="chevron-left" size={28} color={theme.colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>COMMUNITY EVENT</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Open community" style={styles.iconButton} onPress={() => event ? router.push(communityRoute(event) as any) : router.push('/community' as any)}>
            <MaterialIcons name="groups" size={21} color={theme.colors.text} />
          </Pressable>
        </View>

        {query.isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={theme.colors.accentText} />
            <Text style={styles.loadingText}>Loading community event...</Text>
          </View>
        ) : null}

        {!query.isLoading && !event ? (
          <RecoveryState
            eyebrow="COMMUNITY DATE CLOSED"
            title="This gathering is no longer listed"
            body="The host may have changed the plan or moved the conversation. Browse the current community calendar."
            icon="diversity-3"
            primaryLabel="Explore events"
            onPrimary={() => router.replace('/events' as any)}
            secondaryLabel="Go back"
            onSecondary={() => (router.canGoBack() ? router.back() : router.replace('/community' as any))}
          />
        ) : null}

        {event ? (
          <>
            <View style={styles.hero}>
              <LinearGradient
                colors={theme.scheme === 'dark'
                  ? ['rgba(124,58,237,0.3)', 'rgba(255,102,0,0.14)', 'rgba(23,19,16,0.98)']
                  : ['rgba(124,58,237,0.10)', 'rgba(232,79,0,0.10)', 'rgba(255,252,247,0.98)']}
                style={StyleSheet.absoluteFill}
              />
              <Text style={styles.kicker}>{event.event_type || 'Community event'}</Text>
              <Text style={styles.title}>{event.title}</Text>
              <Text style={styles.meta}>{[event.location || 'Online / TBA', formatDate(event.starts_at)].filter(Boolean).join(' · ')}</Text>
              {event.description ? <Text style={styles.description}>{event.description}</Text> : null}
            </View>

            <View style={styles.actions}>
              {event.meeting_url ? (
                <Pressable
                  accessibilityRole="button"
                  style={styles.primaryButton}
                  onPress={() => {
                    selectionHaptic();
                    void Linking.openURL(event.meeting_url!);
                  }}
                >
                  <Text style={styles.primaryText}>Join Room</Text>
                </Pressable>
              ) : null}
              {event.replay_url ? (
                <Pressable
                  accessibilityRole="button"
                  style={styles.secondaryButton}
                  onPress={() => {
                    selectionHaptic();
                    void Linking.openURL(event.replay_url!);
                  }}
                >
                  <Text style={styles.secondaryText}>Open Replay</Text>
                </Pressable>
              ) : null}
              <Pressable accessibilityRole="button" style={styles.secondaryButton} onPress={() => router.push(communityRoute(event) as any)}>
                <Text style={styles.secondaryText}>Open Community</Text>
              </Pressable>
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function useCommunityEventStyles() {
  const theme = usePluggdTheme();
  return useMemo(() => StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  headerRow: { marginHorizontal: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconButton: { width: 44, height: 44, borderRadius: 5, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: theme.colors.text, fontSize: 13, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900', letterSpacing: 1.4 },
  loading: { minHeight: 240, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { color: theme.colors.textMuted, fontSize: 13, fontFamily: pluggdFonts.satoshiBold, fontWeight: '800' },
  hero: { marginHorizontal: 16, minHeight: 220, borderRadius: 6, borderWidth: 1, borderColor: theme.colors.border, overflow: 'hidden', backgroundColor: theme.colors.surface, padding: 18, justifyContent: 'flex-end' },
  kicker: { color: theme.colors.accentText, fontSize: 11, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
  title: { marginTop: 8, color: theme.colors.text, fontSize: 30, lineHeight: 34, fontFamily: pluggdFonts.displayExtraBold, fontWeight: '800' },
  meta: { marginTop: 7, color: theme.colors.textMuted, fontSize: 14, lineHeight: 18, fontFamily: pluggdFonts.satoshiBold, fontWeight: '800' },
  description: { marginTop: 12, color: theme.colors.textSecondary, fontSize: 14, lineHeight: 21, fontFamily: pluggdFonts.satoshiMedium, fontWeight: '600' },
  actions: { marginHorizontal: 16, marginTop: 14, gap: 10 },
  primaryButton: { minHeight: 48, borderRadius: 5, backgroundColor: theme.colors.accentFill, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: theme.colors.onAccent, fontSize: 13, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  secondaryButton: { minHeight: 44, borderRadius: 5, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: theme.colors.text, fontSize: 13, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  emptyCard: { marginHorizontal: 16, borderRadius: 5, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, padding: 16, gap: 8 },
  emptyTitle: { color: theme.colors.text, fontSize: 17, fontFamily: pluggdFonts.displayBold, fontWeight: '700' },
  emptyBody: { color: theme.colors.textMuted, fontSize: 13, lineHeight: 19, fontFamily: pluggdFonts.satoshiMedium, fontWeight: '600' },
}), [theme]);
}
