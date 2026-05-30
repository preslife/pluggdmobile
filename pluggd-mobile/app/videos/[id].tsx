import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { PluggdImage } from '../../src/components/PluggdImage';
import { impactHaptic } from '../../src/design/haptics';
import { supabase } from '../../src/lib/supabase';

const ORANGE = '#FF5A00';

type VideoDetail = {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  youtube_url: string | null;
  created_at: string | null;
  artist_id: string | null;
  artist?: { id: string; name: string; image_url: string | null } | null;
};

async function loadVideoDetail(id: string): Promise<VideoDetail | null> {
  const { data, error } = await (supabase as any)
    .from('videos')
    .select('id,title,description,thumbnail_url,youtube_url,created_at,artist_id')
    .eq('id', id)
    .maybeSingle();
  if (error || !data) return null;

  let artist: VideoDetail['artist'] = null;
  if (data.artist_id) {
    const artistResult = await (supabase as any)
      .from('artists')
      .select('id,name,image_url')
      .eq('id', data.artist_id)
      .maybeSingle();
    artist = artistResult.data || null;
  }

  return { ...data, artist };
}

export default function VideoDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const query = useQuery({
    queryKey: ['culture', 'video-detail', id],
    queryFn: () => loadVideoDetail(String(id)),
    enabled: Boolean(id),
  });
  const video = query.data;

  const openVideo = async () => {
    if (!video?.youtube_url) {
      Alert.alert('Video unavailable', 'This video does not expose a playable mobile URL yet.');
      return;
    }
    impactHaptic();
    await Linking.openURL(video.youtube_url);
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" style={styles.backButton} onPress={() => router.back()}>
          <MaterialIcons name="chevron-left" size={28} color="#FFFFFF" />
        </Pressable>

        {query.isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={ORANGE} />
          </View>
        ) : null}

        {!query.isLoading && !video ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Video unavailable</Text>
            <Text style={styles.emptyText}>This video is unavailable or has been removed.</Text>
          </View>
        ) : null}

        {video ? (
          <>
            <View style={styles.hero}>
              <LinearGradient colors={['#24130B', '#12121A', '#08080C']} style={StyleSheet.absoluteFillObject} />
              {video.thumbnail_url ? <PluggdImage uri={video.thumbnail_url} style={styles.heroImage} /> : null}
              <LinearGradient colors={['transparent', 'rgba(8,8,12,0.82)']} style={StyleSheet.absoluteFillObject} />
              <View style={styles.playOverlay}>
                <MaterialIcons name="play-arrow" size={44} color="#08080C" />
              </View>
              <View style={styles.heroCopy}>
                <Text style={styles.eyebrow}>VIDEO</Text>
                <Text style={styles.title} numberOfLines={3}>{video.title}</Text>
                <Text style={styles.subtitle} numberOfLines={1}>{video.artist?.name || 'PLUGGD video'}</Text>
              </View>
            </View>

            {video.description ? <Text style={styles.description}>{video.description}</Text> : null}

            <View style={styles.actions}>
              <Pressable accessibilityRole="button" accessibilityLabel="Watch video" style={styles.primaryButton} onPress={openVideo}>
                <MaterialIcons name="play-arrow" size={22} color="#08080C" />
                <Text style={styles.primaryText}>Watch</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Share video"
                style={styles.secondaryButton}
                onPress={() => Share.share({ message: `PLUGGD video: ${video.title}` })}
              >
                <MaterialIcons name="ios-share" size={20} color="#FFFFFF" />
                <Text style={styles.secondaryText}>Share</Text>
              </Pressable>
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#08080C' },
  content: { padding: 16, paddingTop: 54, paddingBottom: 170 },
  backButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#151515', borderWidth: 1, borderColor: '#262626', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  loading: { minHeight: 420, alignItems: 'center', justifyContent: 'center' },
  empty: { minHeight: 420, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  emptyTitle: { color: '#FFFFFF', fontFamily: 'Satoshi-Black', fontSize: 24 },
  emptyText: { color: '#B3B3B3', fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 8 },
  hero: { height: 430, borderRadius: 24, overflow: 'hidden', backgroundColor: '#12121A', borderWidth: 1, borderColor: '#262626', justifyContent: 'flex-end' },
  heroImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  playOverlay: { position: 'absolute', top: '43%', alignSelf: 'center', width: 74, height: 74, borderRadius: 37, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  heroCopy: { padding: 18 },
  eyebrow: { color: ORANGE, fontFamily: 'Satoshi-Black', fontSize: 12, letterSpacing: 1.1 },
  title: { color: '#FFFFFF', fontFamily: 'Satoshi-Black', fontSize: 34, lineHeight: 38, marginTop: 6 },
  subtitle: { color: '#B3B3B3', fontSize: 14, fontWeight: '800', marginTop: 7 },
  description: { color: '#E4E4E9', fontSize: 15, lineHeight: 22, fontWeight: '700', marginTop: 16 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  primaryButton: { flex: 1, minHeight: 50, borderRadius: 25, backgroundColor: ORANGE, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  primaryText: { color: '#08080C', fontFamily: 'Satoshi-Black', fontSize: 15 },
  secondaryButton: { minWidth: 128, minHeight: 50, borderRadius: 25, backgroundColor: '#151515', borderWidth: 1, borderColor: '#262626', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  secondaryText: { color: '#FFFFFF', fontFamily: 'Satoshi-Bold', fontSize: 14 },
});
