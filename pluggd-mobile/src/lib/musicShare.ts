import type { PluggdTrack } from '../context/PlaybackProvider';

type MusicShareContent = { title: string; message: string };
type ShareableTrack = Partial<Pick<PluggdTrack,
  'title' | 'artist' | 'releaseId' | 'trackId' | 'beatId' | 'mixId' | 'samplePackId' | 'soundboardId'
>>;

const publicUrl = (path: string) => `https://pluggd.fm${path}`;
const segment = (id: string) => encodeURIComponent(id.trim());

export function playbackShareUrl(track: ShareableTrack | null | undefined): string | null {
  if (!track) return null;
  if (track.releaseId?.trim()) {
    const path = `/release/${segment(track.releaseId)}`;
    return publicUrl(track.trackId?.trim() ? `${path}?track=${segment(track.trackId)}` : path);
  }
  if (track.beatId?.trim()) return publicUrl(`/beat/${segment(track.beatId)}`);
  if (track.mixId?.trim()) return publicUrl(`/mixes/${segment(track.mixId)}`);
  if (track.samplePackId?.trim()) return publicUrl(`/sample-packs/${segment(track.samplePackId)}`);
  if (track.soundboardId?.trim()) return publicUrl(`/soundboards/${segment(track.soundboardId)}`);
  return null;
}

function musicShareContent(title: string, description: string, url: string): MusicShareContent {
  // A single text item keeps the link in Copy and text-only status destinations.
  // Never share playback URLs: they may be private or temporary signed assets.
  return { title, message: `${description}\n${url}` };
}

export function playbackShareContent(track: ShareableTrack | null | undefined): MusicShareContent | null {
  const url = playbackShareUrl(track);
  if (!url || !track) return null;
  const title = track.title?.trim() || 'Untitled track';
  const artist = track.artist?.trim() || 'PLUGGD';
  return musicShareContent(title, `Listen to ${title} by ${artist} on PLUGGD.`, url);
}

export function releaseShareContent(release: { id: string; title: string; artist?: string | null }): MusicShareContent {
  const title = release.title.trim() || 'Untitled release';
  const artist = release.artist?.trim() || 'Creator';
  return musicShareContent(title, `PLUGGD release: ${title} by ${artist}`, publicUrl(`/release/${segment(release.id)}`));
}
