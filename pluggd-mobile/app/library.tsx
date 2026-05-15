import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, View } from 'react-native';
import { EmptyState, ListCard, ScreenShell, SectionTitle } from '../components/ContentUI';
import { PLUGGD_ORANGE } from '../src/lib/mobileContent';
import { loadLibraryBundle } from '../src/features/culture/mobileServices';

export default function LibraryScreen() {
  const router = useRouter();
  const library = useQuery({ queryKey: ['culture', 'library'], queryFn: loadLibraryBundle });
  const saved = library.data?.saved ?? [];
  const purchases = library.data?.purchases ?? [];
  const tickets = library.data?.tickets ?? [];

  return (
    <ScreenShell title="Library" subtitle="Saved and owned music, beats, sample packs and tickets.">
      <StatusBar style="light" />
      <Stack.Screen options={{ headerShown: false }} />
      {library.isLoading ? (
        <View style={{ minHeight: 220, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={PLUGGD_ORANGE} />
        </View>
      ) : null}
      {!library.isLoading && saved.length + purchases.length + tickets.length === 0 ? (
        <EmptyState title="Library is empty" body="Saved beats, saved releases, release unlocks, sample-pack claims and verified tickets will appear here." />
      ) : null}
      {saved.length > 0 ? <SectionTitle title="Saved" /> : null}
      {saved.map((item) => (
        <ListCard
          key={`${item.source}-${item.id}`}
          title={item.title}
          subtitle={item.subtitle}
          meta={item.kind.replace('_', ' ')}
          imageUrl={item.imageUrl}
          onPress={() => router.push(item.route as any)}
        />
      ))}
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
