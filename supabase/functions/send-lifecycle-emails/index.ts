import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "npm:resend@2.0.0";
import { createPreferenceCache, executeWithNotificationPreference, NotificationPreferenceKey } from "../_shared/notificationPreferences.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailRequest {
  user_id?: string | null;
  email_type:
    | 'creator_welcome'
    | 'creator_first_earnings'
    | 'creator_grow_faster'
    | 'creator_audience_insights'
    | 'fan_welcome'
    | 'fan_new_from_creators'
    | 'fan_unlock_perks'
    | 'fan_your_library'
    | 'fan_tip_receipt'
    | 'creator_tip_notification'
    | 'label_team_invite'
    | 'live_session_reminder';
  user_data?: any;
}

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// Helper function to format credits with GBP
const formatCredits = (credits: number) => {
  const gbp = (credits / 100).toFixed(2);
  return `${credits.toLocaleString()} credits (£${gbp})`;
};

const emailTemplates: Record<EmailRequest['email_type'], { subject: string | ((data: any) => string); html: (data: any) => string }> = {
  creator_welcome: {
    subject: "Welcome to Pluggd - Start Earning with Your Music! 🎵",
    html: (data: any) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">Welcome to Pluggd!</h1>
        <p>Hi ${data.name || 'Creator'},</p>
        <p>Start earning with your beats and grow your audience!</p>
        <p><a href="${data.dashboard_url}" style="color: #2563eb;">Visit Dashboard</a></p>
        <p>Best regards,<br>The Pluggd Team</p>
      </div>
    `
  },
  creator_first_earnings: {
    subject: "🎉 Congratulations on Your First Earnings!",
    html: (data: any) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #16a34a;">First Earnings! 🎉</h1>
        <p>Hi ${data.name || 'Creator'},</p>
        <p>You earned ${formatCredits(data.credits_earned || 0)}!</p>
        <p><a href="${data.wallet_url}" style="color: #2563eb;">View Wallet</a></p>
        <p>Best regards,<br>The Pluggd Team</p>
      </div>
    `
  },
  creator_grow_faster: {
    subject: "🚀 Ready to Grow Your Audience Faster?",
    html: (data: any) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">Grow Faster! 🚀</h1>
        <p>Hi ${data.name || 'Creator'},</p>
        <p>Share your referral link: ${data.referral_link}</p>
        <p>Best regards,<br>The Pluggd Team</p>
      </div>
    `
  },
  creator_audience_insights: {
    subject: "📊 Your Monthly Creator Insights",
    html: (data: any) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">Monthly Report 📊</h1>
        <p>Hi ${data.name || 'Creator'},</p>
        <p>Monthly earnings: ${formatCredits(data.monthly_earnings || 0)}</p>
        <p>Best regards,<br>The Pluggd Team</p>
      </div>
    `
  },
  fan_welcome: {
    subject: "Welcome to Pluggd - Discover Amazing Music! 🎵",
    html: (data: any) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">Welcome to Pluggd!</h1>
        <p>Hi ${data.name || 'Music Lover'},</p>
        <p>Discover exclusive music and beats!</p>
        <p><a href="${data.browse_url}" style="color: #2563eb;">Browse Music</a></p>
        <p>Best regards,<br>The Pluggd Team</p>
      </div>
    `
  },
  fan_new_from_creators: {
    subject: "🎵 New Music from Creators You Follow",
    html: (data: any) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">New Music! 🎵</h1>
        <p>Hi ${data.name || 'Music Lover'},</p>
        <p>Check out fresh releases from your favorite creators!</p>
        <p><a href="${data.marketplace_url}" style="color: #2563eb;">Visit Marketplace</a></p>
        <p>Best regards,<br>The Pluggd Team</p>
      </div>
    `
  },
  fan_unlock_perks: {
    subject: "🔓 Unlock Premium Perks with Credits!",
    html: (data: any) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #7c3aed;">Unlock Perks! 🔓</h1>
        <p>Hi ${data.name || 'Music Lover'},</p>
        <p>Use your ${formatCredits(data.current_balance || 0)} for premium content!</p>
        <p><a href="${data.marketplace_url}" style="color: #2563eb;">Visit Marketplace</a></p>
        <p>Best regards,<br>The Pluggd Team</p>
      </div>
    `
  },
  fan_your_library: {
    subject: "🎵 Your Growing Music Library", 
    html: (data: any) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">Your Library! 🎵</h1>
        <p>Hi ${data.name || 'Music Lover'},</p>
        <p>Your collection is growing! Total tracks: ${data.total_tracks || 1}</p>
        <p><a href="${data.marketplace_url}" style="color: #2563eb;">Explore More</a></p>
      <p>Best regards,<br>The Pluggd Team</p>
      </div>
    `
  },
  fan_tip_receipt: {
    subject: (data: any) => `Thanks for supporting ${data.artist_name || 'a creator'} ❤️`,
    html: (data: any) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">You just tipped ${data.artist_name || 'a creator'}!</h1>
        <p>Hi ${data.name || 'music lover'},</p>
        <p>Thank you for sending <strong>£${Number(data.amount ?? 0).toFixed(2)}</strong> to ${data.artist_name || 'this artist'} on Pluggd.</p>
        ${data.message ? `<blockquote style="border-left: 2px solid #2563eb; margin: 16px 0; padding: 8px 16px; color: #4b5563;">“${data.message}”</blockquote>` : ''}
        <p>Your support means the world. You can view the creator's page here:</p>
        <p><a href="${data.artist_url}" style="color: #2563eb;">Visit ${data.artist_name || 'creator'} on Pluggd</a></p>
        <p>Best regards,<br>The Pluggd Team</p>
      </div>
    `
  },
  creator_tip_notification: {
    subject: (data: any) => `You received a £${Number(data.amount ?? 0).toFixed(2)} tip on Pluggd!`,
    html: (data: any) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #16a34a;">You have a new tip!</h1>
        <p>Hi ${data.name || 'creator'},</p>
        <p>${data.fan_name ? `${data.fan_name} just tipped you` : 'You just received a new tip'} for <strong>£${Number(data.amount ?? 0).toFixed(2)}</strong>.</p>
        ${data.message ? `<p style="margin: 16px 0; color: #4b5563;">They said: “${data.message}”</p>` : ''}
        <p>You can view your tip history at any time:</p>
        <p><a href="${data.dashboard_url}" style="color: #2563eb;">Open your creator dashboard</a></p>
        <p>Keep creating magic,<br>The Pluggd Team</p>
      </div>
    `
  },
  label_team_invite: {
    subject: (data: any) => `You're invited to join ${data.label_name || 'a label team'} on Pluggd`,
    html: (data: any) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">Join ${data.label_name || 'the team'} on Pluggd</h1>
        <p>Hi ${data.invitee_email || 'there'},</p>
        <p>${data.invited_by_name ? `${data.invited_by_name} has` : 'You have'} invited you to collaborate as a <strong>${(data.role || 'team member').replace('_', ' ')}</strong>.</p>
        <p style="margin: 24px 0;">
          <a 
            href="${data.invite_url}" 
            style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: #ffffff; border-radius: 6px; text-decoration: none;"
          >
            Accept invitation
          </a>
        </p>
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #2563eb;">${data.invite_url}</p>
        <p style="margin-top: 24px;">Looking forward to building something great together!<br>The Pluggd Team</p>
      </div>
    `
  },
  live_session_reminder: {
    subject: (data: any) => {
      const title = data.session_title || 'your live session';
      const prefix = data.reminder_type === '24h' ? '24 hour reminder' : 'Starting soon';
      return `${prefix}: ${title}`;
    },
    html: (data: any) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">${data.session_title || 'Upcoming live session'}</h1>
        <p style="margin-bottom: 16px;">This is your ${data.reminder_type === '24h' ? '24 hour' : '1 hour'} reminder.</p>
        <p style="margin-bottom: 16px;">Start time: ${data.scheduled_at ? new Date(data.scheduled_at).toLocaleString() : 'Check your dashboard'}</p>
        ${data.ics_url ? `<p style="margin-bottom: 16px;"><a href="${data.ics_url}" style="color: #2563eb;">Add to calendar (.ics)</a></p>` : ''}
        <p style="margin-bottom: 16px;">We'll notify you again just before we go live. See you there!</p>
        <p style="color: #6b7280; font-size: 12px;">If you no longer plan to attend you can manage reminders from your Pluggd dashboard.</p>
      </div>
    `
  }
};

const emailPreferenceMap: Partial<Record<EmailRequest['email_type'], NotificationPreferenceKey>> = {
  fan_tip_receipt: 'notify_purchases',
  creator_tip_notification: 'notify_supporters',
  fan_welcome: 'notify_email_marketing',
  fan_new_from_creators: 'notify_email_marketing',
  fan_unlock_perks: 'notify_email_marketing',
  fan_your_library: 'notify_email_marketing',
  creator_welcome: 'notify_email_marketing',
  creator_first_earnings: 'notify_email_marketing',
  creator_grow_faster: 'notify_email_marketing',
  creator_audience_insights: 'notify_email_marketing',
  live_session_reminder: 'notify_live_sessions',
};

const preferenceCache = createPreferenceCache();

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

    const { user_id, email_type, user_data }: EmailRequest = await req.json();

    console.log(`Sending lifecycle email: ${email_type} ${user_id ? `for user ${user_id}` : ''}`);

    let profile: any = null;
    let userEmail: string | null = null;

    if (user_id) {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user_id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') throw profileError;
      profile = profileData;

      const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(user_id);
      if (authError && authError.message !== 'User not found') throw authError;
      userEmail = authUser?.user?.email ?? null;
    }

    const recipientEmail = user_data?.invitee_email || userEmail;
    if (!recipientEmail) throw new Error('Recipient email not provided');

    const profileName = profile?.full_name || profile?.username;
    // Prepare email data
    const siteUrl = Deno.env.get('SITE_URL') || 'https://yourdomain.com';

    const emailData = {
      name: profileName,
      referral_link: profile?.referral_code ? `${siteUrl}?ref=${profile.referral_code}` : `${siteUrl}`,
      dashboard_url: `${siteUrl}/dashboard`,
      wallet_url: `${siteUrl}/dashboard/wallet`,
      browse_url: `${siteUrl}/browse`,
      marketplace_url: `${siteUrl}/marketplace`,
      ...user_data
    };

    const template = emailTemplates[email_type];
    if (!template) {
      throw new Error(`Unknown email type: ${email_type}`);
    }

    const subject = typeof template.subject === 'function' ? template.subject(emailData) : template.subject;

    const sendEmail = async () => {
      const { data: result, error: emailError } = await resend.emails.send({
        from: "Pluggd <no-reply@resend.dev>",
        to: [recipientEmail],
        subject,
        html: template.html(emailData),
      });

      if (emailError) throw emailError;
      return result;
    };

    const preferenceKey = user_id ? emailPreferenceMap[email_type] : undefined;

    let emailResult: { id?: string } | null = null;

    if (user_id && preferenceKey) {
      const preferenceResult = await executeWithNotificationPreference(
        supabase as any,
        preferenceCache,
        user_id,
        preferenceKey,
        sendEmail,
      );

      if (preferenceResult.skipped) {
        console.log('Lifecycle email skipped due to preferences', { user_id, email_type, preferenceKey });
        return new Response(
          JSON.stringify({
            success: true,
            skipped: true,
            email_type,
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          },
        );
      }

      emailResult = preferenceResult.result ?? null;
    } else {
      emailResult = await sendEmail();
    }

    if (user_id) {
      await supabase
        .from('analytics_events')
        .insert({
          user_id,
          event_name: 'lifecycle_email_sent',
          properties: {
            email_type,
            email_id: emailResult?.id,
            recipient_email: recipientEmail
          }
        });
    }

    console.log(`Lifecycle email sent successfully: ${email_type}`);

    return new Response(
      JSON.stringify({
        success: true,
        email_id: emailResult?.id,
        email_type
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error sending lifecycle email:', error);
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
