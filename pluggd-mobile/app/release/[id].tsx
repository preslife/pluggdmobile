import { MaterialIcons } from '@expo/vector-icons';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Alert,
  Share,
  StyleSheet,
  TextInput,
} from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PluggdImage } from '../../src/components/PluggdImage';
import { ed, edFonts } from '../../src/design/editorial';
import { supabase } from '../../src/lib/supabase';
import { usePlayback, type PluggdTrack } from '../../src/context/PlaybackProvider';
import { toggleSavedContent } from '../../src/features/culture/mobileServices';
import { useAuth } from '../../src/context/AuthProvider';
import { useWallet } from '../../src/hooks/useWallet';
import { releasePlayableUrl } from '../../src/lib/mobileContent';
import { EdPressable } from '../../src/features/editorial/EditorialBits';
import { WEB_PARITY_ASSETS } from '../../src/features/parity/webAssets';

interface ReleaseDetail {
  id: string;
  title: string;
  artist: string;
  cover_art_url: string | null;
  description: string | null;
  release_type: string | null;
  genre: string | null;
  price: number | null;
  credits_price: number | null;
  audio_url?: string | null;
  preview_url: string | null;
  download_url: string | null;
  user_id: string | null;
  available_at: string | null;
  release_date?: string | null;
  created_at?: string | null;
  total_plays?: number | null;
  producer?: string | null;
  producers?: string[] | null;
  songwriter?: string | null;
  songwriters?: string[] | null;
  composer?: string | null;
  composers?: string[] | null;
  executive_producer?: string | null;
  mixing_engineer?: string | null;
  mastering_engineer?: string | null;
  recording_engineer?: string | null;
  featured_artists?: string[] | null;
  label?: string | null;
  lyrics?: string | null;
  spotify_url?: string | null;
  apple_music_url?: string | null;
  soundcloud_url?: string | null;
  youtube_url?: string | null;
}

interface ReleaseTrack {
  id: string;
  title: string;
  track_number: number;
  duration: number | null;
  audio_url: string | null;
  preview_url?: string | null;
}

interface ReleaseComment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '--:--';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function getReleaseCreditPrice(release: ReleaseDetail): number {
  if (release.credits_price && release.credits_price > 0) {
    return Math.ceil(release.credits_price);
  }

  if (release.price && release.price > 0) {
    return Math.ceil(release.price * 100);
  }

  return 0;
}

function releasedDateLabel(release: ReleaseDetail) {
  const value = release.release_date || release.available_at || release.created_at;
  if (!value) return 'TBA';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'TBA';
  return date.toLocaleDateString('en-GB', { month: 'long', day: 'numeric', year: 'numeric' });
}

/** Web-parity title treatment: the final word carries the brand orange. */
function AccentTitle({ title }: { title: string }) {
  const words = title.trim().split(/\s+/);
  const last = words.pop() || '';
  return (
    <Text style={styles.title}>
      {words.length ? `${words.join(' ')} ` : ''}
      <Text style={{ color: ed.orange }}>{last}</Text>
    </Text>
  );
}

function joinNames(...values: Array<string | string[] | null | undefined>) {
  const names = values
    .flatMap((value) => (Array.isArray(value) ? value : value ? [value] : []))
    .map((name) => name.trim())
    .filter(Boolean);
  return Array.from(new Set(names)).join(', ');
}

function daysAgoLabel(value?: string | null) {
  if (!value) return '';
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return '';
  const days = Math.max(0, Math.floor((Date.now() - time) / 86400000));
  if (days === 0) return 'today';
  return `${days}d ago`;
}

export default function ReleaseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { playQueue, currentTrack, isPlaying, togglePlayPause, progress } = usePlayback();
  const { balance, spendCredits } = useWallet();

  const [release, setRelease] = useState<ReleaseDetail | null>(null);
  const [tracks, setTracks] = useState<ReleaseTrack[]>([]);
  const [comments, setComments] = useState<ReleaseComment[]>([]);
  const [commentDraft, setCommentDraft] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const [isOwned, setIsOwned] = useState(false);
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id) fetchRelease();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function fetchRelease() {
    setLoading(true);
    try {
      const { data: releaseData, error: relError } = await supabase
        .from('releases')
        .select('*')
        .eq('id', id)
        .single();

      if (relError || !releaseData) {
        console.error('[ReleaseDetail] fetch error:', relError);
        setLoading(false);
        return;
      }
      setRelease(releaseData as any);

      const { data: tracksData } = await supabase
        .from('tracks' as any)
        .select('*')
        .eq('release_id', id)
        .order('track_number', { ascending: true });

      if (tracksData) setTracks(tracksData as any);

      const { data: commentRows } = await (supabase as any)
        .from('release_comments')
        .select('id,content,created_at,user_id')
        .eq('release_id', id)
        .is('parent_comment_id', null)
        .order('created_at', { ascending: false })
        .limit(20);
      if (Array.isArray(commentRows)) setComments(commentRows);

      const { data: { user: authedUser } } = await supabase.auth.getUser();
      if (authedUser) {
        const { data: purchase } = await supabase
          .from('release_purchases' as any)
          .select('id')
          .eq('user_id', authedUser.id)
          .eq('release_id', id)
          .eq('status', 'completed')
          .maybeSingle();

        setIsOwned(!!purchase);
      }
    } catch (err) {
      console.error('[ReleaseDetail] error:', err);
    } finally {
      setLoading(false);
    }
  }

  function buildTrackList(): PluggdTrack[] {
    if (!release) return [];

    if (tracks.length > 0) {
      return tracks
        .filter((t) => t.audio_url)
        .map((t) => ({
          id: t.id,
          url: t.audio_url!,
          title: t.title,
          artist: release.artist || 'Unknown',
          artwork: release.cover_art_url || undefined,
          releaseId: release.id,
          type: 'release' as const,
        }));
    }

    const releaseUrl = releasePlayableUrl(release);
    if (releaseUrl) {
      return [
        {
          id: release.id,
          url: releaseUrl,
          title: release.title,
          artist: release.artist || 'Unknown',
          artwork: release.cover_art_url || undefined,
          releaseId: release.id,
          type: 'release' as const,
        },
      ];
    }

    return [];
  }

  function handlePlayAll() {
    const queue = buildTrackList();
    if (queue.length > 0) playQueue(queue, 0);
  }

  function handlePlayTrack(index: number) {
    const queue = buildTrackList();
    if (queue.length > 0) playQueue(queue, index);
  }

  async function handleUnlock() {
    if (!release) return;
    const creditsNeeded = getReleaseCreditPrice(release);

    if (creditsNeeded <= 0) {
      Alert.alert('Free Release', 'This release is free to stream.');
      return;
    }

    if (balance.available_credits < creditsNeeded) {
      Alert.alert(
        'Insufficient Credits',
        `You need ${creditsNeeded} credits but have ${balance.available_credits}. Would you like to buy more?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Buy Credits', onPress: () => router.push('/wallet') },
        ],
      );
      return;
    }

    Alert.alert(
      'Unlock Release',
      `Unlock "${release.title}" for ${creditsNeeded} credits?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unlock',
          onPress: async () => {
            setUnlocking(true);
            const result = await spendCredits(
              creditsNeeded,
              'spend_unlock',
              'release',
              release.id,
              release.user_id || undefined,
            );
            setUnlocking(false);

            if (result.success) {
              setIsOwned(true);
              Alert.alert('Unlocked!', `"${release.title}" is now in your library.`);
            } else {
              Alert.alert('Error', result.error || 'Failed to unlock release.');
            }
          },
        },
      ],
    );
  }

  async function handleSave() {
    if (!release || saving) return;
    setSaving(true);
    const result = await toggleSavedContent('release', release.id);
    setSaving(false);
    Alert.alert(result.success ? (result.saved ? 'Saved' : 'Removed') : 'Save unavailable', result.success ? `"${release.title}" library state updated.` : result.error || 'Please try again.');
  }

  async function handleShare() {
    if (!release) return;
    await Share.share({ message: `PLUGGD release: ${release.title} by ${release.artist || 'Creator'}` });
  }

  async function handlePostComment() {
    if (!release || !user?.id) return;
    const body = commentDraft.trim();
    if (!body) return;
    setPostingComment(true);
    const { error } = await (supabase as any)
      .from('release_comments')
      .insert({ release_id: release.id, user_id: user.id, content: body });
    setPostingComment(false);
    if (error) {
      Alert.alert('Comment unavailable', error.message || 'Please try again.');
      return;
    }
    setCommentDraft('');
    const { data: commentRows } = await (supabase as any)
      .from('release_comments')
      .select('id,content,created_at,user_id')
      .eq('release_id', release.id)
      .is('parent_comment_id', null)
      .order('created_at', { ascending: false })
      .limit(20);
    if (Array.isArray(commentRows)) setComments(commentRows);
  }

  const creditRows = useMemo(() => {
    if (!release) return [] as Array<{ label: string; value: string }>;
    const rows: Array<{ label: string; value: string }> = [];
    const producer = joinNames(release.producer, release.producers);
    const songwriter = joinNames(release.songwriter, release.songwriters);
    const composer = joinNames(release.composer, release.composers);
    const featured = joinNames(release.featured_artists);
    if (producer) rows.push({ label: 'Producer', value: producer });
    if (songwriter) rows.push({ label: 'Songwriter', value: songwriter });
    if (composer) rows.push({ label: 'Composer', value: composer });
    if (release.executive_producer) rows.push({ label: 'Executive producer', value: release.executive_producer });
    if (release.mixing_engineer) rows.push({ label: 'Mixing', value: release.mixing_engineer });
    if (release.mastering_engineer) rows.push({ label: 'Mastering', value: release.mastering_engineer });
    if (release.recording_engineer) rows.push({ label: 'Recording', value: release.recording_engineer });
    if (featured) rows.push({ label: 'Featuring', value: featured });
    if (release.label) rows.push({ label: 'Label', value: release.label });
    return rows;
  }, [release]);

  const streamLinks = useMemo(() => {
    if (!release) return [] as Array<{ label: string; url: string }>;
    return [
      { label: 'Spotify', url: release.spotify_url || '' },
      { label: 'Apple Music', url: release.apple_music_url || '' },
      { label: 'SoundCloud', url: release.soundcloud_url || '' },
      { label: 'YouTube', url: release.youtube_url || '' },
    ].filter((link) => link.url);
  }, [release]);

  if (loading) {
    return (
      <View style={[styles.screen, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={ed.orange} />
      </View>
    );
  }

  if (!release) {
    return (
      <View style={[styles.screen, { alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 }]}>
        <MaterialIcons name="album" size={34} color="rgba(255,248,237,0.4)" />
        <Text style={styles.notFoundTitle}>Release not found</Text>
        <Text style={styles.notFoundBody}>This release is unavailable or the link no longer points to a published item.</Text>
        <EdPressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()}>
          <Text style={{ color: ed.orange, fontFamily: edFonts.bodyBlack, fontSize: 14, padding: 12 }}>Go back</Text>
        </EdPressable>
      </View>
    );
  }

  const creditsNeeded = getReleaseCreditPrice(release);
  const isCurrentlyPlaying = currentTrack?.releaseId === release.id || currentTrack?.id === release.id;
  const trackList = buildTrackList();
  const trackCount = Math.max(tracks.length, trackList.length, 1);
  const totalSeconds = tracks.reduce((sum, track) => sum + Number(track.duration ?? 0), 0);
  const lengthLabel = totalSeconds > 0 ? formatDuration(totalSeconds) : isCurrentlyPlaying && progress.duration > 0 ? formatDuration(progress.duration) : '--:--';
  const playsLabel = Number(release.total_plays ?? 0);
  const position = isCurrentlyPlaying ? progress.position : 0;
  const duration = isCurrentlyPlaying ? progress.duration : 0;
  const playedRatio = duration > 0 ? Math.min(1, position / duration) : 0;

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        style={styles.screen}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 200 }}
      >
        {/* Art with support pill */}
        <View>
          <PluggdImage
            uri={release.cover_art_url || ''}
            fallbackSource={WEB_PARITY_ASSETS.warmListeningRoom}
            style={styles.art}
          />
          <EdPressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/releases' as any))}
            style={[styles.backButton, { top: insets.top + 10 }]}
          >
            <MaterialIcons name="arrow-back" size={22} color="#ffffff" />
          </EdPressable>
          <View style={[styles.supportPill, { top: insets.top + 10 }]}>
            <Text style={styles.supportPillText}>SUPPORT THIS RELEASE</Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: 16, gap: 16, marginTop: 14 }}>
          {/* Credits ledger */}
          {creditRows.length ? (
            <View style={styles.panel}>
              <View style={styles.panelHeadRow}>
                <Text style={styles.panelEyebrow}>CREDITS</Text>
                <Text style={styles.panelHeadRight}>{creditRows.length} LISTED</Text>
              </View>
              <View style={{ gap: 8 }}>
                {creditRows.map((row) => (
                  <View key={row.label} style={styles.creditRow}>
                    <Text style={styles.creditLabel}>{row.label.toUpperCase()}</Text>
                    <Text style={styles.creditValue} numberOfLines={1}>{row.value}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* Meta row + title + artist */}
          <View style={{ gap: 10 }}>
            <View style={styles.metaRow}>
              <Text style={styles.metaType}>{(release.release_type || 'Single').toUpperCase()}</Text>
              {release.genre ? (
                <View style={styles.genreChip}>
                  <Text style={styles.genreChipText}>{release.genre.toUpperCase()}</Text>
                </View>
              ) : null}
              <Text style={styles.metaDate}>{releasedDateLabel(release).toUpperCase()}</Text>
            </View>
            <AccentTitle title={release.title} />
            <View style={styles.artistRow}>
              <View style={styles.artistAvatar}>
                <Text style={styles.artistInitial}>{(release.artist || 'P').slice(0, 1).toUpperCase()}</Text>
              </View>
              <View style={{ gap: 4 }}>
                <Text style={styles.artistLabel}>ARTIST</Text>
                <EdPressable
                  accessibilityRole="button"
                  accessibilityLabel={`View ${release.artist || 'creator'}`}
                  onPress={() => release.user_id && router.push(`/user/${release.user_id}` as any)}
                >
                  <View style={styles.artistChip}>
                    <Text style={styles.artistChipText}>{(release.artist || 'PLUGGD creator').toUpperCase()}</Text>
                  </View>
                </EdPressable>
              </View>
            </View>
            {creditRows[0] ? (
              <Text style={styles.producedBy}>Produced by {creditRows[0].value}</Text>
            ) : null}
            {release.description ? <Text style={styles.description}>{release.description}</Text> : null}
            <View style={styles.chipRow}>
              <View style={styles.statChip}>
                <Text style={styles.statChipText}>{trackCount} track{trackCount === 1 ? '' : 's'}</Text>
              </View>
              <View style={styles.statChip}>
                <Text style={styles.statChipText}>{lengthLabel}</Text>
              </View>
              <View style={styles.statChip}>
                <Text style={styles.statChipText}>{playsLabel} play{playsLabel === 1 ? '' : 's'}</Text>
              </View>
            </View>
          </View>

          {/* Action grid */}
          <View style={styles.actionGrid}>
            {!isOwned && creditsNeeded > 0 ? (
              <EdPressable
                accessibilityRole="button"
                accessibilityLabel={`Unlock for ${creditsNeeded} credits`}
                onPress={handleUnlock}
                disabled={unlocking}
                style={styles.actionCellWrap}
              >
                <View style={styles.primaryAction}>
                  {unlocking ? (
                    <ActivityIndicator size="small" color={ed.onOrange} />
                  ) : (
                    <>
                      <MaterialIcons name="lock-open" size={18} color={ed.onOrange} />
                      <Text style={styles.primaryActionText}>Unlock · {creditsNeeded} credits</Text>
                    </>
                  )}
                </View>
              </EdPressable>
            ) : (
              <EdPressable
                accessibilityRole="button"
                accessibilityLabel={trackList.length ? `Play ${release.title}` : 'Audio unavailable'}
                accessibilityState={{ disabled: trackList.length === 0 }}
                disabled={trackList.length === 0}
                onPress={handlePlayAll}
                style={styles.actionCellWrap}
              >
                <View style={[styles.primaryAction, isOwned && { backgroundColor: 'rgba(74,222,128,0.16)', borderColor: 'rgba(74,222,128,0.5)' }]}>
                  <MaterialIcons name="play-arrow" size={18} color={isOwned ? '#4ade80' : ed.onOrange} />
                  <Text style={[styles.primaryActionText, isOwned && { color: '#4ade80' }]}>
                    {trackList.length ? (isOwned ? 'Play owned' : 'Free stream') : 'Audio unavailable'}
                  </Text>
                </View>
              </EdPressable>
            )}
            <EdPressable
              accessibilityRole="button"
              accessibilityLabel="Tip artist"
              onPress={() => (release.user_id ? router.push(`/user/${release.user_id}` as any) : undefined)}
              style={styles.actionCellWrap}
            >
              <View style={styles.ghostAction}>
                <MaterialIcons name="volunteer-activism" size={17} color={ed.cream} />
                <Text style={styles.ghostActionText}>Tip Artist</Text>
              </View>
            </EdPressable>
            <EdPressable accessibilityRole="button" accessibilityLabel="Save this release" onPress={handleSave} disabled={saving} style={styles.actionCellWrap}>
              <View style={styles.ghostAction}>
                <MaterialIcons name="favorite-border" size={17} color={ed.cream} />
                <Text style={styles.ghostActionText}>{saving ? 'Saving' : 'Like'}</Text>
              </View>
            </EdPressable>
            <EdPressable accessibilityRole="button" accessibilityLabel="Share this release" onPress={handleShare} style={styles.actionCellWrap}>
              <View style={styles.ghostAction}>
                <MaterialIcons name="ios-share" size={17} color={ed.cream} />
                <Text style={styles.ghostActionText}>Share</Text>
              </View>
            </EdPressable>
            <EdPressable
              accessibilityRole="button"
              accessibilityLabel="Post to feed"
              onPress={() => router.push({ pathname: '/create-post', params: { attachmentType: 'release', releaseId: release.id, type: 'post' } } as any)}
              style={styles.actionCellWrap}
            >
              <View style={styles.ghostAction}>
                <MaterialIcons name="post-add" size={17} color={ed.cream} />
                <Text style={styles.ghostActionText}>Post to Feed</Text>
              </View>
            </EdPressable>
            {release.user_id ? (
              <EdPressable
                accessibilityRole="button"
                accessibilityLabel="View creator profile"
                onPress={() => router.push(`/user/${release.user_id}` as any)}
                style={styles.actionCellWrap}
              >
                <View style={styles.ghostAction}>
                  <MaterialIcons name="person-outline" size={17} color={ed.cream} />
                  <Text style={styles.ghostActionText}>Creator</Text>
                </View>
              </EdPressable>
            ) : null}
          </View>

          {/* Playback card */}
          <View style={styles.playbackCard}>
            <View style={styles.panelHeadRow}>
              <Text style={styles.panelEyebrow}>PLAYBACK</Text>
              <Text style={styles.panelHeadRight} numberOfLines={1}>
                {release.title} · {lengthLabel}
              </Text>
            </View>
            <View style={styles.playerHeadRow}>
              <View style={styles.playerThumbWrap}>
                <PluggdImage
                  uri={release.cover_art_url || ''}
                  fallbackSource={WEB_PARITY_ASSETS.warmListeningRoom}
                  style={styles.playerThumb}
                />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.playerLabel}>PLUGGD PLAYER</Text>
                <Text style={styles.playerArtist} numberOfLines={1}>{(release.artist || 'PLUGGD creator').toUpperCase()}</Text>
              </View>
              <EdPressable accessibilityRole="button" accessibilityLabel="Share this release" onPress={handleShare}>
                <View style={styles.playerShare}>
                  <MaterialIcons name="share" size={16} color={ed.cream} />
                </View>
              </EdPressable>
            </View>
            <EdPressable
              accessibilityRole="button"
              accessibilityLabel={isCurrentlyPlaying && isPlaying ? 'Pause' : 'Play all'}
              onPress={isCurrentlyPlaying ? togglePlayPause : handlePlayAll}
            >
              <View style={styles.playBar}>
                <MaterialIcons name={isCurrentlyPlaying && isPlaying ? 'pause' : 'play-arrow'} size={26} color={ed.onOrange} />
              </View>
            </EdPressable>
            {(tracks.length ? tracks : [{ id: release.id, title: release.title, track_number: 1, duration: null, audio_url: releasePlayableUrl(release) }]).map((track, index) => {
              const active = currentTrack?.id === track.id || (tracks.length === 0 && isCurrentlyPlaying);
              return (
                <EdPressable
                  key={track.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Play ${track.title}`}
                  onPress={() => handlePlayTrack(index)}
                >
                  <View style={[styles.trackRow, active && styles.trackRowActive]}>
                    <View style={styles.trackNumber}>
                      <Text style={styles.trackNumberText}>{track.track_number || index + 1}</Text>
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[styles.trackTitle, active && { color: ed.orange }]} numberOfLines={1}>{track.title}</Text>
                      <Text style={styles.trackMeta} numberOfLines={1}>
                        {(release.artist || 'PLUGGD creator')} · Track {track.track_number || index + 1}
                      </Text>
                    </View>
                    <Text style={styles.trackDuration}>{formatDuration(track.duration)}</Text>
                  </View>
                </EdPressable>
              );
            })}
            <View style={styles.scrubRow}>
              <Text style={styles.scrubTime}>{formatDuration(position)}</Text>
              <View style={styles.scrubTrack}>
                <View style={[styles.scrubFill, { width: `${Math.max(2, playedRatio * 100)}%` }]} />
              </View>
              <Text style={styles.scrubTime}>{duration > 0 ? formatDuration(duration) : lengthLabel}</Text>
            </View>
          </View>

          {/* Stats grid */}
          <View style={styles.statsGrid}>
            {[
              { label: 'PLAYS', value: String(playsLabel) },
              { label: 'RELEASE', value: releasedDateLabel(release) },
              { label: 'TRACKS', value: String(trackCount) },
              { label: 'LENGTH', value: lengthLabel },
            ].map((stat) => (
              <View key={stat.label} style={styles.statCell}>
                <Text style={styles.statCellLabel}>{stat.label}</Text>
                <Text style={styles.statCellValue}>{stat.value}</Text>
              </View>
            ))}
          </View>

          {/* Discussion */}
          <View style={styles.panel}>
            <Text style={styles.panelEyebrow}>DISCUSSION</Text>
            <View style={styles.commentsHeadRow}>
              <MaterialIcons name="chat-bubble-outline" size={17} color={ed.cream} />
              <Text style={styles.commentsHeadText}>Comments ({comments.length})</Text>
            </View>
            {user ? (
              <View style={{ gap: 10 }}>
                <TextInput
                  value={commentDraft}
                  onChangeText={setCommentDraft}
                  placeholder="Join the conversation..."
                  placeholderTextColor="rgba(255,248,237,0.4)"
                  multiline
                  style={styles.commentInput}
                />
                <EdPressable
                  accessibilityRole="button"
                  accessibilityLabel="Post comment"
                  onPress={handlePostComment}
                  disabled={postingComment || !commentDraft.trim()}
                >
                  <View style={[styles.commentPost, (!commentDraft.trim() || postingComment) && { opacity: 0.5 }]}>
                    <Text style={styles.commentPostText}>{postingComment ? 'Posting...' : 'Post comment'}</Text>
                  </View>
                </EdPressable>
              </View>
            ) : (
              <View style={styles.signInCard}>
                <View style={styles.signInIconWrap}>
                  <MaterialIcons name="lock-outline" size={16} color={ed.orange} />
                </View>
                <Text style={styles.signInTitle}>Sign in to join the conversation</Text>
                <Text style={styles.signInBody}>
                  You can read comments without an account, but posting and replying requires sign-in.
                </Text>
                <EdPressable accessibilityRole="button" accessibilityLabel="Sign in to comment" onPress={() => router.push('/auth/login' as any)}>
                  <View style={styles.signInCta}>
                    <Text style={styles.signInCtaText}>Sign in to comment</Text>
                  </View>
                </EdPressable>
              </View>
            )}
            {comments.length ? (
              <View style={{ gap: 10, marginTop: 4 }}>
                {comments.map((comment) => (
                  <View key={comment.id} style={styles.commentRow}>
                    <View style={styles.commentAvatar}>
                      <MaterialIcons name="person" size={14} color="rgba(255,248,237,0.7)" />
                    </View>
                    <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                      <Text style={styles.commentBody}>{comment.content}</Text>
                      <Text style={styles.commentTime}>{daysAgoLabel(comment.created_at)}</Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.commentsEmpty}>No comments yet. {user ? 'Start the conversation.' : 'Sign in to start the conversation.'}</Text>
            )}
          </View>

          {/* Where to stream */}
          <View style={styles.panel}>
            <Text style={styles.panelEyebrow}>WHERE TO STREAM</Text>
            {streamLinks.length ? (
              <View style={styles.chipRow}>
                {streamLinks.map((link) => (
                  <EdPressable
                    key={link.label}
                    accessibilityRole="button"
                    accessibilityLabel={`Share ${link.label} link`}
                    onPress={() => Share.share({ message: link.url })}
                  >
                    <View style={styles.streamChip}>
                      <MaterialIcons name="open-in-new" size={13} color={ed.cream} />
                      <Text style={styles.streamChipText}>{link.label}</Text>
                    </View>
                  </EdPressable>
                ))}
              </View>
            ) : (
              <Text style={styles.panelBody}>External streaming links haven't been added yet.</Text>
            )}
          </View>

          {/* The words */}
          <View style={styles.panel}>
            <View style={styles.commentsHeadRow}>
              <MaterialIcons name="notes" size={16} color={ed.orange} />
              <Text style={styles.panelEyebrow}>THE WORDS</Text>
            </View>
            {release.lyrics ? (
              <Text style={styles.lyrics}>{release.lyrics}</Text>
            ) : (
              <Text style={styles.panelBody}>Lyrics are not available for this release yet.</Text>
            )}
          </View>

          {/* Balance strip */}
          {!isOwned && creditsNeeded > 0 ? (
            <EdPressable accessibilityRole="button" accessibilityLabel="Open wallet" onPress={() => router.push('/wallet')}>
              <View style={styles.balanceRow}>
                <View>
                  <Text style={styles.balanceLabel}>YOUR BALANCE</Text>
                  <Text style={styles.balanceValue}>{balance.available_credits.toLocaleString()} credits</Text>
                </View>
                <Text style={styles.balanceCta}>Buy More →</Text>
              </View>
            </EdPressable>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0d0705' },
  notFoundTitle: { fontFamily: edFonts.bodyBlack, fontSize: 18, color: ed.cream },
  notFoundBody: { fontFamily: edFonts.bodyMedium, fontSize: 13.5, lineHeight: 19, color: 'rgba(255,248,237,0.6)', textAlign: 'center' },

  art: { width: '100%', height: 390 },
  backButton: {
    position: 'absolute',
    left: 14,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(7,6,5,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  supportPill: {
    position: 'absolute',
    right: 14,
    backgroundColor: 'rgba(7,6,5,0.82)',
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  supportPillText: { fontFamily: edFonts.mono, fontSize: 9.5, letterSpacing: 1.4, color: ed.cream },

  panel: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,248,237,0.1)',
    backgroundColor: 'rgba(255,255,255,0.035)',
    padding: 16,
    gap: 12,
  },
  panelHeadRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  panelEyebrow: { fontFamily: edFonts.bodyBlack, fontSize: 11.5, letterSpacing: 1.4, color: ed.orange },
  panelHeadRight: { flexShrink: 1, fontFamily: edFonts.mono, fontSize: 9.5, letterSpacing: 1.2, color: 'rgba(255,248,237,0.55)' },
  panelBody: { fontFamily: edFonts.bodyMedium, fontSize: 13, lineHeight: 19, color: 'rgba(255,248,237,0.6)' },

  creditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  creditLabel: { fontFamily: edFonts.mono, fontSize: 9, letterSpacing: 1.4, color: 'rgba(255,248,237,0.55)' },
  creditValue: { flexShrink: 1, fontFamily: edFonts.bodyBold, fontSize: 13.5, color: ed.cream },

  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 9 },
  metaType: { fontFamily: edFonts.bodyBlack, fontSize: 12, letterSpacing: 1.2, color: ed.cream },
  genreChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,248,237,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  genreChipText: { fontFamily: edFonts.bodyBlack, fontSize: 10, letterSpacing: 1, color: 'rgba(255,248,237,0.8)' },
  metaDate: { fontFamily: edFonts.mono, fontSize: 10, letterSpacing: 1.2, color: 'rgba(255,248,237,0.55)' },
  title: { fontFamily: edFonts.bodyBlack, fontSize: 36, lineHeight: 41, letterSpacing: -0.8, color: '#ffffff' },
  artistRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  artistAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#241a12',
    alignItems: 'center',
    justifyContent: 'center',
  },
  artistInitial: { fontFamily: edFonts.bodyBlack, fontSize: 14, color: ed.orange },
  artistLabel: { fontFamily: edFonts.mono, fontSize: 8.5, letterSpacing: 1.6, color: 'rgba(255,248,237,0.5)' },
  artistChip: {
    alignSelf: 'flex-start',
    backgroundColor: ed.paper,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  artistChipText: { fontFamily: edFonts.bodyBlack, fontSize: 11.5, letterSpacing: 0.6, color: ed.ink },
  producedBy: { fontFamily: edFonts.bodyMedium, fontSize: 13, color: 'rgba(255,248,237,0.66)' },
  description: { fontFamily: edFonts.bodyMedium, fontSize: 13.5, lineHeight: 20, color: 'rgba(255,248,237,0.6)' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statChip: {
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.07)',
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  statChipText: { fontFamily: edFonts.bodyBold, fontSize: 11.5, color: 'rgba(255,248,237,0.8)' },

  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionCellWrap: { width: '47.5%', flexGrow: 1 },
  primaryAction: {
    minHeight: 50,
    borderRadius: 12,
    backgroundColor: ed.orange,
    borderWidth: 1,
    borderColor: 'rgba(255,102,0,0.7)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 8,
  },
  primaryActionText: { fontFamily: edFonts.bodyBlack, fontSize: 13, color: ed.onOrange },
  ghostAction: {
    minHeight: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,248,237,0.18)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 8,
  },
  ghostActionText: { fontFamily: edFonts.bodyBold, fontSize: 13, color: ed.cream },

  playbackCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,102,0,0.4)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 16,
    gap: 12,
  },
  playerHeadRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  playerThumbWrap: { width: 44, height: 44, borderRadius: 8, overflow: 'hidden' },
  playerThumb: { width: '100%', height: '100%' },
  playerLabel: { fontFamily: edFonts.bodyBlack, fontSize: 10, letterSpacing: 1.2, color: ed.orange },
  playerArtist: { fontFamily: edFonts.bodyBlack, fontSize: 15, color: '#ffffff', marginTop: 2 },
  playerShare: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,248,237,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBar: {
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: ed.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,248,237,0.1)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 11,
  },
  trackRowActive: { borderColor: 'rgba(255,102,0,0.55)' },
  trackNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,102,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackNumberText: { fontFamily: edFonts.bodyBlack, fontSize: 12.5, color: '#ffffff' },
  trackTitle: { fontFamily: edFonts.bodyBold, fontSize: 14, color: ed.cream },
  trackMeta: { fontFamily: edFonts.bodyMedium, fontSize: 11, color: 'rgba(255,248,237,0.5)', marginTop: 1 },
  trackDuration: { fontFamily: edFonts.mono, fontSize: 10.5, color: 'rgba(255,248,237,0.6)' },
  scrubRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  scrubTime: { fontFamily: edFonts.mono, fontSize: 10, color: 'rgba(255,248,237,0.6)' },
  scrubTrack: { flex: 1, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,248,237,0.16)' },
  scrubFill: { height: 4, borderRadius: 2, backgroundColor: ed.orange },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCell: {
    width: '47.5%',
    flexGrow: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,248,237,0.1)',
    backgroundColor: 'rgba(255,255,255,0.035)',
    padding: 13,
    gap: 4,
  },
  statCellLabel: { fontFamily: edFonts.mono, fontSize: 9, letterSpacing: 1.4, color: 'rgba(255,248,237,0.5)' },
  statCellValue: { fontFamily: edFonts.bodyBlack, fontSize: 15.5, color: ed.cream },

  commentsHeadRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  commentsHeadText: { fontFamily: edFonts.bodyBlack, fontSize: 16, color: ed.cream },
  signInCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,102,0,0.35)',
    backgroundColor: 'rgba(255,102,0,0.06)',
    padding: 14,
    gap: 6,
  },
  signInIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,102,0,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInTitle: { fontFamily: edFonts.bodyBlack, fontSize: 14.5, color: ed.cream, marginTop: 2 },
  signInBody: { fontFamily: edFonts.bodyMedium, fontSize: 12.5, lineHeight: 18, color: 'rgba(255,248,237,0.66)' },
  signInCta: {
    minHeight: 46,
    borderRadius: 10,
    backgroundColor: ed.orange,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  signInCtaText: { fontFamily: edFonts.bodyBlack, fontSize: 13.5, color: ed.onOrange },
  commentInput: {
    minHeight: 72,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,248,237,0.15)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    color: ed.cream,
    fontFamily: edFonts.bodyMedium,
    fontSize: 13.5,
    padding: 12,
    textAlignVertical: 'top',
  },
  commentPost: {
    alignSelf: 'flex-start',
    minHeight: 42,
    borderRadius: 999,
    backgroundColor: ed.orange,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentPostText: { fontFamily: edFonts.bodyBlack, fontSize: 12.5, color: ed.onOrange },
  commentRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  commentAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentBody: { fontFamily: edFonts.bodyMedium, fontSize: 13, lineHeight: 19, color: 'rgba(255,248,237,0.85)' },
  commentTime: { fontFamily: edFonts.bodyMedium, fontSize: 10.5, color: 'rgba(255,248,237,0.45)' },
  commentsEmpty: { fontFamily: edFonts.bodyMedium, fontSize: 13, lineHeight: 19, color: 'rgba(255,248,237,0.55)', textAlign: 'center', paddingVertical: 6 },

  streamChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,248,237,0.2)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  streamChipText: { fontFamily: edFonts.bodyBold, fontSize: 12.5, color: ed.cream },
  lyrics: { fontFamily: edFonts.bodyMedium, fontSize: 13.5, lineHeight: 22, color: 'rgba(255,248,237,0.78)' },

  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderWidth: 1,
    borderColor: 'rgba(255,248,237,0.1)',
    padding: 14,
  },
  balanceLabel: { fontFamily: edFonts.mono, fontSize: 9, letterSpacing: 1.4, color: 'rgba(255,248,237,0.55)' },
  balanceValue: { fontFamily: edFonts.bodyBlack, fontSize: 17, color: ed.cream, marginTop: 3 },
  balanceCta: { fontFamily: edFonts.bodyBlack, fontSize: 13, color: ed.orange },
});
