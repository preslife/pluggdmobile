import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useRef, useState } from 'react';
import { Alert, Animated, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { PluggdImage } from '../src/components/PluggdImage';
import { usePlayback } from '../src/context/PlaybackProvider';
import { impactHaptic, selectionHaptic } from '../src/design/haptics';
import { safeList, toggleSavedContent } from '../src/features/culture/mobileServices';
import { contentInitials, toTrack, type BeatItem } from '../src/lib/mobileContent';
import { supabase } from '../src/lib/supabase';

const ORANGE = '#FF5A00';

async function loadSwipeBeats() {
  return safeList<BeatItem>(
    (supabase as any)
      .from('beats')
      .select('id,title,producer_name,image_url,audio_url,tagged_url,genre,bpm,key,price,description,moods,tags,license_prices,available_licenses,created_at')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(40),
  );
}

export default function SwipeBeatsRoute() {
  const router = useRouter();
  const { playTrack } = usePlayback();
  const query = useQuery({ queryKey: ['stage', 'swipe-beats'], queryFn: loadSwipeBeats });
  const [index, setIndex] = useState(0);
  const translate = useRef(new Animated.ValueXY()).current;
  const lastTap = useRef(0);
  const beat = query.data?.[index];

  const next = () => {
    translate.setValue({ x: 0, y: 0 });
    setIndex((value) => Math.min(value + 1, query.data?.length || 0));
  };

  const save = async () => {
    if (!beat) return;
    impactHaptic();
    const result = await toggleSavedContent('beat', beat.id);
    if (!result.success) Alert.alert('Save unavailable', result.error || 'Could not save this beat.');
    next();
  };

  const skip = () => {
    selectionHaptic();
    next();
  };

  const openLicense = () => {
    if (!beat) return;
    impactHaptic();
    router.push(`/beat/${beat.id}` as any);
  };

  const play = async () => {
    if (!beat) return;
    const track = toTrack(beat, 'beat');
    if (!track) {
      openLicense();
      return;
    }
    impactHaptic();
    await playTrack(track);
  };

  const handleCardTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 280) void save();
    lastTap.current = now;
  };

  const responder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 12 || Math.abs(gesture.dy) > 12,
      onPanResponderMove: Animated.event([null, { dx: translate.x, dy: translate.y }], { useNativeDriver: false }),
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx > 95) {
          void save();
          return;
        }
        if (gesture.dx < -95) {
          skip();
          return;
        }
        if (gesture.dy < -95) {
          openLicense();
          return;
        }
        Animated.spring(translate, { toValue: { x: 0, y: 0 }, useNativeDriver: true }).start();
      },
    }),
  ).current;

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close Swipe Beats" style={styles.headerButton} onPress={() => router.back()}>
          <MaterialIcons name="close" size={26} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle}>SWIPE BEATS</Text>
        <View style={styles.headerButton} />
      </View>

      {!beat ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No beats to swipe</Text>
          <Text style={styles.emptyText}>Published beats will appear here.</Text>
        </View>
      ) : (
        <Animated.View
          {...responder.panHandlers}
          onTouchEnd={handleCardTap}
          style={[
            styles.card,
            {
              transform: [
                { translateX: translate.x },
                { translateY: translate.y },
                { rotate: translate.x.interpolate({ inputRange: [-160, 0, 160], outputRange: ['-8deg', '0deg', '8deg'] }) },
              ],
            },
          ]}
        >
          <LinearGradient colors={['#20130D', '#12121A', '#08080C']} style={StyleSheet.absoluteFillObject} />
          {beat.image_url ? <PluggdImage uri={beat.image_url} style={styles.image} /> : <Text style={styles.initials}>{contentInitials(beat.title || 'Beat')}</Text>}
          <LinearGradient colors={['transparent', 'rgba(8,8,12,0.94)']} style={StyleSheet.absoluteFillObject} />
          <View style={styles.cardCopy}>
            <Text style={styles.title}>{beat.title || 'Untitled beat'}</Text>
            <Text style={styles.meta}>{beat.producer_name || 'Producer'} · {[beat.bpm ? `${beat.bpm} BPM` : null, beat.key, beat.genre].filter(Boolean).join(' · ')}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Play beat" style={styles.playButton} onPress={play}>
              <MaterialIcons name="play-arrow" size={24} color="#08080C" />
              <Text style={styles.playText}>Preview</Text>
            </Pressable>
          </View>
        </Animated.View>
      )}

      <View style={styles.actions}>
        <Pressable accessibilityRole="button" accessibilityLabel="Skip beat" style={styles.actionButton} onPress={skip}>
          <MaterialIcons name="close" size={26} color="#FFFFFF" />
          <Text style={styles.actionText}>Skip</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Save beat" style={[styles.actionButton, styles.saveButton]} onPress={save}>
          <MaterialIcons name="bookmark" size={26} color="#08080C" />
          <Text style={[styles.actionText, styles.saveText]}>Save</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Open license options" style={styles.actionButton} onPress={openLicense}>
          <MaterialIcons name="north" size={26} color="#FFFFFF" />
          <Text style={styles.actionText}>License</Text>
        </Pressable>
      </View>
      <Text style={styles.instructions}>Swipe right to save · left to skip · up to license · double tap to like</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#08080C', paddingHorizontal: 16 },
  header: { height: 92, paddingTop: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#FFFFFF', fontFamily: 'PluggdSans5-Regular', fontSize: 30, lineHeight: 34 },
  card: { flex: 1, maxHeight: 590, borderRadius: 28, overflow: 'hidden', borderWidth: 1, borderColor: '#262626', justifyContent: 'flex-end' },
  image: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  initials: { alignSelf: 'center', marginTop: 190, color: '#FFFFFF', fontFamily: 'Satoshi-Black', fontSize: 52 },
  cardCopy: { padding: 20 },
  title: { color: '#FFFFFF', fontFamily: 'Satoshi-Black', fontSize: 32, lineHeight: 36 },
  meta: { color: '#B3B3B3', fontSize: 14, lineHeight: 20, marginTop: 8 },
  playButton: { alignSelf: 'flex-start', minHeight: 46, borderRadius: 23, paddingHorizontal: 18, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 18 },
  playText: { color: '#08080C', fontFamily: 'Satoshi-Bold', fontSize: 14 },
  actions: { height: 96, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', gap: 14 },
  actionButton: { minWidth: 92, minHeight: 54, borderRadius: 27, borderWidth: 1, borderColor: '#262626', backgroundColor: '#12121A', alignItems: 'center', justifyContent: 'center' },
  saveButton: { backgroundColor: ORANGE, borderColor: ORANGE },
  actionText: { color: '#FFFFFF', fontFamily: 'Satoshi-Bold', fontSize: 11, marginTop: 2 },
  saveText: { color: '#08080C' },
  instructions: { color: '#8E8E9F', fontSize: 12, textAlign: 'center', marginBottom: 18 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  emptyTitle: { color: '#FFFFFF', fontFamily: 'Satoshi-Black', fontSize: 24 },
  emptyText: { color: '#B3B3B3', fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 8 },
});
