import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import {
  handleAuthorizeBeatLicenseOption,
  type AuthorizeBeatLicenseDependencies,
} from "./handler.ts";

const url = Deno.env.get("SUPABASE_URL") ?? "";
const anon = createClient(url, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
  auth: { persistSession: false },
});
const service = createClient(
  url,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false } },
);

const deps: AuthorizeBeatLicenseDependencies = {
  async authenticate(req) {
    const header = req.headers.get("Authorization");
    if (!header?.startsWith("Bearer ")) return null;
    const { data, error } = await anon.auth.getUser(header.slice(7));
    return error || !data.user ? null : { id: data.user.id };
  },
  async loadOption(beatId, optionId) {
    const { data } = await service.from("licensing_options")
      .select("id,beat_id,license_type,beats!inner(user_id)")
      .eq("id", optionId).eq("beat_id", beatId).maybeSingle();
    const beat = Array.isArray(data?.beats) ? data?.beats[0] : data?.beats;
    return data && beat?.user_id
      ? {
        id: data.id,
        beat_id: data.beat_id,
        license_type: data.license_type,
        beat_owner_id: beat.user_id,
      }
      : null;
  },
  async authorize(optionId, input) {
    const { error } = await service.from("licensing_options")
      .update(input).eq("id", optionId);
    if (error) throw error;
  },
  now: () => new Date(),
};

serve((req) =>
  handleAuthorizeBeatLicenseOption(req, deps).catch((error) => {
    console.error("[AUTHORIZE-BEAT-LICENSE-OPTION]", error);
    return new Response(JSON.stringify({ error: "Unable to authorize licence" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  })
);
