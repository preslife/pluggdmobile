import { MaterialIcons } from '@expo/vector-icons';
import { pluggdFonts } from '../src/design/typography';
import { useQuery } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { EmptyState, ListCard, ScreenShell, SectionTitle } from '../components/ContentUI';
import { loadLibraryBundle } from '../src/features/culture/mobileServices';
import { PLUGGD_ORANGE } from '../src/lib/mobileContent';

export default function PurchasesScreen() {
  const router = useRouter();
  const library = useQuery({ queryKey: ['culture', 'library'], queryFn: loadLibraryBundle });
  const purchases = library.data?.purchases ?? [];
  const tickets = library.data?.tickets ?? [];
  const entitlements = library.data?.entitlements ?? [];

  return (
    <ScreenShell
      title="Purchases"
      subtitle="Unlocked releases, sample packs, tickets, and account entitlements."
      action={
        <Pressable accessibilityRole="button" style={styles.restoreButton} onPress={() => router.push('/wallet' as any)}>
          <MaterialIcons name="restore" size={18} color={PLUGGD_ORANGE} />
          <Text style={styles.restoreText}>Restore</Text>
        </Pressable>
      }
    >
      <StatusBar style="light" />
      <Stack.Screen options={{ headerShown: false }} />

      {library.isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={PLUGGD_ORANGE} />
        </View>
      ) : null}

      {!library.isLoading && purchases.length + tickets.length + entitlements.length === 0 ? (
        <EmptyState
          title="No purchases yet"
          body="Apple credit unlocks, claimed sample packs, and verified event tickets will appear here when they are linked to your account."
        />
      ) : null}

      {entitlements.length > 0 ? (
        <>
          <SectionTitle title="Available now" />
          {entitlements.map((item) => (
            <Pressable
              key={`${item.kind}-${item.id}`}
              accessibilityRole="button"
              style={styles.entitlementCard}
              onPress={() => router.push((item.route || '/purchases') as any)}
            >
              <View style={styles.iconWrap}>
                <MaterialIcons name={iconForKind(item.kind)} size={22} color={PLUGGD_ORANGE} />
              </View>
              <View style={styles.copy}>
                <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.meta} numberOfLines={1}>{item.kind.replace(/_/g, ' ')} · {item.status}</Text>
              </View>
              <MaterialIcons name="chevron-right" size={22} color="#737373" />
            </Pressable>
          ))}
        </>
      ) : null}

      {purchases.length > 0 ? <SectionTitle title="Purchases" /> : null}
      {purchases.map((item) => (
        <ListCard
          key={`${item.source}-${item.id}`}
          title={item.title}
          subtitle={item.subtitle}
          meta={item.kind.replace('_', ' ')}
          imageUrl={item.imageUrl}
          onPress={() => router.push(item.route as any)}
        />
      ))}

      {tickets.length > 0 ? <SectionTitle title="Tickets" /> : null}
      {tickets.map((ticket) => (
        <ListCard
          key={`${ticket.source}-${ticket.id}`}
          title={ticket.event_title}
          subtitle={ticket.venue || ticket.status}
          meta="ticket"
          imageUrl={ticket.event_image_url}
          onPress={() => router.push(`/events/${ticket.event_id}` as any)}
        />
      ))}
    </ScreenShell>
  );
}

function iconForKind(kind: string): keyof typeof MaterialIcons.glyphMap {
  if (kind === 'ticket') return 'confirmation-number';
  if (kind === 'sample_pack') return 'graphic-eq';
  if (kind === 'credits') return 'paid';
  return 'lock-open';
}

const styles = StyleSheet.create({
  restoreButton: {
    minHeight: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,90,0,0.48)',
    backgroundColor: 'rgba(255,90,0,0.08)',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  restoreText: { color: PLUGGD_ORANGE, fontSize: 12, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  loading: { minHeight: 220, alignItems: 'center', justifyContent: 'center' },
  entitlementCard: {
    minHeight: 76,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#262626',
    backgroundColor: '#151515',
    padding: 13,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,90,0,0.3)',
    backgroundColor: 'rgba(255,90,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1, minWidth: 0 },
  title: { color: '#FFFFFF', fontSize: 15, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  meta: { color: '#B3B3B3', fontSize: 12, fontFamily: pluggdFonts.satoshiBold, fontWeight: '800', marginTop: 4, textTransform: 'capitalize' },
});
