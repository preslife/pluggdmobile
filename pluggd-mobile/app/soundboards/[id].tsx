import { MaterialIcons } from '@expo/vector-icons';
import { pluggdFonts } from '../../src/design/typography';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useLocalSearchParams, usePathname, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, Modal, Pressable, ScrollView, Share, StyleSheet, Switch, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { RecoveryState } from '../../components/ContentUI';
import { useAuth } from '../../src/context/AuthProvider';
import { usePlayback } from '../../src/context/PlaybackProvider';
import {
  addSoundboardComment,
  addSoundboardItemComment,
  loadSoundboardItemDetails,
  logSoundboardItemPlay,
  resolveSoundboardPlaybackUrl,
  toggleSavedContent,
  toggleSoundboardItemReaction,
  uploadSocialMediaAsset,
} from '../../src/features/culture/mobileServices';
import { supabase } from '../../src/lib/supabase';
import { useBottomChromeInset } from '../../src/design/useBottomChromeInset';
import { NativeSoundboardCanvas } from '../../src/features/soundboards/NativeSoundboardCanvas';
import { resolveNativeCanvasLayout, writeNativeCanvasLayout, type NativeCanvasLayout, type NativeSoundboardItem } from '../../src/features/soundboards/nativeSoundboardLayout';
import {
  SoundboardContentItem,
  SoundboardItem,
  formatCompact,
  toTrack,
} from '../../src/lib/mobileContent';
import { usePluggdTheme } from '../../src/design/usePluggdTheme';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type BoardVisibility = 'private' | 'link' | 'public';
type NativeBoard = SoundboardItem & {
  metadata?: Record<string, unknown> | null;
  allow_comments?: boolean | null;
  allow_downloads?: boolean | null;
  visibility?: BoardVisibility | null;
  is_published?: boolean | null;
};

function FocusVideo({ uri }: { uri: string }) {
  const detailStyles = useSoundboardStyles();
  const player = useVideoPlayer(uri, (instance) => {
    instance.loop = false;
  });
  return <VideoView player={player} style={detailStyles.focusMedia} nativeControls contentFit="contain" />;
}

export default function SoundboardDetailScreen() {
  const theme = usePluggdTheme();
  const detailStyles = useSoundboardStyles();
  const bottomInset = useBottomChromeInset();
  const { width: viewportWidth } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const studioMode = pathname.startsWith('/studio/soundboards/');
  const studioReturnRoute = '/studio/catalog?tab=soundboards';
  const { user } = useAuth();
  const { playTrack, playQueue, currentTrack, isPlaying, progress, seekTo, togglePlayPause } = usePlayback();
  const [board, setBoard] = useState<NativeBoard | null>(null);
  const [items, setItems] = useState<NativeSoundboardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowingCreator, setIsFollowingCreator] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [boardComments, setBoardComments] = useState<Array<{ id: string; content: string; created_at: string }>>([]);
  const [commentText, setCommentText] = useState('');
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [focusItem, setFocusItem] = useState<NativeSoundboardItem | null>(null);
  const [boardLiked, setBoardLiked] = useState(false);
  const [editorMode, setEditorMode] = useState(studioMode);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [savingLayoutId, setSavingLayoutId] = useState<string | null>(null);
  const [seekWidth, setSeekWidth] = useState(1);
  const [creatorName, setCreatorName] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerTitle, setComposerTitle] = useState('');
  const [composerText, setComposerText] = useState('');
  const [addingItem, setAddingItem] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsTitle, setSettingsTitle] = useState('');
  const [settingsDescription, setSettingsDescription] = useState('');
  const [settingsVisibility, setSettingsVisibility] = useState<BoardVisibility>('private');
  const [settingsPublished, setSettingsPublished] = useState(false);
  const [settingsComments, setSettingsComments] = useState(true);
  const [settingsDownloads, setSettingsDownloads] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const lookup = String(id || '').trim();
      const boardQuery = (supabase as any)
        .from('soundboards')
        .select('id,creator_id,slug,title,description,cover_image_url,metadata,item_count,like_count,comment_count,follower_count,allow_comments,allow_downloads,visibility,is_published,last_activity_at,created_at');
      const boardRes = await (UUID_PATTERN.test(lookup) ? boardQuery.eq('id', lookup) : boardQuery.eq('slug', lookup)).maybeSingle();
      const nextBoard = boardRes.error ? null : (boardRes.data as NativeBoard | null);
      const detail = nextBoard ? await loadSoundboardItemDetails(nextBoard.id) : { items: [], boardComments: [] };

      if (!mounted) return;
      setBoard(nextBoard);
      setItems(detail.items as NativeSoundboardItem[]);
      setBoardComments(detail.boardComments.map((row) => ({ id: row.id, content: row.content, created_at: row.created_at })));
      if (nextBoard?.creator_id) {
        const { data: profile } = await (supabase as any).from('public_profiles').select('full_name,username').eq('user_id', nextBoard.creator_id).maybeSingle();
        if (mounted && profile) setCreatorName(profile.full_name || profile.username || null);
      }
      setLoading(false);
    };
    if (id) load();
    return () => {
      mounted = false;
    };
  }, [id]);

  useEffect(() => {
    let mounted = true;

    const checkFollow = async () => {
      if (!board?.creator_id) {
        setIsFollowingCreator(false);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted || !user) {
        if (mounted) setIsFollowingCreator(false);
        return;
      }

      const { data } = await (supabase as any)
        .from('user_follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', board.creator_id)
        .maybeSingle();

      if (mounted) setIsFollowingCreator(Boolean(data));
    };

    void checkFollow();

    return () => {
      mounted = false;
    };
  }, [board?.creator_id]);

  useEffect(() => {
    let mounted = true;
    if (!board?.id || !user?.id) {
      setBoardLiked(false);
      return () => {
        mounted = false;
      };
    }
    void (supabase as any)
      .from('soundboard_likes')
      .select('soundboard_id')
      .eq('soundboard_id', board.id)
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }: { data: unknown }) => {
        if (mounted) setBoardLiked(Boolean(data));
      });
    return () => {
      mounted = false;
    };
  }, [board?.id, user?.id]);

  const isOwner = Boolean(user?.id && board?.creator_id === user.id);
  const activeAudioItemId = currentTrack?.soundboardItemId || null;
  const totalPlays = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.plays_count || 0), 0),
    [items],
  );
  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedItemId) || null,
    [items, selectedItemId],
  );

  const audioItems = items.filter((item) => item.item_type === 'audio' && item.media_url);

  const playAll = async () => {
    const playableItems = await Promise.all(
      audioItems.map(async (item) => {
        const playableUrl = await resolveSoundboardPlaybackUrl(item.id, item.media_url);
        return playableUrl ? { ...item, media_url: playableUrl } : null;
      }),
    );
    const tracks = playableItems.flatMap((item) => {
      if (!item) return [];
      const track = toTrack(item, 'soundboard');
      return track ? [track] : [];
    });
    if (tracks.length) {
      playQueue(tracks as any);
      return;
    }

    Alert.alert('No public audio', 'This soundboard does not have playable public audio yet.');
  };

  const toggleCreatorFollow = async () => {
    if (!board?.creator_id || followLoading) {
      Alert.alert('Follow unavailable', 'This soundboard is not linked to a creator profile yet.');
      return;
    }

    setFollowLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/auth/login' as any);
        return;
      }

      if (isFollowingCreator) {
        const { error } = await (supabase as any)
          .from('user_follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', board.creator_id);
        if (error) throw error;
        setIsFollowingCreator(false);
        return;
      }

      const { error } = await (supabase as any).from('user_follows').insert({
        follower_id: user.id,
        following_id: board.creator_id,
      });

      if (error) throw error;
      setIsFollowingCreator(true);
    } catch (error: any) {
      Alert.alert('Follow failed', error?.message ?? 'Could not update this follow right now.');
    } finally {
      setFollowLoading(false);
    }
  };

  const saveSoundboard = async () => {
    if (!board || saving) return;
    setSaving(true);
    const result = await toggleSavedContent('soundboard', board.id);
    setSaving(false);
    Alert.alert(result.success ? (result.saved ? 'Saved' : 'Removed') : 'Save unavailable', result.success ? `${board.title || 'Soundboard'} library state updated.` : result.error || 'Please try again.');
  };

  const shareSoundboard = async () => {
    if (!board) return;
    await Share.share({ message: `${board.title || 'PLUGGD Soundboard'}\nhttps://pluggd.com/soundboards/${encodeURIComponent(board.slug || board.id)}` });
  };

  const openShareActions = () => {
    if (!board) return;
    Alert.alert('Share Soundboard', 'Choose how you want to share this canvas.', [
      {
        text: 'Post to Community',
        onPress: () => router.push({ pathname: '/create-post', params: { boardId: board.id, type: 'post' } } as any),
      },
      { text: 'Share link', onPress: () => void shareSoundboard() },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const toggleBoardLike = async () => {
    if (!board) return;
    if (!user?.id) {
      router.push(`/auth/login?redirect=${encodeURIComponent(`/soundboards/${board.slug || board.id}`)}` as any);
      return;
    }
    const next = !boardLiked;
    setBoardLiked(next);
    setBoard((current) => current ? { ...current, like_count: Math.max(0, Number(current.like_count || 0) + (next ? 1 : -1)) } : current);
    const request = next
      ? (supabase as any).from('soundboard_likes').insert({ soundboard_id: board.id, user_id: user.id })
      : (supabase as any).from('soundboard_likes').delete().eq('soundboard_id', board.id).eq('user_id', user.id);
    const { error } = await request;
    if (error) {
      setBoardLiked(!next);
      setBoard((current) => current ? { ...current, like_count: Math.max(0, Number(current.like_count || 0) + (next ? -1 : 1)) } : current);
      Alert.alert('Like unavailable', 'Could not update this Soundboard right now.');
    }
  };

  const playCanvasAudio = async (item: NativeSoundboardItem) => {
    if (activeAudioItemId === item.id) {
      await togglePlayPause();
      return;
    }
    const playableUrl = await resolveSoundboardPlaybackUrl(item.id, item.media_url);
    const track = playableUrl ? toTrack({ ...item, media_url: playableUrl }, 'soundboard') : null;
    if (!track) {
      Alert.alert('Audio unavailable', 'This Soundboard audio cannot be reached right now.');
      return;
    }
    void logSoundboardItemPlay(item.id);
    await playTrack({ ...track, artist: creatorName || board?.title || 'PLUGGD Soundboard', artwork: board?.cover_image_url || undefined });
  };

  const openCanvasItem = (item: NativeSoundboardItem) => {
    if (item.item_type === 'link') {
      const url = item.external_url?.trim();
      if (url && /^https?:\/\//i.test(url)) void Linking.openURL(url);
      return;
    }
    setFocusItem(item);
  };

  const commitCanvasLayout = async (item: NativeSoundboardItem, layout: NativeCanvasLayout) => {
    if (!board || !user?.id || !isOwner || savingLayoutId) return;
    const previous = item.metadata || null;
    const metadata = writeNativeCanvasLayout(previous, layout);
    setSavingLayoutId(item.id);
    setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, metadata } : entry));
    const { error } = await (supabase as any)
      .from('soundboard_items')
      .update({ metadata })
      .eq('id', item.id)
      .eq('soundboard_id', board.id)
      .eq('creator_id', user.id);
    if (error) {
      setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, metadata: previous } : entry));
      Alert.alert('Canvas not saved', 'Your last layout change could not be saved.');
    }
    setSavingLayoutId(null);
  };

  const nudgeSelected = (direction: 'rotate' | 'front' | 'back') => {
    if (!selectedItem) return;
    const index = items.findIndex((item) => item.id === selectedItem.id);
    const layout = resolveNativeCanvasLayout(selectedItem, index);
    void commitCanvasLayout(selectedItem, {
      ...layout,
      rotation: direction === 'rotate' ? layout.rotation + 5 : layout.rotation,
      zIndex: direction === 'front' ? layout.zIndex + 1 : direction === 'back' ? Math.max(0, layout.zIndex - 1) : layout.zIndex,
    });
  };

  const insertSoundboardItem = async (payload: {
    itemType: 'note' | 'image' | 'audio' | 'video';
    title?: string | null;
    contentText?: string | null;
    mediaUrl?: string | null;
    durationSeconds?: number | null;
  }) => {
    if (!board || !user?.id || !isOwner || addingItem) return;
    const position = items.length ? Math.max(...items.map((item) => Number(item.position || 0))) + 1 : 0;
    const size = payload.itemType === 'audio'
      ? { width: 340, height: 190 }
      : payload.itemType === 'note'
        ? { width: 270, height: 270 }
        : { width: 300, height: 300 };
    const metadata = writeNativeCanvasLayout(null, {
      x: 48 + (position % 2) * 380,
      y: 48 + Math.floor(position / 2) * 330,
      width: size.width,
      height: size.height,
      rotation: [-2.5, 1.4, -0.8, 2.2][position % 4],
      zIndex: 20 + position,
      locked: false,
      fit: 'contain',
    });
    setAddingItem(true);
    const { data, error } = await (supabase as any)
      .from('soundboard_items')
      .insert({
        soundboard_id: board.id,
        creator_id: user.id,
        item_type: payload.itemType,
        title: payload.title?.trim() || null,
        content_text: payload.contentText?.trim() || null,
        media_url: payload.mediaUrl || null,
        duration_seconds: payload.durationSeconds || null,
        position,
        allow_comments: true,
        allow_download: false,
        metadata,
      })
      .select('id,soundboard_id,creator_id,item_type,title,description,content_text,media_url,external_url,duration_seconds,is_pinned,plays_count,likes_count,comments_count,position,metadata,waveform_data,allow_comments,created_at,updated_at')
      .single();
    setAddingItem(false);
    if (error || !data) {
      Alert.alert('Item not added', error?.message || 'Could not add this card to the Soundboard.');
      return;
    }
    setItems((current) => [...current, data as NativeSoundboardItem]);
    setSelectedItemId(data.id);
  };

  const addNote = async () => {
    const text = composerText.trim();
    if (!text) return;
    await insertSoundboardItem({ itemType: 'note', title: composerTitle, contentText: text });
    setComposerTitle('');
    setComposerText('');
    setComposerOpen(false);
  };

  const pickAndAddMedia = async (itemType: 'image' | 'video' | 'audio') => {
    if (!board || !isOwner || addingItem) return;
    let asset: { uri: string; name?: string | null; mimeType?: string | null; duration?: number | null } | null = null;
    if (itemType === 'audio') {
      const result = await DocumentPicker.getDocumentAsync({ type: ['audio/*', 'audio/mpeg', 'audio/wav', 'audio/mp4'], copyToCacheDirectory: true, multiple: false });
      if (!result.canceled && result.assets[0]?.uri) {
        const picked = result.assets[0];
        asset = { uri: picked.uri, name: picked.name, mimeType: picked.mimeType || 'audio/mpeg' };
      }
    } else {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', `Allow photo library access to add ${itemType}.`);
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: itemType === 'image' ? ImagePicker.MediaTypeOptions.Images : ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: false,
        quality: 0.9,
        videoMaxDuration: itemType === 'video' ? 180 : undefined,
      });
      if (!result.canceled && result.assets[0]?.uri) {
        const picked = result.assets[0];
        asset = {
          uri: picked.uri,
          name: picked.fileName,
          mimeType: picked.mimeType || (itemType === 'image' ? 'image/jpeg' : 'video/mp4'),
          duration: picked.duration ? Math.round(picked.duration / 1000) : null,
        };
      }
    }
    if (!asset) return;
    setAddingItem(true);
    const upload = await uploadSocialMediaAsset({
      uri: asset.uri,
      fileName: asset.name,
      mimeType: asset.mimeType,
      folder: `soundboard-${board.id}`,
      quarantine: false,
    });
    setAddingItem(false);
    if (!upload.success || !upload.url) {
      Alert.alert('Upload failed', upload.error || 'Could not upload this Soundboard item.');
      return;
    }
    const defaultTitle = asset.name?.replace(/\.[^.]+$/, '').trim() || (itemType === 'audio' ? 'Audio idea' : itemType === 'video' ? 'Video reference' : 'Visual reference');
    await insertSoundboardItem({ itemType, title: defaultTitle, mediaUrl: upload.url, durationSeconds: asset.duration });
  };

  const openBoardSettings = () => {
    if (!board || !isOwner) return;
    setSettingsTitle(board.title || '');
    setSettingsDescription(board.description || '');
    setSettingsVisibility(board.visibility === 'public' || board.visibility === 'link' ? board.visibility : 'private');
    setSettingsPublished(Boolean(board.is_published));
    setSettingsComments(board.allow_comments !== false);
    setSettingsDownloads(Boolean(board.allow_downloads));
    setSettingsOpen(true);
  };

  const saveBoardSettings = async () => {
    if (!board || !user?.id || !isOwner || settingsSaving) return;
    const cleanTitle = settingsTitle.trim();
    if (!cleanTitle) {
      Alert.alert('Name your Soundboard', 'The board needs a title before these settings can be saved.');
      return;
    }
    setSettingsSaving(true);
    const { data, error } = await (supabase as any)
      .from('soundboards')
      .update({
        title: cleanTitle,
        description: settingsDescription.trim() || null,
        visibility: settingsVisibility,
        is_published: settingsPublished,
        allow_comments: settingsComments,
        allow_downloads: settingsDownloads,
      })
      .eq('id', board.id)
      .eq('creator_id', user.id)
      .select('id,title,description,visibility,is_published,allow_comments,allow_downloads')
      .single();
    setSettingsSaving(false);
    if (error || !data) {
      Alert.alert('Settings not saved', error?.message || 'Your Soundboard was not changed.');
      return;
    }
    setBoard((current) => current ? { ...current, ...data } : current);
    setSettingsOpen(false);
    Alert.alert(settingsPublished ? 'Soundboard settings saved' : 'Draft settings saved', settingsPublished ? 'The board now follows the access setting you chose.' : 'The board remains unpublished.');
  };

  const openPublicBoard = () => {
    if (!board) return;
    setSettingsOpen(false);
    router.push(`/soundboards/${encodeURIComponent(board.slug || board.id)}` as any);
  };

  const submitBoardComment = async () => {
    if (!board) return;
    const result = await addSoundboardComment(board.id, commentText);
    if (!result.success) {
      Alert.alert('Comment unavailable', result.error || 'Could not post this comment.');
      return;
    }
    setBoardComments((current) => [{ id: `local-${Date.now()}`, content: commentText.trim(), created_at: new Date().toISOString() }, ...current]);
    setCommentText('');
  };

  const reactToItem = async (item: SoundboardContentItem) => {
    const result = await toggleSoundboardItemReaction(item.id, 'fire');
    Alert.alert(result.success ? 'Reaction updated' : 'Reaction unavailable', result.success ? 'Your reaction was saved.' : result.error || 'Soundboard item reactions are not available yet.');
  };

  const commentOnItem = async (item: SoundboardContentItem) => {
    Alert.prompt(
      'Comment on item',
      item.title || 'Soundboard item',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Post',
          onPress: async (value?: string) => {
            const result = await addSoundboardItemComment(item.id, value || '');
            Alert.alert(result.success ? 'Item comment added' : 'Item comments unavailable', result.success ? 'Your comment was saved.' : result.error || 'Soundboard item comments are not available yet.');
          },
        },
      ],
      'plain-text',
    );
  };

  if (loading) {
    return <View style={detailStyles.loading}><StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} /><ActivityIndicator color={theme.colors.accentText} /></View>;
  }

  if (!board) {
    return (
      <View style={detailStyles.screen}>
        <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
        <RecoveryState
          eyebrow="BOARD OFFLINE"
          title="This Soundboard is out of reach"
          body="It may be private, archived or shared under a new link."
          icon="dashboard-customize"
          primaryLabel="Explore Soundboards"
          onPrimary={() => router.replace((studioMode ? studioReturnRoute : '/soundboards') as any)}
          secondaryLabel="Go back"
          onSecondary={() => (router.canGoBack() ? router.back() : router.replace((studioMode ? studioReturnRoute : '/soundboards') as any))}
        />
      </View>
    );
  }

  const focusedAudioIsCurrent = Boolean(focusItem?.item_type === 'audio' && activeAudioItemId === focusItem.id);
  const rawFocusedDuration = focusedAudioIsCurrent ? progress.duration || focusItem?.duration_seconds || 0 : focusItem?.duration_seconds || 0;
  const rawFocusedPosition = focusedAudioIsCurrent ? progress.position : 0;
  const focusedDuration = Number.isFinite(rawFocusedDuration) ? Math.max(0, rawFocusedDuration) : 0;
  const focusedPosition = Number.isFinite(rawFocusedPosition) ? Math.max(0, rawFocusedPosition) : 0;
  const canvasWidth = Math.max(280, viewportWidth - 28);

  return (
    <View style={detailStyles.screen}>
      <StatusBar style={focusItem || theme.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[detailStyles.content, { paddingBottom: Math.max(bottomInset, 36) }]}>
        <View style={detailStyles.identityBar}>
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" hitSlop={8} style={detailStyles.iconButton} onPress={() => (router.canGoBack() ? router.back() : router.replace((studioMode ? studioReturnRoute : '/soundboards') as any))}>
            <MaterialIcons name="chevron-left" size={26} color={theme.colors.text} />
          </Pressable>
          <View style={detailStyles.identityCopy}>
            <Text style={detailStyles.boardTitle} numberOfLines={2}>{board.title || 'Untitled Soundboard'}</Text>
            <Text style={detailStyles.creatorLine} numberOfLines={1}>{creatorName || 'PLUGGD creator'} · Soundboard</Text>
          </View>
          {isOwner ? (
            <Pressable accessibilityRole="button" accessibilityLabel={editorMode ? 'Finish editing canvas' : 'Edit Soundboard canvas'} style={[detailStyles.editToggle, editorMode && detailStyles.editToggleActive]} onPress={() => setEditorMode((value) => !value)}>
              <MaterialIcons name={editorMode ? 'check' : 'edit'} size={17} color={editorMode ? theme.colors.onAccent : theme.colors.text} />
              <Text style={[detailStyles.editToggleText, editorMode && detailStyles.editToggleTextActive]}>{editorMode ? 'Done' : 'Edit'}</Text>
            </Pressable>
          ) : null}
        </View>

        {studioMode && isOwner ? (
          <View style={detailStyles.ownerStatusRow}>
            <View style={detailStyles.ownerStatusCopy}>
              <View style={[detailStyles.statusDot, board.is_published && detailStyles.statusDotLive]} />
              <View>
                <Text style={detailStyles.ownerStatusTitle}>{board.is_published ? 'Published' : 'Unpublished draft'}</Text>
                <Text style={detailStyles.ownerStatusMeta}>{board.visibility === 'public' ? 'Public discovery' : board.visibility === 'link' ? 'Link access' : 'Private access'}</Text>
              </View>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Open Soundboard settings" style={detailStyles.settingsButton} onPress={openBoardSettings}>
              <MaterialIcons name="tune" size={19} color={theme.colors.backstage} />
              <Text style={detailStyles.settingsButtonText}>Settings</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={detailStyles.metricsRow}>
              <View><Text style={detailStyles.metricValue}>{formatCompact(totalPlays)}</Text><Text style={detailStyles.metricLabel}>TOTAL PLAYS</Text></View>
              <View style={detailStyles.metricRule} />
              <View><Text style={detailStyles.metricValue}>{formatCompact(board.follower_count)}</Text><Text style={detailStyles.metricLabel}>FOLLOWERS</Text></View>
            </View>

            <View style={detailStyles.actionsRow}>
              <Pressable accessibilityRole="button" accessibilityLabel={boardLiked ? 'Unlike Soundboard' : 'Like Soundboard'} accessibilityState={{ selected: boardLiked }} style={[detailStyles.actionButton, boardLiked && detailStyles.actionButtonActive]} onPress={() => void toggleBoardLike()}>
                <MaterialIcons name={boardLiked ? 'favorite' : 'favorite-border'} size={19} color={boardLiked ? theme.colors.onAccent : theme.colors.backstage} /><Text style={[detailStyles.actionText, boardLiked && detailStyles.actionTextActive]}>Like</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Open Soundboard comments" style={detailStyles.actionButton} onPress={() => setCommentsOpen(true)}>
                <MaterialIcons name="chat-bubble-outline" size={18} color={theme.colors.backstage} /><Text style={detailStyles.actionText}>Comment</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Share Soundboard" style={detailStyles.actionButton} onPress={openShareActions}>
                <MaterialIcons name="ios-share" size={19} color={theme.colors.backstage} /><Text style={detailStyles.actionText}>Share</Text>
              </Pressable>
            </View>
          </>
        )}

        <NativeSoundboardCanvas
          items={items}
          boardMetadata={board.metadata}
          boardArtwork={board.cover_image_url}
          width={canvasWidth}
          height={editorMode && isOwner ? Math.max(520, viewportWidth * 1.32) : undefined}
          mode={editorMode && isOwner ? 'editor' : 'public'}
          selectedItemId={selectedItemId}
          activeAudioItemId={activeAudioItemId}
          isAudioPlaying={isPlaying}
          onOpenItem={openCanvasItem}
          onToggleAudio={(item) => void playCanvasAudio(item)}
          onSelectItem={(item) => setSelectedItemId(item.id)}
          onCommitLayout={(item, layout) => void commitCanvasLayout(item, layout)}
        />

        {editorMode && isOwner ? (
          <View style={detailStyles.editorDock}>
            <Text style={detailStyles.editorDockLabel}>{addingItem ? 'ADDING TO CANVAS…' : 'INSERT'}</Text>
            <View style={detailStyles.editorTools}>
              <EditorTool icon="note-add" label="Note" onPress={() => setComposerOpen(true)} disabled={addingItem} />
              <EditorTool icon="image" label="Image" onPress={() => void pickAndAddMedia('image')} disabled={addingItem} />
              <EditorTool icon="graphic-eq" label="Audio" onPress={() => void pickAndAddMedia('audio')} disabled={addingItem} />
              <EditorTool icon="videocam" label="Video" onPress={() => void pickAndAddMedia('video')} disabled={addingItem} />
            </View>
            <Text style={detailStyles.editorDockLabel}>{savingLayoutId ? 'SAVING CANVAS…' : selectedItem ? `EDITING ${selectedItem.title || selectedItem.item_type}` : 'TAP A CARD TO EDIT'}</Text>
            <View style={detailStyles.editorTools}>
              <EditorTool icon="rotate-right" label="Rotate" onPress={() => nudgeSelected('rotate')} disabled={!selectedItem} />
              <EditorTool icon="flip-to-front" label="Front" onPress={() => nudgeSelected('front')} disabled={!selectedItem} />
              <EditorTool icon="flip-to-back" label="Back" onPress={() => nudgeSelected('back')} disabled={!selectedItem} />
            </View>
          </View>
        ) : null}
      </ScrollView>

      <Modal visible={settingsOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => !settingsSaving && setSettingsOpen(false)}>
        <View style={detailStyles.modalScreen}>
          <View style={detailStyles.modalHeader}>
            <View><Text style={detailStyles.modalEyebrow}>OWNER WORKSPACE</Text><Text style={detailStyles.modalTitle}>Board settings</Text></View>
            <Pressable accessibilityRole="button" accessibilityLabel="Close Soundboard settings" style={detailStyles.modalClose} disabled={settingsSaving} onPress={() => setSettingsOpen(false)}><MaterialIcons name="close" size={22} color={theme.colors.text} /></Pressable>
          </View>
          <ScrollView contentContainerStyle={detailStyles.settingsBody} keyboardShouldPersistTaps="handled">
            <View>
              <Text style={detailStyles.settingsLabel}>TITLE</Text>
              <TextInput value={settingsTitle} onChangeText={setSettingsTitle} placeholder="Soundboard title" placeholderTextColor={theme.colors.textSubtle} style={detailStyles.settingsInput} maxLength={120} />
            </View>
            <View>
              <Text style={detailStyles.settingsLabel}>DESCRIPTION</Text>
              <TextInput value={settingsDescription} onChangeText={setSettingsDescription} placeholder="What is this board for?" placeholderTextColor={theme.colors.textSubtle} style={detailStyles.settingsTextArea} multiline maxLength={1000} />
            </View>

            <View>
              <Text style={detailStyles.settingsLabel}>ACCESS</Text>
              <View style={detailStyles.settingsVisibility}>
                {(['private', 'link', 'public'] as BoardVisibility[]).map((option) => {
                  const label = option === 'private' ? 'Private' : option === 'link' ? 'Link only' : 'Public';
                  const detail = option === 'private' ? 'Only you can open it.' : option === 'link' ? 'Available to people with its link.' : 'Eligible for Soundboard discovery.';
                  return (
                    <Pressable key={option} accessibilityRole="radio" accessibilityState={{ checked: settingsVisibility === option }} accessibilityLabel={`${label}. ${detail}`} style={[detailStyles.settingsVisibilityRow, settingsVisibility === option && detailStyles.settingsVisibilityRowActive]} onPress={() => setSettingsVisibility(option)}>
                      <View style={[detailStyles.settingsRadio, settingsVisibility === option && detailStyles.settingsRadioActive]}>{settingsVisibility === option ? <View style={detailStyles.settingsRadioDot} /> : null}</View>
                      <View style={detailStyles.settingsVisibilityCopy}><Text style={detailStyles.settingsVisibilityTitle}>{label}</Text><Text style={detailStyles.settingsVisibilityDetail}>{detail}</Text></View>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={detailStyles.settingsSwitchCard}>
              <View style={detailStyles.settingsSwitchCopy}><Text style={detailStyles.settingsSwitchTitle}>Publish board</Text><Text style={detailStyles.settingsSwitchDetail}>Make this version available according to the access setting above.</Text></View>
              <Switch value={settingsPublished} onValueChange={setSettingsPublished} trackColor={{ false: theme.colors.surfacePressed, true: theme.colors.accentFill }} thumbColor={theme.colors.surfaceRaised} />
            </View>
            <View style={detailStyles.settingsSwitchCard}>
              <View style={detailStyles.settingsSwitchCopy}><Text style={detailStyles.settingsSwitchTitle}>Allow comments</Text><Text style={detailStyles.settingsSwitchDetail}>Let viewers discuss the board and its work.</Text></View>
              <Switch value={settingsComments} onValueChange={setSettingsComments} trackColor={{ false: theme.colors.surfacePressed, true: theme.colors.accentFill }} thumbColor={theme.colors.surfaceRaised} />
            </View>
            <View style={detailStyles.settingsSwitchCard}>
              <View style={detailStyles.settingsSwitchCopy}><Text style={detailStyles.settingsSwitchTitle}>Allow downloads</Text><Text style={detailStyles.settingsSwitchDetail}>Only applies to board items that are separately marked downloadable.</Text></View>
              <Switch value={settingsDownloads} onValueChange={setSettingsDownloads} trackColor={{ false: theme.colors.surfacePressed, true: theme.colors.accentFill }} thumbColor={theme.colors.surfaceRaised} />
            </View>

            <View style={detailStyles.settingsNotice}><MaterialIcons name="info-outline" size={19} color={theme.colors.backstage} /><Text style={detailStyles.settingsNoticeText}>{settingsPublished ? `Saving will make this board ${settingsVisibility === 'public' ? 'publicly discoverable' : settingsVisibility === 'link' ? 'available by link' : 'published but private'}.` : 'This board will remain an unpublished owner draft.'}</Text></View>

            <Pressable accessibilityRole="button" accessibilityLabel="Save Soundboard settings" accessibilityState={{ disabled: settingsSaving || !settingsTitle.trim() }} disabled={settingsSaving || !settingsTitle.trim()} style={[detailStyles.settingsSave, (settingsSaving || !settingsTitle.trim()) && detailStyles.disabled]} onPress={() => void saveBoardSettings()}>
              {settingsSaving ? <ActivityIndicator color={theme.colors.onAccent} /> : <><Text style={detailStyles.settingsSaveText}>Save settings</Text><MaterialIcons name="check" size={20} color={theme.colors.onAccent} /></>}
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="View the public Soundboard presentation" style={detailStyles.publicViewButton} onPress={openPublicBoard}>
              <Text style={detailStyles.publicViewButtonText}>View public presentation</Text><MaterialIcons name="open-in-new" size={18} color={theme.colors.text} />
            </Pressable>
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={commentsOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setCommentsOpen(false)}>
        <View style={detailStyles.modalScreen}>
          <View style={detailStyles.modalHeader}><View><Text style={detailStyles.modalEyebrow}>SOUNDBOARD</Text><Text style={detailStyles.modalTitle}>Comments</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Close comments" style={detailStyles.modalClose} onPress={() => setCommentsOpen(false)}><MaterialIcons name="close" size={22} color={theme.colors.text} /></Pressable></View>
          <ScrollView contentContainerStyle={detailStyles.commentList} keyboardShouldPersistTaps="handled">
            <View style={detailStyles.commentComposer}>
              <TextInput value={commentText} onChangeText={setCommentText} placeholder="Add to the conversation" placeholderTextColor={theme.colors.textSubtle} style={detailStyles.commentInput} multiline />
              <Pressable accessibilityRole="button" accessibilityLabel="Post Soundboard comment" style={[detailStyles.commentPost, !commentText.trim() && detailStyles.disabled]} disabled={!commentText.trim()} onPress={() => void submitBoardComment()}><Text style={detailStyles.commentPostText}>Post</Text></Pressable>
            </View>
            {boardComments.length ? boardComments.map((comment) => <View key={comment.id} style={detailStyles.commentCard}><Text style={detailStyles.commentBody}>{comment.content}</Text><Text style={detailStyles.commentMeta}>{new Date(comment.created_at).toLocaleDateString('en-GB')}</Text></View>) : <Text style={detailStyles.commentsEmpty}>No comments yet. Start the conversation around this work in progress.</Text>}
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={composerOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setComposerOpen(false)}>
        <View style={detailStyles.modalScreen}>
          <View style={detailStyles.modalHeader}><View><Text style={detailStyles.modalEyebrow}>INSERT</Text><Text style={detailStyles.modalTitle}>New note</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Close note composer" style={detailStyles.modalClose} onPress={() => setComposerOpen(false)}><MaterialIcons name="close" size={22} color={theme.colors.text} /></Pressable></View>
          <View style={detailStyles.composerBody}>
            <TextInput value={composerTitle} onChangeText={setComposerTitle} placeholder="Note title" placeholderTextColor={theme.colors.textSubtle} style={detailStyles.composerTitle} maxLength={100} />
            <TextInput value={composerText} onChangeText={setComposerText} placeholder="Write the complete note…" placeholderTextColor={theme.colors.textSubtle} style={detailStyles.composerText} multiline autoFocus maxLength={5000} />
            <Pressable accessibilityRole="button" accessibilityLabel="Add note to Soundboard" accessibilityState={{ disabled: !composerText.trim() || addingItem }} disabled={!composerText.trim() || addingItem} style={[detailStyles.composerAdd, (!composerText.trim() || addingItem) && detailStyles.disabled]} onPress={() => void addNote()}>{addingItem ? <ActivityIndicator color={theme.colors.onAccent} /> : <><Text style={detailStyles.composerAddText}>Add to canvas</Text><MaterialIcons name="arrow-forward" size={20} color={theme.colors.onAccent} /></>}</Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={Boolean(focusItem)} animationType="fade" presentationStyle="fullScreen" onRequestClose={() => setFocusItem(null)}>
        <View style={detailStyles.focusScreen}>
          <View style={detailStyles.focusHeader}><View style={detailStyles.focusHeaderCopy}><Text style={detailStyles.modalEyebrow}>SOUNDBOARD ITEM</Text><Text style={detailStyles.focusTitle} numberOfLines={2}>{focusItem?.title || 'Soundboard item'}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Close item" style={[detailStyles.modalClose, detailStyles.focusClose]} onPress={() => setFocusItem(null)}><MaterialIcons name="close" size={22} color="#fff" /></Pressable></View>
          {focusItem?.item_type === 'image' && focusItem.media_url ? <Image source={{ uri: focusItem.media_url }} style={detailStyles.focusMedia} resizeMode="contain" /> : null}
          {focusItem?.item_type === 'video' && focusItem.media_url ? <FocusVideo uri={focusItem.media_url} /> : null}
          {focusItem?.item_type === 'audio' ? (
            <View style={detailStyles.audioFocus}>
              <View style={detailStyles.audioArtwork}>{board.cover_image_url ? <Image source={{ uri: board.cover_image_url }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : <MaterialIcons name="graphic-eq" size={68} color="#8b5cf6" />}</View>
              <Text style={detailStyles.audioTitle}>{focusItem.title || 'Audio idea'}</Text>
              <Text style={detailStyles.audioCreator}>{creatorName || board.title || 'PLUGGD Soundboard'}</Text>
              <View style={detailStyles.seekTimes}><Text style={detailStyles.seekTime}>{formatAudioTime(focusedPosition)}</Text><Text style={detailStyles.seekTime}>{formatAudioTime(focusedDuration)}</Text></View>
              {focusedDuration > 0 ? (
                <Pressable
                  accessibilityRole="adjustable"
                  accessibilityLabel="Audio progress"
                  accessibilityValue={{ min: 0, max: Math.round(focusedDuration), now: Math.round(Math.min(focusedPosition, focusedDuration)) }}
                  accessibilityActions={[{ name: 'increment', label: 'Forward 10 seconds' }, { name: 'decrement', label: 'Back 10 seconds' }]}
                  onAccessibilityAction={(event) => {
                    if (event.nativeEvent.actionName === 'increment') void seekTo(Math.min(focusedDuration, focusedPosition + 10));
                    if (event.nativeEvent.actionName === 'decrement') void seekTo(Math.max(0, focusedPosition - 10));
                  }}
                  style={detailStyles.seekTarget}
                  onLayout={(event) => setSeekWidth(Math.max(1, event.nativeEvent.layout.width))}
                  onPress={(event) => {
                    if (focusedAudioIsCurrent) void seekTo(Math.min(focusedDuration, Math.max(0, event.nativeEvent.locationX / seekWidth * focusedDuration)));
                  }}
                ><View style={detailStyles.seekTrack}><View style={[detailStyles.seekFill, { width: `${Math.min(100, focusedPosition / focusedDuration * 100)}%` }]} /></View></Pressable>
              ) : (
                <View accessible accessibilityLabel="Audio duration loading" style={detailStyles.seekTarget}><View style={detailStyles.seekTrack}><View style={[detailStyles.seekFill, { width: '0%' }]} /></View></View>
              )}
              <Pressable accessibilityRole="button" accessibilityLabel={focusedAudioIsCurrent && isPlaying ? 'Pause audio' : 'Play audio'} style={detailStyles.audioPlay} onPress={() => focusItem && void playCanvasAudio(focusItem)}><MaterialIcons name={focusedAudioIsCurrent && isPlaying ? 'pause' : 'play-arrow'} size={38} color="#fff" /></Pressable>
            </View>
          ) : null}
          {focusItem && !['image', 'video', 'audio'].includes(focusItem.item_type) ? <ScrollView contentContainerStyle={detailStyles.textFocus}><Text style={detailStyles.textFocusTitle}>{focusItem.title || 'Soundboard note'}</Text><Text style={detailStyles.textFocusBody}>{focusItem.content_text || focusItem.description || 'No additional text.'}</Text></ScrollView> : null}
        </View>
      </Modal>
    </View>
  );

}

function formatAudioTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00';
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

function EditorTool({ icon, label, onPress, disabled = false }: { icon: keyof typeof MaterialIcons.glyphMap; label: string; onPress: () => void; disabled?: boolean }) {
  const theme = usePluggdTheme();
  const detailStyles = useSoundboardStyles();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} style={[detailStyles.editorTool, disabled && detailStyles.disabled]} onPress={onPress}>
      <MaterialIcons name={icon} size={20} color={theme.colors.backstage} />
      <Text style={detailStyles.editorToolText}>{label}</Text>
    </Pressable>
  );
}

function useSoundboardStyles() {
  const theme = usePluggdTheme();
  return useMemo(() => StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  loading: { flex: 1, backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 14, paddingTop: 54, gap: 12 },
  identityBar: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.controlBorder },
  identityCopy: { flex: 1, minWidth: 0 },
  boardTitle: { color: theme.colors.text, fontFamily: pluggdFonts.displayBold, fontSize: 20, lineHeight: 24 },
  creatorLine: { color: theme.colors.textMuted, fontFamily: pluggdFonts.satoshiMedium, fontSize: 11.5, marginTop: 2 },
  editToggle: { minHeight: 44, borderRadius: 12, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.controlBorder },
  editToggleActive: { backgroundColor: theme.colors.accentFill, borderColor: theme.colors.controlBorder },
  editToggleText: { color: theme.colors.text, fontFamily: pluggdFonts.satoshiBold, fontSize: 11 },
  editToggleTextActive: { color: theme.colors.onAccent },
  ownerStatusRow: { minHeight: 60, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  ownerStatusCopy: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 9 },
  statusDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: theme.colors.textMuted },
  statusDotLive: { backgroundColor: theme.colors.success },
  ownerStatusTitle: { color: theme.colors.text, fontFamily: pluggdFonts.satoshiBold, fontSize: 12.5 },
  ownerStatusMeta: { color: theme.colors.textMuted, fontFamily: pluggdFonts.satoshiMedium, fontSize: 10.5, marginTop: 1 },
  settingsButton: { minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surfaceAlt, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
  settingsButtonText: { color: theme.colors.text, fontFamily: pluggdFonts.satoshiBold, fontSize: 11 },
  metricsRow: { minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 20, paddingHorizontal: 8 },
  metricValue: { color: theme.colors.text, fontFamily: pluggdFonts.displayBold, fontSize: 17 },
  metricLabel: { color: theme.colors.textMuted, fontFamily: pluggdFonts.satoshiBlack, fontSize: 8, letterSpacing: 1, marginTop: 2 },
  metricRule: { width: StyleSheet.hairlineWidth, height: 28, backgroundColor: theme.colors.border },
  actionsRow: { flexDirection: 'row', gap: 8 },
  actionButton: { flex: 1, minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  actionButtonActive: { backgroundColor: theme.colors.accentFill, borderColor: theme.colors.controlBorder },
  actionText: { color: theme.colors.text, fontFamily: pluggdFonts.satoshiBold, fontSize: 11.5 },
  actionTextActive: { color: theme.colors.onAccent },
  editorDock: { borderRadius: 18, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, padding: 10 },
  editorDockLabel: { color: theme.colors.backstage, fontFamily: pluggdFonts.satoshiBlack, fontSize: 9, letterSpacing: 1.1, marginTop: 10, marginBottom: 8 },
  editorTools: { flexDirection: 'row', gap: 8 },
  editorTool: { flex: 1, minHeight: 56, borderRadius: 13, borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', gap: 3 },
  editorToolText: { color: theme.colors.textSecondary, fontFamily: pluggdFonts.satoshiBold, fontSize: 9 },
  modalScreen: { flex: 1, backgroundColor: theme.colors.background, paddingTop: 22 },
  modalHeader: { minHeight: 66, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 18, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border },
  modalEyebrow: { color: theme.colors.backstage, fontFamily: pluggdFonts.satoshiBlack, fontSize: 9, letterSpacing: 1.2 },
  modalTitle: { color: theme.colors.text, fontFamily: pluggdFonts.displayBold, fontSize: 24, marginTop: 2 },
  modalClose: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center' },
  settingsBody: { padding: 18, paddingBottom: 54, gap: 18 },
  settingsLabel: { color: theme.colors.backstage, fontFamily: pluggdFonts.satoshiBlack, fontSize: 9, letterSpacing: 1.2, marginBottom: 7 },
  settingsInput: { minHeight: 54, borderRadius: 14, borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surface, paddingHorizontal: 14, color: theme.colors.text, fontFamily: pluggdFonts.displayBold, fontSize: 18 },
  settingsTextArea: { minHeight: 108, borderRadius: 14, borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surface, padding: 14, color: theme.colors.textSecondary, fontFamily: pluggdFonts.satoshiMedium, fontSize: 14, lineHeight: 21, textAlignVertical: 'top' },
  settingsVisibility: { borderRadius: 15, borderWidth: 1, borderColor: theme.colors.border, overflow: 'hidden' },
  settingsVisibilityRow: { minHeight: 68, paddingHorizontal: 13, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: theme.colors.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border },
  settingsVisibilityRowActive: { backgroundColor: theme.colors.accentSoft },
  settingsRadio: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: theme.colors.controlBorder, alignItems: 'center', justifyContent: 'center' },
  settingsRadioActive: { borderColor: theme.colors.backstage },
  settingsRadioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.backstage },
  settingsVisibilityCopy: { flex: 1 },
  settingsVisibilityTitle: { color: theme.colors.text, fontFamily: pluggdFonts.satoshiBold, fontSize: 13.5 },
  settingsVisibilityDetail: { color: theme.colors.textMuted, fontFamily: pluggdFonts.satoshiMedium, fontSize: 10.5, lineHeight: 14, marginTop: 2 },
  settingsSwitchCard: { minHeight: 74, borderRadius: 15, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingsSwitchCopy: { flex: 1, minWidth: 0 },
  settingsSwitchTitle: { color: theme.colors.text, fontFamily: pluggdFonts.satoshiBold, fontSize: 13.5 },
  settingsSwitchDetail: { color: theme.colors.textMuted, fontFamily: pluggdFonts.satoshiMedium, fontSize: 10.5, lineHeight: 14, marginTop: 2 },
  settingsNotice: { padding: 13, borderRadius: 14, borderWidth: 1, borderColor: theme.colors.borderAccent, backgroundColor: theme.colors.accentSoft, flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  settingsNoticeText: { flex: 1, color: theme.colors.textSecondary, fontFamily: pluggdFonts.satoshiMedium, fontSize: 11.5, lineHeight: 17 },
  settingsSave: { minHeight: 54, borderRadius: 15, paddingHorizontal: 18, backgroundColor: theme.colors.accentFill, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  settingsSaveText: { color: theme.colors.onAccent, fontFamily: pluggdFonts.satoshiBlack, fontSize: 13.5 },
  publicViewButton: { minHeight: 52, borderRadius: 15, borderWidth: 1, borderColor: theme.colors.controlBorder, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  publicViewButtonText: { color: theme.colors.text, fontFamily: pluggdFonts.satoshiBold, fontSize: 13 },
  commentList: { padding: 18, paddingBottom: 44 },
  commentComposer: { borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, padding: 12, gap: 10, marginBottom: 14 },
  commentInput: { minHeight: 70, color: theme.colors.text, fontFamily: pluggdFonts.satoshiMedium, fontSize: 14, lineHeight: 20 },
  commentPost: { alignSelf: 'flex-end', minWidth: 74, height: 44, borderRadius: 22, backgroundColor: theme.colors.accentFill, alignItems: 'center', justifyContent: 'center' },
  commentPostText: { color: theme.colors.onAccent, fontFamily: pluggdFonts.satoshiBold, fontSize: 12 },
  commentCard: { paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border },
  commentBody: { color: theme.colors.textSecondary, fontFamily: pluggdFonts.satoshiMedium, fontSize: 14, lineHeight: 20 },
  commentMeta: { color: theme.colors.textMuted, fontFamily: pluggdFonts.satoshiBold, fontSize: 10, marginTop: 6 },
  commentsEmpty: { color: theme.colors.textMuted, fontFamily: pluggdFonts.satoshiMedium, fontSize: 13, lineHeight: 19, paddingVertical: 20 },
  composerBody: { flex: 1, padding: 18, gap: 14 },
  composerTitle: { minHeight: 52, borderRadius: 14, borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surface, paddingHorizontal: 14, color: theme.colors.text, fontFamily: pluggdFonts.displayBold, fontSize: 18 },
  composerText: { flex: 1, minHeight: 210, borderRadius: 14, borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surface, padding: 14, color: theme.colors.textSecondary, fontFamily: pluggdFonts.satoshiMedium, fontSize: 17, lineHeight: 26, textAlignVertical: 'top' },
  composerAdd: { minHeight: 54, borderRadius: 16, paddingHorizontal: 20, backgroundColor: theme.colors.accentFill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  composerAddText: { color: theme.colors.onAccent, fontFamily: pluggdFonts.satoshiBold, fontSize: 15 },
  focusScreen: { flex: 1, backgroundColor: '#09090d', paddingTop: 50 },
  focusHeader: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16 },
  focusHeaderCopy: { flex: 1, minWidth: 0 },
  focusClose: { backgroundColor: '#1c1921' },
  focusTitle: { color: '#fff', fontFamily: pluggdFonts.displayBold, fontSize: 21, lineHeight: 25, marginTop: 2 },
  focusMedia: { flex: 1, width: '100%', backgroundColor: '#0e0d12' },
  audioFocus: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  audioArtwork: { width: '100%', aspectRatio: 1, maxHeight: 390, borderRadius: 22, overflow: 'hidden', backgroundColor: '#17131e', alignItems: 'center', justifyContent: 'center' },
  audioTitle: { color: '#fff', fontFamily: pluggdFonts.displayBold, fontSize: 24, textAlign: 'center', marginTop: 24 },
  audioCreator: { color: '#9993a4', fontFamily: pluggdFonts.satoshiMedium, fontSize: 13, marginTop: 5 },
  seekTimes: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', marginTop: 28 },
  seekTime: { color: '#a59ead', fontFamily: pluggdFonts.satoshiBold, fontSize: 11 },
  seekTarget: { width: '100%', height: 44, justifyContent: 'center', marginTop: 4 },
  seekTrack: { width: '100%', height: 28, justifyContent: 'center', borderRadius: 14, backgroundColor: '#26212e', overflow: 'hidden' },
  seekFill: { height: '100%', backgroundColor: '#8b5cf6' },
  audioPlay: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center', marginTop: 26 },
  textFocus: { padding: 24, paddingBottom: 60 },
  textFocusTitle: { color: '#fff', fontFamily: pluggdFonts.displayBold, fontSize: 29, lineHeight: 34 },
  textFocusBody: { color: '#ddd8e4', fontFamily: pluggdFonts.satoshiMedium, fontSize: 18, lineHeight: 28, marginTop: 18 },
  disabled: { opacity: 0.45 },
}), [theme]);
}
