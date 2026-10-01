import type { MobileSocialDestinationInput } from '../culture/mobileTypes';

export type MusicTrack = {
  release_id: string; release_title: string; artist: string; cover_art_url: string | null;
  track_id: string; track_title: string; duration: number | null;
};
export type PostMusic = {
  post_id: string; release_id: string; release_title: string; track_id: string;
  track_title: string; artist: string; can_reuse: boolean;
};
export type MusicMedia = {
  uri: string; kind: 'photo' | 'video'; mimeType: string; duration: number; fileSize?: number; localName?: string;
};
export type MusicRecipe = {
  startSeconds: number; durationSeconds: number; timelineOffsetSeconds: number;
  contentDurationSeconds: number; musicGain: number; originalGain: number;
};
export type MusicDraft = {
  version: 1; userId: string; uploadId: string; requestId: string; postId: string;
  media: MusicMedia | null; track: MusicTrack | null; recipe: MusicRecipe;
  content: string; destinations: MobileSocialDestinationInput[];
  sourcePath?: string; jobId?: string; reviewPending?: boolean; updatedAt: number;
};
export const MAX_MUSIC_SECONDS = 30;
export const MAX_MEDIA_BYTES = 104_857_600;
export const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), Math.max(min, max));
export function fitRecipe(recipe: MusicRecipe, trackDuration: number, contentDuration = recipe.contentDurationSeconds): MusicRecipe {
  const content = clamp(contentDuration, 1, MAX_MUSIC_SECONDS);
  const duration = clamp(recipe.durationSeconds, 1, Math.min(MAX_MUSIC_SECONDS, content, trackDuration));
  return {
    ...recipe, contentDurationSeconds: content, durationSeconds: duration,
    startSeconds: clamp(recipe.startSeconds, 0, trackDuration - duration),
    timelineOffsetSeconds: clamp(recipe.timelineOffsetSeconds, 0, content - duration),
    musicGain: clamp(recipe.musicGain, 0, 1), originalGain: clamp(recipe.originalGain, 0, 1),
  };
}
export function formatMusicTime(seconds: number, precise = false) {
  const safe = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
  const tenths = Math.round(safe * 10);
  const whole = precise ? Math.floor(tenths / 10) : Math.floor(safe);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}${precise ? `.${tenths % 10}` : ''}`;
}
export function musicPostId(uri: string): string | null {
  try {
    const url = new URL(uri);
    if (url.origin !== 'https://pluggd.fm' || url.pathname !== '/api/social-music-playback') return null;
    const id = url.searchParams.get('postId');
    return id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ? id : null;
  } catch { return null; }
}
export const musicError = (error: unknown) => error instanceof Error ? error.message : 'Something went wrong. Please try again.';
