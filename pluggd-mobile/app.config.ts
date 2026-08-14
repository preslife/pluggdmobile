import type { ConfigContext, ExpoConfig } from 'expo/config';

const APP_ENV = process.env.EXPO_PUBLIC_APP_ENV ?? 'development';
const IS_PRODUCTION = APP_ENV === 'production';
const APP_LINK_HOST = (process.env.EXPO_PUBLIC_APP_LINK_HOST ?? 'pluggd.fm').trim().toLowerCase();
const EAS_PROJECT_ID =
  process.env.EXPO_PUBLIC_EAS_PROJECT_ID ??
  process.env.EAS_PROJECT_ID ??
  'c526e1c6-4684-4744-b205-5ea3ed2b4576';
const GOOGLE_SERVICES_FILE = process.env.GOOGLE_SERVICES_JSON;
const MAPBOX_PUBLIC_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN?.trim() ?? '';
const MAPBOX_NATIVE_SDK_VERSION = '11.20.1';
// @rnmapbox/maps reads RNMAPBOX_MAPS_DOWNLOAD_TOKEN directly during native
// dependency installation. Never forward that build-only secret into Expo config.
const NOTIFICATION_LINK_HOSTS =
  APP_LINK_HOST === 'pluggd.fm' ? ['pluggd.fm', 'www.pluggd.fm'] : [APP_LINK_HOST];

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Pluggd',
  owner: 'pluggd-ltd',
  slug: 'pluggd',
  scheme: 'pluggd',
  version: '1.0.0',
  orientation: 'default',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#080808',
  },
  ios: {
    supportsTablet: false,
    requireFullScreen: true,
    usesAppleSignIn: true,
    buildNumber: process.env.IOS_BUILD_NUMBER ?? '5',
    bundleIdentifier: 'com.pluggd.mobile',
    entitlements: {
      'aps-environment': IS_PRODUCTION ? 'production' : 'development',
    },
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      NSCameraUsageDescription: 'PLUGGD uses the camera when you scan an event ticket or create live and profile content.',
      NSMicrophoneUsageDescription: 'PLUGGD uses the microphone when you join or host a live audio room.',
      NSPhotoLibraryUsageDescription: 'PLUGGD lets you choose images and media for your profile and creator content.',
      NSPhotoLibraryAddUsageDescription: 'PLUGGD saves an exported creator asset only when you ask it to.',
      NSContactsUsageDescription: 'PLUGGD opens the iPhone contact form only when you choose to save a creator Connect Card.',
    },
    privacyManifests: {
      NSPrivacyTracking: false,
      NSPrivacyCollectedDataTypes: [
        {
          NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeName',
          NSPrivacyCollectedDataTypeLinked: true,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality'],
        },
        {
          NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeEmailAddress',
          NSPrivacyCollectedDataTypeLinked: true,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality'],
        },
        {
          NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeUserID',
          NSPrivacyCollectedDataTypeLinked: true,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality'],
        },
        {
          NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypePurchaseHistory',
          NSPrivacyCollectedDataTypeLinked: true,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality'],
        },
        {
          NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypePhotosorVideos',
          NSPrivacyCollectedDataTypeLinked: true,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality'],
        },
        {
          NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeAudioData',
          NSPrivacyCollectedDataTypeLinked: true,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality'],
        },
        {
          NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeOtherUserContent',
          NSPrivacyCollectedDataTypeLinked: true,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality'],
        },
        {
          NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeProductInteraction',
          NSPrivacyCollectedDataTypeLinked: true,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: [
            'NSPrivacyCollectedDataTypePurposeAppFunctionality',
            'NSPrivacyCollectedDataTypePurposeAnalytics',
          ],
        },
      ],
      NSPrivacyAccessedAPITypes: [
        {
          NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryFileTimestamp',
          NSPrivacyAccessedAPITypeReasons: ['C617.1', '0A2A.1', '3B52.1'],
        },
        {
          NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryUserDefaults',
          NSPrivacyAccessedAPITypeReasons: ['CA92.1'],
        },
        {
          NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryDiskSpace',
          NSPrivacyAccessedAPITypeReasons: ['E174.1', '85F4.1'],
        },
        {
          NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategorySystemBootTime',
          NSPrivacyAccessedAPITypeReasons: ['35F9.1'],
        },
      ],
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#1F2226',
    },
    allowBackup: false,
    blockedPermissions: [
      'android.permission.FOREGROUND_SERVICE_MEDIA_PROJECTION',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.SYSTEM_ALERT_WINDOW',
      'android.permission.WRITE_EXTERNAL_STORAGE',
    ],
    ...(GOOGLE_SERVICES_FILE ? { googleServicesFile: GOOGLE_SERVICES_FILE } : {}),
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        category: ['BROWSABLE', 'DEFAULT'],
        data: [
          {
            scheme: 'https',
            host: APP_LINK_HOST,
            pathPrefix: '/',
          },
        ],
      },
    ],
    predictiveBackGestureEnabled: true,
    versionCode: Number(process.env.ANDROID_VERSION_CODE ?? 1),
    permissions: ['CAMERA', 'RECORD_AUDIO', 'INTERNET', 'POST_NOTIFICATIONS'],
    package: 'com.pluggd.mobile',
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    '@sentry/react-native',
    './plugins/withAndroidAdaptiveActivity.cjs',
    './plugins/withAndroidGradleMemory.cjs',
    './plugins/withAndroidNoUnusedMediaProjection.cjs',
    [
      '@rnmapbox/maps',
      {
        RNMapboxMapsVersion: MAPBOX_NATIVE_SDK_VERSION,
      },
    ],
    [
      'expo-build-properties',
      {
        android: {
          minSdkVersion: 24,
          enableMinifyInReleaseBuilds: true,
          enableShrinkResourcesInReleaseBuilds: true,
        },
        ios: {
          deploymentTarget: '15.1',
          buildReactNativeFromSource: true,
        },
      },
    ],
    'expo-router',
    'expo-apple-authentication',
    [
      'expo-notifications',
      {
        icon: './assets/notification-icon.png',
        color: '#ff6600',
        defaultChannel: 'pluggd-reminders',
      },
    ],
    [
      'expo-camera',
      {
        cameraPermission: 'PLUGGD uses the camera when you scan an event ticket or create live and profile content.',
        microphonePermission: 'PLUGGD uses the microphone when you join or host a live audio room.',
      },
    ],
    [
      'expo-contacts',
      {
        contactsPermission: 'PLUGGD opens the contact form only when you choose to save a creator Connect Card.',
      },
    ],
    'expo-web-browser',
    'expo-video',
    [
      'expo-screen-orientation',
      {
        initialOrientation: 'PORTRAIT_UP',
      },
    ],
  ],
  extra: {
    ...config.extra,
    ...(EAS_PROJECT_ID
      ? {
          eas: {
            ...((config.extra?.eas as Record<string, unknown> | undefined) ?? {}),
            projectId: EAS_PROJECT_ID,
          },
        }
      : {}),
    appEnvironment: APP_ENV,
    mapboxRuntimeConfigured: Boolean(MAPBOX_PUBLIC_TOKEN),
    mapboxNativeSdkVersion: MAPBOX_NATIVE_SDK_VERSION,
    notificationLinkHosts: NOTIFICATION_LINK_HOSTS,
    launchAccessRequired: !IS_PRODUCTION,
  },
});
