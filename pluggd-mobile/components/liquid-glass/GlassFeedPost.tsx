import { MaterialIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { liquidGlassColors, liquidGlassRadii } from '../../src/design/liquidGlassTokens';
import { GlassAvatar } from './GlassAvatar';
import { GlassPanel } from './GlassPanel';
import { LiftSurface } from './LiftSurface';

type GlassFeedPostProps = {
  authorName: string;
  authorAvatar?: string | null;
  createdAt: string;
  body: string;
  counts?: {
    likes?: number;
    comments?: number;
    reposts?: number;
  };
  viewerState?: {
    liked?: boolean;
    bookmarked?: boolean;
    reposted?: boolean;
  };
  onLike?: () => void;
  onComment?: () => void;
  onRepost?: () => void;
  onBookmark?: () => void;
  onShare?: () => void;
  onReport?: () => void;
  style?: StyleProp<ViewStyle>;
};

function countLabel(value?: number) {
  if (!value) return '0';
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
  return String(value);
}

export function GlassFeedPost({
  authorName,
  authorAvatar,
  createdAt,
  body,
  counts,
  viewerState,
  onLike,
  onComment,
  onRepost,
  onBookmark,
  onShare,
  onReport,
  style,
}: GlassFeedPostProps) {
  return (
    <LiftSurface depth="normal" style={style}>
      <GlassPanel intensity="default" radius={liquidGlassRadii.xl} style={styles.card} contentStyle={styles.content}>
        <View style={styles.header}>
          <GlassAvatar imageUrl={authorAvatar} name={authorName} size="md" />
          <View style={styles.authorCopy}>
            <Text style={styles.author} numberOfLines={1}>{authorName}</Text>
            <Text style={styles.meta} numberOfLines={1}>{createdAt}</Text>
          </View>
          <MaterialIcons name="more-horiz" size={22} color={liquidGlassColors.textMuted} />
        </View>
        <Text style={styles.body}>{body}</Text>
        <View style={styles.actions}>
          <PostAction icon="chat-bubble-outline" label={countLabel(counts?.comments)} onPress={onComment} />
          <PostAction icon="repeat" label={countLabel(counts?.reposts)} active={viewerState?.reposted} onPress={onRepost} />
          <PostAction icon={viewerState?.liked ? 'favorite' : 'favorite-border'} label={countLabel(counts?.likes)} active={viewerState?.liked} onPress={onLike} />
          <PostAction icon={viewerState?.bookmarked ? 'bookmark' : 'bookmark-border'} label="" active={viewerState?.bookmarked} onPress={onBookmark} />
          <PostAction icon="ios-share" label="" onPress={onShare} />
          <PostAction icon="flag" label="" onPress={onReport} />
        </View>
      </GlassPanel>
    </LiftSurface>
  );
}

function PostAction({
  icon,
  label,
  active,
  onPress,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  active?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" disabled={!onPress} onPress={onPress} style={styles.action}>
      <MaterialIcons name={icon} size={19} color={active ? liquidGlassColors.accent : liquidGlassColors.textMuted} />
      {label ? <Text style={[styles.actionText, active && styles.actionTextActive]}>{label}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {},
  content: {
    padding: 16,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  authorCopy: {
    flex: 1,
    minWidth: 0,
  },
  author: {
    color: liquidGlassColors.textPrimary,
    fontFamily: 'Satoshi-Black',
    fontSize: 14,
  },
  meta: {
    color: liquidGlassColors.textMuted,
    fontFamily: 'Satoshi-Medium',
    fontSize: 11,
    marginTop: 2,
  },
  body: {
    color: liquidGlassColors.textSecondary,
    fontFamily: 'Satoshi-Medium',
    fontSize: 15,
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  action: {
    minHeight: 34,
    borderRadius: 17,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: liquidGlassColors.borderSoft,
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    color: liquidGlassColors.textMuted,
    fontFamily: 'Satoshi-Black',
    fontSize: 12,
  },
  actionTextActive: {
    color: liquidGlassColors.accent,
  },
});
