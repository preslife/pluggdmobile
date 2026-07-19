/**
 * Soundboards — direct mobile port of the web /soundboards index:
 * "NEW CORE / Creator Sketchbooks" chips, "Ideas grow in public."
 * header, Browse Releases shortcut, search, Updated/Trending/Featured
 * chips, and the dense board cards (cover with Soundboard pill, title,
 * description, date, cards/plays/likes/comments stats, creator row).
 */
import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PluggdImage } from '../../components/PluggdImage';
import { PremiumSkeleton } from '../../components/PremiumSkeleton';
import { ed, edFonts } from '../../design/editorial';
import { usePluggdTheme } from '../../design/usePluggdTheme';
import { useAuth } from '../../context/AuthProvider';
import { safeList } from '../culture/mobileServices';
import { supabase } from '../../lib/supabase';
import { formatCompact, type ProfileItem, type SoundboardItem } from '../../lib/mobileContent';
import { EdPressable } from './EditorialBits';

const SORT_CHIPS = ['Updated', 'Trending', 'Featured'] as const;

type BoardWithPlays = SoundboardItem & { play_total?: number };

function boardDate(board: SoundboardItem) {
  const value = board.last_activity_at || board.created_at;
  if (!value) return 'Recently updated';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently updated';
  return date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function SoundboardsIndexScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const theme = usePluggdTheme();
  // The web /soundboards index adapts to light mode (unlike the dark-forced
  // editorial pages), so this screen follows the app theme.
  const light = theme.scheme === 'light';
  const pal = light
    ? {
        screen: '#faf1e4',
        panel: '#ffffff',
        panelBorder: 'rgba(91, 56, 31, 0.16)',
        title: ed.ink,
        body: 'rgba(34, 23, 15, 0.62)',
        stat: 'rgba(34, 23, 15, 0.7)',
        input: ed.ink,
        placeholder: 'rgba(34, 23, 15, 0.45)',
        chipText: ed.ink,
        avatarFallback: '#f0e4d2',
      }
    : {
        screen: '#0d0705',
        panel: undefined,
        panelBorder: undefined,
        title: '#ffffff',
        body: 'rgba(255,248,237,0.55)',
        stat: 'rgba(255,248,237,0.68)',
        input: ed.cream,
        placeholder: 'rgba(255,248,237,0.45)',
        chipText: ed.cream,
        avatarFallback: '#2b1c10',
      };
  const panelOverride = light ? { backgroundColor: pal.panel, borderColor: pal.panelBorder } : null;
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<(typeof SORT_CHIPS)[number]>('Updated');

  const boardsQuery = useQuery({
    queryKey: ['soundboards-index', 'boards'],
    queryFn: () =>
      safeList<SoundboardItem>(
        (supabase as any)
          .from('soundboards')
          .select('id,creator_id,slug,title,description,cover_image_url,item_count,like_count,comment_count,follower_count,last_activity_at,created_at')
          .eq('is_published', true)
          .in('visibility', ['public', 'link'])
          .order('last_activity_at', { ascending: false })
          .limit(16),
      ),
    staleTime: 1000 * 60 * 2,
  });

  const boards = useMemo(() => boardsQuery.data ?? [], [boardsQuery.data]);

  const creatorIds = useMemo(
    () => Array.from(new Set(boards.map((board) => board.creator_id).filter(Boolean))) as string[],
    [boards],
  );
  const profilesQuery = useQuery({
    queryKey: ['soundboards-index', 'creators', creatorIds.length],
    enabled: creatorIds.length > 0,
    queryFn: () =>
      safeList<ProfileItem>(
        (supabase as any)
          .from('profiles')
          .select('user_id,id,full_name,username,avatar_url,user_type,profile_type,is_creator,is_verified,city')
          .in('user_id', creatorIds),
      ),
    staleTime: 1000 * 60 * 5,
  });

  const creatorFor = (creatorId?: string | null) => {
    if (!creatorId) return null;
    return (profilesQuery.data ?? []).find(
      (profile) => profile.user_id === creatorId || profile.id === creatorId,
    );
  };

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const list = boards.filter((board) => {
      if (!query) return true;
      const creator = creatorFor(board.creator_id);
      const creatorName = creator ? creator.full_name || creator.username || '' : '';
      return (
        (board.title || '').toLowerCase().includes(query) ||
        (board.description || '').toLowerCase().includes(query) ||
        creatorName.toLowerCase().includes(query)
      );
    });
    if (sort === 'Trending') {
      return [...list].sort(
        (a, b) =>
          Number(b.like_count ?? 0) + Number(b.comment_count ?? 0) - (Number(a.like_count ?? 0) + Number(a.comment_count ?? 0)),
      );
    }
    if (sort === 'Featured') {
      return [...list].sort((a, b) => Number(b.follower_count ?? 0) - Number(a.follower_count ?? 0));
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boards, search, sort, profilesQuery.data]);

  const refreshing = boardsQuery.isRefetching;
  const refresh = () => {
    void boardsQuery.refetch();
    void profilesQuery.refetch();
  };

  return (
    <View style={[styles.screen, { backgroundColor: pal.screen }]}>
      <StatusBar style={light ? 'dark' : 'light'} translucent />
      <ScrollView
        style={[styles.screen, { backgroundColor: pal.screen }]}
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={ed.orange} />}
        contentContainerStyle={{
          paddingTop: Math.max(insets.top + 76, 96),
          paddingBottom: insets.bottom + 210,
          paddingHorizontal: 20,
          gap: 18,
        }}
      >
        {/* NEW CORE chips */}
        <View style={styles.coreRow}>
          <View style={styles.newCorePill}>
            <Text style={styles.newCoreText}>NEW CORE</Text>
          </View>
          <View style={[styles.sketchPill, panelOverride]}>
            <Text style={[styles.sketchText, light && { color: pal.body }]}>Creator Sketchbooks</Text>
          </View>
        </View>

        {/* Header panel */}
        <View style={[styles.headPanel, panelOverride]}>
          <Text style={styles.headEyebrow}>SOUNDBOARDS</Text>
          <Text style={[styles.headTitle, { color: pal.title }]}>Ideas grow in public.</Text>
          <Text style={[styles.headSub, { color: pal.body }]}>
            Demos, references, voice notes, and creator process updates in a denser phone layout.
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actionRow}>
          {!user ? (
            <EdPressable accessibilityRole="button" accessibilityLabel="Sign in" onPress={() => router.push('/auth/login' as any)}>
              <View style={[styles.actionGhost, panelOverride]}>
                <Text style={[styles.actionGhostText, { color: pal.chipText }]}>Sign in</Text>
              </View>
            </EdPressable>
          ) : null}
          <EdPressable accessibilityRole="button" accessibilityLabel="Browse Releases" onPress={() => router.push('/releases' as any)}>
            <View style={styles.actionGhost}>
              <MaterialIcons name="music-note" size={15} color={pal.chipText} />
              <Text style={[styles.actionGhostText, { color: pal.chipText }]}>Browse Releases</Text>
            </View>
          </EdPressable>
        </View>

        {/* Search + sort */}
        <View style={[styles.searchPanel, panelOverride]}>
          <View style={[styles.searchBar, light && { backgroundColor: "#fdf8ef", borderColor: pal.panelBorder }]}>
            <MaterialIcons name="search" size={18} color={pal.placeholder} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search titles, creators, vibes"
              placeholderTextColor={pal.placeholder}
              style={[styles.searchInput, { color: pal.input }]}
            />
          </View>
          <View style={styles.sortRow}>
            {SORT_CHIPS.map((chip) => (
              <EdPressable
                key={chip}
                accessibilityRole="button"
                accessibilityLabel={`Sort by ${chip}`}
                onPress={() => setSort(chip)}
              >
                <View style={[styles.sortChip, light && { backgroundColor: "#fdf8ef", borderColor: pal.panelBorder }, sort === chip && styles.sortChipActive]}>
                  <Text style={[styles.sortChipText, light && { color: pal.chipText }, sort === chip && styles.sortChipTextActive]}>{chip}</Text>
                </View>
              </EdPressable>
            ))}
          </View>
        </View>

        {/* Board cards */}
        {boardsQuery.isLoading ? (
          <PremiumSkeleton compact label="Loading Soundboards..." />
        ) : filtered.length ? (
          <View style={{ gap: 16 }}>
            {filtered.map((board) => {
              const creator = creatorFor(board.creator_id);
              const creatorName = creator ? creator.full_name || creator.username || 'Creator' : 'Creator';
              return (
                <EdPressable
                  key={board.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${board.title || 'soundboard'}`}
                  onPress={() => router.push(`/soundboards/${board.slug || board.id}` as any)}
                >
                  <View style={[styles.boardCard, panelOverride]}>
                    <View style={styles.boardCoverWrap}>
                      {board.cover_image_url ? (
                        <PluggdImage uri={board.cover_image_url} style={styles.boardCover} />
                      ) : (
                        <LinearGradient colors={['#2b1c10', '#171009']} style={styles.boardCover} />
                      )}
                      <View style={styles.boardPill}>
                        <Text style={styles.boardPillText}>Soundboard</Text>
                      </View>
                    </View>
                    <View style={styles.boardBody}>
                      <Text style={[styles.boardTitle, { color: pal.title }]} numberOfLines={1}>{board.title || 'Untitled board'}</Text>
                      {board.description ? (
                        <Text style={[styles.boardDescription, { color: pal.body }]} numberOfLines={1}>{board.description}</Text>
                      ) : null}
                      <View style={styles.boardMetaRow}>
                        <MaterialIcons name="event" size={13} color={pal.body} />
                        <Text style={[styles.boardMeta, { color: pal.body }]}>{boardDate(board)}</Text>
                        <View style={{ flex: 1 }} />
                        <MaterialIcons name="layers" size={13.5} color={pal.stat} />
                        <Text style={[styles.boardStat, { color: pal.stat }]}>{formatCompact(board.item_count)}</Text>
                        <MaterialIcons name="favorite-border" size={13.5} color={pal.stat} />
                        <Text style={[styles.boardStat, { color: pal.stat }]}>{formatCompact(board.like_count)}</Text>
                        <MaterialIcons name="chat-bubble-outline" size={12.5} color={pal.stat} />
                        <Text style={[styles.boardStat, { color: pal.stat }]}>{formatCompact(board.comment_count)}</Text>
                      </View>
                      <View style={styles.creatorRow}>
                        <View style={[styles.creatorAvatar, { backgroundColor: pal.avatarFallback }]}>
                          {creator?.avatar_url ? (
                            <PluggdImage uri={creator.avatar_url} style={{ width: '100%', height: '100%' }} />
                          ) : (
                            <Text style={[styles.creatorInitials, light && { color: ed.ink }]}>
                              {creatorName.slice(0, 2).toUpperCase()}
                            </Text>
                          )}
                        </View>
                        <Text style={[styles.creatorName, light && { color: pal.stat }]} numberOfLines={1}>{creatorName}</Text>
                      </View>
                    </View>
                  </View>
                </EdPressable>
              );
            })}
          </View>
        ) : (
          <View style={[styles.emptyPanel, panelOverride]}>
            <Text style={[styles.emptyText, { color: pal.body }]}>
              No public Soundboards match this search yet. Boards land here as creators publish their process in public.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0d0705' },

  coreRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  newCorePill: {
    borderRadius: 999,
    backgroundColor: ed.orange,
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
  newCoreText: { fontFamily: edFonts.bodyBlack, fontSize: 11, letterSpacing: 1, color: '#ffffff' },
  sketchPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,248,237,0.2)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
  sketchText: { fontFamily: edFonts.bodyBold, fontSize: 12, color: 'rgba(255,248,237,0.8)' },

  headPanel: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,248,237,0.1)',
    backgroundColor: 'rgba(28,17,9,0.55)',
    padding: 18,
    gap: 7,
  },
  headEyebrow: { fontFamily: edFonts.bodyBlack, fontSize: 11.5, letterSpacing: 1.6, color: ed.orange },
  headTitle: { fontFamily: edFonts.bodyBlack, fontSize: 25, lineHeight: 30, color: '#ffffff' },
  headSub: { fontFamily: edFonts.bodyMedium, fontSize: 13, lineHeight: 19, color: 'rgba(255,248,237,0.55)' },

  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionGhost: {
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,248,237,0.18)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionGhostText: { fontFamily: edFonts.bodyBold, fontSize: 13.5, color: ed.cream },

  searchPanel: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,248,237,0.1)',
    backgroundColor: 'rgba(24,14,8,0.5)',
    padding: 14,
    gap: 12,
  },
  searchBar: {
    minHeight: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,248,237,0.14)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 12,
  },
  searchInput: { flex: 1, fontFamily: edFonts.bodyMedium, fontSize: 13.5, color: ed.cream, paddingVertical: 0 },
  sortRow: { flexDirection: 'row', gap: 8 },
  sortChip: {
    minHeight: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,248,237,0.16)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortChipActive: { backgroundColor: ed.orange, borderColor: ed.orange },
  sortChipText: { fontFamily: edFonts.bodyBold, fontSize: 12.5, color: ed.cream },
  sortChipTextActive: { color: '#ffffff' },

  boardCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,248,237,0.1)',
    backgroundColor: 'rgba(24,14,8,0.55)',
    overflow: 'hidden',
  },
  boardCoverWrap: { height: 250 },
  boardCover: { width: '100%', height: '100%' },
  boardPill: {
    position: 'absolute',
    top: 12,
    left: 12,
    borderRadius: 999,
    backgroundColor: ed.orange,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  boardPillText: { fontFamily: edFonts.bodyBold, fontSize: 11.5, color: '#ffffff' },
  boardBody: { padding: 14, gap: 5 },
  boardTitle: { fontFamily: edFonts.bodyBold, fontSize: 16.5, color: '#ffffff' },
  boardDescription: { fontFamily: edFonts.bodyMedium, fontSize: 13, color: 'rgba(255,248,237,0.62)' },
  boardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  boardMeta: { fontFamily: edFonts.bodyMedium, fontSize: 11.5, color: 'rgba(255,248,237,0.55)' },
  boardStat: { fontFamily: edFonts.bodyMedium, fontSize: 11.5, color: 'rgba(255,248,237,0.68)', marginRight: 7 },
  creatorRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  creatorAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#2b1c10',
    alignItems: 'center',
    justifyContent: 'center',
  },
  creatorInitials: { fontFamily: edFonts.bodyBlack, fontSize: 10, color: ed.cream },
  creatorName: { fontFamily: edFonts.bodyBold, fontSize: 12.5, color: 'rgba(255,248,237,0.85)' },

  emptyPanel: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,248,237,0.14)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: 18,
  },
  emptyText: { fontFamily: edFonts.bodyMedium, fontSize: 13.5, lineHeight: 19, color: 'rgba(255,248,237,0.66)' },
});
