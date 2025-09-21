import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

interface CreateTokenRequest {
  label: string;
  scopes: string[];
}

interface RevokeTokenRequest {
  tokenId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    if (req.method === 'POST') {
      const { action, ...data } = await req.json();

      if (action === 'create') {
        const { label, scopes }: CreateTokenRequest = data;
        
        // Generate a secure token
        const tokenValue = 'pk_' + crypto.randomUUID() + crypto.randomUUID().replace(/-/g, '');
        
        // Insert token with hashed value for security
        const { data: tokenData, error } = await supabase
          .from('api_tokens')
          .insert({
            user_id: user.id,
            label,
            scopes,
            token_hash: await hashToken(tokenValue),
            rate_limit_per_min: 60, // Default rate limit
          })
          .select()
          .single();

        if (error) throw error;

        console.log('API token created:', { userId: user.id, label, tokenId: tokenData.id });

        return new Response(JSON.stringify({
          success: true,
          token: tokenData,
          tokenValue: tokenValue // Only returned once
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (action === 'revoke') {
        const { tokenId }: RevokeTokenRequest = data;
        
        const { error } = await supabase
          .from('api_tokens')
          .update({ revoked: true })
          .eq('id', tokenId)
          .eq('user_id', user.id);

        if (error) throw error;

        console.log('API token revoked:', { userId: user.id, tokenId });

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in api-token-management:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};

async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(handler);