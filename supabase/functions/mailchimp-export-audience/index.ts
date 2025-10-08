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

type CRMContact = {
  contact_id: string
  email: string | null
  username: string | null
  full_name: string | null
  sources: string[] | null
  total_spend: number | null
  lifetime_value: number | null
}

const SOURCE_TAG_MAP: Record<string, string> = {
  follower: 'pluggd_follower',
  customer: 'pluggd_customer',
  member: 'pluggd_member',
  student: 'pluggd_student',
}

const resolveEmail = (contact: CRMContact) => {
  if (contact.email && contact.email.trim()) {
    return contact.email.trim().toLowerCase()
  }

  if (contact.username && contact.username.trim()) {
    return `${contact.username.trim().toLowerCase()}@pluggd.app`
  }

  return `crm-contact-${contact.contact_id}@pluggd.app`
}

const buildMergeFields = (contact: CRMContact) => {
  const mergeFields: MailchimpMember['merge_fields'] = {}
  const fullName = contact.full_name?.trim() ?? ''

  if (fullName) {
    const [first, ...rest] = fullName.split(' ').filter(Boolean)
    if (first) {
      mergeFields.FNAME = first
    }
    if (rest.length) {
      mergeFields.LNAME = rest.join(' ')
    }
  } else if (contact.username) {
    mergeFields.FNAME = contact.username
  }

  if (!mergeFields.FNAME) {
    mergeFields.FNAME = 'Fan'
  }

  return mergeFields
}

const buildTags = (contact: CRMContact, segmentIdentifier: string | null) => {
  const tags = new Set<string>(['pluggd_contact', 'enhanced_crm'])
  const sources = contact.sources ?? []

  for (const source of sources) {
    const normalized = source.toLowerCase()
    tags.add(`crm_${normalized}`)
    const mapped = SOURCE_TAG_MAP[normalized]
    if (mapped) {
      tags.add(mapped)
    }
  }

  const spend = contact.lifetime_value ?? contact.total_spend ?? 0
  if (spend >= 100) {
    tags.add('crm_high_value')
  }

  if (segmentIdentifier) {
    tags.add(`segment:${segmentIdentifier}`)
  }

  return tags
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

    const { creator_id, segment_id } = await req.json()
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

    const { data: contacts, error: contactsError } = await supabase.rpc('get_crm_contacts', {
      p_creator_id: targetCreatorId
    })

    if (contactsError) {
      throw new Error(`Failed to load CRM contacts: ${contactsError.message}`)
    }

    let segmentTag: string | null = null
    let segmentIdentifier: string | null = null
    const contactsList = (contacts ?? []) as CRMContact[]
    let filteredContacts: CRMContact[] = contactsList

    if (segment_id) {
      const { data: segment, error: segmentError } = await supabase
        .from('crm_segments')
        .select('id, creator_id, name, manual_contact_ids')
        .eq('id', segment_id)
        .maybeSingle()

      if (segmentError) {
        throw new Error(`Failed to load segment: ${segmentError.message}`)
      }

      if (!segment || segment.creator_id !== targetCreatorId) {
        return new Response('Segment not found', { status: 404, headers: corsHeaders })
      }

      const { data: members, error: membersError } = await supabase
        .from('crm_segment_members')
        .select('contact_id')
        .eq('segment_id', segment_id)

      if (membersError) {
        throw new Error(`Failed to load segment membership: ${membersError.message}`)
      }

      const allowed = new Set<string>()
      members?.forEach((row) => allowed.add(row.contact_id))
      ;(segment.manual_contact_ids ?? []).forEach((id: string) => allowed.add(id))

      filteredContacts = filteredContacts.filter((contact) => allowed.has(contact.contact_id))
      const segmentLabel = segment.name ?? segment.id
      segmentTag = segmentLabel
      segmentIdentifier = segmentLabel
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || segment.id
    }

    // Build audience from CRM rollup
    const audience = new Map<string, MailchimpMember>()

    filteredContacts.forEach((contact) => {
      const email = resolveEmail(contact)
      const emailKey = email.toLowerCase()
      const mergeFields = buildMergeFields(contact)
      const tags = buildTags(contact, segmentIdentifier)

      if (audience.has(emailKey)) {
        const existing = audience.get(emailKey)!
        existing.tags = Array.from(new Set([...existing.tags, ...tags]))
        existing.merge_fields = { ...existing.merge_fields, ...mergeFields }
      } else {
        audience.set(emailKey, {
          email_address: email,
          status: 'subscribed',
          tags: Array.from(tags),
          merge_fields: mergeFields,
        })
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

    if (members.length >= 500) {
      try {
        await supabase.rpc('log_system_event', {
          p_level: 1,
          p_message: segmentTag
            ? `Mailchimp export triggered for segment "${segmentTag}" (${members.length} contacts)`
            : `Mailchimp export triggered (${members.length} contacts)`,
          p_component: 'crm',
          p_action: 'mailchimp_sync',
          p_metadata: {
            segment_id: segment_id ?? null,
            segment_name: segmentTag,
            total_contacts: members.length,
          },
          p_user_id: user.id,
        })
      } catch (logError) {
        console.error('Unable to log Mailchimp export event', logError)
      }
    }

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
      total_audience: members.length,
      segment_id: segment_id ?? null,
      segment_name: segmentTag
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
