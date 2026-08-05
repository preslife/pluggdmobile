import type * as AppleAuthenticationTypes from 'expo-apple-authentication';
import { Platform } from 'react-native';
import { supabase } from '../../lib/supabase';

/**
 * Apple Sign In needs two native modules. Importing them at module scope meant
 * a binary without them threw "Cannot find native module 'ExpoCrypto'" while
 * the login screen was still loading — a white screen with no way to sign in
 * at all, not even by email. They are resolved on demand instead, and
 * appleSignInAvailable() lets the login screen hide the Apple button rather
 * than offer one that cannot work.
 */
type AppleAuthenticationModule = typeof import('expo-apple-authentication');
type CryptoModule = typeof import('expo-crypto');

function nativeModule<T>(globalName: string, load: () => T): T | null {
  const modules = (globalThis as { expo?: { modules?: Record<string, unknown> } }).expo?.modules;
  if (!modules || !modules[globalName]) return null;
  try {
    return load();
  } catch {
    return null;
  }
}

const appleAuth = () =>
  nativeModule<AppleAuthenticationModule>('ExpoAppleAuthentication', () => require('expo-apple-authentication'));
const crypto = () => nativeModule<CryptoModule>('ExpoCrypto', () => require('expo-crypto'));

/** True when this build can actually offer Sign in with Apple. */
export function appleSignInAvailable() {
  return Platform.OS === 'ios' && Boolean(appleAuth()) && Boolean(crypto());
}

export type AppleSignInResult = {
  isNewUser: boolean;
};

const bytesToHex = (bytes: Uint8Array) =>
  Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');

const resolveFullName = (fullName: AppleAuthenticationTypes.AppleAuthenticationFullName | null) => {
  if (!fullName) return '';
  return [
    fullName.namePrefix,
    fullName.givenName,
    fullName.middleName,
    fullName.familyName,
    fullName.nameSuffix,
  ]
    .filter((part): part is string => Boolean(part?.trim()))
    .join(' ')
    .trim();
};

export const isAppleSignInCancellation = (error: unknown) =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  (error as { code?: string }).code === 'ERR_REQUEST_CANCELED';

export async function signInWithApple(): Promise<AppleSignInResult> {
  const AppleAuthentication = appleAuth();
  const Crypto = crypto();
  if (Platform.OS !== 'ios' || !AppleAuthentication || !Crypto || !(await AppleAuthentication.isAvailableAsync())) {
    throw new Error('Sign in with Apple is not available on this device.');
  }

  const rawNonce = bytesToHex(await Crypto.getRandomBytesAsync(32));
  const expectedState = bytesToHex(await Crypto.getRandomBytesAsync(24));
  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawNonce,
  );

  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
    nonce: hashedNonce,
    state: expectedState,
  });

  if (credential.state !== expectedState) {
    throw new Error('Apple sign-in could not be verified. Please try again.');
  }
  if (!credential.identityToken) {
    throw new Error('Apple did not return a valid identity token.');
  }

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
    nonce: rawNonce,
  });
  if (error) throw error;
  if (!data.user) throw new Error('Apple sign-in did not return a user account.');

  const fullName = resolveFullName(credential.fullName);
  const createdAt = Date.parse(data.user.created_at);
  const isNewUser = Number.isFinite(createdAt) && Date.now() - createdAt < 120_000;

  const nextMetadata = {
    ...data.user.user_metadata,
    ...(fullName ? { full_name: fullName } : {}),
    age_band: data.user.user_metadata?.age_band ?? '16_plus',
    minimum_age_confirmed: true,
  };

  const { error: metadataError } = await supabase.auth.updateUser({ data: nextMetadata });
  if (metadataError) throw metadataError;

  return { isNewUser };
}
