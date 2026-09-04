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
import { useBottomChromeInset } from '../src/design/useBottomChromeInset';
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
  const bottomInset = useBottomChromeInset();
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
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomInset }]}
      >
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
        <Pressable accessibilityRole="button" style={styles.sectionAction} onPress={onAction}>
          <Text style={[styles.sectionActionText, { color: theme.colors.accentText }]}>{actionLabel}</Text>
          <MaterialIcons name="chevron-right" size={18} color={theme.colors.accentText} />
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
      accessibilityRole="button"
      accessibilityLabel={`Open ${title}`}
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
          style={[styles.playBadge, { backgroundColor: theme.colors.accentFill, shadowColor: theme.colors.accentFill }]}
          onPress={(event) => {
            event.stopPropagation?.();
            onPlay?.();
          }}
        >
          <MaterialIcons name={icon} size={20} color={theme.colors.onAccent} />
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
          <Text style={[styles.metaText, { color: theme.colors.accentText }]} numberOfLines={1}>
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
      accessibilityRole="button"
      accessibilityLabel={`Open ${title}`}
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
          <Text style={[styles.listMeta, { color: theme.colors.accentText }]} numberOfLines={1}>
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
          style={[styles.listPlay, { backgroundColor: theme.colors.accentFill, shadowColor: theme.colors.accentFill }]}
        >
          <MaterialIcons name="play-arrow" size={22} color={theme.colors.onAccent} />
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
      <View style={styles.emptySignal}><View style={[styles.emptySignalBar, { backgroundColor: theme.colors.accentFill }]} /><Text style={[styles.emptyEyebrow, { color: theme.colors.accentText }]}>CURRENT STATE</Text></View>
      <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>{title}</Text>
      {body ? <Text style={[styles.emptyBody, { color: theme.colors.textMuted }]}>{body}</Text> : null}
    </View>
  );
}

export function RecoveryState({
  eyebrow = 'SIGNAL INTERRUPTED',
  title,
  body,
  icon = 'graphic-eq',
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
}: {
  eyebrow?: string;
  title: string;
  body: string;
  icon?: keyof typeof MaterialIcons.glyphMap;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}) {
  const theme = usePluggdTheme();
  return (
    <View
      style={[
        styles.recovery,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          shadowColor: theme.colors.shadow,
        },
      ]}
    >
      <View
        style={[
          styles.recoveryIcon,
          {
            backgroundColor: theme.colors.surfaceStrong,
            borderColor: theme.colors.borderAccent,
          },
        ]}
      >
        <MaterialIcons name={icon} size={28} color={theme.colors.accentText} />
      </View>
      <Text style={[styles.recoveryEyebrow, { color: theme.colors.accentText }]}>{eyebrow}</Text>
      <Text style={[styles.recoveryTitle, { color: theme.colors.text }]}>{title}</Text>
      <Text style={[styles.recoveryBody, { color: theme.colors.textMuted }]}>{body}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={primaryLabel}
        onPress={onPrimary}
        style={[styles.recoveryPrimary, { backgroundColor: theme.colors.accentFill }]}
      >
        <Text style={[styles.recoveryPrimaryText, { color: theme.colors.onAccent }]}>{primaryLabel}</Text>
        <MaterialIcons name="arrow-forward" size={18} color={theme.colors.onAccent} />
      </Pressable>
      {secondaryLabel && onSecondary ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={secondaryLabel}
          onPress={onSecondary}
          style={[styles.recoverySecondary, { borderColor: theme.colors.border }]}
        >
          <Text style={[styles.recoverySecondaryText, { color: theme.colors.text }]}>{secondaryLabel}</Text>
        </Pressable>
      ) : null}
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
    paddingBottom: 24,
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
    minWidth: 44,
    minHeight: 44,
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
    width: 44,
    height: 44,
    borderRadius: 22,
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
    width: 44,
    height: 44,
    borderRadius: 22,
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
  recovery: {
    width: '100%',
    borderWidth: 1,
    borderRadius: pluggdRadii.card,
    padding: 20,
    marginTop: 18,
    alignItems: 'flex-start',
    shadowOpacity: 0.16,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
  },
  recoveryIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  recoveryEyebrow: {
    fontSize: 10,
    letterSpacing: 1.6,
    fontFamily: pluggdFonts.satoshiBlack,
    fontWeight: '900',
  },
  recoveryTitle: {
    fontSize: 26,
    lineHeight: 30,
    fontFamily: pluggdFonts.displayBold,
    fontWeight: pluggdTypography.weights.heavy,
    marginTop: 8,
  },
  recoveryBody: {
    fontSize: 14,
    lineHeight: 21,
    fontFamily: pluggdFonts.satoshiMedium,
    fontWeight: pluggdTypography.weights.semibold,
    marginTop: 9,
    maxWidth: 330,
  },
  recoveryPrimary: {
    minHeight: 48,
    borderRadius: pluggdRadii.control,
    paddingHorizontal: 16,
    marginTop: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  recoveryPrimaryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: pluggdFonts.satoshiBlack,
    fontWeight: '900',
  },
  recoverySecondary: {
    minHeight: 44,
    borderRadius: pluggdRadii.control,
    borderWidth: 1,
    paddingHorizontal: 16,
    marginTop: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recoverySecondaryText: {
    fontSize: 13,
    fontFamily: pluggdFonts.satoshiBold,
    fontWeight: pluggdTypography.weights.heavy,
  },
});
