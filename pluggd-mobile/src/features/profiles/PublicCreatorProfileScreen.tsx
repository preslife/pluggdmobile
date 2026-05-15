import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
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
import { supabase } from '../../lib/supabase';

const PLUGGD_ORANGE = '#FF5200';

type ProfileRow = {
  id: string;
  user_id: string;
  username?: string | null;
  slug?: string | null;
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

export function PublicCreatorProfileScreen({ username, userId }: Props) {
  const router = useRouter();
  const theme = usePluggdTheme();
  const lookupUsername = firstParam(username);
  const lookupUserId = firstParam(userId);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [releases, setReleases] = useState<ContentRow[]>([]);
  const [beats, setBeats] = useState<ContentRow[]>([]);
  const [samplePacks, setSamplePacks] = useState<ContentRow[]>([]);
  const [soundboards, setSoundboards] = useState<ContentRow[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayName = profile?.full_name || profile?.username || profile?.slug || 'PLUGGD creator';
  const handle = profile?.username || profile?.slug || '';
  const allContent = useMemo(
    () => [
      { title: 'Releases', items: releases, empty: 'No releases published yet.' },
      { title: 'Beats', items: beats, empty: 'No beats listed yet.' },
      { title: 'Sample Packs', items: samplePacks, empty: 'No sample packs listed yet.' },
      { title: 'Soundboards', items: soundboards, empty: 'No soundboards published yet.' },
    ],
    [beats, releases, samplePacks, soundboards],
  );

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
      : await profileQuery.or(`username.eq.${lookupUsername},slug.eq.${lookupUsername}`);

    if (profileError) throw profileError;

    const nextProfile = Array.isArray(profileRows) ? (profileRows[0] as ProfileRow | undefined) : undefined;
    if (!nextProfile) {
      setProfile(null);
      setError('Profile not found.');
      return;
    }

    const ownerId = nextProfile.user_id;
    setProfile(nextProfile);

    const [
      releaseResult,
      beatResult,
      samplePackResult,
      soundboardResult,
      followerResult,
      followingResult,
    ] = await Promise.all([
      supabase
        .from('releases')
        .select('id,title,cover_art_url,digital_release_date,created_at')
        .eq('user_id', ownerId)
        .order('created_at', { ascending: false })
        .limit(8),
      supabase
        .from('beats')
        .select('id,title,image_url,genre,created_at')
        .eq('user_id', ownerId)
        .order('created_at', { ascending: false })
        .limit(8),
      supabase
        .from('sample_packs')
        .select('id,title,cover_art_url,genre,created_at')
        .eq('user_id', ownerId)
        .order('created_at', { ascending: false })
        .limit(8),
      supabase
        .from('soundboards' as any)
        .select('id,title,cover_image_url,item_count,created_at')
        .eq('user_id', ownerId)
        .order('created_at', { ascending: false })
        .limit(8),
      supabase
        .from('user_follows')
        .select('id', { count: 'exact', head: true })
        .eq('following_id', ownerId),
      viewerId
        ? supabase
            .from('user_follows')
            .select('id')
            .eq('follower_id', viewerId)
            .eq('following_id', ownerId)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

    setReleases(
      ((releaseResult.data ?? []) as any[]).map((item) => ({
        id: item.id,
        title: item.title,
        imageUrl: item.cover_art_url,
        meta: item.digital_release_date ? new Date(item.digital_release_date).getFullYear().toString() : 'Release',
        route: `/release/${item.id}`,
        icon: 'album',
      })),
    );
    setBeats(
      ((beatResult.data ?? []) as any[]).map((item) => ({
        id: item.id,
        title: item.title,
        imageUrl: item.image_url,
        meta: item.genre || 'Beat',
        route: `/beat/${item.id}`,
        icon: 'headphones',
      })),
    );
    setSamplePacks(
      ((samplePackResult.data ?? []) as any[]).map((item) => ({
        id: item.id,
        title: item.title,
        imageUrl: item.cover_art_url,
        meta: item.genre || 'Sample pack',
        route: `/sample-pack/${item.id}`,
        icon: 'inventory-2',
      })),
    );
    setSoundboards(
      ((soundboardResult.data ?? []) as any[]).map((item) => ({
        id: item.id,
        title: item.title,
        imageUrl: item.cover_image_url,
        meta: `${item.item_count ?? 0} sounds`,
        route: `/soundboards/${item.id}`,
        icon: 'dashboard-customize',
      })),
    );
    setFollowerCount(followerResult.count ?? 0);
    setIsFollowing(Boolean(followingResult.data));
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

            {allContent.map((section) => (
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
});
