import { MaterialIcons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { PluggdImage } from '../../components/PluggdImage';
import { useAuth } from '../../context/AuthProvider';
import { createMobileStory, loadMobileStories } from './mobileServices';
import type { MobileStory } from './mobileTypes';

type Props = {
  creatorId?: string | null;
  communityId?: string | null;
  eventId?: string | null;
  title?: string;
  compact?: boolean;
  userAvatarUrl?: string | null;
};

type StoryGroup = {
  user_id: string;
  displayName: string;
  username?: string | null;
  avatarUrl?: string | null;
  viewed: boolean;
  stories: MobileStory[];
};

type PickedStoryMedia = {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
  mediaType: 'image' | 'video' | 'audio';
  durationSeconds?: number | null;
  fileSizeBytes?: number | null;
};

const MAX_IMAGE_MB = 12;
const MAX_AUDIO_MB = 40;
const MAX_VIDEO_MB = 60;
const MAX_STORY_SECONDS = 60;

function groupStories(stories: MobileStory[], viewerId?: string | null): StoryGroup[] {
  const groups = new Map<string, StoryGroup>();
  for (const story of stories) {
    const key = story.user_id || story.author?.user_id || story.id;
    const existing = groups.get(key);
    const displayName = story.author?.full_name || story.author?.username || story.caption || 'PLUGGD';
    if (!existing) {
      groups.set(key, {
        user_id: key,
        displayName,
        username: story.author?.username || null,
        avatarUrl: story.author?.avatar_url || null,
        viewed: Boolean(story.viewed),
        stories: [story],
      });
    } else {
      existing.viewed = existing.viewed && Boolean(story.viewed);
      existing.stories.push(story);
    }
  }
  const rows = Array.from(groups.values()).map((group) => ({
    ...group,
    stories: group.stories.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()),
  }));
  if (!viewerId) return rows;
  return rows.sort((a, b) => {
    if (a.user_id === viewerId) return -1;
    if (b.user_id === viewerId) return 1;
    if (a.viewed !== b.viewed) return a.viewed ? 1 : -1;
    return new Date(b.stories[0]?.created_at || 0).getTime() - new Date(a.stories[0]?.created_at || 0).getTime();
  });
}

function sizeLimit(mediaType: PickedStoryMedia['mediaType']) {
  return mediaType === 'image' ? MAX_IMAGE_MB : mediaType === 'audio' ? MAX_AUDIO_MB : MAX_VIDEO_MB;
}

function isTooLarge(asset: PickedStoryMedia) {
  if (!asset.fileSizeBytes) return false;
  return asset.fileSizeBytes > sizeLimit(asset.mediaType) * 1024 * 1024;
}

export function MobileStoriesRail({ creatorId, communityId, eventId, title = 'Stories', compact = false, userAvatarUrl }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);
  const [caption, setCaption] = useState('');
  const [media, setMedia] = useState<PickedStoryMedia | null>(null);
  const [picking, setPicking] = useState(false);
  const { data: stories = [], isLoading, refetch } = useQuery({
    queryKey: ['culture', 'stories', creatorId || 'all', communityId || 'all', eventId || 'all'],
    queryFn: () => loadMobileStories({ creatorId, communityId, eventId, limit: 36 }),
    staleTime: 1000 * 30,
  });

  const groups = useMemo(() => groupStories(stories, user?.id), [stories, user?.id]);
  const destination = useMemo(() => {
    if (communityId) return { type: 'community', id: communityId };
    if (eventId) return { type: 'event', id: eventId };
    if (creatorId) return { type: 'creator', id: creatorId };
    return { type: 'global', id: null };
  }, [communityId, creatorId, eventId]);

  const createMutation = useMutation({
    mutationFn: () => {
      if (!media) throw new Error('Choose photo, video or audio first.');
      return createMobileStory({
        ...media,
        caption,
        destination,
      });
    },
    onSuccess: async (result) => {
      if (!result.success) throw new Error(result.error);
      setCaption('');
      setMedia(null);
      setCreateOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['culture', 'stories'] });
      void refetch();
      if (result.id) router.push(`/story/${result.id}` as any);
    },
    onError: (error) => Alert.alert('Story failed', error instanceof Error ? error.message : String(error)),
  });

  const openCreate = () => {
    if (!user?.id) {
      router.push('/auth/login' as any);
      return;
    }
    setCreateOpen(true);
  };

  const pickVisual = async (mediaType: 'image' | 'video') => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to create stories.');
      return;
    }
    setPicking(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: mediaType === 'image' ? ImagePicker.MediaTypeOptions.Images : ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: false,
        quality: 0.92,
        videoMaxDuration: MAX_STORY_SECONDS,
      });
      if (result.canceled || !result.assets?.[0]?.uri) return;
      const asset = result.assets[0];
      const next: PickedStoryMedia = {
        uri: asset.uri,
        fileName: asset.fileName,
        mimeType: asset.mimeType || (mediaType === 'image' ? 'image/jpeg' : 'video/mp4'),
        mediaType,
        durationSeconds: asset.duration ? Math.round(asset.duration / 1000) : mediaType === 'image' ? 5 : 15,
        fileSizeBytes: asset.fileSize || null,
      };
      if (next.mediaType !== 'image' && (next.durationSeconds || 0) > MAX_STORY_SECONDS) {
        Alert.alert('Story too long', `Video stories must be ${MAX_STORY_SECONDS} seconds or less.`);
        return;
      }
      if (isTooLarge(next)) {
        Alert.alert('File too large', `${mediaType === 'image' ? 'Images' : 'Videos'} must be ${sizeLimit(mediaType)}MB or less.`);
        return;
      }
      setMedia(next);
    } finally {
      setPicking(false);
    }
  };

  const pickAudio = async () => {
    setPicking(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/*', 'audio/mpeg', 'audio/wav', 'audio/mp4'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets?.[0]?.uri) return;
      const asset = result.assets[0];
      const next: PickedStoryMedia = {
        uri: asset.uri,
        fileName: asset.name,
        mimeType: asset.mimeType || 'audio/mpeg',
        mediaType: 'audio',
        durationSeconds: 15,
        fileSizeBytes: asset.size || null,
      };
      if (isTooLarge(next)) {
        Alert.alert('File too large', `Audio stories must be ${MAX_AUDIO_MB}MB or less.`);
        return;
      }
      setMedia(next);
    } finally {
      setPicking(false);
    }
  };

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      {!compact ? (
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.meta}>24h posts</Text>
        </View>
      ) : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.rail, compact && styles.railCompact]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Create story"
          style={[styles.story, compact && styles.storyCompact]}
          onPress={openCreate}
        >
          <View style={[styles.createRing, compact && styles.createRingCompact]}>
            {userAvatarUrl ? (
              <PluggdImage uri={userAvatarUrl} style={[styles.image, compact && styles.imageCompact]} />
            ) : (
              <View style={[styles.createInner, compact && styles.createInnerCompact]}>
                <Text style={styles.fallbackText}>{user ? (user.email || 'P').slice(0, 1).toUpperCase() : 'P'}</Text>
              </View>
            )}
            <View style={styles.createBadge}>
              <MaterialIcons name="add" size={16} color="#08080C" />
            </View>
          </View>
          <Text style={styles.label} numberOfLines={1}>{user ? 'Your story' : 'Sign in'}</Text>
        </Pressable>

        {isLoading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <View key={`story-skeleton-${index}`} style={[styles.story, compact && styles.storyCompact]}>
              <View style={[styles.skeletonRing, compact && styles.skeletonRingCompact]} />
              <View style={styles.skeletonLabel} />
            </View>
          ))
        ) : groups.length ? (
          groups.map((group) => {
            const firstUnviewed = group.stories.find((story) => !story.viewed) || group.stories[0];
            return (
              <Pressable
                key={group.user_id}
                accessibilityRole="button"
                accessibilityLabel={`Open stories from ${group.displayName}`}
                style={[styles.story, compact && styles.storyCompact]}
                onPress={() => router.push(`/story/${firstUnviewed.id}` as any)}
              >
                <View style={[styles.ring, compact && styles.ringCompact, group.viewed && styles.ringViewed]}>
                  {firstUnviewed.thumbnail_url || firstUnviewed.media_url || group.avatarUrl ? (
                    <PluggdImage uri={firstUnviewed.thumbnail_url || firstUnviewed.media_url || group.avatarUrl || ''} style={[styles.image, compact && styles.imageCompact]} />
                  ) : (
                    <View style={[styles.fallback, compact && styles.fallbackCompact]}>
                      <Text style={styles.fallbackText}>{group.displayName.slice(0, 1).toUpperCase()}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.label} numberOfLines={1}>
                  {group.user_id === user?.id ? 'You' : group.displayName}
                </Text>
              </Pressable>
            );
          })
        ) : (
          <View style={[styles.emptyStoryHint, compact && styles.emptyStoryHintCompact]}>
            <Text style={styles.emptyStoryText}>Find moments</Text>
            <Text style={styles.emptyStoryMeta}>Follow creators and circles to fill this rail.</Text>
          </View>
        )}
      </ScrollView>

      <Modal visible={createOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setCreateOpen(false)}>
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Pressable accessibilityRole="button" accessibilityLabel="Close story creator" style={styles.sheetIcon} onPress={() => setCreateOpen(false)}>
              <MaterialIcons name="close" size={24} color="#FFFFFF" />
            </Pressable>
            <View style={styles.sheetTitleWrap}>
              <Text style={styles.sheetTitle}>Create Story</Text>
              <Text style={styles.sheetSubtitle}>Photos, video and audio expire after 24 hours.</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Share story"
              style={[styles.shareButton, (!media || createMutation.isPending) && styles.disabled]}
              disabled={!media || createMutation.isPending}
              onPress={() => createMutation.mutate()}
            >
              {createMutation.isPending ? <ActivityIndicator color="#08080C" /> : <Text style={styles.shareText}>Share</Text>}
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.sheetContent} showsVerticalScrollIndicator={false}>
            <View style={styles.previewCard}>
              {media?.mediaType === 'image' ? (
                <PluggdImage uri={media.uri} style={StyleSheet.absoluteFill} resizeMode="cover" />
              ) : media ? (
                <View style={styles.mediaPreview}>
                  <MaterialIcons name={media.mediaType === 'video' ? 'videocam' : 'graphic-eq'} size={44} color="#FF5A00" />
                  <Text style={styles.mediaPreviewTitle}>{media.fileName || `${media.mediaType} story`}</Text>
                  <Text style={styles.mediaPreviewMeta}>{media.mimeType || media.mediaType}</Text>
                </View>
              ) : (
                <View style={styles.mediaPreview}>
                  <MaterialIcons name="auto-awesome" size={44} color="#FF5A00" />
                  <Text style={styles.mediaPreviewTitle}>Choose a story moment</Text>
                  <Text style={styles.mediaPreviewMeta}>Image, video or audio from your library.</Text>
                </View>
              )}
            </View>

            <View style={styles.pickGrid}>
              <Pressable style={styles.pickButton} onPress={() => pickVisual('image')} disabled={picking}>
                <MaterialIcons name="image" size={24} color="#FF5A00" />
                <Text style={styles.pickText}>Photo</Text>
              </Pressable>
              <Pressable style={styles.pickButton} onPress={() => pickVisual('video')} disabled={picking}>
                <MaterialIcons name="videocam" size={24} color="#FF5A00" />
                <Text style={styles.pickText}>Video</Text>
              </Pressable>
              <Pressable style={styles.pickButton} onPress={pickAudio} disabled={picking}>
                <MaterialIcons name="graphic-eq" size={24} color="#FF5A00" />
                <Text style={styles.pickText}>Audio</Text>
              </Pressable>
            </View>

            <TextInput
              value={caption}
              onChangeText={setCaption}
              placeholder="Add a caption..."
              placeholderTextColor="#62627A"
              style={styles.captionInput}
              maxLength={150}
            />
            <Text style={styles.storyRules}>
              Stories stay visible for 24 hours and can include photos, video, or audio.
            </Text>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 10, gap: 10 },
  wrapCompact: { marginTop: 0, minHeight: 92, justifyContent: 'center' },
  header: { paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: '#FFFFFF', fontFamily: 'Satoshi-Black', fontSize: 14, textTransform: 'uppercase', letterSpacing: 0.8 },
  meta: { color: '#737382', fontSize: 11, fontFamily: 'Satoshi-Bold' },
  rail: { gap: 14, paddingHorizontal: 16, paddingBottom: 2 },
  railCompact: { gap: 12, minHeight: 90, alignItems: 'center', paddingTop: 4, paddingBottom: 6 },
  story: { width: 78, gap: 7, alignItems: 'center' },
  storyCompact: { width: 70, gap: 5 },
  createRing: {
    width: 74,
    height: 74,
    borderRadius: 37,
    padding: 3,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#FF5A00',
    backgroundColor: 'rgba(255,90,0,0.1)',
  },
  createRingCompact: { width: 62, height: 62, borderRadius: 31, padding: 2 },
  createInner: { flex: 1, borderRadius: 34, alignItems: 'center', justifyContent: 'center', backgroundColor: '#12121A' },
  createInnerCompact: { borderRadius: 29 },
  createBadge: { position: 'absolute', right: -2, bottom: -2, width: 22, height: 22, borderRadius: 11, backgroundColor: '#FF5A00', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#08080C' },
  ring: { width: 74, height: 74, borderRadius: 37, padding: 3, backgroundColor: '#FF5A00' },
  ringCompact: { width: 62, height: 62, borderRadius: 31, padding: 2 },
  ringViewed: { backgroundColor: '#2A2A33' },
  image: { width: '100%', height: '100%', borderRadius: 34 },
  imageCompact: { borderRadius: 29 },
  fallback: { width: '100%', height: '100%', borderRadius: 34, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1F1F2E' },
  fallbackCompact: { borderRadius: 29 },
  fallbackText: { color: '#FFFFFF', fontFamily: 'Satoshi-Black', fontSize: 22 },
  label: { color: '#E4E4E9', fontSize: 11, fontFamily: 'Satoshi-Bold', textAlign: 'center' },
  skeletonRing: { width: 74, height: 74, borderRadius: 37, backgroundColor: '#151520', borderWidth: 1, borderColor: '#262637' },
  skeletonRingCompact: { width: 62, height: 62, borderRadius: 31 },
  skeletonLabel: { width: 48, height: 9, borderRadius: 5, backgroundColor: '#151520' },
  emptyStoryHint: { width: 176, minHeight: 74, borderRadius: 18, padding: 12, backgroundColor: '#12121A', borderWidth: 1, borderColor: '#1F1F2E', justifyContent: 'center' },
  emptyStoryHintCompact: { minHeight: 64, width: 178 },
  emptyStoryText: { color: '#FFFFFF', fontFamily: 'Satoshi-Bold', fontSize: 13 },
  emptyStoryMeta: { color: '#8E8E9F', marginTop: 3, fontSize: 11, lineHeight: 15 },
  sheet: { flex: 1, backgroundColor: '#08080C' },
  sheetHeader: { minHeight: 92, paddingTop: 18, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#1F1F2E', flexDirection: 'row', alignItems: 'center', gap: 12 },
  sheetIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  sheetTitleWrap: { flex: 1, minWidth: 0 },
  sheetTitle: { color: '#FFFFFF', fontFamily: 'Satoshi-Black', fontSize: 22 },
  sheetSubtitle: { color: '#8E8E9F', marginTop: 2, fontSize: 12 },
  shareButton: { minWidth: 74, height: 40, borderRadius: 20, backgroundColor: '#FF5A00', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  disabled: { opacity: 0.45 },
  shareText: { color: '#08080C', fontFamily: 'Satoshi-Bold', fontSize: 13 },
  sheetContent: { padding: 16, gap: 16, paddingBottom: 44 },
  previewCard: { height: 430, borderRadius: 28, overflow: 'hidden', backgroundColor: '#12121A', borderWidth: 1, borderColor: '#1F1F2E' },
  mediaPreview: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  mediaPreviewTitle: { color: '#FFFFFF', marginTop: 13, fontFamily: 'Satoshi-Black', fontSize: 20, textAlign: 'center' },
  mediaPreviewMeta: { color: '#8E8E9F', marginTop: 5, fontSize: 13, textAlign: 'center' },
  pickGrid: { flexDirection: 'row', gap: 10 },
  pickButton: { flex: 1, minHeight: 74, borderRadius: 18, backgroundColor: '#12121A', borderWidth: 1, borderColor: '#1F1F2E', alignItems: 'center', justifyContent: 'center', gap: 7 },
  pickText: { color: '#FFFFFF', fontFamily: 'Satoshi-Bold', fontSize: 13 },
  captionInput: { minHeight: 50, borderRadius: 18, backgroundColor: '#12121A', borderWidth: 1, borderColor: '#1F1F2E', color: '#FFFFFF', paddingHorizontal: 14, fontSize: 15 },
  storyRules: { color: '#737373', fontSize: 12, lineHeight: 18 },
});
