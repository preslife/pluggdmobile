import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PLUG-AUTOMATION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Starting PLUG automation runner");
    
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get all enabled schedules that are due to run
    const { data: schedules, error: schedulesError } = await supabaseClient
      .from('plug_schedules')
      .select('*')
      .eq('is_enabled', true)
      .lte('next_run_at', new Date().toISOString());

    if (schedulesError) {
      throw new Error(`Failed to fetch schedules: ${schedulesError.message}`);
    }

    logStep("Found schedules to process", { count: schedules?.length || 0 });

    for (const schedule of schedules || []) {
      try {
        logStep("Processing schedule", { id: schedule.id, type: schedule.automation_type });

        switch (schedule.automation_type) {
          case 'scheduled_post':
            await handleScheduledPost(supabaseClient, schedule);
            break;
          case 'auto_reply':
            await handleAutoReply(supabaseClient, schedule);
            break;
          case 'smart_drop':
            await handleSmartDrop(supabaseClient, schedule);
            break;
        }

        // Update next_run_at based on config
        const nextRunAt = calculateNextRun(schedule);
        if (nextRunAt) {
          await supabaseClient
            .from('plug_schedules')
            .update({ next_run_at: nextRunAt })
            .eq('id', schedule.id);
        } else {
          // One-time automation, disable it
          await supabaseClient
            .from('plug_schedules')
            .update({ is_enabled: false })
            .eq('id', schedule.id);
        }

        logStep("Schedule processed successfully", { id: schedule.id });
      } catch (error) {
        logStep("Error processing schedule", { id: schedule.id, error: error.message });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: schedules?.length || 0 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    logStep("ERROR in automation runner", { message: error.message });
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

async function handleScheduledPost(supabaseClient: any, schedule: any) {
  const config = schedule.config_json;
  
  // Create community post
  const { error } = await supabaseClient
    .from('community_posts')
    .insert({
      creator_id: schedule.user_id,
      body: config.content,
      media_path: config.media_path || null
    });

  if (error) {
    throw new Error(`Failed to create scheduled post: ${error.message}`);
  }

  logStep("Created scheduled post", { scheduleId: schedule.id });
}

async function handleAutoReply(supabaseClient: any, schedule: any) {
  const config = schedule.config_json;
  
  // Check for new comments matching trigger phrases
  const { data: comments, error } = await supabaseClient
    .from('comments')
    .select('*')
    .gte('created_at', new Date(Date.now() - 60000).toISOString()) // Last minute
    .not('user_id', 'eq', schedule.user_id); // Don't reply to own comments

  if (error) {
    throw new Error(`Failed to fetch comments: ${error.message}`);
  }

  for (const comment of comments || []) {
    const content = comment.content.toLowerCase();
    const shouldReply = config.trigger_phrases?.some((phrase: string) => 
      content.includes(phrase.toLowerCase())
    );

    if (shouldReply) {
      // Check if we already replied to this comment
      const { data: existingReply } = await supabaseClient
        .from('comments')
        .select('id')
        .eq('post_id', comment.post_id)
        .eq('user_id', schedule.user_id)
        .gte('created_at', comment.created_at)
        .limit(1);

      if (!existingReply?.length) {
        await supabaseClient
          .from('comments')
          .insert({
            post_id: comment.post_id,
            user_id: schedule.user_id,
            content: config.reply_text
          });

        logStep("Created auto-reply", { commentId: comment.id });
      }
    }
  }
}

async function handleSmartDrop(supabaseClient: any, schedule: any) {
  const config = schedule.config_json;
  
  // Publish release by updating status
  const { error } = await supabaseClient
    .from('releases')
    .update({
      status: 'live',
      scheduled_publish_date: null,
      release_date: new Date().toISOString()
    })
    .eq('id', config.release_id)
    .eq('user_id', schedule.user_id);

  if (error) {
    throw new Error(`Failed to publish smart drop: ${error.message}`);
  }

  logStep("Published smart drop", { releaseId: config.release_id });
}

function calculateNextRun(schedule: any): string | null {
  const config = schedule.config_json;
  
  if (config.frequency === 'once') {
    return null; // One-time automation
  }
  
  const now = new Date();
  
  switch (config.frequency) {
    case 'daily':
      return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    case 'weekly':
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    case 'monthly':
      const nextMonth = new Date(now);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      return nextMonth.toISOString();
    default:
      return null;
  }
}