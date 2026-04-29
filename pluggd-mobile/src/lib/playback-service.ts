/**
 * Track Player playback service — runs in a background thread.
 * This is registered once at app boot via TrackPlayer.registerPlaybackService().
 * All remote/lock-screen events are handled here.
 */
import TrackPlayer, { Event } from 'react-native-track-player';

export async function PlaybackService() {
  TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
  TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());
  TrackPlayer.addEventListener(Event.RemoteStop, () => TrackPlayer.stop());
  TrackPlayer.addEventListener(Event.RemoteNext, () => TrackPlayer.skipToNext());
  TrackPlayer.addEventListener(Event.RemotePrevious, () => TrackPlayer.skipToPrevious());
  TrackPlayer.addEventListener(Event.RemoteSeek, (e) => TrackPlayer.seekTo(e.position));

  // When a track finishes, advance to next or stop
  TrackPlayer.addEventListener(Event.PlaybackQueueEnded, async ({ position, track }) => {
    // Queue ended — player stays on last track. No-op here;
    // repeat logic is handled in the provider via PlaybackActiveTrackChanged.
  });
}
