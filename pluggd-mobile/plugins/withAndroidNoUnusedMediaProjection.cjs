const { AndroidConfig, withAndroidManifest } = require('@expo/config-plugins');

const UNUSED_AGORA_SCREEN_SHARE_SERVICE =
  'io.agora.rtc2.extensions.MediaProjectionMgr$LocalScreenSharingService';

module.exports = function withAndroidNoUnusedMediaProjection(config) {
  return withAndroidManifest(config, (modConfig) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(modConfig.modResults);
    const services = application.service || [];
    const existingRemoval = services.find(
      (service) =>
        service?.$?.['android:name'] === UNUSED_AGORA_SCREEN_SHARE_SERVICE &&
        service?.$?.['tools:node'] === 'remove',
    );

    if (!existingRemoval) {
      services.push({
        $: {
          'android:name': UNUSED_AGORA_SCREEN_SHARE_SERVICE,
          'tools:node': 'remove',
        },
      });
    }
    application.service = services;

    return modConfig;
  });
};
