import { MaterialIcons } from '@expo/vector-icons';
import { pluggdFonts } from '../src/design/typography';
import { useQuery } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { EmptyState, ScreenShell, SectionTitle } from '../components/ContentUI';
import { loadInboxThreads } from '../src/features/culture/mobileServices';
import { PLUGGD_ORANGE, formatDate } from '../src/lib/mobileContent';

export default function InboxRoute() {
  const router = useRouter();
  const query = useQuery({
    queryKey: ['culture', 'inbox-threads'],
    queryFn: () => loadInboxThreads(40),
  });

  return (
    <ScreenShell title="Inbox" subtitle="Creator DMs, support threads and community conversations.">
      <StatusBar style="light" />
      <Stack.Screen options={{ headerShown: false }} />
      {query.data?.length ? <SectionTitle title="Recent conversations" /> : null}
      {!query.isLoading && !query.data?.length ? (
        <>
          <EmptyState title="No conversations yet" body="Creator DMs, support threads, and community replies will appear here." />
          <View style={styles.gatewayGrid}>
            <Pressable accessibilityRole="button" accessibilityLabel="Find creators to follow" style={styles.gateway} onPress={() => router.push('/discover' as any)}>
              <View style={styles.gatewayIcon}><MaterialIcons name="person-search" size={23} color={PLUGGD_ORANGE} /></View>
              <Text style={styles.gatewayKicker}>DISCOVER</Text>
              <Text style={styles.gatewayTitle}>Find your next creator</Text>
              <Text style={styles.gatewayBody}>Follow artists and producers so replies and supporter updates have somewhere to land.</Text>
              <MaterialIcons name="arrow-forward" size={20} color={PLUGGD_ORANGE} />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Open community conversations" style={styles.gateway} onPress={() => router.push('/community' as any)}>
              <View style={styles.gatewayIcon}><MaterialIcons name="forum" size={23} color={PLUGGD_ORANGE} /></View>
              <Text style={styles.gatewayKicker}>COMMUNITY</Text>
              <Text style={styles.gatewayTitle}>Join the conversation</Text>
              <Text style={styles.gatewayBody}>Move from a public thread into the circles, feedback rooms and people shaping your scene.</Text>
              <MaterialIcons name="arrow-forward" size={20} color={PLUGGD_ORANGE} />
            </Pressable>
          </View>
        </>
      ) : null}
      {(query.data || []).map((thread) => (
        <Pressable accessibilityRole="button" accessibilityLabel={`Open ${thread.title}`} key={thread.id} style={styles.threadCard} onPress={() => router.push(thread.route as any)}>
          <View style={styles.iconWrap}>
            <MaterialIcons name="mail-outline" size={22} color={PLUGGD_ORANGE} />
          </View>
          <View style={styles.copy}>
            <View style={styles.titleRow}>
              <Text style={styles.title} numberOfLines={1}>{thread.title}</Text>
              {thread.unread_count ? <Text style={styles.unread}>{thread.unread_count}</Text> : null}
            </View>
            <Text style={styles.preview} numberOfLines={2}>{thread.last_message || 'Open this conversation.'}</Text>
            <Text style={styles.meta}>{formatDate(thread.updated_at)}</Text>
          </View>
          <MaterialIcons name="chevron-right" size={22} color="#737373" />
        </Pressable>
      ))}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  gatewayGrid: { flexDirection: 'row', gap: 10, marginTop: 18 },
  gateway: { flex: 1, minHeight: 230, borderTopWidth: 2, borderBottomWidth: 1, borderColor: '#4A2D1D', backgroundColor: '#14110F', padding: 15, alignItems: 'flex-start' },
  gatewayIcon: { width: 44, height: 44, borderRadius: 4, backgroundColor: 'rgba(255,102,0,0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  gatewayKicker: { color: PLUGGD_ORANGE, fontSize: 9, letterSpacing: 1.4, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  gatewayTitle: { color: '#FFFFFF', fontSize: 19, lineHeight: 23, fontFamily: pluggdFonts.displayBold, fontWeight: '700', marginTop: 7 },
  gatewayBody: { flex: 1, color: '#A9A19A', fontSize: 12, lineHeight: 18, fontFamily: pluggdFonts.satoshiMedium, fontWeight: '600', marginTop: 8, marginBottom: 12 },
  threadCard: { minHeight: 92, borderBottomWidth: 1, borderColor: '#302A26', paddingVertical: 13, flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: { width: 44, height: 44, borderRadius: 4, backgroundColor: 'rgba(255,102,0,0.1)', borderWidth: 1, borderColor: 'rgba(255,102,0,0.3)', alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, color: '#FFFFFF', fontSize: 15, fontFamily: pluggdFonts.displayBold, fontWeight: '700' },
  unread: { minWidth: 22, height: 22, borderRadius: 11, overflow: 'hidden', backgroundColor: PLUGGD_ORANGE, color: '#0a0806', textAlign: 'center', textAlignVertical: 'center', fontSize: 11, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  preview: { color: '#B3B3B3', fontSize: 13, lineHeight: 18, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700', marginTop: 4 },
  meta: { color: '#737373', fontSize: 11, fontFamily: pluggdFonts.satoshiBold, fontWeight: '800', marginTop: 6 },
});
