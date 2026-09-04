import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, View } from 'react-native';
import { EmptyState, ListCard, ScreenShell, SectionTitle } from '../components/ContentUI';
import { loadLibraryBundle } from '../src/features/culture/mobileServices';
import { usePluggdTheme } from '../src/design/usePluggdTheme';

export default function FavoritesScreen() {
  const router = useRouter();
  const theme = usePluggdTheme();
  const library = useQuery({ queryKey: ['culture', 'library'], queryFn: loadLibraryBundle });
  const items = library.data?.saved ?? [];

  return (
    <ScreenShell title="Saved" subtitle="Content saved to your PLUGGD account.">
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack.Screen options={{ headerShown: false }} />
      {library.isLoading ? (
        <View style={{ minHeight: 220, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={theme.colors.accentText} />
        </View>
      ) : null}
      {!library.isLoading && items.length === 0 ? (
        <EmptyState
          title="No saved items yet"
          body="Save beats, releases, playlists, events, and community posts to build your PLUGGD library."
        />
      ) : null}
      {items.length > 0 ? <SectionTitle title="Saved for later" /> : null}
      {items.map((item) => (
        <ListCard
          key={`${item.source}-${item.id}`}
          title={item.title}
          subtitle={item.subtitle}
          meta={item.kind.replace('_', ' ')}
          imageUrl={item.imageUrl}
          onPress={() => router.push(item.route as any)}
        />
      ))}
    </ScreenShell>
  );
}
