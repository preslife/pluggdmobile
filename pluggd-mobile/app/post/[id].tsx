import { MaterialIcons } from '@expo/vector-icons';
import { pluggdFonts } from '../../src/design/typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RecoveryState } from '../../components/ContentUI';
import { useAuth } from '../../src/context/AuthProvider';
import { impactHaptic, selectionHaptic } from '../../src/design/haptics';
import { contentInitials, formatCompact, formatDate } from '../../src/lib/mobileContent';
import { addComment, loadPostDetail, toggleLike } from '../../src/features/culture/mobileServices';
import { toggleSocialBookmark, toggleSocialRepost, voteMobilePoll } from '../../src/features/culture/mobileSocial';
import { MobileSocialPostCard } from '../../src/features/culture/MobileSocialPostCard';
import { blockUser } from '../../src/features/safety/accountSafety';
import { showReportActions } from '../../src/features/safety/reportActions';
import { useBottomChromeInset } from '../../src/design/useBottomChromeInset';
import { GlassAvatar } from '../../components/liquid-glass';
import { usePluggdTheme } from '../../src/design/usePluggdTheme';

export default function SocialPostDetailRoute() {
  const theme = usePluggdTheme();
  const styles = usePostDetailStyles();
  const bottomInset = useBottomChromeInset();
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
      if ('pending' in result && result.pending) {
        Alert.alert('Submitted for review', result.error || 'Your comment will appear after its safety review.');
        return;
      }
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
  const threadPosts = query.data?.threadPosts || [];

  const openCommentSafety = (row: { id: string; user_id: string; display_name?: string | null; username?: string | null }) => {
    const authorName = row.display_name || row.username || 'this account';
    Alert.alert(authorName, 'Comment safety', [
      {
        text: 'Report comment',
        onPress: () => showReportActions({
          targetType: 'comment',
          targetId: row.id,
          label: 'comment',
          details: `Reported from post ${String(id)}.`,
        }),
      },
      {
        text: `Block ${authorName}`,
        style: 'destructive',
        onPress: () => Alert.alert(
          `Block ${authorName}?`,
          'Their posts, comments, recommendations and live activity will no longer appear to you.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Block',
              style: 'destructive',
              onPress: async () => {
                try {
                  await blockUser(row.user_id, 'Blocked from comment');
                  await query.refetch();
                  Alert.alert('Account blocked', `${authorName}'s content has been removed from this conversation.`);
                } catch (error: any) {
                  Alert.alert('Could not block account', error?.message ?? 'Please try again.');
                }
              },
            },
          ],
        ),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <View style={styles.screen}>
      <LinearGradient colors={theme.scheme === 'dark' ? ['#0A0806', '#120D08', '#0A0806'] : ['#FFF8ED', '#F4E7D2', '#FFF8ED']} style={StyleSheet.absoluteFill} />
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={{ paddingTop: Math.max(insets.top + 18, 54), paddingBottom: bottomInset }}>
        <View style={styles.headerRow}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back" style={styles.backButton} onPress={() => (router.canGoBack() ? router.back() : router.replace('/community' as any))}>
            <MaterialIcons name="chevron-left" size={28} color={theme.colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Post</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Open Community" style={styles.backButton} onPress={() => router.push('/community' as any)}>
            <MaterialIcons name="forum" size={21} color={theme.colors.text} />
          </Pressable>
        </View>

        {query.isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={theme.colors.accentText} />
          </View>
        ) : null}

        {!query.isLoading && !post ? (
          <RecoveryState
            eyebrow="THREAD ENDED"
            title="This post is no longer in the feed"
            body="It may have been removed by its author or moderators. The wider community conversation is still moving."
            icon="forum"
            primaryLabel="Open community"
            onPrimary={() => router.replace('/community' as any)}
            secondaryLabel="Go back"
            onSecondary={() => (router.canGoBack() ? router.back() : router.replace('/community' as any))}
          />
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
                  <View key={item.id} style={styles.threadItem}>
                    <MobileSocialPostCard
                      post={item}
                      variant="thread"
                      onMutated={() => {
                        void query.refetch();
                      }}
                    />
                  </View>
                ))}
              </>
            ) : null}

            <View style={styles.composer}>
              <TextInput
                value={comment}
                onChangeText={setComment}
                placeholder="Add to the conversation"
                placeholderTextColor={theme.colors.textSubtle}
                style={styles.input}
                multiline
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={commentMutation.isPending ? 'Posting comment' : 'Post comment'}
                accessibilityState={{ disabled: commentMutation.isPending }}
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
            {query.data?.comments.length ? query.data.comments.map((row) => {
              const commentName = row.display_name || row.username || 'Community member';
              const commentHandle = row.username ? `@${row.username}` : null;
              const commentProfileRoute = row.username ? `/creator/${row.username}` : `/user/${row.user_id}`;
              return (
                <View key={row.id} style={styles.commentCard}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${commentName}`}
                    style={styles.commentAvatarButton}
                    onPress={() => router.push(commentProfileRoute as any)}
                  >
                    <GlassAvatar imageUrl={row.avatar_url} name={contentInitials(commentName)} size={40} tone="accent" />
                  </Pressable>
                  <View style={styles.commentCopy}>
                    <Pressable accessibilityRole="button" accessibilityLabel={`Open ${commentName}`} onPress={() => router.push(commentProfileRoute as any)}>
                      <View style={styles.commentIdentity}>
                        <Text style={styles.commentAuthor} numberOfLines={1}>{commentName}</Text>
                        {commentHandle ? <Text style={styles.commentHandle} numberOfLines={1}>{commentHandle}</Text> : null}
                      </View>
                    </Pressable>
                    <Text style={styles.commentBody}>{row.content}</Text>
                    <Text style={styles.postTime}>{formatDate(row.created_at)}</Text>
                  </View>
                  {row.user_id !== user?.id ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Safety options for comment by ${commentName}`}
                      style={styles.commentMenu}
                      onPress={() => openCommentSafety(row)}
                    >
                      <MaterialIcons name="more-horiz" size={21} color={theme.colors.textMuted} />
                    </Pressable>
                  ) : null}
                </View>
              );
            }) : (
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

function usePostDetailStyles() {
  const theme = usePluggdTheme();
  return useMemo(() => StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  headerRow: { marginHorizontal: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: theme.colors.text, fontSize: 16, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  loading: { minHeight: 220, alignItems: 'center', justifyContent: 'center' },
  postShell: { marginHorizontal: 0 },
  postCard: { marginHorizontal: 16, borderRadius: 18, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, padding: 16, gap: 12 },
  postHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: theme.colors.text, fontSize: 13, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  postCopy: { flex: 1, minWidth: 0 },
  postAuthor: { color: theme.colors.text, fontSize: 14, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  postTime: { color: theme.colors.textMuted, fontSize: 11, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700', marginTop: 2 },
  postTitle: { color: theme.colors.text, fontSize: 20, lineHeight: 26, fontFamily: pluggdFonts.displayBold, fontWeight: '700' },
  postBody: { color: theme.colors.textSecondary, fontSize: 15, lineHeight: 22, fontFamily: pluggdFonts.satoshiMedium, fontWeight: '600' },
  destinationRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  destinationPill: { minHeight: 44, borderRadius: 22, borderWidth: 1, borderColor: theme.colors.borderAccent, backgroundColor: theme.colors.accentSoft, paddingHorizontal: 10, justifyContent: 'center' },
  destinationText: { color: theme.colors.accentText, fontSize: 11, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  mediaWrap: { height: 210, borderRadius: 14, overflow: 'hidden', backgroundColor: theme.colors.surfaceAlt },
  fill: { width: '100%', height: '100%' },
  quoteCard: { borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceAlt, padding: 12, gap: 5 },
  quoteAuthor: { color: theme.colors.text, fontSize: 12, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  quoteText: { color: theme.colors.textMuted, fontSize: 13, lineHeight: 19, fontFamily: pluggdFonts.satoshiMedium, fontWeight: '600' },
  pollCard: { borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceAlt, padding: 12, gap: 9 },
  pollQuestion: { color: theme.colors.text, fontSize: 14, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  pollOption: { minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, overflow: 'hidden', paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pollOptionSelected: { borderColor: theme.colors.borderAccent },
  pollFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: theme.colors.accentSoft },
  pollOptionText: { color: theme.colors.text, fontSize: 13, fontFamily: pluggdFonts.satoshiBold, fontWeight: '800', flex: 1 },
  pollPct: { color: theme.colors.textMuted, fontSize: 12, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  actionRow: { flexDirection: 'row', gap: 10 },
  actionButton: { minHeight: 44, borderRadius: 22, borderWidth: 1, borderColor: theme.colors.border, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionButtonActive: { backgroundColor: theme.colors.accentFill, borderColor: theme.colors.accentFill },
  actionText: { color: theme.colors.text, fontSize: 12, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  actionTextActive: { color: theme.colors.onAccent },
  composer: { margin: 16, borderRadius: 18, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, padding: 12, gap: 10 },
  input: { minHeight: 76, color: theme.colors.text, fontSize: 15, lineHeight: 21, fontFamily: pluggdFonts.satoshiMedium, fontWeight: '600' },
  sendButton: { minHeight: 44, borderRadius: 22, backgroundColor: theme.colors.accentFill, alignItems: 'center', justifyContent: 'center' },
  sendText: { color: theme.colors.onAccent, fontSize: 13, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  sectionTitle: { color: theme.colors.text, fontSize: 18, fontFamily: pluggdFonts.displayBold, marginHorizontal: 16, marginTop: 6, marginBottom: 10 },
  threadItem: { marginHorizontal: 16, marginBottom: 10, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, overflow: 'hidden' },
  commentCard: { marginHorizontal: 16, marginBottom: 10, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, padding: 13, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  commentAvatarButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  commentIdentity: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: 4 },
  commentAuthor: { color: theme.colors.text, fontSize: 13, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900', flexShrink: 1 },
  commentHandle: { color: theme.colors.textMuted, fontSize: 11, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700', flexShrink: 1 },
  commentCopy: { flex: 1, minWidth: 0 },
  commentMenu: { width: 44, height: 44, marginTop: -8, marginRight: -8, alignItems: 'center', justifyContent: 'center' },
  commentBody: { color: theme.colors.textSecondary, fontSize: 14, lineHeight: 20, fontFamily: pluggdFonts.satoshiMedium, fontWeight: '600' },
  emptyCard: { marginHorizontal: 16, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, padding: 16, gap: 8 },
  emptyTitle: { color: theme.colors.text, fontSize: 17, fontFamily: pluggdFonts.displayBold, fontWeight: '700' },
  emptyBody: { color: theme.colors.textMuted, fontSize: 13, lineHeight: 19, fontFamily: pluggdFonts.satoshiMedium, fontWeight: '600' },
}), [theme]);
}
