import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Modal, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { PluggdImage } from '../../components/PluggdImage';
import { impactHaptic, selectionHaptic } from '../../design/haptics';
import { pluggdFonts } from '../../design/typography';
import { setEventRsvp } from '../culture/mobileServices';
import { CarnivalMap } from './CarnivalMap';
import {
  buildCarnivalRoute,
  carnivalSignalCategory,
  downloadCarnivalRoadPack,
  isCarnivalCampaignActive,
  loadCarnivalHub,
  saveCarnivalRoute,
} from './carnivalService';
import type { CarnivalHubBundle, CarnivalRoutePreferences, CarnivalSignal, SavedCarnivalRoute } from './carnivalTypes';

const ORANGE = '#FF6600';
const INK = '#F8F5EF';
const MUTED = 'rgba(248,245,239,0.64)';
const DEFAULT_PREFERENCES: CarnivalRoutePreferences = { day: 'Sunday', sound: 'Surprise me', pace: 'Balanced', accessible: false };

function formatDate(value?: string | null) {
  if (!value) return 'Dates being confirmed';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Dates being confirmed';
  return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/London' });
}

function updatedLabel(value?: string | null) {
  if (!value) return 'Update time unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Update time unavailable';
  return `Updated ${date.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' })}`;
}

function routeDescription(route: SavedCarnivalRoute) {
  return `${route.day} · ${route.sound} · ${route.pace} · ${route.stops.length} sourced stops`;
}

export function CarnivalHubScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const sectionY = useRef<Record<string, number>>({});
  const [saved, setSaved] = useState(false);
  const [going, setGoing] = useState(false);
  const [routeBuilderOpen, setRouteBuilderOpen] = useState(false);
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [savedRoute, setSavedRoute] = useState<SavedCarnivalRoute | null>(null);
  const [downloading, setDownloading] = useState(false);

  const query = useQuery({
    queryKey: ['carnival-hub', 1],
    queryFn: loadCarnivalHub,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });
  const bundle = query.data;
  const mappedSignals = useMemo(
    () => (bundle?.signals ?? []).filter((signal) => signal.public_latitude != null && signal.public_longitude != null),
    [bundle?.signals],
  );
  const categories = useMemo(() => Array.from(new Set(mappedSignals.map(carnivalSignalCategory))), [mappedSignals]);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/discover' as any));
  const scrollTo = (id: string) => scrollRef.current?.scrollTo({ y: Math.max(0, (sectionY.current[id] ?? 0) - 78), animated: true });
  const openStory = (slug: string) => router.push(`/carnival/story/${slug}` as any);

  const updateRsvp = async (next: 'interested' | 'going') => {
    if (!bundle?.event?.id) return;
    impactHaptic();
    const result = await setEventRsvp(bundle.event.id, next);
    if (!result.success) {
      Alert.alert('Sign in to save Carnival', result.error || 'Please sign in and try again.');
      return;
    }
    if (next === 'going') setGoing(true);
    else setSaved(true);
  };

  const createRoute = async () => {
    if (!bundle) return;
    const route = buildCarnivalRoute(bundle.signals, preferences);
    if (!route.stops.length) {
      Alert.alert('No route yet', 'The source-checked map does not currently have enough matching places. Try a broader sound or pace.');
      return;
    }
    await saveCarnivalRoute(route);
    setSavedRoute(route);
    setRouteBuilderOpen(false);
    scrollTo('map');
    impactHaptic();
  };

  const saveRoadPack = async () => {
    if (!bundle) return;
    setDownloading(true);
    try {
      await downloadCarnivalRoadPack(bundle.offline.url, bundle.offline.updatedAt);
      Alert.alert('Road pack saved', 'Travel, access and essential guidance is now available offline from this Carnival guide.');
    } catch (error: any) {
      Alert.alert('Could not save road pack', error?.message ?? 'Check your connection and try again.');
    } finally {
      setDownloading(false);
    }
  };

  if (query.isLoading) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar style="light" />
        <ActivityIndicator color={ORANGE} />
        <Text style={styles.loadingText}>Opening the Carnival guide…</Text>
      </SafeAreaView>
    );
  }

  if (!bundle || query.isError) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar style="light" />
        <MaterialIcons name="festival" size={34} color={ORANGE} />
        <Text style={styles.errorTitle}>Carnival guide unavailable</Text>
        <Text style={styles.errorCopy}>We could not load the published guide. Check your connection and try again.</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Retry Carnival guide" onPress={() => query.refetch()} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Try again</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={goBack} style={styles.textButton}>
          <Text style={styles.textButtonText}>Back to Discover</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="light" />
      <ScrollView ref={scrollRef} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 64 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <PluggdImage uri={bundle.hub.heroImageUrl} style={StyleSheet.absoluteFill} resizeMode="cover" displayWidth={1100} accessibilityLabel="Masqueraders at Notting Hill Carnival" />
          <LinearGradient colors={['rgba(6,5,4,0.06)', 'rgba(6,5,4,0.36)', '#080706']} locations={[0, 0.48, 1]} style={StyleSheet.absoluteFill} />
          <View style={[styles.heroTop, { paddingTop: insets.top + 8 }]}>
            <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={goBack} style={styles.roundButton}>
              <MaterialIcons name="arrow-back" size={22} color="#FFFFFF" />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Share Carnival guide" onPress={() => Share.share({ message: 'Notting Hill Carnival 2026 on PLUGGD https://pluggd.fm/hubs/notting-hill-carnival-2026' })} style={styles.roundButton}>
              <MaterialIcons name="ios-share" size={21} color="#FFFFFF" />
            </Pressable>
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.eyebrow}>PLUGGD CARNIVAL EDITION · INDEPENDENT GUIDE</Text>
            <Text style={styles.heroTitle}>Notting Hill{`\n`}Carnival 2026</Text>
            <Text style={styles.heroMeta}>{formatDate(bundle.event?.starts_at)} — {formatDate(bundle.event?.ends_at)}</Text>
            <Text style={styles.heroDescription}>{bundle.hub.description || 'The sounds, stories and source-checked places shaping Carnival.'}</Text>
            <View style={styles.heroActions}>
              <Pressable accessibilityRole="button" accessibilityLabel={saved ? 'Carnival saved' : 'Save Carnival'} onPress={() => updateRsvp('interested')} style={[styles.primaryButton, saved && styles.selectedButton]}>
                <MaterialIcons name={saved ? 'bookmark' : 'bookmark-border'} size={19} color={saved ? '#080706' : '#FFFFFF'} />
                <Text style={[styles.primaryButtonText, saved && styles.selectedButtonText]}>{saved ? 'Saved' : 'Save'}</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={going ? 'Marked as going' : 'Mark as going'} onPress={() => updateRsvp('going')} style={[styles.secondaryButton, going && styles.selectedButton]}>
                <MaterialIcons name="celebration" size={19} color={going ? '#080706' : '#FFFFFF'} />
                <Text style={[styles.secondaryButtonText, going && styles.selectedButtonText]}>{going ? 'Going' : 'I’m going'}</Text>
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.gatewayGrid}>
          {bundle.gateways.map((gateway) => {
            const icon = gateway.id === 'build' ? 'route' : gateway.id === 'map' ? 'map' : gateway.id === 'sounds' ? 'graphic-eq' : 'auto-stories';
            return (
              <Pressable
                key={gateway.id}
                accessibilityRole="button"
                accessibilityLabel={`${gateway.title}. ${gateway.subtitle}`}
                onPress={() => gateway.id === 'build' ? setRouteBuilderOpen(true) : scrollTo(gateway.id)}
                style={({ pressed }) => [styles.gateway, pressed && styles.pressed]}
              >
                <MaterialIcons name={icon as any} size={22} color={ORANGE} />
                <Text style={styles.gatewayTitle}>{gateway.title}</Text>
                <Text style={styles.gatewayBody} numberOfLines={3}>{gateway.subtitle}</Text>
                <MaterialIcons name="arrow-forward" size={18} color="#FFFFFF" />
              </Pressable>
            );
          })}
        </View>

        <View onLayout={(event) => { sectionY.current.map = event.nativeEvent.layout.y; }} style={styles.section}>
          <SectionHeader eyebrow="Source-checked, not simulated" title="Map the road" meta={`${mappedSignals.length} verified points`} />
          <CarnivalMap signals={mappedSignals} routeStopIds={savedRoute?.stops.map((stop) => stop.id)} />
          {savedRoute ? (
            <View style={styles.routeCard}>
              <Text style={styles.routeEyebrow}>YOUR SAVED ROUTE</Text>
              <Text style={styles.routeTitle}>{routeDescription(savedRoute)}</Text>
              <View style={styles.routeStops}>
                {savedRoute.stops.map((stop, index) => (
                  <View key={stop.id} style={styles.routeStop}>
                    <Text style={styles.routeNumber}>{String(index + 1).padStart(2, '0')}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.routeStopTitle}>{stop.location_label || 'Carnival stop'}</Text>
                      <Text style={styles.routeStopMeta}>{carnivalSignalCategory(stop)}</Text>
                    </View>
                  </View>
                ))}
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Share saved Carnival route" onPress={() => Share.share({ message: `My PLUGGD Carnival route: ${routeDescription(savedRoute)} https://pluggd.fm/hubs/notting-hill-carnival-2026` })} style={styles.inlineButton}>
                <MaterialIcons name="ios-share" size={18} color={ORANGE} />
                <Text style={styles.inlineButtonText}>Share route</Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        <View onLayout={(event) => { sectionY.current.sounds = event.nativeEvent.layout.y; }} style={styles.section}>
          <SectionHeader eyebrow="Sound before spectacle" title="Find your sound" meta={categories.join(' · ')} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.signalRail}>
            {mappedSignals.filter((signal) => carnivalSignalCategory(signal) === 'Sound systems' || carnivalSignalCategory(signal) === 'Stages').slice(0, 12).map((signal, index) => (
              <View key={signal.id} style={styles.signalCard}>
                <Text style={styles.signalNumber}>{String(index + 1).padStart(2, '0')}</Text>
                <Text style={styles.signalCategory}>{carnivalSignalCategory(signal)}</Text>
                <Text style={styles.signalTitle} numberOfLines={2}>{signal.location_label || 'Carnival sound'}</Text>
                <Text style={styles.signalBody} numberOfLines={4}>{signal.body || 'Source-checked Carnival location.'}</Text>
                <View style={styles.tagRow}>{(signal.mood_tags ?? []).slice(0, 2).map((tag) => <Text key={tag} style={styles.tag}>#{tag}</Text>)}</View>
              </View>
            ))}
          </ScrollView>

          {bundle.soundboards.length ? (
            <>
              <Text style={styles.subsectionTitle}>Carnival soundboards</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storyRail}>
                {bundle.soundboards.map((board) => (
                  <Pressable key={board.id} accessibilityRole="button" accessibilityLabel={`Open ${board.title} soundboard`} onPress={() => router.push(`/soundboards/${board.id}` as any)} style={({ pressed }) => [styles.soundboardCard, pressed && styles.pressed]}>
                    <PluggdImage uri={board.cover_image_url ?? ''} style={styles.soundboardImage} resizeMode="cover" displayWidth={500} accessibilityLabel="" />
                    <LinearGradient colors={['transparent', 'rgba(5,4,3,0.92)']} style={StyleSheet.absoluteFill} />
                    <View style={styles.soundboardCopy}>
                      <Text style={styles.soundboardLabel}>CREATOR-APPROVED BOARD</Text>
                      <Text style={styles.soundboardTitle} numberOfLines={2}>{board.title}</Text>
                      <Text style={styles.soundboardMeta}>{board.item_count ?? 0} pieces · Open board</Text>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            </>
          ) : null}
        </View>

        <View onLayout={(event) => { sectionY.current.stories = event.nativeEvent.layout.y; }} style={styles.section}>
          <SectionHeader eyebrow="The culture behind the road" title="Carnival stories" meta="THE PLUG" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storyRail}>
            {bundle.stories.map((story) => (
              <Pressable key={story.slug} accessibilityRole="link" accessibilityLabel={`Read ${story.title}`} onPress={() => openStory(story.slug)} style={({ pressed }) => [styles.storyCard, pressed && styles.pressed]}>
                <PluggdImage uri={story.imageUrl} style={styles.storyImage} resizeMode="cover" displayWidth={620} accessibilityLabel="" />
                <View style={styles.storyCopy}>
                  <Text style={styles.storyLabel}>CARNIVAL FIELD NOTE</Text>
                  <Text style={styles.storyTitle} numberOfLines={3}>{story.title}</Text>
                  <Text style={styles.storyDescription} numberOfLines={3}>{story.description}</Text>
                  <Text style={styles.storyCta}>Read story →</Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <SectionHeader eyebrow="Take the essentials" title="Travel, access and offline" meta={updatedLabel(bundle.offline.updatedAt)} />
          <View style={styles.essentialsCard}>
            {bundle.officialLinks.map((link) => (
              <Pressable key={link.id} accessibilityRole="link" accessibilityLabel={`Open ${link.title}`} onPress={() => Linking.openURL(link.url)} style={styles.officialRow}>
                <MaterialIcons name={link.id === 'access' ? 'accessible' : link.id === 'tfl' ? 'train' : link.id === 'safety' ? 'health-and-safety' : 'directions'} size={20} color={ORANGE} />
                <Text style={styles.officialTitle}>{link.title}</Text>
                <MaterialIcons name="open-in-new" size={17} color={MUTED} />
              </Pressable>
            ))}
            <Pressable accessibilityRole="button" accessibilityLabel="Save Carnival road pack for offline access" onPress={saveRoadPack} disabled={downloading} style={styles.downloadButton}>
              {downloading ? <ActivityIndicator color="#080706" /> : <MaterialIcons name="offline-pin" size={20} color="#080706" />}
              <Text style={styles.downloadText}>{downloading ? 'Saving road pack…' : 'Save road pack offline'}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Open saved Carnival road pack" onPress={() => router.push('/carnival/road-pack' as any)} style={styles.inlineButton}>
              <MaterialIcons name="description" size={18} color={ORANGE} />
              <Text style={styles.inlineButtonText}>Open saved road pack</Text>
            </Pressable>
          </View>
          <Text style={styles.disclaimer}>{bundle.disclaimer}</Text>
          <Text style={styles.sourceTime}>Source register checked {formatDate(bundle.sourceCheckedAt)}. No crowd-density or unofficial live-status claims are shown.</Text>
        </View>
      </ScrollView>

      <RouteBuilderModal
        visible={routeBuilderOpen}
        preferences={preferences}
        onChange={setPreferences}
        onClose={() => setRouteBuilderOpen(false)}
        onBuild={createRoute}
      />
    </View>
  );
}

function SectionHeader({ eyebrow, title, meta }: { eyebrow: string; title: string; meta: string }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={{ flex: 1 }}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <Text style={styles.sectionMeta}>{meta}</Text>
    </View>
  );
}

function ChoiceRow<T extends string>({ label, values, value, onChange }: { label: string; values: T[]; value: T; onChange: (value: T) => void }) {
  return (
    <View style={styles.choiceGroup}>
      <Text style={styles.choiceLabel}>{label}</Text>
      <View style={styles.choiceRow}>
        {values.map((item) => (
          <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: item === value }} onPress={() => { selectionHaptic(); onChange(item); }} style={[styles.choice, item === value && styles.choiceSelected]}>
            <Text style={[styles.choiceText, item === value && styles.choiceTextSelected]}>{item}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function RouteBuilderModal({ visible, preferences, onChange, onClose, onBuild }: { visible: boolean; preferences: CarnivalRoutePreferences; onChange: (value: CarnivalRoutePreferences) => void; onClose: () => void; onBuild: () => void }) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalScreen}>
        <View style={styles.modalHeader}>
          <View>
            <Text style={styles.eyebrow}>ROUTE BUILDER</Text>
            <Text style={styles.modalTitle}>Build My Carnival</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Close route builder" onPress={onClose} style={styles.roundButton}><MaterialIcons name="close" size={22} color="#FFFFFF" /></Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.modalContent}>
          <Text style={styles.modalIntro}>Shape a route from the guide’s source-checked places. This is a discovery plan, not live navigation or an official operational map.</Text>
          <ChoiceRow label="Day" values={['Sunday', 'Monday']} value={preferences.day} onChange={(day) => onChange({ ...preferences, day })} />
          <ChoiceRow label="Sound" values={['Surprise me', 'Reggae', 'Soca', 'Afrobeats']} value={preferences.sound} onChange={(sound) => onChange({ ...preferences, sound })} />
          <ChoiceRow label="Pace" values={['Easy', 'Balanced', 'Full road']} value={preferences.pace} onChange={(pace) => onChange({ ...preferences, pace })} />
          <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: preferences.accessible }} onPress={() => onChange({ ...preferences, accessible: !preferences.accessible })} style={[styles.accessChoice, preferences.accessible && styles.choiceSelected]}>
            <MaterialIcons name="accessible" size={22} color={preferences.accessible ? '#080706' : ORANGE} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.accessTitle, preferences.accessible && styles.choiceTextSelected]}>Prioritise access and essential points</Text>
              <Text style={[styles.accessBody, preferences.accessible && styles.accessBodySelected]}>Includes verified access, toilets, medical and quieter points where available.</Text>
            </View>
          </Pressable>
        </ScrollView>
        <View style={styles.modalFooter}>
          <Pressable accessibilityRole="button" accessibilityLabel="Build and save Carnival route" onPress={onBuild} style={styles.buildButton}>
            <Text style={styles.buildButtonText}>Build & save route</Text>
            <MaterialIcons name="route" size={21} color="#080706" />
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#080706' },
  loadingScreen: { flex: 1, backgroundColor: '#080706', alignItems: 'center', justifyContent: 'center', padding: 28, gap: 12 },
  loadingText: { color: MUTED, fontFamily: pluggdFonts.satoshiMedium, fontSize: 14 },
  errorTitle: { color: INK, fontFamily: pluggdFonts.displayBold, fontSize: 23, textAlign: 'center' },
  errorCopy: { color: MUTED, fontFamily: pluggdFonts.satoshiRegular, fontSize: 14, lineHeight: 21, textAlign: 'center', maxWidth: 310 },
  content: { backgroundColor: '#080706' },
  hero: { minHeight: 690, justifyContent: 'space-between', overflow: 'hidden' },
  heroTop: { zIndex: 2, paddingHorizontal: 18, flexDirection: 'row', justifyContent: 'space-between' },
  roundButton: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(8,7,6,0.72)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.28)' },
  heroCopy: { zIndex: 2, paddingHorizontal: 20, paddingBottom: 34, gap: 12 },
  eyebrow: { color: ORANGE, fontFamily: pluggdFonts.satoshiBlack, fontSize: 10.5, lineHeight: 14, letterSpacing: 1.5, textTransform: 'uppercase' },
  heroTitle: { color: INK, fontFamily: pluggdFonts.displayExtraBold, fontSize: 48, lineHeight: 49, letterSpacing: -2.2 },
  heroMeta: { color: '#FFFFFF', fontFamily: pluggdFonts.satoshiBold, fontSize: 13, lineHeight: 18 },
  heroDescription: { color: 'rgba(255,255,255,0.76)', fontFamily: pluggdFonts.satoshiRegular, fontSize: 15, lineHeight: 22, maxWidth: 346 },
  heroActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  primaryButton: { minHeight: 48, borderRadius: 14, backgroundColor: '#E85D00', paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  primaryButtonText: { color: '#FFFFFF', fontFamily: pluggdFonts.satoshiBlack, fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 },
  secondaryButton: { minHeight: 48, borderRadius: 14, backgroundColor: 'rgba(8,7,6,0.72)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.34)', paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  secondaryButtonText: { color: '#FFFFFF', fontFamily: pluggdFonts.satoshiBlack, fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 },
  selectedButton: { backgroundColor: '#FFFFFF' },
  selectedButtonText: { color: '#080706' },
  textButton: { minHeight: 44, justifyContent: 'center' },
  textButtonText: { color: ORANGE, fontFamily: pluggdFonts.satoshiBold, fontSize: 14 },
  gatewayGrid: { padding: 18, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gateway: { width: '48.5%', minHeight: 170, borderRadius: 22, backgroundColor: '#14110E', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.12)', padding: 16, gap: 8, justifyContent: 'space-between' },
  gatewayTitle: { color: INK, fontFamily: pluggdFonts.displayBold, fontSize: 17, lineHeight: 21 },
  gatewayBody: { color: MUTED, fontFamily: pluggdFonts.satoshiRegular, fontSize: 12.5, lineHeight: 17 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  section: { paddingHorizontal: 18, paddingTop: 34, gap: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 },
  sectionTitle: { color: INK, fontFamily: pluggdFonts.displayBold, fontSize: 28, lineHeight: 32, letterSpacing: -0.8 },
  sectionMeta: { color: MUTED, fontFamily: pluggdFonts.satoshiMedium, fontSize: 10.5, maxWidth: 132, textAlign: 'right', lineHeight: 15 },
  routeCard: { borderRadius: 22, backgroundColor: '#17120F', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,102,0,0.36)', padding: 17, gap: 12 },
  routeEyebrow: { color: ORANGE, fontFamily: pluggdFonts.satoshiBlack, fontSize: 10, letterSpacing: 1.25 },
  routeTitle: { color: INK, fontFamily: pluggdFonts.displayBold, fontSize: 18, lineHeight: 23 },
  routeStops: { gap: 4 },
  routeStop: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.1)' },
  routeNumber: { color: ORANGE, fontFamily: pluggdFonts.displayBold, fontSize: 15 },
  routeStopTitle: { color: INK, fontFamily: pluggdFonts.satoshiBold, fontSize: 13.5 },
  routeStopMeta: { color: MUTED, fontFamily: pluggdFonts.satoshiRegular, fontSize: 11.5 },
  inlineButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8 },
  inlineButtonText: { color: ORANGE, fontFamily: pluggdFonts.satoshiBold, fontSize: 13 },
  signalRail: { gap: 12, paddingRight: 18 },
  signalCard: { width: 230, minHeight: 228, borderRadius: 22, backgroundColor: '#F2E7D7', padding: 17, gap: 8 },
  signalNumber: { color: '#D55200', fontFamily: pluggdFonts.displayExtraBold, fontSize: 24 },
  signalCategory: { color: '#9A3E00', fontFamily: pluggdFonts.satoshiBlack, fontSize: 9.5, letterSpacing: 1.1, textTransform: 'uppercase' },
  signalTitle: { color: '#15100B', fontFamily: pluggdFonts.displayBold, fontSize: 20, lineHeight: 23 },
  signalBody: { color: 'rgba(21,16,11,0.67)', fontFamily: pluggdFonts.satoshiRegular, fontSize: 12.5, lineHeight: 18 },
  tagRow: { flexDirection: 'row', gap: 8, marginTop: 'auto' },
  tag: { color: '#9A3E00', fontFamily: pluggdFonts.satoshiBold, fontSize: 10.5 },
  subsectionTitle: { color: INK, fontFamily: pluggdFonts.displayBold, fontSize: 20, marginTop: 8 },
  storyRail: { gap: 12, paddingRight: 18 },
  soundboardCard: { width: 244, height: 278, borderRadius: 22, overflow: 'hidden', backgroundColor: '#17120F' },
  soundboardImage: { ...StyleSheet.absoluteFillObject, width: undefined, height: undefined },
  soundboardCopy: { marginTop: 'auto', padding: 16, gap: 4 },
  soundboardLabel: { color: ORANGE, fontFamily: pluggdFonts.satoshiBlack, fontSize: 9.5, letterSpacing: 1.1 },
  soundboardTitle: { color: '#FFFFFF', fontFamily: pluggdFonts.displayBold, fontSize: 20, lineHeight: 23 },
  soundboardMeta: { color: 'rgba(255,255,255,0.66)', fontFamily: pluggdFonts.satoshiMedium, fontSize: 11.5 },
  storyCard: { width: 286, borderRadius: 22, overflow: 'hidden', backgroundColor: '#F1E6D5' },
  storyImage: { width: '100%', height: 184 },
  storyCopy: { padding: 16, gap: 8 },
  storyLabel: { color: '#B34700', fontFamily: pluggdFonts.satoshiBlack, fontSize: 9.5, letterSpacing: 1.2 },
  storyTitle: { color: '#17100A', fontFamily: pluggdFonts.displayBold, fontSize: 21, lineHeight: 24 },
  storyDescription: { color: 'rgba(23,16,10,0.66)', fontFamily: pluggdFonts.satoshiRegular, fontSize: 12.5, lineHeight: 18 },
  storyCta: { color: '#B34700', fontFamily: pluggdFonts.satoshiBlack, fontSize: 12, marginTop: 2 },
  essentialsCard: { borderRadius: 22, overflow: 'hidden', backgroundColor: '#14110E', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 14, paddingBottom: 12 },
  officialRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.1)' },
  officialTitle: { flex: 1, color: INK, fontFamily: pluggdFonts.satoshiBold, fontSize: 13.5 },
  downloadButton: { minHeight: 52, borderRadius: 14, backgroundColor: ORANGE, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14 },
  downloadText: { color: '#080706', fontFamily: pluggdFonts.satoshiBlack, fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.4 },
  disclaimer: { color: MUTED, fontFamily: pluggdFonts.satoshiRegular, fontSize: 12.5, lineHeight: 19 },
  sourceTime: { color: 'rgba(248,245,239,0.42)', fontFamily: pluggdFonts.satoshiMedium, fontSize: 10.5, lineHeight: 16, paddingBottom: 20 },
  modalScreen: { flex: 1, backgroundColor: '#080706' },
  modalHeader: { padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.12)' },
  modalTitle: { color: INK, fontFamily: pluggdFonts.displayExtraBold, fontSize: 28, lineHeight: 33 },
  modalContent: { padding: 20, gap: 26 },
  modalIntro: { color: MUTED, fontFamily: pluggdFonts.satoshiRegular, fontSize: 14, lineHeight: 21 },
  choiceGroup: { gap: 10 },
  choiceLabel: { color: INK, fontFamily: pluggdFonts.displayBold, fontSize: 17 },
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: { minHeight: 44, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#14110E' },
  choiceSelected: { backgroundColor: ORANGE, borderColor: ORANGE },
  choiceText: { color: INK, fontFamily: pluggdFonts.satoshiBold, fontSize: 12.5 },
  choiceTextSelected: { color: '#080706' },
  accessChoice: { minHeight: 82, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.2)', backgroundColor: '#14110E', padding: 15 },
  accessTitle: { color: INK, fontFamily: pluggdFonts.satoshiBold, fontSize: 13.5 },
  accessBody: { color: MUTED, fontFamily: pluggdFonts.satoshiRegular, fontSize: 11.5, lineHeight: 16, marginTop: 3 },
  accessBodySelected: { color: 'rgba(8,7,6,0.66)' },
  modalFooter: { padding: 20, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.12)' },
  buildButton: { minHeight: 54, borderRadius: 16, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10 },
  buildButtonText: { color: '#080706', fontFamily: pluggdFonts.satoshiBlack, fontSize: 14, textTransform: 'uppercase', letterSpacing: 0.5 },
});

export default CarnivalHubScreen;

