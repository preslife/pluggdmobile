import { requireNativeModule } from 'expo-modules-core';
import type { VideoPlayer } from 'expo-video';
import { Platform } from 'react-native';

type InlineAudioPlayer = VideoPlayer & { usesAmbientAudio: boolean; playAutomaticPreview: () => Promise<boolean> };

export function setInlineVideoAutomaticAudio(player: VideoPlayer, automatic: boolean) {
  if (Platform.OS === 'ios') (player as InlineAudioPlayer).usesAmbientAudio = automatic;
}

export function otherAudioPreventsInlineAutoplay() {
  // This update adds the public audio-session bridge on iOS. Preserve quiet
  // previews on platforms/builds that cannot establish audio ownership.
  if (Platform.OS !== 'ios') return true;
  try {
    const video = requireNativeModule<{ isOtherAudioPlaying?: () => boolean }>('ExpoVideo');
    return typeof video.isOtherAudioPlaying !== 'function' || video.isOtherAudioPlaying();
  } catch { return true; }
}

export async function playInlineVideoAutomatic(player: VideoPlayer) {
  const inline = player as InlineAudioPlayer;
  if (Platform.OS === 'ios' && typeof inline.playAutomaticPreview === 'function') return inline.playAutomaticPreview();
  player.muted = true;
  player.play();
  return false;
}
