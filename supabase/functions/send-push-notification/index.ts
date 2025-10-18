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

    // Get user's push subscriptions
    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from('web_push_subscriptions')
      .select('*')
      .eq('user_id', userId);

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

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No push subscriptions found for user' }),
        { 
          status: 200, 
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

    // Send notifications to all user's subscriptions
    const sendPromises = subscriptions.map(async (subscription) => {
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

    const results = await Promise.all(sendPromises);
    const successCount = results.filter(r => r.success).length;

    // Also create a database notification
    await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type: 'push',
        title,
        message: body,
        data: { url: url || '/' },
      });

    return new Response(
      JSON.stringify({ 
        message: `Push notifications sent`,
        sent: successCount,
        total: subscriptions.length,
        results 
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