import { MaterialIcons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlayback } from '../../context/PlaybackProvider';
import { useBottomChromeInset } from '../../design/useBottomChromeInset';
import { impactHaptic, selectionHaptic } from '../../design/haptics';
import { pluggdFonts } from '../../design/typography';
import { usePluggdTheme } from '../../design/usePluggdTheme';
import { WEB_PARITY_ASSETS } from '../parity/webAssets';
import {
  loadBattleDetail,
  loadBattleSummaries,
  submitBattleEntry,
  submitBattleVote,
  type BattleAudioAsset,
  type BattleEntry,
  type BattleMatchup,
  type BattleStatus,
  type BattleSummary,
} from './battleService';

function formatMoney(cents?: number | null) {
  if (!cents) return 'Free entry';
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(cents / 100);
}

function formatPrize(cents?: number | null) {
  if (!cents) return 'Community crown';
  return `${new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(cents / 100)} prize`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function timingLabel(battle: BattleSummary) {
  const target = battle.status === 'upcoming' ? new Date(battle.starts_at).getTime() : new Date(battle.ends_at).getTime();
  if (!Number.isFinite(target)) return battle.status === 'finished' ? 'Results ready' : 'Schedule TBA';
  const difference = target - Date.now();
  if (battle.status === 'finished' || difference <= 0) return battle.status === 'upcoming' ? 'Starting soon' : 'Results ready';
  const minutes = Math.max(1, Math.floor(difference / 60_000));
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  if (days > 0) return `${battle.status === 'upcoming' ? 'Starts' : 'Ends'} in ${days}d ${hours}h`;
  if (hours > 0) return `${battle.status === 'upcoming' ? 'Starts' : 'Ends'} in ${hours}h ${minutes % 60}m`;
  return `${battle.status === 'upcoming' ? 'Starts' : 'Ends'} in ${minutes}m`;
}

function statusCopy(status: BattleStatus) {
  if (status === 'live') return 'LIVE BATTLE';
  if (status === 'finished') return 'FINAL RESULT';
  return 'ENTRIES OPEN';
}

function BattleMark({ size = 56 }: { size?: number }) {
  const theme = usePluggdTheme();
  return (
    <View style={[styles.battleMark, { width: size, height: size, borderRadius: size / 2, backgroundColor: theme.colors.accentSoft, borderColor: theme.colors.accent }]}>
      <MaterialIcons name="emoji-events" size={Math.round(size * 0.52)} color={theme.colors.accentText} />
    </View>
  );
}

function SectionHeading({ kicker, title, aside }: { kicker: string; title: string; aside?: string }) {
  const theme = usePluggdTheme();
  return (
    <View style={styles.sectionHeading}>
      <View style={styles.sectionHeadingCopy}>
        <Text style={[styles.kicker, { color: theme.colors.accentText }]}>{kicker}</Text>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{title}</Text>
      </View>
      {aside ? <Text style={[styles.sectionAside, { color: theme.colors.textMuted }]}>{aside}</Text> : null}
    </View>
  );
}

function ArenaFormatStrip() {
  const theme = usePluggdTheme();
  const steps = [
    { icon: 'library-music' as const, label: 'ENTER', value: 'Lock in a track' },
    { icon: 'account-tree' as const, label: 'MATCH UP', value: 'Head-to-head rounds' },
    { icon: 'how-to-vote' as const, label: 'DECIDE', value: 'The crowd votes' },
  ];
  return (
    <View style={[styles.formatStrip, { backgroundColor: theme.colors.surfaceStrong, borderColor: theme.colors.border }]}>
      {steps.map((step, index) => (
        <View key={step.label} style={[styles.formatStep, index > 0 && { borderLeftColor: theme.colors.divider }]}>
          <MaterialIcons name={step.icon} size={20} color={theme.colors.accentText} />
          <Text style={[styles.formatLabel, { color: theme.colors.textMuted }]}>{step.label}</Text>
          <Text style={[styles.formatValue, { color: theme.colors.text }]}>{step.value}</Text>
        </View>
      ))}
    </View>
  );
}

function ArenaHero({ battle, retry, onOpen }: { battle?: BattleSummary; retry: () => void; onOpen: () => void }) {
  return (
    <View style={styles.arenaHero}>
      <Image source={WEB_PARITY_ASSETS.intimateCrowdHero} resizeMode="cover" style={StyleSheet.absoluteFill} />
      <LinearGradient colors={['rgba(5,4,3,0.22)', 'rgba(5,4,3,0.70)', 'rgba(5,4,3,0.97)']} locations={[0, 0.46, 1]} style={StyleSheet.absoluteFill} />
      <View style={styles.arenaHeroTopRow}>
        <View style={styles.arenaHeroPill}>
          <MaterialIcons name="emoji-events" size={15} color="#FF7A1A" />
          <Text style={styles.arenaHeroPillText}>PLUGGD BATTLES</Text>
        </View>
        <View style={[styles.arenaHeroState, battle?.status === 'live' && styles.arenaHeroStateLive]}>
          {battle?.status === 'live' ? <View style={styles.liveDot} /> : null}
          <Text style={styles.arenaHeroStateText}>{battle ? statusCopy(battle.status) : 'BETWEEN ROUNDS'}</Text>
        </View>
      </View>
      <View style={styles.arenaHeroCopy}>
        <Text style={styles.arenaHeroTitle} numberOfLines={battle ? 2 : 1}>{battle?.title || 'Battle Arena'}</Text>
        <Text style={styles.arenaHeroBody} numberOfLines={2}>
          {battle ? `${timingLabel(battle)} · ${formatDate(battle.ends_at)}` : 'Tracks enter. Matchups go live. The crowd decides.'}
        </Text>
      </View>
      <View style={styles.arenaHeroFooter}>
        <View style={styles.arenaHeroMetrics}>
          <View>
            <Text style={styles.arenaHeroMetricLabel}>{battle ? 'ENTRIES' : 'FORMAT'}</Text>
            <Text style={styles.arenaHeroMetricValue}>{battle ? battle.entryCount : 'Knockout'}</Text>
          </View>
          <View>
            <Text style={styles.arenaHeroMetricLabel}>{battle ? 'PRIZE' : 'VOTING'}</Text>
            <Text style={styles.arenaHeroMetricValue}>{battle ? formatPrize(battle.prize_pool_cents) : 'Live crowd'}</Text>
          </View>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={battle ? `Open ${battle.title}` : 'Refresh Battle Arena'} onPress={battle ? onOpen : retry} style={({ pressed }) => [styles.arenaHeroAction, pressed && styles.pressed]}>
          <Text style={styles.arenaHeroActionText}>{battle ? (battle.status === 'live' ? 'Watch & vote' : 'Open battle') : 'Check schedule'}</Text>
          <MaterialIcons name={battle ? 'arrow-forward' : 'refresh'} size={19} color="#FFFFFF" style={styles.arenaHeroActionIcon} />
        </Pressable>
      </View>
    </View>
  );
}

function EmptyState({ retry, back }: { retry: () => void; back: () => void }) {
  const theme = usePluggdTheme();
  return (
    <View style={styles.emptySection}>
      <View style={styles.emptyHeadingRow}>
        <View>
          <Text style={[styles.kicker, { color: theme.colors.accentText }]}>THE NEXT DRAW</Text>
          <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No active rounds</Text>
        </View>
        <View style={[styles.emptyStatusMark, { backgroundColor: theme.colors.surfaceStrong, borderColor: theme.colors.border }]}>
          <MaterialIcons name="schedule" size={23} color={theme.colors.textMuted} />
        </View>
      </View>
      <Text style={[styles.emptyBody, { color: theme.colors.textSecondary }]}>When the next battle is scheduled, its entry window, bracket and live vote will appear here.</Text>
      <ArenaFormatStrip />
      <View style={styles.emptyActions}>
        <Pressable accessibilityRole="button" onPress={retry} style={[styles.emptyPrimaryAction, { backgroundColor: theme.colors.text }]}>
          <MaterialIcons name="refresh" size={18} color={theme.colors.background} />
          <Text style={[styles.emptyPrimaryActionText, { color: theme.colors.background }]}>Check schedule</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={back} style={[styles.emptySecondaryAction, { borderColor: theme.colors.borderStrong }]}>
          <Text style={[styles.emptySecondaryActionText, { color: theme.colors.text }]}>Back to Live</Text>
        </Pressable>
      </View>
    </View>
  );
}

function BattleCard({ battle, onPress }: { battle: BattleSummary; onPress: () => void }) {
  const theme = usePluggdTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${battle.title}. ${statusCopy(battle.status)}. ${timingLabel(battle)}`}
      onPress={onPress}
      style={({ pressed }) => [styles.battleCard, { backgroundColor: theme.colors.surfaceStrong, borderColor: theme.colors.border }, pressed && styles.pressed]}
    >
      <View style={styles.cardTopRow}>
        <View style={[styles.statusPill, { backgroundColor: battle.status === 'live' ? theme.colors.live : theme.colors.accentSoft }]}>
          {battle.status === 'live' ? <View style={styles.liveDot} /> : null}
          <Text style={[styles.statusPillText, { color: battle.status === 'live' ? '#FFFFFF' : theme.colors.accentText }]}>{statusCopy(battle.status)}</Text>
        </View>
        {battle.is_featured ? <MaterialIcons name="star" size={20} color={theme.colors.accentText} /> : <BattleMark size={38} />}
      </View>
      <Text style={[styles.cardTitle, { color: theme.colors.text }]} numberOfLines={2}>{battle.title}</Text>
      <Text style={[styles.cardTiming, { color: theme.colors.textSecondary }]}>{timingLabel(battle)}</Text>
      <View style={[styles.cardRule, { backgroundColor: theme.colors.divider }]} />
      <View style={styles.cardMetaRow}>
        <View><Text style={[styles.metaLabel, { color: theme.colors.textMuted }]}>ENTRIES</Text><Text style={[styles.metaValue, { color: theme.colors.text }]}>{battle.entryCount}</Text></View>
        <View><Text style={[styles.metaLabel, { color: theme.colors.textMuted }]}>PRIZE</Text><Text style={[styles.metaValue, { color: theme.colors.text }]}>{formatPrize(battle.prize_pool_cents)}</Text></View>
        <View style={[styles.cardArrow, { backgroundColor: theme.colors.accentSoft }]}><MaterialIcons name="arrow-forward" size={20} color={theme.colors.accentText} /></View>
      </View>
    </Pressable>
  );
}

export function BattleArenaScreen() {
  const router = useRouter();
  const theme = usePluggdTheme();
  const insets = useSafeAreaInsets();
  const bottomPadding = useBottomChromeInset();
  const battlesQuery = useQuery({ queryKey: ['live', 'battles'], queryFn: loadBattleSummaries, staleTime: 20_000 });
  const battles = battlesQuery.data ?? [];
  const featured = battles.find((battle) => battle.is_featured && battle.status !== 'finished')
    ?? battles.find((battle) => battle.status === 'live')
    ?? battles.find((battle) => battle.status === 'upcoming');
  const live = battles.filter((battle) => battle.status === 'live' && battle.id !== featured?.id);
  const upcoming = battles.filter((battle) => battle.status === 'upcoming' && battle.id !== featured?.id);
  const finished = battles.filter((battle) => battle.status === 'finished').slice(0, 8);
  const open = (battle: BattleSummary) => {
    selectionHaptic();
    router.push(`/live/battles/${battle.id}` as any);
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={battlesQuery.isRefetching} onRefresh={() => void battlesQuery.refetch()} tintColor={theme.colors.accentText} />}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 82, paddingBottom: bottomPadding }]}
      >
        <Pressable accessibilityRole="button" accessibilityLabel="Back to Live" onPress={() => router.replace('/live' as any)} style={styles.returnRow}>
          <MaterialIcons name="arrow-back" size={21} color={theme.colors.text} />
          <Text style={[styles.returnText, { color: theme.colors.text }]}>LIVE</Text>
        </Pressable>

        {battlesQuery.isLoading ? <ActivityIndicator size="large" color={theme.colors.accentText} style={styles.loader} /> : null}
        {battlesQuery.isError ? (
          <View style={[styles.errorCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[styles.errorTitle, { color: theme.colors.text }]}>The arena could not load.</Text>
            <Text style={[styles.errorBody, { color: theme.colors.textSecondary }]}>Check your connection and try again.</Text>
            <Pressable accessibilityRole="button" onPress={() => void battlesQuery.refetch()} style={[styles.outlineButton, { borderColor: theme.colors.borderStrong }]}><Text style={[styles.outlineButtonText, { color: theme.colors.text }]}>Try again</Text></Pressable>
          </View>
        ) : null}

        {!battlesQuery.isLoading && !battlesQuery.isError ? <ArenaHero battle={featured} retry={() => void battlesQuery.refetch()} onOpen={() => featured && open(featured)} /> : null}

        {!battlesQuery.isLoading && !battlesQuery.isError && battles.length === 0 ? <EmptyState retry={() => void battlesQuery.refetch()} back={() => router.replace('/live' as any)} /> : null}

        {live.length ? <View style={styles.section}><SectionHeading kicker="HAPPENING NOW" title="Live battles" aside={`${live.length}`} /><View style={styles.cardList}>{live.map((battle) => <BattleCard key={battle.id} battle={battle} onPress={() => open(battle)} />)}</View></View> : null}
        {upcoming.length ? <View style={styles.section}><SectionHeading kicker="LOCK IN" title="Upcoming battles" aside={`${upcoming.length}`} /><View style={styles.cardList}>{upcoming.map((battle) => <BattleCard key={battle.id} battle={battle} onPress={() => open(battle)} />)}</View></View> : null}
        {finished.length ? <View style={styles.section}><SectionHeading kicker="THE TAPE" title="Recent results" /><View style={styles.cardList}>{finished.map((battle) => <BattleCard key={battle.id} battle={battle} onPress={() => open(battle)} />)}</View></View> : null}
      </ScrollView>
    </View>
  );
}

function EntryModal({ battleId, visible, onClose, onSaved }: { battleId: string; visible: boolean; onClose: () => void; onSaved: () => void }) {
  const theme = usePluggdTheme();
  const [title, setTitle] = useState('');
  const [audio, setAudio] = useState<BattleAudioAsset | null>(null);
  const mutation = useMutation({
    mutationFn: () => submitBattleEntry({ battleId, title, audio: audio as BattleAudioAsset }),
    onSuccess: () => {
      impactHaptic();
      setTitle('');
      setAudio(null);
      onSaved();
      onClose();
      Alert.alert('Entry locked in', 'Your track is now in the arena.');
    },
    onError: (error) => Alert.alert('Entry not submitted', error instanceof Error ? error.message : 'Please try again.'),
  });
  const pick = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: ['audio/*', 'audio/mpeg', 'audio/wav', 'audio/mp4'], copyToCacheDirectory: true, multiple: false });
    if (result.canceled || !result.assets[0]?.uri) return;
    const asset = result.assets[0];
    setAudio({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType || 'audio/mpeg', size: asset.size });
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.modalScreen, { backgroundColor: theme.colors.background }]}>
        <View style={styles.modalHeader}>
          <Pressable accessibilityRole="button" accessibilityLabel="Cancel entry" onPress={onClose} style={styles.modalHeaderButton}><Text style={[styles.modalHeaderButtonText, { color: theme.colors.textSecondary }]}>Cancel</Text></Pressable>
          <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Enter Battle</Text>
          <View style={styles.modalHeaderButton} />
        </View>
        <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
          <View style={styles.modalIntro}><BattleMark size={72} /><Text style={[styles.modalHeroTitle, { color: theme.colors.text }]}>Bring your strongest track.</Text><Text style={[styles.modalBody, { color: theme.colors.textSecondary }]}>One entry per artist. Your title and audio are public when the entry is accepted.</Text></View>
          <Text style={[styles.fieldLabel, { color: theme.colors.textMuted }]}>ENTRY TITLE</Text>
          <TextInput value={title} onChangeText={setTitle} placeholder="Track title" placeholderTextColor={theme.colors.textSubtle} maxLength={120} style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.borderStrong, backgroundColor: theme.colors.surfaceStrong }]} />
          <Text style={[styles.fieldLabel, { color: theme.colors.textMuted }]}>AUDIO</Text>
          <Pressable accessibilityRole="button" onPress={() => void pick()} style={[styles.audioPicker, { borderColor: audio ? theme.colors.accent : theme.colors.borderStrong, backgroundColor: theme.colors.surfaceStrong }]}>
            <View style={[styles.audioPickerIcon, { backgroundColor: theme.colors.accentSoft }]}><MaterialIcons name={audio ? 'graphic-eq' : 'upload-file'} size={25} color={theme.colors.accentText} /></View>
            <View style={styles.audioPickerCopy}><Text style={[styles.audioPickerTitle, { color: theme.colors.text }]} numberOfLines={1}>{audio?.name || 'Choose audio file'}</Text><Text style={[styles.audioPickerBody, { color: theme.colors.textMuted }]}>{audio ? 'Tap to replace' : 'MP3, WAV or M4A'}</Text></View>
            <MaterialIcons name="chevron-right" size={22} color={theme.colors.textMuted} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityState={{ disabled: mutation.isPending || !title.trim() || !audio }} disabled={mutation.isPending || !title.trim() || !audio} onPress={() => mutation.mutate()} style={[styles.primaryButton, { backgroundColor: theme.colors.accentFill }, (mutation.isPending || !title.trim() || !audio) && styles.disabled]}>
            {mutation.isPending ? <ActivityIndicator color={theme.colors.onAccent} /> : <><Text style={[styles.primaryButtonText, { color: theme.colors.onAccent }]}>Submit your track</Text><MaterialIcons name="arrow-forward" size={22} color={theme.colors.onAccent} /></>}
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

function EntryIdentity({ entry }: { entry: BattleEntry }) {
  const theme = usePluggdTheme();
  const initial = entry.creatorName.trim().charAt(0).toUpperCase() || 'P';
  return (
    <View style={styles.entryIdentity}>
      <View style={[styles.entryAvatar, { backgroundColor: theme.colors.accentSoft, borderColor: theme.colors.borderStrong }]}><Text style={[styles.entryAvatarText, { color: theme.colors.accentText }]}>{initial}</Text></View>
      <View style={styles.entryIdentityCopy}><Text style={[styles.entryTitle, { color: theme.colors.text }]} numberOfLines={1}>{entry.title}</Text><Text style={[styles.entryCreator, { color: theme.colors.textMuted }]} numberOfLines={1}>{entry.creatorName}</Text></View>
    </View>
  );
}

function MatchupCard({ matchup, canVote, play, vote, votePending }: { matchup: BattleMatchup; canVote: boolean; play: (entry: BattleEntry) => void; vote: (entryId: string) => void; votePending: boolean }) {
  const theme = usePluggdTheme();
  const total = matchup.voteCountA + matchup.voteCountB;
  const renderEntry = (entry: BattleEntry | null, votes: number) => {
    if (!entry) return <View style={[styles.matchupEntry, { borderColor: theme.colors.border }]}><Text style={[styles.entryCreator, { color: theme.colors.textMuted }]}>Entry unavailable</Text></View>;
    const selected = matchup.viewerVoteEntryId === entry.id;
    const winner = matchup.winner_entry_id === entry.id;
    return (
      <View style={[styles.matchupEntry, { borderColor: winner ? theme.colors.accent : theme.colors.border, backgroundColor: selected ? theme.colors.accentSoft : theme.colors.surfaceStrong }]}>
        <EntryIdentity entry={entry} />
        <View style={styles.matchupActions}>
          <Pressable accessibilityRole="button" accessibilityLabel={`Play ${entry.title}`} onPress={() => play(entry)} style={[styles.playButton, { borderColor: theme.colors.borderStrong }]}><MaterialIcons name="play-arrow" size={20} color={theme.colors.text} /></Pressable>
          {canVote && !matchup.viewerVoteEntryId ? <Pressable accessibilityRole="button" accessibilityLabel={`Vote for ${entry.title}`} disabled={votePending} onPress={() => vote(entry.id)} style={[styles.voteButton, { backgroundColor: theme.colors.accentFill }]}><Text style={[styles.voteButtonText, { color: theme.colors.onAccent }]}>Vote</Text></Pressable> : null}
          {selected ? <View style={[styles.votedPill, { backgroundColor: theme.colors.accentSoft }]}><MaterialIcons name="check" size={15} color={theme.colors.accentText} /><Text style={[styles.votedText, { color: theme.colors.accentText }]}>Your vote</Text></View> : null}
          {winner ? <View style={[styles.votedPill, { backgroundColor: theme.colors.accentSoft }]}><MaterialIcons name="emoji-events" size={15} color={theme.colors.accentText} /><Text style={[styles.votedText, { color: theme.colors.accentText }]}>Winner</Text></View> : null}
        </View>
        {total > 0 ? <Text style={[styles.voteCount, { color: theme.colors.textMuted }]}>{votes} vote{votes === 1 ? '' : 's'}</Text> : null}
      </View>
    );
  };
  return <View style={styles.matchupCard}>{renderEntry(matchup.entryA, matchup.voteCountA)}<View style={[styles.versus, { backgroundColor: theme.colors.surface }]}><Text style={[styles.versusText, { color: theme.colors.textMuted }]}>VS</Text></View>{renderEntry(matchup.entryB, matchup.voteCountB)}</View>;
}

export function BattleDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const battleId = typeof id === 'string' ? id : '';
  const router = useRouter();
  const theme = usePluggdTheme();
  const insets = useSafeAreaInsets();
  const bottomPadding = useBottomChromeInset();
  const queryClient = useQueryClient();
  const playback = usePlayback();
  const [entryOpen, setEntryOpen] = useState(false);
  const detailQuery = useQuery({ queryKey: ['live', 'battle', battleId], queryFn: () => loadBattleDetail(battleId), enabled: Boolean(battleId), staleTime: 10_000 });
  const detail = detailQuery.data;
  const activeRound = useMemo(() => {
    const now = Date.now();
    return detail?.rounds.find((round) => new Date(round.starts_at).getTime() <= now && new Date(round.ends_at).getTime() >= now) ?? null;
  }, [detail?.rounds]);
  const voteMutation = useMutation({
    mutationFn: (entry: { matchupId: string; entryId: string }) => submitBattleVote({ battleId, ...entry }),
    onSuccess: async () => {
      impactHaptic();
      await queryClient.invalidateQueries({ queryKey: ['live', 'battle', battleId] });
      Alert.alert('Vote locked', 'Your vote has been counted for this matchup.');
    },
    onError: (error) => Alert.alert('Vote not saved', error instanceof Error ? error.message : 'Please try again.'),
  });
  const play = async (entry: BattleEntry) => {
    impactHaptic();
    await playback.playTrack({ id: `battle-${entry.id}`, url: entry.audioUrl, title: entry.title, artist: entry.creatorName, type: 'preview', sourceType: 'preview' });
  };

  if (detailQuery.isLoading) {
    return <View style={[styles.centeredScreen, { backgroundColor: theme.colors.background }]}><StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} /><ActivityIndicator size="large" color={theme.colors.accentText} /></View>;
  }
  if (detailQuery.isError || !detail) {
    return (
      <View style={[styles.centeredScreen, { backgroundColor: theme.colors.background }]}>
        <MaterialIcons name="error-outline" size={42} color={theme.colors.textMuted} />
        <Text style={[styles.errorTitle, { color: theme.colors.text }]}>This battle is unavailable.</Text>
        <Pressable accessibilityRole="button" onPress={() => router.replace('/live/battles' as any)} style={[styles.outlineButton, { borderColor: theme.colors.borderStrong }]}><Text style={[styles.outlineButtonText, { color: theme.colors.text }]}>Back to Battle Arena</Text></Pressable>
      </View>
    );
  }

  const { battle } = detail;
  const canEnter = battle.status === 'upcoming' && new Date(battle.starts_at).getTime() > Date.now() && !detail.currentUserEntryId;
  const groupedMatchups = detail.matchups.reduce<Record<number, BattleMatchup[]>>((groups, matchup) => {
    groups[matchup.round_number] = [...(groups[matchup.round_number] ?? []), matchup];
    return groups;
  }, {});
  const leaderboard = [...detail.entries].sort((left, right) => right.voteCount - left.voteCount || new Date(left.created_at || 0).getTime() - new Date(right.created_at || 0).getTime());

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={detailQuery.isRefetching} onRefresh={() => void detailQuery.refetch()} tintColor={theme.colors.accentText} />}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 82, paddingBottom: bottomPadding }]}
      >
        <Pressable accessibilityRole="button" accessibilityLabel="Back to Battle Arena" onPress={() => router.replace('/live/battles' as any)} style={styles.returnRow}><MaterialIcons name="arrow-back" size={21} color={theme.colors.text} /><Text style={[styles.returnText, { color: theme.colors.text }]}>BATTLE ARENA</Text></Pressable>
        <View style={[styles.detailHero, { backgroundColor: theme.colors.surfaceStrong, borderColor: theme.colors.border }]}>
          <LinearGradient colors={theme.scheme === 'dark' ? ['rgba(255,102,0,0.20)', 'rgba(18,13,8,0.88)', 'rgba(7,6,5,0.96)'] : ['rgba(232,79,0,0.16)', '#F4E7D2', '#FFFCF7']} style={StyleSheet.absoluteFill} />
          <View style={styles.heroTopRow}><View style={[styles.heroStatus, { backgroundColor: battle.status === 'live' ? theme.colors.live : theme.colors.accentFill }]}>{battle.status === 'live' ? <View style={styles.liveDot} /> : null}<Text style={styles.heroStatusText}>{statusCopy(battle.status)}</Text></View><BattleMark size={64} /></View>
          <Text style={[styles.detailTitle, { color: theme.colors.text }]}>{battle.title}</Text>
          <Text style={[styles.heroTiming, { color: theme.colors.textSecondary }]}>{timingLabel(battle)} · {formatDate(battle.ends_at)}</Text>
          <View style={styles.heroMetrics}><View><Text style={[styles.heroMetricLabel, { color: theme.colors.textMuted }]}>PRIZE</Text><Text style={[styles.heroMetricValue, { color: theme.colors.text }]}>{formatPrize(battle.prize_pool_cents)}</Text></View><View><Text style={[styles.heroMetricLabel, { color: theme.colors.textMuted }]}>ENTRY</Text><Text style={[styles.heroMetricValue, { color: theme.colors.text }]}>{formatMoney(battle.entry_fee_cents)}</Text></View><View><Text style={[styles.heroMetricLabel, { color: theme.colors.textMuted }]}>ENTRIES</Text><Text style={[styles.heroMetricValue, { color: theme.colors.text }]}>{battle.entryCount}</Text></View></View>
          {canEnter && (battle.entry_fee_cents ?? 0) === 0 ? <Pressable accessibilityRole="button" onPress={() => setEntryOpen(true)} style={[styles.primaryButton, { backgroundColor: theme.colors.accentFill }]}><Text style={[styles.primaryButtonText, { color: theme.colors.onAccent }]}>Submit your track</Text><MaterialIcons name="arrow-forward" size={22} color={theme.colors.onAccent} /></Pressable> : null}
          {canEnter && (battle.entry_fee_cents ?? 0) > 0 ? <View style={[styles.notice, { borderColor: theme.colors.borderStrong, backgroundColor: theme.colors.surface }]}><MaterialIcons name="confirmation-number" size={20} color={theme.colors.accentText} /><Text style={[styles.noticeText, { color: theme.colors.textSecondary }]}>This battle requires an entry pass. Complete entry on PLUGGD web before {formatDate(battle.starts_at)}.</Text></View> : null}
          {detail.currentUserEntryId ? <View style={[styles.notice, { borderColor: theme.colors.accent, backgroundColor: theme.colors.accentSoft }]}><MaterialIcons name="check-circle" size={20} color={theme.colors.accentText} /><Text style={[styles.noticeText, { color: theme.colors.text }]}>Your entry is locked into this battle.</Text></View> : null}
        </View>

        <View style={styles.section}>
          <SectionHeading kicker="TOURNAMENT" title="Battle bracket" aside={activeRound ? `Round ${activeRound.round_number} live` : battle.status === 'finished' ? 'Complete' : 'Awaiting draw'} />
          {Object.keys(groupedMatchups).length ? Object.entries(groupedMatchups).sort(([left], [right]) => Number(left) - Number(right)).map(([round, matchups]) => (
            <View key={round} style={styles.roundBlock}>
              <Text style={[styles.roundTitle, { color: theme.colors.textMuted }]}>ROUND {round}</Text>
              {matchups.map((matchup) => <MatchupCard key={matchup.id} matchup={matchup} canVote={battle.status === 'live' && activeRound?.round_number === matchup.round_number} votePending={voteMutation.isPending} play={play} vote={(entryId) => voteMutation.mutate({ matchupId: matchup.id, entryId })} />)}
            </View>
          )) : <View style={[styles.emptyInline, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}><MaterialIcons name="account-tree" size={25} color={theme.colors.textMuted} /><Text style={[styles.emptyInlineText, { color: theme.colors.textSecondary }]}>The bracket appears when the draw is confirmed.</Text></View>}
        </View>

        <View style={styles.section}>
          <SectionHeading kicker="LIVE LEADERBOARD" title="Crowd ranking" aside={`${leaderboard.length} entries`} />
          {leaderboard.length ? <View style={[styles.leaderboard, { borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceStrong }]}>{leaderboard.map((entry, index) => <View key={entry.id} style={[styles.leaderRow, index > 0 && { borderTopColor: theme.colors.divider, borderTopWidth: StyleSheet.hairlineWidth }]}><Text style={[styles.rank, { color: index < 3 ? theme.colors.accentText : theme.colors.textMuted }]}>{String(index + 1).padStart(2, '0')}</Text><View style={styles.leaderIdentity}><EntryIdentity entry={entry} /></View><Pressable accessibilityRole="button" accessibilityLabel={`Play ${entry.title}`} onPress={() => void play(entry)} style={[styles.playButton, { borderColor: theme.colors.borderStrong }]}><MaterialIcons name="play-arrow" size={20} color={theme.colors.text} /></Pressable><Text style={[styles.leaderVotes, { color: theme.colors.text }]}>{entry.voteCount}</Text></View>)}</View> : <View style={[styles.emptyInline, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}><MaterialIcons name="graphic-eq" size={25} color={theme.colors.textMuted} /><Text style={[styles.emptyInlineText, { color: theme.colors.textSecondary }]}>No tracks have entered the arena yet.</Text></View>}
        </View>
      </ScrollView>
      <EntryModal battleId={battleId} visible={entryOpen} onClose={() => setEntryOpen(false)} onSaved={() => { void queryClient.invalidateQueries({ queryKey: ['live', 'battle', battleId] }); void queryClient.invalidateQueries({ queryKey: ['live', 'battles'] }); }} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centeredScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 28 },
  scrollContent: { paddingHorizontal: 16 },
  returnRow: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 9, alignSelf: 'flex-start' },
  returnText: { fontFamily: pluggdFonts.satoshiBlack, fontSize: 12, letterSpacing: 1.6 },
  kicker: { fontFamily: pluggdFonts.satoshiBlack, fontSize: 11, lineHeight: 15, letterSpacing: 1.9 },
  loader: { marginVertical: 72 },
  arenaHero: { minHeight: 330, marginTop: 14, borderRadius: 26, overflow: 'hidden', padding: 18, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.18)', justifyContent: 'space-between' },
  arenaHeroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  arenaHeroPill: { minHeight: 34, borderRadius: 17, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: 'rgba(8,7,6,0.72)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.20)' },
  arenaHeroPillText: { color: '#FFFFFF', fontFamily: pluggdFonts.satoshiBlack, fontSize: 9, letterSpacing: 1.35 },
  arenaHeroState: { minHeight: 30, borderRadius: 15, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(8,7,6,0.72)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.20)' },
  arenaHeroStateLive: { backgroundColor: '#FF365E', borderColor: '#FF365E' },
  arenaHeroStateText: { color: '#FFFFFF', fontFamily: pluggdFonts.satoshiBlack, fontSize: 8, letterSpacing: 1.1 },
  arenaHeroCopy: { marginTop: 72 },
  arenaHeroTitle: { color: '#FFFFFF', fontFamily: pluggdFonts.displayBold, fontSize: 32, lineHeight: 34, letterSpacing: -0.48 },
  arenaHeroBody: { marginTop: 7, maxWidth: 420, color: 'rgba(255,255,255,0.76)', fontFamily: pluggdFonts.satoshiMedium, fontSize: 13, lineHeight: 18 },
  arenaHeroFooter: { marginTop: 18, paddingTop: 15, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.24)', gap: 14 },
  arenaHeroMetrics: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 20 },
  arenaHeroMetricLabel: { color: 'rgba(255,255,255,0.54)', fontFamily: pluggdFonts.satoshiBlack, fontSize: 8, letterSpacing: 1.1 },
  arenaHeroMetricValue: { marginTop: 3, color: '#FFFFFF', fontFamily: pluggdFonts.satoshiBold, fontSize: 12 },
  arenaHeroAction: { width: '100%', minHeight: 45, borderRadius: 23, paddingHorizontal: 15, justifyContent: 'center', backgroundColor: 'rgba(8,7,6,0.80)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)' },
  arenaHeroActionText: { color: '#FFFFFF', fontFamily: pluggdFonts.satoshiBlack, fontSize: 11.5 },
  arenaHeroActionIcon: { position: 'absolute', right: 15, top: 12 },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroStatus: { minHeight: 34, borderRadius: 17, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 7 },
  heroStatusText: { color: '#FFFFFF', fontFamily: pluggdFonts.satoshiBlack, fontSize: 10, letterSpacing: 1.4 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#FFFFFF' },
  heroTitle: { marginTop: 44, fontFamily: pluggdFonts.displayBold, fontSize: 40, lineHeight: 42 },
  heroTiming: { marginTop: 10, fontFamily: pluggdFonts.satoshiBold, fontSize: 13, lineHeight: 18 },
  heroMetrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 22, marginTop: 24 },
  heroMetricLabel: { fontFamily: pluggdFonts.satoshiBlack, fontSize: 9, letterSpacing: 1.4 },
  heroMetricValue: { marginTop: 3, fontFamily: pluggdFonts.satoshiBold, fontSize: 14 },
  heroAction: { marginTop: 22, minHeight: 54, paddingHorizontal: 17, borderWidth: 1, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroActionText: { fontFamily: pluggdFonts.satoshiBlack, fontSize: 15 },
  battleMark: { alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  section: { marginTop: 34 },
  sectionHeading: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 14 },
  sectionHeadingCopy: { flex: 1 },
  sectionTitle: { marginTop: 3, fontFamily: pluggdFonts.displayBold, fontSize: 27, lineHeight: 31 },
  sectionAside: { fontFamily: pluggdFonts.satoshiBold, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', paddingBottom: 4 },
  cardList: { gap: 12 },
  battleCard: { borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, padding: 18 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusPill: { minHeight: 28, borderRadius: 14, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusPillText: { fontFamily: pluggdFonts.satoshiBlack, fontSize: 9, letterSpacing: 1.1 },
  cardTitle: { marginTop: 18, fontFamily: pluggdFonts.displayBold, fontSize: 24, lineHeight: 28 },
  cardTiming: { marginTop: 6, fontFamily: pluggdFonts.satoshiBold, fontSize: 12 },
  cardRule: { height: StyleSheet.hairlineWidth, marginVertical: 16 },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 24 },
  metaLabel: { fontFamily: pluggdFonts.satoshiBlack, fontSize: 9, letterSpacing: 1.1 },
  metaValue: { marginTop: 3, fontFamily: pluggdFonts.satoshiBold, fontSize: 13 },
  cardArrow: { marginLeft: 'auto', width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  emptySection: { paddingTop: 27, paddingBottom: 10 },
  emptyHeadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  emptyStatusMark: { width: 50, height: 50, borderRadius: 25, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { marginTop: 3, fontFamily: pluggdFonts.displayBold, fontSize: 25, lineHeight: 29 },
  emptyBody: { marginTop: 8, maxWidth: 520, fontFamily: pluggdFonts.satoshiMedium, fontSize: 13.5, lineHeight: 19 },
  formatStrip: { marginTop: 18, minHeight: 126, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden', flexDirection: 'row' },
  formatStep: { flex: 1, minWidth: 0, paddingHorizontal: 11, paddingVertical: 16, borderLeftWidth: StyleSheet.hairlineWidth },
  formatLabel: { marginTop: 13, fontFamily: pluggdFonts.satoshiBlack, fontSize: 8, letterSpacing: 1.05 },
  formatValue: { marginTop: 4, fontFamily: pluggdFonts.satoshiBold, fontSize: 11, lineHeight: 15 },
  emptyActions: { marginTop: 14, flexDirection: 'row', gap: 10 },
  emptyPrimaryAction: { flex: 1, minHeight: 50, borderRadius: 16, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyPrimaryActionText: { fontFamily: pluggdFonts.satoshiBlack, fontSize: 13 },
  emptySecondaryAction: { flex: 1, minHeight: 50, borderRadius: 16, paddingHorizontal: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  emptySecondaryActionText: { fontFamily: pluggdFonts.satoshiBlack, fontSize: 13 },
  outlineButton: { minHeight: 48, borderWidth: 1, borderRadius: 14, paddingHorizontal: 18, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  outlineButtonText: { fontFamily: pluggdFonts.satoshiBlack, fontSize: 14 },
  errorCard: { padding: 22, borderWidth: StyleSheet.hairlineWidth, borderRadius: 20, marginBottom: 24 },
  errorTitle: { fontFamily: pluggdFonts.displayBold, fontSize: 23, textAlign: 'center' },
  errorBody: { marginTop: 6, fontFamily: pluggdFonts.satoshiMedium, fontSize: 14, textAlign: 'center' },
  pressed: { opacity: 0.78, transform: [{ scale: 0.992 }] },
  detailHero: { minHeight: 390, borderRadius: 26, overflow: 'hidden', padding: 22, borderWidth: StyleSheet.hairlineWidth },
  detailTitle: { marginTop: 48, fontFamily: pluggdFonts.displayBold, fontSize: 38, lineHeight: 41 },
  primaryButton: { minHeight: 56, marginTop: 22, borderRadius: 16, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  primaryButtonText: { fontFamily: pluggdFonts.satoshiBlack, fontSize: 16 },
  disabled: { opacity: 0.42 },
  notice: { marginTop: 18, minHeight: 56, borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 11 },
  noticeText: { flex: 1, fontFamily: pluggdFonts.satoshiBold, fontSize: 12, lineHeight: 17 },
  roundBlock: { marginBottom: 20 },
  roundTitle: { marginBottom: 9, fontFamily: pluggdFonts.satoshiBlack, fontSize: 10, letterSpacing: 1.4 },
  matchupCard: { gap: 8 },
  matchupEntry: { minHeight: 86, borderWidth: 1, borderRadius: 17, padding: 13 },
  entryIdentity: { minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 11 },
  entryAvatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  entryAvatarText: { fontFamily: pluggdFonts.satoshiBlack, fontSize: 16 },
  entryIdentityCopy: { flex: 1, minWidth: 0 },
  entryTitle: { fontFamily: pluggdFonts.satoshiBlack, fontSize: 14 },
  entryCreator: { marginTop: 2, fontFamily: pluggdFonts.satoshiMedium, fontSize: 11 },
  matchupActions: { marginTop: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 7 },
  playButton: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  voteButton: { minWidth: 58, height: 38, borderRadius: 19, paddingHorizontal: 13, alignItems: 'center', justifyContent: 'center' },
  voteButtonText: { fontFamily: pluggdFonts.satoshiBlack, fontSize: 12 },
  votedPill: { minHeight: 34, borderRadius: 17, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 4 },
  votedText: { fontFamily: pluggdFonts.satoshiBlack, fontSize: 10 },
  voteCount: { marginTop: 9, fontFamily: pluggdFonts.satoshiBold, fontSize: 10, textAlign: 'right' },
  versus: { zIndex: 2, width: 34, height: 34, borderRadius: 17, marginVertical: -12, alignSelf: 'center', alignItems: 'center', justifyContent: 'center' },
  versusText: { fontFamily: pluggdFonts.satoshiBlack, fontSize: 10, letterSpacing: 1 },
  emptyInline: { minHeight: 88, borderRadius: 17, borderWidth: StyleSheet.hairlineWidth, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  emptyInlineText: { flex: 1, fontFamily: pluggdFonts.satoshiMedium, fontSize: 14, lineHeight: 20 },
  leaderboard: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 18, overflow: 'hidden' },
  leaderRow: { minHeight: 72, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 10 },
  rank: { width: 24, fontFamily: pluggdFonts.satoshiBlack, fontSize: 12 },
  leaderIdentity: { flex: 1, minWidth: 0 },
  leaderVotes: { minWidth: 24, textAlign: 'right', fontFamily: pluggdFonts.satoshiBlack, fontSize: 14 },
  modalScreen: { flex: 1 },
  modalHeader: { height: 62, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  modalHeaderButton: { width: 74, minHeight: 44, justifyContent: 'center' },
  modalHeaderButtonText: { fontFamily: pluggdFonts.satoshiBold, fontSize: 14 },
  modalTitle: { fontFamily: pluggdFonts.displayBold, fontSize: 19 },
  modalContent: { paddingHorizontal: 20, paddingBottom: 40 },
  modalIntro: { alignItems: 'center', paddingTop: 24, paddingBottom: 30 },
  modalHeroTitle: { marginTop: 16, fontFamily: pluggdFonts.displayBold, fontSize: 30, textAlign: 'center' },
  modalBody: { marginTop: 8, maxWidth: 420, fontFamily: pluggdFonts.satoshiMedium, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  fieldLabel: { marginTop: 17, marginBottom: 7, fontFamily: pluggdFonts.satoshiBlack, fontSize: 10, letterSpacing: 1.5 },
  input: { minHeight: 54, borderRadius: 14, borderWidth: 1, paddingHorizontal: 15, fontFamily: pluggdFonts.satoshiMedium, fontSize: 15 },
  audioPicker: { minHeight: 72, borderRadius: 16, borderWidth: 1, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 11 },
  audioPickerIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  audioPickerCopy: { flex: 1, minWidth: 0 },
  audioPickerTitle: { fontFamily: pluggdFonts.satoshiBlack, fontSize: 14 },
  audioPickerBody: { marginTop: 3, fontFamily: pluggdFonts.satoshiMedium, fontSize: 11 },
});
