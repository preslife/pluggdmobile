import type { PlatformOSType } from 'react-native';
import { appleBillingAdapter } from './adapters/apple';
import { googleBillingAdapter } from './adapters/google';

export * from './adapters/apple';
export * from './adapters/google';
export * from './types';

export function getStoreBillingAdapter(platform: PlatformOSType) {
  if (platform === 'ios') return appleBillingAdapter;
  if (platform === 'android') return googleBillingAdapter;
  return null;
}
