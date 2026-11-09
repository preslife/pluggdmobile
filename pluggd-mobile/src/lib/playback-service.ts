/**
 * Track Player playback service — runs in a background thread.
 * This is registered once at app boot via TrackPlayer.registerPlaybackService().
 * All remote/lock-screen events are handled here.
 */
import { installNativePlaybackService } from '../features/playback/nativePlaybackService';

export async function PlaybackService() {
  installNativePlaybackService();
}
