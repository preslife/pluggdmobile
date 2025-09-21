import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MailchimpMember {
  email_address: string
  status: 'subscribed' | 'unsubscribed' | 'cleaned' | 'pending'
  tags: string[]
  merge_fields: {
    FNAME?: string
    LNAME?: string
  }
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

    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user } } = await supabase.auth.getUser(token)

    if (!user) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders })
    }

    const { creator_id } = await req.json()
    const targetCreatorId = creator_id || user.id

    // Get creator's Mailchimp connection
    const { data: mailchimpConnection } = await supabase
      .from('social_connections')
      .select('*')
      .eq('user_id', targetCreatorId)
      .eq('provider', 'mailchimp')
      .single()

    if (!mailchimpConnection) {
      return new Response('Mailchimp not connected', { status: 400, headers: corsHeaders })
    }

    // Get creator's profile with Mailchimp settings
    const { data: profile } = await supabase
      .from('profiles')
      .select('mailchimp_list_id, full_name')
      .eq('user_id', targetCreatorId)
      .single()

    if (!profile?.mailchimp_list_id) {
      return new Response('No Mailchimp list selected', { status: 400, headers: corsHeaders })
    }

    console.log(`Starting audience export for creator ${targetCreatorId}`)

    // Build audience from multiple sources
    const audience = new Map<string, MailchimpMember>()

    // 1. Get followers 
    const { data: followers } = await supabase
      .from('user_follows')
      .select(`
        follower_id,
        profiles!follower_id(full_name, username)
      `)
      .eq('following_id', targetCreatorId)

    // 2. Get active subscribers
    const { data: subscribers } = await supabase
      .from('fan_subscriptions')
      .select(`
        fan_id,
        profiles!fan_id(full_name, username)
      `)
      .eq('creator_id', targetCreatorId)
      .eq('status', 'active')

    // 3. Get unique buyers from orders
    const { data: buyers } = await supabase
      .from('orders')
      .select(`
        user_id,
        profiles!user_id(full_name, username)
      `)
      .eq('seller_id', targetCreatorId)
      .eq('status', 'completed')

    // Process followers
    followers?.forEach((follow: any) => {
      const profile = follow.profiles
      const email = `${profile?.username || 'user'}@pluggd.app` // Placeholder email pattern
      if (!audience.has(email)) {
        audience.set(email, {
          email_address: email,
          status: 'subscribed',
          tags: ['pluggd_follower'],
          merge_fields: {
            FNAME: profile?.full_name?.split(' ')[0] || profile?.username || 'Fan'
          }
        })
      } else {
        audience.get(email)!.tags.push('pluggd_follower')
      }
    })

    // Process subscribers
    subscribers?.forEach((sub: any) => {
      const profile = sub.profiles
      const email = `${profile?.username || 'subscriber'}@pluggd.app`
      if (!audience.has(email)) {
        audience.set(email, {
          email_address: email,
          status: 'subscribed',
          tags: ['pluggd_subscriber'],
          merge_fields: {
            FNAME: profile?.full_name?.split(' ')[0] || profile?.username || 'Subscriber'
          }
        })
      } else {
        audience.get(email)!.tags.push('pluggd_subscriber')
      }
    })

    // Process buyers
    buyers?.forEach((buyer: any) => {
      const profile = buyer.profiles
      const email = `${profile?.username || 'buyer'}@pluggd.app`
      if (!audience.has(email)) {
        audience.set(email, {
          email_address: email,
          status: 'subscribed',
          tags: ['pluggd_buyer'],
          merge_fields: {
            FNAME: profile?.full_name?.split(' ')[0] || profile?.username || 'Customer'
          }
        })
      } else {
        audience.get(email)!.tags.push('pluggd_buyer')
      }
    })

    // Export to Mailchimp in chunks
    const members = Array.from(audience.values())
    const chunkSize = 500 // Mailchimp batch limit
    const chunks = []
    
    for (let i = 0; i < members.length; i += chunkSize) {
      chunks.push(members.slice(i, i + chunkSize))
    }

    const mailchimpApiKey = mailchimpConnection.access_token
    const datacenter = mailchimpConnection.account_id // e.g., "us1"
    const listId = profile.mailchimp_list_id

    let totalProcessed = 0
    let totalErrors = 0

    for (const chunk of chunks) {
      try {
        const batchData = {
          members: chunk.map(member => ({
            ...member,
            status_if_new: 'subscribed'
          })),
          update_existing: true
        }

        const response = await fetch(
          `https://${datacenter}.api.mailchimp.com/3.0/lists/${listId}`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${mailchimpApiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(batchData)
          }
        )

        if (response.ok) {
          totalProcessed += chunk.length
          console.log(`Processed batch of ${chunk.length} members`)
        } else {
          const error = await response.text()
          console.error(`Mailchimp batch error:`, error)
          totalErrors += chunk.length
        }

        // Rate limiting - Mailchimp allows 10 requests per second
        await new Promise(resolve => setTimeout(resolve, 100))

      } catch (error) {
        console.error('Batch processing error:', error)
        totalErrors += chunk.length
      }
    }

    // Update profile status
    const newStatus = totalErrors === 0 ? 'connected' : 'error'
    await supabase
      .from('profiles')
      .update({ mailchimp_status: newStatus })
      .eq('user_id', targetCreatorId)

    console.log(`Export completed: ${totalProcessed} processed, ${totalErrors} errors`)

    return new Response(JSON.stringify({
      success: true,
      processed: totalProcessed,
      errors: totalErrors,
      total_audience: members.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Export error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})