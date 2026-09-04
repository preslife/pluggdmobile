import { MaterialIcons } from '@expo/vector-icons';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Share,
  StyleSheet,
  TextInput,
} from 'react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PluggdImage } from '../../src/components/PluggdImage';
import { ReleaseArtwork } from '../../src/components/ReleaseArtwork';
import { edFonts } from '../../src/design/editorial';
import { supabase } from '../../src/lib/supabase';
import { usePlayback, type PluggdTrack } from '../../src/context/PlaybackProvider';
import { addReleaseToPlaylist, loadMobilePlaylists, toggleSavedContent } from '../../src/features/culture/mobileServices';
import type { MobilePlaylist } from '../../src/features/culture/mobileTypes';
import { useAuth } from '../../src/context/AuthProvider';
import { useWallet } from '../../src/hooks/useWallet';
import { EdPressable } from '../../src/features/editorial/EditorialBits';
import { WEB_PARITY_ASSETS } from '../../src/features/parity/webAssets';
import TipModal from '../../src/components/CommerceTipModal';
import { openHostedCheckout, reconcileHostedCheckout, useCommercePolicy } from '../../src/commerce/policy';
import { useBottomChromeInset } from '../../src/design/useBottomChromeInset';
import { releasePlayableUrl } from '../../src/lib/mobileContent';
import { usePluggdTheme } from '../../src/design/usePluggdTheme';

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
  catalogue_mode?: string | null;
  catalogue_import_job_id?: string | null;
  primary_artist_id?: string | null;
}

type CreditedArtist = {
  name: string;
  imageUrl: string | null;
  profileRoute: string | null;
  tipUserId: string | null;
};

interface ReleaseTrack {
  id: string;
  title: string;
  track_number: number;
  duration: number | null;
  audio_url: string | null;
  preview_url?: string | null;
  audio_rights_status?: string | null;
  playable_on_pluggd?: boolean | null;
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

function readAscii(view: DataView, offset: number, length: number) {
  let value = '';
  for (let index = 0; index < length; index += 1) value += String.fromCharCode(view.getUint8(offset + index));
  return value;
}

async function loadLegacyWavDuration(url: string | null | undefined): Promise<number | null> {
  if (!url || !/\.wav(?:$|[?#])/i.test(url)) return null;
  try {
    const buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.open('GET', url);
      request.responseType = 'arraybuffer';
      request.setRequestHeader('Range', 'bytes=0-65535');
      request.onload = () => {
        const responseBuffer = request.response as ArrayBuffer | null;
        if (request.status >= 200 && request.status < 300 && responseBuffer?.byteLength) {
          resolve(responseBuffer);
          return;
        }
        reject(new Error(`Audio metadata request failed (${request.status}).`));
      };
      request.onerror = () => reject(new Error('Audio metadata request failed.'));
      request.send();
    });
    const view = new DataView(buffer);
    if (view.byteLength < 44 || readAscii(view, 0, 4) !== 'RIFF' || readAscii(view, 8, 4) !== 'WAVE') return null;
    let byteRate = 0;
    let dataBytes = 0;
    let offset = 12;
    while (offset + 8 <= view.byteLength) {
      const chunk = readAscii(view, offset, 4);
      const chunkSize = view.getUint32(offset + 4, true);
      const bodyOffset = offset + 8;
      if (chunk === 'fmt ' && chunkSize >= 16 && bodyOffset + 12 <= view.byteLength) byteRate = view.getUint32(bodyOffset + 8, true);
      if (chunk === 'data') {
        dataBytes = chunkSize;
        break;
      }
      offset = bodyOffset + chunkSize + (chunkSize % 2);
    }
    const duration = byteRate > 0 && dataBytes > 0 ? dataBytes / byteRate : 0;
    return Number.isFinite(duration) && duration > 0 ? duration : null;
  } catch {
    return null;
  }
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
  const theme = usePluggdTheme();
  const styles = useReleaseStyles();
  const words = title.trim().split(/\s+/);
  const last = words.pop() || '';
  return (
    <Text style={styles.title}>
      {words.length ? `${words.join(' ')} ` : ''}
      <Text style={{ color: theme.colors.accentText }}>{last}</Text>
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
  const theme = usePluggdTheme();
  const styles = useReleaseStyles();
  const { id, focus } = useLocalSearchParams<{ id: string; focus?: string }>();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  const bottomInset = useBottomChromeInset();
  const { user } = useAuth();
  const { playQueue, currentTrack, isPlaying, togglePlayPause, progress } = usePlayback();
  const { balance, spendCredits } = useWallet();

  const [release, setRelease] = useState<ReleaseDetail | null>(null);
  const [tracks, setTracks] = useState<ReleaseTrack[]>([]);
  const [comments, setComments] = useState<ReleaseComment[]>([]);
  const [commentDraft, setCommentDraft] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const [isOwned, setIsOwned] = useState(false);
  const [purchaseId, setPurchaseId] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tipVisible, setTipVisible] = useState(false);
  const [externalPurchasing, setExternalPurchasing] = useState(false);
  const [creditedArtist, setCreditedArtist] = useState<CreditedArtist | null>(null);
  const [creditsExpanded, setCreditsExpanded] = useState(false);
  const [playlistModalVisible, setPlaylistModalVisible] = useState(false);
  const [playlists, setPlaylists] = useState<MobilePlaylist[]>([]);
  const [playlistLoading, setPlaylistLoading] = useState(false);
  const [playlistAddingId, setPlaylistAddingId] = useState<string | null>(null);
  const [startingPlayback, setStartingPlayback] = useState(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const externalPolicyRequest = useMemo(() => ({
    kind: 'release_unlock' as const,
    itemId: id,
    optionId: 'external',
    classification: 'digital' as const,
  }), [id]);
  const externalPolicy = useCommercePolicy(externalPolicyRequest);

  useEffect(() => {
    if (id) fetchRelease();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function fetchRelease() {
    setLoading(true);
    try {
      const { data: releaseData, error: relError } = await (supabase as any)
        .from('releases')
        .select('id,title,artist,cover_art_url,description,release_type,genre,price,credits_price,audio_url,preview_url,user_id,available_at,release_date,created_at,total_plays,producer,producers,songwriter,songwriters,composer,composers,executive_producer,mixing_engineer,mastering_engineer,recording_engineer,featured_artists,label,lyrics,spotify_url,apple_music_url,soundcloud_url,youtube_url,catalogue_mode,catalogue_import_job_id,primary_artist_id,approved,status,visibility_status')
        .eq('id', id)
        .eq('approved', true)
        .in('status', ['published', 'live', 'approved'])
        .eq('visibility_status', 'visible')
        .single();

      if (relError || !releaseData) {
        console.error('[ReleaseDetail] fetch error:', relError);
        setLoading(false);
        return;
      }
      setRelease(releaseData as any);

      const { data: artistLinks } = await (supabase as any)
        .from('release_artists')
        .select('artist_id,display_name,role,sort_order,artists(id,name,image_url,claimed_profile_id,claimed_by_user_id)')
        .eq('release_id', id)
        .order('sort_order', { ascending: true })
        .limit(1);
      let artistRow = Array.isArray(artistLinks) ? artistLinks[0]?.artists : null;
      if (Array.isArray(artistRow)) artistRow = artistRow[0];
      if (!artistRow && (releaseData as any).primary_artist_id) {
        const { data: fallbackArtist } = await (supabase as any)
          .from('artists')
          .select('id,name,image_url,claimed_profile_id,claimed_by_user_id')
          .eq('id', (releaseData as any).primary_artist_id)
          .maybeSingle();
        artistRow = fallbackArtist;
      }
      if (artistRow) {
        let profileRoute: string | null = null;
        let tipUserId: string | null = artistRow.claimed_by_user_id || releaseData.user_id || null;
        if (artistRow.claimed_profile_id) {
          const { data: profile } = await (supabase as any)
            .from('profiles')
            .select('username,user_id')
            .eq('id', artistRow.claimed_profile_id)
            .maybeSingle();
          if (profile?.username) profileRoute = `/creator/${encodeURIComponent(profile.username)}`;
          else if (profile?.user_id) profileRoute = `/user/${profile.user_id}`;
          tipUserId ||= profile?.user_id || null;
        } else if (artistRow.claimed_by_user_id) {
          profileRoute = `/user/${artistRow.claimed_by_user_id}`;
        }
        if (!profileRoute && releaseData.user_id) profileRoute = `/user/${releaseData.user_id}`;
        setCreditedArtist({
          name: artistRow.name || artistLinks?.[0]?.display_name || releaseData.artist || 'Artist',
          imageUrl: artistRow.image_url || null,
          profileRoute,
          tipUserId,
        });
      } else {
        setCreditedArtist({
          name: releaseData.artist || 'Artist',
          imageUrl: null,
          profileRoute: releaseData.user_id ? `/user/${releaseData.user_id}` : null,
          tipUserId: releaseData.user_id || null,
        });
      }

      const { data: tracksData } = await (supabase as any)
        .from('tracks')
        .select('id,title,track_number,duration,audio_url,audio_rights_status,playable_on_pluggd')
        .eq('release_id', id)
        .order('track_number', { ascending: true });

      if (tracksData) {
        const hydratedTracks = await Promise.all((tracksData as ReleaseTrack[]).map(async (track) => {
          if (Number(track.duration ?? 0) > 0) return track;
          const { data: metadata } = await (supabase as any).rpc('get_public_playback_metadata', {
            p_catalog_type: 'track',
            p_catalog_id: track.id,
          });
          const row = Array.isArray(metadata) ? metadata[0] : metadata;
          const processedDuration = Number(row?.duration_seconds ?? 0);
          if (processedDuration > 0) return { ...track, duration: processedDuration };
          const fileDuration = await loadLegacyWavDuration(
            track.audio_url || track.preview_url || row?.stream_url,
          );
          return fileDuration ? { ...track, duration: fileDuration } : track;
        }));
        setTracks(hydratedTracks);
      }

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
        const { data: purchase } = await (supabase as any)
          .from('release_purchases')
          .select('id')
          .eq('user_id', authedUser.id)
          .eq('release_id', id)
          .eq('status', 'completed')
          .maybeSingle();

        setIsOwned(!!purchase);
        setPurchaseId(purchase?.id ?? null);
      } else {
        setIsOwned(false);
        setPurchaseId(null);
      }
    } catch (err) {
      console.error('[ReleaseDetail] error:', err);
    } finally {
      setLoading(false);
    }
  }

  function buildTrackList(): PluggdTrack[] {
    if (!release) return [];

    // Imported catalogue releases are reference metadata only. Their track
    // records must never be treated as PLUGGD-hosted audio.
    if (release.catalogue_import_job_id || (release.catalogue_mode && release.catalogue_mode !== 'pluggd')) {
      return [];
    }

    if (tracks.length > 0) {
      const playableTracks = tracks
        .filter((track) => track.playable_on_pluggd !== false && !['unlicensed', 'takedown'].includes(track.audio_rights_status || ''))
        .map((track) => ({
          ...track,
          playableUrl: releasePlayableUrl(track),
        }))
        .filter((track) => track.playableUrl)
        .map((t) => ({
          id: t.id,
          url: t.playableUrl!,
          title: t.title,
          artist: release.artist || 'Unknown',
          artwork: release.cover_art_url || undefined,
          releaseId: release.id,
          trackId: t.id,
          duration: t.duration || undefined,
          legacyLyrics: tracks.length === 1 ? release.lyrics || undefined : undefined,
          type: 'release' as const,
          sourceType: 'release' as const,
        }));
      if (playableTracks.length > 0) return playableTracks;
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
          legacyLyrics: release.lyrics || undefined,
          type: 'release' as const,
          sourceType: 'release' as const,
        },
      ];
    }

    return [];
  }

  async function handleExternalPurchase() {
    if (!release || externalPurchasing) return;
    if (externalPolicy.permittedRail !== 'stripe_checkout') {
      Alert.alert('Purchase unavailable', externalPolicy.reason);
      return;
    }
    setExternalPurchasing(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-release-purchase', {
        body: {
          releaseId: release.id,
          requestId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          storefront: externalPolicy.storefront,
          returnUrl: 'pluggd://commerce/success',
        },
      });
      if (error) throw error;
      const response = (data ?? {}) as Record<string, unknown>;
      const checkoutUrl = String(response.checkoutUrl ?? response.checkout_url ?? response.url ?? '');
      const sessionId = typeof (response.sessionId ?? response.session_id) === 'string'
        ? String(response.sessionId ?? response.session_id)
        : null;
      const checkout = await openHostedCheckout(checkoutUrl, {
        reconcile: async () => (await reconcileHostedCheckout({
          kind: 'release_unlock',
          sessionId,
          itemId: release.id,
        })).state,
      });
      if (checkout.state === 'success') {
        setIsOwned(true);
        await fetchRelease();
      }
      router.push({
        pathname: '/commerce/success',
        params: {
          kind: 'release_unlock',
          status: checkout.state,
          sessionId: sessionId ?? '',
          itemId: release.id,
        },
      } as any);
    } catch (error) {
      Alert.alert('Purchase unavailable', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setExternalPurchasing(false);
    }
  }

  async function handleDownload() {
    if (!purchaseId || downloading) return;
    setDownloading(true);
    try {
      const { data, error } = await supabase.functions.invoke('download-signed-url', {
        body: { purchaseId, purchaseType: 'release' },
      });
      if (error) throw error;
      const response = (data ?? {}) as Record<string, unknown>;
      const signedUrl = typeof (response.signedUrl ?? response.signed_url) === 'string'
        ? String(response.signedUrl ?? response.signed_url)
        : '';
      if (!/^https:\/\//i.test(signedUrl)) throw new Error('The secure download link was invalid.');
      await Linking.openURL(signedUrl);
    } catch (error) {
      Alert.alert('Download unavailable', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setDownloading(false);
    }
  }

  async function handlePlayAll() {
    if (!release || startingPlayback) return;
    const queue = buildTrackList();
    if (queue.length === 0) return;
    const requestedTitle = queue[0]?.title || release.title;
    setPlaybackError(null);
    setStartingPlayback(true);
    try {
      const active = await playQueue(queue, 0);
      const activeIsRequestedRelease = Boolean(
        active &&
        (active.sourceType === 'release' || active.type === 'release') &&
        (active.releaseId === release.id || active.id === release.id || queue.some((track) => track.id === active.id)),
      );
      if (!activeIsRequestedRelease || !active) {
        const activeTitle = active?.title || currentTrack?.title;
        setPlaybackError(
          activeTitle
            ? `${requestedTitle} did not start. ${activeTitle} is still playing. Try again.`
            : `${requestedTitle} did not start. Try again.`,
        );
        return;
      }
      router.push({
        pathname: '/player',
        params: {
          title: active.title,
          artist: active.artist,
          cover: active.artwork ?? '',
        },
      });
    } catch {
      setPlaybackError(`${requestedTitle} did not start. Try again.`);
    } finally {
      setStartingPlayback(false);
    }
  }

  function handlePlayTrack(trackId: string) {
    const queue = buildTrackList();
    const startIndex = queue.findIndex((track) => track.id === trackId);
    if (startIndex >= 0) playQueue(queue, startIndex);
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

  async function handleOpenPlaylists() {
    if (!user?.id) {
      router.push('/auth/login' as any);
      return;
    }
    setPlaylistModalVisible(true);
    setPlaylistLoading(true);
    const rows = await loadMobilePlaylists(null, 48);
    setPlaylists(rows.filter((playlist) => playlist.owner_id === user.id));
    setPlaylistLoading(false);
  }

  async function handleAddToPlaylist(playlist: MobilePlaylist) {
    if (!release || playlistAddingId) return;
    setPlaylistAddingId(playlist.id);
    const result = await addReleaseToPlaylist(playlist.id, release.id);
    setPlaylistAddingId(null);
    if (!result.success) {
      Alert.alert('Could not add to playlist', result.error || 'Please try again.');
      return;
    }
    setPlaylistModalVisible(false);
    Alert.alert('Added to playlist', `“${release.title}” was added to ${playlist.name}.`);
  }

  async function handleOpenStream(url: string) {
    if (!/^https?:\/\//i.test(url) || !(await Linking.canOpenURL(url))) {
      Alert.alert('Link unavailable', 'This streaming service could not be opened.');
      return;
    }
    await Linking.openURL(url);
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
        <ActivityIndicator size="large" color={theme.colors.accentFill} />
      </View>
    );
  }

  if (!release) {
    return (
      <View style={[styles.screen, { alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 }]}>
        <MaterialIcons name="album" size={34} color={theme.colors.textMuted} />
        <Text style={styles.notFoundTitle}>Release not found</Text>
        <Text style={styles.notFoundBody}>This release is unavailable or the link no longer points to a published item.</Text>
        <EdPressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/releases' as any))}>
          <Text style={{ color: theme.colors.accentText, fontFamily: edFonts.bodyBlack, fontSize: 14, padding: 12 }}>Go back</Text>
        </EdPressable>
      </View>
    );
  }

  const creditsNeeded = getReleaseCreditPrice(release);
  const isCurrentlyPlaying = Boolean(
    (currentTrack?.sourceType === 'release' || currentTrack?.type === 'release') &&
    (currentTrack?.releaseId === release.id || currentTrack?.id === release.id),
  );
  const trackList = buildTrackList();
  const catalogueReference = Boolean(release.catalogue_import_job_id || (release.catalogue_mode && release.catalogue_mode !== 'pluggd'));
  const hasCreatorSuppliedAudio = !catalogueReference && Boolean(
    release.audio_url || release.preview_url ||
    tracks.some((track) => track.audio_url || track.preview_url),
  );
  const canUnlock = !isOwned && creditsNeeded > 0 && hasCreatorSuppliedAudio;
  const trackCount = Math.max(tracks.length, trackList.length);
  const totalSeconds = tracks.reduce((sum, track) => sum + Number(track.duration ?? 0), 0);
  const lengthLabel = totalSeconds > 0 ? formatDuration(totalSeconds) : isCurrentlyPlaying && progress.duration > 0 ? formatDuration(progress.duration) : '--:--';
  const playsLabel = Number(release.total_plays ?? 0);
  const position = isCurrentlyPlaying ? progress.position : 0;
  const duration = isCurrentlyPlaying ? progress.duration : 0;
  const playedRatio = duration > 0 ? Math.min(1, position / duration) : 0;

  return (
    <View style={styles.screen}>
      <StatusBar style={theme.scheme === 'light' ? 'dark' : 'light'} />
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        ref={scrollRef}
        style={styles.screen}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomInset }}
      >
        {/* Art with support pill */}
        <View>
          <ReleaseArtwork
            uri={release.cover_art_url || ''}
            fallbackSource={WEB_PARITY_ASSETS.warmListeningRoom}
            style={styles.art}
          />
          <View style={[styles.backButton, { top: insets.top + 10 }]}>
            <EdPressable
              accessibilityRole="button"
              accessibilityLabel="Go back"
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/releases' as any))}
              style={styles.backButtonHit}
            >
              <MaterialIcons name="arrow-back" size={22} color={theme.colors.mediaText} />
            </EdPressable>
          </View>
          <View style={[styles.supportPill, { top: insets.top + 10 }]}>
            <Text style={styles.supportPillText}>PLUGGD RELEASE</Text>
          </View>
        </View>

        <View style={styles.releaseContent}>
          {/* Meta row + title + artist */}
          <View style={styles.releaseLead}>
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
            <View style={styles.artistPlayRow}>
              <EdPressable
                accessibilityRole="button"
                accessibilityLabel={creditedArtist?.profileRoute ? `View ${creditedArtist.name}` : `${creditedArtist?.name || release.artist || 'Artist'} profile unavailable`}
                accessibilityState={{ disabled: !creditedArtist?.profileRoute }}
                disabled={!creditedArtist?.profileRoute}
                onPress={() => creditedArtist?.profileRoute && router.push(creditedArtist.profileRoute as any)}
                style={styles.artistIdentityHit}
              >
                <View style={styles.artistIdentity}>
                  <View style={styles.artistAvatar}>
                    {creditedArtist?.imageUrl ? (
                      <PluggdImage uri={creditedArtist.imageUrl} style={StyleSheet.absoluteFillObject as any} />
                    ) : (
                      <Text style={styles.artistInitial}>{(creditedArtist?.name || release.artist || 'P').slice(0, 1).toUpperCase()}</Text>
                    )}
                  </View>
                  <Text style={styles.artistName} numberOfLines={1}>{creditedArtist?.name || release.artist || 'PLUGGD artist'}</Text>
                </View>
              </EdPressable>
              <EdPressable
                accessibilityRole="button"
                accessibilityLabel={trackList.length ? `Listen to ${release.title}` : 'Audio unavailable'}
                accessibilityState={{ busy: startingPlayback, disabled: trackList.length === 0 || startingPlayback }}
                disabled={trackList.length === 0 || startingPlayback}
                onPress={() => {
                  if (isCurrentlyPlaying) void togglePlayPause();
                  else void handlePlayAll();
                }}
                style={styles.listenButtonWrap}
              >
                <View style={styles.primaryAction}>
                  {startingPlayback ? <ActivityIndicator size="small" color={theme.colors.accentText} /> : <MaterialIcons name={isCurrentlyPlaying && isPlaying ? 'pause' : 'play-arrow'} size={20} color={theme.colors.accentText} />}
                  <Text style={styles.primaryActionText}>{trackList.length ? (startingPlayback ? 'Starting…' : isCurrentlyPlaying && isPlaying ? 'Pause' : 'Listen now') : 'Unavailable'}</Text>
                </View>
              </EdPressable>
            </View>
            {playbackError ? (
              <View style={styles.playbackErrorRow}>
                <Text accessibilityRole="alert" style={styles.playbackErrorText}>{playbackError}</Text>
                <EdPressable
                  accessibilityRole="button"
                  accessibilityLabel={`Retry playing ${release.title}`}
                  onPress={() => void handlePlayAll()}
                  style={styles.playbackRetry}
                >
                  <Text style={styles.playbackRetryText}>Retry</Text>
                </EdPressable>
              </View>
            ) : null}

            {/* Release actions */}
            <View style={styles.actionGrid}>
            <EdPressable accessibilityRole="button" accessibilityLabel="Add this release to a playlist" onPress={handleOpenPlaylists} style={styles.actionCellWrap}>
              <View style={styles.ghostAction}>
                <MaterialIcons name="playlist-add" size={25} color={theme.colors.text} />
                <Text style={styles.ghostActionText}>Playlist</Text>
              </View>
            </EdPressable>
            <EdPressable
              accessibilityRole="button"
              accessibilityLabel="Tip artist"
              accessibilityState={{ disabled: !creditedArtist?.tipUserId }}
              disabled={!creditedArtist?.tipUserId}
              onPress={() => creditedArtist?.tipUserId && setTipVisible(true)}
              style={styles.actionCellWrap}
            >
              <View style={styles.ghostAction}>
                <MaterialIcons name="volunteer-activism" size={23} color={theme.colors.text} />
                <Text style={styles.ghostActionText}>Tip</Text>
              </View>
            </EdPressable>
            <EdPressable accessibilityRole="button" accessibilityLabel="Save this release" onPress={handleSave} disabled={saving} style={styles.actionCellWrap}>
              <View style={styles.ghostAction}>
                <MaterialIcons name="favorite-border" size={24} color={theme.colors.text} />
                <Text style={styles.ghostActionText}>{saving ? 'Saving' : 'Like'}</Text>
              </View>
            </EdPressable>
            <EdPressable accessibilityRole="button" accessibilityLabel="Share this release" onPress={handleShare} style={styles.actionCellWrap}>
              <View style={styles.ghostAction}>
                <MaterialIcons name="send" size={23} color={theme.colors.text} />
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
                <MaterialIcons name="post-add" size={24} color={theme.colors.text} />
                <Text style={styles.ghostActionText}>Post to feed</Text>
              </View>
            </EdPressable>
            </View>

            {canUnlock && externalPolicy.permittedRail === 'stripe_checkout' ? (
              <EdPressable
                accessibilityRole="button"
                accessibilityLabel="Buy this release through secure hosted checkout"
                accessibilityState={{ busy: externalPurchasing }}
                onPress={handleExternalPurchase}
                disabled={externalPurchasing}
                style={styles.purchaseActionWrap}
              >
                <View style={styles.purchaseAction}>
                  {externalPurchasing
                    ? <ActivityIndicator size="small" color={theme.colors.text} />
                    : <MaterialIcons name="open-in-new" size={18} color={theme.colors.text} />}
                  <Text style={styles.ghostActionText}>Buy download</Text>
                </View>
              </EdPressable>
            ) : null}

            {creditRows[0] ? (
              <Text style={styles.producedBy}>Produced by <Text style={styles.producedByName}>{creditRows[0].value}</Text></Text>
            ) : null}
            {release.description ? <Text style={styles.description}>{release.description}</Text> : null}
            <View style={styles.chipRow}>
              {trackCount > 0 ? (
                <View style={styles.statChip}>
                  <Text style={styles.statChipText}>{trackCount} track{trackCount === 1 ? '' : 's'}</Text>
                </View>
              ) : null}
              <View style={styles.statChip}>
                <Text style={styles.statChipText}>{lengthLabel}</Text>
              </View>
              <View style={styles.statChip}>
                <Text style={styles.statChipText}>{playsLabel} play{playsLabel === 1 ? '' : 's'}</Text>
              </View>
            </View>
          </View>

          {canUnlock || isOwned ? (
            <View style={styles.downloadCard}>
              <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                <Text style={styles.panelEyebrow}>{isOwned ? 'YOUR DOWNLOAD' : 'OWN THE DROP'}</Text>
                <Text style={styles.downloadCopy}>
                  {isOwned ? 'Your release is ready to download.' : `Download the full release and support ${creditedArtist?.name || release.artist || 'the artist'}.`}
                </Text>
              </View>
              {!isOwned && canUnlock ? (
                <EdPressable accessibilityRole="button" accessibilityLabel={`Get the release for ${creditsNeeded} credits`} onPress={handleUnlock} disabled={unlocking}>
                <View style={styles.downloadButton}>{unlocking ? <ActivityIndicator color={theme.colors.onAccent} /> : <Text style={styles.downloadButtonText}>{`Get it · ${creditsNeeded} credits`}</Text>}</View>
                </EdPressable>
              ) : purchaseId ? (
                <EdPressable
                  accessibilityRole="button"
                  accessibilityLabel="Download purchased files securely"
                  accessibilityState={{ busy: downloading }}
                  disabled={downloading}
                  onPress={handleDownload}
                >
                  <View style={styles.downloadButton}>
                    {downloading ? <ActivityIndicator color={theme.colors.onAccent} /> : <Text style={styles.downloadButtonText}>Download files</Text>}
                  </View>
                </EdPressable>
              ) : <MaterialIcons name="download-done" size={24} color={theme.colors.success} />}
            </View>
          ) : null}

          {/* Playback card */}
          {trackList.length > 0 ? (
            <View style={styles.playbackCard}>
            <View style={styles.panelHeadRow}>
              <Text style={styles.panelEyebrow}>PLAYBACK</Text>
              <Text style={styles.panelHeadRight} numberOfLines={1}>
                {release.title} · {lengthLabel}
              </Text>
            </View>
            <View style={styles.playerHeadRow}>
              <View style={styles.playerThumbWrap}>
                <ReleaseArtwork
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
                  <MaterialIcons name="share" size={16} color={theme.colors.text} />
                </View>
              </EdPressable>
            </View>
            <EdPressable
              accessibilityRole="button"
              accessibilityLabel={isCurrentlyPlaying && isPlaying ? 'Pause' : 'Play all'}
              accessibilityState={{ busy: startingPlayback, disabled: startingPlayback }}
              disabled={startingPlayback}
              onPress={() => {
                if (isCurrentlyPlaying) void togglePlayPause();
                else void handlePlayAll();
              }}
            >
              <View style={styles.playBar}>
                {startingPlayback ? <ActivityIndicator color={theme.colors.onAccent} /> : <MaterialIcons name={isCurrentlyPlaying && isPlaying ? 'pause' : 'play-arrow'} size={26} color={theme.colors.onAccent} />}
              </View>
            </EdPressable>
            {(tracks.length ? tracks : [{ id: release.id, title: release.title, track_number: 1, duration: null, audio_url: trackList[0]?.url ?? null }]).map((track, index) => {
              const playableTrack = trackList.find((item) => item.id === track.id);
              const active = currentTrack?.id === track.id || (tracks.length === 0 && isCurrentlyPlaying);
              const row = (
                <View style={[styles.trackRow, active && styles.trackRowActive]}>
                  <View style={styles.trackNumber}>
                    <Text style={styles.trackNumberText}>{track.track_number || index + 1}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.trackTitle, active && { color: theme.colors.accentText }]} numberOfLines={1}>{track.title}</Text>
                    <Text style={styles.trackMeta} numberOfLines={1}>
                      {(release.artist || 'PLUGGD creator')} · {playableTrack ? `Track ${track.track_number || index + 1}` : 'Audio unavailable'}
                    </Text>
                  </View>
                  <Text style={styles.trackDuration}>{formatDuration(track.duration)}</Text>
                </View>
              );
              return playableTrack ? (
                <EdPressable
                  key={track.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Play ${track.title}`}
                  onPress={() => handlePlayTrack(track.id)}
                >
                  {row}
                </EdPressable>
              ) : (
                <View key={track.id}>{row}</View>
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
          ) : (
            <View style={styles.playbackCard}>
              <View style={styles.panelHeadRow}>
                <Text style={styles.panelEyebrow}>{catalogueReference ? 'REFERENCE RELEASE' : 'LISTENING'}</Text>
                <MaterialIcons name="volume-off" size={19} color={theme.colors.textMuted} />
              </View>
              <Text style={styles.audioUnavailableTitle}>
                {canUnlock ? 'Unlock to hear the full release' : 'Audio not supplied to PLUGGD'}
              </Text>
              <Text style={styles.panelBody}>
                {catalogueReference
                  ? 'This page preserves release credits and catalogue information. It is not a playable PLUGGD upload.'
                  : canUnlock
                    ? 'No preview is available. Unlocking gives access only when creator-supplied audio is present.'
                    : 'Explore the release details and external listening links below.'}
              </Text>
              {tracks.map((track, index) => (
                <View key={track.id} style={styles.trackRow}>
                  <View style={styles.trackNumber}><Text style={styles.trackNumberText}>{track.track_number || index + 1}</Text></View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.trackTitle} numberOfLines={1}>{track.title}</Text>
                    <Text style={styles.trackMeta}>Catalogue information · Audio unavailable</Text>
                  </View>
                  <Text style={styles.trackDuration}>{formatDuration(track.duration)}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Stats grid */}
          <View style={styles.statsGrid}>
            {[
              { label: 'PLAYS', value: String(playsLabel) },
              { label: 'RELEASE', value: releasedDateLabel(release) },
              { label: 'TRACKS', value: trackCount > 0 ? String(trackCount) : '—' },
              { label: 'LENGTH', value: lengthLabel },
            ].map((stat) => (
              <View key={stat.label} style={styles.statCell}>
                <Text style={styles.statCellLabel}>{stat.label}</Text>
                <Text style={styles.statCellValue}>{stat.value}</Text>
              </View>
            ))}
          </View>

          {creditRows.length ? (
            <View style={styles.panel}>
              <EdPressable accessibilityRole="button" accessibilityLabel={`${creditsExpanded ? 'Hide' : 'Show'} full credits`} onPress={() => setCreditsExpanded((value) => !value)}>
                <View style={styles.panelHeadRow}>
                  <Text style={styles.panelEyebrow}>FULL CREDITS</Text>
                  <View style={styles.creditsToggle}>
                    <Text style={styles.panelHeadRight}>{creditsExpanded ? 'HIDE' : `${creditRows.length} ROLES`}</Text>
                    <MaterialIcons name={creditsExpanded ? 'expand-less' : 'expand-more'} size={20} color={theme.colors.accentText} />
                  </View>
                </View>
              </EdPressable>
              {creditsExpanded ? <View>
                {creditRows.map((row) => (
                  <View key={row.label} style={styles.creditRow}>
                    <Text style={styles.creditLabel}>{row.label.toUpperCase()}</Text>
                    <Text style={styles.creditValue} numberOfLines={1}>{row.value}</Text>
                  </View>
                ))}
              </View> : <Text style={styles.panelBody}>Songwriting, production and recording credits.</Text>}
            </View>
          ) : null}

          {/* Discussion */}
          <View
            style={styles.panel}
            onLayout={(event) => {
              if (focus !== 'comments') return;
              const y = event.nativeEvent.layout.y;
              requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: Math.max(0, y - 96), animated: true }));
            }}
          >
            <Text style={styles.panelEyebrow}>DISCUSSION</Text>
            <View style={styles.commentsHeadRow}>
              <MaterialIcons name="chat-bubble-outline" size={17} color={theme.colors.text} />
              <Text style={styles.commentsHeadText}>Comments ({comments.length})</Text>
            </View>
            {user ? (
              <View style={{ gap: 10 }}>
                <TextInput
                  value={commentDraft}
                  onChangeText={setCommentDraft}
                  placeholder="Join the conversation..."
                  placeholderTextColor={theme.colors.textMuted}
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
                  <MaterialIcons name="lock-outline" size={16} color={theme.colors.accentText} />
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
                      <MaterialIcons name="person" size={14} color={theme.colors.textSecondary} />
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
                    accessibilityRole="link"
                    accessibilityLabel={`Open ${link.label}`}
                    onPress={() => void handleOpenStream(link.url)}
                  >
                    <View style={styles.streamChip}>
                      <MaterialIcons name="open-in-new" size={13} color={theme.colors.text} />
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
              <MaterialIcons name="notes" size={16} color={theme.colors.accentText} />
              <Text style={styles.panelEyebrow}>THE WORDS</Text>
            </View>
            {release.lyrics ? (
              <Text style={styles.lyrics}>{release.lyrics}</Text>
            ) : (
              <Text style={styles.panelBody}>Lyrics are not available for this release yet.</Text>
            )}
          </View>

          {/* Balance strip */}
          {canUnlock ? (
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
      {creditedArtist?.tipUserId ? (
        <TipModal
          visible={tipVisible}
          onClose={() => setTipVisible(false)}
          artistName={creditedArtist.name || release.artist || 'this artist'}
          artistId={creditedArtist.tipUserId}
        />
      ) : null}
      <Modal visible={playlistModalVisible} transparent animationType="slide" onRequestClose={() => setPlaylistModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.playlistSheet}>
            <View style={styles.panelHeadRow}>
              <View>
                <Text style={styles.panelEyebrow}>ADD TO PLAYLIST</Text>
                <Text style={styles.playlistSheetTitle}>Choose a playlist</Text>
              </View>
              <EdPressable accessibilityRole="button" accessibilityLabel="Close playlist chooser" onPress={() => setPlaylistModalVisible(false)}>
                <View style={styles.modalClose}><MaterialIcons name="close" size={21} color={theme.colors.text} /></View>
              </EdPressable>
            </View>
            {playlistLoading ? <ActivityIndicator color={theme.colors.accentFill} style={{ marginVertical: 30 }} /> : playlists.length ? playlists.map((playlist) => (
              <EdPressable key={playlist.id} accessibilityRole="button" accessibilityLabel={`Add to ${playlist.name}`} onPress={() => void handleAddToPlaylist(playlist)} disabled={playlistAddingId === playlist.id}>
                <View style={styles.playlistRow}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.playlistName} numberOfLines={1}>{playlist.name}</Text>
                    <Text style={styles.playlistMeta}>{playlist.track_count ?? 0} tracks</Text>
                  </View>
                  {playlistAddingId === playlist.id ? <ActivityIndicator color={theme.colors.accentFill} /> : <MaterialIcons name="add" size={22} color={theme.colors.accentText} />}
                </View>
              </EdPressable>
            )) : <View style={styles.emptyPlaylists}><Text style={styles.playlistName}>No playlists yet</Text><Text style={styles.panelBody}>Create a playlist from Library, then add this release.</Text></View>}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function useReleaseStyles() {
  const theme = usePluggdTheme();
  return useMemo(() => StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  notFoundTitle: { fontFamily: edFonts.bodyBlack, fontSize: 18, color: theme.colors.text },
  notFoundBody: { fontFamily: edFonts.bodyMedium, fontSize: 13.5, lineHeight: 19, color: theme.colors.textSecondary, textAlign: 'center' },

  art: { width: '100%', aspectRatio: 1 },
  backButton: {
    position: 'absolute',
    left: 14,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.mediaScrim,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  backButtonHit: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  supportPill: {
    position: 'absolute',
    right: 14,
    backgroundColor: 'rgba(7,6,5,0.82)',
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  supportPillText: { fontFamily: edFonts.mono, fontSize: 9.5, letterSpacing: 1.4, color: theme.colors.mediaText },

  releaseContent: { paddingHorizontal: 20, gap: 18, marginTop: 18 },
  releaseLead: { gap: 14 },

  panel: {
    borderTopWidth: 1,
    borderColor: theme.colors.divider,
    paddingVertical: 18,
    gap: 12,
  },
  panelHeadRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  panelEyebrow: { fontFamily: edFonts.bodyBlack, fontSize: 11.5, letterSpacing: 1.4, color: theme.colors.accentText },
  panelHeadRight: { flexShrink: 1, fontFamily: edFonts.mono, fontSize: 9.5, letterSpacing: 1.2, color: theme.colors.textMuted },
  panelBody: { fontFamily: edFonts.bodyMedium, fontSize: 13, lineHeight: 19, color: theme.colors.textSecondary },

  creditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderBottomWidth: 1,
    borderColor: theme.colors.divider,
    paddingVertical: 12,
  },
  creditLabel: { fontFamily: edFonts.mono, fontSize: 9, letterSpacing: 1.4, color: theme.colors.textMuted },
  creditValue: { flexShrink: 1, fontFamily: edFonts.bodyBold, fontSize: 13.5, color: theme.colors.text },
  creditsToggle: { flexDirection: 'row', alignItems: 'center', gap: 4 },

  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 9 },
  metaType: { fontFamily: edFonts.bodyBlack, fontSize: 12, letterSpacing: 1.2, color: theme.colors.text },
  genreChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  genreChipText: { fontFamily: edFonts.bodyBlack, fontSize: 10, letterSpacing: 1, color: theme.colors.textSecondary },
  metaDate: { fontFamily: edFonts.mono, fontSize: 10, letterSpacing: 1.2, color: theme.colors.textMuted },
  title: { fontFamily: edFonts.bodyBlack, fontSize: 36, lineHeight: 41, letterSpacing: -0.8, color: theme.colors.text },
  artistPlayRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  artistIdentityHit: { minWidth: 0, flex: 1, minHeight: 52 },
  artistIdentity: { width: '100%', minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 10 },
  artistAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.colors.artworkBase,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artistInitial: { fontFamily: edFonts.bodyBlack, fontSize: 14, color: theme.colors.accentText },
  artistName: { minWidth: 0, flexShrink: 1, fontFamily: edFonts.bodyBold, fontSize: 18, color: theme.colors.text },
  listenButtonWrap: { width: 124 },
  producedBy: { borderTopWidth: 1, borderColor: theme.colors.divider, paddingTop: 14, fontFamily: edFonts.bodyMedium, fontSize: 13, color: theme.colors.textSecondary },
  producedByName: { fontFamily: edFonts.bodyBlack, color: theme.colors.text },
  description: { fontFamily: edFonts.bodyMedium, fontSize: 13.5, lineHeight: 20, color: theme.colors.textSecondary },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statChip: {
    borderRadius: 999,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  statChipText: { fontFamily: edFonts.bodyBold, fontSize: 11.5, color: theme.colors.textSecondary },

  actionGrid: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderBottomWidth: 1, borderColor: theme.colors.divider, paddingVertical: 8 },
  actionCellWrap: { minWidth: 0 },
  primaryAction: {
    minHeight: 46,
    borderRadius: 9,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderAccent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 8,
  },
  primaryActionText: { fontFamily: edFonts.bodyBlack, fontSize: 12.5, color: theme.colors.text },
  playbackErrorRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 4,
    paddingBottom: 8,
  },
  playbackErrorText: { flex: 1, fontFamily: edFonts.bodyMedium, fontSize: 12.5, lineHeight: 18, color: theme.colors.danger },
  playbackRetry: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 10 },
  playbackRetryText: { fontFamily: edFonts.bodyBlack, fontSize: 12.5, color: theme.colors.accentText },
  ghostAction: {
    width: 58,
    minHeight: 68,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 2,
  },
  ghostActionText: { fontFamily: edFonts.bodyBold, fontSize: 10.5, lineHeight: 13, textAlign: 'center', color: theme.colors.text },
  purchaseActionWrap: { alignSelf: 'flex-start' },
  purchaseAction: { minHeight: 44, borderWidth: 1, borderColor: theme.colors.controlBorder, borderRadius: 6, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 7 },
  downloadCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1,
    borderColor: theme.colors.borderAccent, backgroundColor: theme.colors.accentSoft,
    borderRadius: 12, padding: 14,
  },
  downloadCopy: { fontFamily: edFonts.bodyMedium, fontSize: 12.5, lineHeight: 18, color: theme.colors.textSecondary },
  downloadButton: { minHeight: 44, borderRadius: 8, backgroundColor: theme.colors.accentFill, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  downloadButtonText: { fontFamily: edFonts.bodyBlack, fontSize: 12, color: theme.colors.onAccent },

  playbackCard: {
    borderTopWidth: 1,
    borderColor: theme.colors.borderAccent,
    paddingVertical: 18,
    gap: 12,
  },
  audioUnavailableTitle: { fontFamily: edFonts.bodyBlack, fontSize: 18, lineHeight: 23, color: theme.colors.text },
  playerHeadRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  playerThumbWrap: { width: 44, height: 44, borderRadius: 8, overflow: 'hidden' },
  playerThumb: { width: '100%', height: '100%' },
  playerLabel: { fontFamily: edFonts.bodyBlack, fontSize: 10, letterSpacing: 1.2, color: theme.colors.accentText },
  playerArtist: { fontFamily: edFonts.bodyBlack, fontSize: 15, color: theme.colors.text, marginTop: 2 },
  playerShare: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.colors.controlBorder,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBar: {
    minHeight: 52,
    borderRadius: 5,
    backgroundColor: theme.colors.accentFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderTopWidth: 1,
    borderColor: theme.colors.divider,
    paddingVertical: 11,
  },
  trackRowActive: { borderColor: theme.colors.borderAccent },
  trackNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: theme.colors.accentFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackNumberText: { fontFamily: edFonts.bodyBlack, fontSize: 12.5, color: theme.colors.onAccent },
  trackTitle: { fontFamily: edFonts.bodyBold, fontSize: 14, color: theme.colors.text },
  trackMeta: { fontFamily: edFonts.bodyMedium, fontSize: 11, color: theme.colors.textMuted, marginTop: 1 },
  trackDuration: { fontFamily: edFonts.mono, fontSize: 10.5, color: theme.colors.textSecondary },
  scrubRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  scrubTime: { fontFamily: edFonts.mono, fontSize: 10, color: theme.colors.textSecondary },
  scrubTrack: { flex: 1, height: 4, borderRadius: 2, backgroundColor: theme.colors.surfaceAlt },
  scrubFill: { height: 4, borderRadius: 2, backgroundColor: theme.colors.accentFill },

  statsGrid: { flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, borderColor: theme.colors.divider, paddingVertical: 14 },
  statCell: {
    flex: 1,
    paddingHorizontal: 5,
    gap: 4,
  },
  statCellLabel: { fontFamily: edFonts.mono, fontSize: 9, letterSpacing: 1.4, color: theme.colors.textMuted },
  statCellValue: { fontFamily: edFonts.bodyBlack, fontSize: 15.5, color: theme.colors.text },

  commentsHeadRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  commentsHeadText: { fontFamily: edFonts.bodyBlack, fontSize: 16, color: theme.colors.text },
  signInCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderAccent,
    backgroundColor: theme.colors.accentSoft,
    padding: 14,
    gap: 6,
  },
  signInIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: theme.colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInTitle: { fontFamily: edFonts.bodyBlack, fontSize: 14.5, color: theme.colors.text, marginTop: 2 },
  signInBody: { fontFamily: edFonts.bodyMedium, fontSize: 12.5, lineHeight: 18, color: theme.colors.textSecondary },
  signInCta: {
    minHeight: 46,
    borderRadius: 10,
    backgroundColor: theme.colors.accentFill,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  signInCtaText: { fontFamily: edFonts.bodyBlack, fontSize: 13.5, color: theme.colors.onAccent },
  commentInput: {
    minHeight: 72,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.controlBorder,
    backgroundColor: theme.colors.surfaceRaised,
    color: theme.colors.text,
    fontFamily: edFonts.bodyMedium,
    fontSize: 13.5,
    padding: 12,
    textAlignVertical: 'top',
  },
  commentPost: {
    alignSelf: 'flex-start',
    minHeight: 44,
    borderRadius: 999,
    backgroundColor: theme.colors.accentFill,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentPostText: { fontFamily: edFonts.bodyBlack, fontSize: 12.5, color: theme.colors.onAccent },
  commentRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  commentAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentBody: { fontFamily: edFonts.bodyMedium, fontSize: 13, lineHeight: 19, color: theme.colors.text },
  commentTime: { fontFamily: edFonts.bodyMedium, fontSize: 10.5, color: theme.colors.textMuted },
  commentsEmpty: { fontFamily: edFonts.bodyMedium, fontSize: 13, lineHeight: 19, color: theme.colors.textMuted, textAlign: 'center', paddingVertical: 6 },

  streamChip: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.controlBorder,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  streamChipText: { fontFamily: edFonts.bodyBold, fontSize: 12.5, color: theme.colors.text },
  lyrics: { fontFamily: edFonts.bodyMedium, fontSize: 13.5, lineHeight: 22, color: theme.colors.textSecondary },

  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    minHeight: 44,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
  },
  balanceLabel: { fontFamily: edFonts.mono, fontSize: 9, letterSpacing: 1.4, color: theme.colors.textMuted },
  balanceValue: { fontFamily: edFonts.bodyBlack, fontSize: 17, color: theme.colors.text, marginTop: 3 },
  balanceCta: { fontFamily: edFonts.bodyBlack, fontSize: 13, color: theme.colors.accentText },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: theme.colors.overlay },
  playlistSheet: { maxHeight: '72%', borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: theme.colors.surfaceRaised, borderWidth: 1, borderColor: theme.colors.border, padding: 20, paddingBottom: 34, gap: 14 },
  playlistSheetTitle: { marginTop: 4, fontFamily: edFonts.bodyBlack, fontSize: 24, color: theme.colors.text },
  modalClose: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center' },
  playlistRow: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: 1, borderColor: theme.colors.divider, paddingVertical: 12 },
  playlistName: { fontFamily: edFonts.bodyBlack, fontSize: 15, color: theme.colors.text },
  playlistMeta: { marginTop: 3, fontFamily: edFonts.mono, fontSize: 10, color: theme.colors.textMuted },
  emptyPlaylists: { gap: 7, paddingVertical: 22 },
  }), [theme]);
}
