const { AndroidConfig, withAndroidManifest } = require('@expo/config-plugins');

const REQUIRED_CONFIGURATION_CHANGES = [
  'keyboard',
  'keyboardHidden',
  'orientation',
  'screenSize',
  'screenLayout',
  'smallestScreenSize',
  'uiMode',
  'density',
];

module.exports = function withAndroidAdaptiveActivity(config) {
  return withAndroidManifest(config, (modConfig) => {
    const mainActivity = AndroidConfig.Manifest.getMainActivityOrThrow(modConfig.modResults);
    const existing = String(mainActivity.$['android:configChanges'] || '')
      .split('|')
      .filter(Boolean);

    mainActivity.$['android:configChanges'] = Array.from(
      new Set([...existing, ...REQUIRED_CONFIGURATION_CHANGES]),
    ).join('|');

    return modConfig;
  });
};
