import { MaterialIcons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { impactHaptic, selectionHaptic } from '../../src/design/haptics';
import { contentInitials, formatCompact, formatDate } from '../../src/lib/mobileContent';
import { addComment, loadPostDetail, toggleLike } from '../../src/features/culture/mobileServices';

const ORANGE = '#FF5A00';
const CANVAS = '#08080C';
const SURFACE = '#12121A';
const BORDER = '#1F1F2E';
const MUTED = '#8E8E9F';

export default function SocialPostDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState('');

  const query = useQuery({
    queryKey: ['culture', 'post-detail', id],
    queryFn: () => loadPostDetail(String(id)),
    enabled: !!id,
  });

  const likeMutation = useMutation({
    mutationFn: () => toggleLike(String(id)),
    onSuccess: (result) => {
      if (!result.success) throw new Error(result.error);
      impactHaptic();
      void queryClient.invalidateQueries({ queryKey: ['culture', 'post-detail', id] });
      void queryClient.invalidateQueries({ queryKey: ['culture', 'home-feed'] });
      void queryClient.invalidateQueries({ queryKey: ['culture', 'backstage'] });
    },
    onError: (error) => Alert.alert('Like failed', error instanceof Error ? error.message : String(error)),
  });

  const commentMutation = useMutation({
    mutationFn: () => addComment(String(id), comment),
    onSuccess: (result) => {
      if (!result.success) throw new Error(result.error);
      impactHaptic();
      setComment('');
      void queryClient.invalidateQueries({ queryKey: ['culture', 'post-detail', id] });
      void queryClient.invalidateQueries({ queryKey: ['culture', 'home-feed'] });
    },
    onError: (error) => Alert.alert('Comment failed', error instanceof Error ? error.message : String(error)),
  });

  const post = query.data?.post;
  const postBody = post ? (post.body || (post as any).content || '') : '';
  const title = post?.title || postBody || 'Post';
  const imageMedia = Array.isArray((post as any)?.images) ? (post as any).images[0] : null;

  return (
    <View style={styles.screen}>
      <LinearGradient colors={[CANVAS, '#090910', CANVAS]} style={StyleSheet.absoluteFill} />
      <StatusBar style="light" />
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={{ paddingTop: Math.max(insets.top + 18, 54), paddingBottom: insets.bottom + 42 }}>
        <View style={styles.headerRow}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <MaterialIcons name="chevron-left" size={28} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>Post</Text>
          <Pressable style={styles.backButton} onPress={() => router.push('/backstage' as any)}>
            <MaterialIcons name="forum" size={21} color="#FFFFFF" />
          </Pressable>
        </View>

        {query.isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={ORANGE} />
          </View>
        ) : null}

        {!query.isLoading && !post ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Post unavailable</Text>
            <Text style={styles.emptyBody}>This post could not be loaded from the current backend.</Text>
          </View>
        ) : null}

        {post ? (
          <>
            <View style={styles.postCard}>
              <View style={styles.postHeader}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{contentInitials(post.title || postBody || 'PL')}</Text>
                </View>
                <View style={styles.postCopy}>
                  <Text style={styles.postAuthor}>PLUGGD community</Text>
                  <Text style={styles.postTime}>{formatDate(post.created_at)}</Text>
                </View>
              </View>
              <Text style={styles.postTitle}>{title}</Text>
              {postBody && post.title ? <Text style={styles.postBody}>{postBody}</Text> : null}
              {imageMedia ? (
                <View style={styles.mediaWrap}>
                  <Image source={{ uri: imageMedia }} style={styles.fill} />
                </View>
              ) : null}
              <View style={styles.actionRow}>
                <Pressable
                  style={[styles.actionButton, query.data?.liked && styles.actionButtonActive]}
                  onPress={() => {
                    selectionHaptic();
                    likeMutation.mutate();
                  }}
                >
                  <MaterialIcons name={query.data?.liked ? 'favorite' : 'favorite-border'} size={19} color={query.data?.liked ? '#08080C' : '#FFFFFF'} />
                  <Text style={[styles.actionText, query.data?.liked && styles.actionTextActive]}>{formatCompact(post.likes_count)}</Text>
                </Pressable>
                <View style={styles.actionButton}>
                  <MaterialIcons name="chat-bubble-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.actionText}>{formatCompact(query.data?.comments.length)}</Text>
                </View>
              </View>
            </View>

            <View style={styles.composer}>
              <TextInput
                value={comment}
                onChangeText={setComment}
                placeholder="Add to the conversation"
                placeholderTextColor="#62627A"
                style={styles.input}
                multiline
              />
              <Pressable style={styles.sendButton} onPress={() => commentMutation.mutate()} disabled={commentMutation.isPending}>
                <Text style={styles.sendText}>{commentMutation.isPending ? 'Posting...' : 'Post'}</Text>
              </Pressable>
            </View>

            <Text style={styles.sectionTitle}>Comments</Text>
            {query.data?.comments.length ? query.data.comments.map((row) => (
              <View key={row.id} style={styles.commentCard}>
                <Text style={styles.commentAuthor}>{contentInitials(row.user_id)}</Text>
                <View style={styles.commentCopy}>
                  <Text style={styles.commentBody}>{row.content}</Text>
                  <Text style={styles.postTime}>{formatDate(row.created_at)}</Text>
                </View>
              </View>
            )) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No comments yet</Text>
                <Text style={styles.emptyBody}>Start the discussion if the backend accepts comments for this post type.</Text>
              </View>
            )}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: CANVAS },
  headerRow: { marginHorizontal: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  loading: { minHeight: 220, alignItems: 'center', justifyContent: 'center' },
  postCard: { marginHorizontal: 16, borderRadius: 18, borderWidth: 1, borderColor: BORDER, backgroundColor: SURFACE, padding: 16, gap: 12 },
  postHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#1F1F2E', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  postCopy: { flex: 1, minWidth: 0 },
  postAuthor: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  postTime: { color: MUTED, fontSize: 11, fontWeight: '700', marginTop: 2 },
  postTitle: { color: '#FFFFFF', fontSize: 20, lineHeight: 26, fontWeight: '900' },
  postBody: { color: '#E4E4E9', fontSize: 15, lineHeight: 22, fontWeight: '600' },
  mediaWrap: { height: 210, borderRadius: 14, overflow: 'hidden', backgroundColor: '#1F1F2E' },
  fill: { width: '100%', height: '100%' },
  actionRow: { flexDirection: 'row', gap: 10 },
  actionButton: { minHeight: 36, borderRadius: 18, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionButtonActive: { backgroundColor: ORANGE, borderColor: ORANGE },
  actionText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  actionTextActive: { color: '#08080C' },
  composer: { margin: 16, borderRadius: 18, borderWidth: 1, borderColor: BORDER, backgroundColor: SURFACE, padding: 12, gap: 10 },
  input: { minHeight: 76, color: '#FFFFFF', fontSize: 15, lineHeight: 21, fontWeight: '600' },
  sendButton: { height: 42, borderRadius: 21, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center' },
  sendText: { color: '#08080C', fontSize: 13, fontWeight: '900' },
  sectionTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', marginHorizontal: 16, marginTop: 6, marginBottom: 10 },
  commentCard: { marginHorizontal: 16, marginBottom: 10, borderRadius: 16, borderWidth: 1, borderColor: BORDER, backgroundColor: SURFACE, padding: 13, flexDirection: 'row', gap: 10 },
  commentAuthor: { color: ORANGE, fontSize: 12, fontWeight: '900', width: 36 },
  commentCopy: { flex: 1, minWidth: 0 },
  commentBody: { color: '#E4E4E9', fontSize: 14, lineHeight: 20, fontWeight: '600' },
  emptyCard: { marginHorizontal: 16, borderRadius: 16, borderWidth: 1, borderColor: BORDER, backgroundColor: SURFACE, padding: 16, gap: 8 },
  emptyTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '900' },
  emptyBody: { color: MUTED, fontSize: 13, lineHeight: 19, fontWeight: '600' },
});
