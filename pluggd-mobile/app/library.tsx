import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { EmptyState, ListCard, ScreenShell, SectionTitle } from '../components/ContentUI';
import { supabase } from '../src/lib/supabase';
import { BeatItem, PLUGGD_ORANGE, ReleaseItem, SamplePackItem } from '../src/lib/mobileContent';

type LibraryItem = {
  id: string;
  type: 'release' | 'beat' | 'sample_pack';
  title: string;
  subtitle: string;
  imageUrl?: string | null;
  route: string;
};

export default function LibraryScreen() {
  const router = useRouter();
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const [releaseRes, beatRes, packRes] = await Promise.all([
        supabase
          .from('releases')
          .select('id,title,artist,cover_art_url')
          .order('created_at', { ascending: false })
          .limit(12),
        supabase
          .from('beats')
          .select('id,title,producer_name,image_url')
          .eq('is_published', true)
          .order('created_at', { ascending: false })
          .limit(12),
        (supabase as any)
          .from('sample_packs')
          .select('id,title,genre,cover_art_url')
          .order('created_at', { ascending: false })
          .limit(12),
      ]);
      if (!mounted) return;
      const next: LibraryItem[] = [
        ...(Array.isArray(releaseRes.data)
          ? (releaseRes.data as ReleaseItem[]).map((item) => ({
              id: item.id,
              type: 'release' as const,
              title: item.title || 'Untitled release',
              subtitle: item.artist || 'Release',
              imageUrl: item.cover_art_url,
              route: `/release/${item.id}`,
            }))
          : []),
        ...(Array.isArray(beatRes.data)
          ? (beatRes.data as BeatItem[]).map((item) => ({
              id: item.id,
              type: 'beat' as const,
              title: item.title || 'Untitled beat',
              subtitle: item.producer_name || 'Beat',
              imageUrl: item.image_url,
              route: `/beat/${item.id}`,
            }))
          : []),
        ...(Array.isArray(packRes.data)
          ? (packRes.data as SamplePackItem[]).map((item) => ({
              id: item.id,
              type: 'sample_pack' as const,
              title: item.title || 'Untitled pack',
              subtitle: item.genre || 'Sample pack',
              imageUrl: item.cover_art_url,
              route: `/sample-pack/${item.id}`,
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
    <ScreenShell title="Library" subtitle="Owned and saved releases, beats, sample packs, memberships and downloads.">
      <StatusBar style="light" />
      <Stack.Screen options={{ headerShown: false }} />
      {loading ? (
        <View style={{ minHeight: 220, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={PLUGGD_ORANGE} />
        </View>
      ) : null}
      {!loading && items.length === 0 ? <EmptyState title="Library is empty" /> : null}
      {items.length > 0 ? <SectionTitle title="Recently added" /> : null}
      {items.map((item) => (
        <ListCard
          key={`${item.type}-${item.id}`}
          title={item.title}
          subtitle={item.subtitle}
          meta={item.type.replace('_', ' ')}
          imageUrl={item.imageUrl}
          onPress={() => router.push(item.route as any)}
        />
      ))}
    </ScreenShell>
  );
}

