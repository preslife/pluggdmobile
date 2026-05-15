import { MaterialIcons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ListCard } from '../../components/ContentUI';
import { usePlayback } from '../../src/context/PlaybackProvider';
import { supabase } from '../../src/lib/supabase';
import {
  PLUGGD_ORANGE,
  SoundboardContentItem,
  SoundboardItem,
  formatCompact,
  toTrack,
} from '../../src/lib/mobileContent';

export default function SoundboardDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { playTrack, playQueue } = usePlayback();
  const [board, setBoard] = useState<SoundboardItem | null>(null);
  const [items, setItems] = useState<SoundboardContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowingCreator, setIsFollowingCreator] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const boardRes = await (supabase as any)
        .from('soundboards')
        .select('id,creator_id,slug,title,description,cover_image_url,item_count,like_count,comment_count,follower_count,last_activity_at,created_at')
        .or(`id.eq.${id},slug.eq.${id}`)
        .maybeSingle();
      const nextBoard = boardRes.error ? null : (boardRes.data as SoundboardItem | null);
      const itemRes = nextBoard
        ? await (supabase as any)
            .from('soundboard_items')
            .select('id,soundboard_id,item_type,title,description,content_text,media_url,external_url,duration_seconds,is_pinned,plays_count,likes_count,comments_count,position,created_at')
            .eq('soundboard_id', nextBoard.id)
            .order('is_pinned', { ascending: false })
            .order('position', { ascending: true })
        : { data: [] };

      if (!mounted) return;
      setBoard(nextBoard);
      setItems(Array.isArray(itemRes.data) ? (itemRes.data as SoundboardContentItem[]) : []);
      setLoading(false);
    };
    if (id) load();
    return () => {
      mounted = false;
    };
  }, [id]);

  useEffect(() => {
    let mounted = true;

    const checkFollow = async () => {
      if (!board?.creator_id) {
        setIsFollowingCreator(false);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted || !user) {
        if (mounted) setIsFollowingCreator(false);
        return;
      }

      const { data } = await (supabase as any)
        .from('user_follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', board.creator_id)
        .maybeSingle();

      if (mounted) setIsFollowingCreator(Boolean(data));
    };

    void checkFollow();

    return () => {
      mounted = false;
    };
  }, [board?.creator_id]);

  const audioItems = items.filter((item) => item.item_type === 'audio' && item.media_url);

  const playAll = () => {
    const tracks = audioItems.map((item) => toTrack(item, 'soundboard')).filter(Boolean);
    if (tracks.length) {
      playQueue(tracks as any);
      return;
    }

    Alert.alert('No public audio', 'This soundboard does not have playable public audio yet.');
  };

  const toggleCreatorFollow = async () => {
    if (!board?.creator_id || followLoading) {
      Alert.alert('Follow unavailable', 'This soundboard is not linked to a creator profile yet.');
      return;
    }

    setFollowLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/auth/login' as any);
        return;
      }

      if (isFollowingCreator) {
        const { error } = await (supabase as any)
          .from('user_follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', board.creator_id);
        if (error) throw error;
        setIsFollowingCreator(false);
        return;
      }

      const { error } = await (supabase as any).from('user_follows').insert({
        follower_id: user.id,
        following_id: board.creator_id,
      });

      if (error) throw error;
      setIsFollowingCreator(true);
    } catch (error: any) {
      Alert.alert('Follow failed', error?.message ?? 'Could not update this follow right now.');
    } finally {
      setFollowLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <MaterialIcons name="chevron-left" size={28} color="#FFFFFF" />
        </Pressable>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={PLUGGD_ORANGE} />
          </View>
        ) : null}

        {board ? (
          <>
            <View style={styles.hero}>
              {board.cover_image_url ? <Image source={{ uri: board.cover_image_url }} style={styles.heroImage} /> : null}
              {!board.cover_image_url ? <MaterialIcons name="dashboard-customize" size={58} color={PLUGGD_ORANGE} /> : null}
            </View>
            <Text style={styles.eyebrow}>Soundboard</Text>
            <Text style={styles.title}>{board.title || 'Untitled board'}</Text>
            <Text style={styles.subtitle}>
              {board.item_count ?? items.length} items · {formatCompact(board.follower_count)} followers · {formatCompact(board.like_count)} likes
            </Text>
            {board.description ? <Text style={styles.description}>{board.description}</Text> : null}

            <View style={styles.buttonRow}>
              <Pressable style={styles.primaryButton} onPress={playAll}>
                <MaterialIcons name="play-arrow" size={22} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>Play audio</Text>
              </Pressable>
              <Pressable style={[styles.secondaryButton, followLoading && styles.disabledButton]} onPress={toggleCreatorFollow} disabled={followLoading}>
                {followLoading ? (
                  <ActivityIndicator color={PLUGGD_ORANGE} />
                ) : (
                  <MaterialIcons name={isFollowingCreator ? 'favorite' : 'favorite-border'} size={20} color={PLUGGD_ORANGE} />
                )}
                <Text style={styles.secondaryButtonText}>{isFollowingCreator ? 'Following' : 'Follow creator'}</Text>
              </Pressable>
            </View>

            <Text style={styles.sectionTitle}>Board items</Text>
            {items.length === 0 ? <Text style={styles.emptyText}>No public items yet.</Text> : null}
            {items.map((item) => (
              <ListCard
                key={item.id}
                title={item.title || `${item.item_type} item`}
                subtitle={item.description || item.content_text || item.external_url || 'Soundboard item'}
                meta={`${item.item_type} · ${formatCompact(item.likes_count)} likes · ${formatCompact(item.comments_count)} comments`}
                icon={item.item_type === 'link' ? 'open-in-new' : 'chevron-right'}
                onPress={() => {
                  if (item.item_type === 'link' && item.external_url) Linking.openURL(item.external_url);
                }}
                onPlay={
                  item.item_type === 'audio' && item.media_url
                    ? () => {
                        const track = toTrack(item, 'soundboard');
                        if (track) playTrack(track);
                      }
                    : undefined
                }
              />
            ))}
          </>
        ) : !loading ? (
          <View style={styles.empty}>
            <Text style={styles.title}>Soundboard unavailable</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#080808' },
  content: { padding: 14, paddingTop: 54, paddingBottom: 220 },
  backButton: { width: 42, height: 42, borderRadius: 8, backgroundColor: '#151515', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  loading: { minHeight: 260, alignItems: 'center', justifyContent: 'center' },
  empty: { minHeight: 260, alignItems: 'center', justifyContent: 'center' },
  hero: { height: 310, borderRadius: 8, backgroundColor: '#151515', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1, borderColor: '#262626' },
  heroImage: { width: '100%', height: '100%' },
  eyebrow: { color: PLUGGD_ORANGE, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginTop: 18 },
  title: { color: '#FFFFFF', fontSize: 34, lineHeight: 39, fontWeight: '700', marginTop: 5 },
  subtitle: { color: '#B8B8B8', fontSize: 16, fontWeight: '700', marginTop: 5 },
  description: { color: '#D4D4D4', fontSize: 15, lineHeight: 22, fontWeight: '600', marginTop: 18 },
  buttonRow: { flexDirection: 'row', gap: 9, marginTop: 20 },
  primaryButton: { flex: 1, height: 54, borderRadius: 8, backgroundColor: PLUGGD_ORANGE, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  secondaryButton: { flex: 1, height: 54, borderRadius: 8, borderWidth: 1, borderColor: PLUGGD_ORANGE, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  secondaryButtonText: { color: PLUGGD_ORANGE, fontSize: 16, fontWeight: '700' },
  disabledButton: { opacity: 0.62 },
  sectionTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '700', marginTop: 24, marginBottom: 11 },
  emptyText: { color: '#AFAFAF', fontSize: 14, fontWeight: '700' },
});
