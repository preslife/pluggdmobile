import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthProvider';
import { usePlayback } from '../../context/PlaybackProvider';
import { impactHaptic, selectionHaptic } from '../../design/haptics';
import { usePluggdTheme } from '../../design/usePluggdTheme';
import {
  formatCompact,
  formatDate,
  formatGBP,
  releasePlayableUrl,
  toTrack,
  type EventItem,
  type ProfileItem,
  type ReleaseItem,
  type SocialPostItem,
} from '../../lib/mobileContent';
import { supabase } from '../../lib/supabase';
import { loadCreatorModePulse } from './mobileServices';
import {
  useBackstage,
  useEventLayer,
  useHomeFeed,
  useLiveRooms,
  useStageContent,
  useUniversalSearch,
  type BackstageCommunity,
  type BackstageThread,
  type LiveRoomItem,
  type StageMediaItem,
  type VideoItem,
} from './useCultureData';

const NOIR = '#0D0D11';
const NOIR_DEEP = '#08080C';
const NOIR_CARD = '#15151D';
const NOIR_CARD_STRONG = '#1A1A25';
const NOIR_BORDER = '#1F1F2E';
const EMERALD = '#FF5A00';
const VIOLET = '#6C5CE7';
const TEXT = '#FFFFFF';
const MUTED = '#A5A7B4';
const SUBTLE = '#6F7280';
const ORANGE = '#FF5A00';
const SCREEN_BOTTOM = 176;

type Filter = { key: string; label: string };

function initials(value?: string | null) {
  return (value || 'PL')
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function ScreenFrame({
  title,
  subtitle,
  children,
  refreshing,
  onRefresh,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
}) {
  const theme = usePluggdTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { backgroundColor: NOIR }]}>
      <LinearGradient colors={[NOIR, NOIR_DEEP, NOIR]} style={StyleSheet.absoluteFill} />
      <StatusBar style="light" />
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={EMERALD} /> : undefined
        }
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: Math.max(insets.top + 64, 90), paddingBottom: SCREEN_BOTTOM + insets.bottom },
        ]}
      >
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>{title}</Text>
          <Text style={styles.pageSubtitle}>{subtitle}</Text>
        </View>
        {children}
      </ScrollView>
    </View>
  );
}

function LoadingState({ label = 'Loading PLUGGD...' }: { label?: string }) {
  return (
    <View style={styles.loadingBlock}>
      <ActivityIndicator color={ORANGE} />
      <Text style={styles.loadingText}>{label}</Text>
    </View>
  );
}

function EmptyState({
  icon,
  title,
  body,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  body: string;
}) {
  return (
    <View style={styles.emptyCard}>
      <View style={styles.emptyIcon}>
        <MaterialIcons name={icon} size={24} color={ORANGE} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
    </View>
  );
}

function BackstagePassHero({
  releases,
  events,
  communities,
}: {
  releases: number;
  events: number;
  communities: number;
}) {
  return (
    <View style={styles.passHero}>
      <LinearGradient colors={['rgba(108,92,231,0.44)', 'rgba(0,255,136,0.1)', 'rgba(13,13,17,0.95)']} style={StyleSheet.absoluteFill} />
      <View style={styles.passTopRow}>
        <Text style={styles.passKicker}>DIGITAL BACKSTAGE PASS</Text>
        <View style={styles.passLivePill}>
          <View style={styles.livePulse} />
          <Text style={styles.passLiveText}>Culture live</Text>
        </View>
      </View>
      <Text style={styles.passTitle}>Music is happening here now.</Text>
      <Text style={styles.passBody}>
        Discover the drop, join the room, catch the event, and carry the pass in one native flow.
      </Text>
      <View style={styles.passStats}>
        <PassStat label="Drops" value={releases} />
        <PassStat label="Events" value={events} />
        <PassStat label="Circles" value={communities} />
      </View>
    </View>
  );
}

function PassStat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.passStat}>
      <Text style={styles.passStatValue}>{formatCompact(value)}</Text>
      <Text style={styles.passStatLabel}>{label}</Text>
    </View>
  );
}

function FilterRow({
  filters,
  active,
  onChange,
}: {
  filters: Filter[];
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
      {filters.map((filter) => {
        const selected = filter.key === active;
        return (
          <Pressable
            key={filter.key}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => {
              selectionHaptic();
              onChange(filter.key);
            }}
            style={[styles.filterPill, selected && styles.filterPillActive]}
          >
            <Text style={[styles.filterText, selected && styles.filterTextActive]}>{filter.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function Artwork({ uri, fallback, size = 58 }: { uri?: string | null; fallback: string; size?: number }) {
  return (
    <View style={[styles.artwork, { width: size, height: size, borderRadius: Math.max(10, size * 0.18) }]}>
      {uri ? <Image source={{ uri }} style={styles.fill} /> : <Text style={styles.artworkInitials}>{initials(fallback)}</Text>}
    </View>
  );
}

function SectionHeader({ title, action }: { title: string; action?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action ? <Text style={styles.sectionAction}>{action}</Text> : null}
    </View>
  );
}

function HorizontalRail({
  title,
  action,
  children,
}: {
  title: string;
  action?: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.railBlock}>
      <SectionHeader title={title} action={action} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.railContent}>
        {children}
      </ScrollView>
    </View>
  );
}

function EventCultureCard({ event, compact = false }: { event: EventItem; compact?: boolean }) {
  const router = useRouter();
  const location = event.location || 'Location TBA';
  const price = formatGBP(event.price_cents, { cents: true });

  return (
    <Pressable style={[styles.eventCard, compact && styles.eventCardCompact]} onPress={() => router.push(`/events/${event.id}` as any)}>
      <Artwork uri={event.cover_image_url} fallback={event.title || 'Event'} size={compact ? 62 : 86} />
      <View style={styles.eventCopy}>
        <View style={styles.eventBadge}>
          <MaterialIcons name="confirmation-number" size={13} color={EMERALD} />
          <Text style={styles.eventBadgeText}>{price === 'Free' ? 'RSVP' : 'Tickets'}</Text>
        </View>
        <Text style={styles.cardTitle} numberOfLines={2}>{event.title || 'Untitled event'}</Text>
        <Text style={styles.cardMeta} numberOfLines={1}>{formatDate(event.starts_at)} · {location}</Text>
        <Text style={styles.cardSubtle}>{formatCompact(event.rsvp_count)} interested</Text>
      </View>
      <MaterialIcons name="chevron-right" size={22} color="#737373" />
    </Pressable>
  );
}

function EventTile({ event }: { event: EventItem }) {
  const router = useRouter();
  const location = event.location || 'Location TBA';
  const price = formatGBP(event.price_cents, { cents: true });

  return (
    <Pressable style={styles.eventTile} onPress={() => router.push(`/events/${event.id}` as any)}>
      <View style={styles.eventTileImage}>
        {event.cover_image_url ? <Image source={{ uri: event.cover_image_url }} style={styles.fill} /> : null}
        <LinearGradient colors={['rgba(0,0,0,0.04)', 'rgba(0,0,0,0.82)']} style={StyleSheet.absoluteFill} />
        <View style={styles.eventTileBadge}>
          <MaterialIcons name="confirmation-number" size={13} color={EMERALD} />
          <Text style={styles.eventTileBadgeText}>{price === 'Free' ? 'RSVP' : 'Tickets'}</Text>
        </View>
        <View style={styles.lowStockPill}>
          <Text style={styles.lowStockText}>Entry</Text>
        </View>
      </View>
      <View style={styles.eventTileCopy}>
        <Text style={styles.tileTitle} numberOfLines={2}>{event.title || 'Untitled event'}</Text>
        <Text style={styles.tileMeta} numberOfLines={1}>{formatDate(event.starts_at)} · {location}</Text>
      </View>
    </Pressable>
  );
}

function ReleaseEmbed({ release }: { release: ReleaseItem }) {
  const router = useRouter();
  const { playTrack } = usePlayback();
  const playable = releasePlayableUrl(release);

  return (
    <View style={styles.embedCard}>
      <Artwork uri={release.cover_art_url} fallback={release.title || 'Release'} size={58} />
      <View style={styles.embedCopy}>
        <Text style={styles.cardTitle} numberOfLines={1}>{release.title || 'Untitled release'}</Text>
        <Text style={styles.cardMeta} numberOfLines={1}>{release.artist || 'PLUGGD Creator'}</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Play ${release.title || 'release'}`}
        style={[styles.roundAction, !playable && styles.disabledAction]}
        disabled={!playable}
        onPress={() => {
          const track = toTrack(release, 'release');
          if (!track) return;
          impactHaptic();
          playTrack(track);
        }}
      >
        <MaterialIcons name="play-arrow" size={23} color="#FFFFFF" />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open release"
        style={styles.ghostRoundAction}
        onPress={() => router.push(`/release/${release.id}` as any)}
      >
        <MaterialIcons name="open-in-new" size={18} color={ORANGE} />
      </Pressable>
    </View>
  );
}

function ReleaseTile({ release }: { release: ReleaseItem }) {
  const router = useRouter();
  const { playTrack } = usePlayback();
  const playable = releasePlayableUrl(release);

  return (
    <Pressable style={styles.releaseTile} onPress={() => router.push(`/release/${release.id}` as any)}>
      <View style={styles.releaseTileArt}>
        {release.cover_art_url ? <Image source={{ uri: release.cover_art_url }} style={styles.fill} /> : <Text style={styles.artworkInitials}>{initials(release.title || 'Release')}</Text>}
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.78)']} style={StyleSheet.absoluteFill} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Play ${release.title || 'release'}`}
          disabled={!playable}
          style={[styles.tilePlay, !playable && styles.disabledAction]}
          onPress={(event) => {
            event.stopPropagation();
            const track = toTrack(release, 'release');
            if (!track) return;
            impactHaptic();
            playTrack(track);
          }}
        >
          <MaterialIcons name="play-arrow" size={22} color="#FFFFFF" />
        </Pressable>
      </View>
      <Text style={styles.tileTitle} numberOfLines={2}>{release.title || 'Untitled release'}</Text>
      <Text style={styles.tileMeta} numberOfLines={1}>{release.artist || 'PLUGGD Creator'}</Text>
    </Pressable>
  );
}

function Waveform({ active = false }: { active?: boolean }) {
  const bars = [18, 30, 14, 42, 25, 52, 34, 20, 46, 28, 56, 22, 38, 18, 48, 32, 24, 54, 16, 40, 27, 50, 21, 36];
  return (
    <View style={styles.waveform}>
      {bars.map((height, index) => (
        <View
          key={`${height}-${index}`}
          style={[
            styles.waveBar,
            {
              height,
              backgroundColor: active && index % 3 === 0 ? EMERALD : VIOLET,
              opacity: active ? 0.95 : 0.54,
            },
          ]}
        />
      ))}
    </View>
  );
}

function FeedPostCard({ post, release, event }: { post: SocialPostItem; release?: ReleaseItem; event?: EventItem }) {
  const router = useRouter();

  const sharePost = () => {
    selectionHaptic();
    void Share.share({
      title: 'PLUGGD post',
      message: post.body || post.title || 'Shared on PLUGGD',
    });
  };

  return (
    <View style={styles.postCard}>
      <View style={styles.postHeader}>
        <Artwork uri={null} fallback="PLUGGD" size={42} />
        <View style={styles.postAuthor}>
          <Text style={styles.postName}>PLUGGD member</Text>
          <Text style={styles.postHandle}>@pluggd · {formatDate(post.created_at, 'Now')}</Text>
        </View>
        <MaterialIcons name="more-horiz" size={22} color="#737373" />
      </View>
      <Text style={styles.postBody}>{post.body || 'Shared a PLUGGD update.'}</Text>
      {release ? <ReleaseEmbed release={release} /> : null}
      {event ? <EventCultureCard event={event} compact /> : null}
      <View style={styles.socialActions}>
        <SocialAction icon="chat-bubble-outline" label="Comment" onPress={() => router.push('/backstage' as any)} />
        <SocialAction icon="repeat" label="Repost" onPress={impactHaptic} />
        <SocialAction icon="favorite-border" label="Like" onPress={impactHaptic} />
        <SocialAction icon="ios-share" label="Share" onPress={sharePost} />
      </View>
    </View>
  );
}

function SocialAction({ icon, label, onPress }: { icon: keyof typeof MaterialIcons.glyphMap; label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.socialAction} onPress={onPress}>
      <MaterialIcons name={icon} size={18} color="#B3B3B3" />
      <Text style={styles.socialLabel}>{label}</Text>
    </Pressable>
  );
}

function StageMediaCard({ item, event }: { item: StageMediaItem; event?: EventItem }) {
  const router = useRouter();
  const { playTrack } = usePlayback();
  const { width } = useWindowDimensions();
  const visualHeight = Math.min(560, Math.max(500, width * 1.42));

  return (
    <Pressable style={[styles.stageCard, { minHeight: visualHeight + 132 }]} onPress={() => router.push(item.route as any)}>
      <View style={[styles.stageVisual, { height: visualHeight }]}>
        {item.image_url ? <Image source={{ uri: item.image_url }} style={styles.fill} /> : null}
        <LinearGradient colors={['rgba(13,13,17,0.1)', 'rgba(13,13,17,0.15)', 'rgba(13,13,17,0.96)']} style={StyleSheet.absoluteFill} />
        <View style={styles.stageTag}>
          <Text style={styles.stageTagText}>{item.kind}</Text>
        </View>
        <View style={styles.frontRowAvatar}>
          <View style={styles.liveRing}>
            <Artwork uri={item.image_url} fallback={item.creator} size={42} />
          </View>
          <Text style={styles.frontRowText}>Front Row Center</Text>
        </View>
        <View style={styles.stageText}>
          <Text style={styles.stageHook}>15 second hook</Text>
          <Text style={styles.stageTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.stageCreator} numberOfLines={1}>{item.creator}</Text>
          <Waveform active />
        </View>
      </View>
      <View style={styles.stageActions}>
        <Pressable
          style={styles.primaryAction}
          onPress={() => {
            const track = item.release ? toTrack(item.release, 'release') : item.mix ? toTrack(item.mix, 'mix') : null;
            if (!track) return;
            impactHaptic();
            playTrack(track);
          }}
        >
          <MaterialIcons name="play-arrow" size={22} color="#FFFFFF" />
          <Text style={styles.primaryActionText}>Play</Text>
        </Pressable>
        <Pressable style={styles.secondaryAction} onPress={() => router.push(item.route as any)}>
          <MaterialIcons name="bookmark-border" size={19} color="#FFFFFF" />
        </Pressable>
        <Pressable style={styles.secondaryAction} onPress={() => router.push('/search' as any)}>
          <MaterialIcons name="ios-share" size={19} color="#FFFFFF" />
        </Pressable>
        <Pressable style={styles.backstageButton} onPress={() => router.push('/backstage' as any)}>
          <Text style={styles.backstageButtonText}>Backstage</Text>
        </Pressable>
      </View>
      {event ? (
        <View style={styles.stageEventLine}>
          <MaterialIcons name="place" size={15} color={ORANGE} />
          <Text style={styles.stageEventText} numberOfLines={1}>
            Happening {formatDate(event.starts_at)} · {event.location || 'Location TBA'}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function StageTile({ item }: { item: StageMediaItem }) {
  const router = useRouter();
  const { playTrack } = usePlayback();
  const track = item.release ? toTrack(item.release, 'release') : item.mix ? toTrack(item.mix, 'mix') : null;

  return (
    <Pressable style={styles.stageTile} onPress={() => router.push(item.route as any)}>
      <View style={styles.stageTileVisual}>
        {item.image_url ? <Image source={{ uri: item.image_url }} style={styles.fill} /> : null}
        <LinearGradient colors={['rgba(0,0,0,0.02)', 'rgba(0,0,0,0.86)']} style={StyleSheet.absoluteFill} />
        <View style={styles.stageTileKind}>
          <Text style={styles.stageTileKindText}>{item.kind}</Text>
        </View>
        <Pressable
          disabled={!track}
          style={[styles.tilePlay, !track && styles.disabledAction]}
          onPress={(event) => {
            event.stopPropagation();
            if (!track) return;
            impactHaptic();
            playTrack(track);
          }}
        >
          <MaterialIcons name="play-arrow" size={22} color="#FFFFFF" />
        </Pressable>
      </View>
      <View style={styles.stageTileCopy}>
        <Text style={styles.tileTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.tileMeta} numberOfLines={1}>{item.creator}</Text>
      </View>
    </Pressable>
  );
}

function StageLoopPane({ item, event, height }: { item: StageMediaItem; event?: EventItem; height: number }) {
  const router = useRouter();
  const { playTrack } = usePlayback();
  const track = item.release ? toTrack(item.release, 'release') : item.mix ? toTrack(item.mix, 'mix') : null;

  const play = () => {
    if (!track) return;
    impactHaptic();
    playTrack(track);
  };

  return (
    <View style={[styles.stagePane, { height }]}>
      {item.image_url ? <Image source={{ uri: item.image_url }} style={styles.stagePaneImage} /> : null}
      <LinearGradient colors={['rgba(8,8,12,0.1)', 'rgba(8,8,12,0.15)', 'rgba(8,8,12,0.92)']} style={StyleSheet.absoluteFill} />
      <View style={styles.stageTopBrand}>
        <Text style={styles.stageTopText}>STAGE</Text>
      </View>
      <View style={styles.stageControlChain}>
        <Pressable style={styles.creatorPortal} onPress={() => router.push('/backstage' as any)}>
          <View style={styles.creatorPortalRing}>
            <Artwork uri={item.image_url} fallback={item.creator} size={48} />
          </View>
          <View style={styles.followBubble}>
            <MaterialIcons name="add" size={12} color={NOIR_DEEP} />
          </View>
        </Pressable>
        <StageControl icon="favorite-border" label="12K" onPress={() => impactHaptic()} />
        <StageControl icon="playlist-add" label="Save" onPress={() => selectionHaptic()} />
        <Pressable style={styles.cartBadge} onPress={() => router.push(event ? `/events/${event.id}` as any : '/wallet' as any)}>
          <MaterialIcons name="shopping-cart" size={22} color={NOIR_DEEP} />
        </Pressable>
      </View>
      <View style={styles.stageBottomStack}>
        <View style={styles.verifiedNameRow}>
          <Text style={styles.stageArtistName} numberOfLines={1}>{item.creator}</Text>
          <MaterialIcons name="verified" size={18} color={VIOLET} />
        </View>
        <Text style={styles.stageDescription} numberOfLines={2}>
          {item.title}{event ? ` · Playing ${formatDate(event.starts_at)} at ${event.location || 'location TBA'}` : ''}
        </Text>
        <Waveform active />
        <View style={styles.stageBottomActions}>
          <Pressable style={styles.stagePlayCta} onPress={play} disabled={!track}>
            <MaterialIcons name="play-arrow" size={22} color={NOIR_DEEP} />
            <Text style={styles.stagePlayText}>Play hook</Text>
          </Pressable>
          <Pressable style={styles.stageBackstageCta} onPress={() => router.push('/backstage' as any)}>
            <Text style={styles.stageBackstageText}>Backstage</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function StageControl({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.stageControl} onPress={onPress}>
      <MaterialIcons name={icon} size={28} color="#FFFFFF" />
      <Text style={styles.stageControlLabel}>{label}</Text>
    </Pressable>
  );
}

function LiveCultureCard({ room }: { room: LiveRoomItem }) {
  const router = useRouter();
  const isLive = room.status === 'live';

  return (
    <Pressable
      style={styles.liveCard}
      onPress={() => router.push({ pathname: '/live/session', params: { roomId: room.id } } as any)}
    >
      <Artwork uri={room.thumbnail_url || room.creator_avatar_url} fallback={room.creator_name || room.title || 'Live'} size={70} />
      <View style={styles.liveCopy}>
        <View style={[styles.liveBadge, isLive && styles.liveBadgeOn]}>
          <View style={[styles.liveDot, isLive && styles.liveDotOn]} />
          <Text style={[styles.liveBadgeText, isLive && styles.liveBadgeTextOn]}>{isLive ? 'Live now' : room.status || 'Upcoming'}</Text>
        </View>
        <Text style={styles.cardTitle} numberOfLines={2}>{room.title || 'Untitled live session'}</Text>
        <Text style={styles.cardMeta} numberOfLines={1}>{room.creator_name || room.category || 'PLUGGD Live'}</Text>
        {room.viewer_count != null ? <Text style={styles.cardSubtle}>{formatCompact(room.viewer_count)} watching</Text> : null}
      </View>
      <View style={styles.joinButton}>
        <Text style={styles.joinText}>{isLive ? 'Join' : 'View'}</Text>
      </View>
    </Pressable>
  );
}

function LiveMomentTile({ room }: { room: LiveRoomItem }) {
  const router = useRouter();
  const isLive = room.status === 'live';
  const imageUri = room.thumbnail_url || room.creator_avatar_url || undefined;

  return (
    <Pressable
      style={styles.liveTile}
      onPress={() => router.push({ pathname: '/live/session', params: { roomId: room.id } } as any)}
    >
      <View style={styles.liveTileImage}>
        {imageUri ? <Image source={{ uri: imageUri }} style={styles.fill} /> : null}
        <LinearGradient colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.86)']} style={StyleSheet.absoluteFill} />
        <View style={[styles.liveBadge, isLive && styles.liveBadgeOn]}>
          <View style={[styles.liveDot, isLive && styles.liveDotOn]} />
          <Text style={[styles.liveBadgeText, isLive && styles.liveBadgeTextOn]}>{isLive ? 'Live now' : room.status || 'Upcoming'}</Text>
        </View>
      </View>
      <View style={styles.eventTileCopy}>
        <Text style={styles.tileTitle} numberOfLines={2}>{room.title || 'Untitled live session'}</Text>
        <Text style={styles.tileMeta} numberOfLines={1}>{room.creator_name || room.category || 'PLUGGD Live'}</Text>
      </View>
    </Pressable>
  );
}

function CommunityCard({ community }: { community: BackstageCommunity }) {
  const router = useRouter();

  return (
    <Pressable style={styles.communityCard} onPress={() => router.push(`/backstage/${community.id}` as any)}>
      <View style={styles.communityBanner}>
        {community.cover_image_url ? <Image source={{ uri: community.cover_image_url }} style={styles.fill} /> : null}
        <LinearGradient colors={['rgba(255,82,0,0.18)', 'rgba(0,0,0,0.82)']} style={StyleSheet.absoluteFill} />
      </View>
      <View style={styles.communityBody}>
        <Artwork uri={community.avatar_url} fallback={community.title} size={54} />
        <View style={styles.communityCopy}>
          <View style={styles.verifiedRow}>
            <Text style={styles.cardTitle} numberOfLines={1}>{community.title}</Text>
            {community.is_verified ? <MaterialIcons name="verified" size={16} color={ORANGE} /> : null}
          </View>
          <Text style={styles.cardMeta} numberOfLines={1}>
            {formatCompact(community.member_count)} members
            {community.online_count != null ? ` · ${formatCompact(community.online_count)} online` : ''}
          </Text>
        </View>
        <View style={styles.joinButton}>
          <Text style={styles.joinText}>Enter</Text>
        </View>
      </View>
    </Pressable>
  );
}

function CommunityTile({ community }: { community: BackstageCommunity }) {
  const router = useRouter();

  return (
    <Pressable style={styles.communityTile} onPress={() => router.push(`/backstage/${community.id}` as any)}>
      <View style={styles.communityTileImage}>
        {community.cover_image_url ? <Image source={{ uri: community.cover_image_url }} style={styles.fill} /> : null}
        <LinearGradient colors={['rgba(255,82,0,0.12)', 'rgba(0,0,0,0.86)']} style={StyleSheet.absoluteFill} />
      </View>
      <View style={styles.communityTileBody}>
        <Artwork uri={community.avatar_url} fallback={community.title} size={42} />
        <View style={styles.communityCopy}>
          <View style={styles.verifiedRow}>
            <Text style={styles.tileTitle} numberOfLines={1}>{community.title}</Text>
            {community.is_verified ? <MaterialIcons name="verified" size={15} color={ORANGE} /> : null}
          </View>
          <Text style={styles.tileMeta} numberOfLines={1}>
            {formatCompact(community.member_count)} members
            {community.online_count != null ? ` · ${formatCompact(community.online_count)} online` : ''}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

function CreatorTile({ profile }: { profile: ProfileItem }) {
  const router = useRouter();
  const username = profile.username || profile.user_id || profile.id;

  return (
    <Pressable style={styles.creatorTile} onPress={() => username && router.push(`/creator/${username}` as any)}>
      <Artwork uri={profile.avatar_url} fallback={profile.display_name || profile.full_name || profile.username || 'Creator'} size={68} />
      <Text style={styles.tileTitle} numberOfLines={1}>{profile.display_name || profile.full_name || profile.username || 'PLUGGD creator'}</Text>
      <Text style={styles.tileMeta} numberOfLines={1}>@{profile.username || 'pluggd'}</Text>
    </Pressable>
  );
}

function ThreadCard({ thread }: { thread: BackstageThread }) {
  return (
    <View style={styles.threadCard}>
      <View style={styles.threadTop}>
        <Text style={styles.threadTag}>{thread.category || 'Thread'}</Text>
        <View style={styles.threadFlags}>
          {thread.is_pinned ? <MaterialIcons name="push-pin" size={15} color={ORANGE} /> : null}
          {thread.is_locked ? <MaterialIcons name="lock" size={15} color="#737373" /> : null}
        </View>
      </View>
      <Text style={styles.threadTitle} numberOfLines={2}>{thread.title}</Text>
      {thread.body ? <Text style={styles.threadBody} numberOfLines={2}>{thread.body}</Text> : null}
      <Text style={styles.cardMeta}>
        {thread.author_name || thread.author_handle || 'PLUGGD member'} · {formatDate(thread.created_at, 'Now')}
      </Text>
      <View style={styles.threadStats}>
        <Text style={styles.cardSubtle}>{formatCompact(thread.like_count)} likes</Text>
        <Text style={styles.cardSubtle}>{formatCompact(thread.comment_count)} comments</Text>
      </View>
    </View>
  );
}

function CreatorRow({ profile }: { profile: ProfileItem }) {
  const router = useRouter();
  const username = profile.username || profile.user_id || profile.id;
  return (
    <Pressable style={styles.resultRow} onPress={() => username && router.push(`/creator/${username}` as any)}>
      <Artwork uri={profile.avatar_url} fallback={profile.display_name || profile.full_name || profile.username || 'Creator'} size={48} />
      <View style={styles.resultCopy}>
        <Text style={styles.cardTitle} numberOfLines={1}>{profile.display_name || profile.full_name || profile.username || 'PLUGGD creator'}</Text>
        <Text style={styles.cardMeta} numberOfLines={1}>@{profile.username || 'pluggd'} · {profile.primary_genre || profile.city || profile.profile_type || 'Creator'}</Text>
      </View>
      {profile.is_verified ? <MaterialIcons name="verified" size={18} color={ORANGE} /> : null}
    </Pressable>
  );
}

function HomeSubHeader({
  active,
  onChange,
  top,
}: {
  active: string;
  onChange: (key: string) => void;
  top: number;
}) {
  const tabs = [
    { key: 'for-you', label: 'FOR YOU' },
    { key: 'following', label: 'FOLLOWING' },
    { key: 'backstage', label: 'BACKSTAGE' },
  ];

  return (
    <View style={[styles.homeSubHeader, { top }]}>
      {tabs.map((tab) => {
        const selected = active === tab.key;
        return (
          <Pressable
            key={tab.key}
            style={styles.homeTab}
            onPress={() => {
              selectionHaptic();
              onChange(tab.key);
            }}
          >
            <Text style={[styles.homeTabText, selected && styles.homeTabTextActive]}>{tab.label}</Text>
            {selected ? <View style={styles.homeTabIndicator} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

function InlineMediaWidget({ release }: { release: ReleaseItem }) {
  const { playTrack } = usePlayback();
  const playable = releasePlayableUrl(release);

  return (
    <Pressable
      style={styles.inlinePlayer}
      disabled={!playable}
      onPress={() => {
        const track = toTrack(release, 'release');
        if (!track) return;
        impactHaptic();
        playTrack(track);
      }}
    >
      <Artwork uri={release.cover_art_url} fallback={release.title || 'Release'} size={56} />
      <View style={styles.inlinePlayerCopy}>
        <Text style={styles.inlineTrackTitle} numberOfLines={1}>{release.title || 'Untitled release'}</Text>
        <Text style={styles.inlineCreatorName} numberOfLines={1}>{release.artist || 'PLUGGD Creator'}</Text>
        <View style={styles.inlineProgress}>
          <Text style={styles.inlineTime}>01:24</Text>
          <View style={styles.inlineProgressTrack}>
            <View style={styles.inlineProgressFill} />
          </View>
          <Text style={styles.inlineTime}>58:12</Text>
        </View>
      </View>
      <View style={styles.inlinePlayRing}>
        <MaterialIcons name="play-arrow" size={22} color={NOIR_DEEP} />
      </View>
    </Pressable>
  );
}

function TimelinePostCard({
  post,
  release,
  event,
}: {
  post?: SocialPostItem;
  release?: ReleaseItem;
  event?: EventItem;
}) {
  const router = useRouter();
  const body =
    post?.body ||
    (release ? `${release.artist || 'PLUGGD creator'} shared a new Stage hook before it moves through the scene.` : undefined) ||
    (event ? `${event.title || 'PLUGGD event'} is opening the entry gate soon.` : 'New activity is moving through PLUGGD.');
  const name = release?.artist || 'PLUGGD member';
  const handle = release?.artist ? `@${release.artist.replace(/\s+/g, '').toLowerCase()}` : '@pluggd';

  return (
    <View style={styles.timelineCard}>
      <View style={styles.timelineHeader}>
        <Artwork uri={release?.cover_art_url || event?.cover_image_url} fallback={name} size={40} />
        <View style={styles.timelineUserCopy}>
          <Text style={styles.timelineName} numberOfLines={1}>
            {name} <Text style={styles.timelineHandle}>{handle}</Text>
          </Text>
          <Text style={styles.timelineTime}>• {formatDate(post?.created_at || release?.created_at || event?.created_at, 'Now')}</Text>
        </View>
        <Pressable style={styles.timelineMore} onPress={() => router.push('/search' as any)}>
          <MaterialIcons name="more-horiz" size={22} color="#8E8E9F" />
        </Pressable>
      </View>
      <Text style={styles.timelineBody}>{body}</Text>
      {release ? <InlineMediaWidget release={release} /> : null}
      {event ? (
        <Pressable style={styles.inlineEventWidget} onPress={() => router.push(`/events/${event.id}` as any)}>
          <Text style={styles.inlineEventKicker}>ENTRY GATE</Text>
          <Text style={styles.inlineEventTitle} numberOfLines={1}>{event.title}</Text>
          <Text style={styles.inlineCreatorName} numberOfLines={1}>{formatDate(event.starts_at)} · {event.location || 'Location TBA'}</Text>
        </Pressable>
      ) : null}
      <View style={styles.timelineFooter}>
        <SocialAction icon="chat-bubble-outline" label="48" onPress={() => router.push('/backstage' as any)} />
        <SocialAction icon="repeat" label="18" onPress={impactHaptic} />
        <SocialAction icon="favorite-border" label="512" onPress={impactHaptic} />
        <SocialAction
          icon="ios-share"
          label="Share"
          onPress={() => {
            selectionHaptic();
            void Share.share({ title: 'PLUGGD', message: body });
          }}
        />
      </View>
    </View>
  );
}

function TimelineSkeleton() {
  return (
    <View style={styles.timelineCard}>
      <View style={styles.timelineHeader}>
        <View style={styles.skeletonAvatar} />
        <View style={styles.skeletonTextStack}>
          <View style={styles.skeletonLineWide} />
          <View style={styles.skeletonLineShort} />
        </View>
      </View>
      <View style={styles.skeletonBody} />
      <View style={styles.inlinePlayer} />
    </View>
  );
}

function MerchBoothRail({ events }: { events: EventItem[] }) {
  if (!events.length) return null;

  return (
    <HorizontalRail title="Merch Booth" action="Wallet">
      {events.slice(0, 8).map((event) => <EventTile key={event.id} event={event} />)}
    </HorizontalRail>
  );
}

export function HomeScreen() {
  const [filter, setFilter] = useState('for-you');
  const query = useHomeFeed();
  const insets = useSafeAreaInsets();
  const bundle = query.data;
  const hasCulture = !!bundle && (bundle.posts.length > 0 || bundle.releases.length > 0 || bundle.events.length > 0 || bundle.soundboards.length > 0);

  return (
    <View style={styles.homeScreen}>
      <LinearGradient colors={[NOIR_DEEP, NOIR, NOIR_DEEP]} style={StyleSheet.absoluteFill} />
      <StatusBar style="light" />
      <Stack.Screen options={{ headerShown: false }} />
      <HomeSubHeader active={filter} onChange={setFilter} top={insets.top + 60} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={query.isFetching} onRefresh={() => query.refetch()} tintColor={EMERALD} />}
        contentContainerStyle={[
          styles.timelineContent,
          { paddingTop: insets.top + 104, paddingBottom: 132 + insets.bottom },
        ]}
      >
        {query.isLoading ? (
          <>
            <TimelineSkeleton />
            <TimelineSkeleton />
          </>
        ) : null}
        {!query.isLoading && !hasCulture ? (
          <EmptyState icon="dynamic-feed" title="Follow creators to shape your feed." body="Posts, music, live alerts and event moments will appear here as your PLUGGD graph grows." />
        ) : null}
        {filter === 'backstage' ? (
          bundle?.soundboards.slice(0, 8).map((board) => (
            <CommunityCard
              key={board.id}
              community={{
                id: board.id,
                title: board.title || 'Creator Backstage',
                description: board.description,
                cover_image_url: board.cover_image_url,
                creator_id: board.creator_id,
                member_count: board.follower_count,
                online_count: board.comment_count,
                last_activity_at: board.last_activity_at,
              }}
            />
          ))
        ) : (
          <>
            {bundle?.posts.slice(0, 8).map((post, index) => (
              <TimelinePostCard
                key={post.id}
                post={post}
                release={bundle.releases[index % Math.max(bundle.releases.length, 1)]}
                event={bundle.events[index % Math.max(bundle.events.length, 1)]}
              />
            ))}
            {bundle && bundle.posts.length === 0
              ? bundle.releases.slice(0, 8).map((release, index) => (
                  <TimelinePostCard
                    key={release.id}
                    release={release}
                    event={bundle.events[index % Math.max(bundle.events.length, 1)]}
                  />
                ))
              : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

export function StageScreen() {
  const [filter, setFilter] = useState('for-you');
  const query = useStageContent();
  const events = useEventLayer(6);
  const { height } = useWindowDimensions();
  const media = query.media.filter((item) => {
    if (filter === 'releases') return item.kind === 'release';
    if (filter === 'mixes') return item.kind === 'mix';
    if (filter === 'videos' || filter === 'playlists') return item.kind === filter.slice(0, -1);
    return true;
  });

  return (
    <View style={styles.stageShell}>
      <StatusBar style="light" />
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.stageFilterOverlay}>
        <FilterRow
          filters={[
            { key: 'for-you', label: 'For You' },
            { key: 'releases', label: 'Releases' },
            { key: 'mixes', label: 'Mixes' },
            { key: 'videos', label: 'Videos' },
            { key: 'playlists', label: 'Playlists' },
          ]}
          active={filter}
          onChange={setFilter}
        />
      </View>
      {query.isLoading ? <LoadingState label="Loading Stage..." /> : null}
      {!query.isLoading && media.length === 0 ? (
        <View style={styles.stageEmptyWrap}>
          <EmptyState icon="graphic-eq" title="Your sound is loading. Explore trending creators." body="When releases, mixes and videos are published, Stage becomes the fastest way to move through them." />
        </View>
      ) : null}
      <ScrollView
        pagingEnabled
        snapToInterval={height}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={query.isFetching}
            onRefresh={() => {
              query.refetch();
              events.refetch();
            }}
            tintColor={EMERALD}
          />
        }
      >
        {media.slice(0, 12).map((item, index) => (
          <StageLoopPane
            key={`${item.kind}-${item.id}`}
            item={item}
            event={events.data?.[index % Math.max(events.data.length, 1)]}
            height={height}
          />
        ))}
      </ScrollView>
    </View>
  );
}

export function LiveScreen() {
  const query = useLiveRooms();
  const events = useEventLayer(8);
  const rooms = query.data ?? [];
  const live = rooms.filter((room) => room.status === 'live');
  const upcoming = rooms.filter((room) => room.status !== 'live' && room.status !== 'replay');
  const replays = rooms.filter((room) => room.status === 'replay');

  return (
    <ScreenFrame
      title="Live"
      subtitle="Verified creator moments, listening parties, event streams and music culture in real time."
      refreshing={query.isFetching}
      onRefresh={() => {
        query.refetch();
        events.refetch();
      }}
    >
      {query.isLoading ? <LoadingState label="Checking who is live..." /> : null}
      {!query.isLoading && rooms.length === 0 ? (
        <EmptyState icon="settings-input-antenna" title="No one is live right now. See upcoming sessions." body="Creator lives, listening parties and event streams will appear here when they are active." />
      ) : null}
      {live.length > 0 ? (
        <HorizontalRail title="Live now">
          {live.map((room) => <LiveMomentTile key={room.id} room={room} />)}
        </HorizontalRail>
      ) : null}
      {upcoming.length > 0 ? <SectionHeader title="Upcoming Lives" /> : null}
      {upcoming.map((room) => <LiveCultureCard key={room.id} room={room} />)}
      {replays.length > 0 ? <SectionHeader title="Replays / Clips" /> : null}
      {replays.map((room) => <LiveCultureCard key={room.id} room={room} />)}
      {events.data?.length ? (
        <HorizontalRail title="Live-linked events">
          {events.data.slice(0, 8).map((event) => <EventTile key={event.id} event={event} />)}
        </HorizontalRail>
      ) : null}
    </ScreenFrame>
  );
}

export function BackstageScreen() {
  const [filter, setFilter] = useState('posts');
  const query = useBackstage();
  const data = query.data;
  const hasData = !!data && (data.communities.length > 0 || data.threads.length > 0 || data.events.length > 0);

  return (
    <ScreenFrame
      title="Backstage"
      subtitle="Official creator communities, threads, live rooms, event chat and fan worlds."
      refreshing={query.isFetching}
      onRefresh={() => query.refetch()}
    >
      <FilterRow
        filters={[
          { key: 'posts', label: 'Posts' },
          { key: 'threads', label: 'Threads' },
          { key: 'live', label: 'Live Rooms' },
          { key: 'events', label: 'Events' },
          { key: 'drops', label: 'Drops' },
        ]}
        active={filter}
        onChange={setFilter}
      />
      {query.isLoading ? <LoadingState label="Opening Backstage..." /> : null}
      {!query.isLoading && !hasData ? (
        <EmptyState icon="forum" title="Join creator communities to enter the conversation." body="Official Backstage communities will collect releases, event threads, fan talk and creator announcements." />
      ) : null}
      {data?.communities.length ? (
        <HorizontalRail title="Creator communities">
          {data.communities.slice(0, 10).map((community) => <CommunityTile key={community.id} community={community} />)}
        </HorizontalRail>
      ) : null}
      {data?.threads.length ? <SectionHeader title="Active discussions" /> : null}
      {data?.threads.slice(0, 10).map((thread) => <ThreadCard key={thread.id} thread={thread} />)}
      {data?.events.length ? (
        <HorizontalRail title="Event threads">
          {data.events.slice(0, 8).map((event) => <EventTile key={event.id} event={event} />)}
        </HorizontalRail>
      ) : null}
    </ScreenFrame>
  );
}

export function SearchScreen() {
  const router = useRouter();
  const [term, setTerm] = useState('');
  const [category, setCategory] = useState('top');
  const search = useUniversalSearch(term);
  const discovery = useHomeFeed();
  const hasSearch = term.trim().length >= 2;
  const results = search.data;
  const emptyResults =
    hasSearch &&
    !search.isLoading &&
    results &&
    results.creators.length +
      results.tracks.length +
      results.mixes.length +
      results.beats.length +
      results.videos.length +
      results.events.length +
      results.communities.length +
      results.users.length +
      results.liveStreams.length ===
      0;

  return (
    <ScreenFrame title="Search" subtitle="Find artists, tracks, events, communities, live streams, topics and fans.">
      <View style={styles.searchBox}>
        <MaterialIcons name="search" size={21} color="#B3B3B3" />
        <TextInput
          value={term}
          onChangeText={setTerm}
          placeholder="Search PLUGGD"
          placeholderTextColor="#737373"
          autoCorrect={false}
          style={styles.searchInput}
        />
      </View>
      <FilterRow
        filters={[
          { key: 'top', label: 'Top' },
          { key: 'creators', label: 'Creators' },
          { key: 'tracks', label: 'Tracks' },
          { key: 'mixes', label: 'Mixes' },
          { key: 'videos', label: 'Videos' },
          { key: 'events', label: 'Events' },
          { key: 'communities', label: 'Communities' },
          { key: 'users', label: 'Users' },
          { key: 'beats', label: 'Beats' },
          { key: 'live', label: 'Live' },
        ]}
        active={category}
        onChange={setCategory}
      />
      {!hasSearch ? (
        <>
          <EmptyState icon="travel-explore" title="Search artists, tracks, events, communities and fans." body="Start typing to search the full PLUGGD culture layer." />
          {discovery.data?.events.length ? (
            <HorizontalRail title="Trending events">
              {discovery.data.events.slice(0, 8).map((event) => <EventTile key={event.id} event={event} />)}
            </HorizontalRail>
          ) : null}
          {discovery.data?.profiles.length ? (
            <HorizontalRail title="Creators to know">
              {discovery.data.profiles.slice(0, 10).map((profile) => <CreatorTile key={profile.user_id || profile.id || profile.username} profile={profile} />)}
            </HorizontalRail>
          ) : null}
        </>
      ) : null}
      {search.isLoading ? <LoadingState label="Searching PLUGGD..." /> : null}
      {emptyResults ? <EmptyState icon="search-off" title="No results yet" body="Try another artist, track, city, event, community or fan handle." /> : null}
      {(category === 'top' || category === 'creators') && results?.creators.length ? <SectionHeader title="Creators" /> : null}
      {(category === 'top' || category === 'creators') && results?.creators.slice(0, 6).map((profile) => <CreatorRow key={`creator-${profile.user_id || profile.id || profile.username}`} profile={profile} />)}
      {(category === 'top' || category === 'tracks') && results?.tracks.length ? <SectionHeader title="Tracks" /> : null}
      {(category === 'top' || category === 'tracks') && results?.tracks.slice(0, 6).map((release) => <ReleaseEmbed key={release.id} release={release} />)}
      {(category === 'top' || category === 'mixes') && results?.mixes.length ? <SectionHeader title="Mixes" /> : null}
      {(category === 'top' || category === 'mixes') && results?.mixes.slice(0, 6).map((mix: any) => (
        <Pressable key={mix.id} style={styles.resultRow} onPress={() => router.push(`/mixes/${mix.slug || mix.id}` as any)}>
          <Artwork uri={mix.cover_url} fallback={mix.title || 'Mix'} size={48} />
          <View style={styles.resultCopy}>
            <Text style={styles.cardTitle} numberOfLines={1}>{mix.title || 'Untitled mix'}</Text>
            <Text style={styles.cardMeta} numberOfLines={1}>{mix.city || mix.event_name || 'PLUGGD Mix'}</Text>
          </View>
          <MaterialIcons name="chevron-right" size={20} color={SUBTLE} />
        </Pressable>
      ))}
      {(category === 'top' || category === 'beats') && results?.beats.length ? <SectionHeader title="Beats / Producers" /> : null}
      {(category === 'top' || category === 'beats') && results?.beats.slice(0, 6).map((beat) => (
        <Pressable key={beat.id} style={styles.resultRow} onPress={() => router.push(`/beat/${beat.id}` as any)}>
          <Artwork uri={beat.image_url} fallback={beat.title || 'Beat'} size={48} />
          <View style={styles.resultCopy}>
            <Text style={styles.cardTitle} numberOfLines={1}>{beat.title || 'Untitled beat'}</Text>
            <Text style={styles.cardMeta} numberOfLines={1}>{beat.producer_name || beat.genre || 'Producer drop'}</Text>
          </View>
          <MaterialIcons name="chevron-right" size={20} color={SUBTLE} />
        </Pressable>
      ))}
      {(category === 'top' || category === 'videos') && results?.videos.length ? <SectionHeader title="Videos" /> : null}
      {(category === 'top' || category === 'videos') && results?.videos.slice(0, 6).map((video: VideoItem) => (
        <Pressable
          key={video.id}
          style={styles.resultRow}
          onPress={() => {
            if (video.youtube_url) void Linking.openURL(video.youtube_url);
          }}
        >
          <Artwork uri={video.thumbnail_url} fallback={video.title || 'Video'} size={48} />
          <View style={styles.resultCopy}>
            <Text style={styles.cardTitle} numberOfLines={1}>{video.title || 'Untitled video'}</Text>
            <Text style={styles.cardMeta} numberOfLines={1}>{video.description || 'Video'}</Text>
          </View>
          <MaterialIcons name="chevron-right" size={20} color={SUBTLE} />
        </Pressable>
      ))}
      {(category === 'top' || category === 'events') && results?.events.length ? (
        <HorizontalRail title="Events">
          {results.events.slice(0, 8).map((event) => <EventTile key={event.id} event={event} />)}
        </HorizontalRail>
      ) : null}
      {(category === 'top' || category === 'communities') && results?.communities.length ? <SectionHeader title="Communities" /> : null}
      {(category === 'top' || category === 'communities') && results?.communities.slice(0, 6).map((community) => <CommunityCard key={community.id} community={community} />)}
      {(category === 'top' || category === 'users') && results?.users.length ? <SectionHeader title="Users" /> : null}
      {(category === 'top' || category === 'users') && results?.users.slice(0, 6).map((profile) => <CreatorRow key={`user-${profile.user_id || profile.id || profile.username}`} profile={profile} />)}
      {(category === 'top' || category === 'live') && results?.liveStreams.length ? <SectionHeader title="Live Streams" /> : null}
      {(category === 'top' || category === 'live') && results?.liveStreams.slice(0, 6).map((room) => (
        <Pressable
          key={room.id}
          style={styles.resultRow}
          onPress={() => router.push({ pathname: '/live/session', params: { roomId: room.id } } as any)}
        >
          <Artwork uri={room.thumbnail_url || room.creator_avatar_url} fallback={room.title || 'Live'} size={48} />
          <View style={styles.resultCopy}>
            <Text style={styles.cardTitle} numberOfLines={1}>{room.title || 'Live stream'}</Text>
            <Text style={styles.cardMeta} numberOfLines={1}>{room.status || 'Live room'}</Text>
          </View>
          <MaterialIcons name="chevron-right" size={20} color={SUBTLE} />
        </Pressable>
      ))}
    </ScreenFrame>
  );
}

export function CreatorModeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [checking, setChecking] = useState(false);
  const [creatorAccess, setCreatorAccess] = useState<boolean | null>(null);
  const pulse = useQuery({
    queryKey: ['culture', 'creator-mode-pulse', user?.id],
    queryFn: () => loadCreatorModePulse(String(user?.id)),
    enabled: !!user?.id && creatorAccess !== false,
  });

  useEffect(() => {
    let mounted = true;
    if (!user?.id) {
      setCreatorAccess(false);
      return;
    }
    setChecking(true);
    Promise.all([
      (supabase as any).from('profiles').select('is_creator,user_type,profile_type,is_label').eq('user_id', user.id).maybeSingle(),
      (supabase as any).from('profile_roles').select('role').eq('user_id', user.id),
    ])
      .then(([profileRes, roleRes]) => {
        if (!mounted) return;
        const profile = profileRes.data as { is_creator?: boolean; user_type?: string; profile_type?: string; is_label?: boolean } | null;
        const roles = Array.isArray(roleRes.data) ? roleRes.data.map((row: { role?: string }) => row.role) : [];
        const roleText = [profile?.user_type, profile?.profile_type, ...roles].join(' ').toLowerCase();
        setCreatorAccess(!!profile?.is_creator || !!profile?.is_label || /artist|producer|dj|promoter|venue|creator|manager/.test(roleText));
      })
      .catch(() => {
        if (mounted) setCreatorAccess(false);
      })
      .finally(() => {
        if (mounted) setChecking(false);
      });
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  const quickActions = [
    { label: 'Go Live', icon: 'settings-input-antenna' as const, route: '/live/create' },
    { label: 'Create Post', icon: 'post-add' as const, route: '/create-post' },
    { label: 'Upload Clip', icon: 'movie-creation' as const, route: '/upload-clip' },
    { label: 'Listening Party', icon: 'graphic-eq' as const, route: '/live/create?type=listening-party' },
    { label: 'Create Thread', icon: 'forum' as const, route: '/create-post?type=thread' },
    { label: 'Announcement', icon: 'campaign' as const, route: '/create-post?type=announcement' },
    { label: 'Scan Tickets', icon: 'qr-code-scanner' as const, route: '/ticket-scan' },
    { label: 'Reply to Fans', icon: 'mark-chat-unread' as const, route: '/notifications' },
  ];

  return (
    <ScreenFrame title="Creator Mode" subtitle="Stay active, present and responsive from your phone. Deep business tools stay on desktop Studio.">
      {checking ? <LoadingState label="Checking account role..." /> : null}
      {creatorAccess === false ? (
        <EmptyState icon="lock" title="Creator Mode is not active for this account." body="Fan accounts can still post, follow creators, join Backstage communities and buy tickets." />
      ) : null}
      <SectionHeader title="Quick actions" />
      <View style={styles.actionGrid}>
        {quickActions.map((action) => (
          <Pressable
            key={action.label}
            style={styles.creatorAction}
            onPress={() => {
              router.push(action.route as any);
            }}
          >
            <MaterialIcons name={action.icon} size={23} color={ORANGE} />
            <Text style={styles.creatorActionText}>{action.label}</Text>
          </Pressable>
        ))}
      </View>
      <SectionHeader title="Activity pulse" />
      <View style={styles.pulseCard}>
        {[
          ['New followers', pulse.data?.followers ?? 0],
          ['Mentions', pulse.data?.mentions ?? 0],
          ['Comments', pulse.data?.comments ?? 0],
          ['Reposts', pulse.data?.reposts ?? 0],
          ['Community activity', pulse.data?.communityActivity ?? 0],
          ['Live activity', pulse.data?.liveActivity ?? 0],
          ['Ticket summary', pulse.data?.ticketSummary ?? 0],
          ['Latest purchases', pulse.data?.latestPurchases ?? 0],
          ['Gifts / tips', pulse.data?.gifts ?? 0],
        ].map(([label, value]) => (
          <View key={String(label)} style={styles.pulseRow}>
            <Text style={styles.pulseLabel}>{label}</Text>
            <Text style={styles.pulseValue}>{pulse.isLoading ? '...' : formatCompact(Number(value))}</Text>
          </View>
        ))}
      </View>
      <EmptyState icon="desktop-mac" title="Desktop Studio handles the heavy work." body="Distribution, payouts, tax, detailed analytics, CRM, inventory and advanced release operations stay on web Creator Studio." />
    </ScreenFrame>
  );
}

export function TicketsScreen() {
  const events = useEventLayer(12);

  return (
    <ScreenFrame title="Tickets" subtitle="Your active tickets, RSVP status, reminders and event entry details will live here.">
      {events.isLoading ? <LoadingState label="Checking event access..." /> : null}
      {!events.isLoading && !events.data?.length ? (
        <EmptyState icon="confirmation-number" title="Tickets, rewards and purchases will appear here." body="When ticket storage or QR entry is available for your account, this screen will show secure entry details." />
      ) : null}
      {events.data?.map((event) => <EventCultureCard key={event.id} event={event} />)}
      <EmptyState icon="qr-code-2" title="QR entry appears only when supported." body="PLUGGD will only display verified ticket codes. Dynamic QR or Apple Wallet support will be added when the backend contract is confirmed." />
    </ScreenFrame>
  );
}

export function CreateHubScreen() {
  const router = useRouter();
  const actions = [
    { label: 'Post', meta: 'Drop a feed update', icon: 'post-add' as const, route: '/create-post' },
    { label: 'Go Live', meta: 'Open a creator session', icon: 'settings-input-antenna' as const, route: '/live/create' },
    { label: 'Upload Clip', meta: 'Short-form Stage asset', icon: 'movie-creation' as const, route: '/upload-clip' },
    { label: 'Thread', meta: 'Start a Backstage forum', icon: 'forum' as const, route: '/create-post?type=thread' },
    { label: 'Event', meta: 'Manage event pulse', icon: 'confirmation-number' as const, route: '/creator/events' },
    { label: 'Creator Mode', meta: 'Lightweight mobile controls', icon: 'bolt' as const, route: '/creator-mode' },
  ];

  return (
    <ScreenFrame title="Create" subtitle="Fast actions for staying present without bringing desktop Studio into the fan app.">
      <View style={styles.createHero}>
        <Text style={styles.passKicker}>CREATOR QUICK SWITCH</Text>
        <Text style={styles.passTitle}>Move the room without leaving mobile.</Text>
        <Text style={styles.passBody}>Post, go live, start a thread, or push fans toward an event. Heavy operations stay on web Studio.</Text>
      </View>
      <View style={styles.actionGrid}>
        {actions.map((action) => (
          <Pressable key={action.label} style={styles.createAction} onPress={() => router.push(action.route as any)}>
            <MaterialIcons name={action.icon} size={24} color={action.label === 'Event' ? EMERALD : VIOLET} />
            <Text style={styles.creatorActionText}>{action.label}</Text>
            <Text style={styles.createActionMeta}>{action.meta}</Text>
          </Pressable>
        ))}
      </View>
    </ScreenFrame>
  );
}

export function ProfileHubScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const items = [
    { label: 'Wallet Vault', route: '/wallet', icon: 'account-balance-wallet' as const, accent: EMERALD },
    { label: 'Tickets', route: '/tickets', icon: 'confirmation-number' as const, accent: EMERALD },
    { label: 'Library', route: '/library', icon: 'library-music' as const, accent: VIOLET },
    { label: 'Saved', route: '/favorites', icon: 'bookmark-border' as const, accent: VIOLET },
    { label: 'Following', route: '/following', icon: 'group' as const, accent: VIOLET },
    { label: 'Settings', route: '/settings', icon: 'settings' as const, accent: '#8E8E9F' },
  ];

  return (
    <ScreenFrame title="Profile" subtitle="Your fan identity, vault, tickets, saved music, and creator access.">
      <View style={styles.profilePass}>
        <Text style={styles.passKicker}>FAN IDENTITY</Text>
        <Text style={styles.passTitle}>{user?.email || 'PLUGGD member'}</Text>
        <Text style={styles.passBody}>Badges, purchases, communities, and tickets collect here as your culture graph grows.</Text>
      </View>
      <View style={styles.profileGrid}>
        {items.map((item) => (
          <Pressable key={item.label} style={styles.profileTile} onPress={() => router.push(item.route as any)}>
            <MaterialIcons name={item.icon} size={24} color={item.accent} />
            <Text style={styles.profileTileText}>{item.label}</Text>
          </Pressable>
        ))}
      </View>
    </ScreenFrame>
  );
}

export function SimpleContextScreen({
  title,
  subtitle,
  icon,
  body,
}: {
  title: string;
  subtitle: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  body: string;
}) {
  return (
    <ScreenFrame title={title} subtitle={subtitle}>
      <EmptyState icon={icon} title={title} body={body} />
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: NOIR },
  homeScreen: { flex: 1, backgroundColor: NOIR_DEEP },
  homeSubHeader: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 44,
    zIndex: 70,
    backgroundColor: 'rgba(8,8,12,0.92)',
    borderBottomWidth: 1,
    borderBottomColor: NOIR_BORDER,
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-around',
  },
  homeTab: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeTabText: {
    color: '#62627A',
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '700',
  },
  homeTabTextActive: {
    color: TEXT,
  },
  homeTabIndicator: {
    position: 'absolute',
    bottom: -1,
    width: 38,
    height: 3,
    borderRadius: 999,
    backgroundColor: EMERALD,
  },
  timelineContent: {
    backgroundColor: NOIR_DEEP,
    gap: 12,
  },
  timelineCard: {
    backgroundColor: '#12121A',
    borderRadius: 0,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 0,
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timelineUserCopy: {
    flex: 1,
    minWidth: 0,
    paddingLeft: 12,
  },
  timelineName: {
    color: TEXT,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '800',
  },
  timelineHandle: {
    color: '#8E8E9F',
    fontWeight: '400',
  },
  timelineTime: {
    color: '#62627A',
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '400',
    marginTop: 2,
  },
  timelineMore: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineBody: {
    marginTop: 12,
    marginBottom: 16,
    marginLeft: 52,
    color: '#E4E4E9',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
  },
  inlinePlayer: {
    minHeight: 80,
    marginLeft: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2C2C3E',
    backgroundColor: NOIR_BORDER,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  inlinePlayerCopy: { flex: 1, minWidth: 0, gap: 4 },
  inlineTrackTitle: { color: TEXT, fontSize: 14, lineHeight: 18, fontWeight: '700' },
  inlineCreatorName: { color: '#8E8E9F', fontSize: 12, lineHeight: 15, fontWeight: '400' },
  inlinePlayRing: { width: 36, height: 36, borderRadius: 18, backgroundColor: TEXT, alignItems: 'center', justifyContent: 'center' },
  inlineProgress: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  inlineTime: { color: '#8E8E9F', fontSize: 10, fontWeight: '700' },
  inlineProgressTrack: { flex: 1, height: 3, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.2)' },
  inlineProgressFill: { width: '28%', height: 3, borderRadius: 3, backgroundColor: EMERALD },
  inlineEventWidget: {
    marginLeft: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,255,136,0.28)',
    backgroundColor: 'rgba(0,255,136,0.08)',
    padding: 12,
    gap: 4,
  },
  inlineEventKicker: { color: EMERALD, fontSize: 11, fontWeight: '900' },
  inlineEventTitle: { color: TEXT, fontSize: 14, fontWeight: '800' },
  timelineFooter: {
    marginTop: 14,
    marginLeft: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  skeletonAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1F1F2E' },
  skeletonTextStack: { flex: 1, gap: 8, paddingLeft: 12 },
  skeletonLineWide: { width: '60%', height: 12, borderRadius: 6, backgroundColor: '#1F1F2E' },
  skeletonLineShort: { width: '28%', height: 10, borderRadius: 5, backgroundColor: '#1F1F2E' },
  skeletonBody: { marginLeft: 52, marginTop: 16, height: 48, borderRadius: 8, backgroundColor: '#1F1F2E' },
  stageShell: { flex: 1, backgroundColor: NOIR_DEEP },
  stageFilterOverlay: {
    position: 'absolute',
    top: 52,
    left: 12,
    right: 0,
    zIndex: 40,
  },
  stageEmptyWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: 150,
    zIndex: 20,
  },
  stagePane: { width: '100%', backgroundColor: NOIR_DEEP, overflow: 'hidden' },
  stagePaneImage: { position: 'absolute', width: '100%', height: '100%' },
  stageTopBrand: {
    position: 'absolute',
    top: 58,
    left: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(8,8,12,0.42)',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  stageTopText: { color: TEXT, fontSize: 12, fontWeight: '900' },
  stageControlChain: {
    position: 'absolute',
    right: 16,
    top: '35%',
    width: 50,
    alignItems: 'center',
    gap: 20,
  },
  creatorPortal: { width: 54, height: 60, alignItems: 'center', justifyContent: 'flex-start' },
  creatorPortalRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: VIOLET,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8,8,12,0.5)',
  },
  followBubble: {
    position: 'absolute',
    bottom: 1,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: EMERALD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageControl: { alignItems: 'center', gap: 4 },
  stageControlLabel: { color: TEXT, fontSize: 12, lineHeight: 14, fontWeight: '700' },
  cartBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: EMERALD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageBottomStack: {
    position: 'absolute',
    left: 16,
    right: 80,
    bottom: 100,
    gap: 8,
  },
  verifiedNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stageArtistName: { color: TEXT, fontSize: 18, lineHeight: 23, fontWeight: '900' },
  stageDescription: { color: '#E4E4E9', fontSize: 14, lineHeight: 20, fontWeight: '400' },
  stageBottomActions: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 },
  stagePlayCta: { height: 42, borderRadius: 999, backgroundColor: EMERALD, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 16 },
  stagePlayText: { color: NOIR_DEEP, fontSize: 14, fontWeight: '900' },
  stageBackstageCta: { height: 42, borderRadius: 999, borderWidth: 1, borderColor: VIOLET, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, backgroundColor: 'rgba(124,58,237,0.16)' },
  stageBackstageText: { color: TEXT, fontSize: 13, fontWeight: '900' },
  waveform: {
    height: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
  },
  waveBar: {
    width: 3,
    borderRadius: 2,
  },
  passHero: { borderWidth: 1, borderColor: NOIR_BORDER, borderRadius: 18, backgroundColor: NOIR_CARD, overflow: 'hidden', padding: 16, gap: 12 },
  passTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  passKicker: { color: EMERALD, fontSize: 11, fontWeight: '900' },
  passLivePill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, backgroundColor: 'rgba(124,58,237,0.18)', paddingHorizontal: 9, paddingVertical: 5 },
  livePulse: { width: 8, height: 8, borderRadius: 4, backgroundColor: EMERALD },
  passLiveText: { color: TEXT, fontSize: 11, fontWeight: '800' },
  passTitle: { color: TEXT, fontSize: 25, lineHeight: 29, fontWeight: '900' },
  passBody: { color: '#E4E4E9', fontSize: 14, lineHeight: 20, fontWeight: '500' },
  passStats: { flexDirection: 'row', gap: 8 },
  passStat: { flex: 1, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)', padding: 10 },
  passStatValue: { color: TEXT, fontSize: 17, fontWeight: '900' },
  passStatLabel: { color: '#8E8E9F', fontSize: 11, fontWeight: '700', marginTop: 2 },
  frontRowAvatar: { position: 'absolute', top: 12, right: 12, alignItems: 'center', gap: 5 },
  liveRing: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: VIOLET, alignItems: 'center', justifyContent: 'center' },
  frontRowText: { color: TEXT, fontSize: 10, fontWeight: '800' },
  stageHook: { color: EMERALD, fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  lowStockPill: { position: 'absolute', right: 10, top: 10, borderRadius: 999, backgroundColor: 'rgba(0,255,136,0.15)', borderWidth: 1, borderColor: 'rgba(0,255,136,0.4)', paddingHorizontal: 8, paddingVertical: 4 },
  lowStockText: { color: EMERALD, fontSize: 10, fontWeight: '900' },
  scrollContent: { paddingHorizontal: 14, gap: 12 },
  pageHeader: { gap: 5, paddingBottom: 0 },
  pageTitle: { color: '#FFFFFF', fontSize: 28, lineHeight: 31, fontWeight: '900' },
  pageSubtitle: { color: '#B3B3B3', fontSize: 13, lineHeight: 18, fontWeight: '600' },
  loadingBlock: { minHeight: 120, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { color: '#B3B3B3', fontSize: 13, fontWeight: '700' },
  emptyCard: { borderWidth: 1, borderColor: '#262626', backgroundColor: '#151515', borderRadius: 14, padding: 16, gap: 8 },
  emptyIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#20130D', alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: '#FFFFFF', fontSize: 18, lineHeight: 23, fontWeight: '800' },
  emptyBody: { color: '#B3B3B3', fontSize: 13, lineHeight: 19, fontWeight: '600' },
  filterRow: { gap: 8, paddingRight: 14 },
  filterPill: { minHeight: 34, borderRadius: 999, borderWidth: 1, borderColor: '#262626', backgroundColor: '#151515', paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  filterPillActive: { borderColor: ORANGE, backgroundColor: '#21130E' },
  filterText: { color: '#B3B3B3', fontSize: 13, fontWeight: '800' },
  filterTextActive: { color: ORANGE },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 3 },
  sectionTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
  sectionAction: { color: ORANGE, fontSize: 13, fontWeight: '800' },
  railBlock: { gap: 9 },
  railContent: { gap: 11, paddingRight: 18 },
  artwork: { backgroundColor: '#20130D', borderWidth: 1, borderColor: '#262626', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  artworkInitials: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  fill: { width: '100%', height: '100%' },
  cardTitle: { color: '#FFFFFF', fontSize: 16, lineHeight: 20, fontWeight: '800' },
  cardMeta: { color: '#B3B3B3', fontSize: 12.5, lineHeight: 17, fontWeight: '600' },
  cardSubtle: { color: '#737373', fontSize: 12, fontWeight: '700' },
  tileTitle: { color: '#FFFFFF', fontSize: 14.5, lineHeight: 18, fontWeight: '900' },
  tileMeta: { color: '#A8A8A8', fontSize: 12, lineHeight: 16, fontWeight: '700' },
  embedCard: { borderWidth: 1, borderColor: '#262626', backgroundColor: '#151515', borderRadius: 14, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  embedCopy: { flex: 1, minWidth: 0, gap: 3 },
  roundAction: { width: 40, height: 40, borderRadius: 20, backgroundColor: EMERALD, alignItems: 'center', justifyContent: 'center' },
  disabledAction: { opacity: 0.42 },
  ghostRoundAction: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: '#3F2417', alignItems: 'center', justifyContent: 'center' },
  postCard: { borderWidth: 1, borderColor: '#262626', backgroundColor: '#151515', borderRadius: 16, padding: 13, gap: 12 },
  postHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  postAuthor: { flex: 1, minWidth: 0 },
  postName: { color: '#FFFFFF', fontSize: 14.5, fontWeight: '800' },
  postHandle: { color: '#737373', fontSize: 12, fontWeight: '700', marginTop: 2 },
  postBody: { color: '#FFFFFF', fontSize: 15, lineHeight: 21, fontWeight: '600' },
  socialActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 2 },
  socialAction: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  socialLabel: { color: '#B3B3B3', fontSize: 11.5, fontWeight: '700' },
  eventCard: { borderWidth: 1, borderColor: '#262626', backgroundColor: '#151515', borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  eventCardCompact: { padding: 10 },
  eventCopy: { flex: 1, minWidth: 0, gap: 4 },
  eventBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#20130D', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  eventBadgeText: { color: EMERALD, fontSize: 10.5, fontWeight: '900', textTransform: 'uppercase' },
  eventTile: { width: 214, borderWidth: 1, borderColor: '#262626', backgroundColor: '#151515', borderRadius: 18, overflow: 'hidden' },
  eventTileImage: { height: 122, backgroundColor: '#101010', justifyContent: 'flex-end' },
  eventTileBadge: { position: 'absolute', top: 10, left: 10, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(8,8,8,0.72)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  eventTileBadgeText: { color: '#FFFFFF', fontSize: 10.5, fontWeight: '900', textTransform: 'uppercase' },
  eventTileCopy: { padding: 11, gap: 4 },
  releaseTile: { width: 150, gap: 8 },
  releaseTileArt: { width: 150, height: 150, borderRadius: 18, borderWidth: 1, borderColor: '#262626', backgroundColor: '#101010', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  tilePlay: { position: 'absolute', right: 10, bottom: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: EMERALD, alignItems: 'center', justifyContent: 'center' },
  stageCard: { borderRadius: 20, borderWidth: 1, borderColor: '#262626', backgroundColor: '#151515', overflow: 'hidden' },
  stageVisual: { backgroundColor: '#101010', justifyContent: 'flex-end' },
  stageTag: { position: 'absolute', top: 12, left: 12, borderRadius: 999, backgroundColor: 'rgba(8,8,8,0.72)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 9, paddingVertical: 5 },
  stageTagText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  stageText: { padding: 14, gap: 4 },
  stageTitle: { color: '#FFFFFF', fontSize: 25, lineHeight: 29, fontWeight: '900' },
  stageCreator: { color: '#DADADA', fontSize: 15, fontWeight: '700' },
  stageActions: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10 },
  primaryAction: { height: 42, borderRadius: 12, backgroundColor: EMERALD, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 15 },
  primaryActionText: { color: NOIR_DEEP, fontSize: 14, fontWeight: '900' },
  secondaryAction: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#202020', alignItems: 'center', justifyContent: 'center' },
  backstageButton: { flex: 1, height: 42, borderRadius: 12, borderWidth: 1, borderColor: '#3F2417', alignItems: 'center', justifyContent: 'center' },
  backstageButtonText: { color: ORANGE, fontSize: 13, fontWeight: '900' },
  stageEventLine: { borderTopWidth: 1, borderTopColor: '#262626', paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  stageEventText: { color: '#B3B3B3', fontSize: 12.5, fontWeight: '700', flex: 1 },
  stageTile: { width: 206, borderWidth: 1, borderColor: '#262626', borderRadius: 18, backgroundColor: '#151515', overflow: 'hidden' },
  stageTileVisual: { height: 220, backgroundColor: '#101010' },
  stageTileKind: { position: 'absolute', top: 10, left: 10, borderRadius: 999, backgroundColor: 'rgba(8,8,8,0.72)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 8, paddingVertical: 4 },
  stageTileKindText: { color: '#FFFFFF', fontSize: 10.5, fontWeight: '900', textTransform: 'uppercase' },
  stageTileCopy: { padding: 11, gap: 4 },
  liveCard: { borderWidth: 1, borderColor: '#262626', backgroundColor: '#151515', borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  liveCopy: { flex: 1, minWidth: 0, gap: 4 },
  liveBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#202020', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  liveBadgeOn: { backgroundColor: '#2A120B' },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#737373' },
  liveDotOn: { backgroundColor: EMERALD },
  liveBadgeText: { color: '#B3B3B3', fontSize: 10.5, fontWeight: '900', textTransform: 'uppercase' },
  liveBadgeTextOn: { color: ORANGE },
  liveTile: { width: 218, borderWidth: 1, borderColor: '#262626', backgroundColor: '#151515', borderRadius: 18, overflow: 'hidden' },
  liveTileImage: { height: 150, backgroundColor: '#101010', padding: 10, justifyContent: 'flex-start', alignItems: 'flex-start' },
  joinButton: { minWidth: 58, minHeight: 36, borderRadius: 999, backgroundColor: '#20130D', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  joinText: { color: EMERALD, fontSize: 12.5, fontWeight: '900' },
  communityCard: { borderWidth: 1, borderColor: '#262626', backgroundColor: '#151515', borderRadius: 16, overflow: 'hidden' },
  communityBanner: { height: 86, backgroundColor: '#101010' },
  communityBody: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  communityCopy: { flex: 1, minWidth: 0, gap: 3 },
  verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  communityTile: { width: 228, borderRadius: 18, borderWidth: 1, borderColor: '#262626', backgroundColor: '#151515', overflow: 'hidden' },
  communityTileImage: { height: 104, backgroundColor: '#101010' },
  communityTileBody: { flexDirection: 'row', alignItems: 'center', gap: 9, padding: 11 },
  threadCard: { borderWidth: 1, borderColor: '#262626', backgroundColor: '#151515', borderRadius: 15, padding: 13, gap: 7 },
  threadTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  threadTag: { color: ORANGE, fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  threadFlags: { flexDirection: 'row', gap: 6 },
  threadTitle: { color: '#FFFFFF', fontSize: 17, lineHeight: 22, fontWeight: '900' },
  threadBody: { color: '#B3B3B3', fontSize: 13, lineHeight: 18, fontWeight: '600' },
  threadStats: { flexDirection: 'row', gap: 14 },
  searchBox: { height: 48, borderRadius: 14, borderWidth: 1, borderColor: '#262626', backgroundColor: '#151515', flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 13 },
  searchInput: { color: '#FFFFFF', flex: 1, fontSize: 15, fontWeight: '700' },
  creatorTile: { width: 118, borderWidth: 1, borderColor: '#262626', backgroundColor: '#151515', borderRadius: 18, padding: 12, gap: 8, alignItems: 'center' },
  resultRow: { borderWidth: 1, borderColor: '#262626', backgroundColor: '#151515', borderRadius: 14, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  resultCopy: { flex: 1, minWidth: 0 },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  creatorAction: { width: '48%', minHeight: 94, borderRadius: 15, borderWidth: 1, borderColor: '#262626', backgroundColor: '#151515', padding: 13, justifyContent: 'space-between' },
  creatorActionText: { color: '#FFFFFF', fontSize: 14, lineHeight: 18, fontWeight: '800' },
  pulseCard: { borderWidth: 1, borderColor: '#262626', backgroundColor: '#151515', borderRadius: 15, overflow: 'hidden' },
  pulseRow: { minHeight: 48, borderTopWidth: 1, borderTopColor: '#202020', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 13 },
  pulseLabel: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  pulseValue: { color: ORANGE, fontSize: 12.5, fontWeight: '900' },
  createHero: { borderWidth: 1, borderColor: NOIR_BORDER, backgroundColor: NOIR_CARD, borderRadius: 18, padding: 16, gap: 10 },
  createAction: { width: '48%', minHeight: 116, borderRadius: 16, borderWidth: 1, borderColor: NOIR_BORDER, backgroundColor: '#12121A', padding: 13, justifyContent: 'space-between' },
  createActionMeta: { color: '#8E8E9F', fontSize: 12, lineHeight: 16, fontWeight: '600' },
  profilePass: { borderWidth: 1, borderColor: 'rgba(124,58,237,0.42)', backgroundColor: 'rgba(124,58,237,0.12)', borderRadius: 18, padding: 16, gap: 10 },
  profileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  profileTile: { width: '48%', minHeight: 92, borderWidth: 1, borderColor: NOIR_BORDER, backgroundColor: '#12121A', borderRadius: 16, padding: 13, justifyContent: 'space-between' },
  profileTileText: { color: TEXT, fontSize: 14, fontWeight: '800' },
});
