import { supabase } from '../../lib/supabase';

export type LyricSource = 'manual' | 'lrc' | 'tap_sync';

export type TimedLyricLine = {
  text: string;
  start_ms: number;
  end_ms?: number | null;
};

export type OwnedLyricsTrack = {
  id: string;
  releaseId: string;
  title: string;
  trackNumber: number;
  artist: string;
  artwork?: string | null;
  duration?: number | null;
  playbackUrl?: string | null;
  draftText: string;
  publishedText: string;
  timedLines: TimedLyricLine[];
  language: string;
  source: LyricSource;
};

type TrackRow = {
  id: string;
  release_id: string;
  title?: string | null;
  track_number?: number | null;
  duration?: number | null;
  audio_url?: string | null;
  audio_file_id?: string | null;
};

function isHttpUrl(value: unknown): value is string {
  return typeof value === 'string' && /^https?:\/\//i.test(value.trim());
}

function safeTimedLines(value: unknown): TimedLyricLine[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return [];
    const row = entry as Record<string, unknown>;
    const text = typeof row.text === 'string' ? row.text.trim() : '';
    const start = Number(row.start_ms);
    const end = row.end_ms == null ? null : Number(row.end_ms);
    if (!text || !Number.isFinite(start) || start < 0) return [];
    return [{ text, start_ms: Math.round(start), end_ms: Number.isFinite(end) && Number(end) >= start ? Math.round(Number(end)) : null }];
  }).sort((left, right) => left.start_ms - right.start_ms);
}

export function plainLyricLines(text: string) {
  return text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

export function parseLrcLyrics(input: string) {
  const timedLines: TimedLyricLine[] = [];
  for (const rawLine of input.split(/\r?\n/)) {
    const timestamps = [...rawLine.matchAll(/\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g)];
    if (!timestamps.length) continue;
    const text = rawLine.replace(/\[[^\]]+\]/g, '').trim();
    if (!text) continue;
    for (const timestamp of timestamps) {
      const minutes = Number(timestamp[1]);
      const seconds = Number(timestamp[2]);
      const fractionRaw = timestamp[3] || '0';
      const fractionMs = fractionRaw.length === 1 ? Number(fractionRaw) * 100 : fractionRaw.length === 2 ? Number(fractionRaw) * 10 : Number(fractionRaw.slice(0, 3));
      const startMs = (minutes * 60 + seconds) * 1000 + fractionMs;
      if (Number.isFinite(startMs)) timedLines.push({ text, start_ms: startMs });
    }
  }
  timedLines.sort((left, right) => left.start_ms - right.start_ms);
  return timedLines.map((line, index) => ({ ...line, end_ms: timedLines[index + 1]?.start_ms ?? null }));
}

export function tapSyncLines(text: string, existing: TimedLyricLine[] = []) {
  return plainLyricLines(text).map((line, index) => ({
    text: line,
    start_ms: existing[index]?.text === line ? existing[index].start_ms : -1,
    end_ms: null,
  }));
}

function finalizedTimedLines(lines: TimedLyricLine[]) {
  const valid = lines.filter((line) => line.text.trim() && Number.isFinite(line.start_ms) && line.start_ms >= 0).sort((left, right) => left.start_ms - right.start_ms);
  return valid.map((line, index) => ({
    text: line.text.trim(),
    start_ms: Math.round(line.start_ms),
    end_ms: valid[index + 1]?.start_ms ?? null,
  }));
}

async function resolveOwnedPlaybackUrl(row: TrackRow, audioFile?: { storage_path?: string | null; stream_url?: string | null }) {
  if (isHttpUrl(row.audio_url)) return row.audio_url.trim();
  if (isHttpUrl(audioFile?.stream_url)) return audioFile.stream_url.trim();
  const storagePath = audioFile?.storage_path?.trim();
  if (!storagePath) return null;
  const { data, error } = await supabase.storage.from('audio-files').createSignedUrl(storagePath, 60 * 30);
  return error ? null : data?.signedUrl || null;
}

export async function loadOwnedReleaseLyricsWorkspace(releaseId: string): Promise<OwnedLyricsTrack[]> {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) throw new Error('Sign in again to edit lyrics.');
  const db = supabase as any;
  const { data: release, error: releaseError } = await db
    .from('releases')
    .select('id,title,artist,cover_art_url')
    .eq('id', releaseId)
    .eq('user_id', auth.user.id)
    .maybeSingle();
  if (releaseError || !release?.id) throw releaseError || new Error('The owned release could not be confirmed.');

  let trackResult = await db
    .from('tracks')
    .select('id,release_id,title,track_number,duration,audio_url,audio_file_id')
    .eq('release_id', releaseId)
    .order('track_number', { ascending: true });
  if (trackResult.error && /audio_file_id/i.test(String(trackResult.error.message || ''))) {
    trackResult = await db.from('tracks').select('id,release_id,title,track_number,duration,audio_url').eq('release_id', releaseId).order('track_number', { ascending: true });
  }
  if (trackResult.error) throw trackResult.error;
  const tracks = (trackResult.data || []) as TrackRow[];
  if (!tracks.length) throw new Error('Add at least one track to this release before publishing lyrics.');

  const trackIds = tracks.map((track) => track.id);
  const audioFileIds = tracks.flatMap((track) => track.audio_file_id ? [track.audio_file_id] : []);
  const [draftResult, publishedResult, audioResult] = await Promise.all([
    db.from('creator_track_lyrics').select('track_id,lyrics').eq('user_id', auth.user.id).eq('track_type', 'release').in('track_id', trackIds),
    db.from('published_track_lyrics').select('track_id,plain_text,timed_lines,language,source').eq('owner_user_id', auth.user.id).in('track_id', trackIds),
    audioFileIds.length ? db.from('audio_files').select('id,storage_path,stream_url').eq('user_id', auth.user.id).in('id', audioFileIds) : Promise.resolve({ data: [], error: null }),
  ]);
  if (draftResult.error) throw draftResult.error;
  if (publishedResult.error) throw publishedResult.error;
  if (audioResult.error) throw audioResult.error;

  const drafts = new Map((draftResult.data || []).map((row: any) => [String(row.track_id), String(row.lyrics || '')]));
  const published = new Map((publishedResult.data || []).map((row: any) => [String(row.track_id), row]));
  const audioFiles = new Map<string, { storage_path?: string | null; stream_url?: string | null }>((audioResult.data || []).map((row: any) => [String(row.id), row]));

  return Promise.all(tracks.map(async (track) => {
    const publication: any = published.get(track.id);
    return {
      id: track.id,
      releaseId,
      title: track.title?.trim() || `Track ${track.track_number || 1}`,
      trackNumber: Number(track.track_number || 1),
      artist: String(release.artist || 'PLUGGD creator'),
      artwork: release.cover_art_url || null,
      duration: track.duration || null,
      playbackUrl: await resolveOwnedPlaybackUrl(track, track.audio_file_id ? audioFiles.get(track.audio_file_id) : undefined),
      draftText: String(drafts.get(track.id) || ''),
      publishedText: String(publication?.plain_text || ''),
      timedLines: safeTimedLines(publication?.timed_lines),
      language: String(publication?.language || 'en'),
      source: publication?.source === 'lrc' || publication?.source === 'tap_sync' ? publication.source : 'manual',
    };
  }));
}

export async function savePrivateTrackLyricsDraft(track: OwnedLyricsTrack, lyrics: string) {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) throw new Error('Sign in again to save lyrics.');
  const normalized = lyrics.trim();
  if (!normalized) throw new Error('Enter lyrics before saving this private draft.');
  const { error } = await (supabase as any).from('creator_track_lyrics').upsert({
    user_id: auth.user.id,
    track_id: track.id,
    track_type: 'release',
    track_title: track.title,
    track_artist: track.artist,
    lyrics: normalized,
    source: 'native_studio',
  }, { onConflict: 'user_id,track_id,track_type' });
  if (error) throw error;
}

export async function publishOwnedTrackLyrics(input: {
  track: OwnedLyricsTrack;
  plainText: string;
  timedLines: TimedLyricLine[];
  language: string;
  source: LyricSource;
  rightsConfirmed: boolean;
}) {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) throw new Error('Sign in again to publish lyrics.');
  const plainText = input.plainText.trim();
  const language = input.language.trim();
  if (!plainText) throw new Error('Enter the complete lyrics before publishing.');
  if (!/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})?$/.test(language)) throw new Error('Use a valid language code such as en or en-GB.');
  if (!input.rightsConfirmed) throw new Error('Confirm the lyric display rights before publishing.');

  const db = supabase as any;
  const { data: ownedTrack, error: ownershipError } = await db
    .from('tracks')
    .select('id,releases!inner(user_id)')
    .eq('id', input.track.id)
    .eq('release_id', input.track.releaseId)
    .eq('releases.user_id', auth.user.id)
    .maybeSingle();
  if (ownershipError || !ownedTrack?.id) throw ownershipError || new Error('The owned track could not be confirmed.');

  await savePrivateTrackLyricsDraft(input.track, plainText);
  const publishedAt = new Date().toISOString();
  const { data, error } = await db.from('published_track_lyrics').upsert({
    track_id: input.track.id,
    owner_user_id: auth.user.id,
    plain_text: plainText,
    timed_lines: input.source === 'manual' ? [] : finalizedTimedLines(input.timedLines),
    language,
    source: input.source,
    rights_confirmed: true,
    rights_confirmed_at: publishedAt,
    published_at: publishedAt,
  }, { onConflict: 'track_id' }).select('track_id,plain_text,timed_lines,language,source,published_at').single();
  if (error || !data?.track_id) throw error || new Error('Lyrics were not published.');
  return data;
}
