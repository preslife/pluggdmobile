import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ContestReminder {
  id: string;
  contest_id: string;
  user_id: string;
  created_at: string;
  reminded_at: string | null;
}

interface Contest {
  id: string;
  title: string;
  description: string;
  start_date: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting contest reminder check...');

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get current date (no time, just date)
    const today = new Date().toISOString().split('T')[0];
    console.log('Checking for contests starting today:', today);

    // Find contests starting today that haven't been processed yet
    const { data: contestsStartingToday, error: contestsError } = await supabase
      .from('contests')
      .select('id, title, description, start_date')
      .gte('start_date', `${today}T00:00:00`)
      .lt('start_date', `${today}T23:59:59`)
      .eq('status', 'active');

    if (contestsError) {
      console.error('Error fetching contests:', contestsError);
      throw contestsError;
    }

    console.log(`Found ${contestsStartingToday?.length || 0} contests starting today`);

    if (!contestsStartingToday || contestsStartingToday.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No contests starting today' }),
        { 
          status: 200, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    let totalNotificationsSent = 0;

    // Process each contest
    for (const contest of contestsStartingToday) {
      console.log(`Processing reminders for contest: ${contest.title}`);

      // Get all reminders for this contest that haven't been sent yet
      const { data: reminders, error: remindersError } = await supabase
        .from('contest_reminders')
        .select('*')
        .eq('contest_id', contest.id)
        .is('reminded_at', null);

      if (remindersError) {
        console.error(`Error fetching reminders for contest ${contest.id}:`, remindersError);
        continue;
      }

      if (!reminders || reminders.length === 0) {
        console.log(`No pending reminders for contest: ${contest.title}`);
        continue;
      }

      console.log(`Found ${reminders.length} pending reminders for contest: ${contest.title}`);

      // Send notifications to each user
      for (const reminder of reminders) {
        try {
          // Create database notification
          const { error: notificationError } = await supabase
            .from('notifications')
            .insert({
              user_id: reminder.user_id,
              type: 'contest_reminder',
              title: 'Contest Starting Now!',
              message: `${contest.title} has started. Join now and submit your entry!`,
              data: {
                contest_id: contest.id,
                contest_title: contest.title
              }
            });

          if (notificationError) {
            console.error(`Error creating notification for user ${reminder.user_id}:`, notificationError);
            continue;
          }

          // Try to send push notification
          try {
            const { error: pushError } = await supabase.functions.invoke('send-push-notification', {
              body: {
                userId: reminder.user_id,
                title: 'Contest Starting Now!',
                body: `${contest.title} has started. Join now and submit your entry!`,
                data: {
                  contest_id: contest.id,
                  contest_title: contest.title
                }
              }
            });

            if (pushError) {
              console.error(`Error sending push notification to user ${reminder.user_id}:`, pushError);
            }
          } catch (pushError) {
            console.error(`Push notification failed for user ${reminder.user_id}:`, pushError);
            // Continue even if push fails - database notification was created
          }

          // Mark reminder as sent
          const { error: updateError } = await supabase
            .from('contest_reminders')
            .update({ reminded_at: new Date().toISOString() })
            .eq('id', reminder.id);

          if (updateError) {
            console.error(`Error updating reminder ${reminder.id}:`, updateError);
          } else {
            totalNotificationsSent++;
            console.log(`Successfully sent reminder to user ${reminder.user_id} for contest ${contest.title}`);
          }

        } catch (error) {
          console.error(`Error processing reminder ${reminder.id}:`, error);
        }
      }
    }

    console.log(`Contest reminder check completed. Total notifications sent: ${totalNotificationsSent}`);

    return new Response(
      JSON.stringify({ 
        message: 'Contest reminder check completed',
        contests_processed: contestsStartingToday.length,
        notifications_sent: totalNotificationsSent
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    );

  } catch (error: any) {
    console.error('Error in send-contest-reminders function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);