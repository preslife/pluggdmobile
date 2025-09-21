import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ShareTrackingRequest {
  action: 'click' | 'signup';
  share_token?: string;
  sharer_user_id?: string;
  signup_user_id?: string;
  share_platform?: 'twitter' | 'instagram' | 'discord' | 'direct';
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, share_token, sharer_user_id, signup_user_id, share_platform }: ShareTrackingRequest = await req.json();

    console.log(`Processing share tracking: ${action}`);

    if (action === 'click') {
      // Track share link click
      if (!share_token || !sharer_user_id) {
        throw new Error('Missing required fields for click tracking');
      }

      // Store click in analytics events with 7-day expiry tracking
      await supabase
        .from('analytics_events')
        .insert({
          user_id: sharer_user_id,
          event_name: 'share_link_clicked',
          properties: {
            share_token,
            share_platform,
            clicked_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
          }
        });

      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Share click tracked' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );

    } else if (action === 'signup') {
      // Check if signup can be attributed to a share within 7-day window
      if (!signup_user_id || !share_token) {
        console.log('Signup tracking requires user_id and share_token');
        return new Response(
          JSON.stringify({ 
            success: true,
            message: 'No attribution possible' 
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      }

      // Find recent share click within 7 days
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      const { data: shareClick, error: shareError } = await supabase
        .from('analytics_events')
        .select('user_id, properties')
        .eq('event_name', 'share_link_clicked')
        .gte('created_at', sevenDaysAgo.toISOString())
        .contains('properties', { share_token })
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (shareError && shareError.code !== 'PGRST116') {
        throw shareError;
      }

      if (shareClick) {
        const sharer_user_id = shareClick.user_id;
        const shareCredits = parseInt(Deno.env.get('REF_CREDITS_SHARE_SIGNUP') || '200');

        // Award credits to sharer
        const { error: walletError } = await supabase
          .from('wallet_ledger')
          .insert({
            user_id: sharer_user_id,
            kind: 'award_prize',
            amount_credits: shareCredits,
            ref_type: 'share_to_earn',
            ref_id: signup_user_id,
            counterparty_user_id: signup_user_id,
            meta: {
              event_type: 'share_signup_bonus',
              share_token,
              share_platform: shareClick.properties.share_platform,
              attributed_signup_id: signup_user_id
            }
          });

        if (walletError) throw walletError;

        // Log analytics event for the reward
        await supabase
          .from('analytics_events')
          .insert({
            user_id: sharer_user_id,
            event_name: 'share_signup_reward',
            properties: {
              credits_awarded: shareCredits,
              attributed_signup_id: signup_user_id,
              share_token,
              share_platform: shareClick.properties.share_platform
            }
          });

        // Log the attribution
        await supabase
          .from('analytics_events')
          .insert({
            user_id: signup_user_id,
            event_name: 'signup_attributed_to_share',
            properties: {
              sharer_user_id,
              share_token,
              credits_awarded_to_sharer: shareCredits
            }
          });

        console.log(`Share-to-earn reward granted: ${shareCredits} credits to user ${sharer_user_id}`);

        return new Response(
          JSON.stringify({ 
            success: true,
            attributed: true,
            sharer_user_id,
            credits_awarded: shareCredits
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );

      } else {
        console.log('No matching share click found within 7-day window');
        
        return new Response(
          JSON.stringify({ 
            success: true,
            attributed: false,
            message: 'No qualifying share link found'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      }

    } else {
      throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error('Error processing share tracking:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
};

serve(handler);