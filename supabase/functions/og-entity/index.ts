import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

type EntityType = "release" | "beat" | "profile";

const DEFAULT_DESCRIPTION =
  "Pluggd helps creators sell releases, beats, memberships, and more while fans discover the next wave of sound.";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const siteUrl = (Deno.env.get("PUBLIC_SITE_URL") ?? "https://pluggd.fm").replace(/\/$/, "");

const supabase = createClient(supabaseUrl, serviceKey);

const toTitle = (value?: string | null) => (value ? value.trim() : "");

const getQueryValue = (url: URL, fallback?: string) => {
  const value = url.searchParams.get("url");
  return value ? value : fallback;
};

const resolveGeneratorEndpoint = (url: URL) => {
  const envEndpoint = Deno.env.get("OG_IMAGE_FUNCTION_URL");
  if (envEndpoint) return envEndpoint;
  return `${url.origin}/functions/v1/generate-og-image`;
};

type EntityMeta = {
  title: string;
  description: string;
  imageUrl?: string | null;
  accent?: string | null;
  variant: EntityType;
  resourceUrl: string;
};

const buildReleaseMeta = (record: any): EntityMeta => {
  const title = toTitle(record?.title);
  const artist = toTitle(record?.artist);
  const displayTitle = artist ? `${title} — ${artist}` : title || "New Release";
  const description =
    toTitle(record?.description) ||
    (artist && title ? `Stream "${title}" by ${artist} on Pluggd.` : DEFAULT_DESCRIPTION);
  const imageUrl = toTitle(record?.cover_art_url) || null;
  const canonical = `${siteUrl}/release/${record?.id}`;

  return {
    title: displayTitle,
    description,
    imageUrl,
    variant: "release",
    resourceUrl: canonical,
  };
};

const buildBeatMeta = (record: any): EntityMeta => {
  const title = toTitle(record?.title) || "Featured Beat";
  const producer = toTitle(record?.producer_name);
  const displayTitle = producer ? `${title} — ${producer}` : title;
  const description =
    toTitle(record?.description) ||
    (producer ? `Lease or purchase "${title}" by ${producer} on Pluggd.` : `Explore "${title}" on Pluggd.`);
  const imageUrl = toTitle(record?.image_url) || null;
  const canonical = `${siteUrl}/beat/${record?.id}`;

  return {
    title: displayTitle,
    description,
    imageUrl,
    variant: "beat",
    resourceUrl: canonical,
  };
};

const buildProfileMeta = (record: any): EntityMeta => {
  const username = toTitle(record?.username);
  const displayName = toTitle(record?.full_name) || username || "Creator";
  const description =
    toTitle(record?.bio) ||
    `Discover ${displayName} on Pluggd and follow their latest drops.`;
  const imageUrl = toTitle(record?.cover_image_url) || toTitle(record?.avatar_url) || null;
  const canonical = username ? `${siteUrl}/creator/${username}` : `${siteUrl}/profile/${record?.user_id}`;

  return {
    title: `${displayName} on Pluggd`,
    description,
    imageUrl,
    variant: "profile",
    resourceUrl: canonical,
  };
};

const fetchEntity = async (entity: EntityType, identifier: string) => {
  if (entity === "release") {
    const { data } = await supabase
      .from("releases")
      .select("id, title, artist, description, cover_art_url, status")
      .eq("id", identifier)
      .eq("status", "published")
      .maybeSingle();

    return data ? buildReleaseMeta(data) : null;
  }

  if (entity === "beat") {
    const { data } = await supabase
      .from("beats")
      .select("id, title, description, image_url, producer_name, is_published")
      .eq("id", identifier)
      .eq("is_published", true)
      .maybeSingle();

    return data ? buildBeatMeta(data) : null;
  }

  if (entity === "profile") {
    const query = supabase
      .from("profiles")
      .select("user_id, username, full_name, bio, avatar_url, cover_image_url, is_creator")
      .limit(1);

    const selector = identifier.includes("-") ? { column: "user_id", value: identifier } : { column: "username", value: identifier };

    const { data } = await query.eq(selector.column, selector.value).maybeSingle();

    if (!data || !data.username) {
      return null;
    }

    return buildProfileMeta(data);
  }

  return null;
};

const parsePath = (url: URL): { entity: EntityType | null; identifier: string | null } => {
  const path = url.pathname
    .replace(/^\/functions\/v1\//, "")
    .replace(/^og-entity\/?/, "")
    .replace(/^api\/og\/?/, "");

  const segments = path.split("/").filter(Boolean);
  if (segments.length >= 2) {
    const [entity, identifier] = segments as [EntityType, string];
    return { entity, identifier };
  }

  const entityParam = url.searchParams.get("entity") as EntityType | null;
  const identifierParam = url.searchParams.get("id") || url.searchParams.get("slug");

  return {
    entity: entityParam ?? null,
    identifier: identifierParam,
  };
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const { entity, identifier } = parsePath(url);

    if (!entity || !identifier) {
      return new Response("Not found", { status: 404, headers: corsHeaders });
    }

    const meta = await fetchEntity(entity, identifier);

    if (!meta) {
      return new Response("Not found", { status: 404, headers: corsHeaders });
    }

    const generatorEndpoint = resolveGeneratorEndpoint(url);
    const generatorUrl = new URL(generatorEndpoint);

    generatorUrl.searchParams.set("title", meta.title);
    generatorUrl.searchParams.set("description", meta.description || DEFAULT_DESCRIPTION);
    generatorUrl.searchParams.set("type", meta.variant);

    if (meta.imageUrl) {
      generatorUrl.searchParams.set("image", meta.imageUrl);
    }

    if (meta.accent) {
      generatorUrl.searchParams.set("accent", meta.accent);
    }

    const resourceOverride = getQueryValue(url, meta.resourceUrl);
    if (resourceOverride) {
      generatorUrl.searchParams.set("url", resourceOverride);
    }

    if (supabaseAnonKey) {
      generatorUrl.searchParams.set("apikey", supabaseAnonKey);
    }

    const upstream = await fetch(generatorUrl.toString());

    if (!upstream.ok) {
      console.error("[og-entity] Upstream image generation failed", upstream.status, upstream.statusText);
      return new Response("Failed to render OG image", { status: 502, headers: corsHeaders });
    }

    const body = await upstream.arrayBuffer();

    return new Response(body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "image/png",
        "Cache-Control": "public, s-maxage=900, max-age=900, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("[og-entity] Unexpected error", error);
    return new Response("Server error", { status: 500, headers: corsHeaders });
  }
});
