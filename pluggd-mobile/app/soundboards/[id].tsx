import { MaterialIcons } from '@expo/vector-icons';
import { pluggdFonts } from '../../src/design/typography';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { ListCard } from '../../components/ContentUI';
import { DetailTitle } from '../../components/DetailTitle';
import { usePlayback } from '../../src/context/PlaybackProvider';
import {
  addSoundboardComment,
  addSoundboardItemComment,
  loadSoundboardItemDetails,
  logSoundboardItemPlay,
  toggleSavedContent,
  toggleSoundboardItemReaction,
} from '../../src/features/culture/mobileServices';
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
  const [saving, setSaving] = useState(false);
  const [boardComments, setBoardComments] = useState<Array<{ id: string; content: string; created_at: string }>>([]);
  const [commentText, setCommentText] = useState('');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const boardRes = await (supabase as any)
        .from('soundboards')
        .select('id,creator_id,slug,title,description,cover_image_url,item_count,like_count,comment_count,follower_count,last_activity_at,created_at')
        .or(`id.eq.${id},slug.eq.${id}`)
        .maybeSingle();
      const nextBoard = boardRes.error ? null : (boardRes.data as SoundboardItem | null);
      const detail = nextBoard ? await loadSoundboardItemDetails(nextBoard.id) : { items: [], boardComments: [] };

      if (!mounted) return;
      setBoard(nextBoard);
      setItems(detail.items as SoundboardContentItem[]);
      setBoardComments(detail.boardComments.map((row) => ({ id: row.id, content: row.content, created_at: row.created_at })));
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

  const saveSoundboard = async () => {
    if (!board || saving) return;
    setSaving(true);
    const result = await toggleSavedContent('soundboard', board.id);
    setSaving(false);
    Alert.alert(result.success ? (result.saved ? 'Saved' : 'Removed') : 'Save unavailable', result.success ? `${board.title || 'Soundboard'} library state updated.` : result.error || 'Please try again.');
  };

  const shareSoundboard = async () => {
    if (!board) return;
    await Share.share({ message: `PLUGGD soundboard: ${board.title || 'Untitled soundboard'}` });
  };

  const submitBoardComment = async () => {
    if (!board) return;
    const result = await addSoundboardComment(board.id, commentText);
    if (!result.success) {
      Alert.alert('Comment unavailable', result.error || 'Could not post this comment.');
      return;
    }
    setBoardComments((current) => [{ id: `local-${Date.now()}`, content: commentText.trim(), created_at: new Date().toISOString() }, ...current]);
    setCommentText('');
  };

  const reactToItem = async (item: SoundboardContentItem) => {
    const result = await toggleSoundboardItemReaction(item.id, 'fire');
    Alert.alert(result.success ? 'Reaction updated' : 'Reaction unavailable', result.success ? 'Your reaction was saved.' : result.error || 'Soundboard item reactions are not available yet.');
  };

  const commentOnItem = async (item: SoundboardContentItem) => {
    Alert.prompt(
      'Comment on item',
      item.title || 'Soundboard item',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Post',
          onPress: async (value?: string) => {
            const result = await addSoundboardItemComment(item.id, value || '');
            Alert.alert(result.success ? 'Item comment added' : 'Item comments unavailable', result.success ? 'Your comment was saved.' : result.error || 'Soundboard item comments are not available yet.');
          },
        },
      ],
      'plain-text',
    );
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
            <DetailTitle title={board.title || 'Untitled board'} style={{ marginTop: 5 }} />
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

            <View style={styles.quickActions}>
              <Pressable style={styles.quickActionButton} onPress={saveSoundboard} disabled={saving}>
                <MaterialIcons name="bookmark-border" size={19} color={PLUGGD_ORANGE} />
                <Text style={styles.quickActionText}>{saving ? 'Saving' : 'Save'}</Text>
              </Pressable>
              <Pressable style={styles.quickActionButton} onPress={() => router.push('/create-post' as any)}>
                <MaterialIcons name="post-add" size={19} color={PLUGGD_ORANGE} />
                <Text style={styles.quickActionText}>Post</Text>
              </Pressable>
              <Pressable style={styles.quickActionButton} onPress={shareSoundboard}>
                <MaterialIcons name="ios-share" size={19} color={PLUGGD_ORANGE} />
                <Text style={styles.quickActionText}>Share</Text>
              </Pressable>
            </View>

            <Text style={styles.sectionTitle}>Board items</Text>
            {items.length === 0 ? <Text style={styles.emptyText}>No public items yet.</Text> : null}
            {items.map((item) => (
              <View key={item.id} style={styles.itemBlock}>
                <ListCard
                  title={item.title || `${item.item_type} item`}
                  subtitle={item.description || item.content_text || item.external_url || 'Soundboard item'}
                  meta={`${item.item_type} · ${formatCompact(item.likes_count)} reactions · ${formatCompact(item.comments_count)} comments`}
                  icon={item.item_type === 'link' ? 'open-in-new' : 'chevron-right'}
                  onPress={() => {
                    if (item.item_type === 'link' && item.external_url) Linking.openURL(item.external_url);
                    if (item.item_type === 'image' && item.media_url) Linking.openURL(item.media_url);
                  }}
                  onPlay={
                    item.item_type === 'audio' && item.media_url
                      ? () => {
                          const track = toTrack(item, 'soundboard');
                          if (track) {
                            void logSoundboardItemPlay(item.id);
                            playTrack(track);
                          }
                        }
                      : undefined
                  }
                />
                <View style={styles.itemActions}>
                  <Pressable style={styles.itemAction} onPress={() => reactToItem(item)}>
                    <MaterialIcons name="local-fire-department" size={16} color={PLUGGD_ORANGE} />
                    <Text style={styles.itemActionText}>React</Text>
                  </Pressable>
                  <Pressable style={styles.itemAction} onPress={() => commentOnItem(item)}>
                    <MaterialIcons name="chat-bubble-outline" size={16} color={PLUGGD_ORANGE} />
                    <Text style={styles.itemActionText}>Comment</Text>
                  </Pressable>
                  {item.external_url || item.media_url ? (
                    <Pressable style={styles.itemAction} onPress={() => Linking.openURL(item.external_url || item.media_url || '')}>
                      <MaterialIcons name="open-in-new" size={16} color={PLUGGD_ORANGE} />
                      <Text style={styles.itemActionText}>Open</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            ))}

            <Text style={styles.sectionTitle}>Board discussion</Text>
            <View style={styles.commentComposer}>
              <TextInput
                value={commentText}
                onChangeText={setCommentText}
                placeholder="Add to this soundboard"
                placeholderTextColor="#737373"
                style={styles.commentInput}
                multiline
              />
              <Pressable style={styles.commentButton} onPress={submitBoardComment}>
                <Text style={styles.commentButtonText}>Post</Text>
              </Pressable>
            </View>
            {boardComments.length ? (
              boardComments.slice(0, 8).map((comment) => (
                <View key={comment.id} style={styles.commentCard}>
                  <Text style={styles.commentBody}>{comment.content}</Text>
                  <Text style={styles.commentMeta}>{new Date(comment.created_at).toLocaleDateString()}</Text>
                </View>
              ))
            ) : (
              <View style={styles.commentCard}>
                <Text style={styles.commentBody}>No board comments yet. Reactions and comments from the web-backed soundboard tables appear here.</Text>
              </View>
            )}
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
  eyebrow: { color: PLUGGD_ORANGE, fontSize: 12, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700', textTransform: 'uppercase', marginTop: 18 },
  title: { color: '#FFFFFF', fontSize: 34, lineHeight: 39, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700', marginTop: 5 },
  subtitle: { color: '#B8B8B8', fontSize: 16, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700', marginTop: 5 },
  description: { color: '#D4D4D4', fontSize: 15, lineHeight: 22, fontFamily: pluggdFonts.satoshiMedium, fontWeight: '600', marginTop: 18 },
  buttonRow: { flexDirection: 'row', gap: 9, marginTop: 20 },
  primaryButton: { flex: 1, height: 54, borderRadius: 8, backgroundColor: PLUGGD_ORANGE, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700' },
  secondaryButton: { flex: 1, height: 54, borderRadius: 8, borderWidth: 1, borderColor: PLUGGD_ORANGE, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  secondaryButtonText: { color: PLUGGD_ORANGE, fontSize: 16, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700' },
  quickActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  quickActionButton: { minHeight: 40, flexGrow: 1, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,90,0,0.32)', backgroundColor: 'rgba(255,90,0,0.08)', paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  quickActionText: { color: PLUGGD_ORANGE, fontSize: 12, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  disabledButton: { opacity: 0.62 },
  sectionTitle: { color: '#FFFFFF', fontSize: 22, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700', marginTop: 24, marginBottom: 11 },
  emptyText: { color: '#AFAFAF', fontSize: 14, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700' },
  itemBlock: { marginBottom: 10 },
  itemActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: -4, marginBottom: 6 },
  itemAction: { minHeight: 34, borderRadius: 17, borderWidth: 1, borderColor: 'rgba(255,90,0,0.28)', backgroundColor: 'rgba(255,90,0,0.08)', paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 5 },
  itemActionText: { color: PLUGGD_ORANGE, fontSize: 12, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  commentComposer: { borderRadius: 14, borderWidth: 1, borderColor: '#262626', backgroundColor: '#151515', padding: 12, gap: 10 },
  commentInput: { minHeight: 66, color: '#FFFFFF', fontSize: 15, lineHeight: 21, fontFamily: pluggdFonts.satoshiMedium, fontWeight: '600' },
  commentButton: { height: 42, borderRadius: 21, backgroundColor: PLUGGD_ORANGE, alignItems: 'center', justifyContent: 'center' },
  commentButtonText: { color: '#08080C', fontSize: 13, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  commentCard: { marginTop: 10, borderRadius: 14, borderWidth: 1, borderColor: '#262626', backgroundColor: '#151515', padding: 13 },
  commentBody: { color: '#E4E4E9', fontSize: 14, lineHeight: 20, fontFamily: pluggdFonts.satoshiMedium, fontWeight: '600' },
  commentMeta: { color: '#737373', fontSize: 11, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700', marginTop: 6 },
});
