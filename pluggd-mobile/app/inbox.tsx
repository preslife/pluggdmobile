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
        <EmptyState title="No conversations yet" body="Creator DMs, support threads, and community replies will appear here." />
      ) : null}
      {(query.data || []).map((thread) => (
        <Pressable key={thread.id} style={styles.threadCard} onPress={() => router.push(thread.route as any)}>
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
  threadCard: { minHeight: 92, borderRadius: 16, borderWidth: 1, borderColor: '#262626', backgroundColor: '#151515', padding: 13, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,90,0,0.1)', borderWidth: 1, borderColor: 'rgba(255,90,0,0.3)', alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, color: '#FFFFFF', fontSize: 15, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  unread: { minWidth: 22, height: 22, borderRadius: 11, overflow: 'hidden', backgroundColor: PLUGGD_ORANGE, color: '#08080C', textAlign: 'center', textAlignVertical: 'center', fontSize: 11, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  preview: { color: '#B3B3B3', fontSize: 13, lineHeight: 18, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700', marginTop: 4 },
  meta: { color: '#737373', fontSize: 11, fontFamily: pluggdFonts.satoshiBold, fontWeight: '800', marginTop: 6 },
});
