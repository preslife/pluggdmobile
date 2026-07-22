import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { usePlayback } from '../../context/PlaybackProvider';
import { selectionHaptic } from '../../design/haptics';
import { PluggdImage } from '../../components/PluggdImage';
import { useBackstage, useHomeFeed, useLiveRooms } from '../culture/useCultureData';
import { buildDiscoveryItems, buildDiscoveryScenes, type DiscoveryItem } from '../discovery/discoveryModel';
import { DiscoveryHeader } from '../discovery/DiscoveryHeader';

const INK = '#F7F2E9';
const MUTED = '#A69F95';
const ORANGE = '#FF6600';

export function MusicDiscoveryHome() {
  const router = useRouter();
  const feed = useHomeFeed();
  const live = useLiveRooms();
  const backstage = useBackstage();
  const { playQueue } = usePlayback();
  const items = buildDiscoveryItems(feed.data);
  const scenes = buildDiscoveryScenes(feed.data);
  const featured = items[0];
  const picks = items.slice(1, 5);
  const newReleases = feed.data?.releases.slice(0, 6) ?? [];
  const mixes = items.filter((item) => item.kind === 'mix').slice(0, 5);
  const liveRooms = live.data?.slice(0, 4) ?? [];
  const communities = backstage.data?.communities?.slice(0, 4) ?? [];

  const play = async (item: DiscoveryItem) => {
    selectionHaptic();
    const queue = items.map((entry) => entry.track);
    await playQueue(queue, Math.max(0, items.findIndex((entry) => entry.id === item.id)));
  };

  return (
    <View style={styles.screen}>
      <DiscoveryHeader />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.titleRow}>
          <View>
            <Text style={styles.eyebrow}>{new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: '2-digit', month: 'long' }).format(new Date()).toUpperCase().replace(',', ' ·')}</Text>
            <Text style={styles.title}>The Daily Plug</Text>
          </View>
          <Text style={styles.editorNote}>Selected by{`\n`}PLUGGD editors</Text>
        </View>

        {feed.isLoading ? <ActivityIndicator color={ORANGE} style={styles.loader} /> : null}
        {!feed.isLoading && !featured ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>The signal is quiet.</Text>
            <Text style={styles.emptyBody}>Fresh playable music will appear here as creators publish it.</Text>
          </View>
        ) : null}
        {featured ? (
          <View style={styles.featured}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Play ${featured.title} by ${featured.creator}`}
              onPress={() => play(featured)}
              style={styles.featuredArtWrap}
            >
              <Artwork item={featured} style={styles.featuredArt} iconSize={34} />
              <View style={styles.kindFlag}><Text style={styles.kindFlagText}>{featured.kind.toUpperCase()}</Text></View>
              <View style={styles.featuredPlayBadge}><MaterialIcons name="play-arrow" size={25} color="#100B07" /></View>
            </Pressable>
            <View style={styles.featuredCopy}>
              <Text style={styles.reason}>{featured.discoveryReason.toUpperCase()}</Text>
              <Text style={styles.featuredTitle} numberOfLines={2}>{featured.title}</Text>
              <Text style={styles.featuredCreator} numberOfLines={1}>{featured.creator}</Text>
              <Text style={styles.featuredDescription} numberOfLines={3}>{featured.description}</Text>
              <View style={styles.featuredActions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Support ${featured.creator}`}
                  onPress={() => router.push((featured.supportRoute || featured.destinationRoute) as any)}
                  style={styles.supportButton}
                >
                  <Text style={styles.supportText}>Support this release</Text>
                </Pressable>
              </View>
            </View>
          </View>
        ) : null}

        {picks.length ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Four worth your time</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Open Discover" onPress={() => router.push('/discover' as any)}>
                <Text style={styles.seeAll}>See all</Text>
              </Pressable>
            </View>
            <View style={styles.pickGrid}>
              {[picks.slice(0, 2), picks.slice(2, 4)].map((row, rowIndex) => (
                <View key={`pick-row-${rowIndex}`} style={styles.pickRow}>
                  {row.map((item) => (
                    <Pressable
                      key={item.id}
                      accessibilityRole="button"
                      accessibilityLabel={`Play ${item.title} by ${item.creator}`}
                      onPress={() => play(item)}
                      style={styles.pick}
                    >
                      <Artwork item={item} style={styles.pickArt} iconSize={24} />
                      <View style={styles.pickCopy}>
                        <Text style={styles.pickTitle} numberOfLines={1}>{item.title}</Text>
                        <Text style={styles.pickCreator} numberOfLines={1}>{item.creator}</Text>
                      </View>
                      <View style={styles.smallPlay}><MaterialIcons name="play-arrow" size={18} color={INK} /></View>
                    </Pressable>
                  ))}
                </View>
              ))}
            </View>
          </>
        ) : null}

        {scenes.length ? (
          <>
            <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>From the scenes</Text></View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sceneRow}>
              {scenes.map((scene) => (
                <Pressable key={scene.label} onPress={() => router.push(scene.route as any)} style={styles.scene}>
                  {scene.image ? <PluggdImage uri={scene.image} style={styles.sceneImage} displayWidth={360} /> : <View style={styles.sceneFallback} />}
                  <View style={styles.sceneShade} />
                  <Text style={styles.sceneLabel}>{scene.label}</Text>
                  <Text style={styles.sceneDetail}>{scene.detail}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </>
        ) : null}

        {mixes.length ? (
          <>
            <View style={styles.sectionHeader}>
              <View><Text style={styles.sectionTitle}>Mixes in rotation</Text><Text style={styles.sectionSubtitle}>Full journeys from selectors and scenes.</Text></View>
              <Pressable onPress={() => router.push('/mixes' as any)}><Text style={styles.seeAll}>Enter Mixes</Text></Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mixRail}>
              {mixes.map((mix, index) => (
                <Pressable key={mix.id} accessibilityRole="button" accessibilityLabel={`Play mix ${mix.title}`} onPress={() => play(mix)} style={[styles.mixCard, index === 0 && styles.mixCardLead]}>
                  <Artwork item={mix} style={styles.mixArt} iconSize={34} />
                  <View style={styles.mixShade} />
                  <View style={styles.mixTop}><Text style={styles.mixNumber}>{String(index + 1).padStart(2, '0')}</Text><View style={styles.mixPlay}><MaterialIcons name="play-arrow" size={20} color="#100B07" /></View></View>
                  <View style={styles.mixCopy}><Text style={styles.mixKicker}>{mix.city || mix.genre || 'SELECTOR MIX'}</Text><Text style={styles.mixTitle} numberOfLines={2}>{mix.title}</Text><Text style={styles.mixCreator} numberOfLines={1}>{mix.creator}</Text></View>
                </Pressable>
              ))}
            </ScrollView>
          </>
        ) : null}

        {newReleases.length ? (
          <>
            <View style={styles.sectionHeader}>
              <View><Text style={styles.sectionTitle}>New releases</Text><Text style={styles.sectionSubtitle}>Independent music, newly landed.</Text></View>
              <Pressable onPress={() => router.push('/releases' as any)}><Text style={styles.seeAll}>View all</Text></Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.releaseRail}>
              {newReleases.map((item) => {
                const playable = items.find((entry) => entry.kind === 'release' && entry.track.releaseId === item.id);
                return <Pressable key={item.id} onPress={() => playable ? play(playable) : router.push(`/release/${item.id}` as any)} style={styles.releaseCard} accessibilityLabel={`${playable ? 'Play' : 'Open'} ${item.title || 'release'}`}>
                  {item.cover_art_url ? <PluggdImage uri={item.cover_art_url} style={styles.releaseArt} displayWidth={420} /> : <View style={[styles.releaseArt, styles.artFallback]}><MaterialIcons name="album" size={28} color={ORANGE} /></View>}
                  <View style={styles.releasePlay}><MaterialIcons name={playable ? 'play-arrow' : 'arrow-forward'} size={19} color="#100B07" /></View>
                  <Text style={styles.releaseTitle} numberOfLines={1}>{item.title || 'Untitled release'}</Text>
                  <Text style={styles.releaseCreator} numberOfLines={1}>{item.artist || item.genre || 'PLUGGD creator'}</Text>
                </Pressable>
              })}
            </ScrollView>
          </>
        ) : null}

        {feed.data?.soundboards.length ? (
          <>
            <View style={styles.sectionHeader}>
              <View><Text style={styles.sectionTitle}>Soundboards</Text><Text style={styles.sectionSubtitle}>Ideas, demos and worlds in progress.</Text></View>
              <Pressable onPress={() => router.push('/soundboards' as any)}><Text style={styles.seeAll}>Open all</Text></Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.soundboardRail}>
              {feed.data.soundboards.slice(0, 5).map((board) => (
                <Pressable key={board.id} onPress={() => router.push(`/soundboards/${board.slug || board.id}` as any)} style={styles.soundboardCard}>
                  {board.cover_image_url ? <PluggdImage uri={board.cover_image_url} style={styles.soundboardImage} displayWidth={520} /> : <View style={[styles.soundboardImage, styles.artFallback]}><MaterialIcons name="dashboard-customize" size={32} color={ORANGE} /></View>}
                  <View style={styles.soundboardShade} />
                  <Text style={styles.soundboardKicker}>{board.item_count || 0} PIECES · {board.like_count || 0} LIKES</Text>
                  <Text style={styles.soundboardTitle} numberOfLines={2}>{board.title || 'Untitled soundboard'}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </>
        ) : null}

        {feed.data?.events[0] ? (
          <>
            <View style={styles.sectionHeader}>
              <View><Text style={styles.sectionTitle}>Featured event</Text><Text style={styles.sectionSubtitle}>Where the scene becomes real.</Text></View>
              <Pressable onPress={() => router.push('/events' as any)}><Text style={styles.seeAll}>All events</Text></Pressable>
            </View>
            <Pressable onPress={() => router.push(`/events/${feed.data!.events[0].id}` as any)} style={styles.eventCard}>
              {feed.data.events[0].cover_image_url ? <PluggdImage uri={feed.data.events[0].cover_image_url} style={styles.eventImage} displayWidth={900} /> : <View style={[styles.eventImage, styles.artFallback]}><MaterialIcons name="event" size={42} color={ORANGE} /></View>}
              <View style={styles.eventShade} />
              <View style={styles.eventDate}><Text style={styles.eventDateText}>{feed.data.events[0].starts_at ? new Date(feed.data.events[0].starts_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase() : 'SOON'}</Text></View>
              <View style={styles.eventCopy}>
                <Text style={styles.eventTitle} numberOfLines={2}>{feed.data.events[0].title || 'PLUGGD event'}</Text>
                <Text style={styles.eventMeta} numberOfLines={1}>{feed.data.events[0].location || 'Location TBA'} · {feed.data.events[0].rsvp_count || 0} going</Text>
              </View>
              <View style={styles.eventArrow}><MaterialIcons name="arrow-forward" size={21} color="#100B07" /></View>
            </Pressable>
          </>
        ) : null}

        {liveRooms.length ? (
          <>
            <View style={styles.sectionHeader}>
              <View><Text style={styles.sectionTitle}>Live now on PLUGGD</Text><Text style={styles.sectionSubtitle}>Rooms, sessions and conversations happening now.</Text></View>
              <Pressable onPress={() => router.push('/live' as any)}><Text style={styles.seeAll}>Open Live</Text></Pressable>
            </View>
            <View style={styles.signalList}>
              {liveRooms.map((room) => (
                <Pressable key={room.id} onPress={() => router.push(`/live/${room.id}` as any)} style={styles.signalRow}>
                  <View style={styles.liveDot} />
                  {room.thumbnail_url ? <PluggdImage uri={room.thumbnail_url} style={styles.signalThumb} displayWidth={180} /> : <View style={[styles.signalThumb, styles.artFallback]}><MaterialIcons name="mic" size={20} color={ORANGE} /></View>}
                  <View style={styles.signalCopy}><Text style={styles.signalTitle} numberOfLines={1}>{room.title || 'Live room'}</Text><Text style={styles.signalMeta} numberOfLines={1}>{room.creator_name || room.category || 'PLUGGD Live'} · {room.viewer_count || 0} listening</Text></View>
                  <MaterialIcons name="arrow-forward" size={19} color={ORANGE} />
                </Pressable>
              ))}
            </View>
          </>
        ) : null}

        {(feed.data?.beats.length || feed.data?.samplePacks.length) ? (
          <>
            <View style={styles.sectionHeader}><View><Text style={styles.sectionTitle}>Drops & tools</Text><Text style={styles.sectionSubtitle}>Beats, packs and work made to move.</Text></View><Pressable onPress={() => router.push('/market' as any)}><Text style={styles.seeAll}>Open Market</Text></Pressable></View>
            <View style={styles.contextGrid}>
              <Pressable onPress={() => router.push('/market/beats' as any)} style={styles.worldCard}><Text style={styles.worldIndex}>01</Text><MaterialIcons name="graphic-eq" size={26} color={ORANGE} /><Text style={styles.worldTitle}>BeatPlug</Text><Text style={styles.worldMeta}>{feed.data?.beats.length || 0} producer signals</Text></Pressable>
              <Pressable onPress={() => router.push('/sample-packs' as any)} style={styles.worldCard}><Text style={styles.worldIndex}>02</Text><MaterialIcons name="folder-special" size={25} color={ORANGE} /><Text style={styles.worldTitle}>Sample packs</Text><Text style={styles.worldMeta}>{feed.data?.samplePacks.length || 0} creative tools</Text></Pressable>
            </View>
          </>
        ) : null}

        {communities.length ? (
          <>
            <View style={styles.sectionHeader}><View><Text style={styles.sectionTitle}>Backstage communities</Text><Text style={styles.sectionSubtitle}>Follow the people behind the sound.</Text></View><Pressable onPress={() => router.push('/community' as any)}><Text style={styles.seeAll}>Community</Text></Pressable></View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.communityRail}>
              {communities.map((community) => (
                <Pressable key={community.id} onPress={() => router.push(`/community/${community.slug || community.id}` as any)} style={styles.communityCard}>
                  {community.cover_image_url || community.avatar_url ? <PluggdImage uri={(community.cover_image_url || community.avatar_url)!} style={styles.communityImage} displayWidth={400} /> : <View style={[styles.communityImage, styles.artFallback]}><MaterialIcons name="groups" size={28} color={ORANGE} /></View>}
                  <Text style={styles.communityTitle} numberOfLines={1}>{community.title}</Text><Text style={styles.communityMeta}>{community.member_count || 0} members · {community.online_count || 0} online</Text>
                </Pressable>
              ))}
            </ScrollView>
          </>
        ) : null}

        {feed.data?.profiles.length ? (
          <>
            <View style={styles.sectionHeader}><View><Text style={styles.sectionTitle}>Creators to know</Text><Text style={styles.sectionSubtitle}>Follow the people behind the signal.</Text></View></View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.creatorRail}>
              {feed.data.profiles.slice(0, 8).map((profile) => {
                const name = profile.display_name || profile.full_name || profile.username || 'PLUGGD creator';
                return <Pressable key={profile.user_id || profile.id || name} onPress={() => profile.username && router.push(`/creator/${profile.username}` as any)} style={styles.creatorCard}>
                  {profile.avatar_url ? <PluggdImage uri={profile.avatar_url} style={styles.creatorAvatar} displayWidth={220} /> : <View style={[styles.creatorAvatar, styles.artFallback]}><MaterialIcons name="person" size={28} color={ORANGE} /></View>}
                  <Text style={styles.creatorName} numberOfLines={1}>{name}</Text>
                  <Text style={styles.creatorMeta} numberOfLines={1}>{profile.city || profile.primary_genre || 'Independent'}</Text>
                </Pressable>;
              })}
            </ScrollView>
          </>
        ) : null}

        <View style={styles.pulseRow}>
          <View><Text style={styles.pulseNumber}>{items.length}</Text><Text style={styles.pulseLabel}>playable</Text></View>
          <View><Text style={styles.pulseNumber}>{feed.data?.soundboards.length || 0}</Text><Text style={styles.pulseLabel}>soundboards</Text></View>
          <View><Text style={styles.pulseNumber}>{feed.data?.events.length || 0}</Text><Text style={styles.pulseLabel}>events</Text></View>
          <View><Text style={styles.pulseNumber}>{communities.length}</Text><Text style={styles.pulseLabel}>communities</Text></View>
        </View>
        <Pressable onPress={() => router.push('/auth/register' as any)} style={styles.joinPrompt}>
          <Text style={styles.joinTitle}>Make the signal yours.</Text>
          <Text style={styles.joinBody}>Join to save finds and follow independent creators.</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function Artwork({ item, style, iconSize }: { item: DiscoveryItem; style: any; iconSize: number }) {
  return item.artwork ? (
    <PluggdImage uri={item.artwork} style={style} resizeMode="cover" displayWidth={520} />
  ) : (
    <View style={[style, styles.artFallback]}><MaterialIcons name="graphic-eq" size={iconSize} color={ORANGE} /></View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0A0908' },
  content: { paddingHorizontal: 20, paddingBottom: 184 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 4, marginBottom: 18 },
  eyebrow: { color: ORANGE, fontFamily: 'Satoshi-Bold', fontSize: 10, letterSpacing: 1.6, marginBottom: 5 },
  title: { color: INK, fontFamily: 'Sora-ExtraBold', fontSize: 30, lineHeight: 34, letterSpacing: -1.1 },
  editorNote: { color: MUTED, fontFamily: 'Satoshi-Medium', fontSize: 10, lineHeight: 14, textAlign: 'right' },
  loader: { minHeight: 210 },
  empty: { minHeight: 210, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#29251F', justifyContent: 'center' },
  emptyTitle: { color: INK, fontFamily: 'Sora-Bold', fontSize: 20 },
  emptyBody: { color: MUTED, fontFamily: 'Satoshi-Regular', fontSize: 14, lineHeight: 20, marginTop: 8, maxWidth: 280 },
  featured: { minHeight: 214, flexDirection: 'row', gap: 17, paddingVertical: 14, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#29251F' },
  featuredArtWrap: { width: 146, position: 'relative' },
  featuredArt: { width: 146, height: 184, borderRadius: 3, backgroundColor: '#211C17' },
  kindFlag: { position: 'absolute', left: 8, top: 8, paddingHorizontal: 7, paddingVertical: 4, backgroundColor: 'rgba(10,9,8,0.82)' },
  kindFlagText: { color: INK, fontFamily: 'Satoshi-Bold', fontSize: 8, letterSpacing: 1.1 },
  featuredPlayBadge: { position: 'absolute', right: 9, bottom: 9, width: 44, height: 44, borderRadius: 22, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center' },
  featuredCopy: { flex: 1, paddingVertical: 2, justifyContent: 'center' },
  reason: { color: ORANGE, fontFamily: 'Satoshi-Bold', fontSize: 9, lineHeight: 12, letterSpacing: 1.1, marginBottom: 7 },
  featuredTitle: { color: INK, fontFamily: 'Sora-ExtraBold', fontSize: 19, lineHeight: 22, letterSpacing: -0.45 },
  featuredCreator: { color: MUTED, fontFamily: 'Satoshi-Medium', fontSize: 13, marginTop: 5 },
  featuredDescription: { color: '#C5BDB2', fontFamily: 'Satoshi-Regular', fontSize: 10.5, lineHeight: 14, marginTop: 8 },
  featuredActions: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  supportButton: { minHeight: 44, flexShrink: 0, justifyContent: 'center', borderBottomWidth: 1, borderColor: '#756E64' },
  supportText: { color: INK, fontFamily: 'Satoshi-Bold', fontSize: 12 },
  sectionHeader: { minHeight: 54, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingBottom: 10 },
  sectionTitle: { color: INK, fontFamily: 'Sora-Bold', fontSize: 17, letterSpacing: -0.35 },
  sectionSubtitle: { color: MUTED, fontFamily: 'Satoshi-Regular', fontSize: 10.5, marginTop: 3 },
  seeAll: { color: ORANGE, fontFamily: 'Satoshi-Bold', fontSize: 12 },
  pickGrid: { gap: 10 },
  pickRow: { flexDirection: 'row', gap: 10 },
  pick: { flex: 1, minWidth: 0, minHeight: 154, borderRadius: 5, overflow: 'hidden' },
  pickArt: { width: '100%', height: 108, borderRadius: 4, backgroundColor: '#211C17' },
  pickCopy: { minWidth: 0, paddingTop: 7, paddingRight: 30 },
  pickTitle: { color: INK, fontFamily: 'Satoshi-Bold', fontSize: 12, lineHeight: 15 },
  pickCreator: { color: MUTED, fontFamily: 'Satoshi-Medium', fontSize: 9.5, lineHeight: 13, marginTop: 2 },
  smallPlay: { position: 'absolute', right: 7, top: 72, width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: ORANGE },
  sceneRow: { gap: 10, paddingRight: 20 },
  scene: { width: 132, height: 112, borderRadius: 5, overflow: 'hidden', justifyContent: 'flex-end', padding: 10 },
  sceneImage: { ...StyleSheet.absoluteFillObject },
  sceneFallback: { ...StyleSheet.absoluteFillObject, backgroundColor: '#26170F' },
  sceneShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(5,4,3,0.45)' },
  sceneLabel: { color: INK, fontFamily: 'Sora-Bold', fontSize: 15 },
  sceneDetail: { color: '#D5CEC3', fontFamily: 'Satoshi-Medium', fontSize: 10, marginTop: 2 },
  mixRail: { gap: 11, paddingRight: 20 },
  mixCard: { width: 178, height: 222, borderRadius: 5, overflow: 'hidden', justifyContent: 'space-between', padding: 12 },
  mixCardLead: { width: 252 },
  mixArt: { ...StyleSheet.absoluteFillObject, backgroundColor: '#211C17' },
  mixShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(5,4,3,0.42)' },
  mixTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mixNumber: { color: INK, fontFamily: 'Satoshi-Black', fontSize: 10, letterSpacing: 1.2 },
  mixPlay: { width: 38, height: 38, borderRadius: 19, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center' },
  mixCopy: { zIndex: 2 },
  mixKicker: { color: ORANGE, fontFamily: 'Satoshi-Bold', fontSize: 8.5, letterSpacing: 1.1, textTransform: 'uppercase' },
  mixTitle: { color: INK, fontFamily: 'Sora-ExtraBold', fontSize: 18, lineHeight: 21, marginTop: 4 },
  mixCreator: { color: '#DED7CC', fontFamily: 'Satoshi-Medium', fontSize: 10.5, marginTop: 4 },
  releaseRail: { gap: 12, paddingRight: 20 },
  releaseCard: { width: 126, position: 'relative' },
  releaseArt: { width: 126, height: 126, borderRadius: 4, backgroundColor: '#211C17' },
  releasePlay: { position: 'absolute', top: 86, right: 8, width: 32, height: 32, borderRadius: 16, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center' },
  releaseTitle: { color: INK, fontFamily: 'Satoshi-Bold', fontSize: 12, marginTop: 7 },
  releaseCreator: { color: MUTED, fontFamily: 'Satoshi-Medium', fontSize: 10, marginTop: 2 },
  soundboardRail: { gap: 12, paddingRight: 20 },
  soundboardCard: { width: 224, height: 150, borderRadius: 5, overflow: 'hidden', justifyContent: 'flex-end', padding: 13 },
  soundboardImage: { ...StyleSheet.absoluteFillObject, backgroundColor: '#211C17' },
  soundboardShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(5,4,3,0.52)' },
  soundboardKicker: { color: ORANGE, fontFamily: 'Satoshi-Bold', fontSize: 8.5, letterSpacing: 1 },
  soundboardTitle: { color: INK, fontFamily: 'Sora-Bold', fontSize: 17, lineHeight: 21, marginTop: 4 },
  eventCard: { height: 196, borderRadius: 5, overflow: 'hidden', justifyContent: 'flex-end' },
  eventImage: { ...StyleSheet.absoluteFillObject, backgroundColor: '#211C17' },
  eventShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(5,4,3,0.42)' },
  eventDate: { position: 'absolute', left: 12, top: 12, backgroundColor: ORANGE, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 3 },
  eventDateText: { color: '#100B07', fontFamily: 'Satoshi-Black', fontSize: 9, letterSpacing: 1 },
  eventCopy: { padding: 15, paddingRight: 62 },
  eventTitle: { color: INK, fontFamily: 'Sora-ExtraBold', fontSize: 20, lineHeight: 24 },
  eventMeta: { color: '#E2DBD1', fontFamily: 'Satoshi-Medium', fontSize: 11, marginTop: 5 },
  eventArrow: { position: 'absolute', right: 14, bottom: 16, width: 42, height: 42, borderRadius: 21, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center' },
  signalList: { borderTopWidth: 1, borderColor: '#29251F' },
  signalRow: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderColor: '#29251F' },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: ORANGE },
  signalThumb: { width: 48, height: 48, borderRadius: 4, backgroundColor: '#211C17' },
  signalCopy: { flex: 1, minWidth: 0 },
  signalTitle: { color: INK, fontFamily: 'Satoshi-Bold', fontSize: 12.5 },
  signalMeta: { color: MUTED, fontFamily: 'Satoshi-Medium', fontSize: 9.5, marginTop: 3 },
  contextGrid: { flexDirection: 'row', gap: 10 },
  worldCard: { flex: 1, minHeight: 150, backgroundColor: '#171411', borderRadius: 5, padding: 13, justifyContent: 'space-between' },
  worldIndex: { color: '#756E64', fontFamily: 'Satoshi-Black', fontSize: 9, letterSpacing: 1 },
  worldTitle: { color: INK, fontFamily: 'Sora-Bold', fontSize: 16 },
  worldMeta: { color: MUTED, fontFamily: 'Satoshi-Medium', fontSize: 10 },
  communityRail: { gap: 11, paddingRight: 20 },
  communityCard: { width: 154 },
  communityImage: { width: 154, height: 104, borderRadius: 5, backgroundColor: '#211C17' },
  communityTitle: { color: INK, fontFamily: 'Satoshi-Bold', fontSize: 12, marginTop: 7 },
  communityMeta: { color: MUTED, fontFamily: 'Satoshi-Medium', fontSize: 9.5, marginTop: 2 },
  creatorRail: { gap: 16, paddingRight: 20 },
  creatorCard: { width: 84, alignItems: 'center' },
  creatorAvatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#211C17', borderWidth: 1, borderColor: '#413A31' },
  creatorName: { color: INK, fontFamily: 'Satoshi-Bold', fontSize: 11, marginTop: 7, width: 84, textAlign: 'center' },
  creatorMeta: { color: MUTED, fontFamily: 'Satoshi-Medium', fontSize: 9.5, marginTop: 2, width: 84, textAlign: 'center' },
  pulseRow: { minHeight: 92, marginTop: 24, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#29251F', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pulseNumber: { color: INK, fontFamily: 'Sora-ExtraBold', fontSize: 18, textAlign: 'center' },
  pulseLabel: { color: MUTED, fontFamily: 'Satoshi-Medium', fontSize: 8.5, marginTop: 3, textAlign: 'center' },
  joinPrompt: { paddingVertical: 24 },
  joinTitle: { color: INK, fontFamily: 'Sora-Bold', fontSize: 17 },
  joinBody: { color: MUTED, fontFamily: 'Satoshi-Regular', fontSize: 13, marginTop: 5 },
  artFallback: { alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.78, transform: [{ scale: 0.985 }] },
});
