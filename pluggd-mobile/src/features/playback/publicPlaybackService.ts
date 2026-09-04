import type { PluggdTrack } from '../../context/PlaybackProvider';
import { releasePlayableUrl } from '../../lib/mobileContent';
import { supabase } from '../../lib/supabase';

export type PlaybackCatalogType = 'track' | 'beat' | 'mix' | 'soundboard';

export type PublicPlaybackMetadata = {
  catalogType: PlaybackCatalogType;
  catalogId: string;
  audioFileId: string | null;
  streamUrl: string | null;
  durationSeconds: number | null;
  waveformData: unknown;
  processingStatus: string;
};

export type TimedLyricLine = {
  startMs: number;
  endMs: number | null;
  text: string;
};

export type PublishedTrackLyrics = {
  trackId: string;
  plainText: string;
  timedLines: TimedLyricLine[];
  language: string;
  source: 'manual' | 'lrc' | 'tap_sync';
  publishedAt: string | null;
};

export type ReleasePlaybackCollection = {
  releaseId: string;
  title: string;
  tracks: PluggdTrack[];
};

type ReleaseTrackRow = {
  id: string;
  title?: string | null;
  track_number?: number | null;
  duration?: number | null;
  audio_url?: string | null;
};

function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function finite(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function playbackIdentity(track?: Partial<PluggdTrack> | null): { type: PlaybackCatalogType; id: string } | null {
  if (!track) return null;
  if (track.trackId) return { type: 'track', id: track.trackId };
  if (track.beatId) return { type: 'beat', id: track.beatId };
  if (track.mixId) return { type: 'mix', id: track.mixId };
  if (track.soundboardItemId) return { type: 'soundboard', id: track.soundboardItemId };
  return null;
}

export async function loadPublicPlaybackMetadata(track: PluggdTrack): Promise<PublicPlaybackMetadata | null> {
  const identity = playbackIdentity(track);
  if (!identity) return null;

  if (identity.type === 'soundboard') {
    const { data, error } = await (supabase as any)
      .from('soundboard_items')
      .select('id,audio_file_id,media_url,duration_seconds,waveform_data')
      .eq('id', identity.id)
      .maybeSingle();
    if (error) throw new Error(error.message || 'Playback metadata could not load.');
    if (!data) return null;
    return {
      catalogType: identity.type,
      catalogId: identity.id,
      audioFileId: text(data.audio_file_id),
      streamUrl: text(data.media_url),
      durationSeconds: finite(data.duration_seconds),
      waveformData: data.waveform_data ?? null,
      processingStatus: data.waveform_data ? 'completed' : 'processing',
    };
  }

  const { data, error } = await (supabase as any).rpc('get_public_playback_metadata', {
    p_catalog_type: identity.type,
    p_catalog_id: identity.id,
  });
  if (error) throw new Error(error.message || 'Playback metadata could not load.');
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  return {
    catalogType: identity.type,
    catalogId: identity.id,
    audioFileId: text(row.audio_file_id),
    streamUrl: text(row.stream_url),
    durationSeconds: finite(row.duration_seconds),
    waveformData: row.waveform_data ?? null,
    processingStatus: text(row.processing_status) || 'processing',
  };
}

export async function loadReleasePlaybackCollection(releaseId: string): Promise<ReleasePlaybackCollection | null> {
  const db = supabase as any;
  const [{ data: release, error: releaseError }, { data: trackRows, error: tracksError }] = await Promise.all([
    db
      .from('releases')
      .select('id,title,artist,cover_art_url,catalogue_mode,catalogue_import_job_id,lyrics')
      .eq('id', releaseId)
      .maybeSingle(),
    db
      .from('tracks')
      .select('id,title,track_number,duration,audio_url')
      .eq('release_id', releaseId)
      .order('track_number', { ascending: true }),
  ]);
  if (releaseError) throw new Error(releaseError.message || 'Release details could not load.');
  if (tracksError) throw new Error(tracksError.message || 'Release tracks could not load.');
  if (!release || release.catalogue_import_job_id || (release.catalogue_mode && release.catalogue_mode !== 'pluggd')) return null;

  const eligible = ((trackRows ?? []) as ReleaseTrackRow[])
    .map((track) => ({ ...track, playableUrl: releasePlayableUrl(track as any) }))
    .filter((track) => Boolean(track.playableUrl));

  const tracks = await Promise.all(eligible.map(async (track, index): Promise<PluggdTrack> => {
    let duration = finite(track.duration);
    if (!duration) {
      const { data } = await db.rpc('get_public_playback_metadata', {
        p_catalog_type: 'track',
        p_catalog_id: track.id,
      });
      const metadata = Array.isArray(data) ? data[0] : data;
      duration = finite(metadata?.duration_seconds);
    }
    return {
      id: String(track.id),
      url: String(track.playableUrl),
      title: text(track.title) || `Track ${index + 1}`,
      artist: text(release.artist) || 'Unknown artist',
      artwork: text(release.cover_art_url) || undefined,
      releaseId: String(release.id),
      trackId: String(track.id),
      duration: duration || undefined,
      legacyLyrics: eligible.length === 1 ? text(release.lyrics) || undefined : undefined,
      type: 'release',
      sourceType: 'release',
    };
  }));

  return {
    releaseId: String(release.id),
    title: text(release.title) || 'Release',
    tracks,
  };
}

function timedLine(value: unknown): TimedLyricLine | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const lineText = text(row.text ?? row.line ?? row.lyric);
  const startMs = finite(row.start_ms ?? row.startMs ?? (finite(row.time) == null ? null : Number(row.time) * 1000));
  const endMs = finite(row.end_ms ?? row.endMs ?? (finite(row.end) == null ? null : Number(row.end) * 1000));
  if (!lineText || startMs == null || startMs < 0) return null;
  return { startMs, endMs: endMs != null && endMs > startMs ? endMs : null, text: lineText };
}

export async function loadPublishedTrackLyrics(trackId: string): Promise<PublishedTrackLyrics | null> {
  const { data, error } = await (supabase as any)
    .from('published_track_lyrics')
    .select('track_id,plain_text,timed_lines,language,source,published_at')
    .eq('track_id', trackId)
    .maybeSingle();
  if (error) throw new Error(error.message || 'Published lyrics could not load.');
  if (!data || !text(data.plain_text)) return null;
  const timedLines = (Array.isArray(data.timed_lines) ? data.timed_lines : [])
    .flatMap((value: unknown) => {
      const line = timedLine(value);
      return line ? [line] : [];
    })
    .sort((a: TimedLyricLine, b: TimedLyricLine) => a.startMs - b.startMs);
  return {
    trackId,
    plainText: text(data.plain_text)!,
    timedLines,
    language: text(data.language) || 'en',
    source: ['lrc', 'tap_sync'].includes(String(data.source)) ? data.source : 'manual',
    publishedAt: text(data.published_at),
  };
}
