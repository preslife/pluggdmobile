import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Contact = {
  email: string | null;
  full_name: string | null;
  username: string | null;
  sources: string[];
  last_interaction: string | null;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const authClient = createClient(supabaseUrl, anonKey);
    const serviceClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: authData, error: authError } = await authClient.auth.getUser(token);
    if (authError || !authData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const body = await req.json();
    const creatorId = body.creator_id || authData.user.id;
    const segmentId = body.segment_id || null;

    const { data: connection, error: connectionError } = await serviceClient
      .from('social_connections')
      .select('*')
      .eq('user_id', creatorId)
      .eq('provider', 'substack')
      .maybeSingle();

    if (connectionError) {
      throw new Error(`Failed to fetch Substack connection: ${connectionError.message}`);
    }

    if (!connection) {
      return new Response(JSON.stringify({ error: 'Substack not connected' }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { data: contacts, error: contactsError } = await serviceClient.rpc('get_crm_contacts', {
      p_creator_id: creatorId
    });

    if (contactsError) {
      throw new Error(`Failed to load contacts: ${contactsError.message}`);
    }

    let filteredContacts: Contact[] = contacts ?? [];

    if (segmentId) {
      const { data: members, error: membersError } = await serviceClient
        .from('crm_segment_members')
        .select('contact_id')
        .eq('segment_id', segmentId);

      if (membersError) {
        throw new Error(`Failed to fetch segment membership: ${membersError.message}`);
      }

      const allowedIds = new Set((members || []).map((member) => member.contact_id));
      filteredContacts = (contacts || []).filter((contact: any) => allowedIds.has(contact.contact_id));
    }

    const prepared = filteredContacts
      .filter((contact: any) => contact.email || contact.username)
      .map((contact: any) => ({
        email: contact.email || `${contact.username ?? 'fan'}@pluggd.app`,
        first_name: contact.full_name?.split(' ')[0] ?? contact.username ?? 'Fan',
        last_name: contact.full_name?.split(' ').slice(1).join(' ') ?? '',
        tags: contact.sources || [],
        last_interaction: contact.last_interaction
      }));

    if (prepared.length >= 500) {
      await serviceClient.rpc('log_system_event', {
        p_level: 1,
        p_message: `Large Substack sync queued (${prepared.length} contacts)`,
        p_component: 'crm',
        p_action: 'substack_sync',
        p_metadata: {
          creator_id: creatorId,
          segment_id: segmentId,
          connection_id: connection.id
        },
        p_user_id: authData.user.id
      });
    }

    // Simulate Substack sync; in production this would call Substack APIs.
    // We simply return summary information for now.

    return new Response(JSON.stringify({
      success: true,
      total_contacts: filteredContacts.length,
      prepared_contacts: prepared.length,
      connection_id: connection.id
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200
    });
  } catch (error) {
    console.error('[substack-sync-audience] error', error);
    return new Response(JSON.stringify({ error: error.message ?? 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
