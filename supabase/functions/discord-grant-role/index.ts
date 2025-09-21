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

    const { guild_id, discord_user_id, role_id, bot_token } = await req.json()

    if (!guild_id || !discord_user_id || !role_id) {
      return new Response('Missing required parameters', { status: 400, headers: corsHeaders })
    }

    console.log(`Granting role ${role_id} to user ${discord_user_id} in guild ${guild_id}`)

    // Discord API call to grant role
    const discordResponse = await fetch(
      `https://discord.com/api/v10/guilds/${guild_id}/members/${discord_user_id}/roles/${role_id}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bot ${bot_token}`,
          'Content-Type': 'application/json',
          'X-Audit-Log-Reason': 'Pluggd subscription role grant'
        }
      }
    )

    if (discordResponse.ok || discordResponse.status === 204) {
      console.log(`Successfully granted role ${role_id} to user ${discord_user_id}`)
      return new Response(JSON.stringify({ 
        success: true,
        message: 'Role granted successfully'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    } else {
      const error = await discordResponse.text()
      console.error(`Discord API error:`, error)
      
      // Handle common Discord errors
      let errorMessage = 'Failed to grant role'
      if (discordResponse.status === 403) {
        errorMessage = 'Bot lacks permission to manage roles'
      } else if (discordResponse.status === 404) {
        errorMessage = 'User not found in server or role does not exist'
      }

      return new Response(JSON.stringify({ 
        success: false,
        error: errorMessage,
        discord_status: discordResponse.status
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

  } catch (error) {
    console.error('Role grant error:', error)
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})