import { MaterialIcons } from '@expo/vector-icons';
import { pluggdFonts } from '../../src/design/typography';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BrandLogo } from '../../components/BrandLogo';
import { supabase } from '../../src/lib/supabase';

const PLUGGD_ORANGE = '#FF5A00';

const GENRES = [
  'Hip-Hop',
  'R&B',
  'Afrobeats',
  'Electronic',
  'Drill',
  'House',
  'Pop',
  'Jazz',
  'Indie',
  'Grime',
];

type SuggestedCreator = {
  id: string;
  userId: string;
  name: string;
  role: string;
  initials: string;
  avatarUrl: string | null;
};

type ProfileRow = {
  id?: string | null;
  user_id?: string | null;
  full_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
  user_type?: string | null;
  profile_type?: string | null;
  is_creator?: boolean | null;
};

function creatorDisplayName(profile: ProfileRow) {
  return profile.full_name?.trim() || profile.username?.trim() || 'PLUGGD creator';
}

function creatorRole(profile: ProfileRow) {
  const raw = profile.profile_type || profile.user_type || (profile.is_creator ? 'creator' : 'creator');
  return raw.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function creatorInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'P';
}

function PluggdWordmark() {
  return <BrandLogo variant="dark" width={122} height={44} />;
}

export default function FanSetup() {
  const router = useRouter();
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [eventsNearMe, setEventsNearMe] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [following, setFollowing] = useState<string[]>([]);
  const [suggestedCreators, setSuggestedCreators] = useState<SuggestedCreator[]>([]);
  const [creatorsLoading, setCreatorsLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadCreators = async () => {
      setCreatorsLoading(true);

      try {
        const { data, error } = await (supabase as any)
          .from('profiles')
          .select('id,user_id,full_name,username,avatar_url,user_type,profile_type,is_creator')
          .or('is_creator.eq.true,user_type.in.(artist,producer,industry)')
          .limit(6);

        if (!mounted) return;
        if (error) {
          console.error('Failed to load suggested creators:', error);
          setSuggestedCreators([]);
          return;
        }

        const creators = (Array.isArray(data) ? (data as ProfileRow[]) : [])
          .map((profile) => {
            const userId = profile.user_id || profile.id || '';
            const name = creatorDisplayName(profile);

            return {
              id: userId,
              userId,
              name,
              role: creatorRole(profile),
              initials: creatorInitials(name),
              avatarUrl: profile.avatar_url || null,
            };
          })
          .filter((creator) => Boolean(creator.userId));

        setSuggestedCreators(creators);
      } finally {
        if (mounted) setCreatorsLoading(false);
      }
    };

    void loadCreators();

    return () => {
      mounted = false;
    };
  }, []);

  const toggleGenre = (genre: string) => {
    setSelectedGenres((current) =>
      current.includes(genre)
        ? current.filter((item) => item !== genre)
        : [...current, genre],
    );
  };

  const toggleFollow = (id: string) => {
    setFollowing((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  };

  const handleFinish = async () => {
    setSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/auth/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_progress')
        .eq('user_id', user.id)
        .maybeSingle();

      const existingProgress =
        profile?.onboarding_progress && typeof profile.onboarding_progress === 'object'
          ? (profile.onboarding_progress as Record<string, unknown>)
          : {};

      const nextProgress = {
        ...existingProgress,
        version: 3,
        fan_setup: {
          genres: selectedGenres,
          events_near_me: eventsNearMe,
          notifications,
          suggested_creator_follows: following,
          completed_at: new Date().toISOString(),
        },
        completed_at: new Date().toISOString(),
      };

      const { error } = await (supabase.from('profiles').upsert(
        {
          user_id: user.id,
          genres: selectedGenres.length > 0 ? selectedGenres : null,
          onboarding_progress: nextProgress,
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      ) as any);

      if (error) throw error;

      const creatorIdsToFollow = Array.from(new Set(following)).filter((creatorId) => creatorId && creatorId !== user.id);
      if (creatorIdsToFollow.length > 0) {
        const { data: existingFollows, error: existingError } = await (supabase as any)
          .from('user_follows')
          .select('following_id')
          .eq('follower_id', user.id)
          .in('following_id', creatorIdsToFollow);

        if (existingError) throw existingError;

        const existingIds = new Set((Array.isArray(existingFollows) ? existingFollows : []).map((row: any) => row.following_id));
        const newFollows = creatorIdsToFollow
          .filter((creatorId) => !existingIds.has(creatorId))
          .map((creatorId) => ({
            follower_id: user.id,
            following_id: creatorId,
          }));

        if (newFollows.length > 0) {
          const { error: followError } = await (supabase as any).from('user_follows').insert(newFollows);
          if (followError) throw followError;
        }
      }

      router.replace('/');
    } catch (error: any) {
      console.error('Failed to save fan setup:', error);
      Alert.alert(
        'Could not finish setup',
        error?.message ?? 'Please try again in a moment.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.logoWrap}>
          <PluggdWordmark />
        </View>

        <View style={styles.progressWrap}>
          <View style={styles.progressTrack}>
            <View style={styles.progressFill} />
            <View style={[styles.progressStep, styles.progressDone]}>
              <MaterialIcons name="check" size={13} color={PLUGGD_ORANGE} />
            </View>
            <View style={[styles.progressStep, styles.progressActive]}>
              <Text style={styles.progressActiveText}>2</Text>
            </View>
            <View style={[styles.progressStep, styles.progressFuture]}>
              <Text style={styles.progressFutureText}>3</Text>
            </View>
          </View>
          <Text style={styles.stepText}>Step 2 of 3</Text>
        </View>

        <Text style={styles.title}>Shape your feed</Text>
        <Text style={styles.subtitle}>
          Choose sounds, scenes, and creators you want to follow.
        </Text>

        <Text style={styles.sectionTitle}>Pick your genres</Text>

        <View style={styles.genreGrid}>
          {GENRES.map((genre) => {
            const selected = selectedGenres.includes(genre);

            return (
              <Pressable
                key={genre}
                onPress={() => toggleGenre(genre)}
                style={[styles.genreChip, selected && styles.genreChipSelected]}
              >
                <Text
                  style={[
                    styles.genreChipText,
                    selected && styles.genreChipTextSelected,
                  ]}
                >
                  {genre}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <ToggleRow
          icon="location-on"
          title="Find events near me"
          subtitle="Save this preference for event recommendations"
          enabled={eventsNearMe}
          onPress={() => setEventsNearMe((value) => !value)}
        />

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Suggested creators</Text>
            <Pressable style={styles.seeAllButton} onPress={() => router.push('/search' as any)}>
              <Text style={styles.seeAllText}>See all</Text>
              <MaterialIcons name="chevron-right" size={22} color={PLUGGD_ORANGE} />
            </Pressable>
          </View>

          <View style={styles.creatorList}>
            {creatorsLoading ? (
              <View style={styles.creatorLoading}>
                <ActivityIndicator color={PLUGGD_ORANGE} />
                <Text style={styles.creatorEmptyText}>Loading creators from PLUGGD...</Text>
              </View>
            ) : null}

            {!creatorsLoading && suggestedCreators.length === 0 ? (
              <Text style={styles.creatorEmptyText}>Creators will appear here once your account can access the live directory.</Text>
            ) : null}

            {suggestedCreators.map((creator, index) => {
              const isFollowing = following.includes(creator.id);

              return (
                <View
                  key={creator.id}
                  style={[
                    styles.creatorRow,
                    index !== suggestedCreators.length - 1 && styles.creatorRowBorder,
                  ]}
                >
                  <View style={styles.avatar}>
                    {creator.avatarUrl ? <Image source={{ uri: creator.avatarUrl }} style={styles.avatarImage} /> : null}
                    {!creator.avatarUrl ? <Text style={styles.avatarText}>{creator.initials}</Text> : null}
                  </View>

                  <View style={styles.creatorInfo}>
                    <Text style={styles.creatorName}>{creator.name}</Text>
                    <Text style={styles.creatorRole}>{creator.role}</Text>
                  </View>

                  <Pressable
                    onPress={() => toggleFollow(creator.id)}
                    style={[
                      styles.followButton,
                      isFollowing && styles.followButtonActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.followButtonText,
                        isFollowing && styles.followButtonTextActive,
                      ]}
                    >
                      {isFollowing ? 'Following' : 'Follow'}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        </View>

        <ToggleRow
          icon="notifications-none"
          title="New music, live rooms, and event reminders"
          enabled={notifications}
          onPress={() => setNotifications((value) => !value)}
        />
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.cta} onPress={handleFinish} disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.ctaText}>Finish setup</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

type ToggleRowProps = {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  subtitle?: string;
  enabled: boolean;
  onPress: () => void;
};

function ToggleRow({ icon, title, subtitle, enabled, onPress }: ToggleRowProps) {
  return (
    <Pressable style={styles.toggleRow} onPress={onPress}>
      <View style={styles.toggleIconBox}>
        <MaterialIcons name={icon} size={25} color={PLUGGD_ORANGE} />
      </View>

      <View style={styles.toggleTextWrap}>
        <Text style={styles.toggleTitle}>{title}</Text>
        {subtitle ? <Text style={styles.toggleSubtitle}>{subtitle}</Text> : null}
      </View>

      <View style={[styles.switchTrack, enabled && styles.switchTrackOn]}>
        <View style={[styles.switchThumb, enabled && styles.switchThumbOn]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#080808',
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 122,
  },
  logoWrap: {
    alignItems: 'center',
    marginTop: 4,
  },
  logoTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 30,
    lineHeight: 44,
    fontFamily: pluggdFonts.satoshiBold, fontWeight: '700',
    letterSpacing: 1,
  },
  logoAccent: {
    color: PLUGGD_ORANGE,
  },
  progressWrap: {
    marginTop: 16,
    marginBottom: 28,
    alignItems: 'center',
  },
  progressTrack: {
    width: '84%',
    height: 2,
    backgroundColor: '#323232',
    position: 'relative',
    justifyContent: 'center',
  },
  progressFill: {
    position: 'absolute',
    left: 0,
    width: '50%',
    height: 2,
    backgroundColor: PLUGGD_ORANGE,
  },
  progressStep: {
    position: 'absolute',
    top: -16,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressDone: {
    left: -1,
    backgroundColor: '#080808',
    borderWidth: 2,
    borderColor: PLUGGD_ORANGE,
  },
  progressActive: {
    left: '50%',
    marginLeft: -17,
    backgroundColor: PLUGGD_ORANGE,
  },
  progressFuture: {
    right: -1,
    backgroundColor: '#080808',
    borderWidth: 2,
    borderColor: '#555555',
  },
  progressActiveText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: pluggdFonts.satoshiBold, fontWeight: '700',
  },
  progressFutureText: {
    color: '#A4A4A4',
    fontSize: 14,
    fontFamily: pluggdFonts.satoshiBold, fontWeight: '700',
  },
  stepText: {
    color: '#A9A9A9',
    fontSize: 16,
    fontFamily: pluggdFonts.satoshiBold, fontWeight: '700',
    marginTop: 28,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 40,
    lineHeight: 46,
    fontFamily: pluggdFonts.satoshiBold, fontWeight: '700',
  },
  subtitle: {
    color: '#B3B3B3',
    fontSize: 20,
    lineHeight: 28,
    fontFamily: pluggdFonts.satoshiMedium, fontWeight: '500',
    marginTop: 14,
    marginBottom: 30,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontFamily: pluggdFonts.satoshiBold, fontWeight: '700',
    marginBottom: 14,
  },
  genreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  genreChip: {
    minWidth: '22.6%',
    height: 52,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333333',
    backgroundColor: '#101010',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  genreChipSelected: {
    backgroundColor: PLUGGD_ORANGE,
    borderColor: PLUGGD_ORANGE,
  },
  genreChipText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: pluggdFonts.satoshiBold, fontWeight: '700',
  },
  genreChipTextSelected: {
    color: '#FFFFFF',
  },
  toggleRow: {
    minHeight: 72,
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  toggleIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#202020',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  toggleTextWrap: {
    flex: 1,
    paddingRight: 10,
  },
  toggleTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: pluggdFonts.satoshiBold, fontWeight: '700',
    lineHeight: 23,
  },
  toggleSubtitle: {
    color: '#9F9F9F',
    fontSize: 14,
    lineHeight: 19,
    marginTop: 3,
  },
  switchTrack: {
    width: 54,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2C2C2C',
    padding: 3,
    justifyContent: 'center',
  },
  switchTrackOn: {
    backgroundColor: PLUGGD_ORANGE,
  },
  switchThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#BEBEBE',
  },
  switchThumbOn: {
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-end',
  },
  card: {
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontFamily: pluggdFonts.satoshiBold, fontWeight: '700',
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeAllText: {
    color: PLUGGD_ORANGE,
    fontSize: 15,
    fontFamily: pluggdFonts.satoshiBold, fontWeight: '700',
  },
  creatorList: {
    gap: 0,
  },
  creatorRow: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
  },
  creatorRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: '#333333',
    backgroundColor: '#242424',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: pluggdFonts.satoshiBold, fontWeight: '700',
  },
  creatorLoading: {
    minHeight: 76,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  creatorEmptyText: {
    color: '#AFAFAF',
    fontSize: 14,
    lineHeight: 20,
    fontFamily: pluggdFonts.satoshiMedium, fontWeight: '600',
  },
  creatorInfo: {
    flex: 1,
  },
  creatorName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: pluggdFonts.satoshiBold, fontWeight: '700',
  },
  creatorRole: {
    color: '#B8B8B8',
    fontSize: 15,
    marginTop: 4,
  },
  followButton: {
    minWidth: 104,
    height: 42,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#666666',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  followButtonActive: {
    borderColor: PLUGGD_ORANGE,
  },
  followButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: pluggdFonts.satoshiBold, fontWeight: '700',
  },
  followButtonTextActive: {
    color: PLUGGD_ORANGE,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 22,
    backgroundColor: 'rgba(8,8,8,0.96)',
    borderTopWidth: 1,
    borderTopColor: '#151515',
  },
  cta: {
    height: 58,
    borderRadius: 8,
    backgroundColor: PLUGGD_ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontFamily: pluggdFonts.satoshiBold, fontWeight: '700',
  },
});
