import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import {
  handlePrepareBeatLicense,
  majorUnitsToMinorUnits,
  type PrepareBeatLicenseDependencies,
} from "./handler.ts";

// The handler validates the client licenseOptionId against this trusted
// server-side licensing option lookup before preparing a contract.
const url = Deno.env.get("SUPABASE_URL") ?? "";
const anon = createClient(url, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
  auth: { persistSession: false },
});
const service = createClient(
  url,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false } },
);

const deps: PrepareBeatLicenseDependencies = {
  async authenticate(req) {
    const header = req.headers.get("Authorization");
    if (!header?.startsWith("Bearer ")) return null;
    const { data, error } = await anon.auth.getUser(header.slice(7));
    return error || !data.user
      ? null
      : { id: data.user.id, email: data.user.email };
  },
  async loadBeat(beatId) {
    const { data } = await service
      .from("beats")
      .select("id,user_id,title,producer_name,image_url,is_published")
      .eq("id", beatId)
      .maybeSingle();
    return data
      ? {
        id: data.id,
        user_id: data.user_id,
        title: data.title,
        producer_name: data.producer_name,
        artwork_url: data.image_url,
        is_published: data.is_published,
      }
      : null;
  },
  async loadLicenseOption(beatId, optionId) {
    const { data } = await service
      .from("licensing_options")
      .select("id,beat_id,license_type,price,is_available,producer_authorization_text,producer_authorization_version,producer_authorized_by,producer_authorized_at")
      .eq("id", optionId)
      .eq("beat_id", beatId)
      .maybeSingle();
    if (!data) return null;
    return {
      id: data.id,
      beat_id: data.beat_id,
      license_type: data.license_type,
      // The catalogue stores trusted prices as decimal pounds. Commerce
      // functions use integer minor units so no client amount ever reaches
      // agreement creation or checkout.
      price_pence: majorUnitsToMinorUnits(data.price),
      is_available: data.is_available,
      producer_authorization_text: data.producer_authorization_text,
      producer_authorization_version: data.producer_authorization_version,
      producer_authorized_by: data.producer_authorized_by,
      producer_authorized_at: data.producer_authorized_at,
    };
  },
  async loadContractTemplate(templateType) {
    const { data } = await service
      .from("contract_templates")
      .select(
        "template_type,title,description,legal_text,features,restrictions,deliverables,is_active",
      )
      .eq("template_type", templateType)
      .maybeSingle();
    return data;
  },
  async loadDisplayName(userId) {
    const { data } = await service
      .from("profiles")
      .select("full_name,username")
      .eq("user_id", userId)
      .maybeSingle();
    return data?.full_name ?? data?.username ?? null;
  },
  async findPendingContract({ beatId, artistId, optionId }) {
    const { data } = await service
      .from("licensing_contracts")
      .select(
        "id,status,legal_text,amount_cents,currency,producer_signature,artist_signature,contract_data,producer_authorization_snapshot",
      )
      .eq("beat_id", beatId)
      .eq("artist_id", artistId)
      .eq("status", "pending")
      .contains("contract_data", { license_option_id: optionId })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data;
  },
  async createContract(input) {
    const { data, error } = await service
      .from("licensing_contracts")
      .insert(input)
      .select(
        "id,status,legal_text,amount_cents,currency,producer_signature,artist_signature,producer_authorization_snapshot",
      )
      .single();
    if (error || !data) throw new Error(error?.message ?? "Contract creation failed");
    return data;
  },
  now: () => new Date(),
};

serve((req) =>
  handlePrepareBeatLicense(req, deps).catch((error) => {
    console.error("[PREPARE-BEAT-LICENSE]", error);
    return new Response(JSON.stringify({ error: "Unable to prepare licence" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  })
);
