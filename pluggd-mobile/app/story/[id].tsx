import { MaterialIcons } from '@expo/vector-icons';
import { pluggdFonts } from '../../src/design/typography';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PluggdImage } from '../../src/components/PluggdImage';
import { useAuth } from '../../src/context/AuthProvider';
import { usePlayback } from '../../src/context/PlaybackProvider';
import { loadMobileStoryDeck, markMobileStoryViewed } from '../../src/features/culture/mobileServices';
import type { MobileStory } from '../../src/features/culture/mobileTypes';
import { blockUser } from '../../src/features/safety/accountSafety';
import { showReportActions } from '../../src/features/safety/reportActions';

function StoryVideo({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (instance) => {
    instance.loop = true;
    instance.muted = false;
    instance.play();
  });
  return <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />;
}

function StoryMedia({ story }: { story: MobileStory }) {
  const uri = story.media_url || story.thumbnail_url || '';
  const kind = String(story.media_type || '').toLowerCase();
  if (kind.includes('video') && story.media_url) {
    return <StoryVideo uri={story.media_url} />;
  }
  if (kind.includes('audio')) {
    return (
      <LinearGradient colors={['#211A24', '#0a0806']} style={StyleSheet.absoluteFill}>
        {story.thumbnail_url ? <PluggdImage uri={story.thumbnail_url} style={StyleSheet.absoluteFill} /> : null}
        <LinearGradient colors={['rgba(10,8,6,0.35)', 'rgba(10,8,6,0.92)']} style={StyleSheet.absoluteFill} />
      </LinearGradient>
    );
  }
  return uri ? <PluggdImage uri={uri} style={StyleSheet.absoluteFill} /> : <LinearGradient colors={['#15151D', '#0a0806']} style={StyleSheet.absoluteFill} />;
}

export default function StoryViewerRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { playTrack, currentTrack, isPlaying, togglePlayPause } = usePlayback();
  const [activeIndex, setActiveIndex] = useState(0);
  const { data: stories = [], isLoading } = useQuery({
    queryKey: ['culture', 'story-viewer', id],
    queryFn: () => loadMobileStoryDeck(String(id)),
    enabled: Boolean(id),
  });
  const requestedIndex = useMemo(() => stories.findIndex((item) => item.id === id), [id, stories]);
  const story = stories[activeIndex] || stories[requestedIndex] || stories[0] || null;
  const isAudioStory = String(story?.media_type || '').toLowerCase().includes('audio');
  const audioActive = Boolean(story?.media_url && currentTrack?.id === `story-${story.id}`);

  useEffect(() => {
    if (story?.id) void markMobileStoryViewed(story.id);
  }, [story?.id]);

  useEffect(() => {
    if (requestedIndex >= 0) setActiveIndex(requestedIndex);
  }, [requestedIndex]);

  const goNext = () => {
    if (activeIndex < stories.length - 1) {
      setActiveIndex((index) => index + 1);
      return;
    }
    router.back();
  };

  const goPrevious = () => {
    if (activeIndex > 0) setActiveIndex((index) => index - 1);
  };

  const playAudioStory = async () => {
    if (!story?.media_url) return;
    if (audioActive) {
      await togglePlayPause();
      return;
    }
    await playTrack({
      id: `story-${story.id}`,
      url: story.media_url,
      title: story.caption || 'Story audio',
      artist: story.author?.full_name || story.author?.username || 'PLUGGD',
      artwork: story.thumbnail_url || undefined,
      duration: story.duration_seconds || undefined,
      type: 'preview',
      sourceType: 'preview',
      backstageRoute: story.destination?.route || undefined,
    });
  };

  const openSafetyMenu = () => {
    if (!story) return;
    const authorName = story.author?.full_name || story.author?.username || 'this account';
    const actions: any[] = [
      {
        text: 'Report story',
        onPress: () => showReportActions({
          targetType: 'story',
          targetId: story.id,
          label: 'story',
          details: `Reported from the iPhone story viewer. Creator: ${story.user_id}.`,
        }),
      },
    ];
    if (user?.id && user.id !== story.user_id) {
      actions.push({
        text: `Block ${authorName}`,
        style: 'destructive',
        onPress: () => Alert.alert(
          `Block ${authorName}?`,
          'Their stories, posts, comments, recommendations and live activity will no longer appear to you.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Block',
              style: 'destructive',
              onPress: async () => {
                try {
                  await blockUser(story.user_id, 'Blocked from story viewer');
                  router.back();
                  Alert.alert('Account blocked', `${authorName} has been removed from your PLUGGD experience.`);
                } catch (error: any) {
                  Alert.alert('Could not block account', error?.message ?? 'Please try again.');
                }
              },
            },
          ],
        ),
      });
    }
    actions.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert(authorName, 'Story safety', actions);
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <Stack.Screen options={{ headerShown: false }} />
      {story ? <StoryMedia story={story} /> : <LinearGradient colors={['#15151D', '#0a0806']} style={StyleSheet.absoluteFill} />}
      <LinearGradient colors={['rgba(0,0,0,0.78)', 'rgba(0,0,0,0.08)', 'rgba(0,0,0,0.86)']} style={StyleSheet.absoluteFill} />

      <View style={[styles.progressRail, { top: insets.top + 8 }]}>
        {(stories.length ? stories : Array.from({ length: 1 })).map((_, index) => (
          <View key={`story-progress-${index}`} style={styles.progressTrack}>
            <View style={[styles.progressFill, index <= activeIndex && styles.progressFillActive]} />
          </View>
        ))}
      </View>

      <View style={[styles.topBar, { top: insets.top + 18 }]}>
        <Pressable style={styles.iconButton} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Close story">
          <MaterialIcons name="close" size={24} color="#FFFFFF" />
        </Pressable>
        <View style={styles.author}>
          <Text style={styles.authorName} numberOfLines={1}>
            {story?.author?.full_name || story?.author?.username || 'PLUGGD moment'}
          </Text>
          <Text style={styles.authorMeta} numberOfLines={1}>
            {story?.destination?.label || 'Story'}
          </Text>
        </View>
        {story?.destination?.route ? (
          <Pressable style={styles.iconButton} onPress={() => router.push(story.destination?.route as any)} accessibilityRole="button" accessibilityLabel="Open story destination">
            <MaterialIcons name="arrow-forward" size={22} color="#FFFFFF" />
          </Pressable>
        ) : (
          <View style={styles.iconButton} />
        )}
        <Pressable style={styles.iconButton} onPress={openSafetyMenu} accessibilityRole="button" accessibilityLabel="Story safety options">
          <MaterialIcons name="more-horiz" size={23} color="#FFFFFF" />
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color="#ff6600" />
        </View>
      ) : null}

      {!isLoading && !story ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Story unavailable</Text>
          <Text style={styles.emptyText}>This moment has expired or is not available on mobile.</Text>
        </View>
      ) : null}

      {story ? (
        <View style={styles.bottom}>
          {isAudioStory ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Play audio story" style={styles.audioButton} onPress={playAudioStory}>
              <MaterialIcons name={audioActive && isPlaying ? 'pause' : 'play-arrow'} size={26} color="#0a0806" />
              <View style={styles.audioCopy}>
                <Text style={styles.audioTitle} numberOfLines={1}>Audio story</Text>
                <Text style={styles.audioMeta} numberOfLines={1}>Plays through the PLUGGD player</Text>
              </View>
            </Pressable>
          ) : null}
          <Text style={styles.caption} numberOfLines={3}>
            {story.caption || ''}
          </Text>
        </View>
      ) : null}

      {story ? (
        <View style={styles.tapZones} pointerEvents="box-none">
          <Pressable accessibilityRole="button" accessibilityLabel="Previous story" style={styles.tapZone} onPress={goPrevious} />
          <Pressable accessibilityRole="button" accessibilityLabel="Next story" style={styles.tapZone} onPress={goNext} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0a0806' },
  progressRail: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    gap: 5,
    zIndex: 4,
  },
  progressTrack: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  progressFill: {
    width: '0%',
    height: '100%',
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },
  progressFillActive: { width: '100%' },
  topBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    zIndex: 5,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(23,19,16,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  author: { flex: 1, minWidth: 0 },
  authorName: { fontFamily: pluggdFonts.satoshiBlack, color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  authorMeta: { fontFamily: pluggdFonts.satoshiBold, color: '#B3B3B3', fontSize: 12, fontWeight: '800', marginTop: 2 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  emptyTitle: { fontFamily: pluggdFonts.displayBold, color: '#FFFFFF', fontSize: 24, fontWeight: '700' },
  emptyText: { color: '#B3B3B3', fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 8 },
  bottom: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 42,
    padding: 16,
    borderRadius: 5,
    backgroundColor: 'rgba(23,19,16,0.74)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    zIndex: 5,
  },
  audioButton: {
    minHeight: 58,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  audioCopy: { flex: 1, minWidth: 0 },
  audioTitle: { color: '#0a0806', fontFamily: 'Satoshi-Black', fontSize: 14 },
  audioMeta: { color: '#62627A', fontFamily: 'Satoshi-Bold', fontSize: 11, marginTop: 2 },
  caption: { fontFamily: pluggdFonts.satoshiBold, color: '#FFFFFF', fontSize: 17, lineHeight: 24, fontWeight: '800' },
  tapZones: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    zIndex: 3,
  },
  tapZone: { flex: 1 },
});
