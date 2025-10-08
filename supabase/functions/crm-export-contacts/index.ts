import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Contact = {
  contact_id: string;
  email: string | null;
  username: string | null;
  full_name: string | null;
  sources: string[];
  total_spend: number | null;
  lifetime_value: number | null;
  last_interaction: string | null;
  first_interaction: string | null;
  order_count: number | null;
  follower_since: string | null;
  membership_status: string | null;
  membership_value: number | null;
  membership_since: string | null;
  student_value: number | null;
  student_since: string | null;
};

const toCsv = (rows: Contact[]) => {
  const header = [
    "Email",
    "Username",
    "Full Name",
    "Sources",
    "Total Spend",
    "Lifetime Value",
    "Last Interaction",
    "First Interaction",
    "Orders",
    "Follower Since",
    "Membership Status",
    "Membership Value",
    "Membership Since",
    "Student Value",
    "Student Since"
  ];

  const formatted = rows.map((row) => [
    row.email ?? "",
    row.username ?? "",
    row.full_name ?? "",
    (row.sources || []).join(";"),
    (row.total_spend ?? 0).toFixed(2),
    (row.lifetime_value ?? 0).toFixed(2),
    row.last_interaction ?? "",
    row.first_interaction ?? "",
    String(row.order_count ?? 0),
    row.follower_since ?? "",
    row.membership_status ?? "",
    (row.membership_value ?? 0).toFixed(2),
    row.membership_since ?? "",
    (row.student_value ?? 0).toFixed(2),
    row.student_since ?? ""
  ]);

  const csv = [header, ...formatted]
    .map((row) => row.map((value) => {
      if (value.includes(",") || value.includes("\"")) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(","))
    .join("\n");

  return csv;
};

const applyFilters = (contacts: Contact[], filters: Record<string, unknown>) => {
  return contacts.filter((contact) => {
    if (filters?.sources && Array.isArray(filters.sources)) {
      const sources = contact.sources || [];
      if (!sources.some((source) => filters.sources.includes(source))) {
        return false;
      }
    }

    if (typeof filters?.min_total_spend === "number") {
      if ((contact.total_spend ?? 0) < (filters.min_total_spend as number)) {
        return false;
      }
    }

    if (typeof filters?.max_days_since_last_interaction === "number") {
      if (!contact.last_interaction) {
        return false;
      }
      const last = new Date(contact.last_interaction).getTime();
      const cutoff = Date.now() - (filters.max_days_since_last_interaction as number) * 24 * 60 * 60 * 1000;
      if (last < cutoff) {
        return false;
      }
    }

    if (filters?.membership_status && typeof filters.membership_status === "string") {
      if ((contact.membership_status ?? "") !== filters.membership_status) {
        return false;
      }
    }

    if (typeof filters?.min_orders === "number") {
      if ((contact.order_count ?? 0) < (filters.min_orders as number)) {
        return false;
      }
    }

    if (filters?.query && typeof filters.query === "string") {
      const needle = filters.query.toLowerCase();
      const haystack = [contact.email, contact.username, contact.full_name]
        .filter(Boolean)
        .map((value) => value!.toLowerCase())
        .join(" ");
      if (!haystack.includes(needle)) {
        return false;
      }
    }

    return true;
  });
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
    const { data: userData, error: authError } = await authClient.auth.getUser(token);
    if (authError || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const body = await req.json();
    const creatorId = body.creator_id || userData.user.id;
    const filters = body.filters || {};
    const segmentId = body.segment_id || null;

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

      const allowedIds = new Set((members || []).map((m) => m.contact_id));
      filteredContacts = filteredContacts.filter((contact) => allowedIds.has(contact.contact_id));
    }

    filteredContacts = applyFilters(filteredContacts, filters);

    const csv = toCsv(filteredContacts);

    if (filteredContacts.length >= 500) {
      await serviceClient.rpc('log_system_event', {
        p_level: 1,
        p_message: `Large CRM export triggered (${filteredContacts.length} contacts)`,
        p_component: 'crm',
        p_action: 'export_csv',
        p_metadata: {
          filters,
          segment_id: segmentId,
          creator_id: creatorId
        },
        p_user_id: userData.user.id
      });
    }

    return new Response(JSON.stringify({
      csv,
      count: filteredContacts.length
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200
    });
  } catch (error) {
    console.error('[crm-export-contacts] error', error);
    return new Response(JSON.stringify({ error: error.message ?? 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
