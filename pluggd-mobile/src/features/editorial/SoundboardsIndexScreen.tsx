/**
 * Soundboards — selected mobile creator-sketchbook system:
 * "NEW CORE / Creator Sketchbooks" chips, "Ideas grow in public."
 * header, Browse Releases shortcut, search, Updated/Trending/Featured
 * chips, and the dense board cards (cover with Soundboard pill, title,
 * description, date, cards/plays/likes/comments stats, creator row).
 */
import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { PremiumSkeleton } from '../../components/PremiumSkeleton';
import { ed, edFonts } from '../../design/editorial';
import { useBottomChromeInset } from '../../design/useBottomChromeInset';
import { usePluggdTheme } from '../../design/usePluggdTheme';
import { useAuth } from '../../context/AuthProvider';
import { safeList } from '../culture/mobileServices';
import { loadPublicCreatorIdentityMap } from '../culture/publicCreatorIdentity';
import { supabase } from '../../lib/supabase';
import { formatCompact, formatDate, type SoundboardItem } from '../../lib/mobileContent';
import { Enter, EdPressable } from './EditorialBits';
import { DiscoveryHeader } from '../discovery/DiscoveryHeader';
import { NativeSoundboardCanvas } from '../soundboards/NativeSoundboardCanvas';
import type { NativeSoundboardItem } from '../soundboards/nativeSoundboardLayout';

const SORT_CHIPS = ['Updated', 'Trending', 'Featured'] as const;

function boardDate(board: SoundboardItem) {
  const value = board.last_activity_at || board.created_at;
  if (!value) return 'Recently updated';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently updated';
  return date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function SoundboardsIndexScreen() {
  const { width: viewportWidth } = useWindowDimensions();
  const bottomInset = useBottomChromeInset();
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
          .select('id,creator_id,slug,title,description,cover_image_url,metadata,item_count,like_count,comment_count,follower_count,last_activity_at,created_at')
          .eq('is_published', true)
          .in('visibility', ['public', 'link'])
          .order('last_activity_at', { ascending: false })
          .limit(16),
      ),
    staleTime: 1000 * 60 * 2,
  });

  const boards = useMemo(() => boardsQuery.data ?? [], [boardsQuery.data]);
  const boardIds = useMemo(() => boards.map((board) => board.id), [boards]);
  const previewItemsQuery = useQuery({
    queryKey: ['soundboards-index', 'canvas-items', boardIds.join(':')],
    enabled: boardIds.length > 0,
    queryFn: () =>
      safeList<NativeSoundboardItem>(
        (supabase as any)
          .from('soundboard_items')
          .select('*')
          .in('soundboard_id', boardIds)
          .order('is_pinned', { ascending: false })
          .order('position', { ascending: true })
          .limit(Math.max(48, boardIds.length * 9)),
      ),
    staleTime: 1000 * 60 * 2,
  });
  const previewItemsByBoard = useMemo(() => (previewItemsQuery.data ?? []).reduce<Record<string, NativeSoundboardItem[]>>((groups, item) => {
    groups[item.soundboard_id] = [...(groups[item.soundboard_id] || []), item];
    return groups;
  }, {}), [previewItemsQuery.data]);

  const creatorIds = useMemo(
    () => Array.from(new Set(boards.map((board) => board.creator_id).filter(Boolean))) as string[],
    [boards],
  );
  const profilesQuery = useQuery({
    queryKey: ['soundboards-index', 'creators', creatorIds.join(':')],
    enabled: creatorIds.length > 0,
    queryFn: () => loadPublicCreatorIdentityMap(creatorIds),
    staleTime: 1000 * 60 * 5,
  });

  const creatorFor = (creatorId?: string | null) => {
    if (!creatorId) return null;
    return profilesQuery.data?.get(creatorId) ?? null;
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
    void previewItemsQuery.refetch();
  };

  return (
    <View style={[styles.screen, { backgroundColor: pal.screen }]}>
      <StatusBar style={light ? 'dark' : 'light'} translucent />
      <DiscoveryHeader backToDiscovery />
      <ScrollView
        style={[styles.screen, { backgroundColor: pal.screen }]}
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={ed.orange} />}
        contentContainerStyle={{
          paddingTop: 4,
          paddingBottom: bottomInset,
          paddingHorizontal: 20,
          gap: 18,
        }}
      >
        <Enter delay={80}>
        <View style={styles.introRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headEyebrow}>CREATOR SKETCHBOOKS</Text>
            <Text style={[styles.headTitle, { color: pal.title }]}>Soundboards</Text>
            <Text style={[styles.headSub, { color: pal.body }]}>Ideas grow in public. Demos, references, voice notes and unfinished worlds.</Text>
          </View>
          <View style={styles.boardMark}><MaterialIcons name="dashboard-customize" size={23} color={ed.orange} /></View>
        </View>
        </Enter>

        <View style={styles.actionRow}>
          <EdPressable
            haptic="impact"
            accessibilityRole="button"
            accessibilityLabel={user ? 'Manage your Soundboards' : 'Open Creator Studio'}
            onPress={() => router.push((user ? '/studio/catalog?tab=soundboards' : '/auth/login?redirect=%2Fstudio%2Fcatalog%3Ftab%3Dsoundboards') as any)}
            style={{ flex: 1 }}
          >
            <View style={styles.studioPrimary}>
              <MaterialIcons name="add" size={19} color="#fff" />
              <Text style={styles.studioPrimaryText}>{user ? 'Manage your boards' : 'Open Creator Studio'}</Text>
            </View>
          </EdPressable>
          <EdPressable
            accessibilityRole="button"
            accessibilityLabel={user ? 'Create a new Soundboard' : 'Open collections'}
            onPress={() => router.push((user ? '/studio/soundboards/new' : '/library') as any)}
          >
            <View style={styles.collectionButton}>
              <MaterialIcons name={user ? 'add-box' : 'bookmarks'} size={18} color={pal.chipText} />
              <Text style={[styles.collectionButtonText, { color: pal.chipText }]}>{user ? 'New board' : 'Collections'}</Text>
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

        {/* The real canvas is the product: each board begins with its saved items, not a generic cover card. */}
        {boardsQuery.isLoading ? (
          <PremiumSkeleton compact label="Loading Soundboards..." />
        ) : filtered.length ? (
          <View style={styles.canvasList}>
            {filtered.map((board) => {
                  const creator = creatorFor(board.creator_id);
                  // profiles is unreadable for signed-out readers (RLS allows
                  // SELECT only when auth.uid() is not null), so the lookup
                  // returns nothing and every card used to print the literal
                  // word "Creator". Show the real name when we have it, and the
                  // board's own activity when we don't, rather than a
                  // placeholder that reads like a missing name.
                  const creatorName = creator?.full_name || (creator?.username ? `@${creator.username}` : null);
                  return (
                    <EdPressable key={board.id} accessibilityRole="button" accessibilityLabel={`Open ${board.title || 'soundboard'} canvas`} onPress={() => router.push(`/soundboards/${board.slug || board.id}` as any)} style={styles.canvasCardPressable}>
                      <View style={[styles.canvasCard, panelOverride]}>
                        <View pointerEvents="none" style={styles.canvasPreviewWrap}>
                          <NativeSoundboardCanvas
                            items={previewItemsByBoard[board.id] || []}
                            boardMetadata={(board as any).metadata || null}
                            boardArtwork={board.cover_image_url}
                            width={Math.max(280, viewportWidth - 42)}
                            height={210}
                            mode="preview"
                          />
                          <View style={styles.boardTileBadge}><Text style={styles.boardTileBadgeText}>{formatCompact(board.item_count)} PIECES</Text></View>
                        </View>
                        <View style={styles.canvasCardMeta}>
                          <View style={styles.canvasCardCopy}>
                            <Text style={[styles.canvasCardTitle, { color: pal.title }]} numberOfLines={2}>{board.title || 'Untitled board'}</Text>
                            <Text style={[styles.canvasCardCreator, { color: pal.body }]} numberOfLines={1}>{creatorName ? `${creatorName} · ` : ''}{boardDate(board)}</Text>
                          </View>
                          <View style={styles.canvasCardOpen}><MaterialIcons name="arrow-forward" size={18} color="#fff" /></View>
                        </View>
                        <View style={styles.canvasCardStats}>
                          <View style={styles.canvasStat}><MaterialIcons name="headphones" size={15} color={pal.stat} /><Text style={[styles.canvasStatText, { color: pal.stat }]}>{formatCompact((previewItemsByBoard[board.id] || []).reduce((sum, item) => sum + Number(item.plays_count || 0), 0))}</Text></View>
                          <View style={styles.canvasStat}><MaterialIcons name="favorite-border" size={15} color={pal.stat} /><Text style={[styles.canvasStatText, { color: pal.stat }]}>{formatCompact(board.like_count)}</Text></View>
                          <View style={styles.canvasStat}><MaterialIcons name="chat-bubble-outline" size={14} color={pal.stat} /><Text style={[styles.canvasStatText, { color: pal.stat }]}>{formatCompact(board.comment_count)}</Text></View>
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

        <View style={styles.footerActions}>
          {!user ? <EdPressable accessibilityRole="button" accessibilityLabel="Sign in" onPress={() => router.push('/auth/login' as any)}><View style={styles.actionGhost}><Text style={styles.actionGhostText}>Sign in to follow boards</Text></View></EdPressable> : null}
          <EdPressable accessibilityRole="button" accessibilityLabel="Browse Releases" onPress={() => router.push('/releases' as any)}><View style={styles.actionGhost}><MaterialIcons name="music-note" size={15} color={pal.chipText} /><Text style={[styles.actionGhostText, { color: pal.chipText }]}>Browse Releases</Text></View></EdPressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0d0705' },
  introRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  boardMark: { width: 46, height: 46, borderRadius: 23, borderWidth: 1, borderColor: 'rgba(255,248,237,0.2)', alignItems: 'center', justifyContent: 'center', marginTop: 8 },

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
  headTitle: { fontFamily: 'Sora-ExtraBold', fontSize: 32, lineHeight: 36, letterSpacing: -1.1, color: '#ffffff', marginTop: 3 },
  headSub: { fontFamily: edFonts.bodyMedium, fontSize: 13, lineHeight: 19, color: 'rgba(255,248,237,0.55)' },

  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  studioPrimary: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: '#7C3AED',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  studioPrimaryText: { fontFamily: edFonts.bodyBlack, fontSize: 12.5, color: '#fff' },
  collectionButton: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,248,237,0.18)',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  collectionButtonText: { fontFamily: edFonts.bodyBold, fontSize: 12 },
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
    borderRadius: 6,
    borderWidth: 0,
    backgroundColor: 'transparent',
    padding: 0,
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
    minHeight: 44,
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

  boardGrid: { gap: 18 },
  boardGridRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  boardTilePressable: { width: '48.3%' },
  boardTile: { width: '100%', minWidth: 0 },
  boardTileCoverWrap: { height: 146, borderRadius: 5, overflow: 'hidden', backgroundColor: '#21170f' },
  boardTileCover: { width: '100%', height: '100%' },
  boardTileBadge: { position: 'absolute', left: 8, top: 8, backgroundColor: 'rgba(10,9,8,0.82)', paddingHorizontal: 7, paddingVertical: 5, borderRadius: 3 },
  boardTileBadgeText: { fontFamily: edFonts.bodyBlack, fontSize: 8, letterSpacing: 0.9, color: ed.orange },
  boardTileTitle: { fontFamily: 'Sora-Bold', fontSize: 13.5, lineHeight: 17, marginTop: 8 },
  boardTileCreator: { fontFamily: edFonts.bodyMedium, fontSize: 10.5, marginTop: 3 },
  boardTileStats: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 7 },
  boardTileStat: { fontFamily: edFonts.bodyMedium, fontSize: 10, marginRight: 6 },
  canvasList: { gap: 18 },
  canvasCardPressable: { width: '100%' },
  canvasCard: { width: '100%', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,248,237,0.12)', backgroundColor: 'rgba(24,20,29,0.76)', overflow: 'hidden', padding: 1 },
  canvasPreviewWrap: { position: 'relative' },
  canvasCardMeta: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 13, paddingTop: 12 },
  canvasCardCopy: { flex: 1, minWidth: 0 },
  canvasCardTitle: { fontFamily: 'Sora-Bold', fontSize: 18, lineHeight: 22 },
  canvasCardCreator: { fontFamily: edFonts.bodyMedium, fontSize: 11.5, marginTop: 3 },
  canvasCardOpen: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center' },
  canvasCardStats: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 13, paddingTop: 10, paddingBottom: 13 },
  canvasStat: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  canvasStatText: { fontFamily: edFonts.bodyBold, fontSize: 11 },
  footerActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },

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
