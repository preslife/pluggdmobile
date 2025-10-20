import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
}

interface AccountInfo {
  id: string;
  name: string;
  handle?: string;
  avatar?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { provider, code, state, redirectUri } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify state parameter
    const stateData = JSON.parse(atob(state));
    if (stateData.provider !== provider) {
      throw new Error('Invalid state parameter');
    }

    let tokens: TokenResponse;
    let accountInfo: AccountInfo;

    switch (provider) {
      case 'instagram_business':
      case 'facebook_pages':
        ({ tokens, accountInfo } = await handleFacebookOAuth(code, redirectUri));
        break;
      case 'youtube':
        ({ tokens, accountInfo } = await handleYouTubeOAuth(code, redirectUri));
        break;
      case 'tiktok_business':
        ({ tokens, accountInfo } = await handleTikTokOAuth(code, redirectUri));
        break;
      case 'twitter':
        ({ tokens, accountInfo } = await handleTwitterOAuth(code, redirectUri));
        break;
      case 'soundcloud':
        ({ tokens, accountInfo } = await handleSoundCloudOAuth(code, redirectUri));
        break;
      case 'discord':
        ({ tokens, accountInfo } = await handleDiscordOAuth(code, redirectUri));
        break;
      case 'mailchimp':
        ({ tokens, accountInfo } = await handleMailchimpOAuth(code, redirectUri));
        break;
      case 'substack':
        ({ tokens, accountInfo } = await handleSubstackOAuth(code, redirectUri));
        break;
      case 'patreon':
        ({ tokens, accountInfo } = await handlePatreonOAuth(code, redirectUri));
        break;
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }

    // Calculate expiry time
    const expiresAt = tokens.expires_in 
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null;

    return new Response(
      JSON.stringify({
        account: accountInfo,
        tokens: {
          ...tokens,
          expires_at: expiresAt
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('OAuth callback error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});

async function handleFacebookOAuth(code: string, redirectUri: string) {
  const clientId = Deno.env.get('FB_APP_ID')!;
  const clientSecret = Deno.env.get('FB_APP_SECRET')!;

  // Exchange code for access token
  const tokenResponse = await fetch('https://graph.facebook.com/v18.0/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code: code
    }).toString()
  });

  const tokenData = await tokenResponse.json();
  if (!tokenResponse.ok) {
    throw new Error(`Facebook token exchange failed: ${tokenData.error?.message}`);
  }

  // Get user info
  const userResponse = await fetch(
    `https://graph.facebook.com/v18.0/me?fields=id,name,picture&access_token=${tokenData.access_token}`
  );
  const userData = await userResponse.json();

  // Get Instagram business accounts if applicable
  const accountsResponse = await fetch(
    `https://graph.facebook.com/v18.0/me/accounts?fields=id,name,instagram_business_account&access_token=${tokenData.access_token}`
  );
  const accountsData = await accountsResponse.json();

  let accountInfo: AccountInfo;
  if (accountsData.data?.[0]?.instagram_business_account) {
    // Use Instagram business account
    const igAccount = accountsData.data[0].instagram_business_account;
    const igResponse = await fetch(
      `https://graph.facebook.com/v18.0/${igAccount.id}?fields=id,name,username,profile_picture_url&access_token=${tokenData.access_token}`
    );
    const igData = await igResponse.json();

    accountInfo = {
      id: igData.id,
      name: igData.name || userData.name,
      handle: igData.username,
      avatar: igData.profile_picture_url || userData.picture?.data?.url
    };
  } else {
    // Use Facebook page
    accountInfo = {
      id: userData.id,
      name: userData.name,
      avatar: userData.picture?.data?.url
    };
  }

  return {
    tokens: tokenData as TokenResponse,
    accountInfo
  };
}

async function handleYouTubeOAuth(code: string, redirectUri: string) {
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID')!;
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')!;

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      code: code
    }).toString()
  });

  const tokenData = await tokenResponse.json();
  if (!tokenResponse.ok) {
    throw new Error(`YouTube token exchange failed: ${tokenData.error_description}`);
  }

  const channelResponse = await fetch(
    'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
    {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    }
  );
  const channelData = await channelResponse.json();

  const channel = channelData.items?.[0];
  if (!channel) {
    throw new Error('No YouTube channel found');
  }

  return {
    tokens: tokenData as TokenResponse,
    accountInfo: {
      id: channel.id,
      name: channel.snippet.title,
      handle: channel.snippet.customUrl,
      avatar: channel.snippet.thumbnails?.default?.url
    }
  };
}

async function handleTikTokOAuth(code: string, redirectUri: string) {
  const clientKey = Deno.env.get('TIKTOK_CLIENT_KEY')!;
  const clientSecret = Deno.env.get('TIKTOK_CLIENT_SECRET')!;

  const tokenResponse = await fetch('https://open-api.tiktok.com/oauth/access_token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri
    }).toString()
  });

  const tokenData = await tokenResponse.json();
  if (!tokenResponse.ok || tokenData.error_code) {
    throw new Error(`TikTok token exchange failed: ${tokenData.description}`);
  }

  const userResponse = await fetch('https://open-api.tiktok.com/user/info/', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenData.data.access_token}`
    },
    body: JSON.stringify({
      fields: ['open_id', 'union_id', 'avatar_url', 'display_name']
    })
  });

  const userData = await userResponse.json();

  return {
    tokens: {
      access_token: tokenData.data.access_token,
      refresh_token: tokenData.data.refresh_token,
      expires_in: tokenData.data.expires_in,
      token_type: 'Bearer',
      scope: tokenData.data.scope
    },
    accountInfo: {
      id: userData.data.user.open_id,
      name: userData.data.user.display_name,
      avatar: userData.data.user.avatar_url
    }
  };
}

async function handleTwitterOAuth(code: string, redirectUri: string) {
  const clientId = Deno.env.get('TWITTER_CLIENT_ID')!;
  const clientSecret = Deno.env.get('TWITTER_CLIENT_SECRET')!;

  const tokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`
    },
    body: new URLSearchParams({
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code_verifier: 'challenge'
    }).toString()
  });

  const tokenData = await tokenResponse.json();
  if (!tokenResponse.ok) {
    throw new Error(`Twitter token exchange failed: ${tokenData.error_description}`);
  }

  const userResponse = await fetch(
    'https://api.twitter.com/2/users/me?user.fields=name,username,profile_image_url',
    {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    }
  );
  const userData = await userResponse.json();

  return {
    tokens: tokenData as TokenResponse,
    accountInfo: {
      id: userData.data.id,
      name: userData.data.name,
      handle: userData.data.username,
      avatar: userData.data.profile_image_url
    }
  };
}

async function handleSoundCloudOAuth(code: string, redirectUri: string) {
  const clientId = Deno.env.get('SOUNDCLOUD_CLIENT_ID')!;
  const clientSecret = Deno.env.get('SOUNDCLOUD_CLIENT_SECRET')!;

  const tokenResponse = await fetch('https://api.soundcloud.com/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      code: code
    }).toString()
  });

  const tokenData = await tokenResponse.json();
  if (!tokenResponse.ok) {
    throw new Error(`SoundCloud token exchange failed: ${tokenData.error_description}`);
  }

  const userResponse = await fetch(
    `https://api.soundcloud.com/me?oauth_token=${tokenData.access_token}`
  );
  const userData = await userResponse.json();

  return {
    tokens: tokenData as TokenResponse,
    accountInfo: {
      id: userData.id.toString(),
      name: userData.full_name || userData.username,
      handle: userData.username,
      avatar: userData.avatar_url
    }
  };
}

async function handleDiscordOAuth(code: string, redirectUri: string) {
  const clientId = Deno.env.get('DISCORD_CLIENT_ID')!;
  const clientSecret = Deno.env.get('DISCORD_CLIENT_SECRET')!;

  const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirectUri
    }).toString()
  });

  const tokenData = await tokenResponse.json();
  if (!tokenResponse.ok) {
    throw new Error(`Discord token exchange failed: ${tokenData.error_description}`);
  }

  const userResponse = await fetch('https://discord.com/api/users/@me', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` }
  });
  const userData = await userResponse.json();

  return {
    tokens: tokenData as TokenResponse,
    accountInfo: {
      id: userData.id,
      name: userData.global_name || userData.username,
      handle: userData.username,
      avatar: userData.avatar ? 
        `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png` : 
        null
    }
  };
}

async function handleMailchimpOAuth(code: string, redirectUri: string) {
  const clientId = Deno.env.get('MAILCHIMP_CLIENT_ID')!;
  const clientSecret = Deno.env.get('MAILCHIMP_CLIENT_SECRET')!;

  const tokenResponse = await fetch('https://login.mailchimp.com/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code: code
    }).toString()
  });

  const tokenData = await tokenResponse.json();
  if (!tokenResponse.ok) {
    throw new Error(`Mailchimp token exchange failed: ${tokenData.error_description}`);
  }

  const metadata = JSON.parse(atob(tokenData.access_token.split('.')[1]));

  return {
    tokens: tokenData as TokenResponse,
    accountInfo: {
      id: metadata.dc,
      name: 'Mailchimp Account',
      handle: metadata.dc
    }
  };
}

async function handleSubstackOAuth(code: string, redirectUri: string) {
  const clientId = Deno.env.get('SUBSTACK_CLIENT_ID');
  const clientSecret = Deno.env.get('SUBSTACK_CLIENT_SECRET');
  const tokenUrl = Deno.env.get('SUBSTACK_TOKEN_URL') || 'https://substack.com/api/v1/oauth/token';
  const publicationUrl = Deno.env.get('SUBSTACK_PUBLICATION_URL') || 'https://substack.com/api/v1/publication';

  if (!clientId || !clientSecret) {
    throw new Error('Substack OAuth credentials are not configured');
  }

  const tokenResponse = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    }).toString(),
  });

  const tokenData = await tokenResponse.json();

  if (!tokenResponse.ok || !tokenData?.access_token) {
    const reason = tokenData?.error_description || tokenData?.error || tokenResponse.statusText;
    throw new Error(`Substack token exchange failed: ${reason}`);
  }

  const publicationResponse = await fetch(publicationUrl, {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  const publicationData = await publicationResponse.json();

  if (!publicationResponse.ok) {
    const reason = publicationData?.error_description || publicationData?.error || publicationResponse.statusText;
    throw new Error(`Substack publication lookup failed: ${reason}`);
  }

  const publication =
    publicationData?.publication ||
    publicationData?.data ||
    publicationData;

  if (!publication) {
    throw new Error('Substack publication payload missing expected fields');
  }

  const publicationId = publication.id || publication.publication_id || publication.slug;
  const publicationName = publication.name || publication.title || 'Substack Publication';
  const publicationHandle = publication.handle || publication.slug || undefined;
  const publicationAvatar = publication.icon_url || publication.logo_url || publication.image_url || undefined;

  const tokens: TokenResponse = {
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    expires_in: tokenData.expires_in,
    token_type: tokenData.token_type || 'Bearer',
    scope: Array.isArray(tokenData.scope) ? tokenData.scope.join(' ') : tokenData.scope,
  };

  return {
    tokens,
    accountInfo: {
      id: publicationId,
      name: publicationName,
      handle: publicationHandle,
      avatar: publicationAvatar,
    },
  };
}

async function handlePatreonOAuth(code: string, redirectUri: string) {
  const clientId = Deno.env.get('PATREON_CLIENT_ID')!;
  const clientSecret = Deno.env.get('PATREON_CLIENT_SECRET')!;

  const tokenResponse = await fetch('https://www.patreon.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: code,
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri
    }).toString()
  });

  const tokenData = await tokenResponse.json();
  if (!tokenResponse.ok) {
    throw new Error(`Patreon token exchange failed: ${tokenData.error_description}`);
  }

  const userResponse = await fetch(
    'https://www.patreon.com/api/oauth2/v2/identity?fields%5Buser%5D=full_name,vanity,image_url',
    {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    }
  );
  const userData = await userResponse.json();

  return {
    tokens: tokenData as TokenResponse,
    accountInfo: {
      id: userData.data.id,
      name: userData.data.attributes.full_name,
      handle: userData.data.attributes.vanity,
      avatar: userData.data.attributes.image_url
    }
  };
}