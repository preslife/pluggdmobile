import { MaterialIcons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ContextRail, EmptyState, ListCard, PosterCard, ScreenShell, SectionTitle } from '../../components/ContentUI';
import { usePluggdTheme } from '../../src/design/usePluggdTheme';
import { supabase } from '../../src/lib/supabase';
import { PLUGGD_ORANGE, SoundboardItem, formatCompact, formatDate } from '../../src/lib/mobileContent';

const TABS = ['All', 'Featured', 'Recent', 'Following'];

export default function SoundboardsScreen() {
  const router = useRouter();
  const theme = usePluggdTheme();
  const [tab, setTab] = useState('All');
  const [boards, setBoards] = useState<SoundboardItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('soundboards')
        .select('id,creator_id,slug,title,description,cover_image_url,item_count,like_count,comment_count,follower_count,last_activity_at,created_at')
        .eq('is_published', true)
        .in('visibility', ['public', 'link'])
        .order('last_activity_at', { ascending: false })
        .limit(50);

      if (mounted) {
        setBoards(error || !Array.isArray(data) ? [] : (data as SoundboardItem[]));
        setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    if (tab === 'Featured') return boards.filter((board) => Number(board.like_count ?? 0) > 0 || Number(board.follower_count ?? 0) > 0);
    return boards;
  }, [boards, tab]);

  return (
    <ScreenShell
      title="Soundboards"
      subtitle="Creator process boards for demos, notes, references, reactions and audio scraps."
      action={
        <Pressable style={styles.actionButton} onPress={() => router.push('/creator/upload' as any)}>
          <MaterialIcons name="add" size={19} color="#FFFFFF" />
          <Text style={styles.actionText}>Create</Text>
        </Pressable>
      }
    >
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack.Screen options={{ headerShown: false }} />
      <ContextRail tabs={TABS} active={tab} onChange={setTab} />

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={PLUGGD_ORANGE} />
        </View>
      ) : null}

      {!loading && filtered.length === 0 ? (
        <EmptyState title="No soundboards yet" body="Published creator boards will appear here." />
      ) : null}

      {filtered.length > 0 ? (
        <>
          <SectionTitle title="Open boards" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
            {filtered.slice(0, 8).map((board) => (
              <PosterCard
                key={board.id}
                title={board.title || 'Untitled board'}
                subtitle={`${board.item_count ?? 0} items`}
                meta={`${formatCompact(board.like_count)} likes`}
                imageUrl={board.cover_image_url}
                icon="dashboard-customize"
                onPress={() => router.push(`/soundboards/${board.slug || board.id}` as any)}
              />
            ))}
          </ScrollView>

          <SectionTitle title="Recently updated" />
          {filtered.map((board) => (
            <ListCard
              key={board.id}
              title={board.title || 'Untitled board'}
              subtitle={board.description || 'Creator soundboard'}
              meta={`${board.item_count ?? 0} items · ${formatCompact(board.follower_count)} followers · ${formatDate(board.last_activity_at)}`}
              imageUrl={board.cover_image_url}
              onPress={() => router.push(`/soundboards/${board.slug || board.id}` as any)}
            />
          ))}
        </>
      ) : null}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    minHeight: 42,
    borderRadius: 16,
    backgroundColor: PLUGGD_ORANGE,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  loading: {
    minHeight: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rail: {
    paddingBottom: 18,
  },
});
