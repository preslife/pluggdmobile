import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { EmptyState, ScreenShell, SectionTitle } from '../components/ContentUI';
import { loadFanIdentitySummary } from '../src/features/culture/mobileServices';
import { PLUGGD_ORANGE, formatDate } from '../src/lib/mobileContent';

export default function BadgesScreen() {
  const router = useRouter();
  const query = useQuery({
    queryKey: ['culture', 'fan-identity'],
    queryFn: () => loadFanIdentitySummary(),
  });
  const identity = query.data;

  return (
    <ScreenShell title="Badges / Rewards" subtitle="Your PLUGGD identity across communities, events and challenges.">
      <StatusBar style="light" />
      <Stack.Screen options={{ headerShown: false }} />
      {!query.isLoading && !identity ? (
        <EmptyState title="Sign in to view fan identity" body="Badges, rewards, event attendance and joined communities are tied to your PLUGGD account." />
      ) : null}

      {identity ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <View style={styles.heroCard}>
            <Text style={styles.heroEyebrow}>FAN IDENTITY</Text>
            <Text style={styles.heroTitle}>{identity.badges.length + identity.rewards.length + identity.joinedCommunities.length} signals</Text>
            <Text style={styles.heroBody}>Badges, event history, rewards, and joined communities build your PLUGGD identity over time.</Text>
          </View>

          <SectionTitle title="Badges" />
          {identity.badges.length ? identity.badges.map((badge) => (
            <IdentityRow key={badge.id} icon="workspace-premium" title={badge.title} subtitle={badge.awarded_at ? `Awarded ${formatDate(badge.awarded_at)}` : 'Badge'} />
          )) : <EmptyState title="No badges yet" body="Earned badges will appear here." />}

          <SectionTitle title="Rewards" />
          {identity.rewards.length ? identity.rewards.map((reward) => (
            <IdentityRow key={reward.id} icon="redeem" title={reward.title} subtitle={reward.description || reward.status || 'Reward'} />
          )) : <EmptyState title="No rewards yet" body="Credits, rewards, and unlockables will appear here." />}

          <SectionTitle title="Joined communities" />
          {identity.joinedCommunities.length ? identity.joinedCommunities.map((community) => (
            <Pressable key={community.id} onPress={() => router.push(`/backstage/${community.slug || community.id}` as any)}>
              <IdentityRow icon="groups" title={community.title} subtitle={community.member_count ? `${community.member_count} members` : 'Community'} />
            </Pressable>
          )) : <EmptyState title="No joined communities" body="Join creator communities to build your PLUGGD fan identity." />}

          <SectionTitle title="Attended events" />
          {identity.attendedEvents.length ? identity.attendedEvents.map((event) => (
            <Pressable key={event.id} onPress={() => router.push(`/events/${event.id}` as any)}>
              <IdentityRow icon="confirmation-number" title={event.title || 'Event'} subtitle={`${formatDate(event.starts_at)} · ${event.location || 'Location TBA'}`} />
            </Pressable>
          )) : <EmptyState title="No event history yet" body="Purchased or attended events will appear here." />}
        </ScrollView>
      ) : null}
    </ScreenShell>
  );
}

function IdentityRow({ icon, title, subtitle }: { icon: keyof typeof MaterialIcons.glyphMap; title: string; subtitle: string }) {
  return (
    <View style={styles.row}>
      <View style={styles.iconWrap}>
        <MaterialIcons name={icon} size={21} color={PLUGGD_ORANGE} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <Text style={styles.subtitle} numberOfLines={2}>{subtitle}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 180 },
  heroCard: { borderRadius: 18, borderWidth: 1, borderColor: '#262626', backgroundColor: '#151515', padding: 16, marginBottom: 20 },
  heroEyebrow: { color: PLUGGD_ORANGE, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  heroTitle: { color: '#FFFFFF', fontSize: 28, lineHeight: 33, fontWeight: '900', marginTop: 5 },
  heroBody: { color: '#B3B3B3', fontSize: 14, lineHeight: 20, fontWeight: '700', marginTop: 8 },
  row: { minHeight: 74, borderRadius: 16, borderWidth: 1, borderColor: '#262626', backgroundColor: '#151515', padding: 13, marginBottom: 9, flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,90,0,0.1)', alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0 },
  title: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  subtitle: { color: '#B3B3B3', fontSize: 12, lineHeight: 17, fontWeight: '700', marginTop: 3 },
});
