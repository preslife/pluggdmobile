import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

type TicketAction = "create" | "update" | "delete";

type TicketPayload = {
  ticket_id?: string;
  session_id?: string;
  price_cents?: number;
  inventory?: number;
  max_per_user?: number | null;
  status?: string;
  tiers?: string[];
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const jsonResponse = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });

const getServiceClient = () =>
  createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    {
      auth: {
        persistSession: false,
      },
    },
  );

const authenticateRequest = async (req: Request, serviceClient: ReturnType<typeof createClient>) => {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    throw new Error("Missing authorization header");
  }

  const token = authHeader.replace("Bearer ", "");
  if (!token) {
    throw new Error("Invalid authorization token");
  }

  const {
    data: { user },
    error,
  } = await serviceClient.auth.getUser(token);

  if (error || !user) {
    throw new Error(error?.message || "Unable to authenticate request");
  }

  return user;
};

const ensureSessionOwnership = async (
  serviceClient: ReturnType<typeof createClient>,
  sessionId: string,
  hostId: string,
) => {
  const { data, error } = await serviceClient
    .from("session_rooms")
    .select("id, host_id")
    .eq("id", sessionId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to verify session ownership: ${error.message}`);
  }

  if (!data || data.host_id !== hostId) {
    throw new Error("You do not have permission to manage tickets for this session");
  }
};

const ensureTicketOwnership = async (
  serviceClient: ReturnType<typeof createClient>,
  ticketId: string,
  hostId: string,
) => {
  const { data, error } = await serviceClient
    .from("live_tickets")
    .select("id, session_id")
    .eq("id", ticketId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to verify ticket: ${error.message}`);
  }

  if (!data) {
    throw new Error("Ticket not found");
  }

  await ensureSessionOwnership(serviceClient, data.session_id, hostId);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  const serviceClient = getServiceClient();

  try {
    const user = await authenticateRequest(req, serviceClient);
    const body = await req.json().catch(() => ({}));

    const action: TicketAction | undefined = body?.action;
    const payload: TicketPayload = body?.payload ?? {};

    if (!action) {
      throw new Error("Action is required");
    }

    if (action === "create") {
      if (!payload.session_id) {
        throw new Error("session_id is required to create a ticket");
      }

      await ensureSessionOwnership(serviceClient, payload.session_id, user.id);

      const insertPayload = {
        session_id: payload.session_id,
        host_id: user.id,
        price_cents: payload.price_cents ?? 0,
        inventory: payload.inventory ?? 0,
        max_per_user: payload.max_per_user ?? null,
        status: payload.status ?? "draft",
        tiers: payload.tiers ?? null,
      };

      const { data, error } = await serviceClient
        .from("live_tickets")
        .insert(insertPayload)
        .select("id, session_id, host_id, price_cents, inventory, status, created_at")
        .single();

      if (error) {
        throw new Error(`Failed to create ticket: ${error.message}`);
      }

      return jsonResponse(200, {
        success: true,
        ticket: data,
      });
    }

    if (action === "update") {
      if (!payload.ticket_id) {
        throw new Error("ticket_id is required to update a ticket");
      }

      await ensureTicketOwnership(serviceClient, payload.ticket_id, user.id);

      const updates: Record<string, unknown> = {};

      if (payload.price_cents !== undefined) updates.price_cents = payload.price_cents;
      if (payload.inventory !== undefined) updates.inventory = payload.inventory;
      if (payload.max_per_user !== undefined) updates.max_per_user = payload.max_per_user;
      if (payload.status !== undefined) updates.status = payload.status;
      if (payload.tiers !== undefined) updates.tiers = payload.tiers ?? null;

      if (Object.keys(updates).length === 0) {
        throw new Error("No updates provided");
      }

      const { data, error } = await serviceClient
        .from("live_tickets")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", payload.ticket_id)
        .select("id, session_id, host_id, price_cents, inventory, status, created_at")
        .single();

      if (error) {
        throw new Error(`Failed to update ticket: ${error.message}`);
      }

      return jsonResponse(200, {
        success: true,
        ticket: data,
      });
    }

    if (action === "delete") {
      if (!payload.ticket_id) {
        throw new Error("ticket_id is required to delete a ticket");
      }

      await ensureTicketOwnership(serviceClient, payload.ticket_id, user.id);

      const { error } = await serviceClient
        .from("live_tickets")
        .delete()
        .eq("id", payload.ticket_id);

      if (error) {
        throw new Error(`Failed to delete ticket: ${error.message}`);
      }

      return jsonResponse(200, { success: true });
    }

    return jsonResponse(400, { error: `Unsupported action: ${action}` });
  } catch (error) {
    console.error("[manage-live-tickets]", error);
    return jsonResponse(400, {
      error: error instanceof Error ? error.message : "Unexpected error",
    });
  }
});
