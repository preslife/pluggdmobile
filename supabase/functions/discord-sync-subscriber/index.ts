import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DiscordRoleMapping {
  [tierName: string]: string // tier name -> role ID
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

    const { creator_id, fan_user_id, action = 'sync' } = await req.json()

    if (!creator_id || !fan_user_id) {
      return new Response('Missing required parameters', { status: 400, headers: corsHeaders })
    }

    console.log(`Discord role sync for creator ${creator_id}, fan ${fan_user_id}, action: ${action}`)

    // Get creator's Discord configuration
    const { data: creatorProfile } = await supabase
      .from('profiles')
      .select('discord_guild_id, discord_role_map')
      .eq('user_id', creator_id)
      .single()

    if (!creatorProfile?.discord_guild_id || !creatorProfile?.discord_role_map) {
      console.log('Creator Discord not configured')
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Creator Discord not configured'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Get creator's Discord bot token
    const { data: creatorDiscord } = await supabase
      .from('social_connections')
      .select('access_token')
      .eq('user_id', creator_id)
      .eq('provider', 'discord')
      .single()

    if (!creatorDiscord?.access_token) {
      console.log('Creator Discord bot token not found')
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Creator Discord bot not connected'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Get fan's Discord user ID
    const { data: fanDiscord } = await supabase
      .from('social_connections')
      .select('account_id')
      .eq('user_id', fan_user_id)
      .eq('provider', 'discord')
      .single()

    if (!fanDiscord?.account_id) {
      console.log('Fan Discord not connected')
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Fan Discord not connected'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const guildId = creatorProfile.discord_guild_id
    const discordUserId = fanDiscord.account_id
    const botToken = creatorDiscord.access_token
    const roleMap: DiscordRoleMapping = creatorProfile.discord_role_map

    let currentTier = null
    
    if (action === 'sync' || action === 'grant') {
      // Get fan's current active subscription tier
      const { data: subscription } = await supabase
        .from('fan_subscriptions')
        .select(`
          status,
          creator_subscription_tiers(tier_name)
        `)
        .eq('creator_id', creator_id)
        .eq('fan_id', fan_user_id)
        .eq('status', 'active')
        .single()

      if (subscription?.creator_subscription_tiers) {
        currentTier = subscription.creator_subscription_tiers.tier_name
      }
    }

    const results = []

    if (action === 'revoke' || action === 'sync') {
      // Revoke all mapped roles first (for sync or explicit revoke)
      for (const [tierName, roleId] of Object.entries(roleMap)) {
        if (currentTier !== tierName) { // Don't revoke the current tier role in sync
          try {
            const revokeResponse = await supabase.functions.invoke('discord-revoke-role', {
              body: {
                guild_id: guildId,
                discord_user_id: discordUserId,
                role_id: roleId,
                bot_token: botToken
              }
            })
            
            results.push({
              action: 'revoke',
              tier: tierName,
              role_id: roleId,
              success: !revokeResponse.error,
              error: revokeResponse.error?.message
            })
          } catch (error) {
            results.push({
              action: 'revoke',
              tier: tierName,
              role_id: roleId,
              success: false,
              error: error.message
            })
          }
        }
      }
    }

    if ((action === 'grant' || action === 'sync') && currentTier && roleMap[currentTier]) {
      // Grant the current tier role
      const roleId = roleMap[currentTier]
      
      try {
        const grantResponse = await supabase.functions.invoke('discord-grant-role', {
          body: {
            guild_id: guildId,
            discord_user_id: discordUserId,
            role_id: roleId,
            bot_token: botToken
          }
        })
        
        results.push({
          action: 'grant',
          tier: currentTier,
          role_id: roleId,
          success: !grantResponse.error,
          error: grantResponse.error?.message
        })
      } catch (error) {
        results.push({
          action: 'grant',
          tier: currentTier,
          role_id: roleId,
          success: false,
          error: error.message
        })
      }
    }

    const successful = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length

    console.log(`Discord role sync completed: ${successful} successful, ${failed} failed`)

    return new Response(JSON.stringify({
      success: failed === 0,
      current_tier: currentTier,
      results,
      summary: {
        successful,
        failed,
        total: results.length
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Discord sync error:', error)
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})