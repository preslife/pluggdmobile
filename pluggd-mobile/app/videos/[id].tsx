import { MaterialIcons } from '@expo/vector-icons';
import { pluggdFonts } from '../../src/design/typography';
import { useBottomChromeInset } from '../../src/design/useBottomChromeInset';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { RecoveryState } from '../../components/ContentUI';
import { PluggdImage } from '../../src/components/PluggdImage';
import { impactHaptic } from '../../src/design/haptics';
import { supabase } from '../../src/lib/supabase';
import { usePluggdTheme } from '../../src/design/usePluggdTheme';

type VideoDetail = {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  youtube_url: string | null;
  video_url?: string | null;
  created_at: string | null;
  artist_id: string | null;
  source: 'video' | 'creator_video';
  artist?: { id: string; name: string; image_url: string | null } | null;
};

async function loadVideoDetail(id: string): Promise<VideoDetail | null> {
  const { data, error } = await (supabase as any)
    .from('videos')
    .select('id,title,description,thumbnail_url,youtube_url,created_at,artist_id')
    .eq('id', id)
    .maybeSingle();
  let resolved = !error && data ? { ...data, source: 'video' as const } : null;
  if (!resolved) {
    const creatorResult = await (supabase as any)
      .from('creator_videos')
      .select('id,title,description,thumbnail_url,youtube_url,video_url,created_at,user_id,is_published')
      .eq('id', id)
      .eq('is_published', true)
      .maybeSingle();
    if (creatorResult.error || !creatorResult.data) return null;
    resolved = {
      ...creatorResult.data,
      artist_id: creatorResult.data.user_id,
      source: 'creator_video' as const,
    };
  }

  let artist: VideoDetail['artist'] = null;
  if (resolved.artist_id) {
    if (resolved.source === 'creator_video') {
      const profileResult = await (supabase as any)
        .from('public_profiles')
        .select('user_id,full_name,username,avatar_url')
        .eq('user_id', resolved.artist_id)
        .maybeSingle();
      artist = profileResult.data
        ? {
            id: profileResult.data.user_id,
            name: profileResult.data.full_name || profileResult.data.username || 'PLUGGD creator',
            image_url: profileResult.data.avatar_url || null,
          }
        : null;
    } else {
      const artistResult = await (supabase as any)
        .from('artists')
        .select('id,name,image_url')
        .eq('id', resolved.artist_id)
        .maybeSingle();
      artist = artistResult.data || null;
    }
  }

  return { ...resolved, artist };
}

function UploadedVideo({ uri }: { uri: string }) {
  const styles = useVideoStyles();
  const player = useVideoPlayer(uri, (instance) => {
    instance.loop = false;
  });
  return <VideoView player={player} style={styles.uploadedVideo} nativeControls contentFit="contain" />;
}

export default function VideoDetailRoute() {
  const theme = usePluggdTheme();
  const styles = useVideoStyles();
  const bottomInset = useBottomChromeInset();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const query = useQuery({
    queryKey: ['culture', 'video-detail', id],
    queryFn: () => loadVideoDetail(String(id)),
    enabled: Boolean(id),
  });
  const video = query.data;

  const openVideo = async () => {
    if (video?.video_url) return;
    if (!video?.youtube_url) {
      Alert.alert('Video unavailable', 'This video does not expose a playable mobile URL yet.');
      return;
    }
    impactHaptic();
    await Linking.openURL(video.youtube_url);
  };

  return (
    <View style={styles.screen}>
      <StatusBar style={theme.scheme === 'light' ? 'dark' : 'light'} />
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomInset }]} showsVerticalScrollIndicator={false}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" style={styles.backButton} onPress={() => (router.canGoBack() ? router.back() : router.replace('/discover' as any))}>
          <MaterialIcons name="chevron-left" size={28} color={theme.colors.text} />
        </Pressable>

        {query.isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={theme.colors.accentFill} />
          </View>
        ) : null}

        {!query.isLoading && !video ? (
          <RecoveryState
            eyebrow="SCREEN DARK"
            title="This video is no longer showing"
            body="The creator may have removed or replaced it. Discover another visual from the PLUGGD scene."
            icon="smart-display"
            primaryLabel="Open Discover"
            onPrimary={() => router.replace('/discover' as any)}
            secondaryLabel="Go back"
            onSecondary={() => (router.canGoBack() ? router.back() : router.replace('/discover' as any))}
          />
        ) : null}

        {video ? (
          <>
            <View style={styles.hero}>
              <LinearGradient colors={['#24130B', '#171310', '#0a0806']} style={StyleSheet.absoluteFillObject} />
              {video.video_url ? (
                <UploadedVideo uri={video.video_url} />
              ) : (
                <>
                  {video.thumbnail_url ? <PluggdImage uri={video.thumbnail_url} style={styles.heroImage} /> : null}
                  <LinearGradient colors={['transparent', 'rgba(10,8,6,0.82)']} style={StyleSheet.absoluteFillObject} />
                  <View style={styles.playOverlay}>
                    <MaterialIcons name="play-arrow" size={44} color={theme.colors.mediaScrim} />
                  </View>
                </>
              )}
              <View pointerEvents="none" style={styles.heroCopy}>
                <Text style={styles.eyebrow}>VIDEO</Text>
                <Text style={styles.title} numberOfLines={3}>{video.title}</Text>
                <Text style={styles.subtitle} numberOfLines={1}>{video.artist?.name || 'PLUGGD video'}</Text>
              </View>
            </View>

            {video.description ? <Text style={styles.description}>{video.description}</Text> : null}

            <View style={styles.actions}>
              <Pressable accessibilityRole="button" accessibilityLabel={video.video_url ? 'Use the video controls above' : 'Watch video'} disabled={Boolean(video.video_url)} style={[styles.primaryButton, video.video_url && styles.primaryButtonDisabled]} onPress={openVideo}>
                <MaterialIcons name="play-arrow" size={22} color={theme.colors.onAccent} />
                <Text style={styles.primaryText}>{video.video_url ? 'Playing above' : 'Watch'}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Share video"
                style={styles.secondaryButton}
                onPress={() => Share.share({ message: `PLUGGD video: ${video.title}` })}
              >
                <MaterialIcons name="ios-share" size={20} color={theme.colors.text} />
                <Text style={styles.secondaryText}>Share</Text>
              </Pressable>
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function useVideoStyles() {
  const theme = usePluggdTheme();
  return useMemo(() => StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 16, paddingTop: 54, paddingBottom: 170 },
  backButton: { width: 44, height: 44, borderRadius: 5, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.controlBorder, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  loading: { minHeight: 420, alignItems: 'center', justifyContent: 'center' },
  empty: { minHeight: 420, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  emptyTitle: { color: theme.colors.text, fontFamily: pluggdFonts.displayBold, fontSize: 24 },
  emptyText: { color: theme.colors.textMuted, fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 8 },
  hero: { height: 430, borderRadius: 6, overflow: 'hidden', backgroundColor: theme.colors.artworkBase, borderWidth: 1, borderColor: theme.colors.border, justifyContent: 'flex-end' },
  heroImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  uploadedVideo: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%', backgroundColor: theme.colors.artworkBase },
  playOverlay: { position: 'absolute', top: '43%', alignSelf: 'center', width: 74, height: 74, borderRadius: 37, backgroundColor: theme.colors.mediaText, alignItems: 'center', justifyContent: 'center' },
  heroCopy: { padding: 18 },
  eyebrow: { color: theme.colors.accentFill, fontFamily: pluggdFonts.satoshiBlack, fontSize: 12, letterSpacing: 1.1 },
  title: { color: theme.colors.mediaText, fontFamily: pluggdFonts.displayExtraBold, fontSize: 34, lineHeight: 38, marginTop: 6 },
  subtitle: { fontFamily: pluggdFonts.satoshiBold, color: theme.colors.mediaTextMuted, fontSize: 14, fontWeight: '800', marginTop: 7 },
  description: { fontFamily: pluggdFonts.satoshiBold, color: theme.colors.textSecondary, fontSize: 15, lineHeight: 22, fontWeight: '700', marginTop: 16 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  primaryButton: { flex: 1, minHeight: 50, borderRadius: 5, backgroundColor: theme.colors.accentFill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  primaryButtonDisabled: { opacity: 0.72 },
  primaryText: { color: theme.colors.onAccent, fontFamily: pluggdFonts.satoshiBlack, fontSize: 15 },
  secondaryButton: { minWidth: 128, minHeight: 50, borderRadius: 5, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.controlBorder, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  secondaryText: { color: theme.colors.text, fontFamily: pluggdFonts.satoshiBold, fontSize: 14 },
  }), [theme]);
}
