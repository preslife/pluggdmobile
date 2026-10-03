import { OrientationMode, type IRtcEngine, type VideoEncoderConfiguration } from '../../lib/agora';

export function portraitLiveDimensions() {
  // Phone camera broadcasts use 9:16 independently of the device's display ratio.
  return { width: 720, height: 1280 };
}

export function portraitPreviewDimensions(viewport: { width: number; height: number }) {
  const frame = portraitLiveDimensions();
  const targetHeight = Math.min(520, Math.max(320, viewport.height * 0.56));
  const width = Math.max(1, Math.min(viewport.width - 32, targetHeight * frame.width / frame.height));
  return { width, height: width * frame.height / frame.width };
}

export function configurePortraitLiveVideo(
  engine: Pick<IRtcEngine, 'setVideoEncoderConfiguration' | 'setCameraCapturerConfiguration'>,
) {
  const config: VideoEncoderConfiguration = {
    dimensions: portraitLiveDimensions(),
    frameRate: 24,
    bitrate: 0,
    orientationMode: OrientationMode.OrientationModeFixedPortrait,
  };
  if (engine.setVideoEncoderConfiguration(config) < 0
    || engine.setCameraCapturerConfiguration({ followEncodeDimensionRatio: true }) < 0) {
    throw new Error('Could not prepare the live camera. Please try again.');
  }
}
