/**
 * Discover — direct mobile port of the web /discover page:
 * serif "Find what's moving." hero, category chips, realtime ticker,
 * "What's moving now" paper card, For You grid, Live Now, Trending
 * Scenes, New From Creators, Soundboards Worth Opening, Near You,
 * Creators to Watch, Community Pulse, and the closing explore CTA.
 */
import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PluggdImage } from '../../components/PluggdImage';
import { PremiumSkeleton } from '../../components/PremiumSkeleton';
import { LiveTicker } from '../../../components/LiveTicker';
import { ed, edFonts } from '../../design/editorial';
import {
  EdPressable,
  AudioPill,
  GhostButton,
  InkChip,
  OrangeButton,
  Pushpin,
  SerifTitle,
  StickyNote,
  TornEdge,
} from './EditorialBits';
import { usePlayback } from '../../context/PlaybackProvider';
import { loadSoundboardItemDetails } from '../culture/mobileServices';
import { useHomeFeed, useLiveRooms, type LiveRoomItem } from '../culture/useCultureData';
import {
  formatCompact,
  toTrack,
  type BeatItem,
  type FeedBundle,
  type MixItem,
  type ProfileItem,
  type ReleaseItem,
  type SoundboardItem,
} from '../../lib/mobileContent';

const CATEGORY_CHIPS: Array<{ label: string; route?: string }> = [
  { label: 'All' },
  { label: 'Music', route: '/releases' },
  { label: 'BeatPlug', route: '/market/beats' },
  { label: 'Mixes', route: '/mixes' },
  { label: 'Creators', route: '/search' },
  { label: 'Soundboards', route: '/soundboards' },
  { label: 'Trending', route: '/hashtag/pluggd' },
  { label: 'New', route: '/releases' },
];

type SectionHead = {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  subtitle: string;
};

function daysAgoLabel(value?: string | null) {
  if (!value) return null;
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return null;
  const days = Math.max(0, Math.floor((Date.now() - time) / 86400000));
  if (days === 0) return 'today';
  return `${days}d ago`;
}

function EditorialSectionHead({ icon, title, subtitle }: SectionHead) {
  return (
    <View style={{ gap: 8 }}>
      <View style={styles.sectionHeadRow}>
        <MaterialIcons name={icon} size={20} color={ed.orange} />
        <Text style={styles.sectionHeadTitle}>{title}</Text>
      </View>
      <Text style={styles.sectionHeadSub}>{subtitle.toUpperCase()}</Text>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* What's moving now (paper card)                                      */
/* ------------------------------------------------------------------ */

type MovingNow = {
  headline: string;
  signals: number;
  route: string;
  imageUrl?: string | null;
  chips: string[];
};

function buildMovingNow(bundle?: FeedBundle): MovingNow | null {
  if (!bundle) return null;
  const genreCounts = new Map<string, number>();
  [...bundle.releases, ...bundle.beats].forEach((item) => {
    const genre = (item as ReleaseItem).genre;
    if (!genre) return;
    genreCounts.set(genre, (genreCounts.get(genre) || 0) + 1);
  });
  const top = Array.from(genreCounts.entries()).sort((a, b) => b[1] - a[1])[0];
  const totalSignals =
    bundle.releases.length + bundle.beats.length + bundle.mixes.length + bundle.soundboards.length;
  if (top) {
    const [genre, count] = top;
    return {
      headline: `${genre} Circuit is moving differently this week.`,
      signals: Math.max(count, totalSignals ? Math.min(totalSignals, count + bundle.mixes.length) : count),
      route: `/genre/${encodeURIComponent(genre)}`,
      imageUrl: bundle.releases.find((release) => release.genre === genre)?.cover_art_url || bundle.releases[0]?.cover_art_url,
      chips: [
        `${formatCompact(bundle.releases.length + bundle.beats.length)} new drops`,
        `${formatCompact(Math.max(1, bundle.profiles.length))} producer circles`,
      ],
    };
  }
  const release = bundle.releases[0];
  if (release) {
    return {
      headline: `Release moving now: ${release.title || 'Untitled'}`,
      signals: totalSignals,
      route: `/release/${release.id}`,
      imageUrl: release.cover_art_url,
      chips: [`${formatCompact(bundle.releases.length)} new drops`],
    };
  }
  return null;
}

function WhatsMovingNowCard({ moving }: { moving: MovingNow | null }) {
  const router = useRouter();
  if (!moving) return null;
  return (
    <View style={styles.movingCard}>
      <Text style={styles.movingKicker}>What's moving now</Text>
      <Text style={styles.movingHeadline}>{moving.headline}</Text>
      <Text style={styles.movingSignals}>
        {moving.signals} real signal{moving.signals === 1 ? '' : 's'} moving across this scene.
      </Text>
      <GhostButton label="Enter Scene" onPaper onPress={() => router.push(moving.route as any)} />
      <View style={styles.movingMedia}>
        {moving.imageUrl ? (
          <PluggdImage uri={moving.imageUrl} style={StyleSheet.absoluteFillObject as any} />
        ) : null}
        <LinearGradient colors={['rgba(7,6,5,0.10)', 'rgba(7,6,5,0.72)']} style={StyleSheet.absoluteFillObject} />
        <View style={styles.movingChipRow}>
          {moving.chips.map((chip) => (
            <View key={chip} style={styles.movingChip}>
              <Text style={styles.movingChipText}>{chip}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* For You grid                                                        */
/* ------------------------------------------------------------------ */

type ForYouCard = {
  id: string;
  kind: string;
  title: string;
  subtitle: string;
  imageUrl?: string | null;
  route: string;
  chips: string[];
};

function buildForYou(bundle?: FeedBundle): ForYouCard[] {
  if (!bundle) return [];
  const mixes = bundle.mixes.slice(0, 2).map<ForYouCard>((mix) => ({
    id: `mix-${mix.id}`,
    kind: 'Mix',
    title: mix.title || 'Untitled mix',
    subtitle: mix.city || 'PLUGGD selector',
    imageUrl: mix.cover_url,
    route: `/mixes/${mix.id}`,
    chips: ['Mix', daysAgoLabel(mix.published_at || mix.created_at) || 'new'],
  }));
  const releases = bundle.releases.slice(0, 2).map<ForYouCard>((release) => ({
    id: `release-${release.id}`,
    kind: 'Featured drop',
    title: release.title || 'Untitled release',
    subtitle: release.artist || 'PLUGGD creator',
    imageUrl: release.cover_art_url,
    route: `/release/${release.id}`,
    chips: ['Release', daysAgoLabel(release.created_at) || 'new'],
  }));
  return [...mixes.slice(0, 1), ...releases.slice(0, 1), ...mixes.slice(1), ...releases.slice(1)].slice(0, 4);
}

function ForYouGrid({ cards }: { cards: ForYouCard[] }) {
  const router = useRouter();
  if (!cards.length) {
    return <Text style={styles.nightEmpty}>No public releases, beats, mixes, or Soundboards are available yet.</Text>;
  }
  return (
    <View style={styles.forYouGrid}>
      {cards.map((card) => (
        <EdPressable
          key={card.id}
          accessibilityRole="button"
          accessibilityLabel={`Open ${card.title}`}
          onPress={() => router.push(card.route as any)}
          style={styles.forYouCard}
        >
          <View style={styles.forYouImageWrap}>
            {card.imageUrl ? (
              <PluggdImage uri={card.imageUrl} style={styles.forYouImage} />
            ) : (
              <View style={[styles.forYouImage, { backgroundColor: '#191410' }]} />
            )}
            <View style={styles.forYouKindPill}>
              <Text style={styles.forYouKindText}>{card.kind.toUpperCase()}</Text>
            </View>
          </View>
          <Text style={styles.forYouTitle} numberOfLines={2}>{card.title}</Text>
          <Text style={styles.forYouSubtitle} numberOfLines={1}>{card.subtitle}</Text>
          <View style={styles.chipRow}>
            {card.chips.filter(Boolean).map((chip) => (
              <View key={chip} style={styles.greyChip}>
                <Text style={styles.greyChipText}>{chip}</Text>
              </View>
            ))}
          </View>
        </EdPressable>
      ))}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Live Now                                                            */
/* ------------------------------------------------------------------ */

function LiveNowSection({ rooms, hasEvents }: { rooms: LiveRoomItem[]; hasEvents: boolean }) {
  const router = useRouter();
  const liveRooms = rooms.filter((room) => room.status === 'live');
  if (liveRooms.length) {
    return (
      <View style={{ gap: 12 }}>
        {liveRooms.slice(0, 3).map((room) => (
          <EdPressable
            key={room.id}
            accessibilityRole="button"
            accessibilityLabel={`Join ${room.title || 'live room'}`}
            onPress={() => router.push({ pathname: '/live/session', params: { roomId: room.id } } as any)}
            style={styles.liveRoomCard}
          >
            {room.thumbnail_url ? (
              <PluggdImage uri={room.thumbnail_url} style={StyleSheet.absoluteFillObject as any} />
            ) : null}
            <LinearGradient colors={['rgba(7,6,5,0.15)', 'rgba(7,6,5,0.9)']} style={StyleSheet.absoluteFillObject} />
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveBadgeText}>LIVE</Text>
            </View>
            <Text style={styles.liveRoomTitle} numberOfLines={2}>{room.title || 'Live room'}</Text>
          </EdPressable>
        ))}
      </View>
    );
  }
  return (
    <View style={styles.nightPanel}>
      <Text style={styles.nightPanelTitle}>No live rooms open right now.</Text>
      <Text style={styles.nightPanelBody}>
        {hasEvents
          ? 'Upcoming public events are still moving. Jump into one while the next room opens.'
          : 'No public rooms are scheduled yet, but events and room creation are ready.'}
      </Text>
      <View style={styles.buttonRow}>
        <OrangeButton label="View Events" onPress={() => router.push('/events' as any)} />
        <GhostButton label="Start a Room" onPress={() => router.push('/live/create' as any)} />
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Trending Scenes                                                     */
/* ------------------------------------------------------------------ */

type TrendingScene = {
  id: string;
  eyebrow: string;
  title: string;
  signals: number;
  imageUrl?: string | null;
  route: string;
  freshness?: string | null;
};

function buildTrendingScenes(bundle?: FeedBundle): TrendingScene[] {
  if (!bundle) return [];
  const scenes = new Map<string, TrendingScene>();
  bundle.releases.forEach((release) => {
    if (!release.genre) return;
    const key = `genre-${release.genre.toLowerCase()}`;
    const existing = scenes.get(key);
    scenes.set(key, {
      id: key,
      eyebrow: 'release activity',
      title: `${release.genre} Circuit`,
      signals: (existing?.signals || 0) + 1,
      imageUrl: existing?.imageUrl || release.cover_art_url,
      route: `/genre/${encodeURIComponent(release.genre)}`,
      freshness: existing?.freshness || daysAgoLabel(release.created_at),
    });
  });
  bundle.beats.forEach((beat) => {
    if (!beat.genre) return;
    const key = `beats-${beat.genre.toLowerCase()}`;
    if (scenes.has(`genre-${beat.genre.toLowerCase()}`)) {
      const genreKey = `genre-${beat.genre.toLowerCase()}`;
      const existing = scenes.get(genreKey)!;
      scenes.set(genreKey, { ...existing, signals: existing.signals + 1 });
      return;
    }
    const existing = scenes.get(key);
    scenes.set(key, {
      id: key,
      eyebrow: 'beat makers',
      title: `${beat.genre} Producers`,
      signals: (existing?.signals || 0) + 1,
      imageUrl: existing?.imageUrl || beat.image_url,
      route: '/market/beats',
      freshness: existing?.freshness || daysAgoLabel(beat.created_at),
    });
  });
  return Array.from(scenes.values())
    .sort((a, b) => b.signals - a.signals)
    .slice(0, 4);
}

function TrendingScenes({ scenes }: { scenes: TrendingScene[] }) {
  const router = useRouter();
  if (!scenes.length) {
    return <Text style={styles.nightEmpty}>No scene signals are available yet.</Text>;
  }
  return (
    <View style={{ gap: 14 }}>
      {scenes.map((scene) => (
        <EdPressable
          key={scene.id}
          accessibilityRole="button"
          accessibilityLabel={`Open ${scene.title}`}
          onPress={() => router.push(scene.route as any)}
          style={styles.sceneCard}
        >
          {scene.imageUrl ? (
            <PluggdImage uri={scene.imageUrl} style={StyleSheet.absoluteFillObject as any} />
          ) : null}
          <LinearGradient colors={['rgba(7,6,5,0.16)', 'rgba(7,6,5,0.62)', 'rgba(7,6,5,0.94)']} style={StyleSheet.absoluteFillObject} />
          <View style={styles.sceneBody}>
            <Text style={styles.sceneEyebrow}>{scene.eyebrow.toUpperCase()}</Text>
            <Text style={styles.sceneTitle}>{scene.title}</Text>
            <Text style={styles.sceneSignals}>
              {scene.signals} real signal{scene.signals === 1 ? '' : 's'} moving across this scene.
            </Text>
            <View style={styles.sceneFootRow}>
              <Text style={styles.sceneCount}>{scene.signals}</Text>
              {scene.freshness ? <Text style={styles.sceneFreshness}>{scene.freshness}</Text> : null}
            </View>
          </View>
        </EdPressable>
      ))}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* New From Creators                                                   */
/* ------------------------------------------------------------------ */

type CreatorUpdate = {
  id: string;
  kind: string;
  title: string;
  subtitle: string;
  imageUrl?: string | null;
  route: string;
  chips: string[];
  createdAt?: string | null;
  playable?: ReturnType<typeof toTrack>;
};

function buildCreatorUpdates(bundle?: FeedBundle): CreatorUpdate[] {
  if (!bundle) return [];
  const updates: CreatorUpdate[] = [];
  bundle.soundboards.slice(0, 3).forEach((board: SoundboardItem) => {
    updates.push({
      id: `board-${board.id}`,
      kind: 'Soundboard',
      title: board.title || 'Untitled board',
      subtitle: `${formatCompact(board.item_count)} cards${board.like_count ? ` / ${formatCompact(board.like_count)} likes` : ''}`,
      imageUrl: board.cover_image_url,
      route: `/soundboards/${board.slug || board.id}`,
      chips: [daysAgoLabel(board.last_activity_at || board.created_at) || 'new', 'soundboard active'],
      createdAt: board.last_activity_at || board.created_at,
    });
  });
  bundle.mixes.slice(0, 3).forEach((mix: MixItem) => {
    updates.push({
      id: `mix-${mix.id}`,
      kind: 'Mix',
      title: mix.title || 'Untitled mix',
      subtitle: [mix.city, mix.genre_tags?.[0]].filter(Boolean).join(' / ') || 'PLUGGD selector',
      imageUrl: mix.cover_url,
      route: `/mixes/${mix.id}`,
      chips: [daysAgoLabel(mix.published_at || mix.created_at) || 'new', mix.audio_url ? 'playable' : ''],
      createdAt: mix.published_at || mix.created_at,
      playable: toTrack(mix, 'mix'),
    });
  });
  bundle.releases.slice(0, 3).forEach((release: ReleaseItem) => {
    updates.push({
      id: `release-${release.id}`,
      kind: 'Release',
      title: release.title || 'Untitled release',
      subtitle: [release.artist, release.genre].filter(Boolean).join(' / ') || 'PLUGGD creator',
      imageUrl: release.cover_art_url,
      route: `/release/${release.id}`,
      chips: [daysAgoLabel(release.created_at) || 'new', 'playable'],
      createdAt: release.created_at,
      playable: toTrack(release, 'release'),
    });
  });
  bundle.beats.slice(0, 2).forEach((beat: BeatItem) => {
    updates.push({
      id: `beat-${beat.id}`,
      kind: 'Beat',
      title: beat.title || 'Untitled beat',
      subtitle: [beat.producer_name, beat.bpm ? `${beat.bpm} BPM` : null].filter(Boolean).join(' / ') || 'Producer',
      imageUrl: beat.image_url,
      route: `/beat/${beat.id}`,
      chips: [daysAgoLabel(beat.created_at) || 'new', 'playable'],
      createdAt: beat.created_at,
      playable: toTrack(beat, 'beat'),
    });
  });
  return updates
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, 7);
}

function NewFromCreators({ updates }: { updates: CreatorUpdate[] }) {
  const router = useRouter();
  const playback = usePlayback();
  if (!updates.length) {
    return <Text style={styles.nightEmpty}>No recent public creator updates yet.</Text>;
  }
  return (
    <View style={{ gap: 12 }}>
      {updates.map((update) => (
        <View key={update.id} style={styles.updateRow}>
          <EdPressable
            accessibilityRole="button"
            accessibilityLabel={`Open ${update.title}`}
            onPress={() => router.push(update.route as any)}
            style={styles.updateRowMain}
          >
            <View style={styles.updateThumbWrap}>
              {update.imageUrl ? (
                <PluggdImage uri={update.imageUrl} style={styles.updateThumb} />
              ) : (
                <View style={[styles.updateThumb, { backgroundColor: '#1d1712' }]} />
              )}
            </View>
            <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
              <Text style={styles.updateKind}>{update.kind.toUpperCase()}</Text>
              <Text style={styles.updateTitle} numberOfLines={1}>{update.title}</Text>
              <Text style={styles.updateSubtitle} numberOfLines={1}>{update.subtitle}</Text>
              <View style={styles.chipRow}>
                {update.chips.filter(Boolean).map((chip) => (
                  <View key={chip} style={styles.outlineChip}>
                    <Text style={styles.outlineChipText}>{chip}</Text>
                  </View>
                ))}
              </View>
            </View>
          </EdPressable>
          <EdPressable
            accessibilityRole="button"
            accessibilityLabel={update.playable ? `Play ${update.title}` : `Open ${update.title}`}
            onPress={() => {
              if (update.playable) {
                void playback.playTrack(update.playable);
                return;
              }
              router.push(update.route as any);
            }}
            style={styles.updatePlay}
          >
            <MaterialIcons name={update.playable ? 'play-arrow' : 'arrow-forward'} size={22} color={ed.ink} />
          </EdPressable>
        </View>
      ))}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Soundboards Worth Opening (cream)                                   */
/* ------------------------------------------------------------------ */

type BoardDetailBundle = Awaited<ReturnType<typeof loadSoundboardItemDetails>>;

function SoundboardPanel({
  board,
  detail,
  creatorName,
}: {
  board: SoundboardItem;
  detail?: BoardDetailBundle;
  creatorName?: string | null;
}) {
  const router = useRouter();
  const playback = usePlayback();
  const items = detail?.items ?? [];
  const audioItem = items.find((item) => item.item_type === 'audio' && item.media_url);
  const imageItem = items.find((item) => item.item_type === 'image' && item.media_url);
  const noteItem = items.find((item) => item.item_type === 'note');
  const latestComment = detail?.boardComments?.[0];
  const route = `/soundboards/${board.slug || board.id}`;
  const audioTrack = audioItem ? toTrack(audioItem as any, 'soundboard') : null;
  const audioPlaying = Boolean(audioTrack && playback.currentTrack?.id === audioTrack.id && playback.isPlaying);

  return (
    <View style={styles.boardPanel}>
      <View style={styles.boardHeadRow}>
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <Text style={styles.boardEyebrow}>SOUNDBOARD</Text>
          <Text style={styles.boardTitle} numberOfLines={2}>{board.title || 'Untitled board'}</Text>
          {creatorName ? <Text style={styles.boardCreator}>{creatorName}</Text> : null}
        </View>
        <EdPressable
          accessibilityRole="button"
          accessibilityLabel={`Open ${board.title || 'soundboard'}`}
          onPress={() => router.push(route as any)}
        >
          <View style={styles.boardOpenPill}>
            <Text style={styles.boardOpenText}>Open Soundboard</Text>
          </View>
        </EdPressable>
      </View>
      <View style={styles.chipRow}>
        <InkChip text={`${formatCompact(board.item_count)} cards`} />
        {board.like_count ? <InkChip text={`${formatCompact(board.like_count)} likes`} /> : null}
        <InkChip text={`updated ${daysAgoLabel(board.last_activity_at || board.created_at) || 'recently'}`} />
      </View>
      <View style={styles.boardCork}>
        {audioItem ? (
          <View>
            <Pushpin style={styles.pinCentered} />
            <View style={styles.boardAudioCard}>
              <EdPressable
                accessibilityRole="button"
                accessibilityLabel={audioPlaying ? 'Pause audio preview' : 'Play audio preview'}
                onPress={() => {
                  if (audioTrack) void playback.playTrack(audioTrack);
                }}
              >
                <View style={styles.boardAudioPlay}>
                  <MaterialIcons name={audioPlaying ? 'pause' : 'play-arrow'} size={22} color="#ffffff" />
                </View>
              </EdPressable>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.boardAudioTitle} numberOfLines={1}>{audioItem.title || 'Audio sketch'}</Text>
                <Text style={styles.boardAudioMeta}>Audio</Text>
                <View style={styles.boardWaveRow}>
                  {Array.from({ length: 26 }).map((_, index) => (
                    <View
                      key={index}
                      style={[
                        styles.boardWaveBar,
                        { height: 6 + Math.abs(Math.sin((index + 2) * 1.4)) * 18 },
                      ]}
                    />
                  ))}
                </View>
                {audioItem.likes_count ? (
                  <View style={[styles.paperChip, { alignSelf: 'flex-start', marginTop: 6 }]}>
                    <Text style={styles.paperChipText}>{formatCompact(audioItem.likes_count)} likes</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>
        ) : null}
        <View style={styles.boardItemsRow}>
          {imageItem?.media_url ? (
            <View style={styles.boardPolaroid}>
              <PluggdImage uri={imageItem.media_url} style={styles.boardPolaroidImage} />
              <Text style={styles.boardPolaroidCaption} numberOfLines={1}>
                {imageItem.title || board.title || 'Board image'}
              </Text>
              {imageItem.likes_count ? (
                <View style={[styles.paperChip, { alignSelf: 'flex-start', marginTop: 4 }]}>
                  <Text style={styles.paperChipText}>{formatCompact(imageItem.likes_count)} likes</Text>
                </View>
              ) : null}
            </View>
          ) : null}
          {noteItem ? (
            <StickyNote
              title={noteItem.title || 'Note'}
              body={noteItem.content_text}
              rotate="1.8deg"
              style={{ flex: 1, maxWidth: 170 }}
            />
          ) : null}
        </View>
        {latestComment?.content ? (
          <View style={styles.boardCommentRow}>
            <MaterialIcons name="chat-bubble-outline" size={14} color={ed.cream} />
            <Text style={styles.boardCommentText} numberOfLines={2}>{latestComment.content}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Near You + Creators to Watch + Community Pulse                      */
/* ------------------------------------------------------------------ */

function NearYouSection({ events }: { events: FeedBundle['events'] }) {
  const router = useRouter();
  if (!events.length) {
    return (
      <View style={styles.nightPanel}>
        <Text style={styles.nightPanelBody}>No upcoming discoverable events are available yet.</Text>
      </View>
    );
  }
  return (
    <View style={{ gap: 10 }}>
      {events.slice(0, 4).map((event) => {
        const starts = event.starts_at ? new Date(event.starts_at) : null;
        return (
          <EdPressable
            key={event.id}
            accessibilityRole="button"
            accessibilityLabel={`View ${event.title || 'event'}`}
            onPress={() => router.push(`/events/${event.id}` as any)}
          >
            <View style={styles.nearRow}>
              <View style={styles.nearDate}>
                <Text style={styles.nearDateDay}>{starts ? starts.getDate().toString().padStart(2, '0') : '--'}</Text>
                <Text style={styles.nearDateMonth}>
                  {starts ? starts.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase() : 'TBA'}
                </Text>
              </View>
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <Text style={styles.nearTitle} numberOfLines={1}>{event.title || 'Underground event'}</Text>
                <Text style={styles.nearMeta} numberOfLines={1}>
                  {(event.location || 'Location TBA').split(',')[0]}
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={ed.creamMuted} />
            </View>
          </EdPressable>
        );
      })}
    </View>
  );
}

type WatchCreator = {
  id: string;
  name: string;
  role: string;
  imageUrl?: string | null;
  route: string;
  droppedLabel?: string | null;
};

function buildCreatorsToWatch(bundle?: FeedBundle): WatchCreator[] {
  if (!bundle) return [];
  const latestByArtist = new Map<string, string | null>();
  bundle.releases.forEach((release) => {
    if (release.artist && !latestByArtist.has(release.artist)) {
      latestByArtist.set(release.artist, release.created_at);
    }
  });
  return bundle.profiles.slice(0, 6).map((profile: ProfileItem) => {
    const name = profile.display_name || profile.full_name || profile.username || 'Creator';
    const dropped = latestByArtist.get(name) || null;
    return {
      id: profile.user_id || profile.id || name,
      name,
      role: profile.profile_type || profile.user_type || 'artist',
      imageUrl: profile.avatar_url,
      route: profile.username ? `/creator/${profile.username}` : profile.user_id ? `/user/${profile.user_id}` : '/search',
      droppedLabel: dropped ? `dropped ${daysAgoLabel(dropped)}` : null,
    };
  });
}

function CreatorsToWatch({ creators }: { creators: WatchCreator[] }) {
  const router = useRouter();
  if (!creators.length) {
    return <Text style={styles.nightEmpty}>No creator spotlights are available yet.</Text>;
  }
  return (
    <View style={{ gap: 10 }}>
      {creators.map((creator) => (
        <EdPressable
          key={creator.id}
          accessibilityRole="button"
          accessibilityLabel={`View ${creator.name}`}
          onPress={() => router.push(creator.route as any)}
        >
          <View style={styles.creatorRow}>
            <View style={styles.creatorAvatarWrap}>
              {creator.imageUrl ? (
                <PluggdImage uri={creator.imageUrl} style={styles.creatorAvatar} />
              ) : (
                <View style={[styles.creatorAvatar, { backgroundColor: '#1d1712', alignItems: 'center', justifyContent: 'center' }]}>
                  <Text style={styles.creatorInitial}>{creator.name.slice(0, 1).toUpperCase()}</Text>
                </View>
              )}
            </View>
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              <Text style={styles.creatorName} numberOfLines={1}>{creator.name}</Text>
              <Text style={styles.creatorRole} numberOfLines={1}>{creator.role}</Text>
              {creator.droppedLabel ? <Text style={styles.creatorDropped}>{creator.droppedLabel}</Text> : null}
            </View>
            <View style={styles.viewPill}>
              <Text style={styles.viewPillText}>View</Text>
            </View>
          </View>
        </EdPressable>
      ))}
    </View>
  );
}

type PulseRowItem = {
  id: string;
  headline: string;
  detail?: string | null;
  imageUrl?: string | null;
  route: string;
  timeLabel?: string | null;
};

function buildCommunityPulse(bundle?: FeedBundle): PulseRowItem[] {
  if (!bundle) return [];
  const rows: PulseRowItem[] = [];
  bundle.beats.slice(0, 2).forEach((beat) => {
    rows.push({
      id: `beat-${beat.id}`,
      headline: `${beat.producer_name || 'A producer'} shared a beat`,
      detail: beat.title,
      imageUrl: beat.image_url,
      route: `/beat/${beat.id}`,
      timeLabel: daysAgoLabel(beat.created_at),
    });
  });
  bundle.releases.slice(0, 2).forEach((release) => {
    rows.push({
      id: `release-${release.id}`,
      headline: `${release.artist || 'A creator'} dropped a release`,
      detail: release.title,
      imageUrl: release.cover_art_url,
      route: `/release/${release.id}`,
      timeLabel: daysAgoLabel(release.created_at),
    });
  });
  bundle.soundboards.slice(0, 2).forEach((board) => {
    rows.push({
      id: `board-${board.id}`,
      headline: `${board.title || 'A board'} updated`,
      detail: `${formatCompact(board.item_count)} cards on this board`,
      imageUrl: board.cover_image_url,
      route: `/soundboards/${board.slug || board.id}`,
      timeLabel: daysAgoLabel(board.last_activity_at || board.created_at),
    });
  });
  bundle.mixes.slice(0, 1).forEach((mix) => {
    rows.push({
      id: `mix-${mix.id}`,
      headline: `${mix.city || 'PLUGGD'} mix in rotation`,
      detail: mix.title,
      imageUrl: mix.cover_url,
      route: `/mixes/${mix.id}`,
      timeLabel: daysAgoLabel(mix.published_at || mix.created_at),
    });
  });
  return rows.slice(0, 6);
}

function CommunityPulse({ rows }: { rows: PulseRowItem[] }) {
  const router = useRouter();
  if (!rows.length) {
    return <Text style={styles.nightEmpty}>No recent public community activity is available yet.</Text>;
  }
  return (
    <View style={{ gap: 10 }}>
      {rows.map((row) => (
        <EdPressable
          key={row.id}
          accessibilityRole="button"
          accessibilityLabel={row.headline}
          onPress={() => router.push(row.route as any)}
        >
          <View style={styles.pulseRow}>
            <View style={styles.pulseThumbWrap}>
              {row.imageUrl ? (
                <PluggdImage uri={row.imageUrl} style={styles.pulseThumb} />
              ) : (
                <View style={[styles.pulseThumb, { backgroundColor: '#1d1712' }]} />
              )}
            </View>
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              <Text style={styles.pulseHeadline} numberOfLines={1}>{row.headline}</Text>
              {row.detail ? <Text style={styles.pulseDetail} numberOfLines={1}>{row.detail}</Text> : null}
            </View>
            {row.timeLabel ? <Text style={styles.pulseTime}>{row.timeLabel}</Text> : null}
          </View>
        </EdPressable>
      ))}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Screen                                                              */
/* ------------------------------------------------------------------ */

export function DiscoverEditorialScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const home = useHomeFeed();
  const live = useLiveRooms();
  const bundle = home.data;

  const boardOne = bundle?.soundboards?.[0];
  const boardTwo = bundle?.soundboards?.[1];
  const boardOneDetail = useQuery({
    queryKey: ['discover', 'board-detail', boardOne?.id],
    queryFn: () => loadSoundboardItemDetails(boardOne!.id),
    enabled: Boolean(boardOne?.id),
    staleTime: 1000 * 60 * 3,
  });
  const boardTwoDetail = useQuery({
    queryKey: ['discover', 'board-detail', boardTwo?.id],
    queryFn: () => loadSoundboardItemDetails(boardTwo!.id),
    enabled: Boolean(boardTwo?.id),
    staleTime: 1000 * 60 * 3,
  });

  const moving = useMemo(() => buildMovingNow(bundle), [bundle]);
  const forYou = useMemo(() => buildForYou(bundle), [bundle]);
  const scenes = useMemo(() => buildTrendingScenes(bundle), [bundle]);
  const updates = useMemo(() => buildCreatorUpdates(bundle), [bundle]);
  const watchCreators = useMemo(() => buildCreatorsToWatch(bundle), [bundle]);
  const pulseRows = useMemo(() => buildCommunityPulse(bundle), [bundle]);

  const creatorNameFor = (creatorId?: string | null) => {
    if (!creatorId) return null;
    const profile = (bundle?.profiles ?? []).find(
      (candidate) => candidate.user_id === creatorId || candidate.id === creatorId,
    );
    return profile ? profile.display_name || profile.full_name || profile.username || null : null;
  };

  const tickerItems = useMemo(() => {
    const items: string[] = [];
    (live.data ?? []).filter((room) => room.status === 'live').slice(0, 2).forEach((room) => items.push(`Live now: ${room.title}`));
    (bundle?.releases ?? []).slice(0, 3).forEach((release) => items.push(`${release.artist || 'A creator'} dropped ${release.title}`));
    (bundle?.soundboards ?? []).slice(0, 2).forEach((board) => items.push(`Open soundboard: ${board.title}`));
    (bundle?.mixes ?? []).slice(0, 2).forEach((mix) => items.push(`Featured mix: ${mix.title}`));
    if (!items.length) items.push('Scanning public PLUGGD activity...');
    return items;
  }, [bundle, live.data]);

  const refreshing = home.isRefetching || live.isRefetching;
  const refresh = () => {
    void home.refetch();
    void live.refetch();
    if (boardOne?.id) void boardOneDetail.refetch();
    if (boardTwo?.id) void boardTwoDetail.refetch();
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="light" translucent />
      <ScrollView
        style={styles.screen}
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={ed.orange} />}
        contentContainerStyle={{ paddingBottom: insets.bottom + 210 }}
      >
        {/* Hero */}
        <View style={[styles.heroBlock, { paddingTop: Math.max(insets.top + 76, 96) }]}>
          <Text style={styles.heroTitle}>
            Find what's <Text style={styles.heroTitleAccent}>moving.</Text>
          </Text>
          <EdPressable
            accessibilityRole="button"
            accessibilityLabel="Search PLUGGD"
            onPress={() => router.push('/search' as any)}
          >
            <View style={styles.searchBar}>
              <MaterialIcons name="search" size={19} color={ed.creamSoft} />
              <TextInput
                editable={false}
                pointerEvents="none"
                placeholder="Search artists, scenes, live rooms, releases..."
                placeholderTextColor={ed.creamSoft}
                style={styles.searchInput}
              />
            </View>
          </EdPressable>
          <View style={styles.chipWrap}>
            {CATEGORY_CHIPS.map((chip, index) => (
              <EdPressable
                key={chip.label}
                accessibilityRole="button"
                accessibilityLabel={chip.label}
                onPress={() => chip.route && router.push(chip.route as any)}
              >
                <View style={[styles.categoryChip, index === 0 && styles.categoryChipActive]}>
                  <Text style={[styles.categoryChipText, index === 0 && styles.categoryChipTextActive]}>{chip.label}</Text>
                </View>
              </EdPressable>
            ))}
          </View>
        </View>

        <LiveTicker items={tickerItems} variant="paper" />

        {/* What's moving now */}
        <View style={styles.sectionNight}>
          {home.isLoading ? (
            <PremiumSkeleton compact label="Loading PLUGGD data..." />
          ) : (
            <WhatsMovingNowCard moving={moving} />
          )}
        </View>

        {/* For You */}
        <View style={styles.sectionNight}>
          <EditorialSectionHead
            icon="auto-awesome"
            title="For You"
            subtitle="Compact picks from real public activity across PLUGGD."
          />
          {home.isLoading ? <PremiumSkeleton compact label="Loading fresh picks..." /> : <ForYouGrid cards={forYou} />}
        </View>

        {/* Live Now */}
        <View style={styles.sectionNight}>
          <EditorialSectionHead
            icon="sensors"
            title="Live Now"
            subtitle="Public rooms first, queued rooms when nothing is live."
          />
          {live.isLoading ? (
            <PremiumSkeleton compact label="Loading live rooms..." />
          ) : (
            <LiveNowSection rooms={live.data ?? []} hasEvents={(bundle?.events ?? []).length > 0} />
          )}
        </View>

        {/* Trending Scenes */}
        <View style={styles.sectionNight}>
          <EditorialSectionHead
            icon="local-fire-department"
            title="Trending Scenes"
            subtitle="Derived from real tags, cities, drops, mixes, boards, and events."
          />
          {home.isLoading ? <PremiumSkeleton compact label="Loading scenes..." /> : <TrendingScenes scenes={scenes} />}
        </View>

        {/* New From Creators */}
        <View style={styles.sectionNight}>
          <EditorialSectionHead
            icon="bolt"
            title="New From Creators"
            subtitle="Fresh releases, beats, mixes, and Soundboards from real creator data."
          />
          {home.isLoading ? (
            <PremiumSkeleton compact label="Loading new creator updates..." />
          ) : (
            <NewFromCreators updates={updates} />
          )}
        </View>

        {/* Soundboards Worth Opening (cream) */}
        <TornEdge color={ed.paper2} />
        <View style={styles.sectionPaper}>
          <View style={styles.sectionHeadRow}>
            <MaterialIcons name="headphones" size={20} color={ed.orange} />
            <Text style={[styles.sectionHeadTitle, { color: ed.ink }]}>Soundboards Worth Opening</Text>
          </View>
          <Text style={[styles.sectionHeadSub, { color: 'rgba(34,23,15,0.6)' }]}>
            {'Native previews from real board items, waveforms, notes, and comments.'.toUpperCase()}
          </Text>
          {home.isLoading ? (
            <PremiumSkeleton compact label="Loading Soundboards..." />
          ) : boardOne ? (
            <View style={{ gap: 16 }}>
              <SoundboardPanel board={boardOne} detail={boardOneDetail.data} creatorName={creatorNameFor(boardOne.creator_id)} />
              {boardTwo ? (
                <SoundboardPanel board={boardTwo} detail={boardTwoDetail.data} creatorName={creatorNameFor(boardTwo.creator_id)} />
              ) : null}
            </View>
          ) : (
            <Text style={styles.paperEmpty}>No public Soundboards are available yet.</Text>
          )}
        </View>
        <TornEdge flip color={ed.paper2} />

        {/* Near You */}
        <View style={styles.sectionNight}>
          <EditorialSectionHead
            icon="event"
            title="Near You"
            subtitle="Upcoming discoverable events and local scene signals."
          />
          {home.isLoading ? (
            <PremiumSkeleton compact label="Loading events..." />
          ) : (
            <NearYouSection events={bundle?.events ?? []} />
          )}
        </View>

        {/* Creators to Watch */}
        <View style={styles.sectionNight}>
          <EditorialSectionHead
            icon="groups"
            title="Creators to Watch"
            subtitle="Artists, producers, DJs, hosts, and soundboard builders shaping the feed."
          />
          {home.isLoading ? (
            <PremiumSkeleton compact label="Loading creators..." />
          ) : (
            <CreatorsToWatch creators={watchCreators} />
          )}
        </View>

        {/* Community Pulse */}
        <View style={styles.sectionNight}>
          <EditorialSectionHead
            icon="chat-bubble-outline"
            title="Community Pulse"
            subtitle="Short live activity from comments, rooms, drops, and board updates."
          />
          {home.isLoading ? (
            <PremiumSkeleton compact label="Loading activity..." />
          ) : (
            <CommunityPulse rows={pulseRows} />
          )}
        </View>

        {/* Final CTA */}
        <View style={styles.finalCta}>
          <Text style={styles.finalEyebrow}>START DISCOVERING DEEPER.</Text>
          <SerifTitle text="Go beyond one format. Explore the whole culture." size={28} />
          <OrangeButton label="Explore culture" onPress={() => router.push('/explore' as any)} style={{ marginTop: 6 }} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: ed.night },

  heroBlock: { paddingHorizontal: 20, paddingBottom: 24, gap: 16 },
  heroTitle: { fontFamily: edFonts.serif, fontSize: 38, lineHeight: 41, letterSpacing: -0.6, color: ed.cream },
  heroTitleAccent: { fontFamily: edFonts.serifItalic, color: ed.orange },
  searchBar: {
    minHeight: 48,
    borderRadius: ed.radius,
    borderWidth: 1,
    borderColor: ed.nightLine,
    backgroundColor: 'rgba(255,255,255,0.05)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
  },
  searchInput: { flex: 1, color: ed.cream, fontFamily: edFonts.bodyMedium, fontSize: 13.5, paddingVertical: 0 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: {
    minHeight: 38,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: ed.nightLine,
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryChipActive: { backgroundColor: ed.orange, borderColor: ed.orange },
  categoryChipText: { fontFamily: edFonts.bodyBold, fontSize: 12.5, color: ed.cream },
  categoryChipTextActive: { color: '#ffffff' },

  sectionNight: { paddingHorizontal: 20, paddingVertical: 26, gap: 14 },
  sectionPaper: { backgroundColor: ed.paper2, paddingHorizontal: 20, paddingVertical: 34, gap: 12 },
  sectionHeadRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  sectionHeadTitle: { fontFamily: edFonts.serif, fontSize: 26, lineHeight: 30, color: ed.cream },
  sectionHeadSub: {
    fontFamily: edFonts.mono,
    fontSize: 10.5,
    letterSpacing: 1.8,
    lineHeight: 16,
    color: 'rgba(255,248,237,0.55)',
  },
  nightEmpty: { fontFamily: edFonts.bodyMedium, fontSize: 13.5, lineHeight: 19, color: ed.creamMuted },
  paperEmpty: { fontFamily: edFonts.bodyMedium, fontSize: 13.5, lineHeight: 19, color: ed.inkSoft },
  buttonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },

  /* What's moving now */
  movingCard: {
    backgroundColor: ed.paper,
    borderRadius: 8,
    padding: 18,
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  movingKicker: { fontFamily: edFonts.bodyBlack, fontSize: 15, color: ed.ink },
  movingHeadline: { fontFamily: edFonts.serif, fontSize: 27, lineHeight: 30, color: ed.ink },
  movingSignals: { fontFamily: edFonts.bodyMedium, fontSize: 13.5, color: ed.inkMuted },
  movingMedia: {
    height: 190,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#11100d',
    justifyContent: 'flex-end',
    marginTop: 6,
  },
  movingChipRow: { flexDirection: 'row', gap: 8, padding: 12 },
  movingChip: {
    backgroundColor: 'rgba(7,6,5,0.72)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  movingChipText: { fontFamily: edFonts.bodyBold, fontSize: 11, color: ed.cream },

  /* For You */
  forYouGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  forYouCard: { width: '47.5%', flexGrow: 1, gap: 4 },
  forYouImageWrap: { borderRadius: 12, overflow: 'hidden', backgroundColor: '#191410' },
  forYouImage: { width: '100%', height: 128 },
  forYouKindPill: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: ed.orange,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  forYouKindText: { fontFamily: edFonts.bodyBlack, fontSize: 8.5, letterSpacing: 0.8, color: '#ffffff' },
  forYouTitle: { fontFamily: edFonts.bodyBold, fontSize: 14.5, lineHeight: 18, color: ed.cream, marginTop: 6 },
  forYouSubtitle: { fontFamily: edFonts.bodyMedium, fontSize: 12, color: ed.creamMuted },
  greyChip: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  greyChipText: { fontFamily: edFonts.bodyBold, fontSize: 10, color: ed.creamMuted },
  paperChip: {
    backgroundColor: 'rgba(34,23,15,0.08)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  paperChipText: { fontFamily: edFonts.bodyBold, fontSize: 10, color: ed.inkSoft },

  /* Live Now */
  liveRoomCard: {
    minHeight: 140,
    borderRadius: ed.radius,
    borderWidth: 1,
    borderColor: ed.nightLine,
    overflow: 'hidden',
    padding: 16,
    justifyContent: 'flex-end',
  },
  liveBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(7,6,5,0.72)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  liveDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#ff3b30' },
  liveBadgeText: { fontFamily: edFonts.bodyBlack, fontSize: 10, letterSpacing: 1.2, color: ed.cream },
  liveRoomTitle: { fontFamily: edFonts.bodyBold, fontSize: 16, color: ed.cream },
  nightPanel: {
    borderRadius: ed.radius,
    borderWidth: 1,
    borderColor: ed.nightLine,
    backgroundColor: ed.nightCard,
    padding: 18,
    gap: 10,
  },
  nightPanelTitle: { fontFamily: edFonts.bodyBold, fontSize: 15.5, color: ed.cream },
  nightPanelBody: { fontFamily: edFonts.bodyMedium, fontSize: 13.5, lineHeight: 19, color: ed.creamMuted },

  /* Trending Scenes */
  sceneCard: {
    minHeight: 230,
    borderRadius: ed.radius,
    borderWidth: 1,
    borderColor: ed.nightLine,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  sceneBody: { padding: 16, gap: 5 },
  sceneEyebrow: { fontFamily: edFonts.bodyBlack, fontSize: 10.5, letterSpacing: 1.4, color: ed.orange },
  sceneTitle: { fontFamily: edFonts.bodyBold, fontSize: 20, color: ed.cream },
  sceneSignals: { fontFamily: edFonts.bodyMedium, fontSize: 12.5, color: ed.creamMuted },
  sceneFootRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 8 },
  sceneCount: { fontFamily: edFonts.bodyBlack, fontSize: 24, color: ed.cream },
  sceneFreshness: { fontFamily: edFonts.bodyMedium, fontSize: 11.5, color: ed.creamMuted },

  /* New From Creators */
  updateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: ed.radius,
    borderWidth: 1,
    borderColor: ed.nightLine,
    backgroundColor: ed.nightCard,
    padding: 12,
  },
  updateRowMain: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 12 },
  updateThumbWrap: { width: 56, height: 56, borderRadius: 10, overflow: 'hidden' },
  updateThumb: { width: '100%', height: '100%' },
  updateKind: { fontFamily: edFonts.bodyBlack, fontSize: 9.5, letterSpacing: 1.2, color: ed.orange },
  updateTitle: { fontFamily: edFonts.bodyBold, fontSize: 14.5, color: ed.cream },
  updateSubtitle: { fontFamily: edFonts.bodyMedium, fontSize: 12, color: ed.creamMuted },
  outlineChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,165,90,0.4)',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  outlineChipText: { fontFamily: edFonts.bodyMedium, fontSize: 10, color: 'rgba(255,205,160,0.9)' },
  updatePlay: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: ed.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Soundboards Worth Opening */
  boardPanel: {
    borderRadius: 14,
    backgroundColor: '#171310',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 16,
    gap: 12,
    shadowColor: '#4d3b12',
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
  boardHeadRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  boardEyebrow: { fontFamily: edFonts.bodyBlack, fontSize: 10.5, letterSpacing: 1.4, color: ed.orange },
  boardTitle: { fontFamily: edFonts.bodyBold, fontSize: 21, lineHeight: 26, color: ed.cream },
  boardCreator: { fontFamily: edFonts.bodyMedium, fontSize: 12.5, color: ed.creamMuted },
  boardOpenPill: {
    minHeight: 40,
    borderRadius: 999,
    backgroundColor: '#fffdf7',
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boardOpenText: { fontFamily: edFonts.bodyBlack, fontSize: 12, color: ed.ink },
  boardCork: { gap: 14, marginTop: 4 },
  pinCentered: { alignSelf: 'center', zIndex: 2, marginBottom: -8 },
  boardAudioCard: {
    backgroundColor: '#fffdf7',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  boardAudioPlay: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: ed.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boardAudioTitle: { fontFamily: edFonts.bodyBlack, fontSize: 13.5, color: ed.ink },
  boardAudioMeta: { fontFamily: edFonts.bodyMedium, fontSize: 11, color: ed.inkSoft },
  boardWaveRow: { flexDirection: 'row', alignItems: 'center', gap: 2.5, marginTop: 6, height: 26 },
  boardWaveBar: { width: 3, borderRadius: 1.5, backgroundColor: ed.orange },
  boardItemsRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  boardPolaroid: {
    backgroundColor: '#fffdf7',
    padding: 8,
    paddingBottom: 10,
    width: 150,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 5 },
    transform: [{ rotate: '-1.5deg' }],
  },
  boardPolaroidImage: { width: '100%', height: 110 },
  boardPolaroidCaption: {
    fontFamily: edFonts.bodyBold,
    fontSize: 11.5,
    color: ed.ink,
    marginTop: 6,
    backgroundColor: '#efe9dc',
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  boardCommentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  boardCommentText: { flex: 1, fontFamily: edFonts.bodyBold, fontSize: 12.5, color: ed.cream },

  /* Near You */
  nearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: ed.radius,
    borderWidth: 1,
    borderColor: ed.nightLine,
    backgroundColor: ed.nightCard,
    padding: 12,
  },
  nearDate: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#1d1712',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nearDateDay: { fontFamily: edFonts.bodyBlack, fontSize: 16, color: ed.cream },
  nearDateMonth: { fontFamily: edFonts.mono, fontSize: 9, letterSpacing: 1.1, color: ed.orange },
  nearTitle: { fontFamily: edFonts.bodyBold, fontSize: 14, color: ed.cream },
  nearMeta: { fontFamily: edFonts.bodyMedium, fontSize: 11.5, color: ed.creamMuted },

  /* Creators to Watch */
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: ed.radius,
    borderWidth: 1,
    borderColor: ed.nightLine,
    backgroundColor: ed.nightCard,
    padding: 12,
  },
  creatorAvatarWrap: { width: 54, height: 54, borderRadius: 27, overflow: 'hidden' },
  creatorAvatar: { width: '100%', height: '100%' },
  creatorInitial: { fontFamily: edFonts.bodyBlack, fontSize: 18, color: ed.cream },
  creatorName: { fontFamily: edFonts.bodyBold, fontSize: 14.5, color: ed.cream },
  creatorRole: { fontFamily: edFonts.bodyMedium, fontSize: 11.5, color: ed.creamMuted },
  creatorDropped: { fontFamily: edFonts.bodyBold, fontSize: 11, color: ed.orange },
  viewPill: {
    minHeight: 36,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,102,0,0.55)',
    backgroundColor: 'rgba(255,102,0,0.12)',
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewPillText: { fontFamily: edFonts.bodyBlack, fontSize: 11.5, color: ed.orange },

  /* Community Pulse */
  pulseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: ed.radius,
    borderWidth: 1,
    borderColor: ed.nightLine,
    backgroundColor: ed.nightCard,
    padding: 12,
  },
  pulseThumbWrap: { width: 44, height: 44, borderRadius: 8, overflow: 'hidden' },
  pulseThumb: { width: '100%', height: '100%' },
  pulseHeadline: { fontFamily: edFonts.bodyBold, fontSize: 13.5, color: ed.cream },
  pulseDetail: { fontFamily: edFonts.bodyMedium, fontSize: 12, color: ed.creamMuted },
  pulseTime: { fontFamily: edFonts.bodyMedium, fontSize: 11, color: ed.orange },

  /* Final CTA */
  finalCta: { paddingHorizontal: 20, paddingVertical: 44, gap: 12, alignItems: 'flex-start' },
  finalEyebrow: {
    fontFamily: edFonts.mono,
    fontSize: 10.5,
    letterSpacing: 1.8,
    color: 'rgba(255,248,237,0.55)',
  },
});
