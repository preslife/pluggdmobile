import type { PluggdTrack } from '../../context/PlaybackProvider';
import type { NativeMixEnvelope } from './nativeMixAccess';
import { mixAccessSession } from './mixAccessSession';

export function isProtectedMix(track?: Partial<PluggdTrack> | null): boolean {
  return Boolean(track?.mixAccess);
}

export function hasCurrentMixAccess(track?: Partial<PluggdTrack> | null): boolean {
  if (!track?.mixAccess) return true;
  const kind = track.sourceType ?? track.type;
  const id = track.mixId || track.id;
  return kind === 'mix' && typeof id === 'string' && mixAccessSession.authorized(id, track.mixAccess);
}

export function nativeMixTrack(envelope: NativeMixEnvelope): PluggdTrack {
  const { mix } = envelope;
  if (!envelope.public && !envelope.playbackAccess) throw new Error('Mix access is unavailable');
  return {
    id: mix.id, mixId: mix.id, url: `mix:${mix.id}`,
    title: mix.title || 'Untitled mix', artist: mix.city || 'PLUGGD DJ',
    artwork: mix.cover_url || undefined, duration: mix.duration_seconds ?? undefined,
    type: 'mix', sourceType: 'mix',
    ...(!envelope.public ? { mixAccess: envelope.playbackAccess, mixMetadataReadAt: envelope.metadataReadAt } : {}),
  };
}
