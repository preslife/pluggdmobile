import { MaterialIcons } from '@expo/vector-icons';
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
import { PLUGGD_ORANGE, contentInitials } from '../src/lib/mobileContent';
import { BrandLogo } from './BrandLogo';

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
  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <BrandLogo variant="dark" width={104} height={30} />
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {action}
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
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
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {actionLabel ? (
        <Pressable style={styles.sectionAction} onPress={onAction}>
          <Text style={styles.sectionActionText}>{actionLabel}</Text>
          <MaterialIcons name="chevron-right" size={18} color={PLUGGD_ORANGE} />
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
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.contextRail}
    >
      {tabs.map((tab) => {
        const selected = tab === active;
        return (
          <Pressable
            key={tab}
            onPress={() => onChange(tab)}
            style={[styles.contextChip, selected && styles.contextChipActive]}
          >
            <Text style={[styles.contextChipText, selected && styles.contextChipTextActive]}>
              {tab}
            </Text>
          </Pressable>
        );
      })}
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
  return (
    <Pressable onPress={onPress} style={[styles.posterCard, style]}>
      <View style={styles.posterArtwork}>
        {imageUrl ? <Image source={{ uri: imageUrl }} style={styles.media} /> : null}
        {!imageUrl ? (
          <Text style={styles.posterInitials}>{contentInitials(title)}</Text>
        ) : null}
        <Pressable
          style={styles.playBadge}
          onPress={(event) => {
            event.stopPropagation?.();
            onPlay?.();
          }}
        >
          <MaterialIcons name={icon} size={18} color="#FFFFFF" />
        </Pressable>
      </View>
      <Text style={styles.cardTitle} numberOfLines={1}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={styles.cardSubtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      ) : null}
      {meta ? (
        <View style={styles.metaPill}>
          <Text style={styles.metaText} numberOfLines={1}>
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
  return (
    <Pressable onPress={onPress} style={styles.listCard}>
      <View style={styles.thumb}>
        {imageUrl ? <Image source={{ uri: imageUrl }} style={styles.media} /> : null}
        {!imageUrl ? <Text style={styles.thumbInitials}>{contentInitials(title)}</Text> : null}
      </View>
      <View style={styles.listText}>
        <Text style={styles.listTitle} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.listSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
        {meta ? (
          <Text style={styles.listMeta} numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
      </View>
      {onPlay ? (
        <Pressable
          onPress={(event) => {
            event.stopPropagation?.();
            onPlay();
          }}
          style={styles.listPlay}
        >
          <MaterialIcons name="play-arrow" size={22} color="#FFFFFF" />
        </Pressable>
      ) : (
        <MaterialIcons name={icon} size={24} color="#777777" />
      )}
    </Pressable>
  );
}

export function EmptyState({ title, body }: { title: string; body?: string }) {
  return (
    <View style={styles.empty}>
      <MaterialIcons name="search-off" size={34} color={PLUGGD_ORANGE} />
      <Text style={styles.emptyTitle}>{title}</Text>
      {body ? <Text style={styles.emptyBody}>{body}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#080808',
  },
  header: {
    paddingHorizontal: 14,
    paddingTop: 52,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#171717',
    backgroundColor: '#080808',
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerCopy: {
    flex: 1,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 32,
    lineHeight: 37,
    fontWeight: '900',
    marginTop: 6,
  },
  subtitle: {
    color: '#AFAFAF',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    marginTop: 5,
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 210,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: 11,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '900',
  },
  sectionAction: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionActionText: {
    color: PLUGGD_ORANGE,
    fontSize: 13,
    fontWeight: '900',
  },
  contextRail: {
    gap: 8,
    marginBottom: 14,
  },
  contextChip: {
    minHeight: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333333',
    backgroundColor: '#111111',
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contextChipActive: {
    borderColor: PLUGGD_ORANGE,
    backgroundColor: '#1D120C',
  },
  contextChipText: {
    color: '#AFAFAF',
    fontSize: 14,
    fontWeight: '800',
  },
  contextChipTextActive: {
    color: PLUGGD_ORANGE,
  },
  posterCard: {
    width: 148,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#262626',
    backgroundColor: '#151515',
    padding: 9,
    marginRight: 12,
  },
  posterArtwork: {
    height: 128,
    borderRadius: 8,
    backgroundColor: '#2A1711',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 10,
  },
  media: {
    width: '100%',
    height: '100%',
  },
  posterInitials: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
  },
  playBadge: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: PLUGGD_ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  cardSubtitle: {
    color: '#A4A4A4',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 3,
  },
  metaPill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#24150E',
    borderWidth: 1,
    borderColor: '#3A261A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 8,
  },
  metaText: {
    color: PLUGGD_ORANGE,
    fontSize: 11,
    fontWeight: '900',
  },
  listCard: {
    minHeight: 86,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#262626',
    backgroundColor: '#151515',
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 9,
  },
  thumb: {
    width: 62,
    height: 62,
    borderRadius: 8,
    backgroundColor: '#242424',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginRight: 12,
  },
  thumbInitials: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  listText: {
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
  },
  listTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
  },
  listSubtitle: {
    color: '#B8B8B8',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  listMeta: {
    color: PLUGGD_ORANGE,
    fontSize: 12,
    fontWeight: '900',
    marginTop: 5,
  },
  listPlay: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: PLUGGD_ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 10,
  },
  emptyBody: {
    color: '#AFAFAF',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 6,
  },
});

