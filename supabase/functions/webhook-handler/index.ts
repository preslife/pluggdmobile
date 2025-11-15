import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { token, event_type, user_id } = await req.json();
    
    console.log('Webhook received:', { token, event_type, user_id });

    // Validate required fields
    if (!token || !event_type || !user_id) {
      throw new Error('Missing required fields: token, event_type, or user_id');
    }

    // Process based on event type
    switch (event_type) {
      case 'first_purchase':
        // Award credits for first purchase after referral
        const { error: rewardError } = await supabase.functions.invoke('process-referral-rewards', {
          body: {
            user_id,
            event_type: 'first_purchase',
            amount_spent: 5.00 // Default minimum for first purchase reward
          }
        });

        if (rewardError) {
          console.error('Error processing referral reward:', rewardError);
        }
        break;

      case 'subscription_started':
        // Award credits for subscription start
        const { error: subError } = await supabase.functions.invoke('process-referral-rewards', {
          body: {
            user_id,
            event_type: 'first_subscription'
          }
        });

        if (subError) {
          console.error('Error processing subscription reward:', subError);
        }
        break;

      case 'user_signup': {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('is_creator')
          .eq('user_id', user_id)
          .maybeSingle();

        if (profileError && profileError.code !== 'PGRST116') {
          console.error('Error loading profile for welcome email:', profileError);
        }

        const isCreator = profile?.is_creator === true;
        const welcomeType = isCreator ? 'creator_welcome' : 'fan_welcome';

        const { error: emailError } = await supabase.functions.invoke('send-lifecycle-emails', {
          body: {
            user_id,
            email_type: welcomeType,
          }
        });

        if (emailError) {
          console.error('Error sending welcome email:', emailError);
        }
        break;
      }

      default:
        console.log('Unhandled webhook event type:', event_type);
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Webhook processed successfully' }),
      { 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders 
        } 
      }
    );

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders 
        } 
      }
    );
  }
});
