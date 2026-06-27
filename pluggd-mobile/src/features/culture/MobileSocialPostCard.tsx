import { MaterialIcons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Linking, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { PluggdImage } from '../../components/PluggdImage';
import { usePlayback } from '../../context/PlaybackProvider';
import { impactHaptic, selectionHaptic } from '../../design/haptics';
import { contentInitials, formatCompact, formatDate } from '../../lib/mobileContent';
import { GlassAvatar, GlassPanel, LiftSurface } from '../../../components/liquid-glass';
import {
  reportSocialPost,
  toggleSocialBookmark,
  toggleSocialLike,
  toggleSocialRepost,
  voteMobilePoll,
} from './mobileSocial';
import type { MobileSocialPost, MobileSocialPostPreview } from './mobileTypes';

const COLORS = {
  canvas: '#08080C',
  surface: '#12121A',
  surface2: '#1F1F2E',
  border: '#262637',
  orange: '#FF5A00',
  live: '#FF4757',
  white: '#FFFFFF',
  soft: '#E4E4E9',
  muted: '#8E8E9F',
  dim: '#62627A',
};

type MobileSocialPostCardProps = {
  post: MobileSocialPost;
  variant?: 'timeline' | 'thread' | 'compact';
  onMutated?: () => void;
};

function displayNameFor(post: MobileSocialPostPreview) {
  return post.display_name || post.username || 'PLUGGD user';
}

function userRouteFor(post: MobileSocialPostPreview) {
  if (post.username) return `/creator/${post.username}`;
  return `/user/${post.user_id}`;
}

function routeForTag(tag: string) {
  return `/hashtag/${encodeURIComponent(tag.replace(/^#/, ''))}`;
}

function routeForMention(mention: string) {
  return `/creator/${mention}`;
}

function actionPostId(post: MobileSocialPostPreview) {
  return post.is_repost && post.original_post_id ? post.original_post_id : post.id;
}

function getLinkPreviewValue(preview: Record<string, unknown> | null, key: string) {
  const value = preview?.[key];
  return typeof value === 'string' ? value : null;
}

function RichText({ post }: { post: MobileSocialPostPreview }) {
  const router = useRouter();
  const content = post.content || (post.is_repost ? 'Reposted' : '');
  const tokenized = useMemo(() => content.split(/(\B#\w+|\B@\w+)/g).filter(Boolean), [content]);

  if (!content) return null;
  return (
    <Text style={styles.bodyText}>
      {tokenized.map((token, index) => {
        if (token.startsWith('#') && token.length > 1) {
          const tag = token.slice(1);
          return (
            <Text key={`${token}-${index}`} style={styles.inlineLink} onPress={() => router.push(routeForTag(tag) as any)}>
              {token}
            </Text>
          );
        }
        if (token.startsWith('@') && token.length > 1) {
          const mention = token.slice(1);
          return (
            <Text key={`${token}-${index}`} style={styles.inlineLink} onPress={() => router.push(routeForMention(mention) as any)}>
              {token}
            </Text>
          );
        }
        return <Text key={`${token}-${index}`}>{token}</Text>;
      })}
    </Text>
  );
}

function DestinationPills({ post }: { post: MobileSocialPostPreview }) {
  const router = useRouter();
  const destinations = post.destinations.slice(0, 4);
  if (!destinations.length) return null;

  return (
    <View style={styles.destinationRow}>
      {destinations.map((destination) => (
        <Pressable
          key={`${destination.destination_type}-${destination.destination_id}`}
          accessibilityRole="button"
          accessibilityLabel={`Open ${destination.label}`}
          style={styles.destinationPill}
          onPress={() => {
            selectionHaptic();
            if (destination.route) router.push(destination.route as any);
          }}
        >
          <Text style={styles.destinationText} numberOfLines={1}>{destination.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function MediaGrid({ post }: { post: MobileSocialPostPreview }) {
  const images = post.images.filter(Boolean).slice(0, 4);
  if (!images.length) return null;

  if (images.length === 1) {
    return (
      <View style={styles.singleMedia}>
        <PluggdImage uri={images[0]} style={styles.fill} resizeMode="cover" />
      </View>
    );
  }

  return (
    <View style={styles.mediaGrid}>
      {images.map((image, index) => (
        <View key={`${image}-${index}`} style={styles.gridMedia}>
          <PluggdImage uri={image} style={styles.fill} resizeMode="cover" />
          {index === 3 && post.images.length > 4 ? (
            <View style={styles.moreImages}>
              <Text style={styles.moreImagesText}>+{post.images.length - 4}</Text>
            </View>
          ) : null}
        </View>
      ))}
    </View>
  );
}

function VideoAttachment({ post }: { post: MobileSocialPostPreview }) {
  if (!post.video) return null;
  return (
    <View style={styles.videoCard}>
      <MaterialIcons name="smart-display" size={24} color={COLORS.white} />
      <View style={styles.videoCopy}>
        <Text style={styles.embedTitle}>Video attached</Text>
        <Text style={styles.embedMeta} numberOfLines={1}>Open the thread to view this media attachment.</Text>
      </View>
    </View>
  );
}

function AudioAttachment({ post }: { post: MobileSocialPostPreview }) {
  const { currentTrack, isPlaying, playTrack, togglePlayPause } = usePlayback();
  if (!post.audio) return null;
  const id = `social-audio-${post.id}`;
  const active = currentTrack?.id === id;
  const title = post.content?.split('\n')[0]?.slice(0, 64) || 'Social audio';
  const artist = displayNameFor(post);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${active && isPlaying ? 'Pause' : 'Play'} ${title}`}
      style={styles.audioCard}
      onPress={async () => {
        impactHaptic();
        if (active) {
          await togglePlayPause();
          return;
        }
        await playTrack({
          id,
          url: post.audio || '',
          title,
          artist,
          duration: post.audio_duration || undefined,
          type: 'preview',
          sourceType: 'preview',
        });
      }}
    >
      <View style={styles.audioPlay}>
        <MaterialIcons name={active && isPlaying ? 'pause' : 'play-arrow'} size={22} color={COLORS.canvas} />
      </View>
      <View style={styles.audioCopy}>
        <Text style={styles.embedTitle} numberOfLines={1}>{title}</Text>
        <Text style={styles.embedMeta} numberOfLines={1}>{artist}</Text>
      </View>
      <View style={styles.waveMini}>
        {Array.from({ length: 18 }).map((_, index) => (
          <View key={`social-wave-${index}`} style={[styles.waveBar, { height: 7 + ((index * 9) % 22), opacity: active ? 1 : 0.5 }]} />
        ))}
      </View>
    </Pressable>
  );
}

function LinkPreview({ post }: { post: MobileSocialPostPreview }) {
  const router = useRouter();
  const title = getLinkPreviewValue(post.link_preview, 'title');
  const description = getLinkPreviewValue(post.link_preview, 'description');
  const url = getLinkPreviewValue(post.link_preview, 'url');
  const image = getLinkPreviewValue(post.link_preview, 'image') || getLinkPreviewValue(post.link_preview, 'image_url');
  if (!title && !description && !url) return null;

  return (
    <Pressable
      accessibilityRole="link"
      style={styles.linkCard}
      onPress={(event) => {
        event.stopPropagation();
        if (!url) return;
        if (url.startsWith('/')) router.push(url as any);
        else void Linking.openURL(url);
      }}
    >
      {image ? <PluggdImage uri={image} style={styles.linkImage} resizeMode="cover" /> : null}
      <View style={styles.linkCopy}>
        <Text style={styles.embedTitle} numberOfLines={2}>{title || url}</Text>
        {description ? <Text style={styles.embedMeta} numberOfLines={2}>{description}</Text> : null}
        {url ? <Text style={styles.linkUrl} numberOfLines={1}>{url.replace(/^https?:\/\//, '')}</Text> : null}
      </View>
    </Pressable>
  );
}

function QuoteCard({ post }: { post: MobileSocialPostPreview }) {
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open quoted post by ${displayNameFor(post)}`}
      style={styles.quoteCard}
      onPress={() => router.push(`/post/${post.id}` as any)}
    >
      <View style={styles.quoteHeader}>
        <Text style={styles.quoteAuthor}>{displayNameFor(post)}</Text>
        <Text style={styles.quoteMeta}>{post.username ? `@${post.username}` : 'PLUGGD'}</Text>
      </View>
      <RichText post={post} />
      {post.images[0] ? (
        <View style={styles.quoteImage}>
          <PluggdImage uri={post.images[0]} style={styles.fill} resizeMode="cover" />
        </View>
      ) : null}
    </Pressable>
  );
}

function PollCard({
  post,
  onMutated,
}: {
  post: MobileSocialPostPreview;
  onMutated: () => void;
}) {
  const [pending, setPending] = useState<string | null>(null);
  if (!post.poll?.options?.length) return null;

  return (
    <View style={styles.pollCard}>
      {post.poll.question ? <Text style={styles.pollQuestion}>{post.poll.question}</Text> : null}
      {post.poll.options.map((option) => {
        const total = Number(post.poll?.total_votes ?? 0);
        const pct = total > 0 ? Math.round((Number(option.votes ?? 0) / total) * 100) : 0;
        const selected = post.poll_vote_option_id === option.id;
        return (
          <Pressable
            key={option.id}
            accessibilityRole="button"
            accessibilityState={{ selected, busy: pending === option.id }}
            disabled={Boolean(pending)}
            style={[styles.pollOption, selected && styles.pollOptionSelected]}
            onPress={async () => {
              setPending(option.id);
              impactHaptic();
              const result = await voteMobilePoll(actionPostId(post), option.id);
              setPending(null);
              if (!result.success) {
                Alert.alert('Vote failed', result.error || 'Could not vote right now.');
                return;
              }
              onMutated();
            }}
          >
            <View style={[styles.pollFill, { width: `${pct}%` }]} />
            <Text style={styles.pollOptionText}>{option.text}</Text>
            <Text style={styles.pollPct}>{pending === option.id ? '...' : `${pct}%`}</Text>
          </Pressable>
        );
      })}
      <Text style={styles.pollMeta}>{formatCompact(post.poll.total_votes ?? 0)} votes</Text>
    </View>
  );
}

export function MobileSocialPostCard({ post, variant = 'timeline', onMutated }: MobileSocialPostCardProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const displayName = displayNameFor(post);
  const handle = post.username ? `@${post.username}` : 'pluggd';
  const compact = variant === 'compact';

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['community-feed'] });
    void queryClient.invalidateQueries({ queryKey: ['culture', 'mobile-social-feed'] });
    void queryClient.invalidateQueries({ queryKey: ['culture', 'home-feed'] });
    void queryClient.invalidateQueries({ queryKey: ['culture', 'post-detail', post.id] });
    void queryClient.invalidateQueries({ queryKey: ['culture', 'community-board'] });
    onMutated?.();
  };

  const act = async (action: 'like' | 'bookmark' | 'repost') => {
    impactHaptic();
    const id = actionPostId(post);
    const result =
      action === 'like'
        ? await toggleSocialLike(id)
        : action === 'bookmark'
          ? await toggleSocialBookmark(id)
          : await toggleSocialRepost(id);
    if (!result.success) {
      Alert.alert(`${action === 'bookmark' ? 'Save' : action} failed`, result.error || 'Please try again.');
      return;
    }
    refresh();
  };

  return (
    <Pressable
      accessibilityLabel={`Open post by ${displayName}`}
      style={[styles.cardTouch, compact && styles.cardCompact, variant === 'thread' && styles.cardThread]}
      onPress={() => router.push(`/post/${post.id}` as any)}
    >
      <LiftSurface depth="normal">
        <GlassPanel
          intensity="default"
          radius={compact ? 18 : variant === 'thread' ? 20 : 24}
          style={styles.card}
          contentStyle={styles.cardContent}
        >
          <View style={styles.header}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Open ${displayName}`}
              style={styles.avatar}
              onPress={(event) => {
                event.stopPropagation();
                router.push(userRouteFor(post) as any);
              }}
            >
              <GlassAvatar imageUrl={post.avatar_url} name={contentInitials(displayName)} size={42} tone="violet" />
            </Pressable>
            <View style={styles.authorBlock}>
              <Text style={styles.author} numberOfLines={1}>{displayName}</Text>
              <Text style={styles.meta} numberOfLines={1}>{handle} · {formatDate(post.created_at)}</Text>
            </View>
            <MaterialIcons name={post.is_repost ? 'repeat' : post.is_quote ? 'format-quote' : 'more-horiz'} size={22} color={COLORS.dim} />
          </View>

          {post.is_repost && post.original_post ? (
            <Text style={styles.repostLabel}>Reposted {displayNameFor(post.original_post)}</Text>
          ) : null}
          <RichText post={post} />
          <DestinationPills post={post} />

          {!compact ? (
            <>
              <MediaGrid post={post} />
              <VideoAttachment post={post} />
              <AudioAttachment post={post} />
              <LinkPreview post={post} />
              {post.original_post ? <QuoteCard post={post.original_post} /> : null}
              <PollCard post={post} onMutated={refresh} />
            </>
          ) : null}

          <View style={styles.actions}>
            <Pressable accessibilityRole="button" accessibilityLabel="Reply" style={styles.action} onPress={() => router.push(`/post/${post.id}` as any)}>
              <MaterialIcons name="chat-bubble-outline" size={19} color={COLORS.muted} />
              <Text style={styles.actionText}>{formatCompact(post.comments_count)}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={post.reposted ? 'Undo repost' : 'Repost'} style={styles.action} onPress={() => act('repost')}>
              <MaterialIcons name="repeat" size={20} color={post.reposted ? COLORS.orange : COLORS.muted} />
              <Text style={[styles.actionText, post.reposted && styles.actionOrange]}>{formatCompact(post.reposts_count)}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={post.liked ? 'Unlike' : 'Like'} style={styles.action} onPress={() => act('like')}>
              <MaterialIcons name={post.liked ? 'favorite' : 'favorite-border'} size={20} color={post.liked ? COLORS.live : COLORS.muted} />
              <Text style={[styles.actionText, post.liked && styles.actionLive]}>{formatCompact(post.likes_count)}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={post.bookmarked ? 'Remove saved post' : 'Save post'} style={styles.action} onPress={() => act('bookmark')}>
              <MaterialIcons name={post.bookmarked ? 'bookmark' : 'bookmark-border'} size={20} color={post.bookmarked ? COLORS.orange : COLORS.muted} />
              <Text style={[styles.actionText, post.bookmarked && styles.actionOrange]}>{formatCompact(post.bookmarks_count)}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Quote post"
              style={styles.action}
              onPress={() => router.push({ pathname: '/create-post', params: { quotePostId: post.id } } as any)}
            >
              <MaterialIcons name="format-quote" size={18} color={COLORS.muted} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Share post"
              style={styles.action}
              onPress={() => {
                selectionHaptic();
                void Share.share({ message: post.content ? `PLUGGD: ${post.content}` : 'Open this PLUGGD post' });
              }}
            >
              <MaterialIcons name="ios-share" size={19} color={COLORS.muted} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Report post"
              style={styles.action}
              onPress={async () => {
                selectionHaptic();
                const result = await reportSocialPost(actionPostId(post));
                Alert.alert(result.success ? 'Report sent' : 'Report unavailable', result.success ? 'Thanks. We will review this post.' : result.error || 'Please try again later.');
              }}
            >
              <MaterialIcons name="flag" size={19} color={COLORS.muted} />
            </Pressable>
          </View>
        </GlassPanel>
      </LiftSurface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardTouch: {
    marginHorizontal: 16,
  },
  card: {},
  cardContent: {
    padding: 16,
    gap: 12,
  },
  cardCompact: {
    marginHorizontal: 16,
  },
  cardThread: {
    marginHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorBlock: {
    flex: 1,
    minWidth: 0,
  },
  author: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '800',
  },
  meta: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  repostLabel: {
    color: COLORS.orange,
    fontSize: 12,
    fontWeight: '900',
  },
  bodyText: {
    color: COLORS.soft,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  inlineLink: {
    color: COLORS.orange,
    fontWeight: '900',
  },
  destinationRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  destinationPill: {
    minHeight: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.045)',
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  destinationText: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '700',
  },
  singleMedia: {
    height: 244,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: COLORS.surface2,
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    borderRadius: 16,
    overflow: 'hidden',
  },
  gridMedia: {
    width: '49.3%',
    aspectRatio: 1,
    backgroundColor: COLORS.surface2,
  },
  moreImages: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.58)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreImagesText: {
    color: COLORS.white,
    fontSize: 22,
    fontWeight: '900',
  },
  videoCard: {
    minHeight: 76,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface2,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  videoCopy: {
    flex: 1,
    minWidth: 0,
  },
  audioCard: {
    minHeight: 74,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface2,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  audioPlay: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioCopy: {
    flex: 1,
    minWidth: 0,
  },
  waveMini: {
    width: 74,
    height: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 2,
  },
  waveBar: {
    width: 2,
    borderRadius: 2,
    backgroundColor: COLORS.orange,
  },
  linkCard: {
    minHeight: 86,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface2,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  linkImage: {
    width: 92,
    height: '100%',
  },
  linkCopy: {
    flex: 1,
    minWidth: 0,
    padding: 12,
    gap: 4,
  },
  embedTitle: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '900',
  },
  embedMeta: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
  linkUrl: {
    color: COLORS.orange,
    fontSize: 11,
    fontWeight: '900',
  },
  quoteCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface2,
    padding: 12,
    gap: 8,
  },
  quoteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quoteAuthor: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '900',
  },
  quoteMeta: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '700',
  },
  quoteImage: {
    height: 92,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: COLORS.canvas,
  },
  pollCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface2,
    padding: 12,
    gap: 9,
  },
  pollQuestion: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '900',
  },
  pollOption: {
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pollOptionSelected: {
    borderColor: 'rgba(255,90,0,0.72)',
  },
  pollFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,90,0,0.18)',
  },
  pollOptionText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '800',
    flex: 1,
  },
  pollPct: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '900',
  },
  pollMeta: {
    color: COLORS.dim,
    fontSize: 11,
    fontWeight: '800',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  action: {
    minHeight: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.02)',
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  actionOrange: {
    color: COLORS.orange,
  },
  actionLive: {
    color: COLORS.live,
  },
  fill: {
    width: '100%',
    height: '100%',
  },
});
