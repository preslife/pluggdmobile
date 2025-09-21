import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Starting daily Mailchimp sync cron job')

    // Get all creators with auto-sync enabled
    const { data: autoSyncCreators } = await supabase
      .from('profiles')
      .select('user_id, full_name, mailchimp_list_id')
      .eq('mailchimp_auto_sync', true)
      .not('mailchimp_list_id', 'is', null)

    if (!autoSyncCreators?.length) {
      console.log('No creators with auto-sync enabled')
      return new Response(JSON.stringify({ message: 'No auto-sync creators found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`Found ${autoSyncCreators.length} creators with auto-sync enabled`)

    const results = []

    for (const creator of autoSyncCreators) {
      try {
        console.log(`Processing auto-sync for creator: ${creator.user_id}`)

        // Call the export function for this creator
        const exportResponse = await supabase.functions.invoke('mailchimp-export-audience', {
          body: { creator_id: creator.user_id }
        })

        if (exportResponse.error) {
          console.error(`Export failed for creator ${creator.user_id}:`, exportResponse.error)
          results.push({
            creator_id: creator.user_id,
            success: false,
            error: exportResponse.error.message
          })
        } else {
          console.log(`Export completed for creator ${creator.user_id}`)
          results.push({
            creator_id: creator.user_id,
            success: true,
            data: exportResponse.data
          })
        }

        // Rate limiting between creators
        await new Promise(resolve => setTimeout(resolve, 1000))

      } catch (error) {
        console.error(`Error processing creator ${creator.user_id}:`, error)
        results.push({
          creator_id: creator.user_id,
          success: false,
          error: error.message
        })
      }
    }

    const successful = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length

    console.log(`Cron job completed: ${successful} successful, ${failed} failed`)

    return new Response(JSON.stringify({
      message: 'Mailchimp sync cron completed',
      total_creators: autoSyncCreators.length,
      successful,
      failed,
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Cron job error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})