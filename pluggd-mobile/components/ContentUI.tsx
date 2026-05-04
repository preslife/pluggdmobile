import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ReactNode } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { usePluggdTheme } from '../src/design/usePluggdTheme';
import { PLUGGD_ORANGE, pluggdRadii, pluggdTypography } from '../src/design/tokens';
import { contentInitials } from '../src/lib/mobileContent';
import { PluggdChip } from './PluggdPrimitives';

export function ScreenShell({
  title,
  subtitle,
  children,
  action,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  const theme = usePluggdTheme();
  const screenGradient =
    theme.scheme === 'dark'
      ? (['#080808', '#0C0C0C', '#080808'] as const)
      : (['#FAFAF8', '#FFFFFF', '#F4F2EE'] as const);

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <LinearGradient colors={screenGradient} style={StyleSheet.absoluteFill} />
      <View
        style={[
          styles.header,
          {
            borderBottomColor: theme.colors.borderSubtle,
          },
        ]}
      >
        <View style={styles.headerCopy}>
          <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
          {subtitle ? <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>{subtitle}</Text> : null}
        </View>
        {action}
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {children}
      </ScrollView>
    </View>
  );
}

export function SectionTitle({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const theme = usePluggdTheme();
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{title}</Text>
      {actionLabel ? (
        <Pressable style={styles.sectionAction} onPress={onAction}>
          <Text style={[styles.sectionActionText, { color: theme.colors.accent }]}>{actionLabel}</Text>
          <MaterialIcons name="chevron-right" size={18} color={theme.colors.accent} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function ContextRail({
  tabs,
  active,
  onChange,
}: {
  tabs: string[];
  active: string;
  onChange: (tab: string) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.contextRail}>
      {tabs.map((tab) => (
        <PluggdChip key={tab} label={tab} active={tab === active} onPress={() => onChange(tab)} />
      ))}
    </ScrollView>
  );
}

export function PosterCard({
  title,
  subtitle,
  meta,
  imageUrl,
  icon = 'play-arrow',
  onPress,
  onPlay,
  style,
}: {
  title: string;
  subtitle?: string | null;
  meta?: string | null;
  imageUrl?: string | null;
  icon?: keyof typeof MaterialIcons.glyphMap;
  onPress?: () => void;
  onPlay?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = usePluggdTheme();
  const artworkGradient =
    theme.scheme === 'dark'
      ? (['#2A1711', '#101010'] as const)
      : (['#FFE8DC', '#FFFFFF'] as const);

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.posterCard,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          shadowColor: theme.colors.shadow,
        },
        style,
      ]}
    >
      <View style={[styles.posterArtwork, { backgroundColor: theme.colors.artworkBase }]}>
        <LinearGradient colors={artworkGradient} style={StyleSheet.absoluteFill} />
        {imageUrl ? <Image source={{ uri: imageUrl }} style={styles.media} /> : null}
        {!imageUrl ? <Text style={[styles.posterInitials, { color: theme.colors.text }]}>{contentInitials(title)}</Text> : null}
        {imageUrl ? (
          <LinearGradient
            colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.58)']}
            style={styles.mediaShade}
          />
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Play ${title}`}
          style={styles.playBadge}
          onPress={(event) => {
            event.stopPropagation?.();
            onPlay?.();
          }}
        >
          <MaterialIcons name={icon} size={18} color="#FFFFFF" />
        </Pressable>
      </View>
      <Text style={[styles.cardTitle, { color: theme.colors.text }]} numberOfLines={1}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={[styles.cardSubtitle, { color: theme.colors.textMuted }]} numberOfLines={1}>
          {subtitle}
        </Text>
      ) : null}
      {meta ? (
        <View
          style={[
            styles.metaPill,
            {
              backgroundColor: theme.colors.surfaceStrong,
              borderColor: theme.colors.borderAccent,
            },
          ]}
        >
          <Text style={[styles.metaText, { color: theme.colors.accent }]} numberOfLines={1}>
            {meta}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export function ListCard({
  title,
  subtitle,
  meta,
  imageUrl,
  icon = 'chevron-right',
  onPress,
  onPlay,
}: {
  title: string;
  subtitle?: string | null;
  meta?: string | null;
  imageUrl?: string | null;
  icon?: keyof typeof MaterialIcons.glyphMap;
  onPress?: () => void;
  onPlay?: () => void;
}) {
  const theme = usePluggdTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.listCard,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          shadowColor: theme.colors.shadow,
        },
      ]}
    >
      <View style={[styles.thumb, { backgroundColor: theme.colors.surfaceAlt }]}>
        {imageUrl ? <Image source={{ uri: imageUrl }} style={styles.media} /> : null}
        {!imageUrl ? <Text style={[styles.thumbInitials, { color: theme.colors.text }]}>{contentInitials(title)}</Text> : null}
      </View>
      <View style={styles.listText}>
        <Text style={[styles.listTitle, { color: theme.colors.text }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.listSubtitle, { color: theme.colors.textMuted }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
        {meta ? (
          <Text style={[styles.listMeta, { color: theme.colors.accent }]} numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
      </View>
      {onPlay ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Play ${title}`}
          onPress={(event) => {
            event.stopPropagation?.();
            onPlay();
          }}
          style={styles.listPlay}
        >
          <MaterialIcons name="play-arrow" size={22} color="#FFFFFF" />
        </Pressable>
      ) : (
        <MaterialIcons name={icon} size={24} color={theme.colors.textSubtle} />
      )}
    </Pressable>
  );
}

export function EmptyState({ title, body }: { title: string; body?: string }) {
  const theme = usePluggdTheme();
  return (
    <View
      style={[
        styles.empty,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <View style={[styles.emptyIcon, { backgroundColor: theme.colors.surfaceStrong }]}>
        <MaterialIcons name="search-off" size={30} color={theme.colors.accent} />
      </View>
      <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>{title}</Text>
      {body ? <Text style={[styles.emptyBody, { color: theme.colors.textMuted }]}>{body}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingTop: 104,
  },
  header: {
    paddingHorizontal: 14,
    paddingTop: 7,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerCopy: {
    flex: 1,
  },
  title: {
    fontSize: 21,
    lineHeight: 25,
    fontWeight: pluggdTypography.weights.heavy,
  },
  subtitle: {
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: pluggdTypography.weights.semibold,
    marginTop: 5,
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 190,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: pluggdTypography.weights.heavy,
  },
  sectionAction: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionActionText: {
    fontSize: pluggdTypography.meta,
    fontWeight: pluggdTypography.weights.heavy,
  },
  contextRail: {
    gap: 7,
    marginBottom: 12,
    paddingRight: 8,
  },
  posterCard: {
    width: 124,
    borderRadius: pluggdRadii.compact,
    borderWidth: 1,
    padding: 8,
    marginRight: 10,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
  },
  posterArtwork: {
    height: 98,
    borderRadius: pluggdRadii.compact,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 8,
  },
  media: {
    width: '100%',
    height: '100%',
  },
  mediaShade: {
    ...StyleSheet.absoluteFillObject,
  },
  posterInitials: {
    fontSize: 24,
    fontWeight: pluggdTypography.weights.heavy,
  },
  playBadge: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: PLUGGD_ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: PLUGGD_ORANGE,
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  cardTitle: {
    fontSize: pluggdTypography.control,
    fontWeight: pluggdTypography.weights.heavy,
  },
  cardSubtitle: {
    fontSize: pluggdTypography.meta,
    fontWeight: pluggdTypography.weights.semibold,
    marginTop: 3,
  },
  metaPill: {
    alignSelf: 'flex-start',
    borderRadius: pluggdRadii.pill,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 4,
    marginTop: 7,
  },
  metaText: {
    fontSize: pluggdTypography.caption,
    fontWeight: pluggdTypography.weights.heavy,
  },
  listCard: {
    minHeight: 70,
    borderRadius: pluggdRadii.compact,
    borderWidth: 1,
    padding: 9,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: pluggdRadii.compact,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginRight: 10,
  },
  thumbInitials: {
    fontSize: 18,
    fontWeight: pluggdTypography.weights.heavy,
  },
  listText: {
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
  },
  listTitle: {
    fontSize: pluggdTypography.control,
    fontWeight: pluggdTypography.weights.heavy,
  },
  listSubtitle: {
    fontSize: pluggdTypography.meta,
    fontWeight: pluggdTypography.weights.semibold,
    marginTop: 4,
  },
  listMeta: {
    fontSize: pluggdTypography.meta,
    fontWeight: pluggdTypography.weights.heavy,
    marginTop: 5,
  },
  listPlay: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: PLUGGD_ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: PLUGGD_ORANGE,
    shadowOpacity: 0.24,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  empty: {
    minHeight: 220,
    borderRadius: pluggdRadii.compact,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: pluggdTypography.weights.heavy,
    marginTop: 10,
  },
  emptyBody: {
    fontSize: pluggdTypography.body,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 6,
  },
});
