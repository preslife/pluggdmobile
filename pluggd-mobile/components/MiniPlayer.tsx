import { usePathname, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Platform, StyleSheet, View } from 'react-native';
import { selectionHaptic } from '../src/design/haptics';
import { usePlayback, type PluggdTrack } from '../src/context/PlaybackProvider';
import { isProtectedMix } from '../src/features/playback/protectedMixPlayback';
import { mixAccessSession } from '../src/features/playback/mixAccessSession';
import { toggleSavedContent } from '../src/features/culture/mobileServices';
import { formatDuration } from '../src/lib/mobileContent';
import { GlassMiniPlayer } from './liquid-glass';

const QA_TRACK: PluggdTrack = {
  id: 'qa-liquid-glass-player',
  url: 'about:blank',
  title: 'Midnight Architecture',
  artist: 'Sampha',
  type: 'preview',
  sourceType: 'preview',
  duration: 272,
};

function shouldDefaultCollapseMiniPlayer(pathname: string): boolean {
  return (
    pathname.startsWith('/soundboards/') ||
    pathname === '/releases' ||
    pathname.startsWith('/release/') ||
    pathname === '/store' ||
    pathname === '/market' ||
    pathname.startsWith('/market/') ||
    pathname === '/sample-packs' ||
    pathname.startsWith('/sample-pack/') ||
    pathname.startsWith('/product/')
  );
}

export default function MiniPlayer() {
  const router = useRouter();
  const pathname = usePathname() || '/';
  const normalizedPathname = pathname.replace('/(tabs)', '') || '/';
  const {
    currentTrack,
    isPlaying,
    isBuffering,
    progress,
    queue,
    togglePlayPause,
    skipToNext,
    skipToPrevious,
    seekTo,
    closePlayer,
  } = usePlayback();
  const latestTrack = useRef(currentTrack);
  latestTrack.current = currentTrack;
  const [collapsed, setCollapsed] = useState(() => shouldDefaultCollapseMiniPlayer(normalizedPathname));
  const [savedLocally, setSavedLocally] = useState(false);
  // Native builds must never invent a current track. The fixture remains
  // opt-in on web for screenshot QA via ?qaPlayer=1/localStorage only.
  const [qaPlayerEnabled, setQaPlayerEnabled] = useState(false);
  const [qaPlaying, setQaPlaying] = useState(true);

  const favoriteTarget = useMemo(() => {
    if (isProtectedMix(currentTrack)) return null;
    if (currentTrack?.beatId) return { kind: 'beat' as const, id: currentTrack.beatId };
    if (currentTrack?.releaseId) return { kind: 'release' as const, id: currentTrack.releaseId };
    return null;
  }, [currentTrack?.beatId, currentTrack?.releaseId, currentTrack?.mixAccess]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return undefined;
    const readFixtureFlag = () => {
      const params = new URLSearchParams(window.location.search);
      setQaPlayerEnabled(params.get('qaPlayer') === '1' || window.localStorage.getItem('pluggd:qa-player') === '1');
    };
    readFixtureFlag();
    window.addEventListener('storage', readFixtureFlag);
    window.addEventListener('pluggd:qa-player', readFixtureFlag);
    return () => {
      window.removeEventListener('storage', readFixtureFlag);
      window.removeEventListener('pluggd:qa-player', readFixtureFlag);
    };
  }, []);

  useEffect(() => {
    setSavedLocally(false);
    if (currentTrack?.id) setCollapsed(false);
  }, [currentTrack?.id]);

  useEffect(() => {
    // A route transition may make the player less intrusive, but it must never
    // auto-expand a player the listener deliberately collapsed. Paused players
    // also yield the destination canvas until the listener expands them again.
    if (!isPlaying || shouldDefaultCollapseMiniPlayer(normalizedPathname)) {
      setCollapsed(true);
    }
  }, [currentTrack?.id, isPlaying, normalizedPathname]);

  const activeTrack = currentTrack ?? (qaPlayerEnabled ? QA_TRACK : null);
  const isQaTrack = !currentTrack && Boolean(activeTrack);
  const playerIsPlaying = isQaTrack ? qaPlaying : isPlaying;

  if (!activeTrack) return null;

  const openPlayer = () => {
    selectionHaptic();
    router.push('/player');
  };

  const progressPercent =
    progress.duration > 0
      ? Math.min((progress.position / progress.duration) * 100, 100)
      : 0;
  const progressLabel = currentTrack && progress.duration > 0
    ? `${progress.position > 0 ? formatDuration(progress.position) : '0:00'} / ${formatDuration(progress.duration)}`
    : undefined;
  const backstageRoute = !isProtectedMix(activeTrack) ? activeTrack?.backstageRoute || (activeTrack?.backstageId ? `/backstage/${activeTrack.backstageId}` : undefined) : undefined;
  const backstageLabel =
    typeof activeTrack?.backstageActiveCount === 'number' && activeTrack.backstageActiveCount > 0
      ? `${activeTrack.backstageActiveCount} community`
      : 'Community';
  const hasLockedPurchaseRoute = Boolean(activeTrack.isLocked && activeTrack.purchaseRoute);

  const openQueue = () => {
    selectionHaptic();
    router.push({
      pathname: '/player',
      params: {
        focus: 'queue',
      },
    });
  };

  const saveCurrentTrack = async () => {
    if (isProtectedMix(currentTrack) || latestTrack.current !== currentTrack) return;
    const scope = mixAccessSession.scope();
    selectionHaptic();
    if (!favoriteTarget) {
      Alert.alert('Save unavailable', 'This track does not expose a release or beat favorite target yet.');
      return;
    }

    try {
      const result = await toggleSavedContent(favoriteTarget.kind, favoriteTarget.id);
      if (latestTrack.current !== currentTrack || !mixAccessSession.current(scope)) return;
      if (!result.success) {
        if (result.error?.toLowerCase().includes('sign in')) router.push('/auth/login' as any);
        else Alert.alert('Save failed', 'This item could not be saved. Please try again.');
        return;
      }
      setSavedLocally(Boolean(result.saved));
    } catch {
      if (latestTrack.current === currentTrack && mixAccessSession.current(scope)) Alert.alert('Save failed', 'This item could not be saved. Please try again.');
    }
  };

  const openMore = () => {
    selectionHaptic();
    Alert.alert(isProtectedMix(activeTrack) ? 'Player options' : activeTrack.title, activeTrack.isLocked ? 'Locked preview controls' : 'Player options', [
      { text: 'Open full player', onPress: openPlayer },
      { text: `Queue (${queue.length})`, onPress: openQueue },
      favoriteTarget ? { text: savedLocally ? 'Remove saved' : 'Save track', onPress: saveCurrentTrack } : undefined,
      backstageRoute ? { text: backstageLabel, onPress: () => router.push(backstageRoute as any) } : undefined,
      hasLockedPurchaseRoute ? { text: 'Unlock details', onPress: () => router.push(activeTrack.purchaseRoute as any) } : undefined,
      { text: 'Collapse player', onPress: () => setCollapsed(true) },
      { text: 'Close player', style: 'destructive', onPress: () => void closePlayer() },
      { text: 'Cancel', style: 'cancel' },
    ].filter(Boolean) as any);
  };

  return (
    <View pointerEvents="box-none" style={styles.wrap}>
      <GlassMiniPlayer
        title={activeTrack.title}
        artist={activeTrack.artist}
        artwork={activeTrack.artwork}
        locked={activeTrack.isLocked}
        collapsed={collapsed}
        canLike={Boolean(favoriteTarget)}
        liked={savedLocally}
        isPlaying={playerIsPlaying}
        isBuffering={isQaTrack ? false : isBuffering}
        progressPercent={progressPercent}
        progressLabel={progressLabel}
        onOpen={openPlayer}
        onToggleCollapse={() => setCollapsed((value) => !value)}
        onLikePress={saveCurrentTrack}
        onMorePress={openMore}
        onPrevious={isQaTrack ? undefined : skipToPrevious}
        onNext={isQaTrack ? undefined : skipToNext}
        onTogglePlay={() => {
          if (isQaTrack) {
            setQaPlaying((value) => !value);
            return;
          }
          togglePlayPause();
        }}
        onSeek={currentTrack && progress.duration > 0 ? (ratio) => void seekTo(ratio * progress.duration) : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: 0,
    paddingBottom: 0,
  },
});
