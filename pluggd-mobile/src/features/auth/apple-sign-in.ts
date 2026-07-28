import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import { supabase } from '../../lib/supabase';

export type AppleSignInResult = {
  isNewUser: boolean;
};

const bytesToHex = (bytes: Uint8Array) =>
  Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');

const resolveFullName = (fullName: AppleAuthentication.AppleAuthenticationFullName | null) => {
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
  if (Platform.OS !== 'ios' || !(await AppleAuthentication.isAvailableAsync())) {
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
