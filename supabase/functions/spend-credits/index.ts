import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const uuid = (value: unknown) =>
  typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      .test(value)
    ? value
    : null;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization) return json({ error: "Authentication required" }, 401);

    const service = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );
    const token = authorization.replace(/^Bearer\s+/i, "");
    const { data: { user }, error: authError } = await service.auth.getUser(token);
    if (authError || !user) return json({ error: "Authentication required" }, 401);

    const body = await req.json();
    const amount = Number(body?.amount_credits);
    const kind = body?.kind === "spend_unlock" || body?.kind === "spend_tip"
      ? body.kind
      : null;
    const refType = typeof body?.ref_type === "string" ? body.ref_type : null;
    const refId = uuid(body?.ref_id);
    const counterpartyId = uuid(body?.counterparty_user_id);
    const requestId = typeof body?.request_id === "string" &&
        /^[A-Za-z0-9:_-]{12,160}$/.test(body.request_id)
      ? body.request_id
      : null;

    if (
      !kind || !refType || !refId || !requestId ||
      !Number.isSafeInteger(amount) || amount <= 0
    ) {
      return json({ error: "Invalid credit transaction" }, 400);
    }

    const { data, error } = await service.rpc("spend_mobile_credits", {
      p_user_id: user.id,
      p_kind: kind,
      p_ref_type: refType,
      p_ref_id: refId,
      p_counterparty_user_id: counterpartyId,
      p_amount_credits: amount,
      p_idempotency_key: `mobile-credit:${user.id}:${requestId}`,
    });
    if (error) {
      const known = [
        "INSUFFICIENT_CREDITS",
        "RELEASE_PRICE_OR_AVAILABILITY_CHANGED",
        "CREDITS_CAN_ONLY_UNLOCK_RELEASES",
        "CREDITS_NOT_PERMITTED_FOR_PURCHASE_KIND",
        "INVALID_TIP_RECIPIENT",
        "TIP_RECIPIENT_NOT_FOUND",
      ].find((code) => error.message?.includes(code));
      return json(
        { error: known ?? "Credit transaction could not be completed" },
        known === "INSUFFICIENT_CREDITS" ? 409 : 400,
      );
    }

    return json({
      success: true,
      ledgerEntryId: data?.ledger_entry_id ?? null,
      duplicate: Boolean(data?.duplicate),
      alreadyOwned: Boolean(data?.already_owned),
      balance: data?.balance ?? null,
    });
  } catch (error) {
    console.error("[spend-credits]", error);
    return json({ error: "Credit transaction could not be completed" }, 500);
  }
});
