import { supabase } from '@/integrations/supabase/client';

export interface OAuthConfig {
  provider: string;
  clientId: string;
  redirectUri: string;
  scope: string[];
  responseType?: string;
  accessType?: string;
  prompt?: string;
}

export interface OAuthToken {
  access_token: string;
  refresh_token?: string;
  expires_at?: string;
  token_type?: string;
  scope?: string;
}

export class OAuthService {
  private static configs: Record<string, Partial<OAuthConfig>> = {
    instagram_business: {
      provider: 'instagram_business',
      scope: [
        'instagram_basic',
        'instagram_content_publish',
        'instagram_manage_comments',
        'instagram_manage_insights',
        'pages_show_list',
        'pages_read_engagement'
      ],
      responseType: 'code',
      accessType: 'offline'
    },
    facebook_pages: {
      provider: 'facebook_pages',
      scope: [
        'pages_show_list',
        'pages_read_engagement',
        'pages_manage_posts',
        'pages_read_user_content',
        'pages_manage_metadata'
      ],
      responseType: 'code',
      accessType: 'offline'
    },
    youtube: {
      provider: 'youtube',
      scope: [
        'https://www.googleapis.com/auth/youtube',
        'https://www.googleapis.com/auth/youtube.upload',
        'https://www.googleapis.com/auth/youtube.readonly',
        'https://www.googleapis.com/auth/yt-analytics.readonly'
      ],
      responseType: 'code',
      accessType: 'offline',
      prompt: 'consent'
    },
    tiktok_business: {
      provider: 'tiktok_business',
      scope: [
        'user.info.basic',
        'video.list',
        'video.upload',
        'share.sound.create'
      ],
      responseType: 'code'
    },
    twitter: {
      provider: 'twitter',
      scope: [
        'tweet.read',
        'tweet.write',
        'users.read',
        'follows.read',
        'follows.write',
        'offline.access'
      ],
      responseType: 'code'
    },
    soundcloud: {
      provider: 'soundcloud',
      scope: ['non-expiring'],
      responseType: 'code'
    },
    discord: {
      provider: 'discord',
      scope: [
        'identify',
        'guilds',
        'bot',
        'webhook.incoming'
      ],
      responseType: 'code'
    },
    mailchimp: {
      provider: 'mailchimp',
      scope: [],
      responseType: 'code'
    },
    substack: {
      provider: 'substack',
      scope: ['publication.write', 'publication.read'],
      responseType: 'code'
    },
    patreon: {
      provider: 'patreon',
      scope: [
        'identity',
        'identity.memberships',
        'campaigns',
        'campaigns.posts'
      ],
      responseType: 'code'
    }
  };

  static getAuthorizationUrl(provider: string): string {
    const config = this.configs[provider];
    if (!config) {
      throw new Error(`Unsupported provider: ${provider}`);
    }

    const baseUrls: Record<string, string> = {
      instagram_business: 'https://www.facebook.com/v18.0/dialog/oauth',
      facebook_pages: 'https://www.facebook.com/v18.0/dialog/oauth',
      youtube: 'https://accounts.google.com/o/oauth2/v2/auth',
      tiktok_business: 'https://www.tiktok.com/auth/authorize/',
      twitter: 'https://twitter.com/i/oauth2/authorize',
      soundcloud: 'https://soundcloud.com/connect',
      discord: 'https://discord.com/api/oauth2/authorize',
      mailchimp: 'https://login.mailchimp.com/oauth2/authorize',
      substack: 'https://api.substack.com/oauth/authorize',
      patreon: 'https://www.patreon.com/oauth2/authorize'
    };

    const clientIds: Record<string, string> = {
      instagram_business: import.meta.env.VITE_FB_APP_ID || '',
      facebook_pages: import.meta.env.VITE_FB_APP_ID || '',
      youtube: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
      tiktok_business: import.meta.env.VITE_TIKTOK_CLIENT_KEY || '',
      twitter: import.meta.env.VITE_TWITTER_CLIENT_ID || '',
      soundcloud: import.meta.env.VITE_SOUNDCLOUD_CLIENT_ID || '',
      discord: import.meta.env.VITE_DISCORD_CLIENT_ID || '',
      mailchimp: import.meta.env.VITE_MAILCHIMP_CLIENT_ID || '',
      substack: import.meta.env.VITE_SUBSTACK_CLIENT_ID || '',
      patreon: import.meta.env.VITE_PATREON_CLIENT_ID || ''
    };

    const baseUrl = baseUrls[provider];
    const clientId = clientIds[provider];
    const redirectUri = `${window.location.origin}/studio/plugins/callback`;
    const scope = config.scope?.join(' ') || '';
    const state = btoa(JSON.stringify({ provider, timestamp: Date.now() }));

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: scope,
      response_type: config.responseType || 'code',
      state: state,
      ...(config.accessType && { access_type: config.accessType }),
      ...(config.prompt && { prompt: config.prompt })
    });

    return `${baseUrl}?${params.toString()}`;
  }

  static async handleCallback(
    provider: string,
    code: string,
    state: string
  ): Promise<{ success: boolean; account?: any; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const response = await supabase.functions.invoke('oauth-callback', {
        body: { provider, code, state, redirectUri: `${window.location.origin}/studio/plugins/callback` }
      });

      if (response.error) {
        throw response.error;
      }

      const { account, tokens } = response.data;

      const { data: socialAccount, error: insertError } = await supabase
        .from('social_accounts')
        .upsert({
          user_id: user.id,
          provider: provider,
          account_id: account.id,
          account_name: account.name,
          account_handle: account.handle,
          profile_image_url: account.avatar,
          connection_status: 'connected',
          last_synced_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      await supabase
        .from('oauth_tokens')
        .upsert({
          social_account_id: socialAccount.id,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: tokens.expires_at,
          token_type: tokens.token_type || 'Bearer',
          scopes: tokens.scope?.split(' ') || []
        });

      return { success: true, account: socialAccount };
    } catch (error: any) {
      console.error('OAuth callback error:', error);
      return { success: false, error: error.message };
    }
  }

  static async disconnectAccount(accountId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('social_accounts')
        .update({ 
          connection_status: 'revoked',
          is_active: false 
        })
        .eq('id', accountId);

      if (error) throw error;

      await supabase
        .from('oauth_tokens')
        .delete()
        .eq('social_account_id', accountId);

      return { success: true };
    } catch (error: any) {
      console.error('Disconnect error:', error);
      return { success: false, error: error.message };
    }
  }

  static async refreshToken(accountId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await supabase.functions.invoke('oauth-refresh', {
        body: { accountId }
      });

      if (response.error) {
        throw response.error;
      }

      return { success: true };
    } catch (error: any) {
      console.error('Token refresh error:', error);
      return { success: false, error: error.message };
    }
  }

  static async getConnectedAccounts(userId: string) {
    const { data, error } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching accounts:', error);
      return [];
    }

    return data || [];
  }

  static async testConnection(accountId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await supabase.functions.invoke('oauth-test', {
        body: { accountId }
      });

      if (response.error) {
        throw response.error;
      }

      await supabase
        .from('social_accounts')
        .update({
          connection_status: response.data.valid ? 'connected' : 'error',
          last_synced_at: new Date().toISOString()
        })
        .eq('id', accountId);

      return { success: response.data.valid, error: response.data.error };
    } catch (error: any) {
      console.error('Connection test error:', error);
      return { success: false, error: error.message };
    }
  }
}