import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReferralRequest {
  user_id: string;
  event_type: 'signup' | 'first_purchase' | 'first_subscription' | 'share_signup';
  referrer_code?: string;
  amount_spent?: number;
  share_token?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { user_id, event_type, referrer_code, amount_spent, share_token }: ReferralRequest = await req.json();
    
    console.log('Processing referral reward:', { user_id, event_type, referrer_code, amount_spent, share_token });

    // Get reward amounts from secrets
    const REF_CREDITS_SIGNUP_INVITEE = Number(Deno.env.get('REF_CREDITS_SIGNUP_INVITEE')) || 200;
    const REF_CREDITS_FIRST_PURCHASE_INVITER = Number(Deno.env.get('REF_CREDITS_FIRST_PURCHASE_INVITER')) || 1000;
    const REF_CREDITS_FIRST_SUB_BOTH = Number(Deno.env.get('REF_CREDITS_FIRST_SUB_BOTH')) || 2000;
    const REF_CREDITS_SHARE_SIGNUP = Number(Deno.env.get('REF_CREDITS_SHARE_SIGNUP')) || 200;

    let referrer_id: string | null = null;

    // Find referrer based on event type
    if (event_type === 'share_signup' && share_token) {
      // Check for share link click event within 7 days
      const { data: shareEvents } = await supabase
        .from('analytics_events')
        .select('user_id')
        .eq('event_name', 'share_link_clicked')
        .eq('metadata->>share_token', share_token)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(1);

      if (shareEvents && shareEvents.length > 0) {
        referrer_id = shareEvents[0].user_id;
      }
    } else if (referrer_code) {
      // Find referrer by code
      const { data: referrer } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('referral_code', referrer_code)
        .single();

      if (referrer) {
        referrer_id = referrer.user_id;
      }
    }

    if (!referrer_id) {
      console.log('No referrer found for event:', { event_type, referrer_code, share_token });
      return new Response(
        JSON.stringify({ success: false, message: 'No referrer found' }),
        { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Prevent self-referral
    if (referrer_id === user_id) {
      console.log('Self-referral attempt blocked');
      return new Response(
        JSON.stringify({ success: false, message: 'Self-referral not allowed' }),
        { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const transactions = [];

    // Process rewards based on event type
    switch (event_type) {
      case 'signup':
        // Check if this is the first signup reward for this user
        const { data: existingSignupReward } = await supabase
          .from('wallet_ledger')
          .select('id')
          .eq('user_id', user_id)
          .eq('kind', 'referral_reward')
          .eq('description', 'Referral signup bonus')
          .limit(1);

        if (!existingSignupReward || existingSignupReward.length === 0) {
          // Award signup bonus to both users
          transactions.push({
            user_id: user_id,
            amount_credits: REF_CREDITS_SIGNUP_INVITEE,
            kind: 'referral_reward',
            description: 'Referral signup bonus',
          });

          transactions.push({
            user_id: referrer_id,
            amount_credits: REF_CREDITS_SIGNUP_INVITEE,
            kind: 'referral_reward',
            description: 'Friend signup bonus',
          });

          // Update referrer's signup count and rewards
          const { data: currentProfile } = await supabase
            .from('profiles')
            .select('referral_signups_count, referral_rewards_earned')
            .eq('user_id', referrer_id)
            .single();

          await supabase
            .from('profiles')
            .update({ 
              referral_signups_count: (currentProfile?.referral_signups_count || 0) + 1,
              referral_rewards_earned: (currentProfile?.referral_rewards_earned || 0) + REF_CREDITS_SIGNUP_INVITEE
            })
            .eq('user_id', referrer_id);
        }
        break;

      case 'first_purchase':
        if (!amount_spent || amount_spent < 5) {
          console.log('Purchase amount too low for referral reward');
          break;
        }

        // Check if this is the first purchase reward for this user
        const { data: existingPurchaseReward } = await supabase
          .from('wallet_ledger')
          .select('id')
          .eq('user_id', referrer_id)
          .eq('kind', 'referral_reward')
          .eq('description', 'Friend first purchase bonus')
          .limit(1);

        if (!existingPurchaseReward || existingPurchaseReward.length === 0) {
          transactions.push({
            user_id: referrer_id,
            amount_credits: REF_CREDITS_FIRST_PURCHASE_INVITER,
            kind: 'referral_reward',
            description: 'Friend first purchase bonus',
          });

          // Update referrer's rewards earned
          const { data: currentProfile } = await supabase
            .from('profiles')
            .select('referral_rewards_earned')
            .eq('user_id', referrer_id)
            .single();

          await supabase
            .from('profiles')
            .update({ 
              referral_rewards_earned: (currentProfile?.referral_rewards_earned || 0) + REF_CREDITS_FIRST_PURCHASE_INVITER
            })
            .eq('user_id', referrer_id);
        }
        break;

      case 'first_subscription':
        // Check if this is the first subscription reward for this user
        const { data: existingSubReward } = await supabase
          .from('wallet_ledger')
          .select('id')
          .eq('user_id', user_id)
          .eq('kind', 'referral_reward')
          .eq('description', 'Subscription start bonus')
          .limit(1);

        if (!existingSubReward || existingSubReward.length === 0) {
          transactions.push({
            user_id: user_id,
            amount_credits: REF_CREDITS_FIRST_SUB_BOTH,
            kind: 'referral_reward',
            description: 'Subscription start bonus',
          });

          transactions.push({
            user_id: referrer_id,
            amount_credits: REF_CREDITS_FIRST_SUB_BOTH,
            kind: 'referral_reward',
            description: 'Friend subscription bonus',
          });

          // Update referrer's rewards earned
          const { data: currentProfile } = await supabase
            .from('profiles')
            .select('referral_rewards_earned')
            .eq('user_id', referrer_id)
            .single();

          await supabase
            .from('profiles')
            .update({ 
              referral_rewards_earned: (currentProfile?.referral_rewards_earned || 0) + REF_CREDITS_FIRST_SUB_BOTH
            })
            .eq('user_id', referrer_id);
        }
        break;

      case 'share_signup':
        transactions.push({
          user_id: referrer_id,
          amount_credits: REF_CREDITS_SHARE_SIGNUP,
          kind: 'referral_reward',
          description: 'Share link signup bonus',
        });

        // Update referrer's rewards earned
        const { data: currentProfile } = await supabase
          .from('profiles')
          .select('referral_rewards_earned')
          .eq('user_id', referrer_id)
          .single();

        await supabase
          .from('profiles')
          .update({ 
            referral_rewards_earned: (currentProfile?.referral_rewards_earned || 0) + REF_CREDITS_SHARE_SIGNUP
          })
          .eq('user_id', referrer_id);
        break;
    }

    // Execute wallet transactions
    if (transactions.length > 0) {
      const { error: ledgerError } = await supabase
        .from('wallet_ledger')
        .insert(transactions);

      if (ledgerError) {
        console.error('Error inserting wallet transactions:', ledgerError);
        throw ledgerError;
      }

      // Log analytics events
      const analyticsEvents = transactions.map(tx => ({
        user_id: tx.user_id,
        event_name: 'referral_reward_earned',
        metadata: {
          event_type,
          amount_credits: tx.amount_credits,
          referrer_id: referrer_id,
          referred_user_id: user_id
        }
      }));

      await supabase
        .from('analytics_events')
        .insert(analyticsEvents);

      console.log('Referral rewards processed successfully:', transactions);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Referral rewards processed',
        rewards_awarded: transactions.length 
      }),
      { 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders 
        } 
      }
    );

  } catch (error) {
    console.error('Error processing referral rewards:', error);
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