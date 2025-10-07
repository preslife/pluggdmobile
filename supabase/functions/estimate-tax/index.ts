import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_TAX_RATE = 0.2;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const amountMinorRaw = Number(body?.amount_minor ?? 0);
    const amountMinor = Number.isFinite(amountMinorRaw) && amountMinorRaw > 0 ? Math.floor(amountMinorRaw) : 0;
    const providedCurrency = typeof body?.currency === "string" ? body.currency : "gbp";
    const currency = providedCurrency.toLowerCase();
    const taxRateRaw = Number(body?.tax_rate ?? body?.taxRate ?? DEFAULT_TAX_RATE);
    const taxRate = Number.isFinite(taxRateRaw) && taxRateRaw >= 0 ? taxRateRaw : DEFAULT_TAX_RATE;

    const subtotalMinor = amountMinor;
    const taxMinor = Math.round(subtotalMinor * taxRate);
    const totalMinor = subtotalMinor + taxMinor;

    return new Response(
      JSON.stringify({
        currency,
        subtotal_minor: subtotalMinor,
        tax_minor: taxMinor,
        total_minor: totalMinor,
        tax_rate: taxRate,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Tax estimation error", error);
    const message = error instanceof Error ? error.message : "Failed to estimate tax";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
