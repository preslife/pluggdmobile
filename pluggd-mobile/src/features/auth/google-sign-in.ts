import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../../lib/supabase';
import {
  requireSocialAuthConsent,
  type SocialAuthConsent,
} from './social-auth-consent';

export type GoogleSignInResult = {
  isNewUser: boolean;
};

type GoogleSignInError = Error & {
  code?: string;
};

WebBrowser.maybeCompleteAuthSession();

function oauthError(code: string, message: string) {
  const error = new Error(message) as GoogleSignInError;
  error.code = code;
  return error;
}

function callbackParams(url: string) {
  const parsed = new URL(url);
  const query = parsed.searchParams;
  const fragment = new URLSearchParams(parsed.hash.replace(/^#/, ''));
  return {
    code: query.get('code') || fragment.get('code'),
    accessToken: query.get('access_token') || fragment.get('access_token'),
    refreshToken: query.get('refresh_token') || fragment.get('refresh_token'),
    error: query.get('error_description') || fragment.get('error_description') || query.get('error') || fragment.get('error'),
  };
}

export const isGoogleSignInCancellation = (error: unknown) =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  (error as GoogleSignInError).code === 'ERR_REQUEST_CANCELED';

export async function signInWithGoogle(consent: SocialAuthConsent): Promise<GoogleSignInResult> {
  requireSocialAuthConsent(consent);
  const redirectTo = Linking.createURL('auth/callback');
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      queryParams: {
        prompt: 'select_account',
      },
    },
  });

  if (error) throw error;
  if (!data.url) throw new Error('Google sign-in could not be started.');

  const browserResult = await WebBrowser.openAuthSessionAsync(data.url, redirectTo, {
    presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
    preferEphemeralSession: false,
  });

  if (browserResult.type === 'cancel' || browserResult.type === 'dismiss') {
    throw oauthError('ERR_REQUEST_CANCELED', 'Google sign-in was cancelled.');
  }
  if (browserResult.type !== 'success' || !browserResult.url) {
    throw new Error('Google sign-in did not return to PLUGGD.');
  }

  const params = callbackParams(browserResult.url);
  if (params.error) throw new Error(params.error);

  let user = null;
  if (params.code) {
    const { data: sessionData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(params.code);
    if (exchangeError) throw exchangeError;
    user = sessionData.user;
  } else if (params.accessToken && params.refreshToken) {
    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      access_token: params.accessToken,
      refresh_token: params.refreshToken,
    });
    if (sessionError) throw sessionError;
    user = sessionData.user;
  }

  if (!user) throw new Error('Google sign-in did not return a user account.');

  const createdAt = Date.parse(user.created_at);
  const isNewUser = Number.isFinite(createdAt) && Date.now() - createdAt < 120_000;
  const { error: metadataError } = await supabase.auth.updateUser({
    data: {
      ...user.user_metadata,
      age_band: user.user_metadata?.age_band ?? '16_plus',
      minimum_age_confirmed: true,
    },
  });
  if (metadataError) throw metadataError;

  return { isNewUser };
}
