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

function publicAudioUrl(path: string) {
  return supabase.storage.from('battle-audio').getPublicUrl(path).data.publicUrl;
}

function safeExtension(name: string) {
  const extension = name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '');
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
    supabase.from('battle_entries').select('battle_id'),
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
  const [battleResult, entriesResult, roundsResult, matchupsResult, votesResult, authResult] = await Promise.all([
    supabase.from('battles').select('*').eq('id', battleId).single(),
    supabase.from('battle_entries').select('*').eq('battle_id', battleId).order('created_at', { ascending: true }),
    supabase.from('battle_rounds').select('*').eq('battle_id', battleId).order('round_number', { ascending: true }),
    supabase.from('battle_matchups').select('*').eq('battle_id', battleId).order('round_number', { ascending: true }),
    supabase.from('battle_votes').select('*').eq('battle_id', battleId),
    authPromise,
  ]);

  if (battleResult.error) throw battleResult.error;
  if (entriesResult.error) throw entriesResult.error;
  if (roundsResult.error) throw roundsResult.error;
  if (matchupsResult.error) throw matchupsResult.error;
  if (votesResult.error) throw votesResult.error;

  const entryRows = entriesResult.data ?? [];
  const userIds = [...new Set(entryRows.map((entry) => entry.user_id))];
  const profileResult = userIds.length
    ? await supabase.from('profiles').select('user_id, full_name, username, avatar_url').in('user_id', userIds)
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
      audioUrl: publicAudioUrl(entry.audio_path),
      voteCount: votes.filter((vote) => vote.entry_id === entry.id).length,
    };
  });
  const entryMap = new Map(entries.map((entry) => [entry.id, entry]));
  const currentUserId = authResult.data.user?.id ?? null;

  const matchups: BattleMatchup[] = (matchupsResult.data ?? []).map((matchup) => ({
    ...matchup,
    entryA: entryMap.get(matchup.entry_a_id) ?? null,
    entryB: entryMap.get(matchup.entry_b_id) ?? null,
    voteCountA: votes.filter((vote) => vote.matchup_id === matchup.id && vote.entry_id === matchup.entry_a_id).length,
    voteCountB: votes.filter((vote) => vote.matchup_id === matchup.id && vote.entry_id === matchup.entry_b_id).length,
    viewerVoteEntryId: currentUserId
      ? votes.find((vote) => vote.matchup_id === matchup.id && vote.voter_user_id === currentUserId)?.entry_id ?? null
      : null,
  }));

  const battle = battleResult.data;
  return {
    battle: { ...battle, status: normaliseStatus(battle.status), entryCount: entries.length },
    entries,
    rounds: roundsResult.data ?? [],
    matchups,
    currentUserId,
    currentUserEntryId: currentUserId ? entries.find((entry) => entry.user_id === currentUserId)?.id ?? null : null,
  };
}

export async function submitBattleEntry(input: { battleId: string; title: string; audio: BattleAudioAsset }) {
  const title = input.title.trim();
  if (!title) throw new Error('Add an entry title.');
  if (!input.audio.uri) throw new Error('Choose an audio file.');
  if ((input.audio.size ?? 0) > 100 * 1024 * 1024) throw new Error('Choose an audio file smaller than 100 MB.');

  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  if (!user) throw new Error('Sign in to enter this battle.');

  const [battleResult, existingResult] = await Promise.all([
    supabase.from('battles').select('id, status, starts_at, ends_at, entry_fee_cents').eq('id', input.battleId).single(),
    supabase.from('battle_entries').select('id').eq('battle_id', input.battleId).eq('user_id', user.id).maybeSingle(),
  ]);
  if (battleResult.error) throw battleResult.error;
  if (existingResult.error) throw existingResult.error;
  if (existingResult.data) throw new Error('You already have an entry in this battle.');
  if (battleResult.data.status !== 'upcoming' || new Date(battleResult.data.starts_at).getTime() <= Date.now()) {
    throw new Error('Entries are closed for this battle.');
  }
  if ((battleResult.data.entry_fee_cents ?? 0) > 0) {
    throw new Error('This battle requires an entry pass. Complete entry on PLUGGD web before the deadline.');
  }

  const path = `${user.id}/${input.battleId}/${Date.now()}.${safeExtension(input.audio.name)}`;
  await uploadFileToSupabaseStorage({
    bucket: 'battle-audio',
    path,
    uri: input.audio.uri,
    contentType: input.audio.mimeType || 'audio/mpeg',
  });

  const entryResult = await supabase.from('battle_entries').insert({
    battle_id: input.battleId,
    user_id: user.id,
    title,
    audio_path: path,
  }).select('id').single();

  if (entryResult.error) {
    await supabase.storage.from('battle-audio').remove([path]).catch(() => undefined);
    throw new Error(errorMessage(entryResult.error, 'Your entry could not be saved.'));
  }

  return entryResult.data;
}

export async function submitBattleVote(input: { battleId: string; matchupId: string; entryId: string }) {
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  if (!user) throw new Error('Sign in to vote.');

  const matchupResult = await supabase
    .from('battle_matchups')
    .select('id, battle_id, round_number, entry_a_id, entry_b_id')
    .eq('id', input.matchupId)
    .eq('battle_id', input.battleId)
    .single();
  if (matchupResult.error) throw matchupResult.error;
  if (![matchupResult.data.entry_a_id, matchupResult.data.entry_b_id].includes(input.entryId)) {
    throw new Error('That entry is not part of this matchup.');
  }

  const [battleResult, roundResult] = await Promise.all([
    supabase.from('battles').select('status').eq('id', input.battleId).single(),
    supabase.from('battle_rounds').select('starts_at, ends_at').eq('battle_id', input.battleId).eq('round_number', matchupResult.data.round_number).maybeSingle(),
  ]);
  if (battleResult.error) throw battleResult.error;
  if (roundResult.error) throw roundResult.error;
  const now = Date.now();
  if (battleResult.data.status !== 'live' || !roundResult.data || new Date(roundResult.data.starts_at).getTime() > now || new Date(roundResult.data.ends_at).getTime() < now) {
    throw new Error('Voting is not open for this matchup.');
  }

  const existingResult = await supabase
    .from('battle_votes')
    .select('entry_id')
    .eq('matchup_id', input.matchupId)
    .eq('voter_user_id', user.id)
    .maybeSingle();
  if (existingResult.error) throw existingResult.error;
  if (existingResult.data) throw new Error('Your vote is already locked for this matchup.');

  const result = await supabase.from('battle_votes').insert({
    battle_id: input.battleId,
    matchup_id: input.matchupId,
    entry_id: input.entryId,
    voter_user_id: user.id,
  });
  if (result.error) {
    if (result.error.code === '23505') throw new Error('Your vote is already locked for this matchup.');
    throw result.error;
  }
}
