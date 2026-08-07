import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PluggdImage } from '../../components/PluggdImage';
import { BrandLogo } from '../../../components/BrandLogo';
import { PremiumScreenBackdrop } from '../../../components/PluggdPrimitives';
import { useAuth } from '../../context/AuthProvider';
import { selectionHaptic } from '../../design/haptics';
import { pluggdFonts } from '../../design/typography';
import { usePluggdTheme } from '../../design/usePluggdTheme';
import { contentInitials, formatCompact } from '../../lib/mobileContent';
import { supabase } from '../../lib/supabase';
import { MobileSocialPostCard } from '../culture/MobileSocialPostCard';
import { loadLibraryBundle } from '../culture/mobileServices';
import { loadMobileSocialFeed } from '../culture/mobileSocial';
import { useBackstage } from '../culture/useCultureData';

type ProfileTab = 'posts' | 'music' | 'playlists' | 'events' | 'backstage';

const PROFILE_TABS: Array<{ key: ProfileTab; label: string; icon: keyof typeof MaterialIcons.glyphMap }> = [
  { key: 'posts', label: 'Posts', icon: 'grid-on' },
  { key: 'music', label: 'Music', icon: 'play-circle-outline' },
  { key: 'playlists', label: 'Playlists', icon: 'queue-music' },
  { key: 'events', label: 'Events', icon: 'confirmation-number' },
  { key: 'backstage', label: 'Communities', icon: 'groups' },
];

type ProfileRow = {
  user_id: string;
  username?: string | null;
  full_name?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  cover_image_url?: string | null;
  profile_type?: string | null;
  is_creator?: boolean | null;
  is_verified?: boolean | null;
};

async function loadOwnProfile(userId?: string | null) {
  if (!userId) return null;
  const { data, error } = await (supabase as any)
    .from('profiles')
    .select('user_id,username,full_name,bio,avatar_url,cover_image_url,profile_type,is_creator,is_verified')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return (data as ProfileRow | null) ?? null;
}

async function loadOwnCounts(userId?: string | null) {
  if (!userId) return { followers: 0, following: 0 };
  const [followers, following] = await Promise.all([
    (supabase as any).from('user_follows').select('id', { count: 'exact', head: true }).eq('following_id', userId),
    (supabase as any).from('user_follows').select('id', { count: 'exact', head: true }).eq('follower_id', userId),
  ]);
  return { followers: followers.count ?? 0, following: following.count ?? 0 };
}

export function MyProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = usePluggdTheme();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<ProfileTab>('posts');
  const [refreshing, setRefreshing] = useState(false);

  const profile = useQuery({
    queryKey: ['profile', 'me', user?.id],
    queryFn: () => loadOwnProfile(user?.id),
    enabled: !!user?.id,
    staleTime: 1000 * 60,
  });
  const counts = useQuery({
    queryKey: ['profile', 'counts', user?.id],
    queryFn: () => loadOwnCounts(user?.id),
    enabled: !!user?.id,
    staleTime: 1000 * 60,
  });
  const posts = useQuery({
    queryKey: ['profile', 'posts', user?.id],
    queryFn: () =>
      loadMobileSocialFeed({
        destination: user?.id ? { destination_type: 'user_profile', destination_id: user.id } : null,
        mode: 'latest',
        limit: 30,
      }),
    enabled: !!user?.id,
    staleTime: 1000 * 45,
  });
  const library = useQuery({
    queryKey: ['culture', 'library'],
    queryFn: loadLibraryBundle,
    enabled: !!user?.id,
    staleTime: 1000 * 60,
  });
  const backstage = useBackstage();

  const row = profile.data;
  const displayName =
    row?.full_name ||
    row?.username ||
    user?.email?.split('@')[0] ||
    'PLUGGD member';
  const handle = row?.username ? `@${row.username}` : user?.email || 'Set your username';
  const musicItems = useMemo(
    () => (library.data?.saved || []).filter((item) => ['release', 'beat', 'mix', 'sample_pack', 'soundboard'].includes(item.kind)),
    [library.data?.saved],
  );
  const playlistItems = useMemo(
    () => (library.data?.saved || []).filter((item) => item.kind === 'playlist'),
    [library.data?.saved],
  );
  const eventItems = useMemo(
    () => [
      ...(library.data?.tickets || []).map((ticket) => ({
        id: ticket.id,
        title: ticket.event_title,
        subtitle: ticket.status,
        imageUrl: ticket.event_image_url,
        route: `/events/${ticket.event_id}`,
      })),
      ...(library.data?.saved || []).filter((item) => item.kind === 'event').map((item) => ({
        id: item.id,
        title: item.title,
        subtitle: item.subtitle,
        imageUrl: item.imageUrl,
        route: item.route,
      })),
    ],
    [library.data?.saved, library.data?.tickets],
  );
  const communities = backstage.data?.joinedCommunities || [];

  const refreshAll = async () => {
    setRefreshing(true);
    try {
      await Promise.all([profile.refetch(), counts.refetch(), posts.refetch(), library.refetch(), backstage.refetch()]);
    } finally {
      setRefreshing(false);
    }
  };

  const go = (route: string) => {
    selectionHaptic();
    router.push(route as any);
  };

  if (!user) {
    return (
      <PremiumScreenBackdrop tone="accent" style={[styles.screen, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
        <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.signedOut}>
          <BrandLogo width={86} height={28} variant={theme.scheme === 'dark' ? 'dark' : 'light'} />
          <View style={[styles.signedOutPanel, { borderColor: theme.colors.border }]}>
            <View style={[styles.signedOutRule, { backgroundColor: theme.colors.accent }]} />
            <Text style={[styles.signedOutEyebrow, { color: theme.colors.accent }]}>MY PLUGGD</Text>
            <Text style={[styles.signedOutTitle, { color: theme.colors.text }]}>Build the world around your sound.</Text>
            <Text style={[styles.signedOutBody, { color: theme.colors.textMuted }]}>
              Sign in to collect posts, playlists, tickets, saved music and the communities you move with.
            </Text>
            <View style={[styles.signedOutBenefits, { borderColor: theme.colors.border }]}>
              <SignedOutBenefit icon="headphones" title="Keep every discovery" detail="Music, mixes and soundboards" />
              <SignedOutBenefit icon="confirmation-number" title="Carry your access" detail="Tickets, memberships and purchases" />
              <SignedOutBenefit icon="groups" title="Move with your scene" detail="Posts, circles and creator updates" />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sign in to My PLUGGD"
              style={[styles.primaryButton, { backgroundColor: theme.colors.accent }]}
              onPress={() => go('/auth/login')}
            >
              <Text style={styles.primaryButtonText}>Sign in</Text>
              <MaterialIcons name="arrow-forward" size={18} color="#0a0806" />
            </Pressable>
          </View>
        </View>
      </PremiumScreenBackdrop>
    );
  }

  return (
    <PremiumScreenBackdrop tone="muted" style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshAll} tintColor={theme.colors.accent} />}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 154 }]}
      >
        <View style={styles.topBar}>
          <BrandLogo width={86} height={28} variant={theme.scheme === 'dark' ? 'dark' : 'light'} />
          <View style={styles.topActions}>
            <Pressable accessibilityRole="button" accessibilityLabel="Create post" onPress={() => go('/create-post')} style={[styles.topIcon, { borderColor: theme.colors.border }]}>
              <MaterialIcons name="add" size={23} color={theme.colors.accent} />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Open settings" onPress={() => go('/settings')} style={[styles.topIcon, { borderColor: theme.colors.border }]}>
              <MaterialIcons name="menu" size={23} color={theme.colors.text} />
            </Pressable>
          </View>
        </View>

        <View style={styles.identityBlock}>
          <View style={[styles.profileCover, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            {row?.cover_image_url ? (
              <PluggdImage uri={row.cover_image_url} style={StyleSheet.absoluteFill} resizeMode="cover" />
            ) : (
              <View style={styles.profileCoverFallback}>
                <MaterialIcons name={row?.is_creator ? 'auto-awesome' : 'headphones'} size={30} color={theme.colors.accent} />
                <Text style={[styles.profileCoverText, { color: theme.colors.textMuted }]}>
                  {row?.is_creator ? 'Creator space' : 'Listening space'}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.avatarWrap}>
            <View style={[styles.avatar, { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.divider }]}>
              {row?.avatar_url ? (
                <PluggdImage uri={row.avatar_url} style={StyleSheet.absoluteFill} resizeMode="cover" />
              ) : (
                <Text style={[styles.avatarInitial, { color: theme.colors.text }]}>{contentInitials(displayName)}</Text>
              )}
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Edit profile photo" onPress={() => go('/edit-profile')} style={[styles.avatarPlus, { backgroundColor: theme.colors.accent }]}>
              <MaterialIcons name="add" size={22} color="#0a0806" />
            </Pressable>
          </View>

          <View style={styles.profileBadgeRow}>
            <Text style={[styles.profileBadge, { color: theme.colors.accent, borderColor: theme.colors.borderAccent }]}>
              {row?.is_verified ? 'Verified' : row?.profile_type || (row?.is_creator ? 'Creator' : 'Member')}
            </Text>
          </View>
          <Text style={[styles.profileName, { color: theme.colors.text }]} numberOfLines={1}>
            {displayName}
            {row?.is_verified ? '  ' : ''}
          </Text>
          <Text style={[styles.profileHandle, { color: theme.colors.textMuted }]} numberOfLines={1}>{handle}</Text>

          <View style={styles.statsRow}>
            <Stat value={counts.data?.following ?? 0} label="Following" />
            <Stat value={counts.data?.followers ?? 0} label="Followers" />
            <Stat value={posts.data?.length ?? 0} label="Posts" />
          </View>

          {row?.bio ? <Text style={[styles.bio, { color: theme.colors.text }]}>{row.bio}</Text> : null}

          <View style={styles.actionRow}>
            <Pressable accessibilityRole="button" style={[styles.actionButton, { borderColor: theme.colors.border }]} onPress={() => go('/edit-profile')}>
              <Text style={[styles.actionButtonText, { color: theme.colors.text }]}>Edit profile</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Share profile"
              style={[styles.actionButton, { borderColor: theme.colors.border }]}
              onPress={() => {
                void Share.share({ message: row?.username ? `https://pluggd.fm/${row.username}` : 'PLUGGD profile' });
              }}
            >
              <Text style={[styles.actionButtonText, { color: theme.colors.text }]}>Share profile</Text>
            </Pressable>
          </View>

          <View style={styles.accountRail}>
            <Pressable accessibilityRole="button" accessibilityLabel="Open My PLUGGD" style={[styles.accountRailButton, { borderColor: theme.colors.border }]} onPress={() => go('/my-pluggd')}>
              <MaterialIcons name="space-dashboard" size={21} color={theme.colors.accent} />
              <Text style={[styles.accountRailText, { color: theme.colors.text }]}>My PLUGGD</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Open library" style={[styles.accountRailButton, { borderColor: theme.colors.border }]} onPress={() => go('/library')}>
              <MaterialIcons name="library-music" size={21} color={theme.colors.accent} />
              <Text style={[styles.accountRailText, { color: theme.colors.text }]}>Library</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Open purchases and access" style={[styles.accountRailButton, { borderColor: theme.colors.border }]} onPress={() => go('/purchases')}>
              <MaterialIcons name="verified-user" size={21} color={theme.colors.accent} />
              <Text style={[styles.accountRailText, { color: theme.colors.text }]}>Access</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Open settings" style={[styles.accountRailButton, { borderColor: theme.colors.border }]} onPress={() => go('/settings')}>
              <MaterialIcons name="settings" size={21} color={theme.colors.accent} />
              <Text style={[styles.accountRailText, { color: theme.colors.text }]}>Settings</Text>
            </Pressable>
          </View>
        </View>

        <View style={[styles.tabBar, { borderBottomColor: theme.colors.divider }]}>
          {PROFILE_TABS.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`${tab.label} profile tab`}
                style={styles.profileTab}
                onPress={() => {
                  selectionHaptic();
                  setActiveTab(tab.key);
                }}
              >
                <MaterialIcons name={tab.icon} size={22} color={active ? theme.colors.text : theme.colors.inactive} />
                <Text style={[styles.profileTabLabel, { color: active ? theme.colors.text : theme.colors.inactive }]}>{tab.label}</Text>
                {active ? <View style={[styles.profileTabIndicator, { backgroundColor: theme.colors.accent }]} /> : null}
              </Pressable>
            );
          })}
        </View>

        {activeTab === 'posts' ? (
          <View style={styles.postList}>
            {posts.data?.length ? (
              posts.data.map((post) => <MobileSocialPostCard key={post.id} post={post} variant="timeline" onMutated={() => void posts.refetch()} />)
            ) : (
              <EmptyPanel title="No posts yet" body="Create your first PLUGGD post or repost something from your scene." />
            )}
          </View>
        ) : null}
        {activeTab === 'music' ? <GridList items={musicItems.map((item) => ({ id: item.id, title: item.title, subtitle: item.subtitle, imageUrl: item.imageUrl, route: item.route }))} empty="Saved tracks, releases, mixes and beats will appear here." /> : null}
        {activeTab === 'playlists' ? <GridList items={playlistItems.map((item) => ({ id: item.id, title: item.title, subtitle: item.subtitle, imageUrl: item.imageUrl, route: item.route }))} empty="Your playlists will appear here." /> : null}
        {activeTab === 'events' ? <GridList items={eventItems} empty="Tickets, RSVPs and saved events will appear here." /> : null}
        {activeTab === 'backstage' ? (
          <GridList
            items={communities.map((item) => ({
              id: item.id,
              title: item.title,
              subtitle: item.member_count ? `${formatCompact(item.member_count)} members` : 'Community',
              imageUrl: item.avatar_url || item.cover_image_url,
              route: `/backstage/${item.slug || item.id}`,
            }))}
            empty="Joined communities and circles will appear here."
          />
        ) : null}
      </ScrollView>
    </PremiumScreenBackdrop>
  );
}

function SignedOutBenefit({ icon, title, detail }: { icon: keyof typeof MaterialIcons.glyphMap; title: string; detail: string }) {
  const theme = usePluggdTheme();
  return (
    <View style={[styles.signedOutBenefit, { borderColor: theme.colors.border }]}>
      <View style={[styles.signedOutBenefitIcon, { backgroundColor: theme.colors.surface }]}>
        <MaterialIcons name={icon} size={20} color={theme.colors.accent} />
      </View>
      <View style={styles.signedOutBenefitCopy}>
        <Text style={[styles.signedOutBenefitTitle, { color: theme.colors.text }]}>{title}</Text>
        <Text style={[styles.signedOutBenefitDetail, { color: theme.colors.textMuted }]}>{detail}</Text>
      </View>
      <MaterialIcons name="arrow-forward" size={17} color={theme.colors.inactive} />
    </View>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  const theme = usePluggdTheme();
  return (
    <View style={styles.statItem}>
      <Text style={[styles.statValue, { color: theme.colors.text }]}>{formatCompact(value)}</Text>
      <Text style={[styles.statLabel, { color: theme.colors.textMuted }]}>{label}</Text>
    </View>
  );
}

function EmptyPanel({ title, body }: { title: string; body: string }) {
  const theme = usePluggdTheme();
  return (
    <View style={[styles.emptyPanel, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>{title}</Text>
      <Text style={[styles.emptyBody, { color: theme.colors.textMuted }]}>{body}</Text>
    </View>
  );
}

function GridList({ items, empty }: { items: Array<{ id: string; title: string; subtitle?: string | null; imageUrl?: string | null; route: string }>; empty: string }) {
  const router = useRouter();
  const theme = usePluggdTheme();
  if (!items.length) return <EmptyPanel title="Nothing here yet" body={empty} />;
  return (
    <View style={styles.grid}>
      {items.map((item) => (
        <Pressable accessibilityRole="button" accessibilityLabel={`Open ${item.title}`} key={`${item.route}-${item.id}`} style={styles.gridItem} onPress={() => router.push(item.route as any)}>
          <View style={[styles.gridArt, { backgroundColor: theme.colors.surfaceAlt }]}>
            {item.imageUrl ? <PluggdImage uri={item.imageUrl} style={StyleSheet.absoluteFill} resizeMode="cover" /> : <MaterialIcons name="graphic-eq" size={22} color={theme.colors.accent} />}
          </View>
          <Text style={[styles.gridTitle, { color: theme.colors.text }]} numberOfLines={1}>{item.title}</Text>
          <Text style={[styles.gridMeta, { color: theme.colors.textMuted }]} numberOfLines={1}>{item.subtitle || 'PLUGGD'}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { gap: 0 },
  signedOut: { flex: 1, minHeight: 540, paddingHorizontal: 18, paddingTop: 22 },
  signedOutPanel: { borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: 20, marginTop: 18 },
  signedOutRule: { width: 42, height: 4, borderRadius: 2, marginBottom: 17 },
  signedOutEyebrow: { fontFamily: pluggdFonts.satoshiBlack, fontSize: 10, letterSpacing: 1.6 },
  signedOutTitle: { maxWidth: 320, marginTop: 8, fontFamily: pluggdFonts.displayExtraBold, fontSize: 30, lineHeight: 34, letterSpacing: -0.8 },
  signedOutBody: { maxWidth: 320, marginTop: 10, fontFamily: pluggdFonts.satoshiMedium, fontSize: 14, lineHeight: 21 },
  signedOutBenefits: { marginTop: 18, borderTopWidth: 1 },
  signedOutBenefit: { minHeight: 58, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 11 },
  signedOutBenefitIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  signedOutBenefitCopy: { flex: 1 },
  signedOutBenefitTitle: { fontFamily: pluggdFonts.satoshiBold, fontSize: 13 },
  signedOutBenefitDetail: { fontFamily: pluggdFonts.satoshiMedium, fontSize: 11, marginTop: 2 },
  topBar: { minHeight: 58, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  topIcon: { width: 44, height: 44, borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  identityBlock: { paddingHorizontal: 20, alignItems: 'flex-start', paddingTop: 6, paddingBottom: 18 },
  profilePremiumHeader: { width: '100%', paddingHorizontal: 0, paddingTop: 0, paddingBottom: 14 },
  profileHero: { width: '100%', marginBottom: 18 },
  profileCover: { width: '100%', height: 122, borderRadius: 18, borderWidth: 1, overflow: 'hidden', marginBottom: -39 },
  profileCoverFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  profileCoverText: { fontFamily: pluggdFonts.satoshiBold, fontSize: 13 },
  avatarWrap: { width: 94, height: 94, marginLeft: 14, marginBottom: 8 },
  avatar: { width: 90, height: 90, borderRadius: 45, borderWidth: 2, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  avatarPlus: { position: 'absolute', right: 0, bottom: 3, width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontFamily: pluggdFonts.satoshiBlack, fontSize: 29 },
  profileBadgeRow: { minHeight: 26, alignItems: 'flex-start', justifyContent: 'center', marginBottom: 5 },
  profileBadge: { borderBottomWidth: 2, paddingHorizontal: 4, paddingVertical: 5, overflow: 'hidden', fontFamily: pluggdFonts.satoshiBlack, fontSize: 11, textTransform: 'uppercase' },
  profileName: { fontFamily: pluggdFonts.displayExtraBold, fontSize: 31, lineHeight: 35, letterSpacing: -0.8 },
  profileHandle: { marginTop: 2, fontFamily: pluggdFonts.satoshiMedium, fontSize: 14, lineHeight: 20 },
  statsRow: { width: '100%', minHeight: 70, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 17, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#2B2723' },
  statItem: { alignItems: 'flex-start', minWidth: 68 },
  statValue: { fontFamily: pluggdFonts.displayExtraBold, fontSize: 20, lineHeight: 24 },
  statLabel: { fontFamily: pluggdFonts.satoshiMedium, fontSize: 11, lineHeight: 15, marginTop: 2 },
  bio: { marginTop: 15, fontFamily: pluggdFonts.satoshiMedium, fontSize: 14, lineHeight: 20, textAlign: 'left' },
  actionRow: { width: '100%', flexDirection: 'row', gap: 9, marginTop: 17 },
  actionButton: { flex: 1, minWidth: 146, minHeight: 48, borderRadius: 5, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  actionButtonText: { fontFamily: pluggdFonts.satoshiBold, fontSize: 15 },
  accountRail: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 13 },
  accountRailButton: { width: '48.5%', minHeight: 72, borderWidth: StyleSheet.hairlineWidth, borderRadius: 15, paddingHorizontal: 13, alignItems: 'flex-start', justifyContent: 'center', gap: 5 },
  accountRailText: { fontFamily: pluggdFonts.satoshiBlack, fontSize: 12, lineHeight: 16 },
  tabBar: { minHeight: 66, marginHorizontal: 20, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  profileTab: { flex: 1, minHeight: 66, alignItems: 'center', justifyContent: 'center', gap: 4 },
  profileTabLabel: { fontFamily: pluggdFonts.satoshiBold, fontSize: 8.5, lineHeight: 11 },
  profileTabIndicator: { position: 'absolute', bottom: 0, left: 8, right: 8, height: 2, borderRadius: 1 },
  postList: { gap: 12, paddingTop: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 16 },
  gridItem: { width: '48.5%', paddingBottom: 8 },
  gridArt: { height: 146, borderRadius: 5, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  gridTitle: { marginTop: 9, fontFamily: pluggdFonts.satoshiBold, fontSize: 14 },
  gridMeta: { marginTop: 3, fontSize: 12 },
  emptyPanel: { margin: 16, borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: 24, gap: 7 },
  emptyTitle: { fontFamily: pluggdFonts.displayBold, fontSize: 16, textAlign: 'left' },
  emptyBody: { fontSize: 13, lineHeight: 19, textAlign: 'left' },
  primaryButton: { alignSelf: 'flex-start', minHeight: 48, marginTop: 20, borderRadius: 5, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryButtonText: { fontFamily: pluggdFonts.satoshiBold, fontSize: 14, color: '#0a0806' },
});
