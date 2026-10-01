import { supabase } from '../../lib/supabase';
import { uploadFileToSupabaseStorage } from '../../lib/storageUpload';
import type { Database } from '../../types/supabase';

type BattleRow = Database['public']['Tables']['battles']['Row'];
type EntryRow = Database['public']['Tables']['battle_entries']['Row'];
type RoundRow = Database['public']['Tables']['battle_rounds']['Row'];
type MatchupRow = Database['public']['Tables']['battle_matchups']['Row'];
type VoteRow = Database['public']['Tables']['battle_votes']['Row'];

export type BattleStatus = 'upcoming' | 'live' | 'finished';

export type BattleSummary = Omit<BattleRow, 'status'> & {
  status: BattleStatus;
  entryCount: number;
};

export type BattleEntry = EntryRow & {
  creatorName: string;
  creatorHandle: string | null;
  creatorAvatarUrl: string | null;
  audioUrl: string;
  voteCount: number;
};

export type BattleMatchup = MatchupRow & {
  entryA: BattleEntry | null;
  entryB: BattleEntry | null;
  voteCountA: number;
  voteCountB: number;
  viewerVoteEntryId: string | null;
};

export type BattleDetail = {
  battle: BattleSummary;
  entries: BattleEntry[];
  rounds: RoundRow[];
  matchups: BattleMatchup[];
  currentUserId: string | null;
  currentUserEntryId: string | null;
};

export type BattleAudioAsset = {
  uri: string;
  name: string;
  mimeType?: string | null;
  size?: number | null;
};

function normaliseStatus(value: string): BattleStatus {
  if (value === 'live' || value === 'finished') return value;
  return 'upcoming';
}

export async function battleAudioUrl(path: string) {
  const { data, error } = await supabase.storage.from('battle-audio').createSignedUrl(path, 300);
  if (error || !data?.signedUrl)
    throw new Error('This beat is unavailable. Refresh and try again.');
  return data.signedUrl;
}

function safeExtension(name: string) {
  const extension = name
    .split('.')
    .pop()
    ?.toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  return extension || 'mp3';
}

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (typeof error === 'object' && error && 'message' in error) {
    const message = String((error as { message?: unknown }).message || '').trim();
    if (message) return message;
  }
  return fallback;
}

export async function loadBattleSummaries(): Promise<BattleSummary[]> {
  const [battleResult, entryResult] = await Promise.all([
    supabase.from('battles').select('*').order('starts_at', { ascending: true }),
    supabase.from('battle_entries').select('battle_id').eq('moderation_status', 'approved'),
  ]);
  if (battleResult.error) throw battleResult.error;
  if (entryResult.error) throw entryResult.error;

  const counts = new Map<string, number>();
  for (const entry of entryResult.data ?? []) {
    counts.set(entry.battle_id, (counts.get(entry.battle_id) ?? 0) + 1);
  }

  return (battleResult.data ?? []).map((battle) => ({
    ...battle,
    status: normaliseStatus(battle.status),
    entryCount: counts.get(battle.id) ?? 0,
  }));
}

export async function loadBattleDetail(battleId: string): Promise<BattleDetail> {
  const authPromise = supabase.auth.getUser();
  const [
    battleResult,
    entriesResult,
    roundsResult,
    matchupsResult,
    votesResult,
    authResult,
    countsResult,
  ] = await Promise.all([
    supabase.from('battles').select('*').eq('id', battleId).single(),
    supabase
      .from('battle_entries')
      .select('*')
      .eq('battle_id', battleId)
      .order('created_at', { ascending: true }),
    supabase
      .from('battle_rounds')
      .select('*')
      .eq('battle_id', battleId)
      .order('round_number', { ascending: true }),
    supabase
      .from('battle_matchups')
      .select('*')
      .eq('battle_id', battleId)
      .order('round_number', { ascending: true }),
    supabase.from('battle_votes').select('*').eq('battle_id', battleId),
    authPromise,
    supabase.rpc('battle_vote_counts', { p_battle_id: battleId }),
  ]);

  if (battleResult.error) throw battleResult.error;
  if (entriesResult.error) throw entriesResult.error;
  if (roundsResult.error) throw roundsResult.error;
  if (matchupsResult.error) throw matchupsResult.error;
  if (votesResult.error) throw votesResult.error;
  if (countsResult.error) throw countsResult.error;
  const counts = countsResult.data || [];

  const entryRows = entriesResult.data ?? [];
  const userIds = [...new Set(entryRows.map((entry) => entry.user_id))];
  const profileResult = userIds.length
    ? await supabase
        .from('profiles')
        .select('user_id, full_name, username, avatar_url')
        .in('user_id', userIds)
    : { data: [], error: null };
  if (profileResult.error) throw profileResult.error;

  const profiles = new Map((profileResult.data ?? []).map((profile) => [profile.user_id, profile]));
  const votes = votesResult.data ?? [];
  const entries: BattleEntry[] = entryRows.map((entry) => {
    const profile = profiles.get(entry.user_id);
    return {
      ...entry,
      creatorName: profile?.full_name?.trim() || profile?.username?.trim() || 'PLUGGD creator',
      creatorHandle: profile?.username?.trim() || null,
      creatorAvatarUrl: profile?.avatar_url || null,
      audioUrl: '',
      voteCount: counts.filter((v) => v.entry_id === entry.id).reduce((sum, v) => sum + v.votes, 0),
    };
  });
  const entryMap = new Map(entries.map((entry) => [entry.id, entry]));
  const currentUserId = authResult.data.user?.id ?? null;

  const matchups: BattleMatchup[] = (matchupsResult.data ?? []).map((matchup) => ({
    ...matchup,
    entryA: entryMap.get(matchup.entry_a_id) ?? null,
    entryB: matchup.entry_b_id ? (entryMap.get(matchup.entry_b_id) ?? null) : null,
    voteCountA:
      counts.find((v) => v.matchup_id === matchup.id && v.entry_id === matchup.entry_a_id)?.votes ||
      0,
    voteCountB:
      counts.find((v) => v.matchup_id === matchup.id && v.entry_id === matchup.entry_b_id)?.votes ||
      0,
    viewerVoteEntryId: currentUserId
      ? (votes.find(
          (vote) => vote.matchup_id === matchup.id && vote.voter_user_id === currentUserId,
        )?.entry_id ?? null)
      : null,
  }));

  const battle = battleResult.data;
  return {
    battle: {
      ...battle,
      status: normaliseStatus(battle.status),
      entryCount: entries.filter((entry) => entry.moderation_status === 'approved').length,
    },
    entries,
    rounds: roundsResult.data ?? [],
    matchups,
    currentUserId,
    currentUserEntryId: currentUserId
      ? (entries.find((entry) => entry.user_id === currentUserId)?.id ?? null)
      : null,
  };
}

export async function submitBattleEntry(input: {
  battleId: string;
  title: string;
  audio: BattleAudioAsset;
  rulesVersion: string;
  consent: boolean;
}) {
  if (!input.consent || !input.rulesVersion)
    throw new Error('Confirm that you are 18+, have audio rights and accept the rules.');
  if (!input.title.trim() || input.title.trim().length > 120 || !input.audio?.uri)
    throw new Error('Add a title and choose an MP3, WAV or M4A.');
  if ((input.audio.size ?? 0) > 104857600) throw new Error('Choose audio up to 100MB.');
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) throw new Error('Sign in to enter.');
  const path = `${auth.user.id}/${input.battleId}/${Date.now()}.${safeExtension(input.audio.name)}`;
  await uploadFileToSupabaseStorage({
    bucket: 'battle-audio',
    path,
    uri: input.audio.uri,
    contentType: input.audio.mimeType || 'audio/mpeg',
  });
  const { data, error } = await supabase.rpc('submit_free_battle_entry', {
    p_battle_id: input.battleId,
    p_title: input.title.trim(),
    p_audio_path: path,
    p_rules_version: input.rulesVersion,
    p_adult: input.consent,
    p_rights: input.consent,
  });
  if (error) {
    await supabase.storage
      .from('battle-audio')
      .remove([path])
      .catch(() => undefined);
    throw new Error(errorMessage(error, 'Your entry could not be saved.'));
  }
  return { id: data };
}
export async function submitBattleVote(input: {
  battleId: string;
  matchupId: string;
  entryId: string;
  rulesVersion: string;
  consent: boolean;
}) {
  const { error } = await supabase.rpc('vote_free_battle', {
    p_matchup_id: input.matchupId,
    p_entry_id: input.entryId,
    p_rules_version: input.rulesVersion,
    p_adult: input.consent,
  });
  if (error) throw new Error(errorMessage(error, 'Your vote could not be saved.'));
}
