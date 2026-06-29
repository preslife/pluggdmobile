import { MaterialIcons } from '@expo/vector-icons';
import { pluggdFonts } from '../../src/design/typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../src/context/AuthProvider';
import { impactHaptic, selectionHaptic } from '../../src/design/haptics';
import { contentInitials, formatCompact, formatDate } from '../../src/lib/mobileContent';
import { addComment, loadPostDetail, toggleLike } from '../../src/features/culture/mobileServices';
import { toggleSocialBookmark, toggleSocialRepost, voteMobilePoll } from '../../src/features/culture/mobileSocial';
import { MobileSocialPostCard } from '../../src/features/culture/MobileSocialPostCard';

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
  const { user } = useAuth();
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
      void queryClient.invalidateQueries({ queryKey: ['community-feed'] });
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
      void queryClient.invalidateQueries({ queryKey: ['community-feed'] });
      void queryClient.invalidateQueries({ queryKey: ['culture', 'post-detail', id] });
      void queryClient.invalidateQueries({ queryKey: ['culture', 'home-feed'] });
    },
    onError: (error) => Alert.alert('Comment failed', error instanceof Error ? error.message : String(error)),
  });

  const bookmarkMutation = useMutation({
    mutationFn: () => toggleSocialBookmark(String(id)),
    onSuccess: (result) => {
      if (!result.success) throw new Error(result.error);
      impactHaptic();
      void queryClient.invalidateQueries({ queryKey: ['community-feed'] });
      void queryClient.invalidateQueries({ queryKey: ['culture', 'post-detail', id] });
      void queryClient.invalidateQueries({ queryKey: ['culture', 'mobile-social-feed'] });
    },
    onError: (error) => Alert.alert('Save failed', error instanceof Error ? error.message : String(error)),
  });

  const repostMutation = useMutation({
    mutationFn: () => toggleSocialRepost(String(id)),
    onSuccess: (result) => {
      if (!result.success) throw new Error(result.error);
      impactHaptic();
      void queryClient.invalidateQueries({ queryKey: ['community-feed'] });
      void queryClient.invalidateQueries({ queryKey: ['culture', 'post-detail', id] });
      void queryClient.invalidateQueries({ queryKey: ['culture', 'mobile-social-feed'] });
    },
    onError: (error) => Alert.alert('Repost failed', error instanceof Error ? error.message : String(error)),
  });

  const pollMutation = useMutation({
    mutationFn: (optionId: string) => voteMobilePoll(String(id), optionId),
    onSuccess: (result) => {
      if (!result.success) throw new Error(result.error);
      impactHaptic();
      void queryClient.invalidateQueries({ queryKey: ['community-feed'] });
      void queryClient.invalidateQueries({ queryKey: ['culture', 'post-detail', id] });
      void queryClient.invalidateQueries({ queryKey: ['culture', 'mobile-social-feed'] });
    },
    onError: (error) => Alert.alert('Vote failed', error instanceof Error ? error.message : String(error)),
  });

  const post = query.data?.post;
  const postBody = post?.content || '';
  const title = postBody || (post?.is_repost ? 'Repost' : 'Post');
  const imageMedia = post?.images?.[0] || null;
  const displayName = post?.display_name || post?.username || 'PLUGGD user';
  const handle = post?.username ? `@${post.username}` : 'pluggd';
  const threadPosts = query.data?.threadPosts || [];

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
            <Text style={styles.emptyBody}>This post is unavailable or has been removed.</Text>
          </View>
        ) : null}

        {post ? (
          <>
            <View style={styles.postShell}>
              <MobileSocialPostCard
                post={post}
                variant="thread"
                onMutated={() => {
                  void query.refetch();
                }}
              />
            </View>

            {threadPosts.length > 1 ? (
              <>
                <Text style={styles.sectionTitle}>Thread</Text>
                {threadPosts.filter((item) => item.id !== post.id).map((item) => (
                  <Pressable key={item.id} style={styles.threadItem} onPress={() => router.push(`/post/${item.id}` as any)}>
                    <Text style={styles.commentAuthor}>{item.display_name || item.username || 'PLUGGD user'}</Text>
                    <Text style={styles.commentBody}>{item.content}</Text>
                    <Text style={styles.postTime}>{formatDate(item.created_at)}</Text>
                  </Pressable>
                ))}
              </>
            ) : null}

            <View style={styles.composer}>
              <TextInput
                value={comment}
                onChangeText={setComment}
                placeholder="Add to the conversation"
                placeholderTextColor="#62627A"
                style={styles.input}
                multiline
              />
              <Pressable
                style={styles.sendButton}
                onPress={() => {
                  if (!user?.id) {
                    Alert.alert('Sign in to reply', 'Log in to join the conversation.');
                    return;
                  }
                  commentMutation.mutate();
                }}
                disabled={commentMutation.isPending}
              >
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
              <Text style={styles.emptyBody}>Be first to reply.</Text>
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
  headerTitle: { color: '#FFFFFF', fontSize: 16, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  loading: { minHeight: 220, alignItems: 'center', justifyContent: 'center' },
  postShell: { marginHorizontal: 16 },
  postCard: { marginHorizontal: 16, borderRadius: 18, borderWidth: 1, borderColor: BORDER, backgroundColor: SURFACE, padding: 16, gap: 12 },
  postHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#1F1F2E', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFFFFF', fontSize: 13, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  postCopy: { flex: 1, minWidth: 0 },
  postAuthor: { color: '#FFFFFF', fontSize: 14, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  postTime: { color: MUTED, fontSize: 11, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700', marginTop: 2 },
  postTitle: { color: '#FFFFFF', fontSize: 20, lineHeight: 26, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  postBody: { color: '#E4E4E9', fontSize: 15, lineHeight: 22, fontFamily: pluggdFonts.satoshiMedium, fontWeight: '600' },
  destinationRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  destinationPill: { minHeight: 26, borderRadius: 13, borderWidth: 1, borderColor: 'rgba(255,90,0,0.34)', backgroundColor: 'rgba(255,90,0,0.1)', paddingHorizontal: 10, justifyContent: 'center' },
  destinationText: { color: ORANGE, fontSize: 11, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  mediaWrap: { height: 210, borderRadius: 14, overflow: 'hidden', backgroundColor: '#1F1F2E' },
  fill: { width: '100%', height: '100%' },
  quoteCard: { borderRadius: 14, borderWidth: 1, borderColor: BORDER, backgroundColor: '#1F1F2E', padding: 12, gap: 5 },
  quoteAuthor: { color: '#FFFFFF', fontSize: 12, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  quoteText: { color: MUTED, fontSize: 13, lineHeight: 19, fontFamily: pluggdFonts.satoshiMedium, fontWeight: '600' },
  pollCard: { borderRadius: 16, borderWidth: 1, borderColor: BORDER, backgroundColor: '#1F1F2E', padding: 12, gap: 9 },
  pollQuestion: { color: '#FFFFFF', fontSize: 14, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  pollOption: { minHeight: 42, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden', paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pollOptionSelected: { borderColor: 'rgba(255,90,0,0.72)' },
  pollFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: 'rgba(255,90,0,0.18)' },
  pollOptionText: { color: '#FFFFFF', fontSize: 13, fontFamily: pluggdFonts.satoshiBold, fontWeight: '800', flex: 1 },
  pollPct: { color: MUTED, fontSize: 12, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  actionRow: { flexDirection: 'row', gap: 10 },
  actionButton: { minHeight: 36, borderRadius: 18, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionButtonActive: { backgroundColor: ORANGE, borderColor: ORANGE },
  actionText: { color: '#FFFFFF', fontSize: 12, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  actionTextActive: { color: '#08080C' },
  composer: { margin: 16, borderRadius: 18, borderWidth: 1, borderColor: BORDER, backgroundColor: SURFACE, padding: 12, gap: 10 },
  input: { minHeight: 76, color: '#FFFFFF', fontSize: 15, lineHeight: 21, fontFamily: pluggdFonts.satoshiMedium, fontWeight: '600' },
  sendButton: { height: 42, borderRadius: 21, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center' },
  sendText: { color: '#08080C', fontSize: 13, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  sectionTitle: { color: '#FFFFFF', fontSize: 18, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900', marginHorizontal: 16, marginTop: 6, marginBottom: 10 },
  threadItem: { marginHorizontal: 16, marginBottom: 10, borderRadius: 16, borderWidth: 1, borderColor: BORDER, backgroundColor: SURFACE, padding: 13, gap: 6 },
  commentCard: { marginHorizontal: 16, marginBottom: 10, borderRadius: 16, borderWidth: 1, borderColor: BORDER, backgroundColor: SURFACE, padding: 13, flexDirection: 'row', gap: 10 },
  commentAuthor: { color: ORANGE, fontSize: 12, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900', width: 36 },
  commentCopy: { flex: 1, minWidth: 0 },
  commentBody: { color: '#E4E4E9', fontSize: 14, lineHeight: 20, fontFamily: pluggdFonts.satoshiMedium, fontWeight: '600' },
  emptyCard: { marginHorizontal: 16, borderRadius: 16, borderWidth: 1, borderColor: BORDER, backgroundColor: SURFACE, padding: 16, gap: 8 },
  emptyTitle: { color: '#FFFFFF', fontSize: 17, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  emptyBody: { color: MUTED, fontSize: 13, lineHeight: 19, fontFamily: pluggdFonts.satoshiMedium, fontWeight: '600' },
});
