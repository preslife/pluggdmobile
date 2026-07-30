import { MaterialIcons } from '@expo/vector-icons';
import { pluggdFonts } from '../src/design/typography';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { EmptyState, ListCard, ScreenShell, SectionTitle } from '../components/ContentUI';
import { PluggdImage } from '../src/components/PluggdImage';
import { loadLibraryBundle } from '../src/features/culture/mobileServices';
import { useHomeFeed } from '../src/features/culture/useCultureData';
import { PLUGGD_ORANGE } from '../src/lib/mobileContent';

export default function PurchasesScreen() {
  const router = useRouter();
  const library = useQuery({ queryKey: ['culture', 'library'], queryFn: loadLibraryBundle });
  const feed = useHomeFeed();
  const purchases = library.data?.purchases ?? [];
  const tickets = library.data?.tickets ?? [];
  const entitlements = library.data?.entitlements ?? [];
  const isEmpty = !library.isLoading && purchases.length + tickets.length + entitlements.length === 0;
  const gateways = [
    {
      label: 'Releases',
      detail: 'Own the music',
      route: '/releases',
      image: feed.data?.releases.find((item) => item.cover_art_url)?.cover_art_url,
      icon: 'album' as const,
    },
    {
      label: 'Beat licences',
      detail: 'Rights for your work',
      route: '/market/beats',
      image: feed.data?.beats.find((item) => item.image_url)?.image_url,
      icon: 'library-music' as const,
    },
    {
      label: 'Events',
      detail: 'Tickets and RSVPs',
      route: '/events',
      image: feed.data?.events.find((item) => item.cover_image_url)?.cover_image_url,
      icon: 'confirmation-number' as const,
    },
    {
      label: 'Memberships',
      detail: 'Back a creator',
      route: '/membership',
      image: feed.data?.profiles.find((item) => item.avatar_url)?.avatar_url,
      icon: 'workspace-premium' as const,
    },
  ];

  return (
    <ScreenShell
      title="Purchases"
      subtitle="Verified releases, licences, memberships, tickets, merchandise, downloads and receipts."
      action={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Restore App Store memberships"
          style={styles.restoreButton}
          onPress={() => router.push('/membership' as any)}
        >
          <MaterialIcons name="restore" size={18} color={PLUGGD_ORANGE} />
          <Text style={styles.restoreText}>Restore Apple</Text>
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

      {isEmpty ? (
        <>
          <EmptyState
            title="No purchases yet"
            body="Verified release unlocks, beat licences, memberships, tickets and physical orders will appear here—regardless of where the payment began."
          />
          <SectionTitle title="Start somewhere" />
          <View style={styles.gatewayGrid}>
            {gateways.map((item) => (
              <Pressable
                key={item.label}
                accessibilityRole="button"
                accessibilityLabel={`Explore ${item.label}`}
                onPress={() => router.push(item.route as any)}
                style={styles.gatewayPressable}
              >
                <View style={styles.gatewayCard}>
                  {item.image ? (
                    <PluggdImage uri={item.image} style={styles.gatewayImage} displayWidth={420} />
                  ) : (
                    <View style={[styles.gatewayImage, styles.gatewayFallback]}>
                      <MaterialIcons name={item.icon} size={28} color={PLUGGD_ORANGE} />
                    </View>
                  )}
                  <LinearGradient colors={['rgba(5,4,3,0.08)', 'rgba(5,4,3,0.94)']} style={StyleSheet.absoluteFillObject} />
                  <MaterialIcons name={item.icon} size={18} color={PLUGGD_ORANGE} />
                  <View>
                    <Text style={styles.gatewayTitle}>{item.label}</Text>
                    <Text style={styles.gatewayDetail}>{item.detail}</Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        </>
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
          onPress={() => router.push(
            (ticket.source === 'ticket_orders' || ticket.ticket_order_id
              ? `/commerce/order?id=${ticket.ticket_order_id || ticket.id}&kind=event_ticket`
              : `/tickets?eventId=${ticket.event_id}`) as any,
          )}
        />
      ))}
    </ScreenShell>
  );
}

function iconForKind(kind: string): keyof typeof MaterialIcons.glyphMap {
  if (kind === 'ticket') return 'confirmation-number';
  if (kind === 'beat') return 'library-music';
  if (kind === 'creator_membership') return 'workspace-premium';
  if (kind === 'physical_merch') return 'shopping-bag';
  if (kind === 'sample_pack') return 'graphic-eq';
  if (kind === 'credits') return 'paid';
  return 'lock-open';
}

const styles = StyleSheet.create({
  restoreButton: {
    minHeight: 44,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,102,0,0.48)',
    backgroundColor: 'rgba(255,102,0,0.08)',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  restoreText: { color: PLUGGD_ORANGE, fontSize: 12, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  loading: { minHeight: 220, alignItems: 'center', justifyContent: 'center' },
  gatewayGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 2, marginBottom: 18 },
  gatewayPressable: { width: '48.5%' },
  gatewayCard: { height: 142, borderRadius: 6, overflow: 'hidden', padding: 12, justifyContent: 'space-between', backgroundColor: '#171411' },
  gatewayImage: { ...StyleSheet.absoluteFillObject, backgroundColor: '#201A16' },
  gatewayFallback: { alignItems: 'center', justifyContent: 'center' },
  gatewayTitle: { color: '#FFF', fontSize: 15, lineHeight: 18, fontFamily: pluggdFonts.displayBold },
  gatewayDetail: { color: '#D2CAC0', fontSize: 10.5, lineHeight: 14, fontFamily: pluggdFonts.satoshiMedium, marginTop: 3 },
  entitlementCard: {
    minHeight: 76,
    borderRadius: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#262626',
    backgroundColor: 'transparent',
    paddingVertical: 13,
    paddingHorizontal: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,102,0,0.3)',
    backgroundColor: 'rgba(255,102,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1, minWidth: 0 },
  title: { color: '#FFFFFF', fontSize: 15, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  meta: { color: '#B3B3B3', fontSize: 12, fontFamily: pluggdFonts.satoshiBold, fontWeight: '800', marginTop: 4, textTransform: 'capitalize' },
});
