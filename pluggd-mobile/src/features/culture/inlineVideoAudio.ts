import { requireNativeModule } from 'expo-modules-core';
import type { VideoPlayer } from 'expo-video';
import { Platform } from 'react-native';

type InlineAudioPlayer = VideoPlayer & { usesAmbientAudio: boolean; preservesPrimaryAudio: boolean; playAutomaticPreview: (allowSound: boolean) => Promise<boolean>; prepareMutedPlayback: () => Promise<boolean> };

export function setInlineVideoAutomaticAudio(player: VideoPlayer, automatic: boolean) {
  if (Platform.OS === 'ios') (player as InlineAudioPlayer).usesAmbientAudio = automatic;
}

export function setInlineVideoPrimaryAudioProtection(player: VideoPlayer, protect: boolean) {
  if (Platform.OS === 'ios') (player as InlineAudioPlayer).preservesPrimaryAudio = protect;
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

export async function playInlineVideoAutomatic(player: VideoPlayer, allowSound = true) {
  const inline = player as InlineAudioPlayer;
  if (Platform.OS === 'ios' && typeof inline.playAutomaticPreview === 'function') return inline.playAutomaticPreview(allowSound);
  player.muted = true;
  // Preserve the existing Android preview; an unprepared iOS session must not play.
  if (Platform.OS !== 'ios') player.play();
  return false;
}

export async function prepareInlineVideoMutedPlayback(player: VideoPlayer) {
  if (Platform.OS !== 'ios') return true;
  const inline = player as InlineAudioPlayer;
  return typeof inline.prepareMutedPlayback === 'function' && inline.prepareMutedPlayback();
}
