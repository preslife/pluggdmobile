import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';
import { createPreferenceCache, shouldSendNotification } from "../_shared/notificationPreferences.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushNotificationPayload {
  userId: string;
  title: string;
  body: string;
  tag?: string;
  url?: string;
  actions?: Array<{ action: string; title: string; icon?: string }>;
}

interface MobilePushToken {
  id: string;
  expo_push_token: string;
  platform: 'ios' | 'android';
}

const vapidKeys = {
  publicKey: Deno.env.get('VAPID_PUBLIC_KEY'),
  privateKey: Deno.env.get('VAPID_PRIVATE_KEY'),
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { userId, title, body, tag, url, actions }: PushNotificationPayload = await req.json();

    if (!userId || !title || !body) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userId, title, body' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const preferenceCache = createPreferenceCache();
    const pushEnabled = await shouldSendNotification(
      supabase as any,
      preferenceCache,
      userId,
      'notify_push'
    );

    if (!pushEnabled) {
      console.log(`Skipping push notification for ${userId} due to opt-out`);
      return new Response(
        JSON.stringify({ message: 'User has disabled push notifications' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const [{ data: subscriptions, error: subscriptionsError }, { data: mobileTokens, error: mobileTokensError }] = await Promise.all([
      supabase
        .from('web_push_subscriptions')
        .select('*')
        .eq('user_id', userId),
      supabase
        .from('mobile_push_tokens')
        .select('id,expo_push_token,platform')
        .eq('user_id', userId)
        .eq('is_active', true),
    ]);

    if (subscriptionsError) {
      console.error('Error fetching subscriptions:', subscriptionsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch subscriptions' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (mobileTokensError) {
      console.error('Error fetching mobile push tokens:', mobileTokensError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch mobile push tokens' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Prepare notification payload
    const notificationPayload = {
      title,
      body,
      tag: tag || 'default',
      data: { url: url || '/' },
      actions: actions || [],
    };

    // Send notifications to all user's web subscriptions.
    const sendWebPromises = (subscriptions ?? []).map(async (subscription) => {
      try {
        // Create Web Push notification
        const pushSubscription = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth,
          },
        };

        // Import web-push for sending notifications
        const webpush = await import('https://esm.sh/web-push@3.6.6');
        
        webpush.setVapidDetails(
          'mailto:support@pluggd.com',
          vapidKeys.publicKey!,
          vapidKeys.privateKey!
        );

        const result = await webpush.sendNotification(
          pushSubscription,
          JSON.stringify(notificationPayload)
        );

        console.log('Push notification sent successfully:', result);
        return { success: true, subscription: subscription.id };
      } catch (error) {
        console.error('Error sending push notification:', error);
        
        // If subscription is invalid, remove it from database
        if (error.statusCode === 410 || error.statusCode === 404) {
          await supabase
            .from('web_push_subscriptions')
            .delete()
            .eq('id', subscription.id);
        }
        
        return { success: false, error: error.message, subscription: subscription.id };
      }
    });

    const webResults = await Promise.all(sendWebPromises);

    const mobileResults: Array<{ success: boolean; token?: string; error?: string }> = [];
    const activeMobileTokens = (mobileTokens ?? []) as MobilePushToken[];
    if (activeMobileTokens.length > 0) {
      try {
        const expoPayload = activeMobileTokens.map((token) => ({
          to: token.expo_push_token,
          title,
          body,
          sound: 'default',
          data: {
            url: url || '/',
            tag: tag || 'default',
          },
        }));

        const expoResponse = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(expoPayload),
        });
        const expoJson = await expoResponse.json();
        const expoItems = Array.isArray(expoJson?.data) ? expoJson.data : [];

        for (let index = 0; index < activeMobileTokens.length; index += 1) {
          const token = activeMobileTokens[index];
          const receipt = expoItems[index];
          if (receipt?.status === 'ok') {
            mobileResults.push({ success: true, token: token.id });
            continue;
          }

          const errorCode = receipt?.details?.error ?? receipt?.message ?? 'Expo push failed';
          mobileResults.push({ success: false, token: token.id, error: errorCode });
          if (errorCode === 'DeviceNotRegistered') {
            await supabase
              .from('mobile_push_tokens')
              .update({ is_active: false })
              .eq('id', token.id);
          }
        }
      } catch (error) {
        console.error('Error sending Expo push notification:', error);
        for (const token of activeMobileTokens) {
          mobileResults.push({ success: false, token: token.id, error: error.message });
        }
      }
    }

    const webSuccessCount = webResults.filter(r => r.success).length;
    const mobileSuccessCount = mobileResults.filter(r => r.success).length;

    // Also create a database notification
    await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type: 'push',
        title,
        message: body,
        payload: { url: url || '/' },
      });

    return new Response(
      JSON.stringify({ 
        message: `Push notifications sent`,
        sent: webSuccessCount + mobileSuccessCount,
        web: {
          sent: webSuccessCount,
          total: subscriptions?.length ?? 0,
          results: webResults,
        },
        mobile: {
          sent: mobileSuccessCount,
          total: activeMobileTokens.length,
          results: mobileResults,
        },
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in push notification function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
