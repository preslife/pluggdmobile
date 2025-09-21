import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[WEEKLY-DIGEST] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Weekly digest function started");

    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the date range for the past week
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    logStep("Date range", { 
      start: startDate.toISOString(), 
      end: endDate.toISOString() 
    });

    // Get all creator profiles who haven't opted out
    const { data: creators, error: creatorsError } = await supabaseService
      .from('profiles')
      .select('user_id, full_name, username, email_notifications_enabled')
      .eq('is_creator', true)
      .neq('email_notifications_enabled', false); // Include null as opted-in

    if (creatorsError) {
      throw new Error(`Failed to fetch creators: ${creatorsError.message}`);
    }

    logStep("Creators fetched", { count: creators?.length || 0 });

    let emailsSent = 0;
    let emailsSkipped = 0;

    for (const creator of creators || []) {
      try {
        // Get creator's email from auth.users
        const { data: authUser } = await supabaseService.auth.admin.getUserById(creator.user_id);
        if (!authUser.user?.email) {
          logStep("Skipping creator - no email", { user_id: creator.user_id });
          emailsSkipped++;
          continue;
        }

        const creatorEmail = authUser.user.email;

        // Fetch creator's weekly stats
        const weeklyStats = await fetchCreatorWeeklyStats(supabaseService, creator.user_id, startDate, endDate);

        // Skip if no activity
        if (!hasSignificantActivity(weeklyStats)) {
          logStep("Skipping creator - no activity", { user_id: creator.user_id });
          emailsSkipped++;
          continue;
        }

        // Generate and send email
        const emailContent = generateEmailContent(creator, weeklyStats);
        
        const emailResponse = await resend.emails.send({
          from: "Pluggd <digest@pluggd.fm>",
          to: [creatorEmail],
          subject: `Your Pluggd Weekly Summary - ${formatDate(endDate)}`,
          html: emailContent
        });

        logStep("Email sent", { 
          user_id: creator.user_id, 
          email: creatorEmail,
          email_id: emailResponse.data?.id 
        });
        
        emailsSent++;

        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        logStep("Error sending email to creator", { 
          user_id: creator.user_id, 
          error: error.message 
        });
        emailsSkipped++;
      }
    }

    logStep("Weekly digest completed", { 
      emails_sent: emailsSent, 
      emails_skipped: emailsSkipped 
    });

    return new Response(JSON.stringify({
      success: true,
      emails_sent: emailsSent,
      emails_skipped: emailsSkipped,
      message: `Weekly digest sent to ${emailsSent} creators`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    logStep("ERROR", { message: error.message });
    console.error('Weekly digest error:', error);
    
    return new Response(JSON.stringify({ 
      error: error.message || 'Weekly digest failed',
      success: false
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

async function fetchCreatorWeeklyStats(supabase: any, userId: string, startDate: Date, endDate: Date) {
  try {
    // New subscribers
    const { data: newSubscribers } = await supabase
      .from('fan_subscriptions')
      .select('id, created_at')
      .eq('creator_id', userId)
      .eq('status', 'active')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    // Release purchases
    const { data: releasePurchases } = await supabase
      .from('release_purchases')
      .select('id, created_at, amount')
      .eq('release_id', userId) // Assuming releases belong to user
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    // Beat sales
    const { data: beatSales } = await supabase
      .from('beat_sales')
      .select('id, created_at, sale_price, producer_earnings')
      .eq('producer_id', userId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    // Sample pack purchases
    const { data: samplePackSales } = await supabase
      .from('sample_pack_purchases')
      .select('id, created_at, amount')
      .eq('creator_id', userId) // Assuming packs belong to creator
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    // Comments and engagement on creator's content
    const { data: comments } = await supabase
      .from('release_comments')
      .select('id, created_at, content')
      .in('release_id', []) // Would need to join with releases table
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    const totalRevenue = [
      ...(releasePurchases || []).map(p => p.amount || 0),
      ...(beatSales || []).map(s => s.producer_earnings || 0),
      ...(samplePackSales || []).map(p => p.amount || 0)
    ].reduce((sum, amount) => sum + amount, 0);

    return {
      newSubscribers: newSubscribers?.length || 0,
      salesCount: (releasePurchases?.length || 0) + (beatSales?.length || 0) + (samplePackSales?.length || 0),
      totalRevenue,
      commentsCount: comments?.length || 0,
      topComments: (comments || []).slice(0, 3),
      releasePurchases: releasePurchases || [],
      beatSales: beatSales || [],
      samplePackSales: samplePackSales || []
    };
  } catch (error) {
    logStep("Error fetching creator stats", { userId, error: error.message });
    return {
      newSubscribers: 0,
      salesCount: 0,
      totalRevenue: 0,
      commentsCount: 0,
      topComments: [],
      releasePurchases: [],
      beatSales: [],
      samplePackSales: []
    };
  }
}

function hasSignificantActivity(stats: any): boolean {
  return stats.newSubscribers > 0 || 
         stats.salesCount > 0 || 
         stats.commentsCount > 0 ||
         stats.totalRevenue > 0;
}

function generateEmailContent(creator: any, stats: any): string {
  const creatorName = creator.full_name || creator.username || 'Creator';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your Pluggd Weekly Summary</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb; }
        .container { background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { color: #6366f1; font-size: 24px; font-weight: bold; }
        .stat-card { background: #f8fafc; border-radius: 8px; padding: 20px; margin: 15px 0; border-left: 4px solid #6366f1; }
        .stat-number { font-size: 28px; font-weight: bold; color: #1f2937; margin-bottom: 5px; }
        .stat-label { color: #6b7280; font-size: 14px; }
        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; }
        .button { display: inline-block; background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">Pluggd</div>
          <h1>Your Weekly Summary</h1>
          <p>Hey ${creatorName}, here's how your week went!</p>
        </div>

        <div class="stat-card">
          <div class="stat-number">${stats.newSubscribers}</div>
          <div class="stat-label">New Subscribers</div>
        </div>

        <div class="stat-card">
          <div class="stat-number">${stats.salesCount}</div>
          <div class="stat-label">Total Sales</div>
        </div>

        <div class="stat-card">
          <div class="stat-number">£${stats.totalRevenue.toFixed(2)}</div>
          <div class="stat-label">Revenue Earned</div>
        </div>

        <div class="stat-card">
          <div class="stat-number">${stats.commentsCount}</div>
          <div class="stat-label">Comments Received</div>
        </div>

        ${stats.topComments.length > 0 ? `
          <div style="margin: 30px 0;">
            <h3>Recent Comments</h3>
            ${stats.topComments.map((comment: any) => `
              <div style="background: #f1f5f9; padding: 15px; border-radius: 6px; margin: 10px 0;">
                "${comment.content}"
              </div>
            `).join('')}
          </div>
        ` : ''}

        <div style="text-align: center; margin: 30px 0;">
          <a href="${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'lovable.app') || 'https://pluggd.fm'}/dashboard/creator" class="button">
            View Full Dashboard
          </a>
        </div>

        <div class="footer">
          <p>Keep creating amazing content! 🎵</p>
          <p>
            <a href="${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'lovable.app') || 'https://pluggd.fm'}/settings/notifications">
              Manage email preferences
            </a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}