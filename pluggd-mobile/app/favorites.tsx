import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { EmptyState, ListCard, ScreenShell, SectionTitle } from '../components/ContentUI';
import { supabase } from '../src/lib/supabase';
import { BeatItem, PLUGGD_ORANGE, ReleaseItem, formatGBP, priceForRelease } from '../src/lib/mobileContent';

type FavoriteDisplay = {
  id: string;
  title: string;
  subtitle: string;
  meta: string;
  imageUrl?: string | null;
  route: string;
};

export default function FavoritesScreen() {
  const router = useRouter();
  const [items, setItems] = useState<FavoriteDisplay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const [releaseRes, beatRes] = await Promise.all([
        supabase
          .from('releases')
          .select('id,title,artist,cover_art_url,price,download_price,minimum_price')
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('beats')
          .select('id,title,producer_name,image_url,price')
          .eq('is_published', true)
          .order('created_at', { ascending: false })
          .limit(20),
      ]);

      if (!mounted) return;
      const next: FavoriteDisplay[] = [
        ...(Array.isArray(releaseRes.data)
          ? (releaseRes.data as ReleaseItem[]).slice(0, 10).map((item) => ({
              id: `release-${item.id}`,
              title: item.title || 'Untitled release',
              subtitle: item.artist || 'Release',
              meta: formatGBP(priceForRelease(item)),
              imageUrl: item.cover_art_url,
              route: `/release/${item.id}`,
            }))
          : []),
        ...(Array.isArray(beatRes.data)
          ? (beatRes.data as BeatItem[]).slice(0, 10).map((item) => ({
              id: `beat-${item.id}`,
              title: item.title || 'Untitled beat',
              subtitle: item.producer_name || 'Beat',
              meta: formatGBP(item.price),
              imageUrl: item.image_url,
              route: `/beat/${item.id}`,
            }))
          : []),
      ];
      setItems(next);
      setLoading(false);
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <ScreenShell title="Favorites" subtitle="Saved releases, beats, mixes, creators and boards.">
      <StatusBar style="light" />
      <Stack.Screen options={{ headerShown: false }} />
      {loading ? (
        <View style={{ minHeight: 220, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={PLUGGD_ORANGE} />
        </View>
      ) : null}
      {!loading && items.length === 0 ? <EmptyState title="No favorites yet" /> : null}
      {items.length > 0 ? <SectionTitle title="Saved for later" /> : null}
      {items.map((item) => (
        <ListCard
          key={item.id}
          title={item.title}
          subtitle={item.subtitle}
          meta={item.meta}
          imageUrl={item.imageUrl}
          onPress={() => router.push(item.route as any)}
        />
      ))}
    </ScreenShell>
  );
}

