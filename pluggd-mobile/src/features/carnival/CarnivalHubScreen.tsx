import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Modal, Pressable, ScrollView, Share, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { PluggdImage } from '../../components/PluggdImage';
import { impactHaptic, selectionHaptic } from '../../design/haptics';
import { pluggdFonts } from '../../design/typography';
import { edFonts } from '../../design/editorial';
import { usePluggdTheme } from '../../design/usePluggdTheme';
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

const DEFAULT_PREFERENCES: CarnivalRoutePreferences = { day: 'Sunday', sound: 'Surprise me', pace: 'Balanced', accessible: false };
const JUMP_LINKS = [
  ['guide', 'The Guide'], ['stories', 'Stories'], ['weekend', 'The weekend'], ['build', 'Build my Carnival'],
  ['map', 'Live map'], ['sounds', 'Sound systems'], ['bands', 'Bands'], ['community', 'Community'],
  ['essentials', 'Travel + access'], ['faq', 'FAQs'],
] as const;

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
  const theme = usePluggdTheme();
  const styles = useCarnivalStyles();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: viewportWidth } = useWindowDimensions();
  const mobileWebRailWidth = Math.min(Math.round(viewportWidth * 0.82), Math.max(280, viewportWidth - 32));
  const scrollRef = useRef<ScrollView>(null);
  const sectionY = useRef<Record<string, number>>({});
  const [saved, setSaved] = useState(false);
  const [going, setGoing] = useState(false);
  const [routeBuilderOpen, setRouteBuilderOpen] = useState(false);
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [savedRoute, setSavedRoute] = useState<SavedCarnivalRoute | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [openFaq, setOpenFaq] = useState<string | null>(null);

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
      Alert.alert('No route yet', 'We could not build a route from those choices. Try a broader sound or pace.');
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
        <StatusBar style={theme.scheme === 'light' ? 'dark' : 'light'} />
        <ActivityIndicator color={theme.colors.accentFill} />
        <Text style={styles.loadingText}>Opening the Carnival guide…</Text>
      </SafeAreaView>
    );
  }

  if (!bundle || query.isError) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar style={theme.scheme === 'light' ? 'dark' : 'light'} />
        <MaterialIcons name="festival" size={34} color={theme.colors.accentText} />
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
      <StatusBar style={theme.scheme === 'light' ? 'dark' : 'light'} />
      <ScrollView ref={scrollRef} stickyHeaderIndices={[1]} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 64 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <PluggdImage uri={bundle.hub.heroImageUrl} style={StyleSheet.absoluteFill} resizeMode="cover" displayWidth={1100} accessibilityLabel="Masqueraders at Notting Hill Carnival" />
          <LinearGradient colors={['rgba(6,5,4,0.06)', 'rgba(6,5,4,0.36)', '#080706']} locations={[0, 0.48, 1]} style={StyleSheet.absoluteFill} />
          <View style={[styles.heroTop, { paddingTop: insets.top + 8 }]}>
            <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={goBack} style={styles.roundButton}>
              <MaterialIcons name="arrow-back" size={22} color={theme.colors.mediaText} />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Share Carnival guide" onPress={() => Share.share({ message: 'Notting Hill Carnival 2026 on PLUGGD https://pluggd.fm/hubs/notting-hill-carnival-2026' })} style={styles.roundButton}>
              <MaterialIcons name="ios-share" size={21} color={theme.colors.mediaText} />
            </Pressable>
          </View>
          <View style={styles.heroCopy}>
            <View style={styles.heroIdentityRow}>
              <Text style={styles.eyebrow}>PLUGGD PRESENTS</Text>
              <Text style={styles.heroIdentity}>WEST LONDON · DIAMOND JUBILEE</Text>
            </View>
            <Text style={styles.heroAnniversary}>60 YEARS ON THE ROAD</Text>
            <Text style={[styles.heroTitle, viewportWidth < 390 && styles.heroTitleCompact]}>Notting Hill{`\n`}Carnival</Text>
            <Text style={styles.heroDescription}>Plan your road. Find your sound. Save the essentials.</Text>
            <Text style={styles.heroMeta}>29—31 AUGUST 2026</Text>
            <View style={styles.heroActionGrid}>
              <Pressable accessibilityRole="button" accessibilityLabel="Explore the Carnival map" onPress={() => router.push('/maps?hub=notting-hill-carnival-2026' as any)} style={styles.heroActionTile}>
                <MaterialIcons name="map" size={19} color={theme.colors.mediaText} />
                <Text style={styles.heroActionText}>Explore the map</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Build my Carnival" onPress={() => setRouteBuilderOpen(true)} style={styles.heroActionTile}>
                <MaterialIcons name="route" size={19} color={theme.colors.mediaText} />
                <Text style={styles.heroActionText}>Build my Carnival</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={saved ? 'Carnival saved' : 'Save Carnival'} onPress={() => updateRsvp('interested')} style={[styles.heroActionTile, saved && styles.heroActionSelected]}>
                <MaterialIcons name={saved ? 'bookmark' : 'bookmark-border'} size={19} color={saved ? theme.colors.artworkBase : theme.colors.mediaText} />
                <Text style={[styles.heroActionText, saved && styles.heroActionSelectedText]}>{saved ? 'Saved' : 'Save Carnival'}</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={going ? 'Marked as going' : 'Mark as going'} onPress={() => updateRsvp('going')} style={[styles.heroActionTile, going && styles.heroActionSelected]}>
                <MaterialIcons name="celebration" size={19} color={going ? theme.colors.artworkBase : theme.colors.mediaText} />
                <Text style={[styles.heroActionText, going && styles.heroActionSelectedText]}>{going ? 'Going' : 'I’m Going'}</Text>
              </Pressable>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Plan the three Carnival days" onPress={() => scrollTo('weekend')} style={styles.heroDatePanel}>
              <View><Text style={styles.heroDateKicker}>AUGUST BANK HOLIDAY</Text><Text style={styles.heroDateValue}>29–31</Text></View>
              <View style={styles.heroDateAction}><Text style={styles.heroDateActionText}>Plan the three days</Text><MaterialIcons name="arrow-downward" size={17} color={theme.colors.mediaText} /></View>
            </Pressable>
          </View>
        </View>

        <View style={styles.jumpShell}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.jumpRow}>
            {JUMP_LINKS.map(([id, label]) => (
              <Pressable key={id} accessibilityRole="button" accessibilityLabel={`Jump to ${label}`} onPress={() => scrollTo(id)} style={styles.jumpButton}>
                <Text style={styles.jumpText}>{label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View onLayout={(event) => { sectionY.current.guide = event.nativeEvent.layout.y; }} style={styles.section}>
          <View style={styles.statusCard}>
            <Text style={styles.statusLabel}>{bundle.guide.status.label}</Text>
            <Text style={styles.statusTitle}>{bundle.guide.status.title}</Text>
            <Text style={styles.statusCopy}>{bundle.guide.status.copy}</Text>
          </View>
          {bundle.stories[0] ? (
            <Pressable accessibilityRole="button" accessibilityLabel={`Read ${bundle.stories[0].title}`} onPress={() => openStory(bundle.stories[0].slug)} style={styles.guideFeature}>
              <PluggdImage uri={bundle.stories[0].imageUrl} style={StyleSheet.absoluteFill} resizeMode="cover" displayWidth={780} accessibilityLabel="" />
              <LinearGradient colors={['rgba(8,7,6,0.08)', 'rgba(8,7,6,0.94)']} locations={[0.2, 1]} style={StyleSheet.absoluteFill} />
              <View style={styles.guideMasthead}><Text style={styles.guideMastheadText}>THE PLUG</Text><Text style={styles.guideMastheadText}>CARNIVAL 60 · 2026</Text></View>
              <View style={styles.guideCopy}>
                <Text style={styles.guideKicker}>START HERE · THE COMPLETE GUIDE</Text>
                <Text style={styles.guideTitle}>{bundle.stories[0].title}</Text>
                <Text style={styles.guideDescription}>{bundle.stories[0].description}</Text>
                <Text style={styles.guideAction}>Read the complete guide →</Text>
              </View>
            </Pressable>
          ) : null}
        </View>

        <View onLayout={(event) => { sectionY.current.stories = event.nativeEvent.layout.y; }} style={styles.section}>
          <SectionHeader eyebrow="Go deeper" title="Seven ways into the road." meta={`${Math.max(bundle.stories.length - 1, 0)} published stories`} />
          <Text style={styles.sectionLead}>Sound, pan, mas, J’ouvert, food and road etiquette—reported by PLUGGD, built to travel with you.</Text>
          <ScrollView
            horizontal
            style={styles.storyRailViewport}
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            snapToAlignment="start"
            snapToInterval={mobileWebRailWidth + 9}
            contentContainerStyle={styles.storyRail}
          >
            {bundle.stories.slice(1).map((story) => (
              <View key={story.slug} style={[styles.storyFrame, { width: mobileWebRailWidth }]}>
                <Pressable accessibilityRole="button" accessibilityLabel={`Read ${story.title}`} onPress={() => openStory(story.slug)} style={styles.storySurface}>
                  <PluggdImage uri={story.imageUrl} style={styles.storyImage} resizeMode="cover" displayWidth={760} accessibilityLabel="" />
                  <LinearGradient colors={['rgba(5,4,3,0.04)', 'rgba(5,4,3,0.96)']} locations={[0.2, 1]} style={StyleSheet.absoluteFill} />
                  <View style={styles.storyCopy}>
                    <Text style={styles.storyLabel}>CARNIVAL FIELD NOTE</Text>
                    <Text style={styles.storyTitle}>{story.title}</Text>
                    <Text style={styles.storyCta}>Read story →</Text>
                  </View>
                </Pressable>
              </View>
            ))}
          </ScrollView>
        </View>

        <View onLayout={(event) => { sectionY.current.weekend = event.nativeEvent.layout.y; }} style={styles.section}>
          <SectionHeader eyebrow="29—31 August 2026" title="Choose your road." meta="One weekend · three energies" />
          <Text style={styles.sectionLead}>Start with the day that sounds like you—then build only as much plan as you need.</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            snapToAlignment="start"
            snapToInterval={mobileWebRailWidth + 9}
            contentContainerStyle={styles.weekendRail}
          >
            {bundle.guide.weekend.map((day) => (
              <View key={day.id} style={[styles.weekendCard, { width: mobileWebRailWidth }]}>
                <PluggdImage uri={day.imageUrl || bundle.hub.heroImageUrl} style={styles.weekendImage} resizeMode="cover" displayWidth={760} accessibilityLabel="" />
                <LinearGradient colors={['transparent', 'rgba(8,7,6,0.95)']} style={StyleSheet.absoluteFill} />
                <View style={styles.weekendCopy}>
                  <Text style={styles.weekendKicker}>{day.kicker}</Text>
                  <Text style={styles.weekendTitle}>{day.title}</Text>
                  <Text style={styles.weekendBody}>{day.body}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
          <Text style={styles.weekendNote}>At 3pm on Sunday and Monday, Carnival pauses for a 72-second Moment of Reflection.</Text>
        </View>

        <View onLayout={(event) => { sectionY.current.build = event.nativeEvent.layout.y; }} style={styles.section}>
          <SectionHeader eyebrow="Build my Carnival" title="Pick the feeling. We’ll find the corners." meta="Saved to this device" />
          <Pressable accessibilityRole="button" accessibilityLabel="Build my Carnival route" onPress={() => setRouteBuilderOpen(true)} style={styles.routeBuilderCard}>
            <MaterialIcons name="route" size={28} color={theme.colors.accentText} />
            <View style={{ flex: 1 }}><Text style={styles.routeBuilderTitle}>Choose your day, sound and pace</Text><Text style={styles.routeBuilderBody}>Build a starting route from real published map points, then keep it close on the road.</Text></View>
            <MaterialIcons name="arrow-forward" size={20} color={theme.colors.text} />
          </Pressable>
        </View>

        <View onLayout={(event) => { sectionY.current.map = event.nativeEvent.layout.y; }} style={styles.section}>
          <SectionHeader eyebrow="TRUSTED LOCAL PICKS" title="Map the road" meta={`${mappedSignals.length} places`} />
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
                <MaterialIcons name="ios-share" size={18} color={theme.colors.accentText} />
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
                <Text style={styles.signalBody} numberOfLines={4}>{signal.body || 'Carnival location.'}</Text>
                <View style={styles.tagRow}>{(signal.mood_tags ?? []).slice(0, 2).map((tag) => <Text key={tag} style={styles.tag}>#{tag}</Text>)}</View>
              </View>
            ))}
          </ScrollView>

        </View>

        <View onLayout={(event) => { sectionY.current.bands = event.nativeEvent.layout.y; }} style={styles.section}>
          <SectionHeader eyebrow="Mas, pan and movement" title="Bands on the road" meta={`${bundle.guide.bands.reduce((count, group) => count + group.names.length, 0)} listed entries`} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bandRail}>
            {bundle.guide.bands.map((group) => (
              <View key={group.name} style={styles.bandCard}>
                <Text style={styles.bandName}>{group.name}</Text>
                <Text style={styles.bandCount}>{group.names.length} BANDS</Text>
                <Text style={styles.bandList}>{group.names.join('\n')}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        <View onLayout={(event) => { sectionY.current.community = event.nativeEvent.layout.y; }} style={styles.section}>
          <SectionHeader eyebrow="Keep what the algorithm misses" title="Save the road." meta="Community canvases" />
          <Text style={styles.sectionLead}>Photos, food finds and the tune that changed the whole corner. Drop a Carnival pin for the community; PLUGGD curates selected memories into living visual and audio canvases.</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Drop a Carnival pin" onPress={() => router.push('/maps?hub=notting-hill-carnival-2026&compose=1' as any)} style={styles.communityAction}>
            <MaterialIcons name="add-location-alt" size={20} color={theme.colors.onAccent} />
            <Text style={styles.communityActionText}>Drop a Carnival pin</Text>
          </Pressable>
          {bundle.soundboards.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storyRail}>
              {bundle.soundboards.map((board, index) => (
                <Pressable key={board.id} accessibilityRole="button" accessibilityLabel={`Open ${board.title} soundboard`} onPress={() => router.push(`/soundboards/${board.slug || board.id}` as any)} style={({ pressed }) => [styles.soundboardCard, pressed && styles.pressed]}>
                  <PluggdImage uri={board.cover_image_url ?? ''} style={styles.soundboardImage} resizeMode="cover" displayWidth={500} accessibilityLabel="" />
                  <LinearGradient colors={['transparent', 'rgba(5,4,3,0.92)']} style={StyleSheet.absoluteFill} />
                  <View style={styles.soundboardCopy}>
                    <Text style={styles.soundboardLabel}>{String(index + 1).padStart(2, '0')} · CURATED PLUGGD CANVAS</Text>
                    <Text style={styles.soundboardTitle} numberOfLines={2}>{board.title}</Text>
                    <Text style={styles.soundboardMeta}>{board.description || `${board.item_count ?? 0} pieces · Open board`}</Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          ) : null}
        </View>

        <View onLayout={(event) => { sectionY.current.essentials = event.nativeEvent.layout.y; }} style={styles.section}>
          <SectionHeader eyebrow="Take the essentials" title="Travel, access and offline" meta={updatedLabel(bundle.offline.updatedAt)} />
          <View style={styles.guidanceGrid}>
            <View style={styles.guidanceCard}>
              <MaterialIcons name="train" size={22} color={theme.colors.accentText} />
              <Text style={styles.guidanceTitle}>Getting there</Text>
              {bundle.guide.travel.map((item) => (
                <View key={item.name} style={styles.guidanceRow}>
                  <Text style={styles.guidanceName}>{item.name}</Text>
                  <Text style={styles.guidanceStatus}>{item.status}</Text>
                  <Text style={styles.guidanceDetail}>{item.detail}</Text>
                </View>
              ))}
            </View>
            <View style={styles.guidanceCard}>
              <MaterialIcons name="accessible" size={22} color={theme.colors.accentText} />
              <Text style={styles.guidanceTitle}>Access and quieter spaces</Text>
              {bundle.guide.access.map((item) => (
                <View key={item.name} style={styles.guidanceRow}>
                  <Text style={styles.guidanceName}>{item.name}</Text>
                  <Text style={styles.guidanceDetail}>{item.detail}</Text>
                </View>
              ))}
            </View>
          </View>
          <View style={styles.essentialsCard}>
            {bundle.officialLinks.map((link) => (
              <Pressable key={link.id} accessibilityRole="link" accessibilityLabel={`Open ${link.title}`} onPress={() => Linking.openURL(link.url)} style={styles.officialRow}>
                <MaterialIcons name={link.id === 'access' ? 'accessible' : link.id === 'tfl' ? 'train' : link.id === 'safety' ? 'health-and-safety' : 'directions'} size={20} color={theme.colors.accentText} />
                <Text style={styles.officialTitle}>{link.title}</Text>
                <MaterialIcons name="open-in-new" size={17} color={theme.colors.textMuted} />
              </Pressable>
            ))}
            <Pressable accessibilityRole="button" accessibilityLabel="Save Carnival road pack for offline access" onPress={saveRoadPack} disabled={downloading} style={styles.downloadButton}>
              {downloading ? <ActivityIndicator color={theme.colors.onAccent} /> : <MaterialIcons name="offline-pin" size={20} color={theme.colors.onAccent} />}
              <Text style={styles.downloadText}>{downloading ? 'Saving road pack…' : 'Save road pack offline'}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Open saved Carnival road pack" onPress={() => router.push('/carnival/road-pack' as any)} style={styles.inlineButton}>
              <MaterialIcons name="description" size={18} color={theme.colors.accentText} />
              <Text style={styles.inlineButtonText}>Open saved road pack</Text>
            </Pressable>
          </View>
          <Text style={styles.disclaimer}>{bundle.disclaimer}</Text>
          <Text style={styles.sourceTime}>Information updated {formatDate(bundle.sourceCheckedAt)}. Only confirmed status updates are shown.</Text>
        </View>

        <View onLayout={(event) => { sectionY.current.faq = event.nativeEvent.layout.y; }} style={styles.section}>
          <SectionHeader eyebrow="Before you go" title="Carnival questions" meta="Practical answers" />
          <View style={styles.faqList}>
            {bundle.guide.faqs.map((item) => {
              const expanded = openFaq === item.question;
              return (
                <Pressable key={item.question} accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setOpenFaq(expanded ? null : item.question)} style={styles.faqItem}>
                  <View style={styles.faqQuestionRow}>
                    <Text style={styles.faqQuestion}>{item.question}</Text>
                    <MaterialIcons name={expanded ? 'remove' : 'add'} size={20} color={theme.colors.accentText} />
                  </View>
                  {expanded ? <Text style={styles.faqAnswer}>{item.answer}</Text> : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <RouteBuilderModal
        visible={routeBuilderOpen}
        signals={bundle.signals}
        preferences={preferences}
        onChange={setPreferences}
        onClose={() => setRouteBuilderOpen(false)}
        onBuild={createRoute}
      />
    </View>
  );
}

function SectionHeader({ eyebrow, title, meta }: { eyebrow: string; title: string; meta: string }) {
  const styles = useCarnivalStyles();
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderMetaRow}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.sectionMeta}>{meta}</Text>
      </View>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function ChoiceRow<T extends string>({ label, values, value, onChange }: { label: string; values: T[]; value: T; onChange: (value: T) => void }) {
  const styles = useCarnivalStyles();
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

function RouteBuilderModal({ visible, signals, preferences, onChange, onClose, onBuild }: { visible: boolean; signals: CarnivalSignal[]; preferences: CarnivalRoutePreferences; onChange: (value: CarnivalRoutePreferences) => void; onClose: () => void; onBuild: () => void }) {
  const theme = usePluggdTheme();
  const styles = useCarnivalStyles();
  const preview = useMemo(() => buildCarnivalRoute(signals, preferences), [preferences, signals]);
  const hasStops = preview.stops.length > 0;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalScreen}>
        <View style={styles.modalHeader}>
          <View>
            <Text style={styles.eyebrow}>ROUTE BUILDER</Text>
            <Text style={styles.modalTitle}>Build My Carnival</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Close route builder" onPress={() => { selectionHaptic(); onClose(); }} style={styles.modalCloseButton}><MaterialIcons name="close" size={22} color={theme.colors.text} /></Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.modalContent}>
          <View style={styles.builderLead}>
            <View style={styles.builderLeadIcon}><MaterialIcons name="route" size={25} color={theme.colors.onAccent} /></View>
            <View style={styles.builderLeadCopy}>
              <Text style={styles.builderLeadEyebrow}>YOUR DAY, YOUR SOUND</Text>
              <Text style={styles.builderLeadTitle}>{hasStops ? `${preview.stops.length} guide stops fit your plan` : 'Build a broader Carnival plan'}</Text>
              <Text style={styles.builderLeadBody}>Choose what matters to you, preview real places from the published guide, then save the route to the map.</Text>
            </View>
          </View>
          <View style={styles.builderSteps} accessibilityLabel="Choose, preview and save your Carnival route">
            {['Choose', 'Preview', 'Save'].map((step, index) => (
              <View key={step} style={styles.builderStep}>
                <Text style={styles.builderStepNumber}>{index + 1}</Text>
                <Text style={styles.builderStepLabel}>{step}</Text>
              </View>
            ))}
          </View>
          <ChoiceRow label="Day" values={['Sunday', 'Monday']} value={preferences.day} onChange={(day) => onChange({ ...preferences, day })} />
          <ChoiceRow label="Sound" values={['Surprise me', 'Reggae', 'Soca', 'Afrobeats']} value={preferences.sound} onChange={(sound) => onChange({ ...preferences, sound })} />
          <ChoiceRow label="Pace" values={['Easy', 'Balanced', 'Full road']} value={preferences.pace} onChange={(pace) => onChange({ ...preferences, pace })} />
          <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: preferences.accessible }} onPress={() => { selectionHaptic(); onChange({ ...preferences, accessible: !preferences.accessible }); }} style={[styles.accessChoice, preferences.accessible && styles.choiceSelected]}>
            <MaterialIcons name="accessible" size={22} color={preferences.accessible ? theme.colors.onAccent : theme.colors.accentText} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.accessTitle, preferences.accessible && styles.choiceTextSelected]}>Prioritise access and essential points</Text>
              <Text style={[styles.accessBody, preferences.accessible && styles.accessBodySelected]}>Includes verified access, toilets, medical and quieter points where available.</Text>
            </View>
          </Pressable>
          <View style={styles.routePreview}>
            <View style={styles.routePreviewHeader}>
              <View>
                <Text style={styles.routeEyebrow}>LIVE ROUTE PREVIEW</Text>
                <Text style={styles.routePreviewTitle}>{preferences.day} · {preferences.sound}</Text>
              </View>
              <View style={styles.routePreviewCount}>
                <Text style={styles.routePreviewCountValue}>{preview.stops.length}</Text>
                <Text style={styles.routePreviewCountLabel}>STOPS</Text>
              </View>
            </View>
            {hasStops ? (
              <View style={styles.routePreviewStops}>
                {preview.stops.slice(0, 4).map((stop, index) => (
                  <View key={stop.id} style={styles.routePreviewStop}>
                    <View style={styles.routePreviewNumber}><Text style={styles.routePreviewNumberText}>{index + 1}</Text></View>
                    <View style={styles.routePreviewStopCopy}>
                      <Text style={styles.routePreviewStopTitle}>{stop.location_label || 'Carnival stop'}</Text>
                      <Text style={styles.routePreviewStopMeta}>{carnivalSignalCategory(stop)}</Text>
                    </View>
                  </View>
                ))}
                {preview.stops.length > 4 ? <Text style={styles.routePreviewMore}>+ {preview.stops.length - 4} more stops on your map</Text> : null}
              </View>
            ) : (
              <View style={styles.routePreviewEmpty}>
                <MaterialIcons name="tune" size={22} color={theme.colors.accentText} />
                <Text style={styles.routePreviewEmptyText}>Try “Surprise me” or a different pace to find more published places.</Text>
              </View>
            )}
            <Text style={styles.routePreviewNote}>This is a discovery plan, not live navigation or an official operational map.</Text>
          </View>
        </ScrollView>
        <View style={styles.modalFooter}>
          <Pressable accessibilityRole="button" accessibilityLabel="Build and save Carnival route" accessibilityState={{ disabled: !hasStops }} disabled={!hasStops} onPress={onBuild} style={[styles.buildButton, !hasStops && styles.buildButtonDisabled]}>
            <Text style={styles.buildButtonText}>Build & save route</Text>
            <MaterialIcons name="route" size={21} color={theme.colors.onAccent} />
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function useCarnivalStyles() {
  const theme = usePluggdTheme();
  return useMemo(() => StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  loadingScreen: { flex: 1, backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 12 },
  loadingText: { color: theme.colors.textSecondary, fontFamily: pluggdFonts.satoshiMedium, fontSize: 14 },
  errorTitle: { color: theme.colors.text, fontFamily: pluggdFonts.displayBold, fontSize: 23, textAlign: 'center' },
  errorCopy: { color: theme.colors.textSecondary, fontFamily: pluggdFonts.satoshiRegular, fontSize: 14, lineHeight: 21, textAlign: 'center', maxWidth: 310 },
  content: { backgroundColor: theme.colors.background },
  hero: { minHeight: 760, justifyContent: 'space-between', overflow: 'hidden' },
  heroTop: { zIndex: 2, paddingHorizontal: 18, flexDirection: 'row', justifyContent: 'space-between' },
  roundButton: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(8,7,6,0.72)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.28)' },
  heroCopy: { zIndex: 2, paddingHorizontal: 20, paddingBottom: 24, gap: 10 },
  heroIdentityRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  heroIdentity: { flex: 1, minWidth: 0, color: 'rgba(255,255,255,0.72)', fontFamily: pluggdFonts.satoshiBlack, fontSize: 8.5, letterSpacing: 1.05, textAlign: 'right' },
  heroAnniversary: { color: '#FFD18E', fontFamily: pluggdFonts.satoshiBlack, fontSize: 10, letterSpacing: 2.1 },
  eyebrow: { color: theme.colors.accentText, fontFamily: pluggdFonts.satoshiBlack, fontSize: 10.5, lineHeight: 14, letterSpacing: 1.5, textTransform: 'uppercase' },
  heroTitle: { color: theme.colors.mediaText, fontFamily: edFonts.serif, fontSize: 44, lineHeight: 42, letterSpacing: -1.35 },
  heroTitleCompact: { fontSize: 38, lineHeight: 37, letterSpacing: -1.1 },
  heroMeta: { color: theme.colors.mediaText, fontFamily: pluggdFonts.satoshiBold, fontSize: 13, lineHeight: 18 },
  heroDescription: { color: 'rgba(255,255,255,0.76)', fontFamily: pluggdFonts.satoshiRegular, fontSize: 15, lineHeight: 22, maxWidth: 346 },
  heroActionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  heroActionTile: { width: '48.7%', minHeight: 52, paddingHorizontal: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.36)', backgroundColor: 'rgba(8,7,6,0.7)', flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroActionText: { flex: 1, color: theme.colors.mediaText, fontFamily: pluggdFonts.satoshiBlack, fontSize: 11.5, lineHeight: 15 },
  heroActionSelected: { backgroundColor: theme.colors.mediaText, borderColor: theme.colors.mediaText },
  heroActionSelectedText: { color: theme.colors.artworkBase },
  heroDatePanel: { minHeight: 82, marginTop: 4, borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.32)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  heroDateKicker: { color: '#FFD18E', fontFamily: pluggdFonts.satoshiBlack, fontSize: 8.5, letterSpacing: 1.5 },
  heroDateValue: { color: theme.colors.mediaText, fontFamily: edFonts.serif, fontSize: 31, lineHeight: 34 },
  heroDateAction: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  heroDateActionText: { color: theme.colors.mediaText, fontFamily: pluggdFonts.satoshiBold, fontSize: 12.5 },
  heroActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  primaryButton: { minHeight: 48, borderRadius: 14, backgroundColor: theme.colors.accentFill, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  primaryButtonText: { color: theme.colors.onAccent, fontFamily: pluggdFonts.satoshiBlack, fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 },
  secondaryButton: { minHeight: 48, borderRadius: 14, backgroundColor: theme.colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.controlBorder, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  secondaryButtonText: { color: theme.colors.text, fontFamily: pluggdFonts.satoshiBlack, fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 },
  selectedButton: { backgroundColor: theme.colors.accentFill },
  selectedButtonText: { color: theme.colors.onAccent },
  textButton: { minHeight: 44, justifyContent: 'center' },
  textButtonText: { color: theme.colors.accentText, fontFamily: pluggdFonts.satoshiBold, fontSize: 14 },
  jumpShell: { backgroundColor: theme.colors.headerGlass, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border },
  jumpRow: { paddingHorizontal: 14, paddingVertical: 9, gap: 7 },
  jumpButton: { minHeight: 44, borderRadius: 999, paddingHorizontal: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surfaceRaised, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.controlBorder },
  jumpText: { color: theme.colors.text, fontFamily: pluggdFonts.satoshiBold, fontSize: 12 },
  statusCard: { borderRadius: 24, padding: 20, gap: 8, backgroundColor: theme.colors.surfaceAlt, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border },
  statusLabel: { color: theme.colors.accentText, fontFamily: pluggdFonts.satoshiBlack, fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase' },
  statusTitle: { color: theme.colors.text, fontFamily: pluggdFonts.displayExtraBold, fontSize: 28, lineHeight: 31 },
  statusCopy: { color: theme.colors.textSecondary, fontFamily: pluggdFonts.satoshiRegular, fontSize: 14, lineHeight: 21 },
  statusAction: { minHeight: 48, marginTop: 8, borderRadius: 14, paddingHorizontal: 16, backgroundColor: theme.colors.accentFill, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusActionText: { color: theme.colors.onAccent, fontFamily: pluggdFonts.satoshiBlack, fontSize: 13 },
  guideFeature: { minHeight: 620, overflow: 'hidden', backgroundColor: '#17120F', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.18)' },
  guideMasthead: { padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  guideMastheadText: { color: theme.colors.mediaText, fontFamily: pluggdFonts.satoshiBlack, fontSize: 9.5, letterSpacing: 1.2 },
  guideCopy: { marginTop: 'auto', padding: 20, gap: 8 },
  guideKicker: { color: '#FFD18E', fontFamily: pluggdFonts.satoshiBlack, fontSize: 9.5, letterSpacing: 1.15 },
  guideTitle: { color: theme.colors.mediaText, fontFamily: edFonts.serif, fontSize: 34, lineHeight: 34, letterSpacing: -0.9 },
  guideDescription: { color: 'rgba(255,255,255,0.76)', fontFamily: pluggdFonts.satoshiRegular, fontSize: 13.5, lineHeight: 20 },
  guideAction: { color: theme.colors.accentFill, fontFamily: pluggdFonts.satoshiBlack, fontSize: 13, marginTop: 4 },
  sectionLead: { color: theme.colors.textSecondary, fontFamily: pluggdFonts.satoshiRegular, fontSize: 13.5, lineHeight: 21 },
  weekendRail: { gap: 9, paddingRight: 18 },
  weekendCard: { height: 464, flexShrink: 0, overflow: 'hidden', backgroundColor: '#17120F' },
  weekendImage: { ...StyleSheet.absoluteFillObject, width: undefined, height: undefined },
  weekendCopy: { marginTop: 'auto', padding: 18, gap: 7 },
  weekendKicker: { color: theme.colors.accentFill, fontFamily: pluggdFonts.satoshiBlack, fontSize: 9.5, letterSpacing: 1.15 },
  weekendTitle: { color: theme.colors.mediaText, fontFamily: edFonts.serif, fontSize: 33, lineHeight: 34, letterSpacing: -0.8 },
  weekendBody: { color: 'rgba(255,255,255,0.72)', fontFamily: pluggdFonts.satoshiRegular, fontSize: 12.5, lineHeight: 18 },
  weekendNote: { color: theme.colors.textSecondary, fontFamily: pluggdFonts.satoshiMedium, fontSize: 12, lineHeight: 18, paddingVertical: 4 },
  gatewayGrid: { padding: 18, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gateway: { width: '48.5%', minHeight: 170, borderRadius: 22, backgroundColor: theme.colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border, padding: 16, gap: 8, justifyContent: 'space-between' },
  gatewayTitle: { color: theme.colors.text, fontFamily: pluggdFonts.displayBold, fontSize: 17, lineHeight: 21 },
  gatewayBody: { color: theme.colors.textSecondary, fontFamily: pluggdFonts.satoshiRegular, fontSize: 12.5, lineHeight: 17 },
  routeBuilderCard: { minHeight: 132, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: theme.colors.surfaceAlt, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.controlBorder },
  routeBuilderTitle: { color: theme.colors.text, fontFamily: pluggdFonts.displayBold, fontSize: 18, lineHeight: 22 },
  routeBuilderBody: { color: theme.colors.textSecondary, fontFamily: pluggdFonts.satoshiRegular, fontSize: 12.5, lineHeight: 18, marginTop: 4 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  section: { paddingHorizontal: 18, paddingTop: 52, gap: 16 },
  sectionHeader: { gap: 8 },
  sectionHeaderMetaRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  sectionTitle: { width: '100%', color: theme.colors.text, fontFamily: pluggdFonts.displayBold, fontSize: 17, lineHeight: 21, letterSpacing: -0.35 },
  sectionMeta: { flexShrink: 1, color: theme.colors.textMuted, fontFamily: pluggdFonts.satoshiMedium, fontSize: 10.5, maxWidth: 154, textAlign: 'right', lineHeight: 15 },
  routeCard: { borderRadius: 22, backgroundColor: theme.colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.borderAccent, padding: 17, gap: 12 },
  routeEyebrow: { color: theme.colors.accentText, fontFamily: pluggdFonts.satoshiBlack, fontSize: 10, letterSpacing: 1.25 },
  routeTitle: { color: theme.colors.text, fontFamily: pluggdFonts.displayBold, fontSize: 18, lineHeight: 23 },
  routeStops: { gap: 4 },
  routeStop: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.divider },
  routeNumber: { color: theme.colors.accentText, fontFamily: pluggdFonts.displayBold, fontSize: 15 },
  routeStopTitle: { color: theme.colors.text, fontFamily: pluggdFonts.satoshiBold, fontSize: 13.5 },
  routeStopMeta: { color: theme.colors.textSecondary, fontFamily: pluggdFonts.satoshiRegular, fontSize: 11.5 },
  inlineButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8 },
  inlineButtonText: { color: theme.colors.accentText, fontFamily: pluggdFonts.satoshiBold, fontSize: 13 },
  signalRail: { gap: 12, paddingRight: 18 },
  signalCard: { width: 230, minHeight: 228, borderRadius: 22, backgroundColor: theme.colors.surfaceAlt, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border, padding: 17, gap: 8 },
  signalNumber: { color: theme.colors.accentText, fontFamily: pluggdFonts.displayExtraBold, fontSize: 24 },
  signalCategory: { color: theme.colors.accentText, fontFamily: pluggdFonts.satoshiBlack, fontSize: 9.5, letterSpacing: 1.1, textTransform: 'uppercase' },
  signalTitle: { color: theme.colors.text, fontFamily: pluggdFonts.displayBold, fontSize: 20, lineHeight: 23 },
  signalBody: { color: theme.colors.textSecondary, fontFamily: pluggdFonts.satoshiRegular, fontSize: 12.5, lineHeight: 18 },
  tagRow: { flexDirection: 'row', gap: 8, marginTop: 'auto' },
  tag: { color: theme.colors.accentText, fontFamily: pluggdFonts.satoshiBold, fontSize: 10.5 },
  subsectionTitle: { color: theme.colors.text, fontFamily: pluggdFonts.displayBold, fontSize: 20, marginTop: 8 },
  storyRail: { gap: 9, paddingRight: 18 },
  storyRailViewport: { height: 432, flexGrow: 0 },
  soundboardCard: { width: 244, height: 278, borderRadius: 22, overflow: 'hidden', backgroundColor: '#17120F' },
  soundboardImage: { ...StyleSheet.absoluteFillObject, width: undefined, height: undefined },
  soundboardCopy: { marginTop: 'auto', padding: 16, gap: 4 },
  soundboardLabel: { color: theme.colors.accentFill, fontFamily: pluggdFonts.satoshiBlack, fontSize: 9.5, letterSpacing: 1.1 },
  soundboardTitle: { color: theme.colors.mediaText, fontFamily: pluggdFonts.displayBold, fontSize: 20, lineHeight: 23 },
  soundboardMeta: { color: 'rgba(255,255,255,0.66)', fontFamily: pluggdFonts.satoshiMedium, fontSize: 11.5 },
  communityAction: { alignSelf: 'flex-start', minHeight: 48, paddingHorizontal: 16, backgroundColor: theme.colors.accentFill, flexDirection: 'row', alignItems: 'center', gap: 8 },
  communityActionText: { color: theme.colors.onAccent, fontFamily: pluggdFonts.satoshiBlack, fontSize: 13 },
  storyFrame: { height: 432, flexShrink: 0, overflow: 'hidden', backgroundColor: '#17120F' },
  storySurface: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  storyImage: { ...StyleSheet.absoluteFillObject, width: undefined, height: undefined },
  storyCopy: { position: 'absolute', left: 18, right: 18, bottom: 20, zIndex: 2, minWidth: 0, gap: 10 },
  storyLabel: { color: '#FFD047', fontFamily: pluggdFonts.satoshiBlack, fontSize: 9.5, letterSpacing: 1.2 },
  storyTitle: { flexShrink: 1, color: '#FFF7E7', fontFamily: edFonts.serif, fontSize: 30, lineHeight: 31, letterSpacing: -0.7 },
  storyDescription: { color: 'rgba(255,247,231,0.72)', fontFamily: pluggdFonts.satoshiRegular, fontSize: 12.5, lineHeight: 18 },
  storyCta: { color: '#FFF7E7', fontFamily: pluggdFonts.satoshiBlack, fontSize: 12, marginTop: 2 },
  bandRail: { gap: 12, paddingRight: 18, alignItems: 'flex-start' },
  bandCard: { width: 282, maxHeight: 880, borderRadius: 22, backgroundColor: theme.colors.surfaceAlt, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border, padding: 18, gap: 8 },
  bandName: { color: theme.colors.text, fontFamily: pluggdFonts.displayBold, fontSize: 24, lineHeight: 28 },
  bandCount: { color: theme.colors.accentText, fontFamily: pluggdFonts.satoshiBlack, fontSize: 9.5, letterSpacing: 1.15 },
  bandList: { color: theme.colors.textSecondary, fontFamily: pluggdFonts.satoshiMedium, fontSize: 12, lineHeight: 18 },
  guidanceGrid: { gap: 12 },
  guidanceCard: { borderRadius: 22, padding: 17, gap: 10, backgroundColor: theme.colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border },
  guidanceTitle: { color: theme.colors.text, fontFamily: pluggdFonts.displayBold, fontSize: 20, lineHeight: 24 },
  guidanceRow: { gap: 3, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.divider },
  guidanceName: { color: theme.colors.text, fontFamily: pluggdFonts.satoshiBold, fontSize: 13.5 },
  guidanceStatus: { color: theme.colors.accentText, fontFamily: pluggdFonts.satoshiBlack, fontSize: 10.5, textTransform: 'uppercase' },
  guidanceDetail: { color: theme.colors.textSecondary, fontFamily: pluggdFonts.satoshiRegular, fontSize: 12, lineHeight: 18 },
  essentialsCard: { borderRadius: 22, overflow: 'hidden', backgroundColor: theme.colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border, paddingHorizontal: 14, paddingBottom: 12 },
  officialRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.divider },
  officialTitle: { flex: 1, color: theme.colors.text, fontFamily: pluggdFonts.satoshiBold, fontSize: 13.5 },
  downloadButton: { minHeight: 52, borderRadius: 14, backgroundColor: theme.colors.accentFill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14 },
  downloadText: { color: theme.colors.onAccent, fontFamily: pluggdFonts.satoshiBlack, fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.4 },
  disclaimer: { color: theme.colors.textSecondary, fontFamily: pluggdFonts.satoshiRegular, fontSize: 12.5, lineHeight: 19 },
  sourceTime: { color: theme.colors.textMuted, fontFamily: pluggdFonts.satoshiMedium, fontSize: 10.5, lineHeight: 16, paddingBottom: 20 },
  faqList: { borderRadius: 22, overflow: 'hidden', backgroundColor: theme.colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border },
  faqItem: { minHeight: 58, padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.divider, gap: 10 },
  faqQuestionRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  faqQuestion: { flex: 1, color: theme.colors.text, fontFamily: pluggdFonts.satoshiBold, fontSize: 13.5, lineHeight: 19 },
  faqAnswer: { color: theme.colors.textSecondary, fontFamily: pluggdFonts.satoshiRegular, fontSize: 12.5, lineHeight: 19, paddingRight: 28 },
  modalScreen: { flex: 1, backgroundColor: theme.colors.background },
  modalHeader: { padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.divider },
  modalCloseButton: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surfaceRaised, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.controlBorder },
  modalTitle: { color: theme.colors.text, fontFamily: pluggdFonts.displayExtraBold, fontSize: 28, lineHeight: 33 },
  modalContent: { padding: 20, gap: 26 },
  modalIntro: { color: theme.colors.textSecondary, fontFamily: pluggdFonts.satoshiRegular, fontSize: 14, lineHeight: 21 },
  builderLead: { flexDirection: 'row', gap: 14, borderRadius: 22, backgroundColor: theme.colors.surfaceAlt, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border, padding: 18 },
  builderLeadIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: theme.colors.accentFill, alignItems: 'center', justifyContent: 'center' },
  builderLeadCopy: { flex: 1, gap: 5 },
  builderLeadEyebrow: { color: theme.colors.accentText, fontFamily: pluggdFonts.satoshiBlack, fontSize: 9, letterSpacing: 1.25 },
  builderLeadTitle: { color: theme.colors.text, fontFamily: pluggdFonts.displayBold, fontSize: 22, lineHeight: 25 },
  builderLeadBody: { color: theme.colors.textSecondary, fontFamily: pluggdFonts.satoshiRegular, fontSize: 12.5, lineHeight: 18 },
  builderSteps: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.divider, paddingVertical: 12 },
  builderStep: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  builderStepNumber: { width: 22, height: 22, borderRadius: 11, overflow: 'hidden', backgroundColor: theme.colors.accentSoft, color: theme.colors.accentText, fontFamily: pluggdFonts.satoshiBlack, fontSize: 11, textAlign: 'center', lineHeight: 22 },
  builderStepLabel: { color: theme.colors.text, fontFamily: pluggdFonts.satoshiBold, fontSize: 11.5 },
  choiceGroup: { gap: 10 },
  choiceLabel: { color: theme.colors.text, fontFamily: pluggdFonts.displayBold, fontSize: 17 },
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: { minHeight: 44, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.controlBorder, paddingHorizontal: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surface },
  choiceSelected: { backgroundColor: theme.colors.accentFill, borderColor: theme.colors.accentFill },
  choiceText: { color: theme.colors.text, fontFamily: pluggdFonts.satoshiBold, fontSize: 12.5 },
  choiceTextSelected: { color: theme.colors.onAccent },
  accessChoice: { minHeight: 82, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surface, padding: 15 },
  accessTitle: { color: theme.colors.text, fontFamily: pluggdFonts.satoshiBold, fontSize: 13.5 },
  accessBody: { color: theme.colors.textSecondary, fontFamily: pluggdFonts.satoshiRegular, fontSize: 11.5, lineHeight: 16, marginTop: 3 },
  accessBodySelected: { color: theme.colors.onAccent, opacity: 0.72 },
  routePreview: { borderRadius: 22, overflow: 'hidden', backgroundColor: theme.colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.borderAccent },
  routePreviewHeader: { minHeight: 82, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.divider },
  routePreviewTitle: { color: theme.colors.text, fontFamily: pluggdFonts.displayBold, fontSize: 19, lineHeight: 23, marginTop: 4 },
  routePreviewCount: { minWidth: 62, alignItems: 'center', borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: theme.colors.divider, paddingLeft: 15 },
  routePreviewCountValue: { color: theme.colors.accentText, fontFamily: pluggdFonts.displayExtraBold, fontSize: 25, lineHeight: 27 },
  routePreviewCountLabel: { color: theme.colors.textMuted, fontFamily: pluggdFonts.satoshiBlack, fontSize: 8, letterSpacing: 1.1 },
  routePreviewStops: { paddingHorizontal: 16 },
  routePreviewStop: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 11, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.divider },
  routePreviewNumber: { width: 28, height: 28, borderRadius: 14, backgroundColor: theme.colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  routePreviewNumberText: { color: theme.colors.accentText, fontFamily: pluggdFonts.satoshiBlack, fontSize: 11 },
  routePreviewStopCopy: { flex: 1, minWidth: 0 },
  routePreviewStopTitle: { color: theme.colors.text, fontFamily: pluggdFonts.satoshiBold, fontSize: 13.5 },
  routePreviewStopMeta: { color: theme.colors.textSecondary, fontFamily: pluggdFonts.satoshiRegular, fontSize: 11.5, marginTop: 2 },
  routePreviewMore: { color: theme.colors.accentText, fontFamily: pluggdFonts.satoshiBold, fontSize: 11.5, paddingVertical: 14 },
  routePreviewEmpty: { minHeight: 94, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  routePreviewEmptyText: { flex: 1, color: theme.colors.textSecondary, fontFamily: pluggdFonts.satoshiRegular, fontSize: 12.5, lineHeight: 18 },
  routePreviewNote: { color: theme.colors.textMuted, fontFamily: pluggdFonts.satoshiMedium, fontSize: 10.5, lineHeight: 16, padding: 16, paddingTop: 12 },
  modalFooter: { padding: 20, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.divider },
  buildButton: { minHeight: 54, borderRadius: 16, backgroundColor: theme.colors.accentFill, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10 },
  buildButtonText: { color: theme.colors.onAccent, fontFamily: pluggdFonts.satoshiBlack, fontSize: 14, textTransform: 'uppercase', letterSpacing: 0.5 },
  buildButtonDisabled: { opacity: 0.42 },
  }), [theme]);
}

export default CarnivalHubScreen;
