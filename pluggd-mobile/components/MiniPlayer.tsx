import { usePathname, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, StyleSheet, View } from 'react-native';
import { selectionHaptic } from '../src/design/haptics';
import { usePlayback, type PluggdTrack } from '../src/context/PlaybackProvider';
import { toggleSavedContent } from '../src/features/culture/mobileServices';
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

export default function MiniPlayer() {
  const router = useRouter();
  const pathname = usePathname() || '/';
  const normalizedPathname = pathname.replace('/(tabs)', '') || '/';
  const feedHeavyRoute = normalizedPathname === '/community' || normalizedPathname.startsWith('/community/');
  const {
    currentTrack,
    isPlaying,
    isBuffering,
    progress,
    queue,
    togglePlayPause,
    skipToNext,
    skipToPrevious,
  } = usePlayback();
  const [collapsed, setCollapsed] = useState(false);
  const [savedLocally, setSavedLocally] = useState(false);
  const [qaPlayerEnabled, setQaPlayerEnabled] = useState(false);
  const [qaPlaying, setQaPlaying] = useState(true);

  const favoriteTarget = useMemo(() => {
    if (currentTrack?.beatId) return { kind: 'beat' as const, id: currentTrack.beatId };
    if (currentTrack?.releaseId) return { kind: 'release' as const, id: currentTrack.releaseId };
    return null;
  }, [currentTrack?.beatId, currentTrack?.releaseId]);

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
    setCollapsed(feedHeavyRoute);
  }, [currentTrack?.id, feedHeavyRoute]);

  const activeTrack = currentTrack ?? (qaPlayerEnabled ? QA_TRACK : null);
  const isQaTrack = !currentTrack && Boolean(activeTrack);
  const playerIsPlaying = isQaTrack ? qaPlaying : isPlaying;

  if (!activeTrack) return null;

  const openPlayer = () => {
    selectionHaptic();
    router.push({
      pathname: '/player',
      params: {
        title: activeTrack.title,
        artist: activeTrack.artist,
        cover: activeTrack.artwork ?? '',
      },
    });
  };

  const progressPercent =
    currentTrack && progress.duration > 0
      ? Math.min((progress.position / progress.duration) * 100, 100)
      : 38;
  const backstageRoute = activeTrack?.backstageRoute || (activeTrack?.backstageId ? `/backstage/${activeTrack.backstageId}` : undefined);
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
        title: activeTrack.title,
        artist: activeTrack.artist,
        cover: activeTrack.artwork ?? '',
        focus: 'queue',
      },
    });
  };

  const openLyrics = () => {
    selectionHaptic();
    router.push({
      pathname: '/studio/action',
      params: {
        tool: 'barflow',
        track: activeTrack.id,
      },
    } as any);
  };

  const saveCurrentTrack = async () => {
    selectionHaptic();
    if (!favoriteTarget) {
      Alert.alert('Save unavailable', 'This track does not expose a release or beat favorite target yet.');
      return;
    }

    const result = await toggleSavedContent(favoriteTarget.kind, favoriteTarget.id);
    if (!result.success) {
      if (result.error?.toLowerCase().includes('sign in')) {
        router.push('/auth/login' as any);
        return;
      }
      Alert.alert('Save failed', result.error || 'This item could not be saved.');
      return;
    }

    setSavedLocally(Boolean(result.saved));
  };

  const openMore = () => {
    selectionHaptic();
    Alert.alert(activeTrack.title, activeTrack.isLocked ? 'Locked preview controls' : 'Player options', [
      { text: 'Open full player', onPress: openPlayer },
      { text: `Queue (${queue.length})`, onPress: openQueue },
      { text: 'Lyrics / BarFlow', onPress: openLyrics },
      favoriteTarget ? { text: savedLocally ? 'Remove saved' : 'Save track', onPress: saveCurrentTrack } : undefined,
      backstageRoute ? { text: backstageLabel, onPress: () => router.push(backstageRoute as any) } : undefined,
      hasLockedPurchaseRoute ? { text: 'Unlock details', onPress: () => router.push(activeTrack.purchaseRoute as any) } : undefined,
      { text: 'Cancel', style: 'cancel' },
    ].filter(Boolean) as any);
  };

  return (
    <View style={styles.wrap}>
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
        onOpen={openPlayer}
        onToggleCollapse={() => setCollapsed((value) => !value)}
        onLikePress={saveCurrentTrack}
        onLyricsPress={openLyrics}
        onQueuePress={openQueue}
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
