import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { usePluggdTheme } from '../../design/usePluggdTheme';
import { MobileStoriesRail } from '../culture/MobileStoriesRail';
import { loadCreatorProfileBundle } from '../culture/mobileServices';
import { supabase } from '../../lib/supabase';

const PLUGGD_ORANGE = '#FF5A00';

type ProfileRow = {
  id: string;
  user_id: string;
  username?: string | null;
  slug?: string | null;
  custom_url?: string | null;
  full_name?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  cover_image_url?: string | null;
  is_creator?: boolean | null;
  is_verified?: boolean | null;
  profile_type?: string | null;
};

type ContentRow = {
  id: string;
  title: string;
  imageUrl?: string | null;
  meta?: string | null;
  route: string;
  icon: keyof typeof MaterialIcons.glyphMap;
};

type CreatorProfileTab =
  | 'overview'
  | 'discography'
  | 'beats'
  | 'soundboards'
  | 'gallery'
  | 'video'
  | 'community'
  | 'store'
  | 'shows'
  | 'live'
  | 'about';

const WEB_CREATOR_TABS: Array<{ key: CreatorProfileTab; label: string }> = [
  { key: 'overview', label: 'Overview' },
  { key: 'discography', label: 'Music' },
  { key: 'beats', label: 'Beats' },
  { key: 'soundboards', label: 'Soundboards' },
  { key: 'gallery', label: 'Gallery' },
  { key: 'video', label: 'Videos' },
  { key: 'community', label: 'Community' },
  { key: 'store', label: 'Shop' },
  { key: 'shows', label: 'Shows' },
  { key: 'live', label: 'Live' },
  { key: 'about', label: 'About' },
];

type Props = {
  username?: string | string[];
  userId?: string | string[];
};

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function roleLabel(value?: string | null) {
  if (!value) return 'Creator';
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function normalizeProfileTab(value?: string | null): CreatorProfileTab | null {
  if (!value) return null;
  return WEB_CREATOR_TABS.some((tab) => tab.key === value) ? (value as CreatorProfileTab) : null;
}

export function PublicCreatorProfileScreen({ username, userId }: Props) {
  const router = useRouter();
  const routeParams = useLocalSearchParams<{ tab?: string | string[]; galleryItem?: string | string[] }>();
  const theme = usePluggdTheme();
  const lookupUsername = firstParam(username);
  const lookupUserId = firstParam(userId);
  const requestedTab = normalizeProfileTab(firstParam(routeParams.tab));
  const galleryItemId = firstParam(routeParams.galleryItem);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [releases, setReleases] = useState<ContentRow[]>([]);
  const [beats, setBeats] = useState<ContentRow[]>([]);
  const [mixes, setMixes] = useState<ContentRow[]>([]);
  const [samplePacks, setSamplePacks] = useState<ContentRow[]>([]);
  const [soundboards, setSoundboards] = useState<ContentRow[]>([]);
  const [events, setEvents] = useState<ContentRow[]>([]);
  const [liveRooms, setLiveRooms] = useState<ContentRow[]>([]);
  const [communities, setCommunities] = useState<ContentRow[]>([]);
  const [gallery, setGallery] = useState<ContentRow[]>([]);
  const [videos, setVideos] = useState<ContentRow[]>([]);
  const [playlists, setPlaylists] = useState<ContentRow[]>([]);
  const [storefront, setStorefront] = useState<ContentRow[]>([]);
  const [memberships, setMemberships] = useState<ContentRow[]>([]);
  const [activeTab, setActiveTab] = useState<CreatorProfileTab>(requestedTab ?? 'overview');
  const [followerCount, setFollowerCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayName = profile?.full_name || profile?.username || profile?.slug || 'PLUGGD creator';
  const handle = profile?.custom_url || profile?.username || profile?.slug || '';
  const sectionMap = useMemo<Record<CreatorProfileTab, Array<{ title: string; items: ContentRow[]; empty: string }>>>(
    () => ({
      overview: [
        { title: 'Featured Music', items: [...releases.slice(0, 6), ...mixes.slice(0, 3)], empty: 'No featured music published yet.' },
        { title: 'Live / Shows', items: [...liveRooms.slice(0, 4), ...events.slice(0, 4)], empty: 'No live sessions or shows yet.' },
        { title: 'Community', items: communities.slice(0, 6), empty: 'No creator community is available yet.' },
        { title: 'Shop / Support', items: [...storefront.slice(0, 4), ...memberships.slice(0, 2)], empty: 'No mobile storefront items are available yet.' },
      ],
      discography: [
        { title: 'Releases', items: releases, empty: 'No releases published yet.' },
        { title: 'Mixes', items: mixes, empty: 'No mixes published yet.' },
        { title: 'Playlists', items: playlists, empty: 'No public playlists yet.' },
        { title: 'Sample Packs', items: samplePacks, empty: 'No sample packs listed yet.' },
      ],
      beats: [{ title: 'Beats', items: beats, empty: 'No beats listed yet.' }],
      soundboards: [{ title: 'Soundboards', items: soundboards, empty: 'No soundboards published yet.' }],
      gallery: [{ title: 'Gallery', items: gallery, empty: 'No gallery moments yet.' }],
      video: [{ title: 'Videos', items: videos, empty: 'No videos published yet.' }],
      community: [{ title: 'Community', items: communities, empty: 'No creator community is available yet.' }],
      store: [
        { title: 'Store / Support', items: storefront, empty: 'No mobile storefront items are available yet.' },
        { title: 'Membership', items: memberships, empty: 'No mobile membership tiers are available yet.' },
      ],
      shows: [{ title: 'Shows', items: events, empty: 'No public shows yet.' }],
      live: [{ title: 'Live', items: liveRooms, empty: 'No upcoming live rooms yet.' }],
      about: [],
    }),
    [beats, communities, events, gallery, liveRooms, memberships, mixes, playlists, releases, samplePacks, soundboards, storefront, videos],
  );
  const activeSections = sectionMap[activeTab];
  const selectedGalleryItem = useMemo(
    () => (activeTab === 'gallery' && galleryItemId ? gallery.find((item) => item.id === galleryItemId) ?? null : null),
    [activeTab, gallery, galleryItemId],
  );

  useEffect(() => {
    if (requestedTab) setActiveTab(requestedTab);
  }, [requestedTab]);

  const loadProfile = useCallback(async () => {
    if (!lookupUsername && !lookupUserId) {
      setError('Profile not found.');
      setLoading(false);
      return;
    }

    setError(null);
    const { data: auth } = await supabase.auth.getUser();
    const viewerId = auth.user?.id ?? null;
    setCurrentUserId(viewerId);

    const profileQuery = supabase.from('profiles').select('*').limit(1);
    const { data: profileRows, error: profileError } = lookupUserId
      ? await profileQuery.eq('user_id', lookupUserId)
      : await profileQuery.or(`username.eq.${lookupUsername},slug.eq.${lookupUsername},custom_url.eq.${lookupUsername}`);

    if (profileError) throw profileError;

    const nextProfile = Array.isArray(profileRows) ? (profileRows[0] as ProfileRow | undefined) : undefined;
    if (!nextProfile) {
      setProfile(null);
      setError('Profile not found.');
      return;
    }

    const ownerId = nextProfile.user_id;
    const profileHandle = nextProfile.custom_url || nextProfile.username || nextProfile.slug || nextProfile.user_id;
    setProfile(nextProfile);

    const bundle = await loadCreatorProfileBundle({ userId: ownerId });

    setReleases(
      (bundle.releases ?? []).map((item) => ({
        id: item.id,
        title: item.title || 'Untitled release',
        imageUrl: item.cover_art_url,
        meta: item.artist || item.genre || 'Release',
        route: `/release/${item.id}`,
        icon: 'album',
      })),
    );
    setMixes(
      (bundle.mixes ?? []).map((item) => ({
        id: item.id,
        title: item.title || 'Untitled mix',
        imageUrl: item.cover_url,
        meta: item.city || item.event_name || 'Mix',
        route: `/mixes/${item.slug || item.id}`,
        icon: 'graphic-eq',
      })),
    );
    setBeats(
      (bundle.beats ?? []).map((item) => ({
        id: item.id,
        title: item.title || 'Untitled beat',
        imageUrl: item.image_url,
        meta: item.genre || 'Beat',
        route: `/beat/${item.id}`,
        icon: 'headphones',
      })),
    );
    setSamplePacks(
      (bundle.samplePacks ?? []).map((item) => ({
        id: item.id,
        title: item.title || 'Untitled sample pack',
        imageUrl: item.cover_art_url,
        meta: item.genre || 'Sample pack',
        route: `/sample-pack/${item.id}`,
        icon: 'inventory-2',
      })),
    );
    setSoundboards(
      (bundle.soundboards ?? []).map((item) => ({
        id: item.id,
        title: item.title,
        imageUrl: item.cover_image_url,
        meta: `${item.item_count ?? 0} sounds`,
        route: `/soundboards/${item.id}`,
        icon: 'dashboard-customize',
      })),
    );
    setEvents(
      (bundle.events ?? []).map((item) => ({
        id: item.id,
        title: item.title || 'Untitled event',
        imageUrl: item.cover_image_url,
        meta: item.location || 'Event',
        route: `/events/${item.id}`,
        icon: 'confirmation-number',
      })),
    );
    setLiveRooms(
      (bundle.liveRooms ?? []).map((item) => ({
        id: item.id,
        title: item.title || 'Live room',
        imageUrl: item.thumbnail_url || item.creator_avatar_url,
        meta: item.status || 'Live',
        route: `/live/session?roomId=${item.id}`,
        icon: 'settings-input-antenna',
      })),
    );
    setCommunities(
      (bundle.communities ?? []).map((item) => ({
        id: item.id,
        title: item.title,
        imageUrl: item.cover_image_url || item.avatar_url,
        meta: item.member_count ? `${item.member_count} members` : 'Community',
        route: `/backstage/${item.slug || item.id}`,
        icon: 'groups',
      })),
    );
    setGallery(
      (bundle.galleryItems ?? []).map((item) => ({
        id: item.id,
        title: item.title || item.caption || 'Gallery image',
        imageUrl: item.image_url,
        meta: item.caption || item.category || 'Gallery',
        route: `/creator/${encodeURIComponent(profileHandle)}?tab=gallery&galleryItem=${encodeURIComponent(item.id)}`,
        icon: 'photo-library',
      })),
    );
    setVideos(
      (bundle.clips ?? []).map((item) => ({
        id: item.id,
        title: item.title || 'Video',
        imageUrl: item.thumbnail_url,
        meta: item.description || 'Video',
        route: '/search',
        icon: 'smart-display',
      })),
    );
    setPlaylists(
      (bundle.playlists ?? []).map((item) => ({
        id: item.id,
        title: item.name,
        imageUrl: item.cover_url,
        meta: `${item.track_count ?? 0} tracks`,
        route: item.route,
        icon: 'queue-music',
      })),
    );
    setStorefront(
      (bundle.storefront ?? []).map((item) => ({
        id: item.id,
        title: item.title,
        imageUrl: item.image_url,
        meta: item.kind || 'Support',
        route: item.route || '/wallet',
        icon: 'storefront',
      })),
    );
    setMemberships(
      (bundle.memberships ?? []).map((item) => ({
        id: item.id,
        title: item.title,
        imageUrl: null,
        meta: item.member_count ? `${item.member_count} members` : 'Membership',
        route: item.route || `/membership/${ownerId}`,
        icon: 'workspace-premium',
      })),
    );
    setFollowerCount(bundle.followerCount);
    setIsFollowing(bundle.isFollowing);
  }, [lookupUserId, lookupUsername]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    loadProfile()
      .catch((loadError) => {
        console.error('[PublicCreatorProfile] load failed:', loadError);
        if (mounted) setError(loadError?.message ?? 'Profile unavailable.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [loadProfile]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadProfile();
    } finally {
      setRefreshing(false);
    }
  }, [loadProfile]);

  const toggleFollow = async () => {
    if (!profile) return;
    if (!currentUserId) {
      router.push('/auth/login' as any);
      return;
    }
    if (currentUserId === profile.user_id) {
      router.push('/profile' as any);
      return;
    }

    const previous = isFollowing;
    setIsFollowing(!previous);
    setFollowerCount((count) => Math.max(0, count + (previous ? -1 : 1)));

    try {
      if (previous) {
        const { error: deleteError } = await supabase
          .from('user_follows')
          .delete()
          .eq('follower_id', currentUserId)
          .eq('following_id', profile.user_id);
        if (deleteError) throw deleteError;
      } else {
        const { error: insertError } = await supabase.from('user_follows').insert({
          follower_id: currentUserId,
          following_id: profile.user_id,
        });
        if (insertError) throw insertError;
      }
    } catch (followError) {
      console.error('[PublicCreatorProfile] follow failed:', followError);
      setIsFollowing(previous);
      setFollowerCount((count) => Math.max(0, count + (previous ? 1 : -1)));
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient
        colors={theme.scheme === 'dark' ? ['#080808', '#0C0C0C', '#080808'] : ['#FAFAF8', '#FFFFFF', '#F4F2EE']}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PLUGGD_ORANGE} />}
        contentContainerStyle={styles.scrollContent}
      >
        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator color={PLUGGD_ORANGE} />
            <Text style={[styles.stateText, { color: theme.colors.textMuted }]}>Loading profile...</Text>
          </View>
        ) : error || !profile ? (
          <View style={styles.centerState}>
            <MaterialIcons name="person-search" size={34} color={theme.colors.textSubtle} />
            <Text style={[styles.stateTitle, { color: theme.colors.text }]}>Profile unavailable</Text>
            <Text style={[styles.stateText, { color: theme.colors.textMuted }]}>{error ?? 'This profile could not be loaded.'}</Text>
          </View>
        ) : (
          <>
            <View style={[styles.cover, { backgroundColor: theme.colors.surface }]}>
              {profile.cover_image_url ? (
                <Image source={{ uri: profile.cover_image_url }} style={styles.coverImage} />
              ) : (
                <LinearGradient colors={['rgba(255,82,0,0.24)', 'rgba(255,82,0,0)']} style={StyleSheet.absoluteFill} />
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Go back"
                onPress={() => router.back()}
                style={[styles.backButton, { backgroundColor: theme.colors.glassFallback, borderColor: theme.colors.border }]}
              >
                <MaterialIcons name="arrow-back-ios-new" size={18} color={theme.colors.text} />
              </Pressable>
            </View>

            <View style={styles.profileBlock}>
              <View style={[styles.avatar, { backgroundColor: theme.colors.artworkBase, borderColor: theme.colors.background }]}>
                {profile.avatar_url ? (
                  <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
                ) : (
                  <Text style={[styles.avatarInitials, { color: theme.colors.text }]}>{initials(displayName)}</Text>
                )}
              </View>

              <View style={styles.titleRow}>
                <View style={styles.titleTextWrap}>
                  <View style={styles.nameRow}>
                    <Text style={[styles.name, { color: theme.colors.text }]} numberOfLines={1}>
                      {displayName}
                    </Text>
                    {profile.is_verified ? <MaterialIcons name="verified" size={20} color={PLUGGD_ORANGE} /> : null}
                  </View>
                  {handle ? (
                    <Text style={[styles.handle, { color: theme.colors.textMuted }]} numberOfLines={1}>
                      @{handle}
                    </Text>
                  ) : null}
                </View>

                <Pressable
                  accessibilityRole="button"
                  onPress={toggleFollow}
                  style={[
                    styles.followButton,
                    {
                      backgroundColor: isFollowing ? theme.colors.surface : theme.colors.accent,
                      borderColor: isFollowing ? theme.colors.border : theme.colors.accent,
                    },
                  ]}
                >
                  <Text style={[styles.followText, { color: isFollowing ? theme.colors.text : '#080808' }]}>
                    {currentUserId === profile.user_id ? 'Edit' : isFollowing ? 'Following' : 'Follow'}
                  </Text>
                </Pressable>
              </View>

              <View style={styles.statRow}>
                <Stat label="Followers" value={followerCount.toLocaleString()} />
                <Stat label="Role" value={roleLabel(profile.profile_type)} />
                <Stat label="Catalog" value={(releases.length + beats.length + samplePacks.length + soundboards.length).toString()} />
              </View>

              {profile.bio ? (
                <Text style={[styles.bio, { color: theme.colors.textMuted }]}>{profile.bio}</Text>
              ) : null}
            </View>

            <View style={styles.storyRailWrap}>
              <MobileStoriesRail creatorId={profile.user_id} title="Creator moments" />
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRail}>
              {WEB_CREATOR_TABS.map((tab) => {
                const active = activeTab === tab.key;
                const count =
                  tab.key === 'discography'
                    ? releases.length + mixes.length
                    : tab.key === 'beats'
                      ? beats.length
                      : tab.key === 'soundboards'
                        ? soundboards.length
                        : tab.key === 'gallery'
                          ? gallery.length
                          : tab.key === 'video'
                            ? videos.length
                            : tab.key === 'community'
                              ? communities.length
                              : tab.key === 'store'
                                ? storefront.length + memberships.length
                                : tab.key === 'shows'
                                  ? events.length
                                  : tab.key === 'live'
                                    ? liveRooms.length
                                    : undefined;
                return (
                  <Pressable
                    key={tab.key}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={`${tab.label} profile tab`}
                    onPress={() => setActiveTab(tab.key)}
                    style={[
                      styles.profileTab,
                      {
                        backgroundColor: active ? theme.colors.text : theme.colors.surface,
                        borderColor: active ? theme.colors.text : theme.colors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.profileTabText, { color: active ? theme.colors.background : theme.colors.textSecondary }]}>
                      {tab.label}{typeof count === 'number' ? ` ${count}` : ''}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {activeTab === 'about' ? (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>About</Text>
                <View style={[styles.aboutCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  <Text style={[styles.aboutTitle, { color: theme.colors.text }]}>{displayName}</Text>
                  <Text style={[styles.aboutCopy, { color: theme.colors.textMuted }]}>
                    {profile.bio || 'No bio has been added yet.'}
                  </Text>
                  <View style={styles.aboutRows}>
                    <AboutRow label="Handle" value={handle ? `@${handle}` : 'Not set'} />
                    <AboutRow label="Role" value={roleLabel(profile.profile_type)} />
                    <AboutRow label="Followers" value={followerCount.toLocaleString()} />
                  </View>
                </View>
              </View>
            ) : (
              <>
                {selectedGalleryItem ? (
                  <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Selected Gallery Image</Text>
                    <View style={[styles.selectedGalleryCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                      {selectedGalleryItem.imageUrl ? <Image source={{ uri: selectedGalleryItem.imageUrl }} style={styles.selectedGalleryImage} /> : null}
                      <Text style={[styles.selectedGalleryTitle, { color: theme.colors.text }]}>{selectedGalleryItem.title}</Text>
                      {selectedGalleryItem.meta ? <Text style={[styles.selectedGalleryMeta, { color: theme.colors.textMuted }]}>{selectedGalleryItem.meta}</Text> : null}
                    </View>
                  </View>
                ) : null}
                {activeSections.map((section) => (
                  <View key={section.title} style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{section.title}</Text>
                    {section.items.length > 0 ? (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.contentRail}>
                        {section.items.map((item) => (
                          <Pressable
                            key={item.id}
                            onPress={() => router.push(item.route as any)}
                            style={[styles.contentCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                          >
                            <View style={[styles.artwork, { backgroundColor: theme.colors.surfaceAlt }]}>
                              {item.imageUrl ? (
                                <Image source={{ uri: item.imageUrl }} style={styles.artworkImage} />
                              ) : (
                                <MaterialIcons name={item.icon} size={27} color={theme.colors.accent} />
                              )}
                            </View>
                            <Text style={[styles.contentTitle, { color: theme.colors.text }]} numberOfLines={1}>
                              {item.title}
                            </Text>
                            <Text style={[styles.contentMeta, { color: theme.colors.textMuted }]} numberOfLines={1}>
                              {item.meta}
                            </Text>
                          </Pressable>
                        ))}
                      </ScrollView>
                    ) : (
                      <View style={[styles.emptyCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                        <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>{section.empty}</Text>
                      </View>
                    )}
                  </View>
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const theme = usePluggdTheme();
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color: theme.colors.text }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={[styles.statLabel, { color: theme.colors.textSubtle }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function AboutRow({ label, value }: { label: string; value: string }) {
  const theme = usePluggdTheme();
  return (
    <View style={[styles.aboutRow, { borderTopColor: theme.colors.divider }]}>
      <Text style={[styles.aboutLabel, { color: theme.colors.textMuted }]}>{label}</Text>
      <Text style={[styles.aboutValue, { color: theme.colors.text }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 176,
  },
  centerState: {
    minHeight: 520,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 10,
  },
  stateTitle: {
    fontSize: 21,
    fontWeight: '800',
  },
  stateText: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    fontWeight: '600',
  },
  cover: {
    height: 190,
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  backButton: {
    position: 'absolute',
    left: 16,
    top: 54,
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileBlock: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: 24,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginTop: -46,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarInitials: {
    fontSize: 30,
    fontWeight: '800',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 12,
  },
  titleTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    flexShrink: 1,
    fontSize: 27,
    lineHeight: 33,
    fontWeight: '800',
  },
  handle: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  followButton: {
    height: 40,
    borderRadius: 13,
    borderWidth: 1,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followText: {
    fontSize: 14,
    fontWeight: '800',
  },
  statRow: {
    flexDirection: 'row',
    gap: 9,
    marginTop: 17,
  },
  stat: {
    flex: 1,
    gap: 2,
  },
  statValue: {
    fontSize: 17,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  bio: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '600',
    marginTop: 17,
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 20,
    gap: 10,
  },
  storyRailWrap: {
    marginTop: 10,
  },
  tabRail: {
    gap: 8,
    paddingHorizontal: 16,
    paddingRight: 28,
    marginTop: 14,
    marginBottom: 2,
  },
  profileTab: {
    minHeight: 44,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileTabText: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 13,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  contentRail: {
    gap: 10,
    paddingRight: 16,
  },
  contentCard: {
    width: 132,
    borderRadius: 13,
    borderWidth: 1,
    padding: 8,
  },
  artwork: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  artworkImage: {
    width: '100%',
    height: '100%',
  },
  contentTitle: {
    marginTop: 9,
    fontSize: 14,
    fontWeight: '800',
  },
  contentMeta: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: '700',
  },
  selectedGalleryCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 10,
    overflow: 'hidden',
  },
  selectedGalleryImage: {
    width: '100%',
    aspectRatio: 1.18,
    borderRadius: 14,
    backgroundColor: '#171717',
  },
  selectedGalleryTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '900',
  },
  selectedGalleryMeta: {
    marginTop: 5,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  emptyCard: {
    minHeight: 58,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  aboutCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  aboutTitle: {
    fontFamily: 'Satoshi-Black',
    fontSize: 21,
    lineHeight: 25,
  },
  aboutCopy: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
  },
  aboutRows: {
    marginTop: 14,
  },
  aboutRow: {
    minHeight: 48,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  aboutLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  aboutValue: {
    flex: 1,
    textAlign: 'right',
    fontSize: 14,
    fontWeight: '800',
  },
});
