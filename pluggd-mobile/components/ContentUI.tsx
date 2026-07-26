import { MaterialIcons } from '@expo/vector-icons';
import { pluggdFonts } from '../src/design/typography';
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
import { PluggdChip, PremiumScreenHeader } from './PluggdPrimitives';

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
  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <PremiumScreenHeader
          eyebrow="PLUGGD"
          title={title}
          subtitle={subtitle}
          actions={action}
          style={styles.premiumHeader}
        />
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
          borderColor: theme.colors.border,
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
          borderColor: theme.colors.border,
        },
      ]}
    >
      <View style={styles.emptySignal}><View style={[styles.emptySignalBar, { backgroundColor: theme.colors.accent }]} /><Text style={[styles.emptyEyebrow, { color: theme.colors.accent }]}>CURRENT STATE</Text></View>
      <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>{title}</Text>
      {body ? <Text style={[styles.emptyBody, { color: theme.colors.textMuted }]}>{body}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingTop: 120,
  },
  header: {
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 12,
  },
  premiumHeader: {
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 196,
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
    fontFamily: pluggdFonts.displayBold, fontWeight: pluggdTypography.weights.heavy,
  },
  sectionAction: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionActionText: {
    fontSize: pluggdTypography.meta,
    fontFamily: pluggdFonts.satoshiBold, fontWeight: pluggdTypography.weights.heavy,
  },
  contextRail: {
    gap: 8,
    marginBottom: 10,
    paddingRight: 8,
  },
  posterCard: {
    width: 128,
    borderRadius: pluggdRadii.control,
    borderWidth: 1,
    padding: 8,
    marginRight: 10,
    shadowOpacity: 0.09,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 7 },
  },
  posterArtwork: {
    height: 100,
    borderRadius: pluggdRadii.control,
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
    fontFamily: pluggdFonts.satoshiBold, fontWeight: pluggdTypography.weights.heavy,
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
    fontSize: 15,
    fontFamily: pluggdFonts.displayBold, fontWeight: pluggdTypography.weights.heavy,
  },
  cardSubtitle: {
    fontSize: pluggdTypography.meta,
    fontFamily: pluggdFonts.satoshiMedium, fontWeight: pluggdTypography.weights.semibold,
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
    fontFamily: pluggdFonts.satoshiBold, fontWeight: pluggdTypography.weights.heavy,
  },
  listCard: {
    minHeight: 76,
    borderBottomWidth: 1,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumb: {
    width: 54,
    height: 54,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginRight: 10,
  },
  thumbInitials: {
    fontSize: 18,
    fontFamily: pluggdFonts.satoshiBold, fontWeight: pluggdTypography.weights.heavy,
  },
  listText: {
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
  },
  listTitle: {
    fontSize: pluggdTypography.control,
    fontFamily: pluggdFonts.displayBold, fontWeight: pluggdTypography.weights.heavy,
  },
  listSubtitle: {
    fontSize: pluggdTypography.meta,
    fontFamily: pluggdFonts.satoshiMedium, fontWeight: pluggdTypography.weights.semibold,
    marginTop: 4,
  },
  listMeta: {
    fontSize: pluggdTypography.meta,
    fontFamily: pluggdFonts.satoshiBold, fontWeight: pluggdTypography.weights.heavy,
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
    minHeight: 148,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  emptySignal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emptySignalBar: {
    width: 20,
    height: 3,
    borderRadius: 2,
  },
  emptyEyebrow: {
    fontSize: 10,
    letterSpacing: 1.4,
    fontFamily: pluggdFonts.satoshiBlack,
    fontWeight: '900',
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: pluggdFonts.displayBold, fontWeight: pluggdTypography.weights.heavy,
    marginTop: 10,
  },
  emptyBody: {
    fontSize: 13.5,
    lineHeight: 20,
    textAlign: 'left',
    marginTop: 6,
    maxWidth: 340,
  },
});
