export type AppEnvironment = 'development' | 'preview' | 'production';

function normalizeEnvironment(value?: string): AppEnvironment {
  if (value === 'production' || value === 'preview') return value;
  if (value === 'development') return value;
  return __DEV__ ? 'development' : 'production';
}

export const APP_ENVIRONMENT = normalizeEnvironment(process.env.EXPO_PUBLIC_APP_ENV);
export const IS_PRODUCTION = APP_ENVIRONMENT === 'production';
export const LAUNCH_ACCESS_REQUIRED = !IS_PRODUCTION;
export const MINIMUM_AGE = 16;

export const LEGAL_URLS = {
  privacy: 'https://www.pluggd.fm/privacy',
  terms: 'https://www.pluggd.fm/terms',
  communityGuidelines: 'https://www.pluggd.fm/community-guidelines',
  support: 'https://www.pluggd.fm/help/contact',
} as const;

export const SUPPORT_EMAIL = 'support@pluggd.fm';
