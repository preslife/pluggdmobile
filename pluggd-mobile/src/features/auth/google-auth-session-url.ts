const SUPABASE_AUTHORIZE_URL = 'https://qkwvqmubhyondemhasjp.supabase.co/auth/v1/authorize';
const PLUGGD_AUTH_START_URL = 'https://pluggd.fm/auth/mobile/google';
const MOBILE_CALLBACK = 'pluggd://auth/callback';

export function googleAuthSessionUrl(authorizeUrl: string, redirectTo: string, platform: string): string {
  if (platform !== 'ios') return authorizeUrl;

  try {
    const source = new URL(authorizeUrl);
    if (`${source.origin}${source.pathname}` !== SUPABASE_AUTHORIZE_URL
      || source.username || source.password || source.hash
      || redirectTo !== MOBILE_CALLBACK
      || source.searchParams.get('provider') !== 'google'
      || source.searchParams.get('redirect_to') !== redirectTo) {
      throw new Error('Unexpected Google authentication URL');
    }

    // Preserve Supabase's generated parameters (including a PKCE challenge)
    // without changing the client, saved sessions or provider callback.
    const branded = new URL(PLUGGD_AUTH_START_URL);
    branded.search = source.search;
    return branded.href;
  } catch {
    throw new Error('Google sign-in could not be started. Please try again.');
  }
}
