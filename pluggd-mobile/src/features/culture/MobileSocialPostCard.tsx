import { MaterialIcons } from '@expo/vector-icons';
import { pluggdFonts } from '../../design/typography';
import { useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Linking, Pressable, Share, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Image, PluggdImage } from '../../components/PluggdImage';
import { usePlayback } from '../../context/PlaybackProvider';
import { impactHaptic, selectionHaptic } from '../../design/haptics';
import { contentInitials, formatCompact, formatDate } from '../../lib/mobileContent';
import { GlassAvatar, GlassPanel } from '../../../components/liquid-glass';
import {
  deleteMobileSocialPost,
  toggleSocialBookmark,
  toggleSocialLike,
  toggleSocialRepost,
  voteMobilePoll,
} from './mobileSocial';
import type { MobileSocialPost, MobileSocialPostPreview } from './mobileTypes';
import { blockUser } from '../safety/accountSafety';
import { showReportActions } from '../safety/reportActions';
import { MobileSocialMediaViewer, type MobileSocialMediaSelection } from './MobileSocialMediaViewer';
import { usePluggdTheme } from '../../design/usePluggdTheme';
import { useAuth } from '../../context/AuthProvider';

type MobileSocialPostCardProps = {
  post: MobileSocialPost;
  variant?: 'timeline' | 'thread' | 'compact';
  onMutated?: () => void;
};

function displayNameFor(post: MobileSocialPostPreview) {
  return post.display_name || post.username || 'Community member';
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
  const styles = usePostStyles();
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
  const styles = usePostStyles();
  const router = useRouter();
  const destinations = post.destinations
    .filter((destination) => destination.destination_type !== 'global_feed' && destination.destination_type !== 'user_profile')
    .filter((destination) => Boolean(destination.route))
    .slice(0, 4);
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

function MediaGrid({
  post,
  onOpen,
  expanded = false,
}: {
  post: MobileSocialPostPreview;
  onOpen: (index: number) => void;
  expanded?: boolean;
}) {
  const styles = usePostStyles();
  const { width: viewportWidth } = useWindowDimensions();
  const [singleImageAspectRatio, setSingleImageAspectRatio] = useState<number | null>(null);
  const images = post.images.filter(Boolean).slice(0, 4);

  useEffect(() => {
    setSingleImageAspectRatio(null);
    if (!expanded || images.length !== 1) return;
    Image.getSize(
      images[0],
      (width, height) => {
        if (width > 0 && height > 0) setSingleImageAspectRatio(width / height);
      },
      () => undefined,
    );
  }, [expanded, images.length, images[0]]);

  if (!images.length) return null;

  if (images.length === 1) {
    const expandedHeight = singleImageAspectRatio
      ? (viewportWidth - 32) / singleImageAspectRatio
      : 244;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open image 1 full screen"
        style={[styles.singleMedia, expanded && { height: expandedHeight }]}
        onPress={(event) => {
          event.stopPropagation();
          selectionHaptic();
          onOpen(0);
        }}
      >
        <PluggdImage uri={images[0]} style={styles.fill} resizeMode={expanded ? 'contain' : 'cover'} />
      </Pressable>
    );
  }

  return (
    <View style={styles.mediaGrid}>
      {images.map((image, index) => (
        <Pressable
          key={`${image}-${index}`}
          accessibilityRole="button"
          accessibilityLabel={`Open image ${index + 1} full screen`}
          style={styles.gridMedia}
          onPress={(event) => {
            event.stopPropagation();
            selectionHaptic();
            onOpen(index);
          }}
        >
          <PluggdImage uri={image} style={styles.fill} resizeMode="cover" />
          {index === 3 && post.images.length > 4 ? (
            <View style={styles.moreImages}>
              <Text style={styles.moreImagesText}>+{post.images.length - 4}</Text>
            </View>
          ) : null}
        </Pressable>
      ))}
    </View>
  );
}

function VideoAttachment({ post, onOpen }: { post: MobileSocialPostPreview; onOpen: () => void }) {
  const styles = usePostStyles();
  const theme = usePluggdTheme();
  if (!post.video) return null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open attached video full screen"
      style={styles.videoCard}
      onPress={(event) => {
        event.stopPropagation();
        selectionHaptic();
        onOpen();
      }}
    >
      <MaterialIcons name="smart-display" size={24} color={theme.colors.text} />
      <View style={styles.videoCopy}>
        <Text style={styles.embedTitle}>Video attached</Text>
        <Text style={styles.embedMeta} numberOfLines={1}>Tap to view the full video.</Text>
      </View>
      <MaterialIcons name="open-in-full" size={20} color={theme.colors.textMuted} />
    </Pressable>
  );
}

function AudioAttachment({ post }: { post: MobileSocialPostPreview }) {
  const styles = usePostStyles();
  const theme = usePluggdTheme();
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
        <MaterialIcons name={active && isPlaying ? 'pause' : 'play-arrow'} size={22} color={theme.colors.onAccent} />
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
  const styles = usePostStyles();
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
  const styles = usePostStyles();
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open quoted post by ${displayNameFor(post)}`}
      style={styles.quoteCard}
      onPress={() => router.push(`/post/${post.id}` as any)}
    >
      <GlassPanel intensity="subtle" radius={16} contentStyle={styles.quoteContent}>
        <View style={styles.quoteHeader}>
          <Text style={styles.quoteAuthor}>{displayNameFor(post)}</Text>
          {post.username ? <Text style={styles.quoteMeta}>{`@${post.username}`}</Text> : null}
        </View>
        <RichText post={post} />
        {post.images[0] ? (
          <View style={styles.quoteImage}>
            <PluggdImage uri={post.images[0]} style={styles.fill} resizeMode="cover" />
          </View>
        ) : null}
      </GlassPanel>
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
  const styles = usePostStyles();
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
  const styles = usePostStyles();
  const theme = usePluggdTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [mediaSelection, setMediaSelection] = useState<MobileSocialMediaSelection>(null);
  const [deleting, setDeleting] = useState(false);
  const displayName = displayNameFor(post);
  const publicMeta = [post.username ? `@${post.username}` : null, formatDate(post.created_at)].filter(Boolean).join(' · ');
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

  const openOverflow = () => {
    selectionHaptic();
    const ownPost = user?.id === post.user_id;
    const actions = [
      { text: 'Quote post', onPress: () => router.push({ pathname: '/create-post', params: { quotePostId: post.id } } as any) },
      ...(ownPost ? [{
        text: deleting ? 'Deleting…' : 'Delete post',
        style: 'destructive' as const,
        onPress: () => Alert.alert('Delete this post?', 'It will be removed from Community. Attached media is retained safely.', [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              setDeleting(true);
              const result = await deleteMobileSocialPost(post.id);
              setDeleting(false);
              if (!result.success) {
                Alert.alert('Post not deleted', result.error || 'Please try again.');
                return;
              }
              refresh();
              Alert.alert('Post deleted', 'Your post has been removed from Community.');
            },
          },
        ]),
      }] : [{
        text: 'Report post',
        style: 'destructive' as const,
        onPress: () => showReportActions({
          targetType: 'post',
          targetId: actionPostId(post),
          label: 'post',
        }),
      },
      {
        text: `Block ${displayName}`,
        style: 'destructive' as const,
        onPress: async () => {
          try {
            await blockUser(post.user_id, 'Blocked from community post');
            refresh();
            Alert.alert('Account blocked', `${displayName}'s posts will no longer appear.`);
          } catch (error: any) {
            Alert.alert('Could not block account', error?.message ?? 'Please try again.');
          }
        },
      }]),
      { text: 'Cancel', style: 'cancel' as const },
    ];
    Alert.alert(displayName, ownPost ? 'Manage your post' : undefined, actions);
  };

  // Web-parity feed row: full-bleed, hairline divider, X-style header line and an
  // evenly spread five-icon action row — matching the live web Community feed.
  return (
    <>
      <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open post by ${displayName}`}
      style={[styles.row, variant === 'thread' && styles.rowThread]}
      onPress={() => router.push(`/post/${post.id}` as any)}
    >
      <View style={[styles.rowInner, variant === 'thread' && styles.rowInnerThread]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open ${displayName}`}
          style={[styles.avatar, variant === 'thread' && styles.avatarThread]}
          onPress={(event) => {
            event.stopPropagation();
            router.push(userRouteFor(post) as any);
          }}
        >
          <GlassAvatar imageUrl={post.avatar_url} name={contentInitials(displayName)} size={40} tone="accent" />
        </Pressable>

        <View style={[styles.body, variant === 'thread' && styles.bodyThread]}>
          <View style={[styles.header, variant === 'thread' && styles.headerThread]}>
            <Text style={styles.author} numberOfLines={1}>{displayName}</Text>
            <Text style={styles.meta} numberOfLines={1}>{publicMeta}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Post options"
              hitSlop={8}
              style={styles.kebab}
              onPress={(event) => {
                event.stopPropagation();
                openOverflow();
              }}
            >
              <MaterialIcons name={post.is_repost ? 'repeat' : post.is_quote ? 'format-quote' : 'more-horiz'} size={19} color={theme.colors.textSubtle} />
            </Pressable>
          </View>

          {post.is_repost && post.original_post ? (
            <Text style={styles.repostLabel}>Reposted {displayNameFor(post.original_post)}</Text>
          ) : null}
          <RichText post={post} />
          <DestinationPills post={post} />

          {!compact ? (
            <>
              <MediaGrid post={post} expanded={variant === 'thread'} onOpen={(index) => setMediaSelection({ kind: 'image', index })} />
              <VideoAttachment post={post} onOpen={() => setMediaSelection({ kind: 'video' })} />
              <AudioAttachment post={post} />
              <LinkPreview post={post} />
              {post.original_post ? <QuoteCard post={post.original_post} /> : null}
              <PollCard post={post} onMutated={refresh} />
            </>
          ) : null}

          <View style={styles.actions}>
            <Pressable accessibilityRole="button" accessibilityLabel="Reply" style={styles.action} onPress={() => router.push(`/post/${post.id}` as any)}>
              <MaterialIcons name="chat-bubble-outline" size={19} color={theme.colors.textMuted} />
              {post.comments_count ? <Text style={styles.actionText}>{formatCompact(post.comments_count)}</Text> : null}
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={post.reposted ? 'Undo repost' : 'Repost'} style={styles.action} onPress={() => act('repost')}>
              <MaterialIcons name="repeat" size={20} color={post.reposted ? theme.colors.accentText : theme.colors.textMuted} />
              {post.reposts_count ? <Text style={[styles.actionText, post.reposted && styles.actionOrange]}>{formatCompact(post.reposts_count)}</Text> : null}
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={post.liked ? 'Unlike' : 'Like'} style={styles.action} onPress={() => act('like')}>
              <MaterialIcons name={post.liked ? 'favorite' : 'favorite-border'} size={20} color={post.liked ? theme.colors.live : theme.colors.textMuted} />
              {post.likes_count ? <Text style={[styles.actionText, post.liked && styles.actionLive]}>{formatCompact(post.likes_count)}</Text> : null}
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={post.bookmarked ? 'Remove saved post' : 'Save post'} style={styles.action} onPress={() => act('bookmark')}>
              <MaterialIcons name={post.bookmarked ? 'bookmark' : 'bookmark-border'} size={20} color={post.bookmarked ? theme.colors.accentText : theme.colors.textMuted} />
              {post.bookmarks_count ? <Text style={[styles.actionText, post.bookmarked && styles.actionOrange]}>{formatCompact(post.bookmarks_count)}</Text> : null}
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
              <MaterialIcons name="ios-share" size={19} color={theme.colors.textMuted} />
            </Pressable>
          </View>
        </View>
      </View>
      </Pressable>
      <MobileSocialMediaViewer
        post={post}
        selection={mediaSelection}
        onSelectionChange={setMediaSelection}
      />
    </>
  );
}

function usePostStyles() {
  const theme = usePluggdTheme();
  return useMemo(() => {
    const COLORS = {
      canvas: theme.colors.background,
      surface: theme.colors.surface,
      surface2: theme.colors.surfaceAlt,
      border: theme.colors.border,
      orange: theme.colors.accentText,
      live: theme.colors.live,
      white: theme.colors.text,
      soft: theme.colors.textSecondary,
      muted: theme.colors.textMuted,
      dim: theme.colors.textSubtle,
    };
    return StyleSheet.create({
  // Full-bleed X-style feed row (web Community parity): hairline divider, no card chrome.
  row: {
    paddingHorizontal: 10,
    paddingTop: 14,
    paddingBottom: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.divider,
  },
  rowThread: {
    paddingHorizontal: 16,
    borderBottomWidth: 0,
  },
  rowInner: {
    flexDirection: 'row',
    gap: 8,
  },
  rowInnerThread: {
    position: 'relative',
    flexDirection: 'column',
    gap: 0,
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: 10,
  },
  bodyThread: {
    flex: 0,
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  headerThread: {
    minHeight: 44,
    paddingLeft: 55,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarThread: {
    position: 'absolute',
    left: 0,
    top: 0,
    zIndex: 1,
  },
  author: {
    color: COLORS.white,
    fontSize: 14.5,
    fontFamily: pluggdFonts.satoshiBold, fontWeight: '800',
    flexShrink: 1,
  },
  meta: {
    color: COLORS.muted,
    fontSize: 12.5,
    fontFamily: pluggdFonts.satoshiMedium, fontWeight: '700',
    flexShrink: 1,
    marginLeft: 6,
  },
  kebab: {
    marginLeft: 'auto',
    width: 44,
    height: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  repostLabel: {
    color: COLORS.orange,
    fontSize: 12,
    fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900',
  },
  bodyText: {
    color: COLORS.soft,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: pluggdFonts.satoshiRegular, fontWeight: '500',
  },
  inlineLink: {
    color: COLORS.orange,
    fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900',
  },
  destinationRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  destinationPill: {
    minHeight: 44,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.controlBorder,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  destinationText: {
    color: COLORS.muted,
    fontSize: 11,
    fontFamily: pluggdFonts.satoshiMedium, fontWeight: '700',
  },
  singleMedia: {
    height: 244,
    borderRadius: 5,
    overflow: 'hidden',
    backgroundColor: COLORS.surface2,
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    borderRadius: 5,
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
    color: theme.colors.mediaText,
    fontSize: 22,
    fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900',
  },
  videoCard: {
    minHeight: 76,
    borderRadius: 5,
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
    borderRadius: 5,
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
    backgroundColor: theme.colors.accentFill,
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
    borderRadius: 5,
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
    fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900',
  },
  embedMeta: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 17,
    fontFamily: pluggdFonts.satoshiMedium, fontWeight: '700',
  },
  linkUrl: {
    color: COLORS.orange,
    fontSize: 11,
    fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900',
  },
  quoteCard: {
    borderRadius: 5,
  },
  quoteContent: {
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
    fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900',
  },
  quoteMeta: {
    color: COLORS.muted,
    fontSize: 11,
    fontFamily: pluggdFonts.satoshiMedium, fontWeight: '700',
  },
  quoteImage: {
    height: 92,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: COLORS.canvas,
  },
  pollCard: {
    borderRadius: 5,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface2,
    padding: 12,
    gap: 9,
  },
  pollQuestion: {
    color: COLORS.white,
    fontSize: 14,
    fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900',
  },
  pollOption: {
    minHeight: 44,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.controlBorder,
    overflow: 'hidden',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pollOptionSelected: {
    borderColor: theme.colors.accentText,
  },
  pollFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: theme.colors.accentSoft,
  },
  pollOptionText: {
    color: COLORS.white,
    fontSize: 13,
    fontFamily: pluggdFonts.satoshiBold, fontWeight: '800',
    flex: 1,
  },
  pollPct: {
    color: COLORS.muted,
    fontSize: 12,
    fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900',
  },
  pollMeta: {
    color: COLORS.dim,
    fontSize: 11,
    fontFamily: pluggdFonts.satoshiBold, fontWeight: '800',
  },
  // Evenly spread bare icons + counts across the row, matching the web feed.
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
    paddingRight: 18,
  },
  action: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  actionText: {
    color: COLORS.muted,
    fontSize: 12,
    fontFamily: pluggdFonts.satoshiBold, fontWeight: '800',
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
  }, [theme]);
}
