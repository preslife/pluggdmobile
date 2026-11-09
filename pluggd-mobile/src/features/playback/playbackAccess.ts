import type { PluggdTrack } from '../../context/PlaybackProvider';
import { hasCurrentMixAccess, isProtectedMix } from './protectedMixPlayback';
import { hasCurrentReleaseAccess, isReleaseTrack } from './releaseAgeAccess';

export const requiresPlaybackAccess = (track?: Partial<PluggdTrack> | null) => isProtectedMix(track) || isReleaseTrack(track);
export const hasCurrentPlaybackAccess = (track?: Partial<PluggdTrack> | null) => hasCurrentMixAccess(track) && hasCurrentReleaseAccess(track);
