import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailRequest {
  user_id: string;
  email_type: 'creator_welcome' | 'creator_first_earnings' | 'creator_grow_faster' | 'creator_audience_insights' |
             'fan_welcome' | 'fan_new_from_creators' | 'fan_unlock_perks' | 'fan_your_library';
  user_data?: any;
}

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// Helper function to format credits with GBP
const formatCredits = (credits: number) => {
  const gbp = (credits / 100).toFixed(2);
  return `${credits.toLocaleString()} credits (£${gbp})`;
};

const emailTemplates = {
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
  }
};

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

    console.log(`Sending lifecycle email: ${email_type} to user ${user_id}`);

    // Get user profile and email
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user_id)
      .single();

    if (profileError) throw profileError;

    // Get user email from auth
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(user_id);
    if (authError) throw authError;

    const userEmail = authUser.user?.email;
    if (!userEmail) throw new Error('User email not found');

    // Prepare email data
    const emailData = {
      name: profile.full_name || profile.username,
      referral_link: `${Deno.env.get('SITE_URL') || 'https://yourdomain.com'}?ref=${profile.referral_code}`,
      dashboard_url: `${Deno.env.get('SITE_URL') || 'https://yourdomain.com'}/dashboard`,
      wallet_url: `${Deno.env.get('SITE_URL') || 'https://yourdomain.com'}/dashboard/wallet`,
      browse_url: `${Deno.env.get('SITE_URL') || 'https://yourdomain.com'}/browse`,
      marketplace_url: `${Deno.env.get('SITE_URL') || 'https://yourdomain.com'}/marketplace`,
      ...user_data
    };

    const template = emailTemplates[email_type];
    if (!template) {
      throw new Error(`Unknown email type: ${email_type}`);
    }

    // Send email via Resend
    const { data: emailResult, error: emailError } = await resend.emails.send({
      from: "9X Music Hub <no-reply@resend.dev>",
      to: [userEmail],
      subject: template.subject,
      html: template.html(emailData),
    });

    if (emailError) throw emailError;

    // Log analytics event
    await supabase
      .from('analytics_events')
      .insert({
        user_id,
        event_name: 'lifecycle_email_sent',
        properties: {
          email_type,
          email_id: emailResult?.id,
          recipient_email: userEmail
        }
      });

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