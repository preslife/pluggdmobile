import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

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

function receiptPath(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  const clean = value.trim().replace(/^\/+/, "");
  if (clean.startsWith("receipts/")) return clean.slice("receipts/".length);
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }
    const service = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );
    const { data: { user }, error: authError } = await service.auth.getUser(
      authorization.slice(7),
    );
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json();
    const orderId = typeof body.orderId === "string" ? body.orderId.trim() : "";
    const kind = [
        "beat_license",
        "release_unlock",
        "event_ticket",
        "physical_merch",
      ].includes(body.kind)
      ? body.kind as
        | "beat_license"
        | "release_unlock"
        | "event_ticket"
        | "physical_merch"
      : null;
    if (!orderId || !kind) {
      return json({ error: "orderId and a supported kind are required" }, 400);
    }

    let storedPath: string | null = null;
    if (kind === "release_unlock") {
      const { data } = await service.from("release_purchases")
        .select("receipt_pdf_url,status")
        .eq("id", orderId)
        .or(`user_id.eq.${user.id},purchaser_id.eq.${user.id}`)
        .eq("status", "completed")
        .maybeSingle();
      storedPath = receiptPath(data?.receipt_pdf_url);
    } else if (kind === "beat_license") {
      const { data: purchase } = await service.from("purchases")
        .select("license_pdf_url,status")
        .eq("id", orderId)
        .eq("buyer_id", user.id)
        .eq("status", "completed")
        .maybeSingle();
      storedPath = receiptPath(purchase?.license_pdf_url);
      if (!storedPath) {
        const { data: contract } = await service.from("licensing_contracts")
          .select("contract_pdf_url,status")
          .eq("id", orderId)
          .or(`artist_id.eq.${user.id},producer_id.eq.${user.id}`)
          .eq("status", "completed")
          .maybeSingle();
        storedPath = receiptPath(contract?.contract_pdf_url);
      }
    } else if (kind === "event_ticket") {
      const { data } = await service.from("ticket_orders")
        .select("receipt_pdf_url,status")
        .eq("id", orderId)
        .eq("user_id", user.id)
        .eq("status", "completed")
        .maybeSingle();
      storedPath = receiptPath(data?.receipt_pdf_url);
    } else if (kind === "physical_merch") {
      const { data } = await service.from("physical_merch_orders")
        .select("receipt_pdf_url,status")
        .eq("id", orderId)
        .eq("user_id", user.id)
        .eq("status", "completed")
        .maybeSingle();
      storedPath = receiptPath(data?.receipt_pdf_url);
    }
    if (!storedPath) {
      return json({ error: "Document is not ready for this account" }, 404);
    }

    const { data, error } = await service.storage.from("receipts")
      .createSignedUrl(storedPath, 300, { download: false });
    if (error || !data?.signedUrl) {
      throw new Error("Secure document URL could not be created");
    }
    return json({ signedUrl: data.signedUrl, expiresIn: 300 });
  } catch (error) {
    console.error("commerce-document-url failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return json({ error: "Secure document is unavailable" }, 500);
  }
});
