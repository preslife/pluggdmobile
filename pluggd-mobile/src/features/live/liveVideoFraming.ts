import { OrientationMode, type IRtcEngine, type VideoEncoderConfiguration } from '../../lib/agora';

export function portraitLiveDimensions(viewport: { width: number; height: number }) {
  const valid = Number.isFinite(viewport.width) && Number.isFinite(viewport.height)
    && viewport.width > 0 && viewport.height > 0;
  const aspect = valid ? Math.max(16 / 9, Math.min(2.5, viewport.height / viewport.width)) : 16 / 9;
  return { width: 720, height: Math.round((720 * aspect) / 8) * 8 };
}

export function portraitPreviewDimensions(viewport: { width: number; height: number }) {
  const frame = portraitLiveDimensions(viewport);
  const targetHeight = Math.min(520, Math.max(320, viewport.height * 0.56));
  const width = Math.max(1, Math.min(viewport.width - 32, targetHeight * frame.width / frame.height));
  return { width, height: width * frame.height / frame.width };
}

export function configurePortraitLiveVideo(
  engine: Pick<IRtcEngine, 'setVideoEncoderConfiguration' | 'setCameraCapturerConfiguration'>,
  viewport: { width: number; height: number },
) {
  const config: VideoEncoderConfiguration = {
    dimensions: portraitLiveDimensions(viewport),
    frameRate: 24,
    bitrate: 0,
    orientationMode: OrientationMode.OrientationModeFixedPortrait,
  };
  if (engine.setVideoEncoderConfiguration(config) < 0
    || engine.setCameraCapturerConfiguration({ followEncodeDimensionRatio: true }) < 0) {
    throw new Error('Could not prepare the live camera. Please try again.');
  }
}
